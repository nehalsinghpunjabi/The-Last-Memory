/** Small, allocation-free math helpers used every frame. */

export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, v: number) =>
  Math.abs(b - a) < 1e-9 ? 0 : (v - a) / (b - a);

export const remap = (v: number, a1: number, b1: number, a2: number, b2: number) =>
  lerp(a2, b2, clamp(inverseLerp(a1, b1, v)));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp(inverseLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
};

export const smootherstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp(inverseLerp(edge0, edge1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Rises 0→1 then falls 1→0 across [a,b] — the shape of a memory surfacing. */
export const pulse = (a: number, b: number, x: number) => {
  const t = clamp(inverseLerp(a, b, x));
  return Math.sin(t * Math.PI);
};

/** Framerate-independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const TAU = Math.PI * 2;

export const degToRad = (d: number) => (d * Math.PI) / 180;

/** Deterministic 1D value noise — smooth, cheap, no allocations. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

export function hash1(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/** Layered value noise — used for handheld camera drift. */
export function fbm1(x: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise1(x * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
