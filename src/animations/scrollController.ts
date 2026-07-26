import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { chapterIndexAt } from '@/lib/chapters';
import { SMOOTH_SCROLL } from '@/lib/constants';
import { computeCorruption, computeExposure, computeIntegrity } from '@/lib/director';
import { scrollState } from '@/lib/scrollState';
import { damp } from '@/utils/math';

/**
 * The transport.
 *
 * Lenis provides inertial scrolling; GSAP's ticker drives Lenis (one rAF loop
 * for the entire app, not two); ScrollTrigger converts document scroll into
 * normalised progress; and the result is written into the plain `scrollState`
 * object that the render loop reads.
 *
 * Note what does *not* happen here: no React state is written per frame. The
 * only thing that reaches React is a chapter change, which happens eight times
 * in the entire experience.
 */

export interface ScrollControllerOptions {
  onChapterChange?: (chapter: number) => void;
  onComplete?: () => void;
  reducedMotion?: boolean;
}

export interface ScrollController {
  destroy: () => void;
  lenis: Lenis;
  scrollTo: (progress: number, opts?: { immediate?: boolean; duration?: number }) => void;
}

let registered = false;

export function initScrollController(options: ScrollControllerOptions = {}): ScrollController {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }

  const lenis = new Lenis({
    lerp: options.reducedMotion ? 0.2 : SMOOTH_SCROLL.lerp,
    wheelMultiplier: SMOOTH_SCROLL.wheelMultiplier,
    touchMultiplier: SMOOTH_SCROLL.touchMultiplier,
    smoothWheel: !options.reducedMotion,
    syncTouch: false,
    infinite: false,
  });

  // Lenis drives ScrollTrigger.
  lenis.on('scroll', ScrollTrigger.update);

  // A single rAF for scroll, easing and derived signals.
  const tick = (time: number) => {
    lenis.raf(time * 1000);

    const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 0.1);
    scrollState.dt = dt;
    scrollState.elapsed += dt;

    // The camera follows an eased copy of scroll. Two layers of smoothing
    // (Lenis, then this) is what makes a 3D dolly feel operated rather than
    // dragged.
    scrollState.eased = damp(scrollState.eased, scrollState.raw, 6.5, dt);

    scrollState.corruption = computeCorruption(
      scrollState.eased,
      scrollState.elapsed,
      scrollState.velocity
    );
    scrollState.exposure = computeExposure(scrollState.eased);
    scrollState.integrity = computeIntegrity(scrollState.eased);
  };

  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(220, 33);

  let lastChapter = -1;
  let completed = false;

  const trigger = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    scrub: true,
    onUpdate: (self) => {
      scrollState.raw = self.progress;
      // Normalise velocity to roughly -1..1.
      scrollState.velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 4000);

      const chapter = chapterIndexAt(self.progress);
      if (chapter !== lastChapter) {
        lastChapter = chapter;
        options.onChapterChange?.(chapter);
      }

      if (!completed && self.progress > 0.9995) {
        completed = true;
        options.onComplete?.();
      } else if (completed && self.progress < 0.99) {
        completed = false;
      }
    },
  });

  return {
    lenis,
    destroy() {
      gsap.ticker.remove(tick);
      trigger.kill();
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    },
    scrollTo(progress, opts) {
      const max = ScrollTrigger.maxScroll(window);
      lenis.scrollTo(max * progress, {
        immediate: opts?.immediate ?? false,
        duration: opts?.duration ?? 1.6,
      });
    },
  };
}

/**
 * Prevents the document scrolling — before the audience has begun, and while an
 * archive overlay (milestone card / timeline) is open.
 *
 * `overflow: hidden` alone is not enough here: Lenis listens for wheel and touch
 * events on the window and scrolls the page programmatically, so it happily
 * keeps driving the film behind an open modal. The scroll transport has to be
 * stopped as well — see `setScrollLocked`, which does both.
 */
export function lockScroll(locked: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  document.body.style.overflow = locked ? 'hidden' : '';
}
