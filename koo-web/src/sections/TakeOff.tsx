import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap, still } from '../smooth';

// The take-off, first through Koo's eyes, then at Koo.
// 1. Koo's eyes: the feed of flat posts below pulls away and turns 90° as Koo climbs and banks (zoom out + rotate).
// 2. Launch: the world rushes at the camera like a rocket leaving (zoom in, motion blur, speed lines).
// 3. The view flips to Koo: tiny in the distance, it grows until it fills the screen, flying straight at us.
const POSTS = [
  '2BHK · Koramangala · ₹28k', 'Booked', 'Still available?', 'DM me', '1RK · HSR · ₹14k', 'Girls only', 'Flatmate needed',
  '3BHK · Bellandur · ₹42k', 'No brokers', 'Interested', 'Price?', 'Semi-furnished', 'Male replacement', 'Gated society',
  '₹25k + deposit', 'Near ORR', 'Sold out', 'Pet friendly', 'Available Dec 1', 'Call 98xxx xxxxx', 'Whitefield · ₹19k',
];
const GRID = 15; // 15×15 tiles, enough to fill the view when zoomed out
const tiles = Array.from({ length: GRID * GRID }, (_, i) => POSTS[(i * 5) % POSTS.length]!);
const CENTER = Math.floor((GRID * GRID) / 2);

export function TakeOff() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    const frames = gsap.utils.toArray<HTMLImageElement>('.flyer img');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root.current, start: 'top top', end: '+=500%', pin: '.pov', scrub: 0.8,
        onUpdate: (s) => { // wing beat follows scroll: one frame per ~1% of the scene
          const f = Math.floor(s.progress * 120) % frames.length;
          frames.forEach((im, i) => (im.style.opacity = i === f ? '1' : '0'));
        },
      },
    });
    tl.set('.world', { xPercent: -50, yPercent: -50, scale: 2.8, rotationX: 0, rotationZ: 0, z: 0 })
      .addLabel('climb')
      .to('.world', { scale: 0.42, rotationZ: -90, rotationX: 52, duration: 4, ease: 'power2.inOut' }, 'climb')
      .to('.cap-1', { opacity: 1, duration: 0.6 }, 'climb')
      .to('.cap-1', { opacity: 0, duration: 0.6 }, 'climb+=3')
      .to('.tile.hot', { color: '#2563EB', duration: 1 }, 'climb+=1.5')
      .addLabel('launch')
      .to('.world', { scale: 14, z: 600, duration: 3, ease: 'power4.in' }, 'launch')
      .to('.world', { filter: 'blur(8px)', opacity: 0, duration: 1.2, ease: 'power2.in' }, 'launch+=1.8')
      .to('.speed', { opacity: 1, scale: 1.4, duration: 1.5 }, 'launch+=1')
      .to('.cap-2', { opacity: 1, duration: 0.5 }, 'launch')
      .to('.cap-2', { opacity: 0, duration: 0.5 }, 'launch+=2.4')
      .addLabel('koo')
      .fromTo('.flyer', { scale: 0.04, opacity: 0, y: -40 }, { scale: 1, opacity: 1, y: 0, duration: 2.4, ease: 'power1.in' }, 'koo-=0.6')
      .to('.speed', { rotation: 30, duration: 4 }, 'koo-=0.6')
      .to('.flyer', { scale: 9, y: 120, filter: 'blur(18px)', duration: 2, ease: 'power3.in' }, 'koo+=1.8') // blur = speed, and hides the small source art
      .to('.speed', { opacity: 0, duration: 1 }, 'koo+=2.4')
      .to('.flash', { opacity: 1, duration: 0.5 }, 'koo+=3.3')
      .from('.appoint .w', { yPercent: 120, duration: 1, stagger: 0.12, ease: 'expo.out' }, 'koo+=3.6')
      .from('.appoint-sub', { opacity: 0, y: 20, duration: 0.8 }, 'koo+=4.2')
      .to({}, { duration: 0.8 });
  }, { scope: root });

  return (
    <section id="takeoff" className="takeoff" ref={root}>
      <div className="pov">
        <div className="world-wrap" aria-hidden="true">
          <div className="world">
            {tiles.map((t, i) => (
              <div key={i} className={`tile${i === CENTER || i % 11 === 3 ? ' hot' : ''}`} style={{ opacity: i === CENTER ? 1 : 0.18 + ((i * 37) % 10) / 22 }}>{t}</div>
            ))}
          </div>
        </div>
        <div className="speed" aria-hidden="true" />
        <div className="flyer" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <img key={i} src={`/koo/fly${i}.png`} alt="" style={{ opacity: i ? 0 : 1 }} />)}</div>
        <p className="cap cap-1"><b>01</b> Koo’s eyes · lifting off the feed</p>
        <p className="cap cap-2"><b>02</b> Launch</p>
        <div className="flash">
          <h2 className="appoint">{['Appoint', 'Koo.'].map((w) => <span key={w} className="mask"><span className="w">{w}</span></span>)}</h2>
          <p className="appoint-sub">It reads the group for you. You only see the flats that fit.</p>
        </div>
      </div>
    </section>
  );
}
