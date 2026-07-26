# Judge-audit improvements — before / after

Implementation of the three highest-impact improvements from the judge audit.
Scope was held to visual polish, emotional timing, and reliability — no story
changes, no new chapters, architecture preserved. `tsc`, `next build`, the
headless 8-chapter shader/runtime check, and the perf-governor probe all pass.

---

## Priority 1 — Golden Age megacity

**Before:** read as an abstract field of golden bars. No horizon, no sense of
scale, window grid shimmering, and a band of dark tumbling boxes across the
frame. The "showpiece" was the weakest frame in the film.

**Root cause found:** the dark boxes were the **orbital rings** — `buildRing`
gave every segment a *fully random* rotation (intended only for the Fall's
break-apart), so instead of a habitat ring they rendered as opaque debris
dipping into the skyline.

**After — changes:**

| Change | File | Effect |
| --- | --- | --- |
| Atmospheric perspective (distance fog + ground-pooled haze) added to the architecture shader | `shaders/structures.ts`, `components/three/Megacity.tsx` | Distant towers fade into warm haze → depth, scale, and far-field shimmer eliminated |
| 5 hero skyscrapers with distinct silhouettes (spire, Art-Deco setback, sky-gate, sail-blade, crowned cylinder) + pulsing aircraft-warning beacons, staggered in depth | `components/three/HeroTowers.tsx` (new), `scenes/GoldenAgeScene.tsx` | Landmark identity; the skyline now reads as "megacity" at a glance |
| Orbital rings re-oriented **tangentially** into a clean glowing band, raised above the skyline, emissive ×4 | `utils/geometry.ts`, `components/three/OrbitalRing.tsx`, `scenes/GoldenAgeScene.tsx` | Removed the "debris" band entirely; a second horizon arcs overhead |
| Air-traffic rebuilt as HDR additive light-trails in three altitude bands (low arterial, mid, sky-crossing) with per-vehicle colour and speed | `components/three/Traffic.tsx` | Traffic reads as glowing streaks that bloom; the city feels inhabited. (Fixed a `vertexColors`/`instanceColor` conflict that rendered craft as black boxes.) |
| Window density 0.36 → 0.28, far-field LOD dissolves to mean earlier | `scenes/GoldenAgeScene.tsx`, `shaders/structures.ts` | Less aliasing, cleaner façades |
| First crane keyframe re-aimed high-and-up at the hero cluster against open sky | `lib/cameraRail.ts` | A clean establishing "wow" frame |

**Measurable:** the establishing frame now contains a horizon, warm hazy sky,
layered depth, ≥2 clearly-readable landmark towers, and glowing traffic — versus
zero of those before. Draw-call budget essentially unchanged (hero towers add
~25 tiny meshes; rings/traffic reuse existing instanced draws).

---

## Priority 2 — Final Memory & ending

**Before:** the closest approach flew *into* the photograph (fov 24 at ~3 units)
so it washed out to white and cropped the group; the pull-back began the instant
"Humanity." appeared, with no held beat.

**After — changes:**

| Change | File | Effect |
| --- | --- | --- |
| Four figures redrawn with **deliberate connected poses** (arm around the child, child reaching up, heads tilted in) as solid readable silhouettes; warmer, stronger rim light | `assets/memoryTextures.ts` | Body-language reads as human connection, not four identical standing shapes |
| **Rack-focus**: a `uFocus` uniform blurs→sharpens the memory as the camera arrives (5-tap disc blur collapsing to zero) | `shaders/hologram.ts`, `scenes/LastMemoryScene.tsx` | The AI stops *reconstructing* the memory and simply looks at it |
| Corruption + scanlines withdraw **completely** before the beat | `scenes/LastMemoryScene.tsx` | The image is fully clean at "Humanity." |
| Closest approach reframed to **hold the whole group** (z≈8, fov 30) instead of cropping in | `lib/cameraRail.ts` | Composed frame: four figures + sun + treeline, no wash-out |
| **Held beat**: camera settles and barely breathes from arrival through "Humanity." and the silence, *then* pulls back | `lib/cameraRail.ts` | The viewer processes the image before it recedes |
| **Audio reverence dip**: the score ducks to near-silence across the held beat, then breathes back for the reveal; the piano stops scheduling into the pause | `audio/engine.ts` | The last word lands into stillness |
| Crystal reveal delayed until *after* the hold, and toned down (was blowing out to a white ball under bloom) | `scenes/RevealScene.tsx` | Reads as a faceted jewel appearing around the photo, then receding to a speck |

**Measurable:** at the "Humanity." frame the full four-figure composition is
legible and un-blown-out (previously ~42% of the photo was visible and washed);
there is now a distinct hold window (~scroll 0.930–0.957) where camera motion is
< 0.4 units and the audio bed drops ~84%.

---

## Priority 3 — First impression & reliability

**Before:** glitch text swapped letters for other letters/digits ("possibleR",
"afterno9n") — indistinguishable from typos. The DPR governor reacted only every
30 frames (≈7.5 s at 4 fps). BEGIN could appear before WebGL had drawn a frame.

**After — changes:**

| Change | File | Effect |
| --- | --- | --- |
| Glitch corruption uses **only data-glyphs** (blocks/technical symbols), tinted cold-signal blue, capped fraction | `components/ui/GlitchText.tsx` | Reads unmistakably as signal interference over legible text ("I tr◇ed—"), never a typo |
| Governor samples every 30 frames **or 0.5 s**, whichever first; larger steps on hard drops | `components/three/PerformanceGovernor.tsx` | Reacts within ~0.5 s even at 4 fps instead of ~7.5 s |
| **Automatic performance mode** (`quality.perfMode`): latches when pinned at the DPR floor and still slow; low-tier devices start in it; unlocks a lower panic floor (0.5–0.75) | `lib/quality.ts` (new), `PerformanceGovernor.tsx`, `PostFX.tsx` | Fragment-bound GPUs shed resolution + bloom cost automatically; motion stays smooth |
| **Render-ready gate**: BEGIN waits until WebGL has produced its first frames | `lib/store.ts`, `components/Experience.tsx` | The film can never start on a black screen while shaders compile |
| PostFX bloom dialled back in perfMode | `PostFX.tsx` | Less additive overdraw on weak hardware |

**Measurable (SwiftShader worst-case probe):** the governor walks DPR
2.0 → 1.3 → 1.0 → 0.75 within seconds and latches `perfMode` when it pins the
floor — verified by `scripts/probe-perf.mjs`. The opening DOM terminal renders
immediately regardless of GPU; BEGIN now appears only after `renderReady`.

---

## Verification

```
npm run dev            # then, in another terminal:
npm run verify         # 8-chapter shader/runtime check — PASS
node scripts/probe-perf.mjs   # governor adapts under load — PASS
node scripts/capture-mobile.mjs   # mobile fallback — PASS
npm run build          # clean, 305 kB first load
```
