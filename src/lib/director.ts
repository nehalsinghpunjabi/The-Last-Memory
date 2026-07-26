import * as THREE from 'three';
import { CHAPTERS, chapterIndexAt, chapterProgressAt } from './chapters';
import { clamp, lerp, pulse, smoothstep } from '@/utils/math';

/**
 * The director.
 *
 * Every continuous, non-geometric signal in the film is computed here from a
 * single number: global scroll progress. Colour grade, corruption, exposure,
 * bloom, fog, core brightness — one function each, all pure, all called once
 * per frame. Nothing else in the codebase decides what the film looks like.
 */

/* ------------------------------------------------------------------ *
 * Corruption — how badly the archive is failing.
 * ------------------------------------------------------------------ */
export function computeCorruption(t: number, time: number, velocity = 0): number {
  let c = 0;

  // Prologue: heavy artefacting that settles as the core stabilises itself.
  c += 0.55 * smoothstep(0.06, 0.0, t);

  // Chapter II: occasional memory-corruption stutters.
  if (t > 0.235 && t < 0.4) {
    const local = chapterProgressAt(t, 2);
    // Three seeded spikes rather than random noise — they can be *composed*.
    c += 0.34 * pulse(0.22, 0.3, local);
    c += 0.28 * pulse(0.55, 0.61, local);
    c += 0.4 * pulse(0.86, 0.95, local);
  }

  // Chapter IV: the collapse. Corruption becomes the dominant visual language.
  if (t > 0.545) {
    const ramp = smoothstep(0.545, 0.7, t);
    const release = 1 - smoothstep(0.7, 0.735, t);
    c += ramp * release * 0.95;
    // Violent flutter on top, so it never sits at a constant value.
    c += ramp * release * 0.28 * Math.abs(Math.sin(time * 6.1) * Math.sin(time * 2.3));
  }

  // Chapter VII: the last flickers before shutdown.
  if (t > 0.972) {
    c += 0.5 * smoothstep(0.972, 0.995, t) * (0.4 + 0.6 * Math.abs(Math.sin(time * 9.0)));
  }

  // Scrolling fast strains a dying machine.
  c += clamp(Math.abs(velocity) * 0.5, 0, 0.18);

  // Baseline unease — never perfectly clean, even at its best.
  c += 0.035;

  return clamp(c, 0, 1);
}

/* ------------------------------------------------------------------ *
 * Exposure — the master fade. The machine stops rendering.
 * ------------------------------------------------------------------ */
export function computeExposure(t: number): number {
  // Fade up out of the opening black.
  const open = smoothstep(0.0, 0.02, t);
  // The final fade: slow, then total. Nothing eases back in.
  const close = 1 - smoothstep(0.982, 0.999, t);
  return clamp(open * close);
}

/** Remaining system integrity, shown in the HUD. Only ever falls. */
export function computeIntegrity(t: number): number {
  return Math.max(0, 3 * (1 - smoothstep(0.0, 0.995, t)));
}

/* ------------------------------------------------------------------ *
 * Core life — how alive the AI looks.
 * ------------------------------------------------------------------ */
export function computeCoreLife(t: number): number {
  if (t < 0.085) return lerp(0.18, 0.42, smoothstep(0.0, 0.085, t)); // faint, waking
  if (t < 0.235) return lerp(0.42, 1.0, smoothstep(0.085, 0.2, t)); // "It was light."
  if (t < 0.4) return lerp(1.0, 0.92, smoothstep(0.235, 0.4, t));
  if (t < 0.575) return lerp(0.92, 1.0, smoothstep(0.4, 0.5, t)); // golden age peak
  if (t < 0.715) return lerp(1.0, 0.34, smoothstep(0.575, 0.715, t)); // the fall
  if (t < 0.835) return lerp(0.34, 0.14, smoothstep(0.715, 0.835, t)); // solitude: dim
  if (t < 0.945) return lerp(0.14, 0.55, smoothstep(0.835, 0.93, t)); // one last warmth
  return lerp(0.55, 0.0, smoothstep(0.945, 0.996, t)); // power down
}

