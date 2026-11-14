import { useEffect, useRef } from 'react';
import { BREAK, breakMs } from '@/lib/energy';

// Koo, the baby explorer bird (assets/avatar.md). Purely presentational: it acts out whatever state the scanner wrote
// to storage (`agent`) and never drives the search itself.
export const STATES: Record<string, { caption: string; scene: 'sky' | 'tree' }> = {
  sleeping: { caption: 'Taking a little rest…', scene: 'tree' },
  starting: { caption: 'Taking off…', scene: 'sky' },
  searching: { caption: 'Searching for your next home…', scene: 'sky' },
  dancing: { caption: 'Found a match!', scene: 'sky' },
  irritated: { caption: 'Still searching… where are all the flats?', scene: 'sky' },
  drinking: { caption: 'Water break on a rooftop…', scene: 'sky' },
  energy: { caption: 'Energy drink! Recharging…', scene: 'sky' },
  stopping: { caption: 'Landing…', scene: 'tree' },
  error: { caption: 'Something went wrong', scene: 'tree' },
};
export const stateOf = (agent: string | undefined) => (agent && STATES[agent] ? agent : 'sleeping');

const C = { blue: '#2563EB', light: '#93C5FD', orange: '#F59E0B', cream: '#FEF3C7', dark: '#0F172A', brown: '#8B5A2B' };

// One pose = everything that moves. Each animation frame computes a pose from the clock, so motion is continuous
// (a new in-between every frame, ~60/s) and a state change blends from wherever Koo is to the new motion.
// wing: degrees above horizontal; fold 0 = spread wide, 1 = tucked; hold/tilt: bottle out of the bag / tipped to the beak;
// land: 0 = flying at sky height, 1 = on the rooftop; perch: on the night branch; roof: rooftop x (1 right, 0 under Koo, -1 left).
export const REST = { x: 0, y: 0, rot: 0, sy: 1, wing: -68, fold: 1, feet: 1, hold: 0, tilt: 0, puff: 0, beak: 0, float: 0, land: 0, perch: 0, roof: 1 };
export type Pose = typeof REST;
type Face = 'open' | 'shut' | 'happy' | 'tired' | 'cross' | 'angry';
type Frame = { pose: Pose; face: Face; fx?: string };

const TAU = Math.PI * 2;
export const wave = (t: number, ms: number, phase = 0) => Math.sin((t / ms) * TAU + phase);
export const ease = (k: number) => ((k = Math.min(1, Math.max(0, k))), k * k * (3 - 2 * k));
const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });
export const mix = (a: Pose, b: Pose, k: number) => {
  const o = { ...a };
  for (const n in a) o[n as keyof Pose] += (b[n as keyof Pose] - a[n as keyof Pose]) * k;
  return o;
};
export const fly = (t: number, ms = 380) => pose({ wing: 8 + 40 * wave(t, ms), fold: 0, feet: 0, y: -6 * wave(t, ms, 1.2), rot: 3 });

// The break, scripted on the clock from its start: land → heavy breathing → bottle out → drink → bottle back → fly up.
function breakFrame(t: number, kind: 'water' | 'energy'): Frame {
  const { land, breathe, bag, takeoff } = BREAK;
  const drink = breakMs(kind) - land - breathe - 2 * bag - takeoff;
  const sat = pose({ land: 1, roof: 0 });
  if (t < land) {
    const k = t / land;
    return { face: 'open', pose: { ...mix(fly(t, 380 + 300 * k), sat, ease((k - 0.7) / 0.3)), land: ease(k), roof: 1 - Math.sin((k * Math.PI) / 2) } };
  }
  if ((t -= land) < breathe) {
    const squash = 0.1 * Math.max(0, 1 - t / 250); // touchdown
    return { face: 'tired', pose: { ...sat, sy: 1 - squash - 0.05 * (0.5 + 0.5 * wave(t, 500)), beak: 0.8, puff: (t % 500) / 500 } };
  }
  if ((t -= breathe) < bag) return { face: 'open', pose: { ...sat, hold: ease(t / bag) } };
  if ((t -= bag) < drink) {
    const sip = ease(t / 300) * ease((drink - t) / 300) * (0.8 + 0.2 * wave(t, 1100));
    return { face: 'happy', pose: { ...sat, hold: 1, tilt: sip, beak: 0.4 * sip, y: 1.5 * wave(t, 550) } };
  }
  if ((t -= drink) < bag) return { face: 'happy', pose: { ...sat, hold: 1 - ease(t / bag) } };
  t -= bag;
  const k = Math.min(1, t / takeoff);
  return { face: 'open', pose: { ...mix(sat, fly(t), ease(k / 0.25)), land: 1 - ease(k), roof: -(1 - Math.cos((k * Math.PI) / 2)) } };
}

