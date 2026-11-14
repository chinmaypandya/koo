import { classify, phones, providerOf, toIntl, type Choice, type Filters, type Post, type Result } from '@/lib/classify';

import { API, LOCAL } from '@/lib/api';

// Koo credits mode: the cloud API calls the AI with our key and charges this user's credits.
async function cloudClassify(posts: Post[], filters: Filters | undefined, prompt: string | undefined): Promise<Result[]> {
  const { token } = (await browser.storage.local.get('token')) as { token?: string };
  if (!token && !LOCAL) throw new Error('Sign in under 🪙 Koo credits, or choose your own API key in Search settings.');
  const res = await fetch(`${API}/classify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ filters, prompt, group: posts[0]?.group, posts: posts.map(({ id, text }) => ({ id, text })) }),
  }).catch(() => {
    throw new Error(LOCAL ? `Cannot reach the local Koo API at ${API}. Start it with: npm run server` : `Cannot reach Koo at ${API}.`);
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) await browser.storage.local.remove(['token', 'email', 'credits']); // token revoked → sign in again
  if (typeof body.credits === 'number') await browser.storage.local.set({ credits: body.credits });
  if (!res.ok) throw new Error(body.error?.message ?? `Koo error ${res.status}`);
  // The worker replies {results}; the old local server replied with a bare array. Anything else is a clear error, not a crash.
  const results = Array.isArray(body) ? body : body.results;
  if (!Array.isArray(results)) throw new Error(`Unexpected reply from ${API}: no results. Is the right Koo API running there?`);
  return results;
}

export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  // The "Koo credits" choice used to be stored as 'openbroker'; keep users' saved choice after the rename.
  browser.storage.local.get('provider').then(({ provider }) => { if (provider === 'openbroker') browser.storage.local.set({ provider: 'koo' }); });

  browser.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type !== 'classify') return;
    handle(msg.posts).then(reply, (e) => reply({ error: String(e?.message ?? e) }));
    return true; // async reply
  });
});

let saving = Promise.resolve();

async function handle(posts: Post[]) {
  const { apiKey, provider, model, filters, prompt } = (await browser.storage.local.get(['apiKey', 'provider', 'model', 'filters', 'prompt'])) as {
    apiKey?: string; provider?: Choice; model?: string; filters?: Filters; prompt?: string;
  };
  const p = provider ?? providerOf(apiKey ?? '');
  if (p !== 'koo' && !apiKey) throw new Error('Add your API key in Search settings, or choose Koo credits.');
  const byId = new Map(posts.map((post) => [post.id, post]));
  // Keep every verdict (match or not) so the side panel can show the AI's reasoning.
  const results = p === 'koo' ? await cloudClassify(posts, filters, prompt) : await classify(posts, filters, apiKey!, p, model, prompt);
  const verdicts = results
    .filter((r) => byId.has(r.id))
    .map((r) => {
      const { text, ...post } = byId.get(r.id)!;
      // LLMs sometimes return one number as a plain string; the panel expects a list or null.
      const fromAi: string[] = Array.isArray(r.contact) ? r.contact.map(String) : r.contact ? [String(r.contact)] : [];
      // Numbers found in the text by code always count, even if the AI missed them; dedupe by the last 10 digits.
      const seen = new Set<string>();
      const contact = [...fromAi, ...phones(text)].filter((n) => {
        const key = n.replace(/\D/g, '').slice(-10);
        return key.length >= 8 && !seen.has(key) && !!seen.add(key);
      });
      // Country: a number's own +code wins; otherwise the AI's guess (post → group name → your target location).
      const countryCode = typeof r.country_code === 'string' && /^\+?\d{1,4}$/.test(r.country_code.trim()) ? `+${r.country_code.replace(/\D/g, '')}` : null;
      return {
        ...post, raw_text: text, ...r,
        contact: contact.length ? contact.map((n) => toIntl(n, countryCode)) : null,
        country_code: countryCode,
        country_code_source: !contact.length ? null : contact.every((n) => n.trim().startsWith('+')) ? 'number' : countryCode ? 'ai' : null,
        seenAt: Date.now(),
      };
    });
  // Batches overlap now, so saves are queued one after another (otherwise one batch's write could drop another's).
  // Results are read only after the slow AI call, so a "Clear history" during the call isn't undone.
  await (saving = saving.catch(() => {}).then(async () => {
    const { results = [] } = (await browser.storage.local.get('results')) as { results?: unknown[] };
    // shortcut: keeps the newest 500 verdicts; matches older than that drop off too — split storage if users need a long match history.
    await browser.storage.local.set({ results: [...verdicts, ...results].slice(0, 500) });
  }));
  return { ok: true, total: verdicts.length, found: verdicts.filter((v) => v.match).length };
}
