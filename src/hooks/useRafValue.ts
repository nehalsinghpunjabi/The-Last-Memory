'use client';

import { useEffect, useRef, useState } from 'react';
import { scrollState, type ScrollState } from '@/lib/scrollState';

/**
 * Bridge from the 60fps mutable scroll state into React, without re-rendering
 * 60 times a second.
 *
 * A selector derives a value from `scrollState`; the component only re-renders
 * when that value changes by more than `epsilon` (or, for non-numeric values,
 * when it changes at all). Narration, HUD readouts and chapter cards all ride
 * on this — each updates a handful of times per second at most.
 */
export function useRafValue<T>(
  selector: (s: ScrollState) => T,
  epsilon = 0.004,
  equals?: (a: T, b: T) => boolean
): T {
  const [value, setValue] = useState<T>(() => selector(scrollState));
  const ref = useRef(value);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Both callbacks are held in refs and kept out of the effect's dependencies.
  // Callers pass these inline, so their identity changes on every render — as a
  // dependency, `equals` tore down and rebuilt the animation-frame loop each
  // time the component rendered, which is exactly the churn this hook exists to
  // avoid. The loop is now started once and reads the latest callbacks.
  const equalsRef = useRef(equals);
  equalsRef.current = equals;

  useEffect(() => {
    let raf = 0;
    const same = (a: T, b: T) => {
      const eq = equalsRef.current;
      if (eq) return eq(a, b);
      if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < epsilon;
      return Object.is(a, b);
    };

    const loop = () => {
      const next = selectorRef.current(scrollState);
      if (!same(ref.current, next)) {
        ref.current = next;
        setValue(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [epsilon]);

  return value;
}

/** Runs a callback every frame with the live scroll state. No re-renders. */
export function useRafEffect(fn: (s: ScrollState) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      fnRef.current(scrollState);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
