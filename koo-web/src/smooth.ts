// One scroll engine for the whole page: Lenis smooths the wheel, GSAP's ticker drives it, ScrollTrigger listens.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const lenis = still ? null : new Lenis({ lerp: 0.085 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const scrollTo = (hash: string) =>
  lenis ? lenis.scrollTo(hash, { duration: 1.6 }) : document.querySelector(hash)?.scrollIntoView();

export { gsap, ScrollTrigger };
