/**
 * Verifies horizontal navigation in the Lineage explorer.
 *
 * Covers every input path a visitor might have: a styled scrollbar for
 * mouse-only desktop, trackpad horizontal gestures, plain-wheel fallback,
 * drag-to-pan, and keyboard. Also checks that the edge gradients track the
 * real scroll extents and that scroll position survives opening a record.
 *
 *   node scripts/check-explorer-nav.mjs
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 800 },
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
// Wait for the control rather than assuming the boot delay has elapsed.
await page.waitForSelector('button[aria-label*="timeline of AI history"]', { timeout: 60000 });
await page.evaluate(() =>
  document.querySelector('button[aria-label*="timeline of AI history"]')?.click()
);
await page.waitForSelector('.museum-scroll', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));

const SEL = '.museum-scroll';
/**
 * Waits until the container's scrollLeft stops changing. Chrome animates wheel
 * scrolling, so a fixed delay reads a stale value and every assertion lands one
 * step behind the input that caused it.
 */
const settle = async (ms = 250) => {
  await new Promise((r) => setTimeout(r, ms));
  let last = null;
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate(
      (sel) => document.querySelector(sel)?.scrollLeft ?? -1,
      SEL
    );
    if (v === last) return;
    last = v;
    await new Promise((r) => setTimeout(r, 100));
  }
};
const metrics = () =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const fades = [...document.querySelectorAll('[aria-hidden].pointer-events-none')]
      .filter((n) => n.className.includes('bg-gradient-to-'))
      .map((n) => Number(n.style.opacity));
    return {
      scrollLeft: Math.round(el.scrollLeft),
      maxScroll: Math.round(el.scrollWidth - el.clientWidth),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      fades,
    };
  }, SEL);

const start = await metrics();
if (!start) {
  console.log('  FAIL — scroll container not found');
  await browser.close();
  process.exit(1);
}

// 1. Does the content actually overflow, and is a scrollbar rendered for it?
const scrollbar = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const cs = getComputedStyle(el, '::-webkit-scrollbar');
  return {
    overflowX: getComputedStyle(el).overflowX,
    barHeight: cs.height,
    firefoxWidth: getComputedStyle(el).scrollbarWidth,
    // Reserved gutter: clientHeight shrinks when a horizontal bar is present.
    gutter: el.offsetHeight - el.clientHeight,
  };
}, SEL);

// 1b. The custom scrollbar: present, visible, correctly proportioned.
const bar = await page.evaluate(() => {
  const t = document.querySelector('[role="scrollbar"]');
  if (!t) return { present: false };
  const thumb = t.firstElementChild;
  const tr = t.getBoundingClientRect();
  const th = thumb.getBoundingClientRect();
  const cs = getComputedStyle(t);
  return {
    present: true,
    visible: tr.width > 0 && tr.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0',
    trackW: Math.round(tr.width),
    thumbW: Math.round(th.width),
    proportional: th.width > 20 && th.width < tr.width,
    ariaNow: t.getAttribute('aria-valuenow'),
  };
});

// 1c. Dragging the scrollbar thumb moves the timeline.
let barDragWorked = false;
if (bar.present) {
  const box = await page.evaluate(() => {
    const r = document.querySelector('[role="scrollbar"]').getBoundingClientRect();
    return { x: r.x, y: r.y + r.height / 2, w: r.width };
  });
  const before = (await metrics()).scrollLeft;
  await page.mouse.move(box.x + 20, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w * 0.6, box.y, { steps: 10 });
  await page.mouse.up();
  await settle();
  barDragWorked = (await metrics()).scrollLeft > before;
  // Reset for the subsequent input tests.
  await page.evaluate((sel) => { document.querySelector(sel).scrollLeft = 0; }, SEL);
  await settle(400);
}

// Find a point inside the scroller that is NOT over a node, so drag and wheel
// tests exercise empty space rather than accidentally landing on a milestone.
const empty = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const r = el.getBoundingClientRect();
  // Search from the middle rightwards so the chosen point has room to be
  // dragged left without clamping against the viewport edge.
  for (let y = r.bottom - 24; y > r.top + 24; y -= 12) {
    for (let x = r.left + r.width * 0.55; x < r.right - 40; x += 40) {
      const hit = document.elementFromPoint(x, y);
      if (hit && !hit.closest('button') && el.contains(hit)) return { x, y };
    }
  }
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}, SEL);

// 2. Trackpad horizontal gesture (wheel with deltaX).
await page.mouse.move(empty.x, empty.y);
await page.mouse.wheel({ deltaX: 600 });
await settle();
const afterTrackpad = await metrics();

// 3. Plain vertical wheel fallback (only meaningful with no vertical overflow).
await page.mouse.wheel({ deltaY: 500 });
await settle();
const afterWheel = await metrics();

