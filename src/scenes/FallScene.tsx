'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Atmosphere } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { Megacity } from '@/components/three/Megacity';
import { OrbitalRing } from '@/components/three/OrbitalRing';
import { Traffic } from '@/components/three/Traffic';
import { hologramFragmentShader, hologramVertexShader } from '@/shaders/hologram';
import { MEMORY_KINDS, getMemoryTexture } from '@/assets/memoryTextures';
import { buildDebris } from '@/utils/geometry';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { clamp, smoothstep } from '@/utils/math';
import { makeRng, range } from '@/utils/random';
import type { DeviceProfile } from '@/utils/device';
import { countFor } from '@/utils/device';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

/**
 * CHAPTER IV — The Fall.
 *
 * The same city, the same seed, the same towers as Chapter III — with `decay`
 * driven from 0 to 1 by scroll. Windows go dark in seeded waves, soot creeps
 * over the surfaces, geometry is eroded out of existence by a noise threshold,
 * and the habitat rings break into debris.
 *
 * Memories are physically escaping in this chapter: photo fragments tumble past
 * the camera, corrupting as they go, and the AI's narration fails mid-sentence.
 */
export function FallScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[4];
  const chapter = CHAPTERS[4];

  const decayRef = useRef(0);
  const group = useRef<THREE.Group>(null);
  const debrisMesh = useRef<THREE.InstancedMesh>(null);

  const debrisCount = countFor(device, 420, 90);
  const { matrices, drift } = useMemo(() => buildDebris(debrisCount, 260, 42), [debrisCount]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const basePositions = useMemo(
    () => matrices.map((m) => new THREE.Vector3().setFromMatrixPosition(m)),
    [matrices]
  );
  // Decomposed once at build time — never per frame.
  const baseScales = useMemo(
    () =>
      matrices.map((m) => {
        const s = new THREE.Vector3();
        m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
        return s;
      }),
    [matrices]
  );

  const debrisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4a3a33'),
        emissive: new THREE.Color('#ff5a2a'),
        emissiveIntensity: 0.35,
        roughness: 0.9,
        metalness: 0.2,
        transparent: true,
      }),
    []
  );

  // Memories physically tearing loose and tumbling away.
  const escaping = useMemo(() => {
    const rng = makeRng(555);
    const n = device.tier === 'high' ? 14 : device.tier === 'medium' ? 9 : 5;
    return Array.from({ length: n }, () => ({
      position: [range(rng, -60, 60), range(rng, -30, 40), range(rng, -90, 40)] as [number, number, number],
      rotationSpeed: [range(rng, -0.3, 0.3), range(rng, -0.4, 0.4), range(rng, -0.2, 0.2)] as [
        number,
        number,
        number,
      ],
      scale: range(rng, 5, 16),
      seed: Math.floor(rng() * 100000),
      kind: MEMORY_KINDS[Math.floor(rng() * MEMORY_KINDS.length)],
      drift: [range(rng, -6, 6), range(rng, 2, 14), range(rng, -10, 4)] as [number, number, number],
    }));
  }, [device.tier]);

  // Shared texture pool — these shards tumble past at speed under heavy
  // corruption, so a handful of re-used images is indistinguishable from a
  // unique one per shard and keeps far less texture memory resident.
  const escapingUniforms = useMemo(
    () =>
      escaping.map((f, i) => ({
        uTexture: { value: getMemoryTexture(f.kind, 8000 + (i % 5) * 613, 256) },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uCorruption: { value: 0 },
        uReveal: { value: 1 },
        uTint: { value: new THREE.Color('#ffb08a') },
        uScanIntensity: { value: 1.3 },
        uWarmth: { value: 0.3 },
        uSeed: { value: f.seed % 97 },
        uCurl: { value: 0.8 },
        uFocus: { value: 1 },
        // These shards tumble past at speed under heavy corruption. They are
        // deliberately *not* artifacts: a click target that is spinning and
        // accelerating away would be a frustration, not a discovery. The
        // Winters' records are reached through the guide and the timeline.
        uArtifact: { value: 0 },
        uHover: { value: 0 },
      })),
    [escaping]
  );

  // Own the materials directly — a uniforms object handed to <shaderMaterial>
  // as a prop is reconciled, not assigned, so the material renders a clone the
  // useFrame below never touches. See utils/useShaderMaterial.
  const escapingMaterials = useMemo(
    () =>
      escapingUniforms.map(
        (uniforms) =>
          new THREE.ShaderMaterial({
            vertexShader: hologramVertexShader,
            fragmentShader: hologramFragmentShader,
            uniforms,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          })
      ),
    [escapingUniforms]
  );
  useEffect(() => () => escapingMaterials.forEach((m) => m.dispose()), [escapingMaterials]);

  const escapingRefs = useRef<Array<THREE.Group | null>>([]);
  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(1, 0.7, 10, 10), []);

  useLayoutEffect(() => {
    const m = debrisMesh.current;
    if (!m) return;
    for (let i = 0; i < matrices.length; i++) m.setMatrixAt(i, matrices[i]);
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
  }, [matrices]);

  useFrame(() => {
    const t = scrollState.eased;
    const time = scrollState.elapsed;
    const w = weight();
    const corruption = scrollState.corruption;

    // The collapse itself. Starts before the chapter formally begins so the
    // Golden Age is already dying while the audience still thinks it is safe.
    const decay = clamp(smoothstep(chapter.start - 0.03, chapter.end - 0.015, t));
    decayRef.current = decay;

    if (group.current) group.current.visible = w > 0.003;

    // Debris tumbles and scatters.
    const m = debrisMesh.current;
    if (m && w > 0.004) {
      debrisMaterial.opacity = w;
      debrisMaterial.emissiveIntensity = 0.2 + decay * 0.9;
      for (let i = 0; i < matrices.length; i++) {
        const base = basePositions[i];
        const d = drift[i];
        dummy.position.set(
          base.x + Math.sin(time * 0.11 * d.speed + i) * 6 * decay,
          base.y - decay * decay * 40 * d.speed + Math.cos(time * 0.09 + i) * 4,
          base.z + Math.cos(time * 0.13 * d.speed + i) * 6 * decay
        );
        dummy.rotation.set(
          time * d.rot.x * (1 + decay * 4),
          time * d.rot.y * (1 + decay * 4),
          time * d.rot.z * (1 + decay * 4)
        );
        dummy.scale.copy(baseScales[i]);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }

    // Escaping memories.
    for (let i = 0; i < escaping.length; i++) {
      const u = escapingUniforms[i];
      u.uTime.value = time;
      u.uOpacity.value = 0.9 * w * (1 - decay * 0.55);
      u.uCorruption.value = clamp(corruption * 1.3 + decay * 0.35);

      const node = escapingRefs.current[i];
      if (node) {
        const f = escaping[i];
        node.position.set(
          f.position[0] + f.drift[0] * decay * 3,
          f.position[1] + f.drift[1] * decay * 3,
          f.position[2] + f.drift[2] * decay * 3
        );
        node.rotation.set(
          time * f.rotationSpeed[0] * (0.3 + decay),
          time * f.rotationSpeed[1] * (0.3 + decay),
          time * f.rotationSpeed[2] * (0.3 + decay)
        );
      }
    }
  });

  const decay = useCallback(() => decayRef.current, []);
  const cityReveal = useCallback(() => 1, []);
  const emberAttraction = useCallback(() => decayRef.current * 0.4, []);

  return (
    <group ref={group} position={[0, originY, 0]}>
      <ambientLight intensity={0.12} color="#4a3038" />
      <directionalLight position={[-400, 180, -300]} intensity={0.9} color="#ff7a4a" />

      {/* The same city as Chapter III, seed and all. */}
      <group position={[0, -90, -420]} scale={0.55}>
        <Megacity
          device={device}
          decay={decay}
          reveal={cityReveal}
          weight={weight}
          seed={7}
          extent={1400}
          baseColor="#2e2a2c"
          windowColor="#ffb774"
          accentColor="#ff5a4a"
          skyColor="#7a2f24"
          windowDensity={0.3}
          emissive={1.2}
          hazeColor="#3a1109"
          hazeDensity={0.0009}
          hazeStrength={0.85}
          groundHaze={2.4}
          groundHazeFalloff={0.012}
        />
        <Traffic device={device} count={500} radius={1000} weight={weight} decay={decay} />
        <OrbitalRing
          device={device}
          count={700}
          radius={760}
          thickness={16}
          tilt={0.28}
          seed={99}
          weight={weight}
          decay={decay}
          position={[0, 520, -300]}
          color="#5a4f4a"
          emissive="#ff5a4a"
        />
      </group>

      {/* Rubble in the immediate foreground. */}
      <instancedMesh
        ref={debrisMesh}
        args={[undefined, undefined, matrices.length]}
        material={debrisMaterial}
      >
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>

      {/* Memories tearing loose. */}
      {escaping.map((f, i) => (
        <group
          key={i}
          ref={(node) => {
            escapingRefs.current[i] = node;
          }}
          position={f.position}
        >
          <mesh geometry={planeGeometry} material={escapingMaterials[i]} scale={[f.scale, f.scale, 1]} />
        </group>
      ))}

      <Atmosphere
        radius={420}
        colorA="#1a0705"
        colorB="#5a1a10"
        density={1.6}
        opacity={0.6}
        weight={weight}
      />

      {/* Embers, pulled toward the failing core. */}
      <DustField
        device={device}
        count={3600}
        radius={200}
        seed={73}
        color="#ff7a3a"
        colorAlt="#ffd9a0"
        opacity={0.55}
        spread={14}
        flow={2.2}
        weight={weight}
        attractor={[0, 0, -30]}
        attraction={emberAttraction}
        corruptionResponse={2.2}
      />
    </group>
  );
}
