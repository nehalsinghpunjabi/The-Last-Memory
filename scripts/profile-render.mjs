/**
 * Renderer profiler. Boots the film and, at each chapter, samples the
 * hardware-independent GPU-load metrics from three.js `renderer.info` plus a
 * relative frame-time average. Absolute fps is meaningless under SwiftShader,
 * but draw calls / triangles / memory and *relative* frame cost between scenes
 * are exactly what a real GPU is bounded by, and are comparable before/after.
 *
 *   node scripts/profile-render.mjs
 */
import puppeteer from 'puppeteer-core';

const CHAPTERS = [
  ['prologue', 0.04],
  ['genesis', 0.16],
  ['humanity', 0.31],
  ['goldenAge', 0.48],
  ['fall', 0.64],
  ['solitude', 0.77],
  ['lastMemory', 0.89],
  ['reveal', 0.98],
];

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 600000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
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

// Pin DPR to 1.0 so frame-time comparisons reflect geometry/shader cost rather
// than SwiftShader's fill rate, and so before/after runs are directly comparable.
await page.evaluate(() => window.__TLM.gl.setPixelRatio(1));

process.stdout.write('  scene        dpr   calls   tris(k)  geo  tex  prog   frameMs\n');
const rows = [];
for (const [name, pos] of CHAPTERS) {
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * v, behavior: 'instant' });
  }, pos);
  // Let the damped playhead settle and the scene populate.
  await new Promise((r) => setTimeout(r, 5000));

  const m = await page.evaluate(async () => {
    const gl = window.__TLM.gl;
    // renderer.info auto-resets at the start of every render() call, and the
    // post-processing composer renders several passes per frame — so a naive
    // read only sees the final fullscreen quad. Disable autoReset, zero it, and
    // let exactly one full frame accumulate across all passes.
    gl.info.autoReset = false;
    gl.info.reset();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const frameCalls = gl.info.render.calls;
    const frameTris = gl.info.render.triangles;
    gl.info.autoReset = true;
    // Median frame time over a handful of frames. Under SwiftShader these are
    // absurdly slow in absolute terms; only the ratio between scenes matters.
    const times = [];
    let last = performance.now();
    await new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        const now = performance.now();
        times.push(now - last);
        last = now;
        if (++n < 6) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    return {
      dpr: gl.getPixelRatio(),
      // Halved: the accumulator spans two rAFs to guarantee one complete frame.
      calls: Math.round(frameCalls / 2),
      tris: Math.round(frameTris / 2),
      geo: gl.info.memory.geometries,
      tex: gl.info.memory.textures,
      prog: gl.info.programs?.length ?? 0,
      frameMs: median,
      eased: window.__TLM.scrollState.eased,
    };
  });
  rows.push([name, m]);
  process.stdout.write(
    `  ${name.padEnd(11)} ${m.dpr.toFixed(2)}  ${String(m.calls).padStart(5)}  ` +
      `${(m.tris / 1000).toFixed(0).padStart(6)}  ${String(m.geo).padStart(4)} ${String(m.tex).padStart(4)} ` +
      `${String(m.prog).padStart(4)}  ${m.frameMs.toFixed(1).padStart(7)}\n`
  );
}

const peak = rows.reduce((a, b) => (b[1].calls > a[1].calls ? b : a));
console.log(`\n  peak draw calls: ${peak[1].calls} (${peak[0]})`);
console.log(`  peak triangles:  ${(Math.max(...rows.map((r) => r[1].tris)) / 1000).toFixed(0)}k`);
await browser.close();
