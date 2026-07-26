'use client';

import { useCallback, useEffect } from 'react';
import { getAudioEngine } from '@/audio/engine';
import { useExperience } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';

/**
 * Audio controls.
 *
 * Safe to call from as many components as need it — this hook holds no loops
 * and no listeners, only the start/toggle actions. The engine is fed by
 * `useAudioEngineDriver`, which is mounted exactly once.
 */
export function useAudio() {
  const audioEnabled = useExperience((s) => s.audioEnabled);
  const setAudioEnabled = useExperience((s) => s.setAudioEnabled);
  const setAudioReady = useExperience((s) => s.setAudioReady);

  /** Must be called from a user gesture. Never throws — silence is acceptable. */
  const start = useCallback(async () => {
    const engine = getAudioEngine();
    try {
      await engine.init();
      engine.setEnabled(useExperience.getState().audioEnabled);
    } catch {
      /* no audio device, or the context was refused */
    }
    setAudioReady(engine.ready);
  }, [setAudioReady]);

  const toggle = useCallback(() => {
    const next = !useExperience.getState().audioEnabled;
    setAudioEnabled(next);
    const engine = getAudioEngine();
    engine.setEnabled(next);
    if (next) void engine.resume();
  }, [setAudioEnabled]);

  return { start, toggle, enabled: audioEnabled };
}

/**
 * Feeds the audio engine from the scroll state.
 *
 * Mount this **once**, at the composition root. It was previously part of
 * `useAudio`, which meant every component that wanted the mute button also
 * started its own rAF loop and its own visibilitychange listener, all pushing
 * the same values into the same engine.
 *
 * Only parameter *targets* are pushed here. All scheduling happens on the audio
 * clock inside the engine, so a dropped frame never drops a note.
 */
export function useAudioEngineDriver() {
  const audioEnabled = useExperience((s) => s.audioEnabled);

  useEffect(() => {
    getAudioEngine().setEnabled(audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const engine = getAudioEngine();
      if (engine.ready) {
        engine.update(scrollState.eased, scrollState.corruption, scrollState.exposure);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Nobody wants a drone coming from a background tab.
  useEffect(() => {
    const onVisibility = () => {
      const engine = getAudioEngine();
      if (!engine.ready) return;
      engine.setEnabled(document.hidden ? false : useExperience.getState().audioEnabled);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
