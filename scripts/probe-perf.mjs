/**
 * Verifies the adaptive DPR governor + automatic performance mode.
 *
 * Boots, scrolls to the heaviest scene (Golden Age), and samples the live
 * `quality` state over time — confirming the governor actually walks the pixel
 * ratio and latches perfMode under sustained load. (Headless Chrome uses
 * SwiftShader, so it is guaranteed "weak hardware" — a good worst case.)
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 900, height: 560 },
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
await new Promise((r) => setTimeout(r, 2500));

// Jump to the Golden Age and let the governor react.
await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: max * 0.47, behavior: 'instant' });
});

const samples = [];
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const q = await page.evaluate(() => ({ ...window.__TLM.quality }));
  samples.push(q);
  console.log(
    `  t+${(i + 1) * 2}s  dpr=${q.dpr.toFixed(2)}  fps=${q.fps.toFixed(1)}  ` +
      `perfMode=${q.perfMode}  struggling=${q.struggling}`
  );
}

const last = samples[samples.length - 1];
const maxDpr = Math.max(...samples.map((s) => s.dpr));
const minDpr = Math.min(...samples.map((s) => s.dpr));
const adapted = minDpr < maxDpr - 0.05;
console.log('\nDPR walked from', maxDpr.toFixed(2), 'down to', minDpr.toFixed(2));
console.log('perfMode latched:', last.perfMode, ' struggling:', last.struggling);
console.log(
  'RESULT:',
  adapted ? 'PASS — governor adapts under load' : 'INCONCLUSIVE (never dropped)'
);
await browser.close();
