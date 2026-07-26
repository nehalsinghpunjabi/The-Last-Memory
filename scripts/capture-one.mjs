/**
 * Capture a single chapter still by timeline position. Fast iteration on one
 * shot instead of the full 8-chapter run.
 *   node scripts/capture-one.mjs 0.90 last-memory
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'stills');
mkdirSync(OUT, { recursive: true });

const P = Number(process.argv[2] ?? 0.92);
const NAME = process.argv[3] ?? `t${Math.round(P * 100)}`;

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=960,540'],
  defaultViewport: { width: 960, height: 540 },
});
const page = await browser.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 30000 }
);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
);
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate((v) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: max * v, behavior: 'instant' });
}, P);

const settled = await page.evaluate(async (target) => {
  const s = window.__TLM;
  if (!s) return false;
  const deadline = performance.now() + 420000;
  let lastY = Infinity;
  let stable = 0;
  while (performance.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    const dy = Math.abs(s.camera.position.y - lastY);
    lastY = s.camera.position.y;
    if (Math.abs(s.scrollState.eased - target) < 0.004 && dy < 0.35) {
      if (++stable >= 4) return true;
    } else stable = 0;
  }
  return false;
}, P);

await new Promise((r) => setTimeout(r, 2500));
const file = join(OUT, `${NAME}.png`);
await page.screenshot({ path: file });
console.log(`${file}${settled ? '' : '  (did not settle)'}`);
await browser.close();
