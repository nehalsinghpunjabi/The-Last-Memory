/**
 * Verifies the overlay scroll lock and captures any runtime errors.
 *
 * With a milestone card or the timeline explorer open, the film underneath must
 * hold still: neither a wheel gesture nor the keyboard transport may scrub the
 * camera through the chapter behind the overlay. Closing must restore scrolling.
 *
 * Note on method: this drives real wheel and key events, not `window.scrollBy`.
 * Per spec `overflow: hidden` still permits *programmatic* scrolling, so a
 * scripted `scrollBy` bypasses the lock by design and would report a false
 * failure — it is not a path any user input takes.
 *
 *   node scripts/check-scroll-lock.mjs
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() >= 500) errors.push(`[HTTP ${r.status()}] ${r.url()}`);
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 60000 }
);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
);
await new Promise((r) => setTimeout(r, 3500));

const raw = () => page.evaluate(() => window.__TLM.scrollState.raw);
const settle = (ms = 2500) => new Promise((r) => setTimeout(r, ms));

const wheel = async (dy = 1200) => {
  await page.mouse.move(640, 400);
  await page.mouse.wheel({ deltaY: dy });
  await settle();
};
const keys = async (key = 'PageDown', times = 2) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await settle(700);
  }
  await settle();
};
const openOverlay = async () => {
  // Bound to aria-label, not visible copy: the button's text is product
  // wording and may be reworded, but its accessible name is a contract.
  const opened = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label*="timeline of AI history"]');
    if (!b) return false;
    b.click();
    return true;
  });
  if (!opened) throw new Error('explorer trigger not found — selector is stale');
  await settle(1200);
};
const closeOverlay = async () => {
  await page.keyboard.press('Escape');
  await settle(1200);
};

// 1. Baseline — wheel and keyboard both move the film.
const b0 = await raw();
await wheel(1200);
const wheelMoved = Math.abs((await raw()) - b0) > 0.001;
const k0 = await raw();
await keys('PageDown', 1);
const keyMoved = Math.abs((await raw()) - k0) > 0.001;

// 2. Overlay open — neither may move it.
await openOverlay();
const overflowHidden = await page.evaluate(
  () => getComputedStyle(document.documentElement).overflow === 'hidden'
);
const lockedStart = await raw();
await wheel(1500);
const afterWheel = await raw();
await keys('PageDown', 2);
const afterKeys = await raw();
const heldWheel = Math.abs(afterWheel - lockedStart) < 0.0005;
const heldKeys = Math.abs(afterKeys - lockedStart) < 0.0005;

// 3. Close — scrolling restored.
await closeOverlay();
const r0 = await raw();
await wheel(1200);
const restored = Math.abs((await raw()) - r0) > 0.001;

const line = (label, ok, extra = '') =>
  console.log(`  ${label.padEnd(38)} ${ok ? 'yes' : 'NO '}${extra}`);

line('baseline: wheel moves film', wheelMoved);
line('baseline: keyboard moves film', keyMoved);
line('overlay: html overflow hidden', overflowHidden);
line('overlay: held against wheel', heldWheel, ` (${lockedStart.toFixed(5)} -> ${afterWheel.toFixed(5)})`);
line('overlay: held against keyboard', heldKeys, ` (${lockedStart.toFixed(5)} -> ${afterKeys.toFixed(5)})`);
line('after close: scrolling restored', restored);
console.log(`  runtime errors:                        ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log(`    ${e}`));

const pass =
  wheelMoved && keyMoved && overflowHidden && heldWheel && heldKeys && restored && errors.length === 0;
console.log(`\n  RESULT: ${pass ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(pass ? 0 : 1);
