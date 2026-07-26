'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CHAPTERS, chapterIndexAt, chapterProgressAt } from '@/lib/chapters';
import { useRafValue } from '@/hooks/useRafValue';
import { CINEMA } from '@/animations/easing';

/**
 * Chapter cards.
 *
 * Appear for the first ~9% of each chapter and then leave. Set in the corner
 * rather than centre-screen so they never compete with the image — this is a
 * title card in a film, not a section header on a website.
 */
export function ChapterMarker() {
  const state = useRafValue(
    (s) => {
      const i = chapterIndexAt(s.eased);
      const local = chapterProgressAt(s.eased, i);
      // Visible over the opening of the chapter only.
      const visible = local > 0.012 && local < 0.11 && CHAPTERS[i].numeral !== '';
      return { i, visible };
    },
    0,
    (a, b) => a.i === b.i && a.visible === b.visible
  );

  const chapter = CHAPTERS[state.i];

  return (
    <div className="pointer-events-none fixed left-[6vw] top-1/2 z-30 -translate-y-1/2">
      <AnimatePresence mode="wait">
        {state.visible && (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 1.4, ease: CINEMA }}
            className="flex items-center gap-5"
          >
            <span className="font-display text-5xl leading-none text-bone/25 sm:text-7xl">
              {chapter.numeral}
            </span>
            <span className="block h-10 w-px bg-bone/15" />
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-cinema text-bone/60">
                {chapter.title}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wide2 text-signal/50">
                {chapter.eraDates}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
