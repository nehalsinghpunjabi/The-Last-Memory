import * as THREE from 'three';
import { clamp, fbm1, lerp, smootherstep } from '@/utils/math';
import { HANDHELD } from './constants';

/**
 * The camera rail.
 *
 * The whole film is one continuous descent: each chapter owns a horizontal
 * "stratum" of world space 600 units below the last, and the camera falls
 * through them without a single cut. Keyframes are authored in *local* chapter
 * space and baked to world space at module load.
 *
 * Interpolation is Catmull-Rom (C1 continuous) so the dolly never kinks, with a
 * smootherstep applied to the parameter for cinematic ease in/out between
 * marks. On top of that sits low-frequency fbm noise — the hands of a real
 * operator holding a heavy camera.
 */

const STRATUM = 600;

/** World-space Y origin of each chapter's environment. */
export const CHAPTER_ORIGIN_Y = [
  0, // prologue
  -STRATUM * 1, // genesis
  -STRATUM * 2, // humanity
  -STRATUM * 3, // golden age
  -STRATUM * 4, // fall
  -STRATUM * 5, // solitude
  -STRATUM * 6, // last memory
  -STRATUM * 6, // reveal — shares the stratum: the crystal encloses the photograph
];

export const originOf = (chapter: number) =>
  CHAPTER_ORIGIN_Y[Math.min(chapter, CHAPTER_ORIGIN_Y.length - 1)];

export interface RailKey {
  /** Global timeline position 0..1. */
  p: number;
  /** Chapter whose local space pos/look are expressed in. */
  ch: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  /** Dutch angle in radians. */
  roll?: number;
  /** Multiplier on handheld noise — rises during the collapse. */
  shake?: number;
}

/* ------------------------------------------------------------------ *
 * The shot list.
 * ------------------------------------------------------------------ */
export const RAIL: RailKey[] = [
  // — PROLOGUE: a slow, patient push toward a dying light in absolute dark.
  { p: 0.0, ch: 0, pos: [0, 1.2, 62], look: [0, 0, 0], fov: 46, shake: 0.2 },
  { p: 0.04, ch: 0, pos: [1.4, 0.9, 38], look: [0, 0, 0], fov: 42, shake: 0.25 },
  { p: 0.085, ch: 0, pos: [0.6, 0.3, 15], look: [0, 0, 0], fov: 36, shake: 0.3 },

  // — I. GENESIS: the camera enters the neural lattice and flies through it.
  { p: 0.115, ch: 1, pos: [0.2, 0.6, 26], look: [0, 0, -6], fov: 34, shake: 0.35 },
  { p: 0.155, ch: 1, pos: [7.5, 4.5, 2], look: [-2, 0, -22], fov: 40, roll: 0.05, shake: 0.5 },
  { p: 0.195, ch: 1, pos: [-6, -3.2, -20], look: [4, 2, -46], fov: 44, roll: -0.07, shake: 0.6 },
  { p: 0.235, ch: 1, pos: [3, 5, -44], look: [0, 0, -70], fov: 38, roll: 0.03, shake: 0.4 },

  // — II. HUMANITY: a lateral drift through a hall of suspended photographs.
  { p: 0.265, ch: 2, pos: [26, 4, 44], look: [0, 0, 0], fov: 36, shake: 0.35 },
  { p: 0.305, ch: 2, pos: [9, 1.5, 16], look: [-6, 0, -12], fov: 32, roll: 0.02, shake: 0.4 },
  { p: 0.35, ch: 2, pos: [-10, -2, -4], look: [2, 1, -30], fov: 34, roll: -0.03, shake: 0.45 },
  { p: 0.4, ch: 2, pos: [-22, 8, -40], look: [0, 0, -74], fov: 40, shake: 0.35 },

  // — III. GOLDEN AGE: the crane shot. High, wide, warm, alive.
  //
  // Every mark here stays *above the skyline*. The city's tallest structures
  // reach ~460 units, and the temptation to fly between the towers turns the
  // most expensive scene in the film into a texture wall — no horizon, no sky,
  // no sense of how big any of it is. The scale is the point, so the camera
  // behaves like a helicopter, not a drone in a canyon.
  // Establishing hero shot: high and back, aimed slightly UP toward the
  // landmark cluster so the skyline sits against open warm sky — the frame that
  // has to say "megacity" on its own.
  { p: 0.425, ch: 3, pos: [40, 300, 900], look: [0, 210, -320], fov: 34, shake: 0.22 },
  { p: 0.465, ch: 3, pos: [210, 250, 540], look: [-40, 160, -180], fov: 34, roll: 0.04, shake: 0.35 },
  { p: 0.505, ch: 3, pos: [90, 165, 260], look: [-70, 150, -220], fov: 42, roll: -0.05, shake: 0.5 },
  { p: 0.545, ch: 3, pos: [-150, 270, -60], look: [0, 190, -430], fov: 32, roll: 0.06, shake: 0.35 },
  { p: 0.575, ch: 3, pos: [-70, 460, -380], look: [0, 260, -760], fov: 28, shake: 0.25 },

  // — IV. THE FALL: the camera loses its footing.
  { p: 0.6, ch: 4, pos: [0, 22, 120], look: [0, 6, 0], fov: 40, roll: 0.02, shake: 1.1 },
  { p: 0.635, ch: 4, pos: [-34, -4, 44], look: [10, 10, -20], fov: 52, roll: -0.14, shake: 1.9 },
  { p: 0.675, ch: 4, pos: [18, 12, -6], look: [-14, -6, -50], fov: 46, roll: 0.17, shake: 2.4 },
  { p: 0.715, ch: 4, pos: [-6, 2, -56], look: [0, 0, -110], fov: 38, roll: -0.04, shake: 1.4 },

  // — V. SOLITUDE: almost no motion at all. Let the audience sit in it.
  { p: 0.745, ch: 5, pos: [0, 1, 74], look: [0, 0, 0], fov: 34, shake: 0.14 },
  { p: 0.79, ch: 5, pos: [-3, -0.5, 52], look: [1, 0, -4], fov: 32, shake: 0.1 },
  { p: 0.835, ch: 5, pos: [1.5, 0.4, 34], look: [0, 0, -6], fov: 31, shake: 0.08 },

  // — VI. THE LAST MEMORY: one slow, unbroken approach that *arrives* at a
  //   composed frame holding the whole group in soft evening light — not a
  //   crop into it. The image rack-focuses from soft to sharp as we close in,
  //   then the camera settles and barely breathes through the "Humanity." beat.
  { p: 0.865, ch: 6, pos: [0.9, 0.7, 22], look: [0, 0, -3], fov: 31, shake: 0.16 },
  { p: 0.905, ch: 6, pos: [0.35, 0.3, 13.5], look: [0, 0, -3], fov: 30, shake: 0.1 },
  { p: 0.93, ch: 6, pos: [0.08, 0.14, 8.4], look: [0, 0, -3], fov: 30, shake: 0.04 },
  // Arrival / hold: the "Humanity." line lands here (chapter-local 0.9–1.0).
  { p: 0.945, ch: 6, pos: [0.03, 0.12, 8.1], look: [0, 0, -3], fov: 30, shake: 0.025 },

  // — VII. REVEAL: hold the stillness a moment longer, in silence — then the
  //   unbroken pull-back. Everything you have seen fits in your hand.
  { p: 0.957, ch: 7, pos: [0, 0.12, 8.3], look: [0, 0, -3], fov: 30, shake: 0.025 },
  { p: 0.97, ch: 7, pos: [0, 0.5, 32], look: [0, 0, -3], fov: 32, shake: 0.08 },
  { p: 0.985, ch: 7, pos: [0, 3, 220], look: [0, 0, -3], fov: 36, shake: 0.1 },
  { p: 1.0, ch: 7, pos: [0, 9, 900], look: [0, 0, -3], fov: 42, shake: 0.06 },
];

