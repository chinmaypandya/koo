import { breakMs } from '@/lib/energy';
import { BATCH_SIZE } from '@/lib/pricing';
import { PX, STATES, ease, fly, frameOf, mix, paint, stateOf, wave, type Pose } from '@/entrypoints/sidepanel/koo';

// v2 only (npm run build:v2): Koo flies over the Facebook page itself instead of living in Chrome's side panel.
// A full-window layer that lets every click through, except the KOO button (bottom right) and the panel it opens,
// which is the same side-panel page in an iframe, so every button and form works exactly as in v1.
// Closed shadow root: Facebook's CSS can't restyle it and page scripts can't reach inside.
const SIZE = 120, FOOT = SIZE * (196 / 240 - 0.5); // on-screen sprite size; px from its centre down to Koo's feet
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const CSS = `
  :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; font: 700 14px "Space Grotesk", system-ui, sans-serif; }
  canvas { position: absolute; left: 0; top: 0; width: ${SIZE}px; height: ${SIZE}px; image-rendering: pixelated; }
  .say { position: absolute; left: 0; top: 0; max-width: 230px; padding: 5px 9px; background: #fff; color: #0a0a0a;
    border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a; font-size: 12px; line-height: 1.3; }
  .say strong { display: block; white-space: nowrap; text-transform: uppercase; letter-spacing: .04em; }
  .say strong b { margin-left: 6px; padding: 0 4px; background: #ffd600; font-family: monospace; }
  .say small { display: block; font: 400 11px/1.3 monospace; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pips { position: absolute; left: 0; top: 0; translate: -50% 0; font: 700 20px/1 monospace; letter-spacing: 3px; color: #0a0a0a;
    background: #ffd600; border: 2px solid #0a0a0a; padding: 2px 4px; white-space: nowrap; }
  button { position: absolute; right: 16px; bottom: 16px; pointer-events: auto; cursor: pointer; padding: 10px 14px;
    background: #ffd600; color: #0a0a0a; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a; font: inherit; letter-spacing: .08em; }
  button:hover { translate: 2px 2px; box-shadow: 2px 2px 0 #0a0a0a; }
  button[aria-expanded="true"] { background: #fff; }
  button b { position: absolute; top: -10px; left: -10px; min-width: 20px; padding: 0 4px; background: #0a0a0a; color: #fff; font: 700 11px/18px monospace; }
  iframe { position: absolute; right: 16px; bottom: 76px; width: min(400px, calc(100vw - 32px)); height: min(640px, calc(100vh - 190px)); /* room above for Koo to perch on */
    pointer-events: auto; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a; background: #fdfbf7; }
  .chip { position: absolute; left: 0; top: 0; width: 44px; height: 52px; background: #fff; border: 3px solid #0a0a0a;
    background-image: repeating-linear-gradient(#0a0a0a 0 3px, transparent 3px 10px); background-size: 26px 36px; background-position: 6px 7px;
    background-repeat: no-repeat; transition: transform 1.4s cubic-bezier(.5, 0, .7, 1), opacity 1.4s; }
  .wind { position: absolute; left: 0; top: 0; height: 12px; width: 140px; background: #fff; border: 3px solid #0a0a0a;
    animation: gust 1.8s ease-in forwards; }
  .chip.ride { transition: none; animation: gust 1.8s ease-in forwards; }
  @keyframes gust { from { opacity: 1; } to { opacity: 0; translate: 45vw -18vh; } }
  [hidden] { display: none !important; }
`;

