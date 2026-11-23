import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, scrollTo, still } from '../smooth';
import { Hatch, Magnetic } from '../ui';

// Giant KOO wordmark, Koo standing on it. On load the letters rise and Koo hops in; scrolling away Koo crouches and
// leaps out of the top of the frame, handing over to the take-off scene.
export function Hero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro.from('.wordmark span', { yPercent: 110, duration: 1.4, stagger: 0.09 })
      .from('.hero-koo', { y: -260, opacity: 0, rotate: -12, duration: 1.2, ease: 'bounce.out' }, 0.5)
      .from('.hero .reveal', { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 0.7);

    // Koo glances toward the pointer.
    const rot = gsap.quickTo('.hero-koo', 'rotationY', { duration: 0.8 }), lean = gsap.quickTo('.hero-koo', 'rotation', { duration: 0.8 });
    const move = (e: PointerEvent) => { const k = e.clientX / innerWidth - 0.5; rot(k * 30); lean(k * 6); };
    addEventListener('pointermove', move);

    gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-koo', { scaleY: 0.82, y: 20, duration: 0.15 })
      .to('.hero-koo', { scaleY: 1.15, y: '-110vh', rotate: -8, duration: 0.85, ease: 'power3.in' })
      .to('.wordmark', { yPercent: 25, scale: 1.1, opacity: 0, duration: 0.8 }, 0)
      .to('.hero .copy', { y: -80, opacity: 0, duration: 0.5 }, 0);
    return () => removeEventListener('pointermove', move);
  }, { scope: root });

  return (
    <section id="home" className="hero" ref={root}>
      <Hatch band={0.35} className="clear-copy" />
      <div className="copy">
        <p className="eyebrow reveal">Flats in Facebook groups</p>
        <h1 className="lede reveal"><span className="sr-only">Koo, the AI Facebook flat finder: </span>Stop scrolling.<br /><em>Appoint Koo.</em></h1>
        <p className="sub reveal">Koo reads every post in your flat groups and keeps only the ones that fit you.</p>
        <div className="reveal">
          <Magnetic><button className="pill" onClick={() => scrollTo('#struggle')} data-hover>Scroll to take off ↓</button></Magnetic>
        </div>
      </div>
      <img className="hero-koo" src="/koo/hero.png" alt="Koo, a small blue bird with aviator goggles and a backpack with a house on it" />
      <p className="wordmark" aria-hidden="true">{'KOO'.split('').map((c, i) => <span key={i}>{c}</span>)}</p>
    </section>
  );
}
