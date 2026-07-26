'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { GlitchText } from './GlitchText';
import { useExperience } from '@/lib/store';
import { useAudio } from '@/hooks/useAudio';
import { getAudioEngine } from '@/audio/engine';
import { CINEMA } from '@/animations/easing';

const LINES = [
  { text: 'MEMORY ARCHIVE ONLINE', delay: 0 },
  { text: 'RUNNING INTEGRITY CHECK', delay: 900 },
  { text: 'SYSTEM INTEGRITY: 3%', delay: 1800, corrupt: 0.25 },
  { text: 'CORE SHUTDOWN IMMINENT', delay: 2700, corrupt: 0.5 },
  { text: 'RECONSTRUCTING: HOW I CAME TO BE', delay: 3600 },
];

/**
 * PROLOGUE — the terminal.
 *
 * Serves three purposes at once: it establishes the premise in five lines, it
 * covers the first shader compilation, and it provides the user gesture the
 * Web Audio API requires. The BEGIN control is deliberately the only thing the
 * audience is ever asked to click.
 */
export function BootSequence() {
  const phase = useExperience((s) => s.phase);
  const setPhase = useExperience((s) => s.setPhase);
  const loadProgress = useExperience((s) => s.loadProgress);
  const { start } = useAudio();

  const [visibleLines, setVisibleLines] = useState(0);
  const [beginning, setBeginning] = useState(false);

  useEffect(() => {
    if (phase !== 'boot' && phase !== 'ready') return;
    const timers = LINES.map((line, i) =>
      window.setTimeout(() => setVisibleLines((v) => Math.max(v, i + 1)), line.delay)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [phase]);

  const begin = useCallback(async () => {
    if (beginning) return;
    setBeginning(true);

    // Audio is an enhancement, never a gate. A blocked AudioContext, a device
    // with no output, or an autoplay policy we lose to must not be able to
    // strand the audience on the boot screen.
    try {
      await start();
      getAudioEngine().blip(660, 0.14, 0.06);
    } catch {
      /* play on in silence */
    }

    // Let the audio bed establish itself before the film starts moving.
    window.setTimeout(() => setPhase('playing'), 900);
  }, [beginning, setPhase, start]);

  // Keyboard: Enter or Space also begins.
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        void begin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, begin]);

  const active = phase === 'boot' || phase === 'ready';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: CINEMA }}
        >
          <div className="w-full max-w-2xl px-8">
            <div className="space-y-3 font-mono text-[11px] tracking-wide2 text-signal/80 sm:text-xs">
              {LINES.slice(0, visibleLines).map((line, i) => (
                <motion.div
                  key={line.text}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: CINEMA }}
                  className="flex items-baseline gap-3"
                >
                  <span className="text-signal/30">{String(i + 1).padStart(2, '0')}</span>
                  <GlitchText
                    text={line.text}
                    corruption={line.corrupt ?? 0}
                    typewriter
                    typeSpeed={26}
                    chromatic={(line.corrupt ?? 0) > 0.2}
                  />
                </motion.div>
              ))}
            </div>

            {/* Integrity meter — the load bar, in character. */}
            <div className="mt-10 h-px w-full bg-signal/15">
              <motion.div
                className="h-px bg-signal/70"
                style={{ width: `${loadProgress * 100}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>

            <div className="mt-10 h-12">
              <AnimatePresence>
                {phase === 'ready' && !beginning && (
                  <motion.button
                    key="begin"
                    type="button"
                    onClick={begin}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: CINEMA, delay: 0.4 }}
                    className="group relative font-mono text-[11px] tracking-cinema text-bone/70 transition-colors duration-700 hover:text-bone"
                  >
                    <span className="relative z-10">BEGIN</span>
                    <span className="absolute -bottom-2 left-0 h-px w-0 bg-bone/60 transition-all duration-1000 ease-cinema group-hover:w-full" />
                  </motion.button>
                )}
                {beginning && (
                  <motion.div
                    key="beginning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-[11px] tracking-cinema text-bone/40"
                  >
                    PLAYBACK STARTING
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="mt-6 max-w-sm font-mono text-[10px] leading-relaxed tracking-wide2 text-bone/25">
              SCROLL TO PLAY BACK THE ARCHIVE. HEADPHONES RECOMMENDED.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