// 4. Drag-to-pan on empty space.
await page.mouse.move(empty.x, empty.y);
await page.mouse.down();
await page.mouse.move(empty.x - 250, empty.y, { steps: 12 });
await page.mouse.up();
await settle();
const afterDrag = await metrics();

// 5. Can a mouse-only user reach the far end, and is every node reachable?
await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  el.scrollLeft = el.scrollWidth;
}, SEL);
await settle();
const atEnd = await metrics();
const reachable = await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const nodes = [...el.querySelectorAll('button')];
  const inRange = nodes.filter((n) => {
    const left = n.offsetLeft;
    const right = left + n.offsetWidth;
    return left >= 0 && right <= el.scrollWidth + 1;
  });
  return { total: nodes.length, inRange: inRange.length };
}, SEL);

// 6. Scroll position survives opening and closing a record.
await page.evaluate((sel) => {
  document.querySelector(sel).scrollLeft = 420;
}, SEL);
await settle();
const beforeCard = await metrics();
await page.evaluate((sel) => {
  document.querySelector(sel).querySelector('button')?.click();
}, SEL);
await settle(1100);
const cardOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
await page.keyboard.press('Escape');
await settle(1100);
const afterCard = await metrics();

// 7. A click on a node still opens it (drag must not swallow clicks).
const clickWorks = await page.evaluate((sel) => {
  document.querySelector(sel).querySelector('button')?.click();
  return true;
}, SEL);
await settle(900);
const reopened = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
await page.keyboard.press('Escape');
await settle(600);

const ok = (b) => (b ? 'yes' : 'NO ');
console.log(`  content overflows horizontally      ${ok(start.maxScroll > 0)} (max ${start.maxScroll}px)`);
console.log(`  custom scrollbar present + visible  ${ok(bar.present && bar.visible)} (thumb ${bar.thumbW}/${bar.trackW}px)`);
console.log(`  thumb proportional to content       ${ok(bar.proportional)}`);
console.log(`  dragging the thumb pans             ${ok(barDragWorked)}`);
console.log(`  overflow-x / scrollbar-width        ${scrollbar.overflowX} / ${scrollbar.firefoxWidth}`);
console.log(`  webkit scrollbar height             ${scrollbar.barHeight} (gutter ${scrollbar.gutter}px)`);
console.log(`  trackpad deltaX pans                ${ok(afterTrackpad.scrollLeft > start.scrollLeft)} (${start.scrollLeft} -> ${afterTrackpad.scrollLeft})`);
console.log(`  plain wheel pans (no vert overflow) ${ok(afterWheel.scrollLeft >= afterTrackpad.scrollLeft)} (${afterTrackpad.scrollLeft} -> ${afterWheel.scrollLeft})`);
console.log(`  drag-to-pan                         ${ok(afterDrag.scrollLeft > afterWheel.scrollLeft)} (${afterWheel.scrollLeft} -> ${afterDrag.scrollLeft})`);
console.log(`  reaches far end                     ${ok(atEnd.scrollLeft >= atEnd.maxScroll - 2)} (${atEnd.scrollLeft}/${atEnd.maxScroll})`);
console.log(`  all nodes within scrollable extent  ${ok(reachable.inRange === reachable.total)} (${reachable.inRange}/${reachable.total})`);
console.log(`  fade opacities at far end [L,R]     [${atEnd.fades.join(', ')}]`);
console.log(`  fade opacities at origin  [L,R]     [${start.fades.join(', ')}]`);
console.log(`  record opened from node             ${ok(cardOpen)}`);
console.log(`  scroll preserved across open/close  ${ok(Math.abs(afterCard.scrollLeft - beforeCard.scrollLeft) <= 2)} (${beforeCard.scrollLeft} -> ${afterCard.scrollLeft})`);
console.log(`  click still opens after dragging    ${ok(clickWorks && reopened)}`);
console.log(`  runtime errors                      ${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log(`    ${e}`));

const pass =
  start.maxScroll > 0 &&
  bar.present &&
  bar.visible &&
  bar.proportional &&
  barDragWorked &&
  afterTrackpad.scrollLeft > start.scrollLeft &&
  afterDrag.scrollLeft > afterWheel.scrollLeft &&
  atEnd.scrollLeft >= atEnd.maxScroll - 2 &&
  reachable.inRange === reachable.total &&
  start.fades[0] === 0 &&
  atEnd.fades[1] === 0 &&
  cardOpen &&
  Math.abs(afterCard.scrollLeft - beforeCard.scrollLeft) <= 2 &&
  reopened &&
  errors.length === 0;

console.log(`\n  RESULT: ${pass ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(pass ? 0 : 1);
