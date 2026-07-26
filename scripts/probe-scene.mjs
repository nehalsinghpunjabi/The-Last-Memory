import puppeteer from 'puppeteer-core';

const P = Number(process.argv[2] ?? 0.92);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 240000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 640, height: 400 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
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
await page.evaluate(async (target) => {
  const s = window.__TLM;
  const deadline = performance.now() + 420000;
  let lastY = Infinity;
  let stable = 0;
  while (performance.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    const dy = Math.abs(s.camera.position.y - lastY);
    lastY = s.camera.position.y;
    if (Math.abs(s.scrollState.eased - target) < 0.004 && dy < 0.35 && ++stable >= 4) return;
  }
}, P);
await new Promise((r) => setTimeout(r, 2000));

const info = await page.evaluate(() => {
  const state = window.__TLM;
  if (!state) return { error: 'no __TLM handle (dev build only)' };

  const { camera, scene, gl } = state;
  const out = {
    eased: +state.scrollState.eased.toFixed(4),
    raw: +state.scrollState.raw.toFixed(4),
    camera: {
      pos: camera.position.toArray().map((n) => +n.toFixed(2)),
      fov: +camera.fov.toFixed(1),
    },
    render: { calls: gl.info.render.calls, triangles: gl.info.render.triangles },
    meshes: [],
  };

  const v = new (Object.getPrototypeOf(camera.position).constructor)();
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLineSegments && !o.isInstancedMesh) return;
    o.getWorldPosition(v);
    const d = v.distanceTo(camera.position);
    if (d < 400) {
      out.meshes.push({
        type: o.type,
        name: o.name || '(anon)',
        visible: o.visible,
        parentVisible: o.parent?.visible,
        dist: +d.toFixed(1),
        world: v.toArray().map((n) => +n.toFixed(1)),
        geo: o.geometry?.type,
        opacity: o.material?.uniforms?.uOpacity?.value ?? o.material?.opacity ?? null,
        reveal: o.material?.uniforms?.uReveal?.value ?? null,
        frustumCulled: o.frustumCulled,
        inFrustum: (() => {
          try {
            const m = new camera.projectionMatrix.constructor();
            return null;
          } catch {
            return null;
          }
        })(),
        tex: (() => {
          const t = o.material?.uniforms?.uTexture?.value;
          if (!t) return null;
          const img = t.image;
          return { w: img?.width ?? null, h: img?.height ?? null, needsUpdate: t.needsUpdate };
        })(),
        scale: o.scale.toArray().map((n) => +n.toFixed(2)),
      });
    }
  });
  out.meshes.sort((a, b) => a.dist - b.dist);
  out.meshes = out.meshes.slice(0, 14);
  return out;
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
