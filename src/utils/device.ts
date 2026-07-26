import { QUALITY_SCALE, type QualityTier } from '@/lib/constants';

export interface DeviceProfile {
  tier: QualityTier;
  scale: number;
  dpr: [number, number];
  isMobile: boolean;
  reducedMotion: boolean;
  /** Heavy post-processing (DOF, extra bloom passes) only on high tier. */
  heavyPostFX: boolean;
}

const DEFAULT: DeviceProfile = {
  tier: 'high',
  scale: 1,
  dpr: [1, 2],
  isMobile: false,
  reducedMotion: false,
  heavyPostFX: true,
};

/**
 * Cheap, synchronous capability probe. We deliberately avoid a benchmark frame
 * — a stutter on the very first render is worse than a slightly wrong guess.
 */
export function detectDevice(): DeviceProfile {
  if (typeof window === 'undefined') return DEFAULT;

  const ua = navigator.userAgent;
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  let tier: QualityTier = 'high';
  if (isMobile || cores <= 4 || memory <= 4) tier = 'medium';
  if ((isMobile && (cores <= 4 || small)) || cores <= 2 || memory <= 2) tier = 'low';

  // Pixel-ratio ceiling is capped at 1.5, never the display's native 2.0+.
  // Every scene wraps the camera in a fullscreen additive atmosphere shell and
  // the composer adds bloom on top, so cost scales with pixels far more than
  // with geometry: dropping the ceiling from 2.0 to 1.5 removes ~44% of all
  // shaded pixels on a retina laptop for no visible change at these sizes.
  const dpr: [number, number] =
    tier === 'high' ? [1, 1.5] : tier === 'medium' ? [0.9, 1.25] : [0.75, 1];

  return {
    tier,
    scale: QUALITY_SCALE[tier],
    dpr,
    isMobile,
    reducedMotion,
    heavyPostFX: tier === 'high',
  };
}

/** Scale a particle/instance count by the device tier, never below a floor. */
export const countFor = (profile: DeviceProfile, base: number, floor = 24) =>
  Math.max(floor, Math.round(base * profile.scale));
