# Scripts

None of these are needed to run the experience. `npm install && npm run dev` is
the whole setup — every asset is generated in the browser at runtime. These
exist for verification and for the cases where you want to take the project
further.

The browser-driving scripts (everything except the asset bakers and
`test-governor.mjs`) need a dev or production server already running, and a
local Chrome (set `CHROME_PATH` if it is somewhere unusual). The prose below
covers the ones you reach for by hand; a full index is at the end.

---

## `verify-experience.mjs` — the one that matters

```bash
npm run dev      # terminal 1
npm run verify   # terminal 2
```

Drives a real Chrome through all eight chapters and fails on console errors,
page exceptions, or **WebGL shader compile/link failures**.

That last one is the point. A shader that fails to compile still passes `tsc`
and still produces a clean `next build` — and then renders a black screen in
production. This script patches `compileShader` and `linkProgram` before the app
boots, so nothing can fail silently.

The framerate it prints is measured under SwiftShader software rasterisation
(headless Chrome has no GPU) and is roughly two orders of magnitude below real
hardware. Treat it as a liveness signal, not a benchmark.

## `capture-stills.mjs` — look at the film

```bash
npm run stills   # writes scripts/stills/*.png, one per chapter
```

Useful for reviewing the colour grade and composition of all eight chapters side
by side, and for eyeballing the effect of a shader change without scrubbing
through the whole thing.

It waits for the eased playhead *and* the camera to converge before each shot.
This matters more than it sounds: the camera is deliberately damped so it has
mass, and under software rendering the tick loop can drop to ~1 tick/second — a
settle that takes a second on a GPU can take minutes here. Screenshot too early
and you capture a mid-transit frame of the wrong chapter. Expect this script to
take a while.

## `capture-one.mjs` — one shot, fast iteration

```bash
node scripts/capture-one.mjs 0.90 last-memory   # <position 0..1> <name>
```

Same settle logic as the full run, but a single frame. Use this when iterating
on one chapter instead of waiting out all eight.

## `capture-mobile.mjs` — verify the mobile fallback

```bash
node scripts/capture-mobile.mjs
```

Emulates a mid-range phone (390×844, touch, DPR 3, 4 cores / 4 GB hints), boots
the experience with a **touch tap** rather than a click, and captures three
chapters. Prints the resolved DPR (should clamp to 1, confirming the low tier
engaged) and any console/page errors. This is the check that the device tiering
in `utils/device.ts` actually degrades on real mobile constraints.

## `probe-scene.mjs` — inspect the live scene graph

```bash
node scripts/probe-scene.mjs 0.92    # global timeline position 0..1
```

Dumps the eased/raw playhead, camera pose, and the nearest meshes with their
visibility, opacity and reveal uniforms. This is how you find out *why*
something is not on screen — wrong chapter, zero weight, un-revealed, or simply
somewhere else entirely.

Reads a `window.__TLM` handle that `Experience.tsx` publishes under
`NODE_ENV !== 'production'`; the bundler strips it from production builds.

### Bisecting the image

When the frame looks wrong and you need to know *which layer* is responsible,
disable the post passes from the console — `blendMode.opacity` is the right
lever because nothing in the render loop re-asserts it:

```js
__TLM.post.corruption.blendMode.opacity.value = 0;  // raw scene + bloom
__TLM.post.bloom.blendMode.opacity.value = 0;       // raw scene
```

Two traps worth knowing, both of which cost real time here:

- **`object.visible = false` does not stick.** Nearly every component re-asserts
  visibility from its own `useFrame` (that is how scene fading works), so
  toggling it from the console is silently undone on the next frame. Use
  `geometry.setDrawRange(0, 0)` instead, which nothing touches.
- **The graded uniforms do not stick either**, for the same reason — `PostFX`
  writes all of them every frame. Pinning them from a `requestAnimationFrame`
  loop does not work reliably, because your callback may run *after* the frame
  has already rendered. Override the property, or disable the whole pass.

Also note that `preserveDrawingBuffer: false` (which the renderer sets, for
performance) makes `gl.readPixels` return zeroes outside of a draw call — take a
screenshot and look at it rather than trying to sample the framebuffer.

---

## Optional asset bakers

### `generate-audio.mjs`

```bash
npm run gen:audio
```

Writes 16-bit WAV placeholders to `public/audio/`, one per chapter bed. **The
shipping score does not use them** — it is synthesised at runtime. These exist
so you can replace the generative score with recorded stems without renaming
anything. See [`public/audio/README.md`](../public/audio/README.md).

### `generate-textures.mjs`

```bash
npm i -D canvas          # optional peer, not a runtime dependency
npm run gen:textures
```

Bakes the procedural memory photographs to PNG in `public/textures/`, for
art-directing them by hand or swapping in real photography. The runtime painter
in `src/assets/memoryTextures.ts` remains the default path.

### `blender/generate_assets.py`

```bash
blender --background --python scripts/blender/generate_assets.py -- --out ./public/models
```

Generates correctly-scaled blockouts — hero towers, a satellite, a fractured
crystal — so you can start art-directing rather than starting from a default
cube. See [`BLENDER_ASSETS.md`](../BLENDER_ASSETS.md) for budgets and wiring.

---

## Full index

| Script | What it does |
| --- | --- |
| `verify-experience.mjs` (`npm run verify`) | Drives all eight chapters; fails on console errors, exceptions or shader compile/link failures. |
| `smoke-check.mjs` | Fast boot check — reaches BEGIN, mounts the canvas, counts shader/console errors. |
| `build-verify.mjs` (`npm run build:verify`) | Production build into a separate `distDir` so it cannot clobber a running dev server. |
| `capture-stills.mjs` (`npm run stills`) | One settled PNG per chapter. |
| `capture-one.mjs <t> <name>` | A single settled frame at a timeline position. |
| `capture-mobile.mjs` | Boots on an emulated phone (touch, low tier) and captures the mobile path. |
| `capture-promo.mjs [name]` | The composed, chrome-free promotional screenshot set (see `../screenshots/`). |
| `probe-scene.mjs <t>` | Dumps camera pose and nearby mesh uniforms — the "why is nothing on screen" tool. |
| `probe-perf.mjs` | Confirms the adaptive DPR governor actually adapts under load, in a real browser. |
| `test-governor.mjs` | Unit-tests the governor's pure decision function (incl. the recovery path software rendering can't reach). No server needed. |
| `profile-render.mjs` | Draw calls, triangles, geometries, textures, programs and frame time per chapter. |
| `profile-memory.mjs` | GPU memory by walking live textures and geometry buffers. |
| `check-artifacts.mjs` | In-world artifact interaction: click-through, panel scroll, timeline freeze/restore. |
| `check-scroll-lock.mjs` | Overlay scroll lock against real wheel and keyboard input. |
| `check-explorer-nav.mjs` | Timeline explorer: scrollbar, drag-to-pan, wheel routing, edge fades. |
| `check-responsive.mjs` | Mobile / tablet / desktop — entry point reachable, graph renders, no horizontal overflow. |
