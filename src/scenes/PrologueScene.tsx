'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Atmosphere } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { scrollState } from '@/lib/scrollState';
import { COLOR } from '@/lib/constants';
import { smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';

interface Props {
  device: DeviceProfile;
  /** Live scene fade weight — read every frame, never a render dependency. */
  weight: () => number;
}

/**
 * PROLOGUE — System Failure.
 *
 * Almost nothing. A containment gantry around the core, a diagnostic grid that
 * scans and fails, and dust. The restraint is the point: the audience should
 * arrive in what feels like an empty room with one dying light in it, and only
 * gradually notice they are inside a machine.
 */
export function PrologueScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[0];
  const rings = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.LineSegments>(null);

  // Diagnostic grid: a wireframe sphere the core is suspended inside.
  const gridGeometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(9, 24, 12);
    return new THREE.WireframeGeometry(sphere);
  }, []);

  const gridMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(COLOR.signalDeep),
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLOR.signal),
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((_, delta) => {
    const t = scrollState.eased;
    const d = Math.min(delta, 0.1);
    const w = weight();

    if (rings.current) {
      rings.current.rotation.y += d * 0.06;
      rings.current.rotation.x += d * 0.017;
      rings.current.visible = w > 0.004;
    }

    // The grid stutters — a diagnostic that keeps failing to complete.
    const stutter = Math.sin(scrollState.elapsed * 3.1) > 0.7 ? 0.35 : 1;
    gridMaterial.opacity = 0.14 * w * stutter * (1 - smoothstep(0.05, 0.09, t));
    ringMaterial.opacity = 0.26 * w;

    if (gridRef.current) {
      gridRef.current.rotation.y -= d * 0.03;
      gridRef.current.visible = gridMaterial.opacity > 0.002;
    }
  });

  return (
    <group position={[0, originY, 0]}>
      <lineSegments ref={gridRef} geometry={gridGeometry} material={gridMaterial} />

      {/* Containment gantry — three tori on different axes. */}
      <group ref={rings}>
        {[
          { r: 4.2, tube: 0.03, rot: [0, 0, 0] as [number, number, number] },
          { r: 5.4, tube: 0.022, rot: [Math.PI / 2.2, 0.4, 0] as [number, number, number] },
          { r: 6.8, tube: 0.016, rot: [0.7, 1.2, 0.3] as [number, number, number] },
        ].map((ring, i) => (
          <mesh key={i} rotation={ring.rot} material={ringMaterial}>
            <torusGeometry args={[ring.r, ring.tube, 6, 128]} />
          </mesh>
        ))}
      </group>

      <Atmosphere
        radius={220}
        colorA="#050a12"
        colorB="#0d2033"
        density={1.3}
        opacity={0.5}
        weight={weight}
        segments={24}
      />

      <DustField
        device={device}
        count={1400}
        radius={60}
        seed={3}
        color="#7fb4e0"
        colorAlt="#c8e4ff"
        opacity={0.35}
        spread={3}
        flow={0.4}
        weight={weight}
      />
    </group>
  );
}
