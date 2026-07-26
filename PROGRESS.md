# Progress report — THE LAST MEMORY

_Snapshot taken while resuming implementation. This is a status document, not
part of the shipped experience._

## Summary

The project is **feature-complete and structurally finished** — all eight
chapters, the full scroll-driven timeline, the camera rail, every shader, the
post-processing chain, the generative audio engine, and the DOM UI layer are all
implemented. Current work is **correctness and visual-fidelity hardening**: a
class of R3F bug that made shader-driven scenes render their initial state
instead of animating.

66 source files, ~8,000 lines. `tsc --noEmit` and `next build` both pass. All 8
chapters verified rendering with zero shader compile/link or runtime errors.

## Complete

| Area | State | Notes |
| --- | --- | --- |
| Project scaffold | ✅ | Next 15 / React 19 / TS / Tailwind / R3F / drei / postprocessing / GSAP / Lenis / Framer Motion / zustand |
| Screenplay / timeline | ✅ | `lib/chapters.ts` — single source of truth, 8 chapters, narration, audio beds |
| Camera choreography | ✅ | `lib/cameraRail.ts` — 30-key Catmull-Rom rail, handheld fbm, critical damping, Dutch roll |
| The director | ✅ | `lib/director.ts` — corruption, exposure, core-life, colour grade, fog, scene weights, all pure functions of `t` |
| Scroll transport | ✅ | Lenis + GSAP ScrollTrigger, single rAF, writes to mutable `scrollState` (no per-frame React) |
| Prologue + 7 chapters | ✅ | All environments built and mounted through `SceneDirector` |
| Shaders | ✅ | core, neural, hologram, particles, crystal, corruption, structures, atmosphere + shared chunks |
| Post-processing | ✅ | Bloom + single combined grade/lens/failure pass; instantiated directly to dodge the React-19 `wrapEffect` crash |
| Audio engine | ✅ | Fully generative — drone / FM piano / noise / procedural reverb, scheduled on the audio clock, cross-faded per chapter |
| DOM UI | ✅ | boot terminal, narration, chapter cards, HUD, scroll hint, letterbox, end card, a11y transcript |
| Performance | ✅ | tiered quality, adaptive DPR governor, scene mount/unmount by fade range, instanced draws |
| Keyboard transport | ✅ | arrows / page / home / end, routed through the same scroll position |
| Verification tooling | ✅ | headless playthrough (shader-error trap), still capture, scene probes |

## Fixed this session

- **The uniforms-identity bug (root cause of missing/frozen scenes).** R3F
  reconciles the `uniforms` prop of `<shaderMaterial>` rather than assigning it,
  so the material ends up with a *clone* and every component was animating an
  orphaned uniforms object nobody rendered. Symptom: the final photograph never
  appeared, the starfield froze, geometry never revealed. Diagnosed by object
  identity comparison in the live scene (`lm.uniforms === sceneMat.uniforms →
  false`). Fixed with `utils/useShaderMaterial.ts`, which constructs the
  `THREE.ShaderMaterial` directly so the render loop and the GPU share one
  uniforms object. Converted all 11 shader-driven components/scenes.
- **The grade rendered every frame as a bright noise field.** Contrast drove
  near-black negative and the ACES approximation maps negatives to bright grey.
  Fixed: 0.18 contrast pivot, clamp before tone-map, unit-luminance gain
  normalisation, midtone-weighted grain.
- **`<Bloom>` wrapper crashed the app** under React 19 (`JSON.stringify(ref)` →
  circular). Now both effects are constructed directly.
- **Audio could strand the boot screen** — made strictly non-blocking.
- **Golden Age camera flew inside the towers** (texture wall) — rail lifted above
  the skyline; window LOD no longer lights glancing faces as solid slabs.

## Verified complete this session

1. **Uniforms fix, end-to-end.** All 11 shader components converted to owned
   materials. Live identity probe now reports the rendered material and the
   animated uniforms are the same object (`sceneUOpacity` 0 → 1, `sceneUTime`
   advancing). Visually confirmed: the final photograph renders (four figures
   at sunset, the child with a raised arm), and the crystal reveal drifts in the
   void. Headless playthrough passes all 8 chapters with no shader/runtime
   errors. Production build clean (305 kB first load).
2. **Narration scrub-backlog fixed.** `AnimatePresence mode="wait"` serialised
   exits into a queue that lagged chapters behind a fast scrub. Switched to
   `mode="popLayout"` with absolute centring — the active line now tracks the
   camera position exactly.
3. **Mobile fallback verified.** Emulated phone (390×844, touch, DPR 3, 4c/4GB):
   touch-tap boot works, DPR correctly clamps to 1 (low tier engaged), all
   scenes render in portrait with correct composition and letterboxing, zero
   console/page errors.
4. **Scene transitions confirmed.** `sceneWeight` bleeds 55% of each chapter's
   span into both neighbours, so every boundary is a true overlapping
   cross-dissolve. No cuts. Verified across all chapter boundaries.

## Status: production-ready

All nine listed priorities are complete. `tsc`, `next build`, the headless
8-chapter shader/runtime verification, and the mobile fallback check all pass.
Remaining is optional polish only (e.g. hand-modelled hero assets per
`BLENDER_ASSETS.md`), not required for a runnable, award-target build.

## Known-good invariants (do not regress)

- No React re-render during playback — scroll state is mutable; only chapter
  index and active-scene mask reach React.
- Zero external assets — every image/sound/model is generated from a seed.
- One combined post pass — do not split the grade back into separate effects.
- `useShaderMaterial` / direct material construction for anything whose uniforms
  are written in `useFrame`.
