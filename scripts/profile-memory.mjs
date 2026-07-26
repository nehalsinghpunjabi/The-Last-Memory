/**
 * GPU memory estimator. three.js reports object *counts*, not bytes, so this
 * walks every live texture and geometry reachable from the scene and sums their
 * actual footprint (texture dimensions x 4 bytes x 1.33 for mipmaps; geometry
 * attribute array byte lengths).
 *
 *   node scripts/profile-memory.mjs
 */
import puppeteer from 'puppeteer-core';

const CHAPTERS = [
  ['prologue', 0.04],
  ['humanity', 0.31],
  ['goldenAge', 0.48],
  ['fall', 0.64],
  ['lastMemory', 0.89],
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

process.stdout.write('  scene        texMB   geoMB   totalMB  (tex count / geo count)\n');
let peak = 0;
for (const [name, pos] of CHAPTERS) {
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * v, behavior: 'instant' });
  }, pos);
  await new Promise((r) => setTimeout(r, 5000));

  const m = await page.evaluate(() => {
    const { scene, gl } = window.__TLM;
    const textures = new Set();
    const geometries = new Set();
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const mat of mats) {
        for (const key of Object.keys(mat)) {
          const v = mat[key];
          if (v && v.isTexture && v.image) textures.add(v);
        }
        if (mat.uniforms) {
          for (const u of Object.values(mat.uniforms)) {
            if (u && u.value && u.value.isTexture && u.value.image) textures.add(u.value);
          }
        }
      }
    });
    let texBytes = 0;
    for (const t of textures) {
      const w = t.image.width ?? 0;
      const h = t.image.height ?? 0;
      texBytes += w * h * 4 * (t.generateMipmaps ? 1.333 : 1);
    }
    let geoBytes = 0;
    for (const g of geometries) {
      for (const attr of Object.values(g.attributes)) {
        if (attr && attr.array) geoBytes += attr.array.byteLength;
      }
      if (g.index) geoBytes += g.index.array.byteLength;
    }
    return {
      texMB: texBytes / 1048576,
      geoMB: geoBytes / 1048576,
      texCount: textures.size,
      geoCount: geometries.size,
      infoTex: gl.info.memory.textures,
      infoGeo: gl.info.memory.geometries,
    };
  });
  const total = m.texMB + m.geoMB;
  peak = Math.max(peak, total);
  process.stdout.write(
    `  ${name.padEnd(11)} ${m.texMB.toFixed(2).padStart(6)}  ${m.geoMB.toFixed(2).padStart(6)}  ` +
      `${total.toFixed(2).padStart(7)}   (${m.texCount} / ${m.geoCount}, gl reports ${m.infoTex} tex)\n`
  );
}
process.stdout.write(`\n  peak scene-reachable GPU memory: ${peak.toFixed(2)} MB\n`);
await browser.close();
