'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useNarration } from '@/hooks/useNarration';
import { useRafValue } from '@/hooks/useRafValue';
import { GlitchText } from './GlitchText';
import { TEXT_IN, TEXT_OUT } from '@/animations/easing';

/**
 * The monologue.
 *
 * Rendered in DOM rather than in WebGL, deliberately: type set by the browser
 * is sharper than any texture-atlas approach at any resolution, it is
 * selectable, and it is readable by a screen reader — the whole story is
 * available as text to someone who cannot see the film at all.
 *
 * Opacity is driven by scroll position, not by a timer, so a reader who stops
 * scrolling holds the line on screen for as long as they want it.
 */
export function NarrationLayer() {
  const { line, opacity, key } = useNarration();
  const corruption = useRafValue((s) => s.corruption, 0.03);

  const tone = line?.tone ?? 'ai';
  const lineCorruption = Math.min(1, (line?.corrupt ?? 0) + corruption * 0.35);

  const toneClass =
    tone === 'system'
      ? 'font-mono text-[11px] sm:text-xs tracking-cinema text-signal/85 uppercase'
      : tone === 'whisper'
        ? 'font-display text-lg sm:text-2xl md:text-3xl tracking-wide text-bone/55 italic'
        : tone === 'final'
          ? 'font-display text-3xl sm:text-5xl md:text-6xl tracking-wide2 text-gold'
          : 'font-display text-xl sm:text-3xl md:text-4xl tracking-wide text-bone/90';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[14vh] z-30 flex items-end justify-center"
      aria-live="polite"
    >
      {/* popLayout, not "wait": a scrubbed timeline can change the active line
          faster than an exit animation finishes, and "wait" serialises those
          into a queue that lags chapters behind the camera. popLayout lets the
          new line enter immediately and pops stale ones out of flow. Each line
          is absolutely centred so overlapping exits never shift the layout. */}
      <AnimatePresence mode="popLayout">
        {line && line.text.length > 0 && (
          <motion.p
            key={key}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{
              opacity: { duration: 0.12, ease: 'linear' },
              y: { duration: 1.1, ease: TEXT_IN },
              filter: { duration: 0.5, ease: TEXT_OUT },
            }}
            className={`absolute bottom-0 max-w-[min(90vw,52rem)] px-6 text-center leading-snug ${toneClass}`}
            style={{
              textShadow:
                tone === 'final'
                  ? '0 0 40px rgba(255,201,138,0.35), 0 2px 30px rgba(0,0,0,0.9)'
                  : '0 2px 24px rgba(0,0,0,0.85)',
            }}
          >
            <GlitchText
              text={line.text}
              corruption={lineCorruption}
              chromatic={lineCorruption > 0.25}
            />
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
