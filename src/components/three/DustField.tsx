'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { dustFragmentShader, dustVertexShader } from '@/shaders/particles';
import { buildDust, pointCloudGeometry } from '@/utils/geometry';
import { scrollState } from '@/lib/scrollState';
import { quality } from '@/lib/quality';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { readNumber, type Signal } from '@/utils/signal';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
  count?: number;
  radius?: number;
  seed?: number;
  color?: THREE.ColorRepresentation;
  colorAlt?: THREE.ColorRepresentation;
  opacity?: number;
  spread?: Signal<number>;
  flow?: Signal<number>;
  flatten?: number;
  /** World-space point the motes are drawn toward. */
  attractor?: [number, number, number];
  attraction?: Signal<number>;
  /** Multiplied into opacity by the parent scene's fade weight. */
  weight?: Signal<number>;
  corruptionResponse?: number;
}

/**
 * Atmospheric motes.
 *
 * Reused by nearly every chapter with different colours and behaviour: memory
 * dust in the archive, embers in the collapse, and the sparse, almost-still
 * particulate of empty space. One draw call each; all motion in the shader.
 */
export function DustField({
  device,
  count = 2400,
  radius = 80,
  seed = 5,
  color = '#9fd8ff',
  colorAlt = '#ffd9a0',
  opacity = 0.5,
  spread = 6,
  flow = 1,
  flatten = 1,
  attractor,
  attraction = 0,
  weight = 1,
  corruptionResponse = 1,
}: Props) {
  const resolved = countFor(device, count, 200);

  const geometry = useMemo(
    () => pointCloudGeometry(buildDust(resolved, radius, seed, flatten)),
    [resolved, radius, seed, flatten]
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSpread: { value: readNumber(spread, 6) },
      uFlow: { value: readNumber(flow, 1) },
      uCorruption: { value: 0 },
      uAttractor: { value: new THREE.Vector3(...(attractor ?? [0, 0, 0])) },
      uAttraction: { value: readNumber(attraction, 0) },
      uColor: { value: new THREE.Color(color) },
      uColorAlt: { value: new THREE.Color(colorAlt) },
      uOpacity: { value: opacity },
    }),
    // Uniform object is created once; values are updated below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const points = useRef<THREE.Points>(null);

  const material = useShaderMaterial(
    () => ({
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  // Live particle budget. Additive motes are pure overdraw — the cheapest
  // quality dial in the film and the first thing to give up when the GPU is
  // struggling. Rather than rebuild the buffer (which would allocate mid-shot
  // and visibly re-seed the field), we simply draw fewer of the same points:
  // the survivors keep their exact positions, so the field thins rather than
  // changing. Tracked so setDrawRange is only touched when the budget moves.
  const drawn = useRef(resolved);

  useFrame(({ gl }) => {
    const w = readNumber(weight, 1);
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
    uniforms.uCorruption.value = scrollState.corruption * corruptionResponse;
    uniforms.uOpacity.value = opacity * w;
    uniforms.uAttraction.value = readNumber(attraction, 0);
    uniforms.uSpread.value = readNumber(spread, 6);
    uniforms.uFlow.value = readNumber(flow, 1);
    if (points.current) points.current.visible = w > 0.002;

    const budget = Math.max(
      120,
      Math.round(resolved * (quality.perfMode ? (quality.struggling ? 0.4 : 0.62) : 1))
    );
    if (budget !== drawn.current) {
      drawn.current = budget;
      geometry.setDrawRange(0, budget);
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </points>
  );
}
