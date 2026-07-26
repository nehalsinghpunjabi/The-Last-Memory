/**
 * Fast health check: load the app, boot it, advance one chapter, and report any
 * console errors, page exceptions, or WebGL shader failures. Seconds, not the
 * full multi-minute playthrough.
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 120000,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 800, height: 500 },
});
const page = await browser.newPage();

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon/i.test(m.location()?.url ?? '')) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.evaluate?.(() => {});
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });

// Trap shader failures before the app boots.
await page.evaluate(() => {
  window.__shaderErrors = [];
  const proto = WebGL2RenderingContext.prototype;
  const oc = proto.compileShader;
  proto.compileShader = function (s) {
    oc.call(this, s);
    if (!this.getShaderParameter(s, this.COMPILE_STATUS))
      window.__shaderErrors.push(this.getShaderInfoLog(s) ?? 'compile error');
  };
  const ol = proto.linkProgram;
  proto.linkProgram = function (p) {
    ol.call(this, p);
    if (!this.getProgramParameter(p, this.LINK_STATUS))
      window.__shaderErrors.push(this.getProgramInfoLog(p) ?? 'link error');
  };
});

await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 30000 }
);
const booted = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'BEGIN');
  b?.click();
  return !!b;
});
await new Promise((r) => setTimeout(r, 3000));

// Advance into chapter I and let it render a few frames.
await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: max * 0.16, behavior: 'instant' });
});
await new Promise((r) => setTimeout(r, 4000));

const state = await page.evaluate(() => ({
  canvas: !!document.querySelector('canvas'),
  frames: window.__TLM?.gl?.info?.render?.frame ?? null,
  shaderErrors: window.__shaderErrors.length,
  eased: window.__TLM ? +window.__TLM.scrollState.eased.toFixed(3) : null,
}));

await browser.close();

console.log('booted BEGIN:      ', booted);
console.log('canvas mounted:    ', state.canvas);
console.log('frames rendered:   ', state.frames);
console.log('eased playhead:    ', state.eased);
console.log('shader errors:     ', state.shaderErrors);
console.log('console/page errs: ', errors.length);
if (errors.length) errors.slice(0, 8).forEach((e) => console.log('   -', e));

const ok = booted && state.canvas && state.frames > 0 && state.shaderErrors === 0 && errors.length === 0;
console.log('\nRESULT:', ok ? 'PASS — app runs clean' : 'FAIL');
process.exit(ok ? 0 : 1);
