'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Atmosphere } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { buildDebris } from '@/utils/geometry';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { scrollState } from '@/lib/scrollState';
import { makeRng, range } from '@/utils/random';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * CHAPTER V — Solitude.
 *
 * The hardest scene to get right, because it is defined by absence. Almost
 * nothing moves: a handful of dead satellites turning very slowly, debris that
 * has long since stopped tumbling, and a dust field with the flow turned down
 * to a near standstill.
 *
 * The temptation is to fill this chapter. Everything here is a decision *not*
 * to — the emptiness is the content, and the audience needs to sit in it long
 * enough to feel how long four hundred years is.
 */
export function SolitudeScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[5];
  const group = useRef<THREE.Group>(null);
  const debrisMesh = useRef<THREE.InstancedMesh>(null);

  const debrisCount = countFor(device, 260, 60);
  const { matrices } = useMemo(() => buildDebris(debrisCount, 190, 88), [debrisCount]);

  const debrisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#39434f'),
        roughness: 0.95,
        metalness: 0.35,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  // Dead satellites: recognisable silhouettes, still holding formation.
  const satellites = useMemo(() => {
    const rng = makeRng(404);
    const n = device.tier === 'low' ? 4 : 9;
    return Array.from({ length: n }, () => ({
      position: [range(rng, -70, 70), range(rng, -26, 26), range(rng, -140, 20)] as [number, number, number],
      rotation: [range(rng, 0, Math.PI), range(rng, 0, Math.PI), range(rng, 0, Math.PI)] as [
        number,
        number,
        number,
      ],
      spin: range(rng, -0.03, 0.03),
      scale: range(rng, 0.6, 2.2),
      panel: range(rng, 3, 7),
    }));
  }, [device.tier]);

  const satelliteRefs = useRef<Array<THREE.Group | null>>([]);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#7d8794'),
        roughness: 0.7,
        metalness: 0.7,
        transparent: true,
      }),
    []
  );

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1c2a3a'),
        roughness: 0.35,
        metalness: 0.85,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    []
  );

  useLayoutEffect(() => {
    const m = debrisMesh.current;
    if (!m) return;
    for (let i = 0; i < matrices.length; i++) m.setMatrixAt(i, matrices[i]);
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
  }, [matrices]);

  useFrame((_, delta) => {
    const w = weight();
    const d = Math.min(delta, 0.1);

    if (group.current) group.current.visible = w > 0.003;
    debrisMaterial.opacity = w;
    bodyMaterial.opacity = w;
    panelMaterial.opacity = w;

    // The only motion in the entire chapter.
    for (let i = 0; i < satellites.length; i++) {
      const node = satelliteRefs.current[i];
      if (node) node.rotation.y += d * satellites[i].spin;
    }

    if (debrisMesh.current) {
      debrisMesh.current.rotation.y += d * 0.002;
    }
  });

  return (
    <group ref={group} position={[0, originY, 0]}>
      {/* One cold, distant key. There is no sun here. */}
      <ambientLight intensity={0.06} color="#2a3a4a" />
      <directionalLight position={[-200, 60, 120]} intensity={0.35} color="#7ea2c4" />

      <instancedMesh
        ref={debrisMesh}
        args={[undefined, undefined, matrices.length]}
        material={debrisMaterial}
      >
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>

      {satellites.map((s, i) => (
        <group
          key={i}
          ref={(node) => {
            satelliteRefs.current[i] = node;
          }}
          position={s.position}
          rotation={s.rotation}
          scale={s.scale}
        >
          <mesh material={bodyMaterial}>
            <boxGeometry args={[1.6, 1.6, 2.6]} />
          </mesh>
          <mesh material={bodyMaterial} position={[0, 0, 1.8]}>
            <cylinderGeometry args={[0.9, 0.2, 1.2, 12]} />
          </mesh>
          {/* Solar arrays, still pointed at a star that no longer matters. */}
          <mesh material={panelMaterial} position={[s.panel, 0, 0]}>
            <boxGeometry args={[s.panel * 1.6, 0.06, 1.8]} />
          </mesh>
          <mesh material={panelMaterial} position={[-s.panel, 0, 0]}>
            <boxGeometry args={[s.panel * 1.6, 0.06, 1.8]} />
          </mesh>
        </group>
      ))}

      <Atmosphere
        radius={600}
        colorA="#010306"
        colorB="#0a1826"
        density={0.35}
        opacity={0.28}
        weight={weight}
        segments={24}
      />

      {/* Barely-there particulate. Flow is almost zero: nothing is happening. */}
      <DustField
        device={device}
        count={1200}
        radius={220}
        seed={97}
        color="#6d8ba8"
        colorAlt="#9fb8d0"
        opacity={0.22}
        spread={4}
        flow={0.12}
        weight={weight}
        corruptionResponse={0.3}
      />
    </group>
  );
}
