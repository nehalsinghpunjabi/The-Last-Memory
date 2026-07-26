/**
 * Verifies in-world artifact interaction: artifacts exist in the hall, a real
 * click on one (at its projected screen position) opens the record, and the
 * panel scrolls independently while the timeline stays frozen and is restored
 * on close.
 *
 *   node scripts/check-artifacts.mjs
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
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));

await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 60000 }
);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
);
await new Promise((r) => setTimeout(r, 3000));

const TARGET = 0.3;
await page.evaluate((v) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: max * v, behavior: 'instant' });
}, TARGET);
const deadline = Date.now() + 120000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 500));
  const e = await page.evaluate(() => window.__TLM.scrollState.eased);
  if (Math.abs(e - TARGET) < 0.005) break;
}

// How many artifacts are in the hall, and where is one of them on screen?
const found = await page.evaluate(() => {
  const { scene, camera } = window.__TLM;
  const THREE = window.__TLM.THREE;
  const artifacts = [];
  scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uArtifact?.value === 1) artifacts.push(o);
  });
  const onScreen = [];
  for (const a of artifacts) {
    const p = a.getWorldPosition(new a.position.constructor());
    p.project(camera);
    if (p.z > 0 && p.z < 1 && Math.abs(p.x) < 0.75 && Math.abs(p.y) < 0.75) {
      onScreen.push({
        x: Math.round(((p.x + 1) / 2) * window.innerWidth),
        y: Math.round(((-p.y + 1) / 2) * window.innerHeight),
      });
    }
  }
  return { total: artifacts.length, onScreen };
});

let opened = false;
let originUsed = false;
for (const pt of found.onScreen.slice(0, 6)) {
  await page.mouse.move(pt.x, pt.y);
  await new Promise((r) => setTimeout(r, 400));
  await page.mouse.click(pt.x, pt.y);
  await new Promise((r) => setTimeout(r, 900));
  const state = await page.evaluate(() => ({
    dialog: !!document.querySelector('[role="dialog"]'),
  }));
  if (state.dialog) {
    opened = true;
    originUsed = true;
    break;
  }
}

// Panel scrolls independently; timeline frozen; position restored on close.
let panelScrolled = false;
let timelineFrozen = false;
let restored = false;
if (opened) {
  const before = await page.evaluate(() => window.__TLM.scrollState.raw);
  const panel0 = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return { top: d?.scrollTop ?? -1, overflows: d ? d.scrollHeight > d.clientHeight + 4 : false };
  });
  await page.mouse.move(1000, 400);
  await page.mouse.wheel({ deltaY: 700 });
  await new Promise((r) => setTimeout(r, 1200));
  const panelTop1 = await page.evaluate(
    () => document.querySelector('[role="dialog"]')?.scrollTop ?? -1
  );
  const after = await page.evaluate(() => window.__TLM.scrollState.raw);
  // A card shorter than the viewport has nothing to scroll — that is correct
  // behaviour, not a failure. Only assert movement when the panel overflows.
  panelScrolled = panel0.overflows ? panelTop1 > panel0.top : true;
  timelineFrozen = Math.abs(after - before) < 0.0005;

  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 1200));
  const back = await page.evaluate(() => window.__TLM.scrollState.raw);
  restored = Math.abs(back - before) < 0.0005;
}

const line = (l, ok, extra = '') => console.log(`  ${l.padEnd(36)} ${ok ? 'yes' : 'NO '}${extra}`);
console.log(`  artifacts in hall:                   ${found.total} (on screen: ${found.onScreen.length})`);
line('click in 3D opened the record', opened);
line('panel scrolls independently', panelScrolled);
line('timeline frozen while open', timelineFrozen);
line('timeline position restored on close', restored);
console.log(`  runtime errors:                      ${errors.length}`);
errors.slice(0, 6).forEach((e) => console.log(`    ${e}`));

const pass = found.total > 0 && opened && panelScrolled && timelineFrozen && restored && !errors.length;
console.log(`\n  RESULT: ${pass ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(pass ? 0 : 1);
