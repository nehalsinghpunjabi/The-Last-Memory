'use client';

import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AICore } from './AICore';
import { CameraRig } from './CameraRig';
import { Starfield } from './Starfield';
import { PrologueScene } from '@/scenes/PrologueScene';
import { GenesisScene } from '@/scenes/GenesisScene';
import { HumanityScene } from '@/scenes/HumanityScene';
import { GoldenAgeScene } from '@/scenes/GoldenAgeScene';
import { FallScene } from '@/scenes/FallScene';
import { SolitudeScene } from '@/scenes/SolitudeScene';
import { LastMemoryScene } from '@/scenes/LastMemoryScene';
import { RevealScene } from '@/scenes/RevealScene';
import { computeGrade, sceneActive, sceneWeight } from '@/lib/director';
import { scrollState } from '@/lib/scrollState';
import { useRafValue } from '@/hooks/useRafValue';
import type { DeviceProfile } from '@/utils/device';

interface Props {
  device: DeviceProfile;
}

const SCENE_COUNT = 8;

/**
 * The projectionist.
 *
 * Decides which chapters exist in the scene graph at all. A chapter is mounted
 * only while the camera is within fade range of it, so at any instant the
 * renderer is dealing with one or two environments — never eight. Because
 * chapters overlap by design, transitions are always cross-dissolves between
 * two live scenes rather than a swap.
 *
 * The active set is computed on a rAF loop and compared as a bitmask, so this
 * component re-renders roughly fourteen times across the entire experience.
 */
export function SceneDirector({ device }: Props) {
  const scene = useThree((s) => s.scene);

  const activeMask = useRafValue(
    (s) => {
      let mask = 0;
      for (let i = 0; i < SCENE_COUNT; i++) {
        if (sceneActive(s.eased, i)) mask |= 1 << i;
      }
      return mask;
    },
    0,
    (a, b) => a === b
  );

  // One stable getter per chapter. Passed down instead of numbers so that
  // nothing below this component ever needs to re-render.
  const weights = useMemo(
    () => Array.from({ length: SCENE_COUNT }, (_, i) => () => sceneWeight(scrollState.eased, i)),
    []
  );

  const fog = useMemo(() => new THREE.FogExp2(0x000000, 0.02), []);

  useFrame(() => {
    const grade = computeGrade(scrollState.eased, scrollState.corruption);
    // Fog is graded along with everything else: it is the cheapest and most
    // effective depth cue in the film, and its colour sells each chapter.
    fog.color.copy(grade.fogColor);
    fog.density = grade.fogDensity;
    if (scene.fog !== fog) scene.fog = fog;
  });

  const is = (i: number) => (activeMask & (1 << i)) !== 0;

  return (
    <>
      <CameraRig />
      <Starfield device={device} />
      <AICore device={device} />

      {is(0) && <PrologueScene device={device} weight={weights[0]} />}
      {is(1) && <GenesisScene device={device} weight={weights[1]} />}
      {is(2) && <HumanityScene device={device} weight={weights[2]} />}
      {is(3) && <GoldenAgeScene device={device} weight={weights[3]} />}
      {is(4) && <FallScene device={device} weight={weights[4]} />}
      {is(5) && <SolitudeScene device={device} weight={weights[5]} />}
      {is(6) && <LastMemoryScene device={device} weight={weights[6]} />}
      {is(7) && <RevealScene device={device} weight={weights[7]} />}
    </>
  );
}