export function frameOf(state: string, t: number, sinceBreak: number): Frame {
  switch (state) {
    case 'drinking': return breakFrame(sinceBreak, 'water');
    case 'energy': return breakFrame(sinceBreak, 'energy');
    case 'starting': case 'searching': return { face: 'open', pose: fly(t) };
    case 'stopping': return { face: 'open', pose: { ...fly(t), perch: 1 } };
    case 'irritated': return { face: 'angry', fx: '💢', pose: { ...fly(t, 640), rot: 3 + 5 * wave(t, 900), float: 0.5 + 0.5 * wave(t, 600) } };
    case 'dancing': return { face: 'happy', fx: '♪', pose: { ...fly(t, 520), x: 12 * wave(t, 700), rot: 9 * wave(t, 700), y: -8 * Math.abs(wave(t, 700)), beak: 0.6, float: (t % 1400) / 1400 } };
    case 'error': return { face: 'cross', pose: pose({ perch: 1, x: t < 900 ? 6 * wave(t, 140) * (1 - t / 900) : 0 }) };
    default: return { face: 'shut', fx: 'z', pose: pose({ perch: 1, sy: 1 - 0.03 * (0.5 + 0.5 * wave(t, 3000)), float: (t % 2200) / 2200 }) };
  }
}

// Drawn on a 240-unit canvas at PX×PX, every pixel snapped to Koo's palette: crisp retro pixels, scaled up unblurred.
export const PX = 96, U = 240, FEET = 196;
const PALETTE = [...Object.values(C), '#FFFFFF', '#DC2626', '#FDE047'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

export function paint(g: CanvasRenderingContext2D, p: Pose, face: Face, state: string, fx?: string) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, PX, PX);
  g.setTransform(PX / U, 0, 0, PX / U, 0, 0);
  g.translate(120 + p.x, p.y);
  g.translate(0, FEET); g.rotate((p.rot * Math.PI) / 180); g.scale(2 - p.sy, p.sy); g.translate(0, -FEET);
  g.lineJoin = g.lineCap = 'round';
  const shape = (fill: string | null, draw: () => void, stroke = C.dark, width = 4) => {
    g.beginPath(); draw();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  };
  const circle = (x: number, y: number, r: number) => () => g.ellipse(x, y, r, r, 0, 0, TAU);
  const at = (x: number, y: number, rot: number, draw: () => void) => { g.save(); g.translate(x, y); g.rotate(rot); draw(); g.restore(); };

  // The bottle (or can) travels from the backpack to in front of Koo, then tips up to the beak.
  const prop = () => {
    if (p.hold < 0.02) return;
    const h = p.hold, k = p.tilt;
    const x = -34 + (16 + 34) * h + (8 - 16) * k, y = 128 + (142 - 128) * h + (116 - 142) * k;
    at(x, y, -k * 1.9, () => {
      if (state === 'energy') {
        shape('#DC2626', () => g.rect(-7, -13, 14, 26));
        shape(null, () => { g.moveTo(3, -8); g.lineTo(-3, 1); g.lineTo(3, 1); g.lineTo(-2, 9); }, '#FDE047', 3);
      } else {
        shape(C.light, () => g.rect(-6, -12, 12, 24), C.dark, 3);
        shape(C.blue, () => g.rect(-4, -18, 8, 6), C.dark, 3);
      }
    });
  };
  const wing = (side: 1 | -1) => {
    g.save();
    g.translate(side * 22, 126); g.scale(side, 1); g.rotate((-p.wing * Math.PI) / 180); g.scale(1 - 0.55 * p.fold, 1 - 0.2 * p.fold);
    shape(C.blue, () => {
      g.moveTo(-4, -10); g.bezierCurveTo(24, -26, 58, -28, 92, -18);
      for (const [a, b] of [[76, -6], [84, 2], [62, 4], [68, 12], [46, 10], [48, 18], [24, 12]]) g.lineTo(a!, b!);
      g.lineTo(-4, 12); g.closePath();
    });
    shape(null, () => { g.moveTo(8, -9); g.bezierCurveTo(30, -18, 56, -20, 80, -16); }, C.light, 4);
    g.restore();
  };

  shape(C.blue, () => { g.moveTo(-18, 164); g.lineTo(-48, 184); g.lineTo(-38, 168); g.lineTo(-52, 162); g.lineTo(-20, 150); g.closePath(); }); // tail
  shape(C.brown, () => g.roundRect(-50, 120, 26, 36, 6)); // backpack
  if (p.hold < 0.5) prop();
  g.globalAlpha = p.feet;
  shape(null, () => { for (const x of [-10, 10]) { g.moveTo(x, 172); g.lineTo(x, 190); g.moveTo(x - 6, 192); g.lineTo(x + 6, 192); } }, C.orange, 5);
  g.globalAlpha = 1;
  shape(C.blue, () => g.ellipse(0, 150, 30, 28, 0, 0, TAU)); // small round body
  shape(C.cream, () => g.ellipse(2, 156, 19, 18, 0, 0, TAU), '');
  wing(-1); wing(1);
  shape(C.blue, () => { g.moveTo(-4, 80); g.lineTo(-10, 62); g.lineTo(-1, 72); g.lineTo(4, 58); g.lineTo(7, 79); }); // tuft
  shape(C.blue, circle(0, 104, 27)); // head
  shape(C.cream, () => g.ellipse(0, 112, 18, 14, 0, 0, TAU), '');
  shape(null, () => { g.moveTo(-27, 94); g.quadraticCurveTo(0, 80, 27, 94); }, C.brown, 5); // goggle strap
  for (const x of [-10, 10]) shape(C.light, circle(x, 89, 7), C.brown, 3);
  for (const x of [-9, 9]) {
    if (face === 'open' || face === 'angry') {
      shape('#FFFFFF', circle(x, 107, 5.5), C.dark, 2.5);
      shape(C.dark, circle(x + 1, 108, 3), '');
    } else if (face === 'cross') {
      shape(null, () => { g.moveTo(x - 5, 102); g.lineTo(x + 5, 112); g.moveTo(x + 5, 102); g.lineTo(x - 5, 112); }, C.dark, 3);
    } else {
      const dy = face === 'happy' ? -6 : face === 'tired' ? 0 : 4;
      shape(null, () => { g.moveTo(x - 6, 107); g.quadraticCurveTo(x, 107 + dy, x + 6, 107); }, C.dark, 3);
    }
  }
  if (face === 'angry') shape(null, () => { g.moveTo(-16, 97); g.lineTo(-4, 101); g.moveTo(16, 97); g.lineTo(4, 101); }, C.dark, 3);
  const b = p.beak;
  shape(C.orange, () => { g.moveTo(-6, 114); g.lineTo(6, 114); g.lineTo(0, 120 - 2 * b); g.closePath(); }, C.dark, 2.5);
  if (b > 0.15) shape(C.orange, () => { g.moveTo(-5, 117 + 3 * b); g.lineTo(5, 117 + 3 * b); g.lineTo(0, 121 + 6 * b); g.closePath(); }, C.dark, 2.5);
  if (p.puff > 0 && p.puff < 0.7) shape('#FFFFFF', circle(18 + 24 * p.puff, 116 - 8 * p.puff, 6 * (1 - 0.4 * p.puff)), C.dark, 2); // sigh puff
  if (p.hold >= 0.5) prop();
  if (fx) {
    g.font = `bold ${fx === '💢' ? 22 + 6 * p.float : 24}px monospace`;
    g.fillStyle = fx === 'z' ? C.blue : C.orange;
    if (fx === '💢') g.fillText(fx, 30, 72);
    else if (p.float < 0.85) g.fillText(fx, 30 + 8 * p.float, 76 - 34 * p.float);
  }

  const px = g.getImageData(0, 0, PX, PX), d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 110) { d[i + 3] = 0; continue; }
    let best = PALETTE[0]!, dist = Infinity;
    for (const c of PALETTE) {
      const e = (d[i]! - c[0]!) ** 2 + (d[i + 1]! - c[1]!) ** 2 + (d[i + 2]! - c[2]!) ** 2;
      if (e < dist) [best, dist] = [c, e];
    }
    [d[i], d[i + 1], d[i + 2], d[i + 3]] = [best[0]!, best[1]!, best[2]!, 255];
  }
  g.putImageData(px, 0, 0);
}

