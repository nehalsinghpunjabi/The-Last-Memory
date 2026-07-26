'use client';

import { useEffect, useRef } from 'react';
import {
  initScrollController,
  lockScroll,
  type ScrollController,
} from '@/animations/scrollController';
import { useExperience } from '@/lib/store';
import { useArchive } from '@/lib/archiveStore';
import { resetScrollState, scrollState } from '@/lib/scrollState';

/**
 * Owns the lifetime of the scroll controller and ties it to the experience
 * phase: scrolling is locked until the audience presses BEGIN, and the ending
 * is latched so the final card cannot flicker.
 *
 * It also owns the overlay scroll lock. When a milestone card or the timeline
 * explorer is open the film must hold still underneath it — otherwise a wheel
 * gesture meant for the card's own content scrolls the camera through the
 * chapter behind it. Both conditions resolve to a single lock decision so the
 * two can never fight over the same DOM styles.
 */
export function useScrollExperience() {
  const ref = useRef<ScrollController | null>(null);
  const phase = useExperience((s) => s.phase);
  const reducedMotion = useExperience((s) => s.device.reducedMotion);
  const setChapter = useExperience((s) => s.setChapter);
  const setEnded = useExperience((s) => s.setEnded);
  // Only changes when an overlay opens or closes — never per frame.
  const overlayOpen = useArchive((s) => s.milestoneId !== null || s.explorerOpen);

  useEffect(() => {
    resetScrollState();
    lockScroll(true);

    const controller = initScrollController({
      reducedMotion,
      onChapterChange: setChapter,
      onComplete: () => setEnded(true),
    });
    ref.current = controller;

    return () => {
      controller.destroy();
      ref.current = null;
      lockScroll(false);
    };
  }, [reducedMotion, setChapter, setEnded]);

  useEffect(() => {
    const playing = phase === 'playing';
    const locked = !playing || overlayOpen;

    lockScroll(locked);
    // "Started" means the audience has committed to the experience; opening an
    // overlay pauses the transport but does not un-start the film.
    scrollState.started = playing;

    // Stop the transport itself, not just the document overflow.
    const lenis = ref.current?.lenis;
    if (lenis) {
      if (locked) lenis.stop();
      else lenis.start();
    }

    if (!locked) {
      // Nudge ScrollTrigger after the layout unlocks.
      requestAnimationFrame(() => ref.current?.lenis.resize());
    }
  }, [phase, overlayOpen]);

  return ref;
}
