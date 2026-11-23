import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, ScrollTrigger, still } from '../smooth';

// The real demo video: it starts small and tilted, then straightens and grows to fill the screen while the steps
// light up word by word beside it.
const STEPS = ['Open a Facebook flat group', 'Set your budget, location and other filters', 'Press Start. Koo reads every post', 'Get only the matches, with phone numbers'];

export function Demo() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const video = root.current!.querySelector('video')!;
    ScrollTrigger.create({ trigger: root.current, start: 'top 80%', end: 'bottom 20%', onToggle: (s) => (s.isActive ? video.play().catch(() => {}) : video.pause()) });
    if (still) return;
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root.current, start: 'top top', end: '+=300%', pin: '.demo-stage', scrub: 0.6 } });
    tl.fromTo('.screen', { scale: 0.45, rotation: -7, yPercent: 10 }, { scale: 1, rotation: 0, yPercent: 0, duration: 2, ease: 'power2.inOut' });
    gsap.utils.toArray<HTMLElement>('.step').forEach((s, i) => {
      tl.to(s.querySelectorAll('.wd'), { opacity: 1, stagger: 0.08, duration: 0.2 }, 2 + i * 1.2)
        .to(s, { opacity: 0.25, duration: 0.3 }, 2 + i * 1.2 + 1.1);
    });
  }, { scope: root });

  return (
    <section id="demo" className="demo" ref={root}>
      <div className="demo-stage">
        <div className="screen" data-hover>
          <video src="/koo-demo.mp4" muted loop playsInline preload="metadata" aria-label="Koo demo: Koo scans a Facebook group and lists matching flats" />
          <span className="rec">● Real run · 1:46</span>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className="step"><b>0{i + 1}</b>{s.split(' ').map((w, j) => <span key={j} className="wd">{w} </span>)}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
