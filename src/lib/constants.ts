/**
 * Global tuning constants for THE LAST MEMORY.
 * Everything that a director would want to tweak lives here.
 */

/** Total scroll length of the experience, expressed in viewport heights. */
export const SCROLL_LENGTH_VH = 1400;

/** Palette — cold machine light vs. warm human memory. */
export const PALETTE = {
  void: '#000000',
  deepSpace: '#03040a',
  signal: '#9fd8ff',
  signalDeep: '#2f6f9e',
  neural: '#6fb7ff',
  ember: '#ffb774',
  gold: '#ffd9a0',
  sun: '#ffe6bd',
  decay: '#ff5a4a',
  rust: '#7a2f24',
  bone: '#e8e4dc',
} as const;

/** Numeric colour values, convenient for three.js. */
export const COLOR = {
  void: 0x000000,
  deepSpace: 0x03040a,
  signal: 0x9fd8ff,
  signalDeep: 0x2f6f9e,
  neural: 0x6fb7ff,
  ember: 0xffb774,
  gold: 0xffd9a0,
  sun: 0xffe6bd,
  decay: 0xff5a4a,
  bone: 0xe8e4dc,
} as const;

/** Quality tiers scale particle counts, post-fx and resolution. */
export const QUALITY_SCALE = {
  low: 0.35,
  medium: 0.65,
  high: 1,
} as const;

export type QualityTier = keyof typeof QUALITY_SCALE;

/** Camera defaults. Long lens = cinematic compression. */
export const CAMERA = {
  fov: 38,
  near: 0.1,
  far: 4000,
};

/** How strongly the virtual camera operator's hands shake. */
export const HANDHELD = {
  amplitude: 0.055,
  frequency: 0.22,
  rollAmplitude: 0.0055,
};

export const SMOOTH_SCROLL = {
  lerp: 0.075,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
};
