// Shared pieces: the hatch-line backdrop, the dot cursor, magnetic hover, the side rail and the 🪙 credits pill.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { credits } from './auth';
import { gsap, ScrollTrigger, scrollTo, still } from './smooth';

// Engraving-style backdrop: horizontal ink lines whose weight follows a slow, drifting cloud shape, and bend around the cursor.
export function Hatch({ ink = '15,21,34', band = 0.55, className = '' }: { ink?: string; band?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!;
    let w = 0, h = 0, raf = 0, on = false;
    const mouse = { x: -1e4, y: -1e4 };
    const size = () => { const r = c.getBoundingClientRect(); w = c.width = r.width; h = c.height = r.height; };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const draw = (t: number) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = `rgb(${ink})`;
      const T = still ? 0 : t / 4000;
      for (let y = 3; y < h; y += 6) {
        const v = (y / h - 0.5) / band; // vertical falloff: a band across the middle
        const fy = Math.exp(-v * v * 3);
        if (fy < 0.03) continue;
        for (let x = 0; x < w; x += 9) {
          const u = x / w;
          const cloud = 0.5 + 0.25 * Math.sin(u * 9 + T + y * 0.013) + 0.25 * Math.sin(u * 23 - T * 1.7 + y * 0.031);
          const fx = Math.sin(Math.PI * u); // fades out at the left/right edges
          const d = Math.hypot(x - mouse.x, y - mouse.y);
          const bend = d < 140 ? Math.sin(d / 14 - t / 120) * 4 * (1 - d / 140) : 0;
          const k = cloud * fy * fx;
          if (k > 0.18) g.fillRect(x, y + bend, 9, Math.min(2.6, k * 2.6));
        }
      }
      if (on && !still) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => { on = e!.isIntersecting; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(draw); });
    size(); io.observe(c); addEventListener('resize', size); addEventListener('pointermove', move);
    if (still) draw(0);
    return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', move); };
  }, [ink, band]);
  return <canvas className={`hatch ${className}`} ref={ref} aria-hidden="true" />;
}

// A dot that trails the pointer and swells over anything clickable.
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (still || !matchMedia('(pointer: fine)').matches) return;
    const el = ref.current!;
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
    const move = (e: PointerEvent) => {
      x(e.clientX); y(e.clientY);
      el.classList.toggle('big', !!(e.target as Element).closest?.('a, button, [data-hover]'));
    };
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, []);
  return <div className="cursor" ref={ref} aria-hidden="true" />;
}

// Pulled gently toward the pointer.
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (still) return;
    const el = ref.current!;
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' }), y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * strength); y((e.clientY - r.top - r.height / 2) * strength); };
    const leave = () => { x(0); y(0); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return <span className="magnetic" ref={ref}>{children}</span>;
}

export const SECTIONS = [
  ['home', 'Home'], ['struggle', 'The struggle'], ['takeoff', 'Appoint Koo'], ['funnel', '146 → 1'], ['demo', 'See it work'], ['start', 'Get Koo'],
] as const;

// Side navigation: one mark per section, the current one stretched into a pill.
export function Rail() {
  const [on, setOn] = useState('home');
  useEffect(() => {
    const t = SECTIONS.map(([id]) => ScrollTrigger.create({ trigger: `#${id}`, start: 'top center', end: 'bottom center', onToggle: (s) => s.isActive && setOn(id) }));
    return () => t.forEach((s) => s.kill());
  }, []);
  return (
    <nav className="rail" aria-label="Sections">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} className={on === id ? 'on' : ''} aria-current={on === id ? 'true' : undefined}
          onClick={(e) => { e.preventDefault(); scrollTo(`#${id}`); }}>
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}

export function TopBar() {
  const [me, setMe] = useState<Awaited<ReturnType<typeof credits>>>(null);
  useEffect(() => { credits().then(setMe).catch(() => {}); }, []);
  return (
    <header className="top">
      <a className="brand" href="/">Koo<sup>®</sup></a>
      <span className="tag">AI flat hunter · Facebook groups</span>
      <Magnetic><a className="coin" href="/login.html" data-hover>🪙 <b>{me ? me.credits : 'Log in'}</b></a></Magnetic>
    </header>
  );
}
