/**
 * Seeded PRNG. Every procedural asset in the experience is generated from a
 * fixed seed so the film is identical on every playthrough — a memory should
 * not change shape when you look at it twice.
 */

export type Rng = () => number;

/** mulberry32 — fast, good enough distribution, 32-bit state. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

export const intRange = (rng: Rng, min: number, max: number) =>
  Math.floor(min + rng() * (max - min + 1));

export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

/** Gaussian via Box–Muller, clamped to ±3σ. */
export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + Math.max(-3, Math.min(3, n)) * sd;
}

/** Uniform point on a sphere of given radius. */
export function onSphere(rng: Rng, radius: number): [number, number, number] {
  const u = rng() * 2 - 1;
  const theta = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [radius * r * Math.cos(theta), radius * u, radius * r * Math.sin(theta)];
}

/** Uniform point inside a sphere (denser shells avoided). */
export function inSphere(rng: Rng, radius: number): [number, number, number] {
  const [x, y, z] = onSphere(rng, 1);
  const r = radius * Math.cbrt(rng());
  return [x * r, y * r, z * r];
}
