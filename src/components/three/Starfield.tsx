'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { starFragmentShader, starVertexShader } from '@/shaders/particles';
import { buildStars } from '@/utils/geometry';
import { scrollState } from '@/lib/scrollState';
import { smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
}

/**
 * The sky.
 *
 * Parented to the camera position (but not its rotation) so it is effectively
 * at infinity — the camera can travel 4,000 units and the stars never shift,
 * which is what makes the pull-back at the end feel like real distance.
 *
 * The stars go out at the very end. Not all at once: the fade is driven through
 * a smoothstep so the sky empties over the last few percent of the timeline.
 */
export function Starfield({ device }: Props) {
  const points = useRef<THREE.Points>(null);
  const { camera } = useThree();

  const count = countFor(device, 4200, 900);

  const geometry = useMemo(() => {
    const field = buildStars(count, 2600, 11);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(field.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(field.sizes, 1));
    g.setAttribute('aTemp', new THREE.BufferAttribute(field.temps, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(field.seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2700);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0.85 },
      uFade: { value: 1 },
    }),
    []
  );

  const material = useShaderMaterial(
    () => ({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  useFrame(({ gl }) => {
    const t = scrollState.eased;
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uPixelRatio.value = gl.getPixelRatio();

    // Star visibility is dramaturgy, not occlusion.
    //
    //   · a glimpse in the prologue — you are somewhere, but where?
    //   · gone inside the lattice, the archive and the city
    //   · full sky through the collapse and the solitude: this is the shot
    //     where the emptiness has to be legible
    //   · pulled almost all the way down for the last memory. That chapter is
    //     intimate and warm and six feet wide; a universe behind the
    //     photograph would undo it.
    //   · back for the reveal, and then they go out.
    const prologue = smoothstep(0.0, 0.04, t) * (1 - smoothstep(0.06, 0.2, t)) * 0.5;
    const emptiness = smoothstep(0.6, 0.72, t);
    const intimacy = 1 - smoothstep(0.83, 0.87, t) * 0.88;
    const returning = smoothstep(0.945, 0.965, t) * 0.85;

    const visibility = Math.min(1, (prologue + emptiness * intimacy + returning) * 0.95 + 0.04);

    uniforms.uOpacity.value = visibility;
    // The stars themselves die last, after the crystal.
    uniforms.uFade.value = 1 - smoothstep(0.978, 0.996, t);

    if (points.current) {
      points.current.position.copy(camera.position);
      points.current.rotation.y = scrollState.elapsed * 0.0015;
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </points>
  );
}
