'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  shaftFragmentShader,
  shaftVertexShader,
} from '@/shaders/atmosphere';
import { scrollState } from '@/lib/scrollState';
import { readNumber, type Signal } from '@/utils/signal';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface AtmosphereProps {
  radius?: number;
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  density?: Signal<number>;
  opacity?: number;
  horizon?: number;
  weight?: Signal<number>;
  segments?: number;
}

/**
 * Volumetric shell. Wraps a chapter's environment in drifting nebulosity so
 * that "darkness" has structure — an empty black background is the fastest way
 * to make a 3D scene look unfinished.
 */
export function Atmosphere({
  radius = 320,
  colorA = '#0a1626',
  colorB = '#1b3a5c',
  density = 1,
  opacity = 0.5,
  horizon = 1,
  weight = 1,
  segments = 32,
}: AtmosphereProps) {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uDensity: { value: readNumber(density, 1) },
      uOpacity: { value: opacity },
      uHorizon: { value: horizon },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const material = useShaderMaterial(
    () => ({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  useFrame(() => {
    const w = readNumber(weight, 1);
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uOpacity.value = opacity * w;
    uniforms.uDensity.value = readNumber(density, 1);
    if (mesh.current) mesh.current.visible = w > 0.003;
  });

  return (
    <mesh ref={mesh} frustumCulled={false}>
      <sphereGeometry args={[radius, segments, segments / 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface ShaftProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
  softness?: number;
  weight?: Signal<number>;
}

/**
 * A single light shaft. Billboarded manually toward the camera on the Y axis
 * only, so it behaves like a real volumetric beam rather than a sticker.
 */
export function LightShaft({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 40,
  height = 200,
  color = '#ffd9a0',
  opacity = 0.35,
  softness = 2.2,
  weight = 1,
}: ShaftProps) {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uSoftness: { value: softness },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const material = useShaderMaterial(
    () => ({
      vertexShader: shaftVertexShader,
      fragmentShader: shaftFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  useFrame(({ camera }) => {
    const w = readNumber(weight, 1);
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uOpacity.value = opacity * w;
    if (mesh.current) {
      mesh.current.visible = w > 0.003;
      // Y-axis billboard.
      const dx = camera.position.x - mesh.current.position.x;
      const dz = camera.position.z - mesh.current.position.z;
      mesh.current.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <mesh ref={mesh} position={position} rotation={rotation}>
      <planeGeometry args={[width, height, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
