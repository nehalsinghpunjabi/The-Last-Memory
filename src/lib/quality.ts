/**
 * Live rendering-quality state.
 *
 * A plain mutable object (same pattern as scrollState): the PerformanceGovernor
 * writes it every time it adapts, and the render loop / PostFX read it every
 * frame — no React re-renders in the hot path.
 *
 * `perfMode` is the automatic "weaker hardware" switch. It turns on when the
 * device is detected as low-tier, or when the governor has already dropped the
 * pixel ratio to its floor and the framerate is *still* below target — i.e. the
 * GPU is fragment-bound past what resolution alone can fix. Consumers respond by
 * shedding the most expensive per-pixel work (bloom passes, the aberration
 * ghost) to hold a smooth framerate. Quality degrades gracefully; motion never
 * stutters.
 */
export const quality = {
  /** Current adaptive device pixel ratio. */
  dpr: 1,
  /** True when the heavy hardware path is active — post FX shed cost. */
  perfMode: false,
  /** True when pinned at the DPR floor and still under target. */
  struggling: false,
  /** Smoothed frames-per-second estimate, for telemetry/HUD. */
  fps: 60,
};

export function resetQuality() {
  quality.dpr = 1;
  quality.perfMode = false;
  quality.struggling = false;
  quality.fps = 60;
}
