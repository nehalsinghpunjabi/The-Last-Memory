'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { ChapterId } from '@/lib/chapters';
import { CHAPTER_BY_ID } from '@/lib/chapters';
import { buildGraph, isSpineEdge } from '@/lib/history';
import { MILESTONE_BY_ID, milestonesForChapter } from '@/lib/history';
import { useArchive } from '@/lib/archiveStore';
import { CINEMA } from '@/animations/easing';

/**
 * The knowledge-graph explorer — the authoritative chronological timeline.
 *
 * The film surfaces memories by emotional weight; this overlay lays the same
 * milestones out in true historical order, era by era, with the dependency
 * chain drawn as edges: you can see, at a glance, how each breakthrough led to
 * the next, from Turing's question to today's agents. Nodes are clickable
 * (they open the full record); the emphasised path is the "spine" — the main
 * line of descent.
 *
 * Layout is a layered DAG: one column per era in CHRONOLOGICAL order (not the
 * scene order), milestones stacked by year within each column, and every
 * dependency edge runs left-to-right or loops within a column.
 */

// Eras in true chronological order (by era start) — deliberately different from
// the scroll order, since the film's Explosion (2006+) precedes its Winters.
const ERA_ORDER: ChapterId[] = [
  'genesis',
  'humanity',
  'fall',
  'solitude',
  'goldenAge',
  'lastMemory',
  'reveal',
];

const COL_W = 250;
const NODE_W = 202;
const NODE_H = 46;
const ROW_H = 62;
const HEADER_H = 96;
const PAD_X = 24;

interface Pos {
  id: string;
  x: number;
  y: number;
  chapter: ChapterId;
}

export function ArchiveExplorer() {
  const open = useArchive((s) => s.explorerOpen);
  const setExplorer = useArchive((s) => s.setExplorer);
  const openMilestone = useArchive((s) => s.openMilestone);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExplorer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setExplorer]);

  const layout = useMemo(() => {
    const pos = new Map<string, Pos>();
    let maxRows = 0;
    ERA_ORDER.forEach((chapter, col) => {
      const ms = milestonesForChapter(chapter);
      ms.forEach((m, row) => {
        pos.set(m.id, {
          id: m.id,
          x: col * COL_W + PAD_X,
          y: HEADER_H + row * ROW_H,
          chapter,
        });
      });
      maxRows = Math.max(maxRows, ms.length);
    });
    const width = ERA_ORDER.length * COL_W + PAD_X;
    const height = HEADER_H + maxRows * ROW_H + 40;
    return { pos, width, height };
  }, []);

  const { edges } = useMemo(() => buildGraph(), []);

  const eraColor = (chapter: ChapterId) => CHAPTER_BY_ID[chapter].grade.primary;

  // Which nodes/edges are lit given the current hover.
  const litEdge = (from: string, to: string) =>
    hovered == null ? null : from === hovered || to === hovered;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="explorer"
          className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-[#03050a]/97 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: CINEMA }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-bone/10 px-[5vw] py-5">
            <div>
              <h2 className="font-display text-2xl text-bone sm:text-3xl">
                The Lineage of Intelligence
              </h2>
              <p className="mt-1 max-w-xl font-mono text-[10px] uppercase tracking-wide2 text-bone/40">
                Every milestone in true chronological order — follow the arrows to see how each
                breakthrough made the next one possible. Click any node to open its record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExplorer(false)}
              className="shrink-0 font-mono text-[11px] uppercase tracking-cinema text-bone/50 transition-colors duration-300 hover:text-bone"
              aria-label="Close timeline"
            >
              Close ✕
            </button>
          </div>

          {/* Graph canvas (scrollable) */}
          <div
            data-lenis-prevent
            className="relative flex-1 overflow-auto overscroll-contain px-[5vw] py-6"
          >
            <div
              className="relative"
              style={{ width: layout.width, height: layout.height, minWidth: '100%' }}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Era column headers */}
              {ERA_ORDER.map((chapter, col) => {
                const c = CHAPTER_BY_ID[chapter];
                return (
                  <div
                    key={chapter}
                    className="absolute top-0"
                    style={{ left: col * COL_W + PAD_X, width: NODE_W }}
                  >
                    <div
                      className="font-display text-base leading-tight"
                      style={{ color: c.grade.primary }}
                    >
                      {c.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide2 text-bone/35">
                      {c.eraDates}
                    </div>
                    <div
                      className="mt-2 h-px w-full"
                      style={{ backgroundColor: c.grade.primary, opacity: 0.25 }}
                    />
                  </div>
                );
              })}

              {/* Edges */}
              <svg
                className="pointer-events-none absolute inset-0"
                width={layout.width}
                height={layout.height}
                style={{ overflow: 'visible' }}
              >
                {edges.map(({ from, to }) => {
                  const a = layout.pos.get(from);
                  const b = layout.pos.get(to);
                  if (!a || !b) return null;
                  const spine = isSpineEdge(from, to);
                  const lit = litEdge(from, to);
                  const sameCol = a.x === b.x;
                  const sy = a.y + NODE_H / 2;
                  const ty = b.y + NODE_H / 2;
                  let d: string;
                  if (sameCol) {
                    // Loop out to the right and back to the target's right edge.
                    const rx = a.x + NODE_W;
                    const bulge = rx + 46;
                    d = `M ${rx} ${sy} C ${bulge} ${sy}, ${bulge} ${ty}, ${rx} ${ty}`;
                  } else {
                    const sx = a.x + NODE_W;
                    const tx = b.x;
                    const mx = (sx + tx) / 2;
                    d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
                  }
                  const opacity = lit === false ? 0.05 : spine ? 0.7 : lit ? 0.85 : 0.16;
                  const stroke = spine ? '#ffd9a0' : lit ? '#9fd8ff' : '#8ba0b8';
                  return (
                    <path
                      key={`${from}->${to}`}
                      d={d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={spine ? 1.6 : 1}
                      opacity={opacity}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {[...layout.pos.values()].map((p) => {
                const m = MILESTONE_BY_ID[p.id];
                const color = eraColor(p.chapter);
                const dim = hovered != null && hovered !== p.id && !isNeighbor(edges, hovered, p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setHovered(p.id)}
                    onFocus={() => setHovered(p.id)}
                    onClick={() => openMilestone(p.id)}
                    className="absolute flex flex-col justify-center rounded border px-2.5 text-left transition-all duration-200"
                    style={{
                      left: p.x,
                      top: p.y,
                      width: NODE_W,
                      height: NODE_H,
                      borderColor: `${color}55`,
                      backgroundColor: hovered === p.id ? `${color}1f` : '#0a0e14',
                      opacity: dim ? 0.32 : 1,
                    }}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className="font-mono text-[9px] tracking-wide2"
                        style={{ color }}
                      >
                        {m.year}
                      </span>
                      <span className="truncate font-mono text-[11px] tracking-wide text-bone/85">
                        {m.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-bone/10 px-[5vw] py-3 font-mono text-[9px] uppercase tracking-wide2 text-bone/45">
            <span className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-6" style={{ backgroundColor: '#ffd9a0' }} />
              Main line (Turing → agents)
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-6 opacity-40" style={{ backgroundColor: '#8ba0b8' }} />
              Enabled
            </span>
            <span className="text-bone/30">Hover to trace · Click to open · Esc to close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** True when `other` is directly connected to `node` by any edge. */
function isNeighbor(
  edges: { from: string; to: string }[],
  node: string,
  other: string
): boolean {
  return edges.some(
    (e) =>
      (e.from === node && e.to === other) || (e.to === node && e.from === other)
  );
}
