import { create } from 'zustand';

/**
 * UI state for the interactive museum layer — which milestone card is open, and
 * whether the full knowledge-graph explorer is showing. Kept separate from the
 * cinematic `useExperience` store so the film's state and the museum's state
 * never entangle: opening a card never touches playback, and vice versa.
 */
interface ArchiveState {
  /** id of the milestone whose detail card is open, or null. */
  milestoneId: string | null;
  /** Whether the knowledge-graph explorer overlay is open. */
  explorerOpen: boolean;
  /** Screen-space point the card should grow from — the artifact the visitor
   *  actually clicked in the 3D world. Null when opened from a list, in which
   *  case the card uses its neutral slide-in. */
  origin: { x: number; y: number } | null;
  /** id of the artifact currently under the cursor in 3D, for cross-highlight. */
  hoveredId: string | null;
  /** The optional Museum Guide (the on-screen index of the current era). Off by
   *  default so the world is the primary way in, but available for anyone who
   *  wants a list — including keyboard and assistive-tech users. */
  guideOpen: boolean;

  openMilestone: (id: string, origin?: { x: number; y: number } | null) => void;
  closeMilestone: () => void;
  setExplorer: (open: boolean) => void;
  setHovered: (id: string | null) => void;
  toggleGuide: () => void;
}

export const useArchive = create<ArchiveState>((set) => ({
  milestoneId: null,
  explorerOpen: false,
  origin: null,
  hoveredId: null,
  guideOpen: false,

  openMilestone: (milestoneId, origin = null) => set({ milestoneId, origin }),
  closeMilestone: () => set({ milestoneId: null, origin: null }),
  setExplorer: (explorerOpen) => set({ explorerOpen }),
  setHovered: (hoveredId) => set((s) => (s.hoveredId === hoveredId ? s : { hoveredId })),
  toggleGuide: () => set((s) => ({ guideOpen: !s.guideOpen })),
}));
