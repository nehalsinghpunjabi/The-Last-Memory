'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildRing } from '@/utils/geometry';
import { scrollState } from '@/lib/scrollState';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { readNumber, type Signal } from '@/utils/signal';

interface Props {
  device: DeviceProfile;
  count?: number;
  radius?: number;
  thickness?: number;
  tilt?: number;
  seed?: number;
  weight?: Signal<number>;
  color?: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  spin?: number;
  /** Rings break apart in Chapter IV. */
  decay?: Signal<number>;
  position?: [number, number, number];
}

/**
 * Orbital infrastructure — a habitat ring, seen from below.
 *
 * Rendered as instanced segments rather than a solid torus so it can shatter:
 * raising `decay` pushes each segment outward along its own orbit until the
 * ring becomes a debris field.
 */
export function OrbitalRing({
  device,
  count = 900,
  radius = 620,
  thickness = 14,
  tilt = 0.35,
  seed = 99,
  weight = 1,
  color = '#e8e4dc',
  emissive = '#ffd9a0',
  spin = 0.006,
  decay = 0,
  position = [0, 0, 0],
}: Props) {
  const n = countFor(device, count, 180);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);

  const matrices = useMemo(() => buildRing(n, radius, thickness, tilt, seed), [n, radius, thickness, tilt, seed]);

  const scattered = useMemo(
    () =>
      matrices.map((m) => {
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        return p.clone().normalize().multiplyScalar(1 + Math.random() * 0.8);
      }),
    [matrices]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const basePos = useMemo(() => matrices.map((m) => new THREE.Vector3().setFromMatrixPosition(m)), [matrices]);
  const baseScale = useMemo(
    () =>
      matrices.map((m) => {
        const s = new THREE.Vector3();
        m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
        return s;
      }),
    [matrices]
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        // Strong self-emission so the band glows as an orbital structure rather
        // than reading as dark metal whenever it faces away from the sun.
        emissiveIntensity: 1.6,
        roughness: 0.4,
        metalness: 0.7,
        transparent: true,
        opacity: 1,
      }),
    [color, emissive]
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < matrices.length; i++) m.setMatrixAt(i, matrices[i]);
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
  }, [matrices]);

  const lastDecay = useRef(-1);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const w = readNumber(weight, 1);
    const d = readNumber(decay, 0);

    m.visible = w > 0.004;
    material.opacity = w;
    material.emissiveIntensity = 1.6 * (1 - d) + 0.1;

    if (group.current) group.current.rotation.y += Math.min(delta, 0.1) * spin * (1 - d * 0.9);

    // Only rebuild instance matrices when the ring is actually breaking up.
    if (d > 0.001 && Math.abs(d - lastDecay.current) > 0.002) {
      lastDecay.current = d;
      const t = scrollState.elapsed;
      for (let i = 0; i < matrices.length; i++) {
        const base = basePos[i];
        const dir = scattered[i];
        dummy.position.copy(base).addScaledVector(dir, d * d * 220);
        dummy.position.y -= d * d * 90 * (0.4 + (i % 5) * 0.15);
        dummy.rotation.set(t * 0.2 * d + i, t * 0.15 * d, i * 0.3);
        dummy.scale.copy(baseScale[i]);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={position}>
      <instancedMesh ref={mesh} args={[undefined, undefined, matrices.length]} material={material}>
        <boxGeometry args={[6, 2.2, 2.2]} />
      </instancedMesh>
    </group>
  );
}
