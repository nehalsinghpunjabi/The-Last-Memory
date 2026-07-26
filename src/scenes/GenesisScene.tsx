'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  neuralLineFragmentShader,
  neuralLineVertexShader,
  neuralNodeFragmentShader,
  neuralNodeVertexShader,
} from '@/shaders/neural';
import { Atmosphere } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { buildNeuralGraph } from '@/utils/geometry';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { COLOR } from '@/lib/constants';
import { clamp, smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * CHAPTER I — First Light.
 *
 * A small-world neural graph suspended in nothing. The lattice does not exist
 * until the chapter begins: `uReveal` walks a threshold across per-edge seeds,
 * so the network *assembles itself* as the camera enters it, region by region,
 * the way a mind actually boots.
 *
 * Two draw calls render ~8,000 independently-timed energy pulses.
 */
export function GenesisScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[1];
  const chapter = CHAPTERS[1];

  const nodeCount = countFor(device, 900, 220);

  const graph = useMemo(
    () => buildNeuralGraph(nodeCount, 46, 1337, device.tier === 'low' ? 2 : 3),
    [nodeCount, device.tier]
  );

  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(graph.linePositions, 3));
    g.setAttribute('aProgress', new THREE.BufferAttribute(graph.lineProgress, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(graph.lineSeeds, 1));
    g.setAttribute('aLength', new THREE.BufferAttribute(graph.lineLengths, 1));
    return g;
  }, [graph]);

  const nodeGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(graph.nodePositions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(graph.nodeSizes, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(graph.nodeSeeds, 1));
    return g;
  }, [graph]);

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new THREE.Color(COLOR.signalDeep) },
      uPulseColor: { value: new THREE.Color(COLOR.signal) },
      uOpacity: { value: 0.8 },
      uSpeed: { value: 0.16 },
      uCorruption: { value: 0 },
    }),
    []
  );

  const nodeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uPixelRatio: { value: 1 },
      uCorruption: { value: 0 },
      uColor: { value: new THREE.Color(COLOR.neural) },
      uHotColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0.9 },
    }),
    []
  );

  const group = useRef<THREE.Group>(null);

  const lineMaterial = useShaderMaterial(
    () => ({
      vertexShader: neuralLineVertexShader,
      fragmentShader: neuralLineFragmentShader,
      uniforms: lineUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [lineUniforms]
  );

  const nodeMaterial = useShaderMaterial(
    () => ({
      vertexShader: neuralNodeVertexShader,
      fragmentShader: neuralNodeFragmentShader,
      uniforms: nodeUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [nodeUniforms]
  );

  useFrame(({ gl }, delta) => {
    const t = scrollState.eased;
    const time = scrollState.elapsed;
    const w = weight();

    // The lattice builds from the moment the chapter is approached and is fully
    // formed by the time the camera is inside it.
    const reveal = clamp(smoothstep(chapter.start - 0.02, chapter.start + 0.075, t));

    lineUniforms.uTime.value = time;
    lineUniforms.uReveal.value = reveal;
    lineUniforms.uOpacity.value = 0.85 * w;
    lineUniforms.uCorruption.value = scrollState.corruption;
    // Signals accelerate as the memory sharpens.
    lineUniforms.uSpeed.value = 0.1 + reveal * 0.14;

    nodeUniforms.uTime.value = time;
    nodeUniforms.uReveal.value = reveal;
    nodeUniforms.uOpacity.value = 0.95 * w;
    nodeUniforms.uPixelRatio.value = gl.getPixelRatio();
    nodeUniforms.uCorruption.value = scrollState.corruption;

    if (group.current) {
      group.current.visible = w > 0.003;
      group.current.rotation.y += Math.min(delta, 0.1) * 0.012;
    }
  });

  return (
    <group ref={group} position={[0, originY, -20]}>
      <lineSegments geometry={lineGeometry} frustumCulled={false}>
        <primitive object={lineMaterial} attach="material" />
      </lineSegments>

      <points geometry={nodeGeometry} frustumCulled={false}>
        <primitive object={nodeMaterial} attach="material" />
      </points>

      <Atmosphere
        radius={300}
        colorA="#04101f"
        colorB="#1d4a75"
        density={1.15}
        opacity={0.55}
        weight={weight}
      />

      <DustField
        device={device}
        count={2600}
        radius={90}
        seed={17}
        color="#8fc8ff"
        colorAlt="#ffffff"
        opacity={0.4}
        spread={5}
        flow={0.7}
        weight={weight}
      />
    </group>
  );
}
