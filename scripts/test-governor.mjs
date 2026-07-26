/**
 * Deterministic test of the adaptive performance governor.
 *
 * Software rendering never exceeds a few frames per second, so the headless
 * harness can only ever exercise the downshift path. This drives the pure
 * decision function with synthetic framerate sequences to verify the whole
 * state machine — including recovery, which real hardware would reach but the
 * test environment cannot produce.
 *
 *   node scripts/test-governor.mjs
 */
// Imported straight from the shipped TypeScript source (Node strips the types),
// so this tests the exact logic that runs in the browser rather than a copy
// that could silently drift from it.
const { governorStep } = await import('../src/lib/governorStep.ts');

const HIGH = { minDpr: 1, maxDpr: 1.5, panicFloor: 0.75, isLowTier: false };
const LOW = { minDpr: 0.75, maxDpr: 1, panicFloor: 0.5, isLowTier: true };

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const run = (fpsSeq, limits, start) => {
  let s = { dpr: start ?? limits.maxDpr, perfMode: limits.isLowTier, slowStreak: 0, fastStreak: 0 };
  const trace = [];
  for (const fps of fpsSeq) {
    const d = governorStep(fps, s, limits);
    s = { dpr: d.dpr, perfMode: d.perfMode, slowStreak: d.slowStreak, fastStreak: d.fastStreak };
    trace.push({ fps, ...d });
  }
  return { final: s, trace };
};

console.log('\nGovernor state machine\n');

// 1. Sustained low framerate walks DPR to the floor and latches perfMode.
{
  const { final } = run(Array(14).fill(22), HIGH);
  check('sustained 22fps drops DPR to the panic floor', Math.abs(final.dpr - 0.75) < 0.001,
    `dpr=${final.dpr.toFixed(2)}`);
  check('sustained 22fps latches performance mode', final.perfMode === true);
}

// 2. A healthy 60fps from the start never degrades quality.
{
  const { final } = run(Array(14).fill(60), HIGH);
  check('sustained 60fps holds max DPR', Math.abs(final.dpr - 1.5) < 0.001, `dpr=${final.dpr.toFixed(2)}`);
  check('sustained 60fps never enters performance mode', final.perfMode === false);
}

// 3. Recovery: struggle, then the GPU frees up — quality must come back.
{
  const seq = [...Array(14).fill(22), ...Array(40).fill(61)];
  const { final, trace } = run(seq, HIGH);
  check('recovers out of performance mode when fps returns', final.perfMode === false);
  check('recovers DPR back to maximum', Math.abs(final.dpr - 1.5) < 0.001, `dpr=${final.dpr.toFixed(2)}`);
  const latched = trace.some((t) => t.perfMode === true);
  check('performance mode did actually latch before recovering', latched);
}

// 4. Hysteresis: a single fast sample must not release the latch.
{
  const seq = [...Array(14).fill(22), 61, 22, 61, 22];
  const { final } = run(seq, HIGH);
  check('one-off fast frames do not release the latch', final.perfMode === true);
}

// 5. Low-tier hardware stays in performance mode permanently.
{
  const { final } = run(Array(40).fill(61), LOW);
  check('low tier never leaves performance mode', final.perfMode === true);
}

// 6. DPR is always inside the configured envelope.
{
  const seq = [22, 61, 10, 60, 45, 70, 20, 62, 59, 12, 61, 61, 61];
  const { trace } = run(seq, HIGH);
  const outOfRange = trace.filter((t) => t.dpr < HIGH.panicFloor - 1e-6 || t.dpr > HIGH.maxDpr + 1e-6);
  check('DPR never leaves [0.75, 1.5]', outOfRange.length === 0,
    outOfRange.map((t) => t.dpr.toFixed(2)).join(','));
}

console.log(`\n${failures === 0 ? 'RESULT: PASS — all governor checks passed' : `RESULT: FAIL — ${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
