import { createServer } from 'node:http';
import { classify, PROVIDERS, type Provider } from '../lib/classify.ts';

const { LLM_PROVIDER = 'openai', LLM_API_KEY, LLM_MODEL, PORT = '8787' } = process.env;
if (!LLM_API_KEY) throw new Error('Set LLM_API_KEY in server/.env');
if (!(LLM_PROVIDER in PROVIDERS) || LLM_PROVIDER === 'openbroker') throw new Error(`LLM_PROVIDER must be openai, gemini or anthropic`);

const send = (res: import('node:http').ServerResponse, status: number, body: unknown) =>
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
const fail = (res: import('node:http').ServerResponse, status: number, message: string) => send(res, status, { error: { message } });

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/classify') return fail(res, 404, 'Not found');

  // Untrusted input: cap size and keep only the fields we expect.
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 200_000) return fail(res, 413, 'Request too large');
  }
  let posts, filters, group = '';
  try {
    const body = JSON.parse(raw);
    if (!Array.isArray(body.posts) || body.posts.length < 1 || body.posts.length > 20) throw 0;
    if (typeof body.group === 'string') group = body.group.slice(0, 200);
    posts = body.posts.map((p: any) => {
      if (typeof p?.id !== 'string' || typeof p?.text !== 'string') throw 0;
      return { id: p.id.slice(0, 100), text: p.text.slice(0, 5000), url: '', group };
    });
    filters = Object.fromEntries(
      Object.entries(body.filters ?? {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, (v as string).slice(0, 200)]),
    );
  } catch {
    return fail(res, 400, 'Expected {posts: [{id, text}] (1-20), filters: {...}}');
  }

  try {
    send(res, 200, await classify(posts, filters, LLM_API_KEY, LLM_PROVIDER as Provider, LLM_MODEL));
  } catch (e: any) {
    // Provider errors can echo key fragments, so details stay in the server log.
    // 502: the LLM call failed (classify already retried it), so the extension shouldn't retry again.
    console.error('LLM call failed:', e?.message ?? e);
    fail(res, 502, 'The AI provider failed or is busy. Try again in a minute.');
  }
}).listen(Number(PORT), '127.0.0.1', () => console.log(`OpenBroker server on http://127.0.0.1:${PORT} using ${LLM_PROVIDER}`));
// shortcut: no auth and bound to localhost only; add accounts/API tokens before deploying it for paid users.
