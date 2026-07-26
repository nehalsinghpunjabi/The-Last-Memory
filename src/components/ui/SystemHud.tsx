'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import { CHAPTERS, chapterIndexAt } from '@/lib/chapters';
import { useRafValue } from '@/hooks/useRafValue';
import { useExperience } from '@/lib/store';
import { useArchive } from '@/lib/archiveStore';
import { MILESTONES } from '@/lib/history';
import { useAudio } from '@/hooks/useAudio';

/**
 * Diagnostics.
 *
 * A machine watching itself die. Kept to two hairline readouts in opposite
 * corners: falling integrity, and a progress spine that doubles as a chapter
 * index. Anything more would turn the film into a dashboard.
 */
export function SystemHud() {
  const phase = useExperience((s) => s.phase);
  const setExplorer = useArchive((s) => s.setExplorer);
  const guideOpen = useArchive((s) => s.guideOpen);
  const toggleGuide = useArchive((s) => s.toggleGuide);
  const { toggle, enabled } = useAudio();

  const integrity = useRafValue((s) => s.integrity, 0.02);
  const progress = useRafValue((s) => s.eased, 0.004);
  const corruption = useRafValue((s) => s.corruption, 0.05);
  // Derived separately so the spine only re-renders when the chapter actually
  // changes — eight rows were being rebuilt on every integrity tick.
  const activeChapter = useRafValue((s) => chapterIndexAt(s.eased), 0, (a, b) => a === b);

  if (phase !== 'playing' && phase !== 'ended') return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 - Math.max(0, (progress - 0.965) / 0.03) }}
      transition={{ duration: 2.4, delay: 1.2 }}
    >
      {/* Top-left: integrity. */}
      <div className="absolute left-[6vw] top-[6vh] font-mono text-[10px] uppercase tracking-wide2 text-bone/35">
        <div className="flex items-baseline gap-2">
          <span className="text-bone/20">SYS</span>
          <span
            className={corruption > 0.5 ? 'text-decay/90 animate-flicker' : 'text-signal/70'}
          >
            {integrity.toFixed(2)}%
          </span>
        </div>
        <div className="mt-1 text-bone/20">MEMORY ARCHIVE</div>
        {/* The knowledge graph is the piece of this project most easily missed —
            it lived behind a hairline label that read as a diagnostic readout
            rather than a control. Given a border, a count and a resting glow it
            still sits inside the diegesis, but now announces that there is
            something to open. */}
        <button
          type="button"
          onClick={() => setExplorer(true)}
          className="pointer-events-auto group mt-3 flex items-center gap-2 rounded-full border border-signal/25 bg-signal/5 px-3 py-1.5 text-bone/60 transition-all duration-500 hover:border-signal/60 hover:bg-signal/10 hover:text-bone"
          aria-label={`Open the interactive timeline of AI history — ${MILESTONES.length} sourced milestones`}
        >
          <span className="text-signal/70 transition-transform duration-500 group-hover:rotate-90">
            ◇
          </span>
          <span className="tracking-cinema">EXPLORE {MILESTONES.length} ARTIFACTS</span>
        </button>
        <button
          type="button"
          onClick={toggleGuide}
          aria-pressed={guideOpen}
          className={`pointer-events-auto mt-2 flex items-center gap-1.5 transition-colors duration-500 hover:text-bone/80 ${
            guideOpen ? 'text-bone/70' : 'text-bone/30'
          }`}
        >
          <span className={guideOpen ? 'text-signal/70' : 'text-bone/25'}>◆</span>
          MUSEUM GUIDE {guideOpen ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Top-right: audio. The only interactive element in the film. */}
      <button
        type="button"
        onClick={toggle}
        className="pointer-events-auto absolute right-[6vw] top-[6vh] flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide2 text-bone/35 transition-colors duration-500 hover:text-bone/80"
        aria-label={enabled ? 'Mute audio' : 'Unmute audio'}
      >
        <span className="flex h-3 items-end gap-[2px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-[2px] bg-current transition-all duration-500 ${
                enabled ? 'animate-breathe' : ''
              }`}
              style={{ height: enabled ? `${4 + i * 3}px` : '2px', animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </span>
        {enabled ? 'SOUND ON' : 'SOUND OFF'}
      </button>

      {/* Right spine: chapter index + playhead. */}
      <ChapterSpine active={activeChapter} />

      {/* Bottom: playhead. */}
      <div className="absolute inset-x-[6vw] bottom-[5vh] h-px bg-bone/10">
        <div
          className="h-px bg-bone/45 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </motion.div>
  );
}

/**
 * The chapter index. Memoised on the active chapter alone: the surrounding HUD
 * updates several times a second as integrity and corruption tick, and there is
 * no reason to rebuild eight rows of markup for that.
 */
const ChapterSpine = memo(function ChapterSpine({ active }: { active: number }) {
  return (
    <div className="absolute right-[6vw] top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex">
      {CHAPTERS.map((c, i) => {
        const on = i === active;
        return (
          <div key={c.id} className="flex items-center gap-2">
            <span
              className={`font-mono text-[9px] tracking-wide2 transition-all duration-700 ${
                on ? 'text-bone/70' : 'text-bone/0'
              }`}
            >
              {c.title}
              {on && c.eraDates ? <span className="text-signal/45"> · {c.eraDates}</span> : null}
            </span>
            <span
              className={`block h-px transition-all duration-700 ${
                on ? 'w-8 bg-bone/70' : 'w-3 bg-bone/20'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
});
