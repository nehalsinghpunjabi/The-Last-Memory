import * as THREE from 'three';
import { smootherstep } from '@/utils/math';
import { originOf } from './cameraRail';

/**
 * Where the AI core is at any moment.
 *
 * The core is the narrator's body. It is present in every chapter but is never
 * the subject of the Golden Age or the Last Memory — there it hangs high and
 * far, watching, which is exactly what it was doing at the time.
 */
interface CoreKey {
  p: number;
  ch: number;
  pos: [number, number, number];
  /** Radius multiplier — the core reads bigger when it is the subject. */
  scale: number;
}

const KEYS: CoreKey[] = [
  { p: 0.0, ch: 0, pos: [0, 0, 0], scale: 1 },
  { p: 0.085, ch: 0, pos: [0, 0, -2], scale: 1 },
  { p: 0.14, ch: 1, pos: [0, 0, -18], scale: 1.15 },
  { p: 0.235, ch: 1, pos: [0, 0, -64], scale: 1.1 },
  { p: 0.3, ch: 2, pos: [-2, 1, -20], scale: 0.85 },
  { p: 0.4, ch: 2, pos: [-6, 3, -66], scale: 0.8 },
  // High above the city — a second sun.
  { p: 0.47, ch: 3, pos: [-40, 300, -150], scale: 5.5 },
  { p: 0.575, ch: 3, pos: [0, 330, -520], scale: 5.0 },
  { p: 0.64, ch: 4, pos: [0, 8, -40], scale: 1.4 },
  { p: 0.715, ch: 4, pos: [0, 0, -100], scale: 1.2 },
  { p: 0.78, ch: 5, pos: [0, 0, -14], scale: 0.9 },
  { p: 0.835, ch: 5, pos: [0, -0.5, -12], scale: 0.8 },
  // Behind and above the final photograph, dim, patient.
  { p: 0.9, ch: 6, pos: [0, 2.4, -13], scale: 0.55 },
  { p: 0.945, ch: 6, pos: [0, 1.6, -11], scale: 0.5 },
  { p: 1.0, ch: 7, pos: [0, 0, -3], scale: 0.35 },
];

const BAKED = KEYS.map((k) => ({
  p: k.p,
  pos: new THREE.Vector3(k.pos[0], k.pos[1] + originOf(k.ch), k.pos[2]),
  scale: k.scale,
})).sort((a, b) => a.p - b.p);

const _pos = new THREE.Vector3();

export interface CoreSample {
  position: THREE.Vector3;
  scale: number;
}

const _sample: CoreSample = { position: _pos, scale: 1 };

export function sampleCoreAnchor(t: number): CoreSample {
  let i = 0;
  while (i < BAKED.length - 2 && BAKED[i + 1].p <= t) i++;
  const a = BAKED[i];
  const b = BAKED[Math.min(i + 1, BAKED.length - 1)];
  const u = smootherstep(a.p, b.p, t);
  _sample.position.lerpVectors(a.pos, b.pos, u);
  _sample.scale = a.scale + (b.scale - a.scale) * u;
  return _sample;
}
