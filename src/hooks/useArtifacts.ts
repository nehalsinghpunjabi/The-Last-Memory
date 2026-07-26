'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { ChapterId } from '@/lib/chapters';
import { milestonesForChapter } from '@/lib/history';
import { useArchive } from '@/lib/archiveStore';
import { damp } from '@/utils/math';

/**
 * Turns a chapter's floating memory fragments into selectable artifacts.
 *
 * The museum lives *inside* the film: the records the AI is remembering are the
 * objects hanging in the hall, and a visitor finds them by looking around rather
 * than by reading an index. This hook owns that mapping and the interaction
 * state, so a scene only has to say which of its fragments are artifacts and
 * spread the returned handlers onto those meshes.
 *
 * Fragments are assigned in scene order, which is deterministic (every fragment
 * layout is seeded), so a given artifact is always the same physical object in
 * the hall on every visit — a museum where the exhibits move would be worse than
 * no museum at all.
 */
export interface ArtifactBinding {
  /** milestone id per fragment index, or null for ordinary memories. */
  idFor: (index: number) => string | null;
  /** Current 0..1 highlight per fragment, advanced by `tick`. */
  hoverFor: (index: number) => number;
  /** Call once per frame with the frame delta to ease highlights. */
  tick: (dt: number) => void;
  /** Spread onto an artifact mesh. */
  handlers: (index: number) => {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
    onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
    onClick: (e: ThreeEvent<MouseEvent>) => void;
  };
}

export function useArtifacts(
  chapter: ChapterId,
  /** World position of every candidate fragment, in scene order. */
  positions: Array<[number, number, number]>
): ArtifactBinding {
  const openMilestone = useArchive((s) => s.openMilestone);
  const setHovered = useArchive((s) => s.setHovered);
  const fragmentCount = positions.length;

  // Deterministic fragment → milestone assignment.
  //
  // Two things decide which fragments become artifacts. First, they have to be
  // *findable*: the camera drifts down the middle of the hall, so a record
  // hanging 34 units off-axis or high above the path is one nobody will ever
  // see — candidates are restricted to fragments near the flight path and near
  // eye level. Second, they are assigned in depth order, so drifting through
  // the hall walks the era forward in time: the first record you pass is the
  // earliest, the last is the latest. The hall becomes the timeline.
  const assignment = useMemo(() => {
    const milestones = milestonesForChapter(chapter);
    const map = new Map<number, string>();
    if (milestones.length === 0 || fragmentCount === 0) return map;

    const candidates = positions
      .map((p, index) => ({ index, x: p[0], y: p[1], z: p[2] }))
      .filter((c) => Math.abs(c.x) < 19 && Math.abs(c.y) < 11)
      // Far end of the hall first — the direction the camera travels.
      .sort((a, b) => b.z - a.z);

    // If the geometry is too sparse to satisfy the filter, fall back to every
    // fragment in depth order rather than silently shipping zero artifacts.
    const pool =
      candidates.length >= milestones.length
        ? candidates
        : positions
            .map((p, index) => ({ index, x: p[0], y: p[1], z: p[2] }))
            .sort((a, b) => b.z - a.z);

    const stride = Math.max(1, Math.floor(pool.length / milestones.length));
    milestones.forEach((m, i) => {
      const pick = pool[Math.min(pool.length - 1, i * stride)];
      if (pick) map.set(pick.index, m.id);
    });
    return map;
  }, [chapter, positions, fragmentCount]);

  const hover = useRef<Float32Array>(new Float32Array(fragmentCount));
  const target = useRef<Float32Array>(new Float32Array(fragmentCount));
  const hoveredIndex = useRef<number | null>(null);

  const idFor = useCallback((i: number) => assignment.get(i) ?? null, [assignment]);
  const hoverFor = useCallback((i: number) => hover.current[i] ?? 0, []);

  const tick = useCallback((dt: number) => {
    const h = hover.current;
    const t = target.current;
    for (let i = 0; i < h.length; i++) {
      if (h[i] !== t[i]) h[i] = damp(h[i], t[i], 12, dt);
    }
  }, []);

  const setTarget = useCallback(
    (i: number, v: number) => {
      if (target.current.length > i) target.current[i] = v;
    },
    []
  );

  const handlers = useCallback(
    (i: number) => ({
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        if (!assignment.has(i)) return;
        e.stopPropagation();
        hoveredIndex.current = i;
        setTarget(i, 1);
        setHovered(assignment.get(i) ?? null);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        if (!assignment.has(i)) return;
        e.stopPropagation();
        setTarget(i, 0);
        if (hoveredIndex.current === i) {
          hoveredIndex.current = null;
          setHovered(null);
          document.body.style.cursor = '';
        }
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        const id = assignment.get(i);
        if (!id) return;
        e.stopPropagation();
        // The card grows from the artifact the visitor actually touched, so the
        // panel reads as the object opening rather than a drawer sliding in.
        openMilestone(id, { x: e.clientX, y: e.clientY });
        setTarget(i, 0);
        document.body.style.cursor = '';
      },
    }),
    [assignment, openMilestone, setHovered, setTarget]
  );

  return { idFor, hoverFor, tick, handlers };
}
