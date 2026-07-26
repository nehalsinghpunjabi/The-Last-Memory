/**
 * Verifies the mobile fallback: emulates a mid-range phone (small viewport,
 * touch, deviceMemory/cores hints), boots the experience via a touch tap rather
 * than a click, and captures a couple of chapters. Reports the resolved device
 * tier so we can confirm degradation actually kicked in.
 *
 *   node scripts/capture-mobile.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'stills');
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});
const page = await browser.newPage();

// iPhone-ish: small viewport, touch, DPR 3.
await page.emulate({
  name: 'phone',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
});
// Constrain the capability hints the detector reads.
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 });
});

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon/i.test(m.location()?.url ?? '')) errors.push(m.text());
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });

const tier = await page.evaluate(() => {
  // Pull the resolved device profile out of the store if exposed, else infer.
  return window.__TLM ? 'canvas-mounted' : 'pending';
});

await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 30000 }
);

// Tap BEGIN via touch, not click.
const beginBox = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'BEGIN');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.touchscreen.tap(beginBox.x, beginBox.y);
await new Promise((r) => setTimeout(r, 3500));

const profile = await page.evaluate(() => {
  const s = window.__TLM;
  return {
    dpr: s?.gl?.getPixelRatio?.() ?? null,
    drawingBufferW: s?.gl?.getContext?.()?.drawingBufferWidth ?? null,
    innerW: window.innerWidth,
    started: !document.querySelector('button'),
  };
});

const shots = [
  [0.17, 'mobile-genesis'],
  [0.47, 'mobile-golden'],
  [0.9, 'mobile-lastmemory'],
];

for (const [p, name] of shots) {
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * v, behavior: 'instant' });
  }, p);
  await page.evaluate(async (target) => {
    const s = window.__TLM;
    if (!s) return;
    const deadline = performance.now() + 300000;
    let lastY = Infinity;
    let stable = 0;
    while (performance.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
      const dy = Math.abs(s.camera.position.y - lastY);
      lastY = s.camera.position.y;
      if (Math.abs(s.scrollState.eased - target) < 0.005 && dy < 0.4 && ++stable >= 3) return;
    }
  }, p);
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  ${name}`);
}

console.log('tierCanvas:', tier);
console.log('profile:', JSON.stringify(profile));
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
