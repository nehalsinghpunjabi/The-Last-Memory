'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { crystalFragmentShader, crystalVertexShader } from '@/shaders/crystal';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { clamp, lerp, smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * FINAL REVEAL.
 *
 * The trick of the ending is that nothing moves except the camera.
 *
 * The crystal is a 22-unit faceted shell centred on the final photograph, and
 * the camera *starts inside it* — which is why the audience never saw it. As
 * the rail pulls back to z=900 the shell resolves into a single object, and the
 * entire film they have just watched is revealed to have been happening inside
 * something small enough to hold.
 *
 * Rendered double-sided so the interior is valid, and with `uLife` falling to
 * zero over the last 2% of the timeline: the light inside goes out, and then
 * the stars do.
 */
export function RevealScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[7];
  const chapter = CHAPTERS[7];

  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  const detail = device.tier === 'high' ? 2 : 1;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#bcd9f5') },
      uInnerColor: { value: new THREE.Color('#ffd9a0') },
      uOpacity: { value: 0 },
      uPower: { value: 1.4 },
      uLife: { value: 1 },
      uFacet: { value: 0.16 },
    }),
    []
  );

  const innerUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffe2b8') },
      uInnerColor: { value: new THREE.Color('#fff0d6') },
      uOpacity: { value: 0 },
      uPower: { value: 1.0 },
      uLife: { value: 1 },
      uFacet: { value: 0.05 },
    }),
    []
  );

  const shellMaterial = useShaderMaterial(
    () => ({
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    [uniforms]
  );

  const innerMaterial = useShaderMaterial(
    () => ({
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      uniforms: innerUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    [innerUniforms]
  );

  useFrame((_, delta) => {
    const t = scrollState.eased;
    const w = weight();
    const local = clamp((t - chapter.start) / (chapter.end - chapter.start));

    uniforms.uTime.value = scrollState.elapsed;
    innerUniforms.uTime.value = scrollState.elapsed;

    // The crystal only becomes visible once the camera has begun to pull back
    // — after the held "Humanity." beat and its silence — so the reveal reads
    // as an object appearing around the photograph rather than a wall over it.
    const materialise = smoothstep(0.28, 0.58, local);
    // Kept translucent, not luminous: additive bloom on a near-frame-filling
    // crystal reads as a blown-out white ball. Held low so it stays a faceted
    // jewel with bright rim and inner caustics — a thing you could hold, not a
    // light source.
    uniforms.uOpacity.value = materialise * w * 0.6;
    innerUniforms.uOpacity.value = materialise * w * 0.32;

    // The last light.
    const life = 1 - smoothstep(0.62, 0.97, local);
    uniforms.uLife.value = life;
    innerUniforms.uLife.value = life;
    uniforms.uPower.value = lerp(0.3, 0.85, life);

    if (group.current) {
      group.current.visible = w > 0.002;
      group.current.rotation.y += Math.min(delta, 0.1) * 0.035;
      group.current.rotation.x = Math.sin(scrollState.elapsed * 0.07) * 0.06;
    }
    if (inner.current) {
      inner.current.rotation.y -= Math.min(delta, 0.1) * 0.09;
      inner.current.scale.setScalar(lerp(0.3, 0.62, life));
    }
  });

  return (
    <group ref={group} position={[0, originY, -3]}>
      {/* The crystal shell — the camera begins inside this. */}
      <mesh ref={shell} material={shellMaterial}>
        <icosahedronGeometry args={[22, detail]} />
      </mesh>

      {/* The light held inside it. */}
      <mesh ref={inner} scale={0.5} material={innerMaterial}>
        <icosahedronGeometry args={[22, detail]} />
      </mesh>
    </group>
  );
}
