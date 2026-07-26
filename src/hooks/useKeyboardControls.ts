'use client';

import { useEffect } from 'react';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { useExperience } from '@/lib/store';
import { useArchive } from '@/lib/archiveStore';

/**
 * Keyboard transport.
 *
 * Scroll is the medium, but an experience that can *only* be driven by a wheel
 * excludes anyone navigating by keyboard — and it also makes the film
 * impossible to review without a mouse. Arrow keys nudge the playhead,
 * page keys jump a chapter, Home/End go to the ends.
 *
 * Everything routes through the same native scroll position the wheel drives,
 * so Lenis smooths it identically and there is no second source of truth.
 */
export function useKeyboardControls(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const scrollToProgress = (p: number, smooth = true) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: max * Math.min(1, Math.max(0, p)),
        behavior: smooth ? 'smooth' : 'auto',
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const current = scrollState.raw;
      const chapterIndex = CHAPTERS.findIndex((c) => current >= c.start && current < c.end);

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          scrollToProgress(current + 0.012);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          scrollToProgress(current - 0.012);
          break;
        case 'PageDown': {
          e.preventDefault();
          const next = CHAPTERS[Math.min(chapterIndex + 1, CHAPTERS.length - 1)];
          scrollToProgress(next.start + 0.004);
          break;
        }
        case 'PageUp': {
          e.preventDefault();
          const prev = CHAPTERS[Math.max(chapterIndex - 1, 0)];
          scrollToProgress(prev.start + 0.004);
          break;
        }
        case 'Home':
          e.preventDefault();
          scrollToProgress(0);
          break;
        case 'End':
          e.preventDefault();
          scrollToProgress(1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/**
 * Convenience wrapper that enables the transport only during playback, and only
 * while no archive overlay is open.
 *
 * The overlay scroll lock (`overflow: hidden` plus a stopped Lenis) blocks wheel
 * and touch, but per spec `overflow: hidden` still permits *programmatic*
 * scrolling — and this transport scrolls with `window.scrollTo`. Without this
 * gate, arrow/Page/Home/End keys pressed while reading a milestone card or
 * navigating the timeline would scrub the film behind the overlay.
 */
export function useTransportControls() {
  const phase = useExperience((s) => s.phase);
  const overlayOpen = useArchive((s) => s.milestoneId !== null || s.explorerOpen);
  useKeyboardControls(phase === 'playing' && !overlayOpen);
}
