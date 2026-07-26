#!/usr/bin/env node
/**
 * Offline texture baker (optional).
 *
 * The memory photographs in THE LAST MEMORY are painted in the browser at
 * runtime (src/assets/memoryTextures.ts) — that is the shipping path, it needs
 * no assets, and it keeps every image deterministic per seed.
 *
 * This script bakes the *same* images to PNG files on disk for the cases where
 * that is useful:
 *
 *   · you want to art-direct the memories by hand in Photoshop/Affinity
 *   · you want to swap in real photography with the same framing
 *   · you are targeting very low-end mobile and would rather pay a download
 *     than ~40ms of canvas painting on first mount
 *
 *   npm i -D canvas          # one-off, not a runtime dependency
 *   node scripts/generate-textures.mjs
 *
 * Output: public/textures/memory-<kind>-<seed>.png
 *
 * To use the baked files instead of the runtime painter, replace the body of
 * getMemoryTexture() with a THREE.TextureLoader().load() against these paths.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'textures');

let createCanvas;
try {
  ({ createCanvas } = await import('canvas'));
} catch {
  console.error('This script needs the optional "canvas" package:\n');
  console.error('  npm i -D canvas\n');
  console.error('The experience does NOT require it — textures are painted at runtime.');
  process.exit(1);
}

const KINDS = ['family', 'nature', 'city', 'friendship', 'celebration', 'ocean', 'window'];
const SIZE = 512;
const PER_KIND = 4;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (rng, a, b) => a + rng() * (b - a);

const PALETTES = {
  family: ['#f7d9b0', '#e8a76b', '#8d5a3b', '#3a2418'],
  nature: ['#cfe3c0', '#7ba86a', '#3f5f3d', '#1d2a1c'],
  city: ['#ffd9a0', '#c98a55', '#4a4f63', '#171a24'],
  friendship: ['#ffe0c0', '#e58f6a', '#7a4a52', '#2a1a20'],
  celebration: ['#fff0c8', '#ffb45a', '#c85a7a', '#241428'],
  ocean: ['#d9ecff', '#6fa9d8', '#2f5f8a', '#101f2e'],
  window: ['#ffeacb', '#e0b184', '#6d5a4a', '#241c16'],
};

function figure(ctx, x, baseY, height, color, rng) {
  const headR = height * 0.115;
  const bodyW = height * 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, baseY - height + headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.5, baseY);
  ctx.quadraticCurveTo(x - bodyW * 0.62, baseY - height * 0.55, x - bodyW * 0.34, baseY - height * 0.78);
  ctx.quadraticCurveTo(x, baseY - height * 0.86, x + bodyW * 0.34, baseY - height * 0.78);
  ctx.quadraticCurveTo(x + bodyW * 0.62, baseY - height * 0.55, x + bodyW * 0.5, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = height * 0.055;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + dir * bodyW * 0.4, baseY - height * 0.68);
    ctx.quadraticCurveTo(x + dir * bodyW * 0.95, baseY - height * 0.45, x + dir * bodyW * 0.85, baseY - height * 0.2);
    ctx.stroke();
  }
}

function paint(kind, seed) {
  const rng = makeRng(seed);
  const w = SIZE;
  const h = Math.round(SIZE * 0.72);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const palette = PALETTES[kind];

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, palette[3]);
  g.addColorStop(0.42, palette[2]);
  g.addColorStop(0.78, palette[1]);
  g.addColorStop(1, palette[0]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const sx = range(rng, w * 0.2, w * 0.8);
  const sy = range(rng, h * 0.45, h * 0.72);
  const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, range(rng, w * 0.18, w * 0.42));
  s.addColorStop(0, 'rgba(255,246,225,0.95)');
  s.addColorStop(0.25, 'rgba(255,214,160,0.55)');
  s.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);

  const ground = h * range(rng, 0.72, 0.86);
  const gg = ctx.createLinearGradient(0, ground - h * 0.1, 0, h);
  gg.addColorStop(0, palette[2]);
  gg.addColorStop(1, palette[3]);
  ctx.fillStyle = gg;
  ctx.fillRect(0, ground, w, h - ground);

  const n = 2 + Math.floor(rng() * 4);
  const spacing = w / (n + 1);
  for (let i = 0; i < n; i++) {
    figure(ctx, spacing * (i + 1) + range(rng, -8, 8), ground + h * 0.05, h * range(rng, 0.18, 0.34), 'rgba(28,18,12,0.88)', rng);
  }

  // Vignette + grain.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, w * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const nz = (rng() - 0.5) * 22;
    d[i] = Math.max(0, Math.min(255, d[i] + nz));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + nz));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + nz));
  }
  ctx.putImageData(img, 0, 0);

  return canvas;
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const kind of KINDS) {
  for (let i = 0; i < PER_KIND; i++) {
    const seed = 1000 + i * 37;
    const canvas = paint(kind, seed);
    writeFileSync(join(OUT_DIR, `memory-${kind}-${seed}.png`), canvas.toBuffer('image/png'));
    count++;
  }
}

console.log(`Baked ${count} memory textures to public/textures/.`);
console.log('The runtime painter in src/assets/memoryTextures.ts remains the default path.');