export function mountOverlay() {
  const host = document.createElement('koo-overlay');
  const root = host.attachShadow({ mode: 'closed' });
  // Koo is last so it's drawn above the panel too (clicks pass through it).
  root.innerHTML = `<style>${CSS}</style><iframe title="Koo" hidden></iframe><button aria-label="Open Koo" aria-expanded="false">KOO<b hidden></b></button>
    <canvas width="${PX}" height="${PX}" aria-hidden="true"></canvas><div class="pips" hidden></div>
    <div class="say" role="status" hidden><strong></strong><small></small></div>`;
  document.documentElement.append(host);
  const [canvas, pips, frame, button, badge] = ['canvas', '.pips', 'iframe', 'button', 'b'].map((s) => root.querySelector(s)) as
    [HTMLCanvasElement, HTMLElement, HTMLIFrameElement, HTMLButtonElement, HTMLElement];
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  const say = root.querySelector('.say') as HTMLElement, [caption, line] = say.children as unknown as [HTMLElement, HTMLElement];

  const panel = () => {
    if (!frame.src) frame.src = browser.runtime.getURL('/sidepanel.html') + '?overlay'; // loaded on first open only
    frame.hidden = !frame.hidden;
    button.setAttribute('aria-expanded', String(!frame.hidden));
  };
  button.onclick = panel;

  // Same storage the side panel reads: Koo's state (agent), break timing, and the match count for the badge.
  let s: Record<string, any> = {}, state = 'sleeping', since = performance.now(), from: Pose | null = null, shown: Pose | null = null;
  const load = () => browser.storage.local.get(['agent', 'breakUntil', 'breakKind', 'results', 'status']).then((d) => {
    s = d;
    const next = stateOf(d.agent as string | undefined);
    if (next !== state) [state, since, from] = [next, performance.now(), shown]; // blend from wherever Koo is
    const n = ((d.results ?? []) as any[]).filter((r) => r.match).length;
    badge.hidden = !n;
    badge.textContent = String(n);
  });
  load();
  browser.storage.onChanged.addListener(load);

  let post: Element | null = null, held = 0, gustUntil = 0, x = innerWidth - 60, y = innerHeight - 100, last = performance.now();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = (now: number) => {
    const dt = Math.min(100, now - last), t = still ? 0 : now - since;
    last = now;
    const onBreak = state === 'drinking' || state === 'energy';
    const flying = !['sleeping', 'error', 'stopping'].includes(state);
    const breakStart = s.breakUntil ? s.breakUntil - breakMs(s.breakKind ?? (state === 'energy' ? 'energy' : 'water')) : Date.now();
    const f = frameOf(state, t, Date.now() - breakStart);
    let p = from ? mix(from, f.pose, ease(t / 500)) : f.pose;
    // There's no rooftop on the page: on a break Koo stops and hovers in place, doing the same breathe/drink routine.
    if (onBreak) { const w = fly(now, 420); p = { ...p, wing: w.wing, fold: 0, feet: 0 }; }
    if (now < gustUntil) { const w = fly(now, 130); p = { ...p, wing: w.wing * 1.4, fold: 0, beak: 0.5 }; } // the big flap
    shown = p;

    // Where Koo heads: the post being read (hovering over its top-right), stays put on a break, or when resting
    // perches on the KOO button (on the panel's top edge while it's open).
    let tx = x, ty = y;
    if (!flying) {
      const b = (frame.hidden ? button : frame).getBoundingClientRect();
      [tx, ty] = [frame.hidden ? b.left + b.width / 2 : b.right - 70, b.top - FOOT + 4];
    } else if (!onBreak) {
      const r = post?.isConnected ? post.getBoundingClientRect() : null;
      [tx, ty] = r ? [r.left + r.width * 0.82, r.top + SIZE * 0.55] : [innerWidth * 0.75, innerHeight * 0.4];
      tx += still ? 0 : 26 * wave(now, 2300); // a little wandering around while it reads
      ty += still ? 0 : 14 * wave(now, 1500, 1);
      [tx, ty] = [clamp(tx, SIZE / 2, innerWidth - SIZE / 2 - 8), clamp(ty, SIZE / 2 + 8, innerHeight - SIZE - 70)];
    }
    const k = still ? 1 : 1 - Math.exp(-dt / 300);
    const vx = (tx - x) * k;
    x += vx;
    y += (ty - y) * k;
    paint(g, { ...p, rot: p.rot + clamp(vx * 1.5, -14, 14) }, f.face, state, f.fx); // lean into the flight
    canvas.style.transform = `translate(${x - SIZE / 2}px, ${y - SIZE / 2}px)`;
    pips.hidden = !flying || !held;
    pips.textContent = '■'.repeat(held) + '□'.repeat(Math.max(0, BATCH_SIZE - held));
    pips.style.transform = `translate(${x}px, ${y - SIZE / 2 - 4}px)`;
    if (!flying) held = 0;
    // Koo's caption, break countdown and the latest status, in a speech bubble beside Koo (left of it, unless near the left edge).
    const left = onBreak && s.breakUntil > Date.now() ? Math.ceil((s.breakUntil - Date.now()) / 1000) : 0;
    const said = state === 'drinking' ? 'Water break…' : STATES[state]!.caption; // no rooftop on the page
    const words = `${said}|${left || ''}|${s.status ?? ''}`;
    if (say.dataset.words !== words) {
      say.dataset.words = words;
      caption.innerHTML = '';
      caption.append(said, ...(left ? [Object.assign(document.createElement('b'), { textContent: `${left}s` })] : []));
      line.textContent = s.status ?? '';
    }
    say.hidden = state === 'sleeping';
    const right = x - SIZE / 2 < 250;
    say.style.transform = right ? `translate(${x + SIZE / 2 - 4}px, ${y - SIZE / 3}px)` : `translate(calc(${x - SIZE / 2 + 4}px - 100%), ${y - SIZE / 3}px)`;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const fx = (cls: string, sx: number, sy: number, ms: number) => {
    const el = Object.assign(document.createElement('i'), { className: cls });
    el.style.transform = `translate(${sx}px, ${sy}px)`;
    root.append(el);
    setTimeout(() => el.remove(), ms);
    return el;
  };

  return {
    panel,
    // The scanner moved on to this post: fly over to it.
    visit: (el: Element) => { post = el; },
    // A new post was read into the batch: a page of its text flies from the post into Koo's backpack.
    collect: (el: Element) => {
      held = Math.min(BATCH_SIZE, held + 1);
      const r = el.getBoundingClientRect();
      const chip = fx('chip', r.left + r.width / 2, clamp(r.top + 80, 0, innerHeight - 60), 1500);
      chip.getBoundingClientRect(); // apply the start position before transitioning away from it
      chip.style.transform = `translate(${x - 50}px, ${y}px) scale(.35)`;
      chip.style.opacity = '0.3';
    },
    // A batch goes to the AI: a big flap and a gush of wind carries the pages off.
    gust: () => {
      held = 0;
      gustUntil = performance.now() + 1800;
      for (let i = 0; i < 4; i++) fx('wind', x + 10, y - 34 + i * 24, 2100).style.animationDelay = `${i * 140}ms`;
      fx('chip ride', x + 30, y - 20, 1800); // the batch of pages rides the wind away
    },
  };
}
