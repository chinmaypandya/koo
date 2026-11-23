// Renders the share image (public/og.png, 1200×630) from the live hero. Run with the dev server up.
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500); // intro animation
await page.addStyleTag({ content: '.rail,.cursor,.top .coin{display:none!important}' });
await page.mouse.move(900, 200);
await page.waitForTimeout(800);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
