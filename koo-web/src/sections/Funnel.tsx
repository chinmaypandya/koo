import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, still } from '../smooth';

// 146 posts in 4 minutes → 1 match. Koo sweeps the grid row by row; each post it reads fades out, one stays and opens up.
const N = 146, MATCH = 87, COLS = 16;
const price = (i: number) => `₹${12 + ((i * 13) % 38)}k`;

export function Funnel() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    const read = gsap.utils.toArray<HTMLElement>('.post').filter((el) => el.dataset.i !== String(MATCH));
    const count = { n: 0 };
    const out = root.current!.querySelector('.count b')!;
    const rows = Math.ceil(N / COLS);
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root.current, start: 'top top', end: '+=360%', pin: '.funnel-stage', scrub: 0.6 } });
    tl.from('.post', { opacity: 0, scale: 0.6, duration: 1, stagger: { each: 0.004, from: 'random' } })
      .addLabel('scan')
      .set('.scout', { opacity: 1, left: '-4%', top: '0%' }, 'scan')
      .to('.scout', { // zigzag: down a row, then across it
        keyframes: Array.from({ length: rows }, (_, r) => [
          { top: `${(r / rows) * 100}%`, duration: 0.1 }, { left: r % 2 ? '-4%' : '96%', scaleX: r % 2 ? -1 : 1, duration: 0.9 },
        ]).flat(), duration: 6,
      }, 'scan')
      .to(read, { opacity: 0.07, scale: 0.7, filter: 'grayscale(1)', duration: 0.3, stagger: 6 / read.length }, 'scan')
      .to(count, { n: N, duration: 6, onUpdate: () => (out.textContent = String(Math.round(count.n))) }, 'scan')
      .to('.scout', { opacity: 0, duration: 0.4 })
      .addLabel('match')
      .to('.count .of', { opacity: 1, duration: 0.4 }, 'match')
      .to(`.post[data-i="${MATCH}"]`, { scale: 1.6, backgroundColor: '#2563EB', duration: 0.6 }, 'match')
      .fromTo('.match', { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'back.out(1.6)' })
      .from('.dancer', { y: 80, opacity: 0, rotate: -15, duration: 0.8, ease: 'back.out(2)' }, '<0.3')
      .to({}, { duration: 1 });
  }, { scope: root });

  return (
    <section id="funnel" className="funnel" ref={root}>
      <div className="funnel-stage">
        <div className="funnel-copy">
          <p className="label">One real run</p>
          <p className="count"><b>146</b> posts read<span className="of"> · in 4 minutes · <em>1 match</em></span></p>
        </div>
        <div className="grid" aria-hidden="true">
          {Array.from({ length: N }, (_, i) => <div key={i} data-i={i} className="post"><i />{price(i)}</div>)}
          <img className="scout" src="/koo/fly2.png" alt="" />
        </div>
        <div className="match" role="note">
          <p className="verdict">Match – 2BHK, ₹28k, ~3 km away, furnished</p>
          <p className="meta">📞 Phone ready · 💬 Poster on Facebook</p>
          <img className="dancer" src="/koo/dance.png" alt="Koo dancing" />
        </div>
      </div>
    </section>
  );
}
