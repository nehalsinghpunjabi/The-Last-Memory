#!/usr/bin/env node
/**
 * Captures one still per chapter to scripts/stills/.
 *
 * Useful for reviewing the grade and composition of every chapter side by side
 * without scrubbing through the whole film, and for regression-checking a
 * shader change. Rendering is SwiftShader software rasterisation, so this is
 * slow (~20s a frame) and the bloom is slightly less refined than on a GPU —
 * but framing, colour and geometry are exact.
 *
 *   node scripts/capture-stills.mjs
 */

import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'stills');
const URL = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:3000';

const CHROME =
  process.env.CHROME_PATH ??
  ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome'].find(
    (p) => existsSync(p)
  );

const SHOTS = [
  ['00-prologue', 0.035],
  ['01-genesis', 0.17],
  ['02-humanity', 0.3],
  ['03-golden-age', 0.47],
  ['04-fall', 0.65],
  ['05-solitude', 0.78],
  ['06-last-memory', 0.92],
  ['07-reveal', 0.985],
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--window-size=960,540',
  ],
  defaultViewport: { width: 960, height: 540 },
});

const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 30000 }
);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
);
await new Promise((r) => setTimeout(r, 4000));

for (const [name, p] of SHOTS) {
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * v, behavior: 'instant' });
  }, p);

  // The camera has mass: it damps toward the rail rather than snapping to it,
  // and under SwiftShader's ~2fps that settle takes tens of seconds of
  // wall-clock. Wait for the eased playhead AND the camera itself to converge,
  // otherwise every still is a mid-transit frame of the wrong chapter.
  const settled = await page.evaluate(async (target) => {
    const s = window.__TLM;
    if (!s) return false;
    // Generous: under SwiftShader the GSAP ticker can drop to ~1 tick/second
    // while shaders compile, so a settle that takes 1s on a GPU can take
    // minutes here. This budget is about the test harness, not the film.
    const deadline = performance.now() + 420000;
    let lastY = Infinity;
    let stableFrames = 0;

    while (performance.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
      const easedOk = Math.abs(s.scrollState.eased - target) < 0.004;
      const dy = Math.abs(s.camera.position.y - lastY);
      lastY = s.camera.position.y;
      if (easedOk && dy < 0.35) {
        if (++stableFrames >= 4) return true;
      } else {
        stableFrames = 0;
      }
    }
    return false;
  }, p);

  // A couple more frames so the grade cross-fade and scene weights settle.
  await new Promise((r) => setTimeout(r, 2500));

  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${file}${settled ? '' : '   (WARNING: did not settle)'}`);
}

await browser.close();
console.log('\nDone.');
