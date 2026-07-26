'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRafValue } from '@/hooks/useRafValue';
import { useExperience } from '@/lib/store';
import { CINEMA } from '@/animations/easing';

/**
 * The only instruction the audience is given, and it removes itself the moment
 * it has been obeyed.
 */
export function ScrollHint() {
  const phase = useExperience((s) => s.phase);
  const moved = useRafValue((s) => s.raw > 0.004, 0, (a, b) => a === b);

  const visible = phase === 'playing' && !moved;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hint"
          className="pointer-events-none fixed inset-x-0 bottom-[7vh] z-30 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: CINEMA, delay: 2.4 }}
        >
          <span className="font-mono text-[10px] uppercase tracking-cinema text-bone/40">
            Scroll
          </span>
          <motion.span
            className="block h-10 w-px bg-gradient-to-b from-bone/50 to-transparent"
            animate={{ scaleY: [0.35, 1, 0.35], originY: 0 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
