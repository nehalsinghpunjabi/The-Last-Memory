'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { DeviceProfile } from '@/utils/device';
import { quality } from '@/lib/quality';
import { governorStep } from '@/lib/governorStep';

interface Props {
  device: DeviceProfile;
}

/**
 * Adaptive resolution + automatic performance mode.
 *
 * Measures a rolling average frame time and walks the device pixel ratio down
 * (and back up) to hold ~60fps. It is hysteretic — a governor that oscillates
 * is more distracting than a slightly soft frame — but it reacts fast to a
 * *sustained* drop so the heaviest scene (the Golden Age) never sits in a slow
 * state for long.
 *
 * When it has dropped to the pixel-ratio floor and the framerate is still under
 * target, it latches `perfMode`: the GPU is fragment-bound past what resolution
 * can fix, and PostFX responds by shedding its most expensive passes. Low-tier
 * devices start in perfMode from the first frame.
 */
export function PerformanceGovernor({ device }: Props) {
  const setDpr = useThree((s) => s.setDpr);
  const [minDpr, maxDpr] = device.dpr;
  // On a genuinely fragment-bound GPU, allow one step below the device floor as
  // a last resort — a slightly soft frame beats a stuttering one.
  const panicFloor = Math.max(0.5, minDpr - 0.25);

  const current = useRef(maxDpr);
  const accum = useRef(0);
  const frames = useRef(0);
  const cooldown = useRef(2.5);
  const slowStreak = useRef(0);
  const fastStreak = useRef(0);

  // Low-tier hardware opts into performance mode immediately.
  useEffect(() => {
    quality.perfMode = device.tier === 'low';
    quality.dpr = maxDpr;
    quality.struggling = false;
    return () => {
      quality.perfMode = false;
      quality.struggling = false;
    };
  }, [device.tier, maxDpr]);

  useFrame((_, delta) => {
    // Ignore the first couple of seconds: shader compilation dominates and
    // would trigger a spurious downshift.
    if (cooldown.current > 0) {
      cooldown.current -= delta;
      return;
    }

    accum.current += Math.min(delta, 0.25);
    frames.current += 1;

    // Sample every ~30 frames OR ~0.5s of wall-clock, whichever comes first.
    // The time bound matters on weak hardware: at 4fps a pure 30-frame window
    // would take seven seconds to react, leaving the GPU thrashing; the 0.5s
    // bound lets the governor drop the resolution almost immediately instead.
    if (frames.current < 30 && accum.current < 0.5) return;

    const avg = accum.current / frames.current;
    accum.current = 0;
    frames.current = 0;

    const fps = 1 / avg;
    quality.fps = fps;

    // The decision itself lives in lib/governorStep as a pure function so it can
    // be unit-tested with synthetic framerates — the recovery path in particular
    // is unreachable under software rendering.
    const d = governorStep(
      fps,
      {
        dpr: current.current,
        perfMode: quality.perfMode,
        slowStreak: slowStreak.current,
        fastStreak: fastStreak.current,
      },
      { minDpr, maxDpr, panicFloor, isLowTier: device.tier === 'low' }
    );

    slowStreak.current = d.slowStreak;
    fastStreak.current = d.fastStreak;
    quality.perfMode = d.perfMode;
    quality.struggling = d.struggling;

    if (d.changed) {
      current.current = d.dpr;
      quality.dpr = d.dpr;
      setDpr(d.dpr);
      // Give the new resolution time to settle before judging it.
      cooldown.current = 1.2;
    }
  });

  return null;
}
