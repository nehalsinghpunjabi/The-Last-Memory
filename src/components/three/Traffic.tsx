'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { scrollState } from '@/lib/scrollState';
import { makeRng, range } from '@/utils/random';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { readNumber, type Signal } from '@/utils/signal';

interface Props {
  device: DeviceProfile;
  count?: number;
  radius?: number;
  weight?: Signal<number>;
  color?: THREE.ColorRepresentation;
  /** 0 = flowing, 1 = stopped. Traffic is the first thing to die. */
  decay?: Signal<number>;
}

interface Lane {
  radius: number;
  height: number;
  speed: number;
  phase: number;
  tilt: number;
  length: number;
  /** HDR colour (may exceed 1) so bloom turns each craft into a glowing streak. */
  color: THREE.Color;
  thickness: number;
}

// A few vehicle "types", so the sky isn't one uniform colour of light. Warm
// amber dominates (the city's own key), with occasional cool transit craft.
const VEHICLE_COLORS: Array<[number, number, number]> = [
  [1.9, 1.4, 0.85], // warm headlight
  [1.9, 1.4, 0.85],
  [1.7, 1.25, 0.7], // warm amber
  [0.7, 1.3, 1.9], // cool transit
  [1.6, 1.7, 1.9], // white-hot
];

/**
 * Air traffic.
 *
 * Streaks of light on circular lanes at different altitudes — the single
 * cheapest thing that makes a city read as *inhabited* rather than modelled.
 * Rendered as HDR additive streaks (colour values above 1) so the bloom pass
 * blows each one into a glowing line of light; lanes are biased toward the
 * altitudes the camera actually flies through, and a low "arterial" band keeps
 * bright traffic weaving between the towers where it reads best.
 */
export function Traffic({
  device,
  count = 700,
  radius = 900,
  weight = 1,
  color,
  decay = 0,
}: Props) {
  const n = countFor(device, count, 160);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => (color ? new THREE.Color(color) : null), [color]);

  const lanes = useMemo<Lane[]>(() => {
    const rng = makeRng(88);
    return Array.from({ length: n }, (_, i) => {
      // Three bands. Low: bright arterial traffic weaving between the towers.
      // High: fast craft crossing the open sky *above* the skyline, where a
      // glowing streak reads cinematically against the haze. Mid: everything
      // else, threading the towers.
      const band = i % 3; // 0 low, 1 high, 2 mid
      const height =
        band === 0
          ? range(rng, 20, 150)
          : band === 1
            ? range(rng, 470, 720)
            : Math.pow(rng(), 1.4) * 340 + 90;

      const c = VEHICLE_COLORS[Math.floor(rng() * VEHICLE_COLORS.length)];
      const col = new THREE.Color(c[0], c[1], c[2]);
      // High craft run brighter so they hold up against the bright sky.
      if (band === 1) col.multiplyScalar(1.5);
      if (tint) col.multiply(tint);

      return {
        radius: range(rng, radius * 0.14, radius),
        height,
        // High craft move faster — longer visual streaks per frame of scroll.
        speed: range(rng, 0.03, 0.14) * (band === 1 ? 1.5 : 1) * (rng() < 0.5 ? -1 : 1),
        phase: rng() * Math.PI * 2,
        tilt: range(rng, -0.04, 0.04),
        length: band === 0 ? range(rng, 16, 38) : band === 1 ? range(rng, 20, 46) : range(rng, 6, 18),
        color: col,
        thickness: band === 2 ? range(rng, 0.4, 0.8) : range(rng, 0.8, 1.4),
      };
    });
  }, [n, radius, tint]);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // White base so the per-instance HDR colour comes through unmultiplied.
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  // Bake per-instance colour once. InstancedMesh.instanceColor drives the
  // per-craft tint automatically (the renderer sets USE_INSTANCING_COLOR when
  // it is present) — do NOT also set material.vertexColors, which would make
  // the shader look for a per-vertex colour attribute that doesn't exist and
  // render the craft as opaque black boxes.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    m.frustumCulled = false;
    const colors = new Float32Array(lanes.length * 3);
    for (let i = 0; i < lanes.length; i++) {
      colors[i * 3] = lanes[i].color.r;
      colors[i * 3 + 1] = lanes[i].color.g;
      colors[i * 3 + 2] = lanes[i].color.b;
    }
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    m.instanceColor.needsUpdate = true;
  }, [lanes]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;

    const w = readNumber(weight, 1);
    const d = readNumber(decay, 0);

    const visible = w > 0.004;
    m.visible = visible;
    if (!visible) return;

    const time = scrollState.elapsed;
    material.opacity = w * (1 - d);

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      // Vehicles stall and fall as the world dies.
      const a = lane.phase + time * lane.speed * (1 - d);
      const r = lane.radius;
      const y = lane.height * (1 - d * (0.3 + (i % 7) * 0.1));

      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      dummy.rotation.set(lane.tilt, -a, 0);
      dummy.scale.set(lane.length * (1 - d * 0.7), lane.thickness, lane.thickness);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, lanes.length]} material={material}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}
