// Scroll the site like a person (real wheel events, so Lenis + ScrollTrigger run) and save a screenshot every few
// steps, plus a video. Fails on page errors or sideways overflow.
// Usage: npm run dev, then  node e2e/tour.mjs [url] [outDir] [width] [height] [steps]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url = 'http://localhost:5173/', out = 'e2e/out', w = '1440', h = '900', steps = '40'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, recordVideo: { dir: out, size: { width: +w, height: +h } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.mouse.move(+w * 0.6, +h * 0.5);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const per = +steps ? Math.ceil(total / +steps / 120) : 0; // steps 0 = one screenshot, no scrolling
for (let i = 0; i <= +steps; i++) {
  if (i && !per) break;
  await page.screenshot({ path: `${out}/${String(i).padStart(2, '0')}.png` });
  for (let k = 0; k < per; k++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(25); }
  await page.waitForTimeout(700);
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
await ctx.close(); await browser.close();
console.log(JSON.stringify({ scrollHeight: total, overflowX: overflow, errors }, null, 1));
if (errors.length || overflow) process.exit(1);
