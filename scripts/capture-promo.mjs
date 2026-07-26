/**
 * Promotional screenshot pass.
 *
 * Not a debug capture: every shot is composed, settled and stripped of chrome
 * before it is taken. Each entry below declares where on the timeline to stand,
 * what interface (if any) belongs in frame, and how to know the shot is ready.
 *
 * Rendering notes. The headless GPU is SwiftShader, and the adaptive governor
 * correctly drops the pixel ratio to its floor under software rasterisation —
 * so rather than fight it, the viewport itself is oversized: at 2560x1440 with
 * a 0.75 ratio the WebGL buffer is still 1920x1080, and the DOM layer (type,
 * panels, the graph) renders crisp at the full 2560. Chasing a higher ratio
 * would multiply an already multi-second frame into minutes for no visible gain.
 *
 *   node scripts/capture-promo.mjs [name]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'screenshots');
mkdirSync(OUT, { recursive: true });

const WIDTH = 2560;
const HEIGHT = 1440;

/* ------------------------------------------------------------------ *
 * Chrome suppression
 *
 * `nextjs-portal` is the Next.js dev-tools indicator — the small circular
 * badge in the corner. It is the single most obviously "this is a localhost
 * screenshot" element on the page and must never appear in promotional art.
 * The rest is the film's own diagnostic HUD, hidden per-shot where it competes
 * with the image and kept where it is part of the story being told.
 * ------------------------------------------------------------------ */
const HIDE_DEV = `
  nextjs-portal, #__next-build-watcher, [data-nextjs-toast],
  [data-nextjs-dialog-overlay], [data-next-badge-root] { display: none !important; }
`;

/** The whole diagnostic HUD: integrity readout, controls, spine, playhead. */
const HIDE_HUD = `
  [aria-label*="timeline of AI history"],
  [aria-label="Mute audio"], [aria-label="Unmute audio"] { opacity: 0 !important; }
`;

/** Everything the film draws over the render, for a pure cinematic frame. */
const HIDE_ALL_UI = `
  ${HIDE_HUD}
  .fixed.z-30 { opacity: 0 !important; }
`;

/*
 * Positions chosen by scouting a contact sheet, not by guesswork. Two things
 * decided most of them. Corruption is scripted and spikes hard at chapter
 * seams — at t=0.33 the hall reads as a broken signal rather than an archive —
 * so every frame here sits in a trough (0.04–0.07). And the crane's height
 * matters more than its chapter: at 0.428 the city fills the frame as a flat
 * wall of light, while thirteen thousandths earlier it still has sky, horizon
 * and legible spires.
 */
const SHOTS = [
  {
    name: '01-hero',
    t: 0.415,
    css: HIDE_ALL_UI,
    note: 'Golden Age crane, high enough to keep sky, haze and hero spires in frame.',
  },
  {
    // HIDE_ALL_UI removes narration and markers (all z-30) but not the record
    // card, which sits at z-60 — so the frame is the artifact, the panel, and
    // the hall behind it, with nothing else competing.
    name: '02-interactive-artifact',
    t: 0.345,
    css: HIDE_ALL_UI,
    action: 'artifact',
    note: 'A real record opened from an artifact in the world, hall visible behind it.',
  },
  {
    name: '03-museum-hall',
    t: 0.345,
    css: HIDE_ALL_UI,
    note: 'The hall — photographs and archival documents suspended together in depth.',
  },
  {
    name: '04-signature-moment',
    t: 0.535,
    css: HIDE_ALL_UI,
    note: 'Attention wired across the frame while the city recedes for it.',
  },
  {
    // Opened over the Solitude void (a near-black scene) with narration hidden,
    // so the graph reads crisp instead of fighting the bright hall bleeding
    // through the 97%-opaque overlay. The explorer is a global overlay, so the
    // scene behind it is a free choice — and the darkest one wins for legibility.
    name: '05-ai-history',
    t: 0.77,
    css: HIDE_ALL_UI,
    action: 'explorer',
    note: 'The full lineage: 35 dated milestones, era columns, dependency edges.',
  },
  {
    name: '06-ending',
    t: 0.965,
    css: HIDE_ALL_UI,
    note: 'The last memory seen through the facets of the thing it was kept inside.',
  },
];

