'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CHAPTER_BY_ID } from '@/lib/chapters';
import { useRafValue } from '@/hooks/useRafValue';
import { useExperience } from '@/lib/store';
import { CINEMA } from '@/animations/easing';

/**
 * The one moment we tell the visitor the world is touchable.
 *
 * An interactive museum is worthless if nobody realises the exhibits can be
 * approached. This appears once, the first time the camera enters the hall that
 * actually contains artifacts, says one sentence, and never returns — the
 * cheapest possible way to teach the interaction without a tutorial overlay or
 * a permanent instruction rail.
 */
export function ArtifactHint() {
  const phase = useExperience((s) => s.phase);
  const [dismissed, setDismissed] = useState(false);

  const hall = CHAPTER_BY_ID.humanity;
  // A little way into the hall — past the chapter card, once fragments are lit.
  const inHall = useRafValue(
    (s) => s.eased > hall.start + 0.02 && s.eased < hall.end,
    0,
    (a, b) => a === b
  );

  useEffect(() => {
    if (!inHall || dismissed) return;
    const t = window.setTimeout(() => setDismissed(true), 6500);
    return () => window.clearTimeout(t);
  }, [inHall, dismissed]);

  const show = phase === 'playing' && inHall && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="artifact-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 1.4, ease: CINEMA }}
          className="pointer-events-none fixed inset-x-0 top-[16vh] z-30 flex justify-center"
        >
          <p className="flex items-center gap-2.5 rounded-full border border-signal/20 bg-black/50 px-4 py-2 font-mono text-[10px] uppercase tracking-cinema text-bone/60 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 animate-breathe rounded-full bg-signal/80" />
            Some memories are real records — reach out and open one
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
