'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hologramFragmentShader, hologramVertexShader } from '@/shaders/hologram';
import { Atmosphere, LightShaft } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { getMemoryTexture } from '@/assets/memoryTextures';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { clamp, lerp, smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * CHAPTER VI — The Last Memory.
 *
 * One photograph, held in warm light, approached over a slow unbroken 12-second
 * dolly. Everything the rest of the film has been doing — corruption, scanlines,
 * chromatic separation — is deliberately *withdrawn* here: `uCorruption` is
 * forced toward zero and the scan intensity fades as the camera closes, so the
 * image resolves from a machine's reconstruction into something that looks,
 * finally, like an actual photograph.
 *
 * That withdrawal is the whole emotional mechanism of the scene. The AI stops
 * processing the memory and simply looks at it.
 */
export function LastMemoryScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[6];
  const chapter = CHAPTERS[6];

  const group = useRef<THREE.Group>(null);
  const photo = useRef<THREE.Mesh>(null);
  const frame = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => getMemoryTexture('final', 20240712, 768), []);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCorruption: { value: 0.2 },
      uReveal: { value: 0 },
      uTint: { value: new THREE.Color('#ffe8c8') },
      uScanIntensity: { value: 1 },
      uWarmth: { value: 1 },
      uSeed: { value: 7 },
      uCurl: { value: 0.12 },
      uFocus: { value: 0 },
      // The final photograph is never an artifact — nothing may invite a click
      // during the held beat the whole film lands on.
      uArtifact: { value: 0 },
      uHover: { value: 0 },
    }),
    [texture]
  );

  const frameMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffd9a0'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );

  const photoMaterial = useShaderMaterial(
    () => ({
      vertexShader: hologramVertexShader,
      fragmentShader: hologramFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  useFrame(() => {
    const t = scrollState.eased;
    const w = weight();
    const local = clamp((t - chapter.start) / (chapter.end - chapter.start));

    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uReveal.value = clamp(smoothstep(chapter.start - 0.02, chapter.start + 0.05, t));
    uniforms.uOpacity.value = w;

    // The machine lets go of the image. By the time the camera arrives there
    // is no processing left between the AI and what it is looking at: corruption
    // and scanlines withdraw completely, and a slow rack-focus resolves the
    // memory from soft to sharp — the AI stops reconstructing it and simply
    // looks. Everything is fully clean and sharp before the "Humanity." beat.
    uniforms.uCorruption.value = lerp(0.16, 0.0, smoothstep(0, 0.62, local)) * (1 - local * 0.5);
    uniforms.uScanIntensity.value = lerp(0.9, 0.02, smoothstep(0.08, 0.7, local));
    uniforms.uWarmth.value = lerp(0.72, 1, smoothstep(0, 0.55, local));
    uniforms.uFocus.value = smoothstep(0.12, 0.72, local);

    frameMaterial.opacity = 0.35 * w * smoothstep(0.02, 0.25, local) * (1 - smoothstep(0.6, 0.95, local));

    if (group.current) group.current.visible = w > 0.003;

    if (photo.current) {
      // A breath of movement so the image never feels like a static texture.
      photo.current.position.y = Math.sin(scrollState.elapsed * 0.21) * 0.06;
      photo.current.rotation.z = Math.sin(scrollState.elapsed * 0.16) * 0.004;
    }
    if (frame.current) {
      frame.current.rotation.z = scrollState.elapsed * 0.02;
    }
  });

  return (
    <group ref={group} position={[0, originY, 0]}>
      <ambientLight intensity={0.25} color="#ffd9a0" />
      <pointLight position={[0, 3, 6]} intensity={40} distance={60} color="#ffc98a" />

      {/* The photograph. */}
      <mesh ref={photo} position={[0, 0, -3]} material={photoMaterial}>
        <planeGeometry args={[6.4, 4.8, 24, 24]} />
      </mesh>

      {/* A slowly turning containment ring — the archive still holding it. */}
      <mesh ref={frame} position={[0, 0, -3.2]} material={frameMaterial}>
        <torusGeometry args={[4.9, 0.012, 4, 96]} />
      </mesh>

      {/* Light falling on the image from off-frame. */}
      <LightShaft
        position={[3.2, 2, -6]}
        width={7}
        height={26}
        color="#ffd9a0"
        opacity={0.18}
        softness={3}
        weight={weight}
      />

      <Atmosphere
        radius={140}
        colorA="#100a06"
        colorB="#4a2e18"
        density={0.8}
        opacity={0.4}
        weight={weight}
        segments={24}
      />

      {/* Motes in the light, drawn slowly toward the photograph. */}
      <DustField
        device={device}
        count={1600}
        radius={34}
        seed={12}
        color="#ffd9a0"
        colorAlt="#fff2dc"
        opacity={0.45}
        spread={2.4}
        flow={0.22}
        weight={weight}
        attractor={[0, 0, -3]}
        attraction={0.04}
        corruptionResponse={0.15}
      />
    </group>
  );
}
