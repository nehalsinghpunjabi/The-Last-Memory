'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  coreFragmentShader,
  coreGlowFragmentShader,
  coreGlowVertexShader,
  coreVertexShader,
} from '@/shaders/core';
import { computeCoreLife } from '@/lib/director';
import { sampleCoreAnchor } from '@/lib/coreRail';
import { scrollState } from '@/lib/scrollState';
import { COLOR } from '@/lib/constants';
import { damp, lerp } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
}

/**
 * The AI.
 *
 * Three nested pieces: a displaced, self-emissive body; a volumetric halo; and
 * a point light that actually illuminates the world around it, so the core is
 * not just bright *on screen* — it is the light source of every chapter.
 *
 * As `life` falls the body calms, the halo shrinks, and the light it casts goes
 * from cold white-blue to a single dull ember. Nothing about the death is
 * animated by hand; it is entirely a function of scroll position.
 */
export function AICore({ device }: Props) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const lifeRef = useRef(0.2);

  const detail = device.tier === 'high' ? 64 : device.tier === 'medium' ? 40 : 24;

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLife: { value: 0.2 },
      uPulse: { value: 1 },
      uCorruption: { value: 0 },
      uDisplace: { value: 0.28 },
      uColorInner: { value: new THREE.Color(COLOR.sun) },
      uColorOuter: { value: new THREE.Color(COLOR.signal) },
      uColorDecay: { value: new THREE.Color(COLOR.decay) },
      uIntensity: { value: 1.6 },
    }),
    []
  );

  const glowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLife: { value: 0.2 },
      uColor: { value: new THREE.Color(COLOR.signal) },
      uIntensity: { value: 1.1 },
    }),
    []
  );

  const coreMaterial = useShaderMaterial(
    () => ({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: coreUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [coreUniforms]
  );

  const glowMaterial = useShaderMaterial(
    () => ({
      vertexShader: coreGlowVertexShader,
      fragmentShader: coreGlowFragmentShader,
      uniforms: glowUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
    [glowUniforms]
  );

  const warmColor = useMemo(() => new THREE.Color(COLOR.gold), []);
  const coldColor = useMemo(() => new THREE.Color(COLOR.signal), []);
  const decayColor = useMemo(() => new THREE.Color(COLOR.decay), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const t = scrollState.eased;
    const time = scrollState.elapsed;

    const anchor = sampleCoreAnchor(t);
    if (group.current) {
      group.current.position.lerp(anchor.position, 1 - Math.exp(-6 * delta));
      const s = damp(group.current.scale.x, anchor.scale, 4, delta);
      group.current.scale.setScalar(s);
    }

    const targetLife = computeCoreLife(t);
    lifeRef.current = damp(lifeRef.current, targetLife, 3.2, delta);
    const life = lifeRef.current;
    const corruption = scrollState.corruption;

    // Warmth: the core takes on the colour of what it is remembering.
    const warmth =
      t < 0.235 ? 0 : t < 0.575 ? (t - 0.235) / 0.34 : t < 0.715 ? 1 - (t - 0.575) / 0.14 : t < 0.835 ? 0 : (t - 0.835) / 0.165;

    tmp.copy(coldColor).lerp(warmColor, Math.max(0, Math.min(1, warmth)));
    tmp.lerp(decayColor, corruption * 0.5);

    coreUniforms.uTime.value = time;
    coreUniforms.uLife.value = life;
    coreUniforms.uCorruption.value = corruption;
    coreUniforms.uPulse.value = lerp(0.4, 1.4, life);
    coreUniforms.uDisplace.value = lerp(0.16, 0.34, life) + corruption * 0.12;
    (coreUniforms.uColorOuter.value as THREE.Color).copy(tmp);
    coreUniforms.uIntensity.value = lerp(0.5, 2.1, life);

    glowUniforms.uTime.value = time;
    glowUniforms.uLife.value = life;
    (glowUniforms.uColor.value as THREE.Color).copy(tmp);
    glowUniforms.uIntensity.value = lerp(0.25, 1.35, life);

    if (halo.current) {
      const beat = 1 + Math.sin(time * lerp(0.7, 2.2, life)) * 0.03 * life;
      halo.current.scale.setScalar(lerp(1.5, 2.4, life) * beat);
    }

    if (body.current) {
      body.current.rotation.y += delta * 0.06 * (0.3 + life);
      body.current.rotation.x += delta * 0.021;
    }

    if (light.current) {
      light.current.intensity = lerp(4, 220, life) * (1 - corruption * 0.35);
      light.current.distance = lerp(60, 420, life);
      light.current.color.copy(tmp);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={body}>
        <icosahedronGeometry args={[1, detail >= 64 ? 6 : detail >= 40 ? 4 : 3]} />
        <primitive object={coreMaterial} attach="material" />
      </mesh>

      <mesh ref={halo} scale={2}>
        <sphereGeometry args={[1, 48, 32]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>

      <pointLight ref={light} intensity={40} distance={260} decay={2} color={COLOR.signal} />
    </group>
  );
}