/* ------------------------------------------------------------------ *
 * Colour grade
 * ------------------------------------------------------------------ */
export interface Grade {
  lift: THREE.Color;
  gain: THREE.Color;
  saturation: number;
  contrast: number;
  bleach: number;
  vignette: number;
  grain: number;
  aberration: number;
  scanline: number;
  distortion: number;
  bloom: number;
  fogColor: THREE.Color;
  fogDensity: number;
  primary: THREE.Color;
  secondary: THREE.Color;
}

const _grade: Grade = {
  lift: new THREE.Color(),
  gain: new THREE.Color(),
  saturation: 1,
  contrast: 1,
  bleach: 0,
  vignette: 0.6,
  grain: 0.05,
  aberration: 0.0015,
  scanline: 0.4,
  distortion: 0.06,
  bloom: 0.7,
  fogColor: new THREE.Color(),
  fogDensity: 0.02,
  primary: new THREE.Color(),
  secondary: new THREE.Color(),
};

const _ca = new THREE.Color();
const _cb = new THREE.Color();

/** Per-chapter grade targets, cross-faded across chapter boundaries. */
interface GradeKey {
  lift: string;
  gain: string;
  saturation: number;
  contrast: number;
  bleach: number;
  vignette: number;
  grain: number;
  aberration: number;
  scanline: number;
  distortion: number;
  bloom: number;
}

const GRADES: GradeKey[] = [
  // 0 prologue — cold, crushed, heavily scanned.
  { lift: '#02040a', gain: '#8fb6d8', saturation: 0.55, contrast: 1.22, bleach: 0.25, vignette: 1.0, grain: 0.1, aberration: 0.004, scanline: 1.0, distortion: 0.14, bloom: 0.5 },
  // 1 genesis — clean, blue, luminous.
  { lift: '#01030a', gain: '#b9d8f5', saturation: 0.92, contrast: 1.1, bleach: 0.05, vignette: 0.72, grain: 0.05, aberration: 0.0018, scanline: 0.42, distortion: 0.075, bloom: 1.15 },
  // 2 humanity — first warmth creeping in.
  { lift: '#050408', gain: '#e2ddd4', saturation: 1.02, contrast: 1.06, bleach: 0.03, vignette: 0.62, grain: 0.055, aberration: 0.0022, scanline: 0.38, distortion: 0.06, bloom: 0.95 },
  // 3 golden age — the warmest, richest, most alive frame in the film.
  { lift: '#0a0603', gain: '#ffd9a8', saturation: 1.22, contrast: 1.02, bleach: 0.0, vignette: 0.48, grain: 0.035, aberration: 0.0016, scanline: 0.22, distortion: 0.05, bloom: 1.45 },
  // 4 the fall — desaturated, bruised, violent.
  { lift: '#0c0403', gain: '#c08a72', saturation: 0.62, contrast: 1.3, bleach: 0.42, vignette: 0.92, grain: 0.13, aberration: 0.007, scanline: 0.85, distortion: 0.13, bloom: 0.85 },
  // 5 solitude — almost monochrome, very deep blacks, very little light.
  { lift: '#000103', gain: '#7d95ab', saturation: 0.42, contrast: 1.16, bleach: 0.3, vignette: 0.85, grain: 0.045, aberration: 0.0012, scanline: 0.18, distortion: 0.04, bloom: 0.55 },
  // 6 last memory — warm, soft, forgiving. The only "beautiful" grade.
  { lift: '#0a0705', gain: '#ffd2a0', saturation: 1.14, contrast: 0.98, bleach: 0.0, vignette: 0.55, grain: 0.03, aberration: 0.0014, scanline: 0.12, distortion: 0.045, bloom: 1.3 },
  // 7 reveal — cold again, and emptying.
  { lift: '#000102', gain: '#9fb8d0', saturation: 0.7, contrast: 1.1, bleach: 0.2, vignette: 0.78, grain: 0.05, aberration: 0.002, scanline: 0.25, distortion: 0.05, bloom: 0.9 },
];

