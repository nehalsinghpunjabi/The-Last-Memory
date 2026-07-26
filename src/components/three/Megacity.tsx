'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { structureFragmentShader, structureVertexShader } from '@/shaders/structures';
import { buildCity } from '@/utils/geometry';
import { scrollState } from '@/lib/scrollState';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { readNumber, type Signal } from '@/utils/signal';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
  /** 0 = the Golden Age, 1 = rubble. */
  decay: Signal<number>;
  /** 0..1 build-in. */
  reveal: Signal<number>;
  weight: Signal<number>;
  seed?: number;
  extent?: number;
  baseColor?: THREE.ColorRepresentation;
  windowColor?: THREE.ColorRepresentation;
  accentColor?: THREE.ColorRepresentation;
  skyColor?: THREE.ColorRepresentation;
  windowDensity?: number;
  emissive?: number;
  /** Atmospheric perspective — distant towers fade to this warm haze. */
  hazeColor?: THREE.ColorRepresentation;
  /** Exponential fog rate (per world unit). Larger = shorter visibility. */
  hazeDensity?: number;
  /** Overall strength of the distance haze, 0..1. */
  hazeStrength?: number;
  /** Extra haze pooled at the ground so tower bases dissolve first. */
  groundHaze?: number;
  /** How fast ground haze thins with height. */
  groundHazeFalloff?: number;
}

/**
 * The city.
 *
 * Deliberately shared between Chapter III and Chapter IV: it is the *same*
 * city, the same seed, the same towers — only `decay` differs. When the world
 * collapses the audience is watching the exact skyline they were just given,
 * which is the only way the loss lands.
 *
 * One instanced draw call for tens of thousands of buildings; windows, soot,
 * erosion and structural failure all live in the shader.
 */
export function Megacity({
  device,
  decay,
  reveal,
  weight,
  seed = 7,
  extent = 1400,
  baseColor = '#3a3f52',
  windowColor = '#ffd9a0',
  accentColor = '#9fd8ff',
  skyColor = '#ff9b52',
  windowDensity = 0.34,
  emissive = 1.6,
  hazeColor = '#ff9b52',
  hazeDensity = 0.00055,
  hazeStrength = 0.9,
  groundHaze = 1.6,
  groundHazeFalloff = 0.0075,
}: Props) {
  const count = countFor(device, 2600, 500);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const blocks = useMemo(() => buildCity(count, extent, seed), [count, extent, seed]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const seeds = new Float32Array(blocks.length);
    const heights = new Float32Array(blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      seeds[i] = blocks[i].seed;
      heights[i] = blocks[i].height;
    }
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    return g;
  }, [blocks]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDecay: { value: 0 },
      uReveal: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseColor) },
      uWindowColor: { value: new THREE.Color(windowColor) },
      uAccentColor: { value: new THREE.Color(accentColor) },
      uSkyColor: { value: new THREE.Color(skyColor) },
      uWindowDensity: { value: windowDensity },
      uOpacity: { value: 1 },
      uEmissive: { value: emissive },
      uHazeColor: { value: new THREE.Color(hazeColor) },
      uHazeDensity: { value: hazeDensity },
      uHazeStrength: { value: hazeStrength },
      uGroundHaze: { value: groundHaze },
      uGroundHazeFalloff: { value: groundHazeFalloff },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const material = useShaderMaterial(
    () => ({
      vertexShader: structureVertexShader,
      fragmentShader: structureFragmentShader,
      uniforms,
      transparent: true,
    }),
    [uniforms]
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < blocks.length; i++) {
      m.setMatrixAt(i, blocks[i].matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [blocks]);

  useFrame(() => {
    const w = readNumber(weight, 1);
    const r = readNumber(reveal, 1);
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uDecay.value = readNumber(decay, 0);
    uniforms.uReveal.value = r;
    uniforms.uOpacity.value = w;
    if (mesh.current) mesh.current.visible = w > 0.003 && r > 0.001;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}
