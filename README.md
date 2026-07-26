# THE LAST MEMORY

> *An artificial intelligence has six minutes of power left. It spends them remembering.*

A scroll-driven cinematic experience. Not a landing page, not a portfolio — a
short science-fiction film that happens to run in a browser, where the audience
controls the playhead.

Humanity is gone. The AI is the last conscious thing in the universe. What it
chose to keep turns out to be very small, and very ordinary.

---

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, press **BEGIN**, and scroll. Headphones matter —
the score is half the film.

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
npm run verify               # headless Chrome playthrough (see below)
```

**No asset pipeline, no downloads, no API keys.** Every image, every sound and
every model in this project is generated at runtime from a seed. `npm install`
is the entire setup.

---

## The structure of the film

The whole experience is one normalised timeline `t ∈ [0,1]` driven by scroll
position. Chapters own a slice of it; everything else is a pure function of `t`.

| #   | Chapter          | Theme       | `t` range   | The image                                                      |
| --- | ---------------- | ----------- | ----------- | -------------------------------------------------------------- |
| —   | System Failure   | awakening   | 0.000–0.085 | A containment gantry, a diagnostic grid, one dying light        |
| I   | First Light      | wonder      | 0.085–0.235 | A small-world neural lattice assembling itself around you       |
| II  | They Called Me Friend | curiosity | 0.235–0.400 | A hall of shattered photographs, drifting                    |
| III | The Golden Age   | hope        | 0.400–0.575 | A megacity at golden hour, traffic moving, habitat rings above  |
| IV  | The Fall         | loss        | 0.575–0.715 | The same city, the same seed, eroding out of existence          |
| V   | Solitude         | isolation   | 0.715–0.835 | Dead satellites still holding formation. Almost no motion.      |
| VI  | The Last Memory  | acceptance  | 0.835–0.945 | One photograph. Four people. Ordinary afternoon light.          |
| VII | Archive Closed   | release     | 0.945–1.000 | The pull-back. It was all inside something you could hold.      |

The screenplay — every line of narration, every chapter boundary, every audio
bed — lives in one file: [`src/lib/chapters.ts`](src/lib/chapters.ts). Editing
that file edits the film.

---

## Architecture

```
src/
  app/                 Next.js App Router entry, global CSS
  components/
    Experience.tsx     The <Canvas>: renderer config, suspense, perf governor
    ExperienceRoot.tsx Composition root — WebGL + DOM layers + scroll spacer
    three/             Reusable 3D: CameraRig, AICore, Megacity, Traffic,
                       OrbitalRing, Starfield, DustField, Atmosphere, PostFX
    ui/                DOM layer: boot, narration, chapter cards, HUD, end card
  scenes/              One file per chapter. Each owns only its environment.
  shaders/             GLSL, as typed modules (tree-shaken, type-checked, HMR)
  audio/               Runtime synthesis: engine, voices, procedural reverb
  assets/              Procedural memory photographs (2D canvas painting)
  animations/          Scroll controller (Lenis + GSAP ScrollTrigger), easings
  hooks/               useScrollExperience, useNarration, useAudio,
                       useRafValue, useKeyboardControls
  lib/                 chapters (the screenplay), director, cameraRail,
                       coreRail, store, scrollState, constants
  utils/               math, random (seeded), geometry, device, signal
