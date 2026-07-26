/**
 * The performance governor's decision, as a pure function.
 *
 * Kept separate from the React component for one practical reason: the
 * recovery path (releasing performance mode once the GPU is comfortable again)
 * is unreachable under software rendering, which never exceeds a few frames per
 * second — so it cannot be exercised in the headless harness. As a pure
 * function it can be driven with synthetic framerate sequences and verified
 * deterministically. See scripts/test-governor.mjs.
 */

export interface GovernorState {
  /** Current device pixel ratio. */
  dpr: number;
  perfMode: boolean;
  slowStreak: number;
  fastStreak: number;
}

export interface GovernorLimits {
  minDpr: number;
  maxDpr: number;
  panicFloor: number;
  /** Low-tier hardware never leaves performance mode. */
  isLowTier: boolean;
}

export interface GovernorDecision extends GovernorState {
  struggling: boolean;
  /** True when dpr changed and the renderer should be updated. */
  changed: boolean;
}

export function governorStep(
  fps: number,
  state: GovernorState,
  limits: GovernorLimits
): GovernorDecision {
  const { minDpr, maxDpr, panicFloor, isLowTier } = limits;
  let { dpr, perfMode, slowStreak, fastStreak } = state;

  const floor = perfMode ? panicFloor : minDpr;
  let next = dpr;

  if (fps < 30) {
    // Hard drop — the frame is visibly janky. Take a big step.
    next = Math.max(floor, dpr - 0.35);
    slowStreak += 2;
  } else if (fps < 48) {
    next = Math.max(floor, dpr - 0.2);
    slowStreak += 1;
  } else if (fps > 58 && dpr < maxDpr) {
    next = Math.min(maxDpr, dpr + 0.12);
    slowStreak = Math.max(0, slowStreak - 1);
  } else {
    slowStreak = Math.max(0, slowStreak - 1);
  }

  // Latch performance mode: pinned at the floor and still slow for a while.
  const pinned = dpr <= floor + 0.001;
  if (pinned && fps < 48) {
    slowStreak += 1;
    if (slowStreak >= 3 && !perfMode) perfMode = true;
  }
  let struggling = pinned && fps < 48;

  // Recovery. Without this, one heavy moment would latch performance mode for
  // the rest of the film and every sparse chapter after it would render at
  // reduced quality for no reason. Releasing requires both a sustained
  // comfortable framerate and the pixel ratio having climbed back to the normal
  // floor, which makes it hysteretic against the downshift rules above.
  if (perfMode && !isLowTier && fps > 58) {
    fastStreak += 1;
    if (fastStreak >= 6 && next >= minDpr) {
      perfMode = false;
      struggling = false;
      fastStreak = 0;
      slowStreak = 0;
    }
  } else if (fps < 55) {
    fastStreak = 0;
  }

  return {
    dpr: next,
    perfMode,
    slowStreak,
    fastStreak,
    struggling,
    changed: Math.abs(next - dpr) > 0.005,
  };
}