/* ------------------------------------------------------------------ *
 * Baking + sampling
 * ------------------------------------------------------------------ */

interface BakedKey {
  p: number;
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  roll: number;
  shake: number;
}

const BAKED: BakedKey[] = RAIL.map((k) => {
  const y = originOf(k.ch);
  return {
    p: k.p,
    pos: new THREE.Vector3(k.pos[0], k.pos[1] + y, k.pos[2]),
    look: new THREE.Vector3(k.look[0], k.look[1] + y, k.look[2]),
    fov: k.fov,
    roll: k.roll ?? 0,
    shake: k.shake ?? 0.3,
  };
}).sort((a, b) => a.p - b.p);

const at = (i: number) => BAKED[Math.max(0, Math.min(BAKED.length - 1, i))];

/** Catmull-Rom on a single component. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export interface RailSample {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  roll: number;
  shake: number;
}

const _sample: RailSample = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 38,
  roll: 0,
  shake: 0.3,
};

/**
 * Sample the rail at global progress `p`, writing into a shared object.
 * Never allocates — safe to call every frame.
 */
export function sampleRail(p: number): RailSample {
  const t = clamp(p);

  // Locate the segment.
  let i = 0;
  while (i < BAKED.length - 2 && BAKED[i + 1].p <= t) i++;

  const k1 = at(i);
  const k2 = at(i + 1);
  const k0 = at(i - 1);
  const k3 = at(i + 2);

  const span = Math.max(k2.p - k1.p, 1e-6);
  const raw = clamp((t - k1.p) / span);
  // Ease the parameter, not the value: the path stays smooth, the *pacing*
  // becomes cinematic — a camera settling into and out of every mark.
  const u = smootherstep(0, 1, raw);

  _sample.position.set(
    cr(k0.pos.x, k1.pos.x, k2.pos.x, k3.pos.x, u),
    cr(k0.pos.y, k1.pos.y, k2.pos.y, k3.pos.y, u),
    cr(k0.pos.z, k1.pos.z, k2.pos.z, k3.pos.z, u)
  );
  _sample.target.set(
    cr(k0.look.x, k1.look.x, k2.look.x, k3.look.x, u),
    cr(k0.look.y, k1.look.y, k2.look.y, k3.look.y, u),
    cr(k0.look.z, k1.look.z, k2.look.z, k3.look.z, u)
  );
  _sample.fov = lerp(k1.fov, k2.fov, u);
  _sample.roll = lerp(k1.roll, k2.roll, u);
  _sample.shake = lerp(k1.shake, k2.shake, u);

  return _sample;
}

/**
 * Handheld operator noise. Deterministic in time, so pausing scroll does not
 * freeze the camera — the world keeps breathing.
 */
export function applyHandheld(
  sample: RailSample,
  time: number,
  intensity: number,
  distanceScale = 1
): void {
  const f = HANDHELD.frequency;
  const a = HANDHELD.amplitude * intensity * distanceScale;
  sample.position.x += fbm1(time * f) * a;
  sample.position.y += fbm1(time * f + 31.7) * a * 0.8;
  sample.position.z += fbm1(time * f + 71.3) * a * 0.5;
  sample.target.x += fbm1(time * f * 0.7 + 11.1) * a * 0.4;
  sample.target.y += fbm1(time * f * 0.7 + 53.9) * a * 0.4;
  sample.roll += fbm1(time * f * 0.5 + 17.3) * HANDHELD.rollAmplitude * intensity;
}
