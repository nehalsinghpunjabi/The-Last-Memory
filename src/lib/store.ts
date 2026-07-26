import { create } from 'zustand';
import type { DeviceProfile } from '@/utils/device';
import { detectDevice } from '@/utils/device';

export type Phase = 'boot' | 'ready' | 'playing' | 'ended';

interface ExperienceState {
  phase: Phase;
  /** Discrete chapter index — the only scroll-derived value in React. */
  chapter: number;
  /** Asset/scene readiness 0..1 for the boot sequence. */
  loadProgress: number;
  audioEnabled: boolean;
  audioReady: boolean;
  device: DeviceProfile;
  /** True while the final "Archive Closed" card is on screen. */
  ended: boolean;
  /** True once WebGL has produced its first frame — gates the BEGIN control so
   *  a slow machine never starts the film on a black screen. */
  renderReady: boolean;

  setPhase: (p: Phase) => void;
  setChapter: (c: number) => void;
  setLoadProgress: (p: number) => void;
  setAudioEnabled: (v: boolean) => void;
  setAudioReady: (v: boolean) => void;
  setDevice: (d: DeviceProfile) => void;
  setEnded: (v: boolean) => void;
  setRenderReady: (v: boolean) => void;
}

export const useExperience = create<ExperienceState>((set) => ({
  phase: 'boot',
  chapter: 0,
  loadProgress: 0,
  audioEnabled: true,
  audioReady: false,
  device: detectDevice(),
  ended: false,
  renderReady: false,

  setPhase: (phase) => set({ phase }),
  setChapter: (chapter) => set((s) => (s.chapter === chapter ? s : { chapter })),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setAudioReady: (audioReady) => set({ audioReady }),
  setDevice: (device) => set({ device }),
  setEnded: (ended) => set((s) => (s.ended === ended ? s : { ended })),
  setRenderReady: (renderReady) => set((s) => (s.renderReady === renderReady ? s : { renderReady })),
}));

/** Non-reactive read for use inside useFrame. */
export const experienceState = () => useExperience.getState();
