'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Atmosphere, LightShaft } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { Megacity } from '@/components/three/Megacity';
import { HeroTowers } from '@/components/three/HeroTowers';
import { OrbitalRing } from '@/components/three/OrbitalRing';
import { Traffic } from '@/components/three/Traffic';
import { AttentionMoment, attentionEnvelope } from '@/components/three/AttentionMoment';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { clamp, smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * CHAPTER III — The Golden Age.
 *
 * The most expensive shot in the film, and the only one that is unambiguously
 * beautiful. Everything is warm: the key light is a low sun, the city is lit
 * from within, the traffic is moving, and a habitat ring hangs overhead like a
 * second horizon.
 *
 * The camera crane starts 430 units out and 210 up, drops between the towers,
 * and rises again toward orbit — a single unbroken move, because a cut here
 * would break the feeling that this is all one memory.
 */
export function GoldenAgeScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[3];
  const chapter = CHAPTERS[3];

  const sun = useRef<THREE.DirectionalLight>(null);
  const sunMesh = useRef<THREE.Mesh>(null);
  const revealRef = useRef(0);
  const group = useRef<THREE.Group>(null);

  const sunMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffe6bd'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  useFrame(({ camera }) => {
    const t = scrollState.eased;
    const w = weight();
    revealRef.current = clamp(smoothstep(chapter.start - 0.04, chapter.start + 0.09, t));

    if (sun.current) {
      sun.current.intensity = 2.6 * w;
    }
    if (sunMesh.current) {
      sunMaterial.opacity = 0.85 * w;
      // Keep the sun disc facing camera.
      sunMesh.current.lookAt(camera.position);
    }
    if (group.current) group.current.visible = w > 0.003;
  });

  const reveal = useCallback(() => revealRef.current, []);
  const noDecay = useCallback(() => 0, []);

  // The city pulls back while the attention field is up. Additive light cannot
  // register against a blown-out golden skyline, so without this dip the moment
  // is mathematically present and visually absent. It also happens to be the
  // right beat: the world recedes for four seconds while the AI looks at the
  // idea it is built from, then comes back.
  const cityWeight = useCallback(
    () => weight() * (1 - 0.72 * attentionEnvelope(scrollState.eased)),
    [weight]
  );

  return (
    <>
    <group ref={group} position={[0, originY, 0]}>
      {/* Key light: a low sun, warm, raking across the towers. */}
      <directionalLight
        ref={sun}
        position={[900, 260, -1200]}
        intensity={2.6}
        color="#ffcf94"
      />
      <ambientLight intensity={0.18} color="#5a6a86" />
      <hemisphereLight args={['#ffd9a0', '#2a1d14', 0.35]} />

      {/* The sun itself, as a disc. */}
      <mesh ref={sunMesh} position={[900, 250, -1400]} material={sunMaterial}>
        <circleGeometry args={[190, 48]} />
      </mesh>

      <Megacity
        device={device}
        decay={noDecay}
        reveal={reveal}
        weight={cityWeight}
        seed={7}
        extent={1400}
        baseColor="#3d4152"
        windowColor="#ffd9a0"
        accentColor="#ffb774"
        skyColor="#ff9b52"
        windowDensity={0.28}
        emissive={1.9}
        hazeColor="#ff9b52"
        hazeDensity={0.00058}
        hazeStrength={0.95}
        groundHaze={1.9}
        groundHazeFalloff={0.007}
      />

      {/* Landmark towers — the silhouette that says "megacity" at a glance. */}
      <HeroTowers
        reveal={reveal}
        weight={cityWeight}
        windowColor="#ffd9a0"
        accentColor="#ffb774"
        skyColor="#ff9b52"
        baseColor="#3d4152"
        hazeColor="#ff9b52"
      />

      <Traffic device={device} count={1100} radius={1050} weight={cityWeight} decay={noDecay} />

      {/* Two habitat rings arcing over the skyline — a second horizon. Raised
          and shallow-tilted so the band stays above the towers rather than
          dipping into them. */}
      <OrbitalRing
        device={device}
        count={1200}
        radius={900}
        thickness={12}
        tilt={0.14}
        seed={99}
        weight={cityWeight}
        position={[0, 820, -500]}
        color="#ffe6bd"
        emissive="#ffd9a0"
        spin={0.004}
      />
      <OrbitalRing
        device={device}
        count={640}
        radius={1320}
        thickness={8}
        tilt={-0.22}
        seed={123}
        weight={cityWeight}
        position={[120, 1040, -900]}
        color="#c9d4de"
        emissive="#9fd8ff"
        spin={-0.0025}
      />

      {/* Volumetric shafts raking through the skyline. */}
      <LightShaft
        position={[240, 180, -400]}
        width={220}
        height={620}
        color="#ffd9a0"
        opacity={0.24}
        softness={2.6}
        weight={cityWeight}
      />
      <LightShaft
        position={[-320, 220, -700]}
        width={300}
        height={780}
        color="#ffc487"
        opacity={0.18}
        softness={3.2}
        weight={cityWeight}
      />

      {/* Haze layer sitting in the streets. */}
      <Atmosphere
        radius={2200}
        colorA="#2a1508"
        colorB="#ff9b52"
        density={0.75}
        opacity={0.5}
        horizon={1.4}
        weight={weight}
        segments={40}
      />

      <DustField
        device={device}
        count={3000}
        radius={900}
        seed={41}
        color="#ffd9a0"
        colorAlt="#fff0d0"
        opacity={0.32}
        spread={30}
        flow={0.35}
        flatten={0.45}
        weight={weight}
        corruptionResponse={0.2}
      />
    </group>

    {/* "Attention is all you need." Mounted outside the chapter's Y-offset
        group because it positions itself relative to the camera each frame —
        inheriting the offset would apply it twice. */}
    <AttentionMoment device={device} weight={weight} />
    </>
  );
}
