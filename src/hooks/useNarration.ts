'use client';

import { useMemo } from 'react';
import { CHAPTERS, chapterIndexAt, chapterProgressAt, type NarrationLine } from '@/lib/chapters';
import { useRafValue } from './useRafValue';
import { clamp, smoothstep } from '@/utils/math';

export interface ActiveNarration {
  line: NarrationLine | null;
  /** 0..1 in / hold / out envelope for the current line. */
  opacity: number;
  /** Stable key so React can animate line changes. */
  key: string;
  chapter: number;
}

/**
 * Resolves which narration line is on screen, and how present it is.
 *
 * Lines have their own in/out envelope inside the chapter, with a fixed
 * fade-in and fade-out proportion. Because it is scroll-derived, stopping mid
 * line holds that line on screen indefinitely — the audience controls the
 * pacing of the monologue, which is the entire point of a scroll-driven film.
 */
export function useNarration(): ActiveNarration {
  const state = useRafValue(
    (s) => {
      const t = s.eased;
      const ci = chapterIndexAt(t);
      const local = chapterProgressAt(t, ci);
      const chapter = CHAPTERS[ci];

      let found: NarrationLine | null = null;
      let index = -1;
      for (let i = 0; i < chapter.narration.length; i++) {
        const l = chapter.narration[i];
        if (local >= l.in && local <= l.out) {
          found = l;
          index = i;
          break;
        }
      }

      if (!found) return { ci, index: -1, opacity: 0 };

      const span = Math.max(found.out - found.in, 1e-5);
      const u = clamp((local - found.in) / span);
      // 18% fade in, 22% fade out, full presence in between.
      const opacity = smoothstep(0, 0.18, u) * (1 - smoothstep(0.78, 1, u));

      return { ci, index, opacity };
    },
    0.02,
    (a, b) => a.ci === b.ci && a.index === b.index && Math.abs(a.opacity - b.opacity) < 0.02
  );

  return useMemo(() => {
    const chapter = CHAPTERS[state.ci];
    const line = state.index >= 0 ? chapter.narration[state.index] : null;
    return {
      line,
      opacity: state.opacity,
      key: `${state.ci}-${state.index}`,
      chapter: state.ci,
    };
  }, [state]);
}
