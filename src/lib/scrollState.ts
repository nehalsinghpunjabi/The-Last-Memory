/**
 * A single mutable object read by the render loop every frame.
 *
 * React state is deliberately NOT used for scroll: at 60fps a store write per
 * frame would re-render the whole tree. GSAP writes into this object; the
 * Canvas reads from it; only *discrete* changes (chapter index) reach React.
 */

export interface ScrollState {
  /** Raw normalised scroll 0..1. */
  raw: number;
  /** Smoothed value the camera actually follows. */
  eased: number;
  /** Signed scroll velocity, roughly -1..1. */
  velocity: number;
  /** Seconds since the experience started. */
  elapsed: number;
  /** 0..1 — how badly the archive is failing right now. Drives post-fx. */
  corruption: number;
  /** 0..1 — global master fade used by the epilogue. */
  exposure: number;
  /** Remaining system integrity, shown in the HUD. */
  integrity: number;
  /** True once the user has committed to the experience. */
  started: boolean;
  /** Last frame delta in seconds, as used by the smoothing. */
  dt: number;
}

export const scrollState: ScrollState = {
  raw: 0,
  eased: 0,
  velocity: 0,
  elapsed: 0,
  corruption: 0,
  exposure: 1,
  integrity: 3,
  started: false,
  dt: 1 / 60,
};

export function resetScrollState() {
  scrollState.raw = 0;
  scrollState.eased = 0;
  scrollState.velocity = 0;
  scrollState.elapsed = 0;
  scrollState.corruption = 0;
  scrollState.exposure = 1;
  scrollState.integrity = 3;
}