scripts/               Optional asset bakers + the headless verification run
```

### The one idea that holds it together

**React never renders during playback.**

Scroll writes into a plain mutable object
([`lib/scrollState.ts`](src/lib/scrollState.ts)). The render loop reads it. Only
*discrete* changes — a chapter boundary, a scene entering fade range — are
allowed to reach React, which happens roughly fourteen times across a ten-minute
film.

Two conventions make that work:

- **`useRafValue(selector, epsilon)`** — bridges the mutable state into React
  for DOM components, re-rendering only when a derived value actually changes.
- **Signals** — any per-frame value crossing a component boundary is passed as a
  getter (`() => number`), never a number, and resolved inside the child's own
  `useFrame`. See [`utils/signal.ts`](src/utils/signal.ts).

### The director

[`lib/director.ts`](src/lib/director.ts) is the single source of truth for how
the film *looks*. Given `t`, it returns corruption, exposure, core life, the
full colour grade (lift/gain/saturation/contrast/bleach/vignette/grain/
aberration/scanline/bloom), fog colour and density, and per-scene fade weights.
Nothing else decides what any frame looks like.

### The camera

[`lib/cameraRail.ts`](src/lib/cameraRail.ts) is a shot list — 30 keyframes with
position, aim, focal length, Dutch roll and a per-shot handheld intensity.
Catmull-Rom between keyframes (C1 continuous, so the dolly never kinks), with
smootherstep applied to the *parameter* so the pacing eases into and out of each
mark. On top of that: fbm handheld drift, and critical damping toward the
sampled pose, which is what gives the camera mass.

The film is one continuous descent — each chapter's environment sits 600 world
units below the last, and the camera falls through all of them without a cut.

---

## How the big effects work

**The city that dies.** Chapter III and Chapter IV render the *same*
`<Megacity>` with the same seed. Only `decay` differs. Windows go dark in seeded
waves, soot creeps over the surfaces, and geometry is clipped out of existence
by a noise threshold with a glowing wound at the cut edge. One instanced draw
call for ~2,600 towers with procedural windows — no textures.

**The memories.** Every photograph is painted on a 2D canvas at runtime
([`assets/memoryTextures.ts`](src/assets/memoryTextures.ts)) — sky gradients,
blown-out suns, silhouetted figures, bokeh, light leaks, vignette and grain.
They look like impressions rather than photographs *because that is what they
are*: an AI reconstructing images from a failing archive. Deterministic per
seed, so a memory never changes shape between viewings.

**The final reveal.** The crystal is a 22-unit faceted shell centred on the last
photograph, rendered double-sided — and the camera starts **inside** it. That is
why you never saw it. As the rail pulls back to z=900 it resolves into a single
object, and the whole film turns out to have been happening inside something
small enough to hold.

**The grade.** One shader does the whole look: lens distortion, chromatic
aberration, block tearing, interlace, grain, vignette, lift/gain/contrast/
saturation/bleach, and ACES tone mapping. Two things in it are worth knowing
because they are easy to get wrong and catastrophic when you do — the contrast
pivots at 0.18 rather than 0.5 (this film lives at the bottom of the range, and
a 0.5 pivot drives almost every pixel negative), and the signal is clamped to
non-negative before tone mapping, because the ACES approximation returns *bright
grey* for negative input. Grain is weighted toward the midtones, not the
shadows: silver halide has nothing to develop in an unexposed frame.

**The score.** Fully synthesised — see [`public/audio/README.md`](public/audio/README.md).
A drone (4 detuned partials through a breathing filter), a generative FM piano
scheduled on the audio clock with a 600ms lookahead, noise artefacts that ride
the corruption signal, and a procedurally generated 7.5-second impulse response
for the reverb. Chapter beds cross-fade continuously; the reverb gets longer and
the notes get sparser as the universe empties.

---

## Performance

Target: 60fps desktop, graceful degradation on mobile.

- **Tiered quality** — [`utils/device.ts`](src/utils/device.ts) probes cores,
  memory and touch, then scales every particle and instance count through
  `countFor()`. Geometry detail, bloom kernel size, MSAA and DPR range all
  follow the tier.
- **Adaptive resolution** — [`PerformanceGovernor`](src/components/three/PerformanceGovernor.tsx)
  walks DPR down and back up against a rolling frame-time average, with
  hysteresis and a cooldown so it never oscillates mid-shot.
- **Scene mounting** — only chapters within fade range exist in the scene graph
  at all. One or two environments are live at any instant, never eight.
- **Draw calls** — the neural lattice is 2 calls for ~8,000 animated pulses; the
  city is 1; traffic is 1; every particle field is 1. All motion is in vertex
  shaders.
- **Zero per-frame allocation** in the hot path — rail sampling, grade
  computation and instance updates all write into pre-allocated objects.
- **Two post passes total.** Grade, lens distortion, aberration, tearing,
  scanlines, grain, vignette and ACES tone mapping are one shader, so the frame
  is read and written once.

---

## Verification

`npm run verify` drives a real Chrome through all eight chapters and fails on
console errors, page exceptions, or **WebGL shader compile/link failures** —
the failure mode that both `tsc` and `next build` will happily miss.

```bash
npm run dev          # in one terminal
npm run verify       # in another
```

It instruments `compileShader`/`linkProgram` before the app boots, so no shader
error can pass silently. Framerate numbers it prints are under SwiftShader
software rendering and are not representative of real GPUs.

Two more tools, documented in [`scripts/README.md`](scripts/README.md):

```bash
npm run stills                     # one PNG per chapter, to review the grade
node scripts/probe-scene.mjs 0.92  # dump camera + nearest meshes at any point
```

`probe-scene` is how you diagnose "why is nothing on screen" — it reports the
eased playhead, camera pose, and each nearby mesh's visibility, opacity and
reveal uniforms.

---

## Accessibility

- The complete screenplay is in the DOM as a visually-hidden transcript
  ([`StoryTranscript`](src/components/ui/StoryTranscript.tsx)) — the story is
  fully available to someone who cannot render the film.
- Narration is real, selectable DOM text with `aria-live`, not baked into
  textures.
- `prefers-reduced-motion` disables handheld camera noise, animated grain and
  smooth-scroll interpolation.
- Audio is off-able and never gates playback: if the AudioContext is blocked or
  the device has no output, the film plays in silence rather than stalling.
- `BEGIN` is reachable by keyboard (Enter/Space) and is the only control the
  audience is ever asked to use.
- The film is fully playable from the keyboard: **↑/↓** nudge the playhead,
  **PgUp/PgDn** jump a chapter, **Home/End** go to the ends. All of it routes
  through the same scroll position the wheel drives, so there is no second
  source of truth.

---

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md). Short version: it's a static-friendly
Next.js app with no server dependencies — `vercel deploy`, or `next build` and
host the output anywhere.

## Extending it

See [`BLENDER_ASSETS.md`](BLENDER_ASSETS.md) for where hand-modelled geometry
would raise the ceiling, with concrete poly budgets and a starter generation
script — the procedural approach here is deliberate, but Chapter III and
Chapter V are the two places real models would earn their download.

---

## Credits & licence

Written as an original work. No third-party assets, textures, models, fonts or
audio are bundled — everything is generated from code, which means there is
nothing here you need to clear before shipping it.

Shader noise implementations (simplex 3D) are by Ashima Arts / Stefan Gustavson,
public domain.
