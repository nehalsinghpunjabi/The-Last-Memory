# Performance optimization pass

## How this was measured, and what the numbers mean

The headless harness renders through **SwiftShader** (software WebGL), so
absolute frames-per-second measured here (2–7 fps) says nothing about a real
laptop GPU and is not reported as if it did. What *is* hardware-independent —
and is what a GPU is actually bounded by — was measured directly from
`renderer.info` and by walking the live scene graph:

- draw calls and triangles per frame (`scripts/profile-render.mjs`, which
  disables `info.autoReset` so it accumulates every composer pass in one frame
  rather than only the final fullscreen quad)
- texture and geometry bytes resident (`scripts/profile-memory.mjs`)
- governor behaviour (`scripts/probe-perf.mjs` live, `scripts/test-governor.mjs`
  deterministic)

Frame-time under software rendering was too noisy between runs to be a useful
signal and is deliberately not quoted as a result.

## Draw calls (per frame)

| scene | before | after | change |
| --- | ---: | ---: | ---: |
| prologue | 34 | 30 | −12% |
| genesis | 24 | 20 | −17% |
| **humanity** | **94** | **58** | **−38%** |
| goldenAge | 63 | 42 | −33% |
| fall | 44 | 35 | −20% |
| solitude | 33 | 31 | −6% |
| lastMemory | 45 | 40 | −11% |
| reveal | 26 | 23 | −12% |
| **peak** | **94** | **≤60** | **−36%** |

## Triangles (per frame)

| scene | before | after |
| --- | ---: | ---: |
| **humanity** | **22k** | **5k** (−77%) |
| goldenAge | 80k | 72k |
| fall | 127k | 127k |

Triangle counts elsewhere were left alone deliberately: 127k triangles is
nothing for a modern GPU, and the film is fill-rate bound, not vertex bound.
Chasing them would have cost visual density for no gain.

## GPU memory (scene-reachable, measured)

| scene | before | after |
| --- | ---: | ---: |
| **humanity** | **25.40 MB** | **8.15 MB** |
| goldenAge | 25.41 MB | 8.17 MB |
| fall | 3.43 MB | 3.43 MB |
| **peak** | **25.41 MB** | **8.17 MB** (−68%) |

Live texture objects at peak: **75 → 41**. The before figure was measured
empirically by temporarily restoring the old one-texture-per-fragment
behaviour, not estimated.

## What actually mattered, in order

1. **Pixel-ratio ceiling 2.0 → 1.5** (`utils/device.ts`). Every chapter wraps the
   camera in a fullscreen additive atmosphere shell with bloom on top, so cost
   scales with pixels far more than with geometry. On a retina laptop this
   removes ~44% of all shaded pixels. Single biggest real-hardware win, and it
   brings the envelope into the requested 0.75–1.5 range.
2. **Atmosphere shader: 18 → 8 noise evaluations per pixel**
   (`shaders/atmosphere.ts`). It ran 6 ray taps × 3-octave fbm fullscreen in
   every scene — the most expensive shader in the film. Reduced to 4 taps × 2
   octaves with renormalised weights. Verified visually identical on a Golden Age
   frame (the fine octave was already being swallowed by bloom, grain and
   vignette).
3. **Texture pooling in the memory halls** (`HumanityScene`, `FallScene`). Each
   fragment baked its own unique 384px canvas texture — 46 of them resident for
   images the camera drifts past in a dim hall. A pool of 14, re-used across
   fragments that already differ in scale, rotation, warmth and corruption, is
   indistinguishable in motion. This is the −68% GPU memory.
4. **Geometry merging.** Each memory fragment's shards are static relative to
   their parent and share its material, so they are baked into one buffer
   (up to 4 draw calls → 1 per fragment); the plane also went from a 12×12 grid
   to 6×6, which is where the −77% triangles came from. The five hero towers
   merged their 19 parts into 5 meshes.
5. **Bloom mip levels 8 → 6** (`PostFX`). Two full-frame downsample/upsample
   passes that only added a very wide, very faint halo.
6. **Dynamic particle budget** (`DustField`). Additive motes are pure overdraw
   and the cheapest thing to give up. The governor's `perfMode` /`struggling`
   flags now thin the field to 62% / 40% via `setDrawRange`, which allocates
   nothing and keeps the surviving motes in their exact positions, so the field
   thins rather than re-seeding visibly.
7. **React frame-loop fix** (`hooks/useRafValue.ts`). Callers pass `equals`
   inline, so its identity changed every render; as a `useEffect` dependency it
   was tearing down and rebuilding the animation-frame loop on *every render* of
   every HUD component. Both callbacks now live in refs. Also memoised the
   8-row chapter spine (`SystemHud`) so integrity/corruption ticks stop
   rebuilding it, and the milestone filter+sort in `ArchiveMarkers`.

## Governor correctness

Profiling surfaced a real defect: `perfMode` latched permanently, so one heavy
moment (the Golden Age flyover) would degrade every later chapter forever.
Recovery hysteresis was added — a sustained comfortable framerate with the pixel
ratio back at the normal floor releases the latch; low-tier devices stay pinned.

That recovery path is unreachable under software rendering (which never exceeds
a few fps, so the downshift branch always wins first), so the decision logic was
extracted into a pure function, `lib/governorStep.ts`, and is driven with
synthetic framerate sequences by `scripts/test-governor.mjs`. The component
calls that same function, so the tested logic is the shipped logic. All 10
checks pass, including recovery, hysteresis against one-off fast frames, low-tier
pinning, and the DPR envelope never leaving [0.75, 1.5].

## Deliberately not done

- **KTX2 / Basis compression.** There are no image assets to compress: every
  texture in the film is painted procedurally on a canvas at runtime, which is
  a deliberate part of the premise (the AI reconstructs its memories). A GPU
  compression pipeline would mean shipping binary assets and *adding* download
  weight. The equivalent win — fewer, smaller, shared textures — was taken
  instead, for −68% GPU memory.
- **Lazy-loading heavy assets.** Already in place: the entire WebGL layer is a
  `next/dynamic` import with `ssr: false`, and scenes mount and unmount around
  the playhead rather than all being resident.
- **Frustum culling** is on by default for scene meshes. It is explicitly
  disabled only on the atmosphere shell, the dust fields and the instanced city
  — all of which surround or span the camera, where a bounding-sphere test can
  only ever produce a false negative that pops the effect out of the frame.
- **Object pooling** was not introduced: nothing in the render loop allocates
  per frame. The per-frame work is uniform writes on pre-built materials.
- **Chasing triangle counts** in the Golden Age and Fall, for the reason above.

## Verification

`npx tsc --noEmit`, `npm run build`, `npm run verify` (all 8 chapters, zero
shader/runtime errors), `scripts/smoke-check.mjs` (zero console errors),
`scripts/test-governor.mjs` (10/10), `scripts/probe-perf.mjs` (adapts under
load). A Golden Age frame was captured before and after the shader reduction and
compared to confirm no visible change.
