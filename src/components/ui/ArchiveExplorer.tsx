'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Escape belongs to the topmost layer. A record opens *on top of* the
  // explorer, and both listen on the window — so without this guard one press
  // dismissed both, throwing the visitor out of the timeline they were reading
  // and discarding their place in it. While a record is open, the card owns the
  // key; the explorer only takes it once the card is gone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useArchive.getState().milestoneId !== null) return;
      setExplorer(false);
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

  /* ---------------------------------------------------------------- *
   * Horizontal navigation
   *
   * The lineage is far wider than any viewport, and the app hides
   * scrollbars globally for the film — which left mouse-only desktop
   * users with no way to discover, or reach, the two-thirds of history
   * off the right edge. Three affordances now cover every input:
   * a styled scrollbar (.museum-scroll), edge gradients that appear
   * only when there is more in that direction, and drag-to-pan.
   * ---------------------------------------------------------------- */
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  // Custom scrollbar geometry: `can` gates the whole control, `thumb` is the
  // visible fraction and `pos` the 0..1 position within the scrollable range.
  const [bar, setBar] = useState({ can: false, thumb: 1, pos: 0 });
  const [dragging, setDragging] = useState(false);
  // Pointer id + origin for a drag in progress. Refs, not state: this updates
  // on every pointermove and must not re-render the graph.
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const moved = useRef(0);

  const syncEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const can = max > 4;
    setEdge({
      left: el.scrollLeft > 4,
      right: can && el.scrollLeft < max - 4,
    });
    setBar({
      can,
      // Floor the thumb so it stays grabbable on a very wide timeline.
      thumb: can ? Math.max(0.1, el.clientWidth / el.scrollWidth) : 1,
      pos: can ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0,
    });
  }, []);

  // Recompute on open, on resize, and whenever the container scrolls.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(syncEdges);
    window.addEventListener('resize', syncEdges);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', syncEdges);
    };
  }, [open, syncEdges]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Never hijack a press that began on a node — those are click targets, and
    // a drag started on one would fight the milestone it is trying to open.
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    moved.current = 0;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const el = scroller.current;
      if (!d || !el || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      moved.current = Math.max(moved.current, Math.abs(dx) + Math.abs(dy));
      // Capture only once the gesture is clearly a drag, so a click that
      // wobbles by a pixel still lands on the node underneath it.
      if (moved.current > 6 && !el.hasPointerCapture(e.pointerId)) {
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = d.left - dx;
      el.scrollTop = d.top - dy;
    },
    []
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scroller.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
  }, []);

  /* The custom scrollbar. Dragging the thumb, or clicking anywhere on the
     track, moves the timeline — the affordance a mouse-only visitor reaches
     for first, and the one that makes "there is more to the right" legible
     before any scrolling has happened. */
  const track = useRef<HTMLDivElement>(null);
  const barDrag = useRef<{ id: number; x: number; left: number } | null>(null);

  const scrollToRatio = useCallback((ratio: number) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.min(1, Math.max(0, ratio)) * max;
  }, []);

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = track.current;
      const el = scroller.current;
      if (!t || !el) return;
      const rect = t.getBoundingClientRect();
      const thumbW = rect.width * bar.thumb;
      const thumbLeft = rect.left + (rect.width - thumbW) * bar.pos;
      const onThumb = e.clientX >= thumbLeft && e.clientX <= thumbLeft + thumbW;
      if (!onThumb) {
        // Click on empty track: jump so the thumb centres under the pointer.
        scrollToRatio((e.clientX - rect.left - thumbW / 2) / (rect.width - thumbW));
      }
      barDrag.current = { id: e.pointerId, x: e.clientX, left: el.scrollLeft };
      t.setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [bar.thumb, bar.pos, scrollToRatio]
  );

  const onTrackPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = barDrag.current;
    const t = track.current;
    const el = scroller.current;
    if (!d || !t || !el || d.id !== e.pointerId) return;
    const rect = t.getBoundingClientRect();
    const thumbW = rect.width * (el.clientWidth / el.scrollWidth);
    const travel = Math.max(1, rect.width - thumbW);
    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = d.left + ((e.clientX - d.x) / travel) * max;
  }, []);

  const onTrackPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const t = track.current;
    if (t?.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
    barDrag.current = null;
  }, []);

  /*
   * Wheel routing, owned explicitly rather than left to the browser.
   *
   * Registered through addEventListener with `passive: false` because React
   * attaches wheel handlers passively at the root, where preventDefault is a
   * no-op — and without preventDefault the browser's own horizontal scroll runs
   * *in addition* to ours and the timeline moves at double speed.
   *
   * Three intents, in priority order: a trackpad's horizontal gesture (deltaX),
   * Shift+wheel, and — only when there is no vertical room to give — a plain
   * wheel, so a mouse with one wheel is never a dead input on a wide, short
   * graph. When the graph does scroll vertically, a plain wheel is left alone
   * so reading down a tall era never drags the timeline sideways by accident.
   */
  useEffect(() => {
    const el = scroller.current;
    if (!open || !el) return;

    const onWheel = (e: WheelEvent) => {
      const maxX = el.scrollWidth - el.clientWidth;
      if (maxX <= 4) return;
      const horizontalIntent = e.deltaX !== 0 || e.shiftKey;
      const canScrollY = el.scrollHeight - el.clientHeight > 4;
      if (!horizontalIntent && canScrollY) return;
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      el.scrollLeft += delta;
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

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
          {/* The scroll viewport, plus the two edge gradients. The gradients sit
              outside the scroller so they stay pinned to the frame instead of
              travelling with the content, and are pointer-transparent so they
              never intercept a click on a node beneath them. */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={scroller}
              id="lineage-scroller"
              data-lenis-prevent
              onScroll={syncEdges}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={`museum-scroll relative h-full overflow-auto overscroll-contain px-[5vw] py-6 ${
                dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
              }`}
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

            {/* Edge gradients — shown only while there is more lineage in that
                direction, so they read as "history continues" rather than as
                permanent decoration, and vanish at each end. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#03050a] to-transparent transition-opacity duration-500"
              style={{ opacity: edge.left ? 1 : 0 }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#03050a] to-transparent transition-opacity duration-500"
              style={{ opacity: edge.right ? 1 : 0 }}
            />
            {/* A one-word nudge in the direction that still has content. */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-cinema text-signal/60 transition-opacity duration-500"
              style={{ opacity: edge.right ? 1 : 0 }}
            >
              more →
            </div>
          </div>

          {/* Horizontal scrollbar. Always present while the lineage overflows,
              so the timeline announces its own width before anyone scrolls. */}
          {bar.can && (
            <div className="px-[5vw] pb-1 pt-2">
              <div
                ref={track}
                role="scrollbar"
                aria-controls="lineage-scroller"
                aria-orientation="horizontal"
                aria-label="Scroll the timeline horizontally"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(bar.pos * 100)}
                tabIndex={0}
                onPointerDown={onTrackPointerDown}
                onPointerMove={onTrackPointerMove}
                onPointerUp={onTrackPointerUp}
                onPointerCancel={onTrackPointerUp}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') scrollToRatio(bar.pos + 0.1);
                  else if (e.key === 'ArrowLeft') scrollToRatio(bar.pos - 0.1);
                  else if (e.key === 'Home') scrollToRatio(0);
                  else if (e.key === 'End') scrollToRatio(1);
                  else return;
                  e.preventDefault();
                }}
                className="group relative h-2.5 w-full cursor-pointer rounded-full bg-bone/[0.07]"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 rounded-full bg-signal/40 transition-colors duration-200 group-hover:bg-signal/70"
                  style={{
                    width: `${bar.thumb * 100}%`,
                    left: `${bar.pos * (100 - bar.thumb * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

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
            <span className="text-bone/30">
              Drag or scroll sideways to explore · Click to open · Esc to close
            </span>
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