// Deterministic skyline so it doesn't jump between renders; drawn twice side by side and scrolled for an endless city.
const BUILDINGS = Array.from({ length: 14 }, (_, i) => ({ x: i * 30, w: 22 + ((i * 7) % 9), h: 40 + ((i * 37) % 70) }));
function Skyline({ className }: { className: string }) {
  const one = (dx: number) =>
    BUILDINGS.map((b) => (
      <g key={`${dx}-${b.x}`}>
        <rect x={b.x + dx} y={120 - b.h} width={b.w} height={b.h} />
        <rect x={b.x + dx + 4} y={128 - b.h} width={b.w - 8} height={b.h - 16} fill={`url(#win-${className})`} />
      </g>
    ));
  return (
    <svg className={`skyline ${className}`} viewBox="0 0 840 120" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <pattern id={`win-${className}`} width={7} height={10} patternUnits="userSpaceOnUse">
        <rect width={4} height={5} className="win" />
      </pattern>
      {one(0)}{one(420)}
    </svg>
  );
}

export function KooStage({ agent, breakUntil, breakKind }: { agent: string | undefined; breakUntil?: number; breakKind?: 'water' | 'energy' }) {
  const state = stateOf(agent);
  const { scene, caption } = STATES[state]!;
  const onBreak = state === 'drinking' || state === 'energy';
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null);
  const shown = useRef<Pose | null>(null);

  useEffect(() => {
    const g = canvas.current!.getContext('2d', { willReadFrequently: true })!;
    const style = stage.current!.style;
    // Break timing comes from the scanner's breakUntil, so a panel opened mid-break joins the scene at the right moment.
    const breakStart = onBreak && breakUntil ? breakUntil - breakMs(breakKind ?? (state === 'energy' ? 'energy' : 'water')) : Date.now();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const target = frameOf(state, 0, Date.now() - breakStart).pose;
    const from = shown.current ?? target;
    const blend = from.perch !== target.perch ? 1400 : 500; // a change of place (branch ↔ sky) glides slower
    let raf = 0;
    const draw = (now: number) => {
      const t = still ? 0 : now - start;
      const f = frameOf(state, t, still ? BREAK.land + BREAK.breathe + BREAK.bag + 1000 : Date.now() - breakStart);
      const p = still ? f.pose : mix(from, f.pose, ease(t / blend));
      shown.current = p;
      paint(g, p, f.face, state, f.fx);
      style.setProperty('--land', String(p.land));
      style.setProperty('--perch', String(p.perch));
      style.setProperty('--roof', String(p.roof));
      stage.current?.classList.toggle('halt', p.land > 0.97); // the city stops scrolling while Koo stands on the roof
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state, breakUntil]);

  return (
    <div className="stage" ref={stage}>
      <div className="scenes" aria-hidden="true">
        <div className={`scene sky${scene === 'sky' ? ' on' : ''}`}>
          <div className="cloud c1" /><div className="cloud c2" />
          <Skyline className="far" /><Skyline className="near" />
          {onBreak && <div className="roof" />}
          <div className="ground" />
        </div>
        <div className={`scene tree${scene === 'tree' ? ' on' : ''}`}>
          <div className="moon" /><div className="branch" />
        </div>
      </div>
      <div className="buddy">
        <canvas ref={canvas} width={PX} height={PX} className="koo" role="img" aria-label={`Koo: ${caption}`} />
      </div>
    </div>
  );
}
