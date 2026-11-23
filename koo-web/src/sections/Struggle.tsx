import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, still } from '../smooth';
import { Hatch } from '../ui';

// The real struggle of hunting in flat groups. Each line inks in, holds, then blows away as dust while the next arrives.
const LINES = [
  '100s of posts a day.', '1000s a week.', 'New ones every few hours.', 'Reply late? Already booked.',
  'Scroll all day to stay first.', 'Then filter each one by hand.',
];
const chars = (s: string) => s.split('').map((c, i) => <span key={i} className="ch">{c === ' ' ? ' ' : c}</span>);

export function Struggle() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: `+=${LINES.length * 80}%`, pin: '.struggle-stage', scrub: 0.6 } });
    gsap.utils.toArray<HTMLElement>('.line').forEach((line, i, all) => {
      const ch = line.querySelectorAll('.ch');
      tl.fromTo(ch, { opacity: 0, filter: 'blur(10px)', y: 18 }, { opacity: 1, filter: 'blur(0px)', y: 0, stagger: 0.012, duration: 0.5, ease: 'power2.out' });
      tl.to({}, { duration: 0.4 }); // hold
      if (i < all.length - 1)
        tl.to(ch, {
          opacity: 0, filter: 'blur(14px)', scale: 0.4, duration: 0.45, ease: 'power1.in', stagger: { each: 0.008, from: 'random' },
          x: () => gsap.utils.random(120, 520), y: () => gsap.utils.random(-220, 120), rotate: () => gsap.utils.random(-90, 90),
        });
    });
    tl.from('.struggle .after', { opacity: 0, y: 30, duration: 0.5 });
  }, { scope: root });

  return (
    <section id="struggle" className="struggle" ref={root}>
      <div className="struggle-stage">
        <Hatch band={0.3} />
        <p className="label">The struggle</p>
        <div className="lines">{LINES.map((l) => <p key={l} className="line">{chars(l)}</p>)}</div>
        <p className="after">There’s a better way to find a flat.</p>
      </div>
    </section>
  );
}
