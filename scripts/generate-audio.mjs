#!/usr/bin/env node
/**
 * Offline audio placeholder generator.
 *
 * THE LAST MEMORY does not need these files — the entire score is synthesised
 * in the browser at runtime by src/audio/engine.ts, which is why the repository
 * ships with no audio assets at all.
 *
 * This script exists for the case where you want to *replace* the generative
 * score with recorded stems: it writes correctly-named, correctly-lengthed
 * 16-bit WAV files into public/audio so you can drop real recordings over them
 * one at a time without touching any code.
 *
 *   node scripts/generate-audio.mjs
 *
 * The generated content is a rough approximation of each bed (a filtered drone,
 * a sparse piano figure, noise textures) — enough to check levels and timing.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'audio');

const SAMPLE_RATE = 44100;

/** Matches the chapter beds in src/lib/chapters.ts. */
const BEDS = [
  { name: 'prologue', root: 41.2, seconds: 30, bright: 0.15, noise: 0.16, piano: 0 },
  { name: 'genesis', root: 55.0, seconds: 40, bright: 0.35, noise: 0.05, piano: 0.22 },
  { name: 'humanity', root: 61.7, seconds: 40, bright: 0.5, noise: 0.09, piano: 0.36 },
  { name: 'golden-age', root: 65.4, seconds: 45, bright: 0.85, noise: 0.03, piano: 0.52 },
  { name: 'fall', root: 48.9, seconds: 35, bright: 0.3, noise: 0.42, piano: 0.14 },
  { name: 'solitude', root: 36.7, seconds: 45, bright: 0.1, noise: 0.02, piano: 0.06 },
  { name: 'last-memory', root: 55.0, seconds: 40, bright: 0.7, noise: 0.01, piano: 0.6 },
  { name: 'reveal', root: 32.7, seconds: 30, bright: 0.2, noise: 0.0, piano: 0.1 },
];

const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Deterministic PRNG so regenerating produces identical files. */
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

function renderBed(bed, seed) {
  const n = Math.floor(SAMPLE_RATE * bed.seconds);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rng = makeRng(seed);

  // --- drone: four partials, slowly detuning ------------------------------
  const partials = [
    [1, 0.55],
    [1.5, 0.18],
    [4.01, 0.06],
    [0.5, 0.3],
  ];
  for (const [ratio, gain] of partials) {
    const f = bed.root * ratio;
    const drift = (rng() - 0.5) * 0.04;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const phase = 2 * Math.PI * (f + drift * Math.sin(t * 0.03)) * t;
      const lfo = 0.85 + 0.15 * Math.sin(t * 0.28 + ratio);
      const v = Math.sin(phase) * gain * 0.3 * lfo;
      left[i] += v;
      right[i] += v * 0.97;
    }
  }

  // --- piano: sparse FM plucks --------------------------------------------
  if (bed.piano > 0.02) {
    let at = 1.5;
    while (at < bed.seconds - 6) {
      const degree = AEOLIAN[Math.floor(rng() * AEOLIAN.length)];
      const octave = rng() < 0.3 ? 12 : rng() < 0.5 ? 0 : -12;
      const freq = midiToFreq(58 + degree + octave);
      const vel = (0.18 + rng() * 0.3) * bed.piano;
      const dur = 3.5 + rng() * 3;
      const start = Math.floor(at * SAMPLE_RATE);
      const len = Math.min(n - start, Math.floor(dur * SAMPLE_RATE));
      const pan = rng() * 0.5 + 0.25;

      for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * 1.1) * (1 - Math.exp(-t * 220));
        const modIndex = freq * 1.4 * Math.exp(-t * 3.2);
        const v =
          Math.sin(2 * Math.PI * freq * t + modIndex * Math.sin(2 * Math.PI * freq * 2.004 * t)) *
          env *
          vel;
        left[start + i] += v * (1 - pan);
        right[start + i] += v * pan;
      }
      at += 0.9 + rng() * 2.4;
    }
  }

  // --- noise --------------------------------------------------------------
  if (bed.noise > 0.005) {
    let lpL = 0;
    let lpR = 0;
    for (let i = 0; i < n; i++) {
      const wl = rng() * 2 - 1;
      const wr = rng() * 2 - 1;
      lpL += (wl - lpL) * (0.02 + bed.bright * 0.3);
      lpR += (wr - lpR) * (0.02 + bed.bright * 0.3);
      left[i] += lpL * bed.noise * 0.5;
      right[i] += lpR * bed.noise * 0.5;
    }
  }

  // --- fades and limiting --------------------------------------------------
  const fade = Math.floor(SAMPLE_RATE * 2.5);
  for (let i = 0; i < n; i++) {
    let g = 1;
    if (i < fade) g = i / fade;
    if (i > n - fade) g = (n - i) / fade;
    left[i] = Math.tanh(left[i] * g * 0.9);
    right[i] = Math.tanh(right[i] * g * 0.9);
  }

  return { left, right, n };
}

function writeWav(path, left, right, n) {
  const bytesPerSample = 2;
  const channels = 2;
  const dataSize = n * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < n; i++) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), offset);
    offset += 2;
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), offset);
    offset += 2;
  }

  writeFileSync(path, buffer);
}

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
BEDS.forEach((bed, i) => {
  const { left, right, n } = renderBed(bed, 1000 + i * 77);
  const file = join(OUT_DIR, `${bed.name}.wav`);
  writeWav(file, left, right, n);
  const mb = (44 + n * 4) / 1024 / 1024;
  total += mb;
  console.log(`  ${bed.name.padEnd(14)} ${bed.seconds}s  ${mb.toFixed(1)} MB`);
});

console.log(`\nWrote ${BEDS.length} beds to public/audio (${total.toFixed(1)} MB).`);
console.log('Note: the runtime score is generative — these files are unused unless you wire');
console.log('them up in src/audio/engine.ts. See public/audio/README.md.');
