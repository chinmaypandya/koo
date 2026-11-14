import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_PROMPT, MAX_PROMPT, PROVIDERS, phones, providerOf, type Choice } from '@/lib/classify';
import { API, LOCAL } from '@/lib/api';
import { PACKS, REQUESTS_PER_CREDIT, SIGNUP_BONUS, creditsFor } from '@/lib/pricing';
import { sortResults, type Sort, type SortKey } from '@/lib/sort';
import { toCsv } from '@/lib/csv';
import { KooStage, STATES, stateOf } from './koo';

const FIELDS = [
  ['location', 'Target location', 'e.g. Prestige Shantiniketan, Whitefield'],
  ['distance', 'Max distance (km)', 'e.g. 5'],
  ['budget', 'Budget', 'e.g. under 30k/month'],
  ['size', 'Size', 'e.g. 2BHK'],
  ['amenities', 'Amenities', 'e.g. furnished, parking'],
] as const;

// Side buttons: each toggles one panel; the icon flips to ✕ while its panel is open.
const PANELS = {
  settings: { icon: '⚙️', title: 'Search settings', tip: 'Search settings', side: 'left' },
  activity: { icon: '📜', title: 'Activity', tip: 'Activity log', side: 'left' },
  credits: { icon: '🪙', title: 'Koo credits', tip: 'Koo credits · sign in & buy', side: 'left' },
  matches: { icon: '🏆', title: 'Matches', tip: 'Matches · sort & export', side: 'right' },
  decisions: { icon: '🗂️', title: 'All decisions', tip: 'All decisions', side: 'right' },
} as const;
type PanelId = keyof typeof PANELS;

function App() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [armed, setArmed] = useState(false); // Clear history needs a second click within 3s
  useEffect(() => {
    // get() with no argument = everything saved; `?? {}` so an empty/odd result can't crash the panel.
    const load = () => browser.storage.local.get().then((d) => setS(d ?? {}));
    // First use (no filters yet): open the settings so there's something to fill in.
    browser.storage.local.get().then((d = {}) => {
      setS(d);
      if (!Object.values(d.filters ?? {}).some(Boolean)) setPanel('settings');
    });
    browser.storage.onChanged.addListener(load);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    addEventListener('keydown', esc);
    return () => (browser.storage.onChanged.removeListener(load), removeEventListener('keydown', esc));
  }, []);
  if (!s) return null;

  const results: any[] = s.results ?? [];
  const matches = results.filter((r) => r.match);
  const agent = stateOf(s.agent);
  const busy = agent === 'starting' || agent === 'stopping';
  const active = agent !== 'sleeping' && agent !== 'error';
  const energy: number = active ? s.energy ?? 100 : 100; // stopped → full energy
  const counts: Partial<Record<PanelId, number>> = { matches: matches.length, decisions: results.length, ...(s.token && { credits: Math.floor(s.credits ?? 0) }) };

  const send = async (type: string) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.tabs.sendMessage(tab?.id ?? -1, { type }).catch(() =>
      browser.storage.local.set({ agent: 'sleeping', status: 'Open a Facebook group tab (reload it if you just installed the extension).' }),
    );
  };
  // Show "Starting…"/"Stopping…" (take-off/landing) right away; the scanner switches to searching/sleeping once it actually has.
  const toggle = async () => {
    if (busy) return;
    // Don't start a run that can't reach the AI: it would scroll, then stop at the first batch.
    if (!active) {
      const choice = s.provider ?? providerOf(s.apiKey ?? '');
      if (choice === 'koo' && !s.token && !LOCAL) {
        setPanel('credits');
        return browser.storage.local.set({ status: 'Sign in for Koo credits, or choose your own API key in Search settings.' });
      }
      if (choice !== 'koo' && !s.apiKey) {
        setPanel('settings');
        return browser.storage.local.set({ status: `Add your ${choice} API key in Search settings, or choose Koo credits.` });
      }
    }
    await browser.storage.local.set({ agent: active ? 'stopping' : 'starting' });
    await send(active ? 'stop' : 'start');
  };

  const clear = async () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    await send('stop');
    await browser.storage.local.remove(['seenIds', 'results', 'status', 'log']);
  };

  const sideButtons = (side: 'left' | 'right') => (
    <nav className={`side ${side}`}>
      {(Object.keys(PANELS) as PanelId[]).filter((id) => PANELS[id].side === side).map((id) => (
        <button key={id} className="sq" aria-pressed={panel === id} aria-label={PANELS[id].title} data-tip={panel === id ? 'Close' : PANELS[id].tip}
          onClick={() => setPanel(panel === id ? null : id)}>
          {panel === id ? '✕' : PANELS[id].icon}
          {!!counts[id] && panel !== id && <span className="badge">{counts[id]}</span>}
        </button>
      ))}
      {side === 'right' && (
        <button className="sq" data-armed={armed || undefined} onClick={clear}
          aria-label={armed ? 'Click again to clear history' : 'Clear history'} data-tip={armed ? 'Click again to clear' : 'Clear history & matches'}>
          {armed ? '⚠️' : '🗑️'}
        </button>
      )}
    </nav>
  );

  const content: Record<PanelId, ReactNode> = {
    settings: <Settings s={s} />,
    credits: <Credits s={s} />,
    // Hiding the panel only stops rendering; the log keeps recording in storage.
    activity: <pre className="log">{(s.log ?? []).join('\n') || 'Press Start to see each step here.'}</pre>,
    matches: (
      <>
        <SortBar sort={s.sort ?? []} />
        <ExportBar matches={sortResults(matches, s.sort ?? [])} exportedAt={s.exportedAt ?? 0} />
        <Verdicts items={sortResults(matches, s.sort ?? [])} empty="No matches yet. They show up here as the AI finds them." />
      </>
    ),
    decisions: <Verdicts items={results} empty="Every post the AI checks shows up here, with its reasoning." />,
  };

  return (
    <>
      <KooStage agent={agent} />
      {active && s.breakUntil > 0 && <BreakTimer kind={s.breakKind} until={s.breakUntil} />}
      <div className="top">
        <div className="bubble" aria-live="polite">
          <strong>{STATES[agent]!.caption}</strong>
          {s.status && <small title={s.status}>{s.status}</small>}
        </div>
        <button className={`go${active && !busy ? ' stop' : ''}`} data-busy={busy || undefined} aria-busy={busy} onClick={toggle}>
          {agent === 'starting' ? 'Starting…' : agent === 'stopping' ? 'Stopping…' : active ? 'Stop' : 'Start'}
        </button>
      </div>
      <div className="energy" role="meter" aria-label="Koo's energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={energy}>
        <span>⚡ {Math.round(energy)}%</span>
        {/* 10 segments that drain continuously: at 95% the last one is half full */}
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i}><b className={energy <= 25 ? 'low' : energy < 50 ? 'mid' : 'on'} style={{ width: `${Math.min(100, Math.max(0, (energy - i * 10) * 10))}%` }} /></i>
        ))}
      </div>
      {sideButtons('left')}
      {sideButtons('right')}
      {panel && (
        <section className="modal" role="dialog" aria-label={PANELS[panel].title}>
          <header>
            {PANELS[panel].title}{counts[panel] != null && ` (${counts[panel]})`}
            <button aria-label="Close" onClick={() => setPanel(null)}>✕</button>
          </header>
          <div className="body">{content[panel]}</div>
        </section>
      )}
    </>
  );
}

