// Serves the production build with the exact headers from public/_headers (as Cloudflare Pages would) and fails if
// the browser blocks anything under the Content-Security-Policy. Usage: npm run build && npx vite preview --port 4173,
// then  node e2e/csp.mjs [http://localhost:4173]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const site = process.argv[2] ?? 'http://localhost:4173';
const rules = readFileSync('public/_headers', 'utf8').split(/\n(?=\S)/).filter((b) => b.startsWith('/*'))[0]
  .split('\n').slice(1).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.route(`${site}/**`, async (route) => {
  const res = await route.fetch();
  const headers = { ...res.headers() };
  if ((headers['content-type'] ?? '').includes('text/html')) for (const [k, v] of rules) headers[k.toLowerCase()] = v;
  await route.fulfill({ response: res, headers });
});
const blocked = [];
await page.exposeFunction('reportBlocked', (v) => blocked.push(v));
await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.reportBlocked(`${e.violatedDirective} ← ${e.blockedURI}`)));
page.on('pageerror', (e) => blocked.push(`pageerror: ${e.message}`));
for (const path of ['/', '/login.html']) {
  await page.goto(site + path, { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(1500);
}
const csp = (await (await page.request.get(site)).headers())['content-security-policy'];
await browser.close();
console.log(JSON.stringify({ applied: rules.map(([k]) => k), blocked }, null, 1));
process.exit(blocked.length ? 1 : 0);
