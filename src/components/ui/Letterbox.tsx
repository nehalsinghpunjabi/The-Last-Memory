'use client';

import { motion } from 'framer-motion';
import { useExperience } from '@/lib/store';
import { CINEMA } from '@/animations/easing';

/**
 * Matte bars.
 *
 * They close in as the film begins and stay for its whole length. This is the
 * single cheapest signal available that says "you are watching something, not
 * browsing something", and it re-frames every shot in the experience for free.
 */
export function Letterbox() {
  const phase = useExperience((s) => s.phase);
  const active = phase === 'playing' || phase === 'ended';

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <motion.div
        className="absolute inset-x-0 top-0 bg-black"
        initial={{ height: 0 }}
        animate={{ height: active ? 'clamp(28px, 5.5vh, 76px)' : 0 }}
        transition={{ duration: 2.4, ease: CINEMA }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-black"
        initial={{ height: 0 }}
        animate={{ height: active ? 'clamp(28px, 5.5vh, 76px)' : 0 }}
        transition={{ duration: 2.4, ease: CINEMA }}
      />
    </div>
  );
}
