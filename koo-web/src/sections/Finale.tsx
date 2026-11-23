import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, still } from '../smooth';
import { Hatch, Magnetic } from '../ui';

// The LinkedIn posts about Koo: an excerpt each, linking to the full post.
const POSTS = [
  {
    tag: 'Why I built Koo',
    text: `I was recently looking for flats to move to Bangalore, and a lot of the search happened through Facebook groups.

I'd scroll through hundreds of posts, open them one by one… It got tedious pretty quickly. So I built Koo.`,
    url: 'https://www.linkedin.com/posts/chinmaypandya043_ai-sideproject-weekendproject-ugcPost-7527367630064791552-ai5y/',
  },
  {
    tag: 'Koo v2',
    text: `The bird is finally out of its cage.

In V1, Koo lived inside the Chrome side panel. For V2, Koo flies across the page itself: towards each post, hovering while it reads, then on to the next.`,
    url: 'https://www.linkedin.com/posts/chinmaypandya043_productdesign-browserautomation-buildinpublic-ugcPost-7527868425470226432-KMAa/',
  },
  {
    tag: 'First real run',
    text: `I searched across 146 flat posts in 4 mins, got 1 match using my project Koo.

Why wait for a week when you can do the same search in 5 minutes?`,
    url: 'https://www.linkedin.com/posts/chinmaypandya043_i-searched-across-146-flat-posts-in-4-mins-ugcPost-7528114753991516160-0V1-/',
  },
];
const GITHUB = 'https://github.com/chinmaypandya/koo';
const EMAIL = 'chinmaypandya043@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/chinmaypandya043/';

export function Finale() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    gsap.from('.finale .rise', { y: 60, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 60%' } });
    gsap.from('.sleeper', { y: -200, opacity: 0, duration: 1.4, ease: 'bounce.out', scrollTrigger: { trigger: '.branch', start: 'top 95%' } });
    // Cards tilt toward the pointer.
    gsap.utils.toArray<HTMLElement>('.li-card').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5 }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.5 });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx((0.5 - (e.clientY - r.top) / r.height) * 12); });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }, { scope: root });

  return (
    <section id="start" className="finale" ref={root}>
      <Hatch ink="254,243,199" band={0.4} />
      <h2 className="rise">Why wait a week?</h2>
      <p className="rise sub">Do the same search in 5 minutes. You don’t even have to stay on Facebook.</p>
      <div className="li rise">
        {POSTS.map((p) => (
          <a key={p.url} className="li-card" href={p.url} target="_blank" rel="noopener">
            <p className="li-head">in · {p.tag}</p>
            <p className="li-text">{p.text}</p>
            <span className="li-more">Read on LinkedIn →</span>
          </a>
        ))}
      </div>
      <div className="ctas rise">
        <Magnetic><a className="pill solid" href={GITHUB} target="_blank" rel="noopener">Get Koo, free</a></Magnetic>
        <Magnetic><a className="pill" href="/login.html">Sign up · 50 free 🪙</a></Magnetic>
      </div>
      <div className="reach rise">
        <p className="label">Reach out</p>
        <p className="reach-links">
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <a href={LINKEDIN} target="_blank" rel="noopener">LinkedIn ↗</a>
        </p>
      </div>
      <div className="perch" aria-hidden="true"><img className="sleeper" src="/koo/sleep.png" alt="" /><div className="branch" /></div>
      <footer>Koo · made for flat hunters · <a href={GITHUB} target="_blank" rel="noopener">GitHub</a></footer>
    </section>
  );
}
