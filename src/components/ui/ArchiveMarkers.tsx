'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { CHAPTERS, chapterIndexAt, chapterProgressAt } from '@/lib/chapters';
import { milestonesForChapter } from '@/lib/history';
import { useRafValue } from '@/hooks/useRafValue';
import { useArchive } from '@/lib/archiveStore';
import { useExperience } from '@/lib/store';
import { CINEMA } from '@/animations/easing';

/**
 * In-scene artifact markers.
 *
 * As the camera drifts through each era, the real milestones that belong to it
 * fade in as a quiet list on the left — the "objects" in this memory. Hovering
 * lifts one; clicking opens its full record. Everything is driven by scroll
 * position (no raycasting, no change to the WebGL layer), so the film stays
 * exactly as choreographed and this is a layer of glass on top of it.
 *
 * A desktop enhancement: the knowledge-graph explorer is the universal entry
 * point on every screen size, so these markers are hidden on small viewports
 * rather than crowding a phone frame.
 */
export function ArchiveMarkers() {
  const phase = useExperience((s) => s.phase);
  const open = useArchive((s) => s.openMilestone);
  const guideOpen = useArchive((s) => s.guideOpen);
  const hoveredId = useArchive((s) => s.hoveredId);

  const state = useRafValue(
    (s) => {
      const i = chapterIndexAt(s.eased);
      const local = chapterProgressAt(s.eased, i);
      // Show for the body of a chapter, after its title card has left and
      // before the transition out — never during the opening or the seam.
      const visible = local > 0.14 && local < 0.9;
      return { i, visible };
    },
    0,
    (a, b) => a.i === b.i && a.visible === b.visible
  );

  // Filter + sort over every milestone, memoised on the chapter index — this
  // used to re-run on each render of a component that updates while scrolling.
  const chapter = CHAPTERS[state.i];
  const milestones = useMemo(() => milestonesForChapter(chapter.id), [chapter.id]);

  if (phase !== 'playing' && phase !== 'ended') return null;

  // Off by default: the artifacts hanging in the world are the way in, and a
  // permanent index beside them turns discovery back into list-reading. The
  // guide stays available for anyone navigating by keyboard or assistive tech,
  // or who simply wants to see what a memory contains — and it is shown on all
  // screen sizes, since touch visitors rely on it most.
  const show = guideOpen && state.visible && milestones.length > 0;

  return (
    <div className="pointer-events-none fixed left-[6vw] top-1/2 z-30 -translate-y-1/2">
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            key={chapter.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 1.1, ease: CINEMA }}
            className="flex max-h-[62vh] flex-col gap-2 overflow-hidden"
          >
            <div className="mb-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-cinema text-bone/30">
              <span className="text-signal/50">◆</span> Museum guide · {chapter.eraDates}
            </div>
            {milestones.map((m, idx) => (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => open(m.id)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: CINEMA, delay: 0.12 + idx * 0.06 }}
                className="pointer-events-auto group flex items-baseline gap-2 text-left"
              >
                <span
                  className={`font-mono text-[9px] tracking-wide2 transition-colors duration-300 group-hover:text-signal/90 ${
                    hoveredId === m.id ? 'text-signal/90' : 'text-signal/40'
                  }`}
                >
                  {m.year}
                </span>
                <span
                  className={`font-mono text-[11px] tracking-wide transition-all duration-300 group-hover:text-bone/95 ${
                    hoveredId === m.id ? 'text-bone/95' : 'text-bone/45'
                  }`}
                >
                  {m.title}
                </span>
              </motion.button>
            ))}
            <div className="mt-1 font-mono text-[8px] uppercase tracking-wide2 text-bone/20">
              Click to open
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
