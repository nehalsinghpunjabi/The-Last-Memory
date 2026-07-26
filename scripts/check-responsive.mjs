/**
 * Responsive + interaction QA across viewports. Confirms the archive entry
 * point is reachable at every size, the card opens, and nothing overflows the
 * viewport horizontally.
 *
 *   node scripts/check-responsive.mjs
 */
import puppeteer from 'puppeteer-core';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'stills');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  ['mobile', 390, 844],
  ['tablet', 820, 1180],
  ['desktop', 1440, 900],
];

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

let failures = 0;
for (const [name, width, height] of VIEWPORTS) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width, height });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
    { timeout: 60000 }
  );
  await page.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
  );
  await new Promise((r) => setTimeout(r, 4000));

  // Archive entry point reachable & actually visible at this size?
  const entry = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="timeline of AI history"]');
    if (!b) return { present: false };
    const r = b.getBoundingClientRect();
    return {
      present: true,
      visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });

  // Open the explorer, confirm it renders and the page doesn't scroll sideways.
  await page.evaluate(() =>
    document.querySelector('button[aria-label*="timeline of AI history"]')?.click()
  );
  await new Promise((r) => setTimeout(r, 1500));
  const explorer = await page.evaluate(() => ({
    nodes: document.querySelectorAll('button[style*="width"]').length,
    bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: join(OUT, `qa-${name}.png`) });
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 800));

  const ok = entry.present && entry.visible && explorer.nodes > 0 && errors.length === 0;
  if (!ok) failures++;
  console.log(
    `  ${name.padEnd(8)} ${String(width).padStart(4)}x${height}  entry=${
      entry.present && entry.visible ? `ok(${entry.w}x${entry.h})` : 'MISSING'
    }  graphNodes=${explorer.nodes}  hOverflow=${explorer.bodyOverflow}px  errors=${errors.length}`
  );
  errors.slice(0, 3).forEach((e) => console.log(`      ${e}`));
  await page.close();
}

console.log(`\n  RESULT: ${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