const only = process.argv[2];
const queue = only ? SHOTS.filter((s) => s.name === only) : SHOTS;

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  protocolTimeout: 900000,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
  ],
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`  ! pageerror: ${e.message}`));

await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 120000 });
await page.addStyleTag({ content: HIDE_DEV });
await page.waitForFunction(
  () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'BEGIN'),
  { timeout: 120000 }
);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'BEGIN')?.click()
);
await new Promise((r) => setTimeout(r, 6000));

/** Scroll to `t` and wait until the damped camera has genuinely stopped. */
async function settleAt(t) {
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * v, behavior: 'instant' });
  }, t);

  const deadline = Date.now() + 420000;
  let stable = 0;
  let last = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 900));
    const s = await page.evaluate(() => {
      const { camera, scrollState } = window.__TLM;
      return {
        eased: scrollState.eased,
        cam: [camera.position.x, camera.position.y, camera.position.z],
      };
    });
    const onMark = Math.abs(s.eased - t) < 0.004;
    const still =
      last !== null &&
      Math.abs(s.cam[0] - last[0]) < 0.06 &&
      Math.abs(s.cam[1] - last[1]) < 0.06 &&
      Math.abs(s.cam[2] - last[2]) < 0.06;
    last = s.cam;
    if (onMark && still) {
      if (++stable >= 3) return true;
    } else {
      stable = 0;
    }
  }
  return false;
}

for (const shot of queue) {
  process.stdout.write(`  ${shot.name} … `);

  // Reset any overlay left open by the previous shot.
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));

  const settled = await settleAt(shot.t);

  // Open whatever this shot is meant to show, and let it finish animating.
  if (shot.action === 'artifact') {
    const opened = await page.evaluate(() => {
      const { scene, camera } = window.__TLM;
      const targets = [];
      scene.traverse((o) => {
        if (o.isMesh && o.material?.uniforms?.uArtifact?.value === 1) targets.push(o);
      });
      for (const a of targets) {
        const p = a.getWorldPosition(new a.position.constructor());
        p.project(camera);
        if (p.z > 0 && p.z < 1 && Math.abs(p.x) < 0.6 && Math.abs(p.y) < 0.6) {
          const x = ((p.x + 1) / 2) * window.innerWidth;
          const y = ((-p.y + 1) / 2) * window.innerHeight;
          const el = document.elementFromPoint(x, y);
          if (el) {
            ['pointerdown', 'pointerup', 'click'].forEach((type) =>
              el.dispatchEvent(
                new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
              )
            );
            return true;
          }
        }
      }
      return false;
    });
    if (!opened) {
      // Fall back to a named record so the shot is never empty.
      await page.evaluate(() => {
        document.querySelector('button[aria-label*="timeline of AI history"]')?.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
      await page.evaluate(() => {
        const n = [...document.querySelectorAll('button')].find((b) =>
          b.textContent.includes('The Perceptron')
        );
        n?.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
      await page.evaluate(() => {
        // Close the explorer behind the card so the hall shows through.
        const s = document.querySelector('#lineage-scroller');
        if (s) s.closest('.fixed')?.style.setProperty('display', 'none', 'important');
      });
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (shot.action === 'explorer') {
    await page.evaluate(() =>
      document.querySelector('button[aria-label*="timeline of AI history"]')?.click()
    );
    await page.waitForSelector('.museum-scroll', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
  }

  // Per-shot chrome suppression, applied last so it wins.
  const style = await page.addStyleTag({ content: `${HIDE_DEV}\n${shot.css}` });

  // Let bloom, grain and any UI transition come to rest.
  await new Promise((r) => setTimeout(r, 4000));

  const file = join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file, captureBeyondViewport: false });
  await style.evaluate((el) => el.remove());

  console.log(`saved${settled ? '' : ' (camera did not fully settle)'}`);
}

await browser.close();
console.log(`\n  ${queue.length} shot(s) -> screenshots/`);
