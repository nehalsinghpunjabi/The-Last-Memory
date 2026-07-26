'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRafValue } from '@/hooks/useRafValue';
import { useArchive } from '@/lib/archiveStore';
import { getAudioEngine } from '@/audio/engine';
import { CINEMA } from '@/animations/easing';

/**
 * ARCHIVE CLOSED.
 *
 * Arrives after the screen has already gone black — the film ends, and only
 * then does the card appear, so the last thing the audience experiences is
 * darkness rather than typography. The credit line fades in twelve seconds
 * later, quietly, for anyone still sitting there.
 */
export function EndCard() {
  const near = useRafValue((s) => s.eased > 0.9955, 0, (a, b) => a === b);
  const setExplorer = useArchive((s) => s.setExplorer);
  const [showCredit, setShowCredit] = useState(false);
  const [poweredDown, setPoweredDown] = useState(false);

  useEffect(() => {
    if (!near) {
      setShowCredit(false);
      return;
    }
    if (!poweredDown) {
      setPoweredDown(true);
      getAudioEngine().powerDown(7);
    }
    const id = window.setTimeout(() => setShowCredit(true), 9000);
    return () => window.clearTimeout(id);
  }, [near, poweredDown]);

  return (
    <AnimatePresence>
      {near && (
        <motion.div
          key="end"
          className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3.2, ease: CINEMA }}
        >
          <motion.h2
            initial={{ opacity: 0, letterSpacing: '0.9em' }}
            animate={{ opacity: 1, letterSpacing: '0.42em' }}
            transition={{ duration: 4.5, ease: CINEMA, delay: 2.2 }}
            className="font-mono text-[11px] uppercase text-bone/55 sm:text-sm"
          >
            Archive Closed
          </motion.h2>

          <AnimatePresence>
            {showCredit && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 5, ease: CINEMA }}
                className="mt-16 flex flex-col items-center gap-3"
              >
                <p className="font-display text-sm italic text-bone/20">The Last Memory</p>
                <p className="max-w-xs text-center font-mono text-[8px] uppercase leading-relaxed tracking-wide2 text-bone/15">
                  Everything you just remembered was real · The history of artificial intelligence, 1936–present
                </p>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setExplorer(true)}
                    className="pointer-events-auto font-mono text-[9px] uppercase tracking-cinema text-bone/25 transition-colors duration-700 hover:text-signal/70"
                  >
                    Explore the timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="pointer-events-auto font-mono text-[9px] uppercase tracking-cinema text-bone/15 transition-colors duration-700 hover:text-bone/50"
                  >
                    Replay
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
