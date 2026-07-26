'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { BootSequence } from './ui/BootSequence';
import { NarrationLayer } from './ui/NarrationLayer';
import { ChapterMarker } from './ui/ChapterMarker';
import { SystemHud } from './ui/SystemHud';
import { ScrollHint } from './ui/ScrollHint';
import { Letterbox } from './ui/Letterbox';
import { EndCard } from './ui/EndCard';
import { StoryTranscript } from './ui/StoryTranscript';
import { ArchiveMarkers } from './ui/ArchiveMarkers';
import { ArtifactHint } from './ui/ArtifactHint';
import { MilestoneCard } from './ui/MilestoneCard';
import { ArchiveExplorer } from './ui/ArchiveExplorer';
import { useScrollExperience } from '@/hooks/useScrollExperience';
import { useAudioEngineDriver } from '@/hooks/useAudio';
import { useTransportControls } from '@/hooks/useKeyboardControls';
import { useExperience } from '@/lib/store';
import { detectDevice } from '@/utils/device';
import { SCROLL_LENGTH_VH } from '@/lib/constants';

// WebGL never renders on the server. Loading it on the client also means the
// boot sequence is on screen before three.js has even been parsed.
const Experience = dynamic(() => import('./Experience').then((m) => m.Experience), {
  ssr: false,
});

/**
 * Composition root.
 *
 * Three layers, in z-order:
 *   0  the WebGL film
 *   20 the matte bars
 *   30 narration, chapter cards, diagnostics
 *   40 boot and end cards
 *
 * Plus one invisible scroll spacer that gives the document its length. The
 * spacer is the film's runtime: 1400vh of scroll is roughly a ten-minute
 * viewing at a natural reading pace.
 */
export function ExperienceRoot() {
  const setDevice = useExperience((s) => s.setDevice);

  useScrollExperience();
  useAudioEngineDriver(); // exactly one engine feed, mounted here
  useTransportControls(); // arrow / page / home / end

  // Re-probe on mount: the store's initial value is computed during module
  // evaluation, which on a hard refresh can precede layout.
  useEffect(() => {
    setDevice(detectDevice());
  }, [setDevice]);

  return (
    <>
      <Experience />

      <Letterbox />
      <ChapterMarker />
      <NarrationLayer />
      <ArchiveMarkers />
      <ArtifactHint />
      <SystemHud />
      <ScrollHint />
      <BootSequence />
      <ArchiveExplorer />
      <MilestoneCard />
      <EndCard />

      {/* The document's height. Nothing is rendered into it — it exists purely
          to give the scroll wheel somewhere to go. */}
      <div
        aria-hidden
        style={{ height: `${SCROLL_LENGTH_VH}vh` }}
        className="pointer-events-none relative w-full"
      />

      {/* The entire screenplay, for screen readers and for anyone who cannot
          run WebGL. Visually hidden, fully readable. */}
      <StoryTranscript />
    </>
  );
}