export function computeGrade(t: number, corruption: number): Grade {
  const i = chapterIndexAt(t);
  const local = chapterProgressAt(t, i);
  const j = Math.min(i + 1, GRADES.length - 1);

  // Cross-fade the final third of each chapter into the next grade so the look
  // changes *during* the transition, never on a cut.
  const blend = smoothstep(0.66, 1.0, local);

  const a = GRADES[i];
  const b = GRADES[j];

  _grade.lift.set(a.lift).lerp(_ca.set(b.lift), blend);

  // Gain is authored as a colour ("what tint does this chapter have?") but is
  // applied as a multiplier. Left raw, '#8fb6d8' is ~0.28 in linear light, so
  // it does not tint the frame — it darkens it by a factor of three and takes
  // the whole chapter with it. Normalising to unit luminance keeps the hue and
  // removes the accidental exposure change; brightness stays the job of the
  // lights and the bloom.
  _grade.gain.set(a.gain).lerp(_cb.set(b.gain), blend);
  const gainLuma =
    _grade.gain.r * 0.2126 + _grade.gain.g * 0.7152 + _grade.gain.b * 0.0722;
  if (gainLuma > 1e-4) _grade.gain.multiplyScalar(1 / gainLuma);

  _grade.saturation = lerp(a.saturation, b.saturation, blend);
  _grade.contrast = lerp(a.contrast, b.contrast, blend);
  _grade.bleach = lerp(a.bleach, b.bleach, blend);
  _grade.vignette = lerp(a.vignette, b.vignette, blend);
  _grade.grain = lerp(a.grain, b.grain, blend);
  _grade.aberration = lerp(a.aberration, b.aberration, blend);
  _grade.scanline = lerp(a.scanline, b.scanline, blend);
  _grade.distortion = lerp(a.distortion, b.distortion, blend);
  _grade.bloom = lerp(a.bloom, b.bloom, blend);

  // Corruption pushes the grade further in its own direction.
  _grade.grain += corruption * 0.09;
  _grade.scanline = clamp(_grade.scanline + corruption * 0.5, 0, 1.4);
  _grade.saturation = lerp(_grade.saturation, 0.35, corruption * 0.45);

  const ca = CHAPTERS[i];
  const cb = CHAPTERS[j];
  _grade.fogColor.set(ca.grade.fog).lerp(_ca.set(cb.grade.fog), blend);
  _grade.fogDensity = lerp(ca.grade.fogDensity, cb.grade.fogDensity, blend);
  _grade.primary.set(ca.grade.primary).lerp(_ca.set(cb.grade.primary), blend);
  _grade.secondary.set(ca.grade.secondary).lerp(_cb.set(cb.grade.secondary), blend);

  return _grade;
}

/**
 * Per-scene visibility weight. Returns 1 while a chapter's environment is the
 * subject, tapering to 0 as the camera leaves — used to skip rendering and to
 * fade materials. Scenes overlap deliberately: transitions are dissolves.
 */
export function sceneWeight(t: number, chapter: number): number {
  const c = CHAPTERS[chapter];
  const fadeIn = (c.end - c.start) * 0.55;
  const fadeOut = (c.end - c.start) * 0.55;
  const a = smoothstep(c.start - fadeIn, c.start + fadeIn * 0.35, t);
  const b = 1 - smoothstep(c.end - fadeOut * 0.35, c.end + fadeOut, t);
  return clamp(a * b);
}

/** True when a scene is close enough to be worth having in the graph at all. */
export function sceneActive(t: number, chapter: number, threshold = 0.004): boolean {
  return sceneWeight(t, chapter) > threshold;
}
