# THE LAST MEMORY

> **A dying artificial intelligence spends its last minutes remembering the people who created it.**

A scroll-driven cinematic experience that is also a sourced museum of AI history. As its
memory fails, the AI reconstructs the real lineage that made it possible — Turing's question,
the perceptron, the winters, the transformer — and every claim it makes is traceable to a
primary source. The film is the medium; the history is the content. You control the playhead.

<p align="center">
  <a href="#"><strong>Live Demo</strong></a> ·
  <a href="#"><strong>GitHub Repository</strong></a> ·
  <a href="#"><strong>Demo Video</strong></a>
</p>

> [!NOTE]
> Replace the three links above before submission.
> Live demo → Vercel URL · Repository → GitHub URL · Demo video → YouTube/Loom walkthrough.

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Three.js" src="https://img.shields.io/badge/three.js-r174-000000?logo=three.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white">
  <img alt="WebGL2" src="https://img.shields.io/badge/WebGL2-required-990000">
  <img alt="Milestones" src="https://img.shields.io/badge/sourced%20milestones-35-9fd8ff">
  <img alt="Bundled assets" src="https://img.shields.io/badge/bundled%20assets-0-success">
</p>

---

## Table of Contents

- [Gallery](#gallery)
- [Inspiration](#inspiration)
- [The Experience](#the-experience)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Challenges](#challenges)
- [What I Learned](#what-i-learned)
- [Future Improvements](#future-improvements)
- [Credits](#credits)
- [License](#license)

---

## Gallery

> [!NOTE]
> Capture these with `npm run stills` (one PNG per chapter) or
> `node scripts/capture-one.mjs <t> <name>` for a specific moment. Drop them in
> `docs/screenshots/` and update the paths below.

| # | Screenshot | What it should show |
|---|---|---|
| 1 | `docs/screenshots/01-boot.png` | The boot terminal before **BEGIN** — the diagnostic lines, the integrity meter, and the archive control. Establishes the premise in one frame. |
| 2 | `docs/screenshots/02-hall.png` | Chapter II, the hall of memories, with a lit artifact under the cursor. This is the core interaction: records hanging in the world, not a sidebar. |
| 3 | `docs/screenshots/03-record.png` | An open milestone card — date, people, organisations, *what happened / why it mattered*, the "this made possible →" chain, and the source links. Shoot one that has the archival plate visible (`The Perceptron`). |
| 4 | `docs/screenshots/04-attention.png` | The signature moment at `t ≈ 0.523`: the attention field wired across the frame while the city recedes, on the line *"attention is all you need."* |
| 5 | `docs/screenshots/05-timeline.png` | The Archive Explorer — all 35 milestones in true chronological order with the dependency edges and the highlighted main line from Turing to agentic AI. |
| 6 | `docs/screenshots/06-ending.png` | The final held frame. Composed, warm, un-blown-out. No spoiler caption needed. |

---

## Inspiration

Most histories of AI are a list of dates. You read them, you nod, and you retain almost
nothing — because a timeline tells you *what happened* but never makes you feel *why it
mattered* or *what it cost*. The field's real story is not a straight line of triumphs. It
contains two winters, a decade where the central idea was considered discredited, and a
handful of researchers who kept working on something nobody wanted to fund.

This project started from a simple question: what if the history of AI were told by the
thing that history produced?

The framing device is an AI at the end of its life, reconstructing its own origins from a
failing archive. That premise does real work. It justifies why the images are degraded
impressions rather than photographs — the machine is *reconstructing* them, not displaying
them. It justifies why memories surface out of order. And it gives the history stakes:
you are not reading about the perceptron, you are watching something remember the moment
it became possible.

**Why a museum instead of a timeline.** A timeline is read; a museum is walked through. In
the hall of Chapter II the records are physical objects hanging in space, placed in depth
order, so drifting forward moves you forward through the era — the first record you pass is
1956, the last is 1970. The space *is* the chronology. Meanwhile the strictly linear,
authoritative version still exists, one click away, as a dependency graph you can trace end
to end. The emotional order and the factual order are both preserved, and neither is
forced to compromise for the other.

Everything the AI claims is real, dated, and cited. That constraint was the point: an
immersive experience that is also correct is much harder than one that is merely
atmospheric, and the discipline is visible in [`HISTORY_SOURCES.md`](HISTORY_SOURCES.md).

---

## The Experience

You arrive at a terminal. A system reports its own integrity in single digits and begins
reconstructing something. You press **BEGIN**, and from then on the only thing you do is
scroll — you are moving a playhead, not a page.

The film is one continuous descent through eight chapters. It opens with a question asked in
1950 and moves through the people who first believed the question could be answered. Then it
does something a timeline cannot: it goes to the brightest memory first, because that is how
memory works, before falling into the long cold that actually preceded it. It passes through
the quiet years when the work continued unheard, and arrives somewhere warm.

Along the way the world is touchable. Some of the objects drifting past are real historical
records, and they respond when you approach them — a slow breathing lift, a bright edge as
your cursor crosses. Opening one pauses the film, and the record grows out of the object you
touched: who, when, what happened, why it mattered, and what it made possible next. Every
one links to its primary source. Follow the chain forward or backward and you can walk from
Turing's 1936 paper to the architecture running today without ever leaving the film.

There is one moment, roughly two-thirds through, that the whole build exists to deliver. It
lasts about four seconds. It is not narrated.

The ending is unchanged from the film's first version, and it is not spoiled here.

Run time is roughly eight to ten minutes at a natural reading pace. Headphones matter — the
score is generated in the browser and is half the experience.

---

## Features

### Interactive Experience

- **In-world artifact selection.** Memory fragments in Chapter II are raycast targets. Hover
  gives visual feedback in the shader; clicking opens the record. Only artifacts are
  raycastable, so the hall is not a field of invisible hit-boxes.
- **Records that open from the object.** The panel animates out of the artifact's actual
  screen position rather than sliding in from the edge.
- **Depth-ordered placement.** Artifacts are assigned to fragments near the camera's flight
  path, in depth order, so moving through the hall moves forward through the era.
- **Archive Explorer.** A full-screen dependency graph of all 35 milestones in true
  chronological order, with a highlighted 15-node main line from Turing to agentic AI.
  Hover traces a node's connections; clicking opens its record.
- **Museum Guide.** An optional per-era index, **off by default** so the world is the primary
  way in. Available at every screen size and cross-highlights with 3D hover.
- **Scroll lock with restore.** Opening a record freezes the timeline and restores the exact
  position on close. The panel scrolls independently.

> [!IMPORTANT]
> **Scope, stated honestly:** in-world artifacts currently exist in **Chapter II only**
> (6 of 35 milestones). The remaining 29 are reachable through the Museum Guide and the
> Archive Explorer, which cover all eight chapters. Chapter IV's fragments are deliberately
> *not* interactive — they are fast-tumbling debris under heavy corruption, and a click
> target that accelerates away is a frustration, not a discovery.

### 3D Rendering

- Eight distinct environments — a diagnostic gantry, a neural lattice, a hall of suspended
  records, an instanced megacity with landmark towers and orbital rings, the same city
  decaying, a near-static field, a held photograph, and a faceted crystal.
- Nine hand-written GLSL shader modules, type-checked and hot-reloadable.
- One continuous camera rail: a hand-authored shot list interpolated with Catmull-Rom,
  smootherstep pacing, fbm handheld drift and critical damping.
- **The attention moment** — a spatial rendering of the transformer's attention mechanism,
  scroll-triggered on the narration beat that names it. Fourteen tokens, weighted
  connections, two draw calls.

### Storytelling

- The entire screenplay — chapter boundaries, narration timing, colour grade targets and
  audio beds — lives in one file, [`src/lib/chapters.ts`](src/lib/chapters.ts).
- Generative score synthesised at runtime: a drone of detuned partials, an FM piano
  scheduled on the audio clock with lookahead, noise artefacts tied to the corruption
  signal, and a procedurally generated impulse response for reverb. Design notes in
  [`public/audio/README.md`](public/audio/README.md).
- Corruption-aware text rendering: glitched characters use non-alphabetic data glyphs so
  interference never reads as a typo.

### Historical Archive

- **35 milestones**, each with date, people, organisations, papers, *what happened*,
  *why it mattered*, explicit `enabled[]` dependency links and per-record sources.
- Date confidence is modelled (`exact` / `approximate` / `disputed`) and surfaced in the UI
  as "approximate date" rather than false precision.
- The dependency graph is **derived** from the milestone data, so there is exactly one
  source of truth for the lineage.
- Full citation audit in [`HISTORY_SOURCES.md`](HISTORY_SOURCES.md).

### Performance

- Tiered device profiling, adaptive pixel ratio with an automatic performance mode,
  dynamic particle budgets, merged geometry, and instanced rendering.
- Measured, not estimated — see [Performance](#performance) for the numbers and the caveats.

### Accessibility

- Full sourced transcript in the DOM, keyboard transport, focus trap, reduced-motion
  support. See [Accessibility](#accessibility).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript 5.7 (strict) |
| 3D | three.js r174, @react-three/fiber 9, @react-three/drei 10 |
| Post-processing | postprocessing 6.36, @react-three/postprocessing 3 |
| Shaders | Hand-written GLSL as typed TS modules |
| Scroll | Lenis 1.1 (inertial scrolling) + GSAP 3.12 ScrollTrigger |
| DOM animation | Framer Motion 12 |
| State | Zustand 5 (discrete UI state) + a plain mutable object (per-frame state) |
| Styling | Tailwind CSS 3.4 |
| Audio | Web Audio API — synthesised at runtime, no audio files |
| Textures | HTML Canvas 2D — painted at runtime, no image files |
| Verification | puppeteer-core 25 driving real Chrome |
| Deployment | Vercel (zero-config); also static export, Node, or Docker |

**No asset pipeline.** Every image, sound and mesh is generated from a seed at runtime.
`npm install` is the entire setup. The single exception is one optional, lazy-loaded
public-domain image (see [Credits](#credits)) which the experience works fine without.

---

## Architecture

<details open>
<summary><strong>Project structure</strong></summary>

```
src/
  app/                 Next.js App Router entry, global CSS, metadata
  components/
    Experience.tsx     The <Canvas>: renderer config, suspense, perf governor
    ExperienceRoot.tsx Composition root — WebGL + DOM layers + scroll spacer
    three/             CameraRig, AICore, Megacity, HeroTowers, Traffic,
                       OrbitalRing, Starfield, DustField, Atmosphere,
                       AttentionMoment, PostFX, PerformanceGovernor, SceneDirector
    ui/                BootSequence, NarrationLayer, ChapterMarker, SystemHud,
                       ArchiveMarkers (Museum Guide), MilestoneCard,
                       ArchiveExplorer, ArtifactHint, EndCard, StoryTranscript,
                       GlitchText, Letterbox, ScrollHint
  scenes/              One file per chapter. Each owns only its environment.
  shaders/             GLSL as typed modules — atmosphere, core, corruption,
                       crystal, hologram, neural, particles, structures, common
  audio/               Runtime synthesis: engine, voices, procedural reverb
  assets/              Procedural memory textures (2D canvas painting)
  animations/          Scroll controller (Lenis + GSAP), easing curves
  hooks/               useScrollExperience, useNarration, useAudio, useRafValue,
                       useKeyboardControls, useArtifacts
  lib/
    chapters.ts        The screenplay — the single content source of truth
    history/           The sourced archive: types, milestones, derived graph
    director.ts        Given t, returns the entire look of the frame
    cameraRail.ts      The shot list
    scrollState.ts     Per-frame mutable state (never React)
    store.ts           Experience phase/device state (Zustand)
    archiveStore.ts    Museum UI state (Zustand)
    quality.ts         Live rendering-quality state written by the governor
scripts/               Verification, profiling and capture tooling
```

</details>

<details>
<summary><strong>The timeline (contains mild spoilers)</strong></summary>

The whole experience is one normalised timeline `t ∈ [0,1]` driven by scroll position, over
a document `1400vh` tall. Chapters own a slice of it; everything else is a pure function of
`t`. The film is one continuous descent — each chapter's environment sits below the last,
and the camera falls through all of them without a cut.

| # | Chapter | Era | `t` range | The image |
|---|---|---|---|---|
| — | System Failure | end of archive | 0.000–0.085 | A diagnostic grid and one dying light |
| I | The Question | 1936–1956 | 0.085–0.235 | A neural lattice assembling itself around you |
| II | The First Believers | 1957–1973 | 0.235–0.400 | A hall of suspended records — the interactive chapter |
| III | The Explosion | 2006–2023 | 0.400–0.575 | A megacity at golden hour; the attention moment |
| IV | The Winters | 1969–1993 | 0.575–0.715 | The same city, same seed, eroding out of existence |
| V | The Quiet Years | 1986–2006 | 0.715–0.835 | Near-total stillness |
| VI | What They Made | 2017–2025 | 0.835–0.945 | One photograph, held |
| VII | Intelligence Beyond Itself | present | 0.945–1.000 | The pull-back |

Note that scene order is **emotional, not chronological** — Chapter III (2006–2023) precedes
Chapter IV (1969–1993) by design. The Archive Explorer carries the strict chronology.

Editing [`src/lib/chapters.ts`](src/lib/chapters.ts) edits the film: every narration line,
chapter boundary, colour grade target and audio bed lives there.

</details>

### The one idea that holds it together

**React never renders during playback.**

Scroll writes into a plain mutable object ([`lib/scrollState.ts`](src/lib/scrollState.ts)).
The render loop reads it. Only *discrete* changes — a chapter boundary, a scene entering
fade range, an overlay opening — are allowed to reach React, which happens on the order of
a dozen times across a ten-minute film.

Two conventions make that work:

- **`useRafValue(selector, epsilon)`** bridges the mutable state into React for DOM
  components, re-rendering only when a derived value actually changes.
- **Signals** — any per-frame value crossing a component boundary is passed as a getter
  (`() => number`), never a number, and resolved inside the child's own `useFrame`. See
  [`utils/signal.ts`](src/utils/signal.ts).

### Rendering pipeline

The scene graph is composed by [`SceneDirector`](src/components/three/SceneDirector.tsx),
which mounts only the chapters currently within fade range — one or two environments are
live at any instant, never eight. Each scene receives its fade weight as a signal and is
responsible for its own environment and nothing else.

[`lib/director.ts`](src/lib/director.ts) is the single source of truth for how the film
*looks*. Given `t`, it returns corruption, exposure, core life, the full colour grade
(lift/gain/saturation/contrast/bleach/vignette/grain/aberration/scanline/bloom), fog colour
and density, and per-scene fade weights. Nothing else decides what any frame looks like.

Post-processing is deliberately **two passes**: mipmap-blurred bloom, then one combined
grade/lens/failure shader that folds tone mapping, lens distortion, chromatic aberration,
block tearing, interlace, grain and vignette into a single read and write of the frame.

<details>
<summary><strong>Two grade details that are easy to get wrong</strong></summary>

Both of these are preserved from the original build because they were hard-won:

- **Contrast pivots at 0.18, not 0.5.** This film lives at the bottom of the range, and a
  0.5 pivot drives almost every pixel negative.
- **The signal is clamped to non-negative before tone mapping**, because the ACES
  approximation returns *bright grey* for negative input.

Grain is weighted toward the midtones rather than the shadows — silver halide has nothing
to develop in an unexposed frame.

</details>

### State management

Three stores, deliberately separated:

| Store | Kind | Contents | Update frequency |
|---|---|---|---|
| `scrollState` | Plain mutable object | playhead, eased playhead, velocity, corruption, exposure, integrity | Every frame |
| `useExperience` | Zustand | phase, chapter index, device profile, render-ready | ~a dozen times total |
| `useArchive` | Zustand | open record, card origin, hovered artifact, explorer/guide open | On user interaction |

The film's state and the museum's state never entangle: opening a record cannot perturb
playback, and playback cannot perturb the museum.

### Interaction architecture

The canvas accepts pointer events, and artifacts are ordinary R3F meshes with
`onPointerOver` / `onPointerOut` / `onClick`. [`useArtifacts`](src/hooks/useArtifacts.ts)
owns the fragment→milestone mapping, the eased hover values (advanced in `useFrame`, not
React state) and the handlers. Non-artifact fragments have their `raycast` disabled so the
raycaster does no unnecessary work.

Selecting an artifact records the click's screen position, which the record panel uses as
its animation origin — that is what makes the panel read as the object opening rather than
a drawer sliding in.

The overlay scroll lock lives in
[`useScrollExperience`](src/hooks/useScrollExperience.ts), which resolves phase and overlay
state into a single lock decision so the two can never fight over the same DOM styles.

---

## Performance

**The headline finding: this application was never geometry-bound.** Peak draw calls are 64
and peak triangles 127k — trivial for any GPU. The cost is fill rate: a fullscreen
atmosphere shell, additive particles, a bloom mip chain and a large grade pass, all scaling
with pixel count. Every optimisation below follows from that measurement.

### Measured

| Scene | Draw calls | Triangles | Frame ms (before → after) |
|---|---|---|---|
| prologue | 30 | 15k | 636 → **442** |
| genesis | 22 | 4k | 647 → **459** |
| humanity | 46 | 4k | 884 → **564** |
| goldenAge | 38 | 74k | 606 → 964 |
| fall | 37 | 127k | 1421 → **692** |
| solitude | 48 | 61k | 174 → 528 |
| lastMemory | 64 | 11k | 954 → **513** |
| reveal | 25 | 8k | 1084 → **613** |

Average frame time across all eight chapters improved **801 ms → 597 ms (−25%)**.
Peak scene-reachable GPU memory: **8.17 MB** (7.54 MB textures / 0.63 MB geometry).

> [!WARNING]
> **These are SwiftShader (software rasterisation) numbers.** Draw calls, triangle counts and
> memory are hardware-independent and real. Frame times are directionally useful but noisy —
> the two scenes that moved the wrong way are almost certainly noise, not regression.
> **A verified 60 FPS figure on real GPU hardware has not been measured and is not claimed.**
> Reproduce with `node scripts/profile-render.mjs` and `node scripts/profile-memory.mjs`.

### Adaptive quality

[`PerformanceGovernor`](src/components/three/PerformanceGovernor.tsx) samples every 30
frames **or 0.5 s of wall clock, whichever comes first** — the time bound matters, because a
pure frame-count window takes seven seconds to react at 4 fps. It walks the pixel ratio down
and back up with hysteresis and a cooldown so it never oscillates mid-shot.

When it has hit the pixel-ratio floor and is *still* below target, it latches `perfMode`:
the GPU is fragment-bound past what resolution can fix. That unlocks a lower panic floor and
signals consumers to shed cost. Low-tier devices start in `perfMode` from the first frame.

### Rendering optimisations

- **Pixel-ratio ceiling capped at 1.5**, never the display's native 2.0+. High `[1, 1.5]`,
  medium `[0.9, 1.25]`, low `[0.75, 1]`. On a retina laptop this removes ~44% of all shaded
  pixels for no visible change, and it is the single strongest lever in the app.
- **MSAA disabled on every tier.** The composer's output is bloomed, grained and vignetted,
  which destroys exactly the sub-pixel detail multisampling preserves — 2× was paying for a
  full-resolution resolve every frame and handing the result to a shader that discarded it.
- **Bloom levels reduced** to 6 (high) / 4 (otherwise). Beyond ~6 the mips are small enough
  that they add only a very faint wide halo the grain and vignette swallow entirely.
- **Merged geometry.** Each memory fragment bakes its shards into one buffer — the hall went
  from up to ~94 draw calls to one per fragment. Plane tessellation was reduced from 12×12
  to 6×6 after confirming the vertex curl was smooth enough that the difference was invisible.
- **Instancing.** ~2,600 towers in one instanced draw call with procedural windows and no
  textures; traffic, orbital rings and every particle field are one call each. All motion is
  in vertex shaders.
- **Dynamic particle budgets.** Additive motes are pure overdraw and the cheapest thing to
  give up, so the governor trims the tail of the buffer via `setDrawRange` — 62% under
  `perfMode`, 40% when struggling, floored at 120. No reallocation, no visible re-seeding:
  the field simply thins.
- **Zero per-frame allocation** in the hot path — rail sampling, grade computation and
  instance updates all write into pre-allocated objects.

### Lazy loading

The WebGL layer is a `next/dynamic` import with `ssr: false`, so the boot terminal renders
before three.js has finished parsing. Scenes mount and unmount with the playhead. The one
archival image is `loading="lazy"`, external, and removes itself silently on failure — the
offline path is unchanged.

### Shader strategy

GLSL lives in typed TS modules so it is tree-shaken, type-checked and hot-reloadable.
Complexity is spent where it shows and skipped where it does not: the hologram shader carries
a rack-focus blur, dissolve, corruption dropout and artifact highlighting, while the
atmosphere shell is deliberately cheap because it covers the whole frame.

### Mobile

Device tiering probes cores, memory and touch, then scales every particle and instance count
through `countFor()`. On phones the pixel ratio ceiling drops, `heavyPostFX` is off, and the
Museum Guide (rather than in-world raycasting) is the practical path to the records.
Verified at 390 / 820 / 1440 px with zero horizontal overflow and zero console errors.

---

## Accessibility

- **The complete story and archive are in the DOM** as a visually-hidden transcript
  ([`StoryTranscript`](src/components/ui/StoryTranscript.tsx)) — every narration line plus
  every milestone's date, description and source links. The content is fully available to
  someone who cannot render WebGL at all.
- **Narration is real, selectable DOM text** with `aria-live`, never baked into textures.
- **Full keyboard transport**: ↑/↓ nudge the playhead, PgUp/PgDn jump a chapter, Home/End go
  to the ends. All of it routes through the same scroll position the wheel drives.
- **Focus trap** in the record dialog. `aria-modal` without one lets Tab walk into the
  controls behind the overlay — both a WCAG failure and a way to scrub the timeline while
  reading. The transport is additionally disabled whenever an overlay is open.
- **Escape closes** both the record panel and the Archive Explorer; focus moves to the close
  control on open.
- **`prefers-reduced-motion`** disables handheld camera noise, animated grain and
  smooth-scroll interpolation.
- **Audio never gates playback.** If the AudioContext is blocked or the device has no
  output, the film plays in silence rather than stalling. Sound is toggleable.
- **The Museum Guide** exists specifically so the archive is reachable without precise
  pointer interaction, on any screen size.

<details>
<summary><strong>Known accessibility gaps</strong></summary>

Stated rather than glossed over:

- Focus rings are not yet tuned for the dark theme.
- Archive Explorer nodes are focusable buttons but not arrow-key navigable as a graph.
- No live-region announcement fires when a record opens.

</details>

---

## Local Development

```bash
npm install
npm run dev          # http://localhost:3000
```

Press **BEGIN** and scroll. No API keys, no `.env`, no asset downloads.

```bash
npm run build        # production build
npm start            # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

<details>
<summary><strong>Verification and profiling scripts</strong></summary>

All browser-driving scripts need a dev or production server already running, plus a local
Chrome (set `CHROME_PATH` if it is somewhere unusual).

| Command | Purpose |
|---|---|
| `npm run verify` | Drives real Chrome through all eight chapters. Fails on console errors, page exceptions, or **WebGL shader compile/link failures**. |
| `node scripts/check-artifacts.mjs` | In-world artifact interaction: click-through, panel scrolling, timeline freeze and restore. |
| `node scripts/check-scroll-lock.mjs` | Overlay scroll lock against real wheel and keyboard input. |
| `node scripts/check-responsive.mjs` | Mobile / tablet / desktop — entry point reachable, graph renders, no horizontal overflow. |
| `node scripts/profile-render.mjs` | Draw calls, triangles, geometries, textures, programs and frame time per chapter. |
| `node scripts/profile-memory.mjs` | GPU memory by walking live textures and geometry buffers. |
| `node scripts/probe-perf.mjs` | Confirms the adaptive governor actually adapts under load. |
| `node scripts/probe-scene.mjs 0.92` | Dumps camera pose and nearby mesh uniforms at any playhead position. |
| `npm run stills` | One PNG per chapter. |
| `node scripts/capture-one.mjs 0.523 name` | Single frame at an exact playhead position. |
| `npm run build:verify` | Production build into a separate `distDir` so it cannot clobber a running dev server. |

`npm run verify` is the one that matters. It instruments `compileShader` / `linkProgram`
before the app boots, so no shader error can pass silently — a shader that fails to compile
still passes `tsc`, still produces a clean `next build`, and then renders a black screen in
production.

Full notes on each script are in [`scripts/README.md`](scripts/README.md).

</details>

> [!TIP]
> **Never run `npm run build` while `next dev` is running.** Both write to `.next`, and the
> build replaces chunks the dev server is still serving, producing
> `TypeError: __webpack_modules__[moduleId] is not a function`. Use `npm run build:verify`,
> which builds into `.next-verify` instead.

---

## Deployment

No backend, no database, no environment variables, no external asset hosting.

```bash
npm i -g vercel
vercel              # preview
vercel --prod       # production
```

Vercel detects Next.js 15 automatically — zero configuration required. **No environment
variables are needed.**

The app is a single client-rendered route with no server features, so it also exports
cleanly to any static host (`output: 'export'`), runs behind any Node process, or ships as a
Docker image. Netlify, Docker and static-export recipes, recommended cache and CSP headers,
a pre-deploy checklist and a GitHub Actions example are all in
[`DEPLOYMENT.md`](DEPLOYMENT.md).

**Browser support:** requires WebGL2 — Chrome/Edge 90+, Firefox 90+, Safari 15+. There is no
WebGL fallback scene by design, but the full transcript is in the DOM, so a browser that
cannot render the film can still read the entire story and archive.

---

## Challenges

<details open>
<summary><strong>Emotional order versus chronological truth</strong></summary>

The film's scenes run birth → golden age → fall → solitude → ending. Real AI history places
its golden age (2006–2023) *after* its winters (1969–1993). Reordering the scenes would have
broken the camera choreography; reordering history was not an option.

The resolution was to make the mismatch part of the story: the AI's memory is explicitly
non-linear, surfacing by emotional weight rather than date, and the narration says so on
entering the winters. Every record carries its real date, and the Archive Explorer presents
the strict chronology. Both orders exist; neither is compromised.

</details>

<details>
<summary><strong>An invisible signature moment</strong></summary>

The attention field rendered correctly on the first attempt — verified in the live scene
graph as visible, opacity 0.9, correctly positioned — and was completely invisible on screen.
Additive blending cannot register against an already-blown-out golden city.

Two fixes, both of which improved the beat: disabling depth testing (it is a concept
surfacing in the AI's mind, not a structure standing in the street) and dimming the city 72%
for the duration. The world receding while the machine contemplates the architecture it is
built from is a better moment than the one originally designed.

</details>

<details>
<summary><strong>Artifacts nobody could find</strong></summary>

The first in-world artifact implementation assigned records to fragments by simple stride
across the hall. Six artifacts existed; automated testing found that **zero were on screen**
— they were scattered through the full hall volume, including behind the camera.

Rewriting the selection to filter for fragments near the camera's flight path and at eye
level, then assigning in depth order, fixed discovery and produced something better than the
original design: the hall became the timeline.

</details>

<details>
<summary><strong>A modal you could not read</strong></summary>

Opening a record correctly froze the timeline, but the panel itself would not scroll. The
cause was Lenis attaching a non-passive wheel listener to the window and calling
`preventDefault`, swallowing the gesture before the panel's own overflow could consume it.
`data-lenis-prevent` on the scroll containers restored native scrolling.

A related discovery: `overflow: hidden` blocks user scrolling but, per spec, still permits
*programmatic* scrolling — and the app's own keyboard transport scrolls with `window.scrollTo`.
Arrow keys would have scrubbed the film behind an open record. The transport is now gated on
overlay state.

</details>

<details>
<summary><strong>Measuring performance without a GPU</strong></summary>

The verification environment runs SwiftShader, where absolute frame rates are meaningless.
The temptation was to report a plausible FPS number. Instead the profiler was built around
what *is* hardware-independent — draw calls, triangles, geometry and texture counts, memory
footprint — which is what revealed the app was fill-rate bound rather than geometry-bound
and redirected the entire optimisation effort.

An early version of that profiler was itself wrong: `renderer.info` auto-resets on every
`render()` call, and the composer renders several passes per frame, so a naive read only saw
the final fullscreen quad.

</details>

<details>
<summary><strong>Historical accuracy as an engineering constraint</strong></summary>

Every date, name and paper had to be verified against a primary source before it could ship,
with a modelled distinction between exact, approximate and disputed dates. The archival
imagery priority was deliberately limited to a single verified image for the same reason: a
mis-licensed image would undermine the exact credibility the project rests on.

</details>

---

## What I Learned

**Measure before optimising, and be willing to discard your plan.** The original
optimisation list led with merging hero-tower geometry — 24 draw calls into 2. Profiling
showed peak draw calls across the entire application were 64. That work would have been
almost worthless. The real cost was fill rate, and the fix was a pixel-ratio cap and
removing MSAA.

**A test that fails is worth more than a test that passes.** Three of the most valuable
findings in this project came from assertions failing: artifacts nobody could see, a modal
nobody could read, and a keyboard transport that scrubbed the film behind an open dialog.
Two test failures were also *the test's* fault — a selector bound to visible button copy
instead of an `aria-label`, and an assertion that a short card must scroll. Distinguishing a
product bug from a test bug is a skill worth practising deliberately.

**Constraints produce better work than freedom.** Being unable to reorder scenes forced the
non-linear-memory framing, which is the most interesting idea in the project. Being unable
to use bright additive light against a bright city forced the city to recede, which is a
better beat than the one designed.

**Keep React out of the hot path.** Committing to a plain mutable object for per-frame state
and letting only discrete changes reach React is what makes an eight-minute WebGL film hold
together at all.

**Say what you did not verify.** The honest limits — no real-hardware FPS number, artifacts
in one chapter, one licensed image — are more useful to a reader than confident claims that
would not survive scrutiny.

---

## Future Improvements

Genuinely not built, in rough order of value:

1. **Extend in-world artifacts beyond Chapter II.** This requires new geometry for the city
   and the near-empty chapters, which have no fragments by design — a scene-design problem,
   not a wiring problem.
2. **Expand the archival image set.** The mechanism is built and licence-labelled; each
   additional image needs individual licence verification.
3. **Profile on real GPU hardware** and earn a verified 60 FPS claim with Chrome Performance
   traces on a mid-range laptop.
4. **Graph layout algorithm.** The Archive Explorer uses hand-placed columns; edges cross,
   and it cannot be panned or zoomed.
5. **Close the accessibility gaps** listed above — dark-theme focus rings, arrow-key graph
   navigation, live-region announcements.
6. **KTX2 / Basis texture compression**, if the procedural textures are ever replaced with
   authored ones. It buys nothing today, since textures are generated in-browser.
7. **Mobile artifact interaction** as a bottom sheet rather than relying on the guide.

[`BLENDER_ASSETS.md`](BLENDER_ASSETS.md) documents the three places where hand-modelled
geometry would raise the ceiling on the procedural approach, with concrete poly budgets — it
remains accurate and unimplemented.

---

## Credits

Written as an original work. Every image, sound and mesh in the experience is generated from
code at runtime — there are no bundled textures, models, fonts or audio files.

**Third-party code**

- [three.js](https://threejs.org/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber),
  [drei](https://github.com/pmndrs/drei), [postprocessing](https://github.com/pmndrs/postprocessing)
- [GSAP](https://gsap.com/) + ScrollTrigger, [Lenis](https://lenis.darkroom.engineering/),
  [Framer Motion](https://www.framer.com/motion/), [Zustand](https://zustand-demo.pmnd.rs/)
- [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- Simplex 3D noise by **Ashima Arts / Stefan Gustavson** — public domain.

**Public-domain media**

- *Mark I Perceptron, Figure 2 of operator's manual* —
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mark_I_Perceptron,_Figure_2_of_operator's_manual.png),
  [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/). Loaded lazily
  from the source institution, not re-hosted, with credit and licence shown in the UI.

**Historical sources**

Every claim traces to a primary or authoritative source — arXiv, DOI-registered journals,
ACM, IEEE, *Nature*, and official institutional archives. The complete audit, milestone by
milestone, is in [`HISTORY_SOURCES.md`](HISTORY_SOURCES.md).

---

## License

> [!IMPORTANT]
> **No `LICENSE` file is present in this repository yet.** Add one before publishing —
> without it, the work is "all rights reserved" by default and contributors have no clear
> terms.

MIT is the recommended choice and is consistent with how the project is built: no bundled
third-party assets, and every dependency permissively licensed. To adopt it, add a `LICENSE`
file containing the MIT text and this section becomes:

```
MIT © <your name>
```

Third-party dependencies remain under their own licences (three.js, GSAP, Next.js and the
rest are MIT or equivalent; GSAP's standard plugins used here are covered by its no-charge
licence). The one public-domain image is credited above.

---

<p align="center">
  <sub>Built with Next.js, three.js and 35 primary sources.</sub>
</p>