// Countdown shown above Koo during a water break or an energy drink.
function BreakTimer({ kind, until }: { kind: string; until: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <div className={`breaktimer bt-${kind}`} role="timer" aria-live="off">
      {kind === 'energy' ? '⚡ Energy drink' : '💧 Water break'} <b>{left}s</b>
    </div>
  );
}

// The AI's matching rules, editable. Empty or unchanged = default. The JSON output format is always added after it.
function PromptEditor({ prompt }: { prompt?: string }) {
  const [text, setText] = useState(prompt || DEFAULT_PROMPT);
  const save = (v: string) => {
    setText(v);
    v.trim() && v !== DEFAULT_PROMPT ? browser.storage.local.set({ prompt: v }) : browser.storage.local.remove('prompt');
  };
  return (
    <label>
      AI instructions <small>({prompt ? 'customised' : 'default'}; the reply format is added automatically)</small>
      <textarea rows={8} maxLength={MAX_PROMPT} value={text} onChange={(e) => save(e.target.value)} />
      {prompt && <button type="button" className="reset" onClick={() => save(DEFAULT_PROMPT)}>Reset to default</button>}
    </label>
  );
}

// Koo credits: Google sign-in → Koo token, balance, and UPI packs. Credits are added by the server when Razorpay
// confirms the payment (webhook), never by the extension.
function Credits({ s }: { s: Record<string, any> }) {
  const [msg, setMsg] = useState('');
  const poll = useRef<ReturnType<typeof setInterval>>(undefined);
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(s.token && { authorization: `Bearer ${s.token}` }) },
    }).catch(() => { throw new Error(`Cannot reach Koo at ${API}.`); });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) await browser.storage.local.remove(['token', 'email', 'credits']);
    if (!res.ok) throw new Error(body.error?.message ?? `Error ${res.status}`);
    return body;
  };
  const refresh = () => s.token && call('/me').then((b) => browser.storage.local.set({ credits: b.credits, email: b.email })).catch((e) => setMsg(e.message));
  useEffect(() => {
    refresh();
    addEventListener('focus', refresh); // back from the payment tab → show the new balance
    return () => (removeEventListener('focus', refresh), clearInterval(poll.current));
  }, [s.token]);

  const signIn = async () => {
    try {
      setMsg('Signing in…');
      const { token: googleToken } = await browser.identity.getAuthToken({ interactive: true });
      const b = await call('/auth', { method: 'POST', body: JSON.stringify({ googleToken }) });
      await browser.storage.local.set({ token: b.token, email: b.email, credits: b.credits });
      setMsg('');
    } catch (e: any) {
      setMsg(`Sign-in failed: ${e.message}`);
    }
  };
  const buy = async (rupees: number) => {
    try {
      const { url } = await call('/checkout', { method: 'POST', body: JSON.stringify({ rupees }) });
      await browser.tabs.create({ url });
      setMsg('Pay with any UPI app in the new tab. Your credits appear here a few seconds after paying.');
      clearInterval(poll.current);
      let n = 0;
      poll.current = setInterval(() => (refresh(), ++n >= 24 && clearInterval(poll.current)), 5000); // check for 2 minutes
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  if (!s.token && LOCAL)
    return (
      <>
        <p><b>Local mode.</b> No central Koo API is set up yet, so Koo credits use your local one at <code>{API}</code>:
          no sign-in and no credits; it uses the API key in <code>cloud/.dev.vars</code>.</p>
        <p className="muted">Start it with <code>npm run cloud:dev</code> (with <code>DEV_NO_AUTH=1</code> in <code>cloud/.dev.vars</code>).
          Once the cloud API is deployed and <code>WXT_API_URL</code> is set at build time, sign-in and UPI packs appear here.</p>
      </>
    );
  if (!s.token)
    return (
      <>
        <p>Sign in to use Koo credits: no API key needed. New accounts get {SIGNUP_BONUS} free credits ({SIGNUP_BONUS * REQUESTS_PER_CREDIT} AI requests).</p>
        <button className="danger-free" onClick={signIn}>Sign in with Google</button>
        {msg && <p className="muted">{msg}</p>}
      </>
    );
  return (
    <>
      <p className="muted">{s.email}</p>
      <p className="balance">🪙 {Number(s.credits ?? 0).toFixed(1)} <small>Koo credits</small></p>
      <p className="muted">≈ {Math.floor(Number(s.credits ?? 0) * REQUESTS_PER_CREDIT)} AI requests left (5 posts each).</p>
      <p className="muted">1 Koo credit = ₹1 = {REQUESTS_PER_CREDIT} AI requests. Minimum top-up ₹100.</p>
      <div className="exportbar">
        {PACKS.map((r) => <button key={r} onClick={() => buy(r)}>₹{r} → {creditsFor(r)} 🪙</button>)}
      </div>
      <p className="muted">Pay by UPI. {msg}</p>
      <button className="reset" onClick={() => (browser.storage.local.remove(['token', 'email', 'credits']), setMsg(''))}>Sign out</button>
    </>
  );
}

function Settings({ s }: { s: Record<string, any> }) {
  const filters = s.filters ?? {};
  const provider: Choice = s.provider ?? providerOf(s.apiKey ?? '');
  return (
    <>
      {FIELDS.map(([k, label, ph]) => (
        <label key={k}>
          {label}
          <input placeholder={ph} defaultValue={filters[k]} onChange={(e) => browser.storage.local.set({ filters: { ...filters, [k]: e.target.value } })} />
        </label>
      ))}
      <label>
        Your gender <small>(skips posts limited to another gender)</small>
        <select value={filters.gender ?? ''} onChange={(e) => browser.storage.local.set({ filters: { ...filters, gender: e.target.value } })}>
          <option value="">Any / don't filter</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
      <PromptEditor prompt={s.prompt} />
      <label>
        Provider
        <select value={provider} onChange={(e) => browser.storage.local.set({ provider: e.target.value })}>
          <option value="koo">🪙 Koo credits (no API key needed)</option>
          <option value="openai">OpenAI (your key)</option>
          <option value="gemini">Google Gemini (your key)</option>
          <option value="anthropic">Anthropic (your key)</option>
        </select>
      </label>
      {provider !== 'koo' && (
        <>
          <label>
            API key <small>(stored unencrypted on this device only)</small>
            <input type="password" defaultValue={s.apiKey} onChange={(e) => browser.storage.local.set({ apiKey: e.target.value.trim() })} />
          </label>
          <label>
            Model <small>(optional)</small>
            <input placeholder={PROVIDERS[provider].model} defaultValue={s.model} onChange={(e) => browser.storage.local.set({ model: e.target.value.trim() })} />
          </label>
        </>
      )}
    </>
  );
}

// Ordering is a queue: selecting a column appends it, deselecting removes it; earlier columns win, later ones break ties.
const SORTABLE: [SortKey, string, 1 | -1][] = [['price', 'Rent', 1], ['deposit', 'Deposit', 1], ['amenities_score', 'Amenities', -1]];
function SortBar({ sort }: { sort: Sort }) {
  const save = (next: Sort) => browser.storage.local.set({ sort: next });
  return (
    <div className="sortbar" role="group" aria-label="Order matches by">
      <small>Order by</small>
      {SORTABLE.map(([key, label, defaultDir]) => {
        const i = sort.findIndex((x) => x.key === key);
        const dir = sort[i]?.dir;
        return (
          <span key={key} className={`sortchip${i >= 0 ? ' on' : ''}`}>
            <button aria-pressed={i >= 0} onClick={() => save(i >= 0 ? sort.filter((x) => x.key !== key) : [...sort, { key, dir: defaultDir }])}>
              {i >= 0 && <b>{i + 1}</b>}{label}
            </button>
            {i >= 0 && (
              <button aria-label={`${label}: ${dir === 1 ? 'low to high' : 'high to low'}. Click to flip.`}
                onClick={() => save(sort.map((x) => (x.key === key ? { ...x, dir: x.dir === 1 ? -1 : 1 } : x)))}>
                {dir === 1 ? '↑' : '↓'}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

// Export as CSV (opens in Excel). "New" = matches found after the last export; every export moves that watermark forward.
function ExportBar({ matches, exportedAt }: { matches: any[]; exportedAt: number }) {
  const fresh = matches.filter((r) => (r.seenAt ?? 0) > exportedAt);
  const download = async (rows: any[], kind: string) => {
    if (!rows.length) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })); // BOM so Excel reads ₹ correctly
    const a = Object.assign(document.createElement('a'), { href: url, download: `koo-matches-${kind}-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await browser.storage.local.set({ exportedAt: Math.max(exportedAt, ...rows.map((r) => r.seenAt ?? 0)) });
  };
  return (
    <div className="exportbar">
      <button disabled={!matches.length} onClick={() => download(matches, 'all')}>⬇ Export all ({matches.length})</button>
      <button disabled={!fresh.length} onClick={() => download(fresh, 'new')}>⬇ Export new ({fresh.length})</button>
    </div>
  );
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// Shopping-cart style row: society + short description on the left, rent on the right, owner contact as the footer.
function Verdicts({ items, empty }: { items: any[]; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="cards">
      {items.map((r) => (
        <li key={r.id} className={`card${r.match ? ' match' : ''}`}>
          <div className="item-main">
            <div className="title">
              {r.match ? '✅' : '❌'} <a href={r.url} target="_blank">{r.society_name ?? r.location ?? 'Post'}</a>
            </div>
            <div className="desc">{r.verdict}</div>
            <div className="facts">
              {[
                r.bhk != null && `${r.bhk} BHK`,
                r.society_name && r.location,
                r.distance_km != null && `~${r.distance_km} km`,
                r.deposit != null && `deposit ${rupees(r.deposit)}`,
                r.amenities_score != null && `amenities ${Math.round(r.amenities_score * 100)}%`,
              ].filter(Boolean).join(' · ')}
            </div>
            <details>
              <summary><small>Raw text</small></summary>
              <small style={{ whiteSpace: 'pre-wrap' }}>{r.raw_text}</small>
            </details>
          </div>
          <div className="price">
            {r.price != null ? <>{rupees(r.price)}<small>/mo</small></> : <small>rent ?</small>}
            {r.budget_difference != null && (
              <small className={r.budget_difference > 0 ? 'over' : 'under'}>
                {r.budget_difference > 0 ? '+' : r.budget_difference < 0 ? '−' : '±'}{rupees(Math.abs(r.budget_difference))}
              </small>
            )}
          </div>
          <footer>
            {/* Older matches were saved before numbers were extracted in code, so fall back to scanning their text. */}
            {(r.contact?.length ? r.contact : phones(r.raw_text ?? '')).length ? (
              <>📞 {(r.contact?.length ? r.contact : phones(r.raw_text ?? '')).map((n: string, i: number) => (
                <span key={n} className="num">{i > 0 && ', '}{n}</span>
              ))}
              {r.country_code_source === 'ai' && <small title="The post didn't include a country code; guessed from the post, group or your target location."> · {r.country_code} guessed</small>}</>
            ) : r.author_url ? (
              <>💬 <a href={r.author_url} target="_blank">Message {r.author ?? 'the poster'} on Facebook</a></>
            ) : (
              <span className="muted">No number or poster link found</span>
            )}
          </footer>
        </li>
      ))}
    </ul>
  );
}

// WXT 0.21 dev HTML loads this file twice (built chunk + dev server); keep only the last mount.
const w = window as any;
w.__kooRoot?.unmount();
w.__kooRoot = createRoot(document.getElementById('root')!);
w.__kooRoot.render(<App />);
