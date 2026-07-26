'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hologramFragmentShader, hologramVertexShader } from '@/shaders/hologram';
import { Atmosphere } from '@/components/three/Atmosphere';
import { DustField } from '@/components/three/DustField';
import { MEMORY_KINDS, getMemoryTexture, type MemoryKind } from '@/assets/memoryTextures';
import { CHAPTER_ORIGIN_Y } from '@/lib/cameraRail';
import { CHAPTERS } from '@/lib/chapters';
import { scrollState } from '@/lib/scrollState';
import { makeRng, range } from '@/utils/random';
import { clamp, smoothstep } from '@/utils/math';
import { useArtifacts } from '@/hooks/useArtifacts';
import type { DeviceProfile } from '@/utils/device';

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

interface Fragment {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number];
  kind: MemoryKind;
  seed: number;
  /** Per-fragment reveal offset so the hall populates in waves. */
  offset: number;
  warmth: number;
  /** Shards broken off this fragment. */
  shards: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number];
  }>;
}

/**
 * CHAPTER II — They Called Me Friend.
 *
 * A hall of suspended photographs the camera drifts through. Each fragment is
 * a procedurally painted memory (see assets/memoryTextures) rendered through
 * the hologram shader, and most of them are broken: shards hang a few
 * centimetres off the parent plane, still showing the same image from a
 * slightly wrong angle.
 *
 * The corruption spikes scripted in the director land here, so the memories
 * tear while the AI is describing being loved.
 */
export function HumanityScene({ device, weight }: Props) {
  const originY = CHAPTER_ORIGIN_Y[2];
  const chapter = CHAPTERS[2];

  const count = device.tier === 'high' ? 46 : device.tier === 'medium' ? 30 : 18;
  const textureSize = device.tier === 'high' ? 384 : 256;

  const fragments = useMemo<Fragment[]>(() => {
    const rng = makeRng(2024);
    const out: Fragment[] = [];

    for (let i = 0; i < count; i++) {
      const z = range(rng, 48, -96);
      // Fragments avoid the exact camera path so the drift never clips through
      // one — the camera should pass *between* memories, never into them.
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * range(rng, 4.5, 34);
      const y = range(rng, -15, 15);

      const w = range(rng, 4, 15);
      const h = w * range(rng, 0.62, 0.78);

      const shardCount = rng() < 0.45 ? Math.floor(range(rng, 1, 4)) : 0;
      const shards: Fragment['shards'] = [];
      for (let s = 0; s < shardCount; s++) {
        shards.push({
          position: [range(rng, -w * 0.6, w * 0.6), range(rng, -h * 0.6, h * 0.6), range(rng, 0.4, 3.2)] as [
            number,
            number,
            number,
          ],
          rotation: [range(rng, -0.4, 0.4), range(rng, -0.5, 0.5), range(rng, -0.5, 0.5)] as [
            number,
            number,
            number,
          ],
          scale: [w * range(rng, 0.18, 0.42), h * range(rng, 0.18, 0.42)] as [number, number],
        });
      }

      out.push({
        position: [x, y, z],
        rotation: [range(rng, -0.22, 0.22), -side * range(rng, 0.15, 0.75), range(rng, -0.14, 0.14)],
        scale: [w, h],
        kind: MEMORY_KINDS[Math.floor(rng() * MEMORY_KINDS.length)],
        seed: Math.floor(rng() * 100000),
        offset: rng(),
        warmth: range(rng, 0.35, 0.9),
        shards,
      });
    }
    return out;
  }, [count]);

  // Texture pool. Every fragment used to bake its own unique canvas texture —
  // 46 distinct 384px textures resident at once, for images the camera drifts
  // past in a dim hall. A pool of a dozen, re-used across fragments that
  // already differ in scale, rotation, warmth and corruption, is
  // indistinguishable in motion and cuts texture memory by ~70%.
  const poolSize = device.tier === 'high' ? 14 : device.tier === 'medium' ? 10 : 6;
  const textures = useMemo(() => {
    // The pool slot determines both the image kind and its seed, so exactly
    // `poolSize` textures are ever created — keying on the fragment's own kind
    // would let each kind spawn its own set and defeat the pooling.
    const pool: THREE.CanvasTexture[] = [];
    for (let i = 0; i < poolSize; i++) {
      pool.push(
        getMemoryTexture(MEMORY_KINDS[i % MEMORY_KINDS.length], 5000 + i * 977, textureSize)
      );
    }
    return fragments.map((_, i) => pool[i % poolSize]);
  }, [fragments, textureSize, poolSize]);

  const uniformsList = useMemo(
    () =>
      fragments.map((f, i) => ({
        uTexture: { value: textures[i] },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uCorruption: { value: 0 },
        uReveal: { value: 0 },
        uTint: { value: new THREE.Color('#cfe4ff') },
        uScanIntensity: { value: 1 },
        uWarmth: { value: f.warmth },
        uSeed: { value: f.seed % 97 },
        uCurl: { value: 0.35 },
        uFocus: { value: 1 },
        uArtifact: { value: 0 },
        uHover: { value: 0 },
      })),
    [fragments, textures]
  );

  // One material per fragment; a fragment's shards share its material, so a
  // broken memory tears apart while still being the same failing image.
  const materials = useMemo(
    () =>
      uniformsList.map(
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
    [uniformsList]
  );

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const group = useRef<THREE.Group>(null);

  // One geometry per fragment, with its shards baked in.
  //
  // Each fragment used to be a mesh for the plane plus one mesh per shard, all
  // sharing a material — up to ~94 draw calls in this hall alone, the highest
  // in the film. The shards are static relative to their parent, so their
  // transforms can be baked into a single merged buffer: same pixels, one draw
  // call per fragment instead of up to four. The plane is also reduced from a
  // 12x12 grid to 6x6 — the hologram shader's vertex curl is smooth enough that
  // the extra 216 triangles per fragment were invisible.
  const geometries = useMemo(() => {
    return fragments.map((f) => {
      const parts: THREE.BufferGeometry[] = [];

      const base = new THREE.PlaneGeometry(1, 1, 6, 6);
      base.scale(f.scale[0], f.scale[1], 1);
      parts.push(base);

      for (const s of f.shards) {
        const g = new THREE.PlaneGeometry(1, 1, 2, 2);
        g.scale(s.scale[0], s.scale[1], 1);
        g.rotateX(s.rotation[0]);
        g.rotateY(s.rotation[1]);
        g.rotateZ(s.rotation[2]);
        g.translate(s.position[0], s.position[1], s.position[2]);
        parts.push(g);
      }

      if (parts.length === 1) return parts[0];
      const merged = mergeGeometries(parts, false);
      parts.forEach((p) => p.dispose());
      return merged ?? base;
    });
  }, [fragments]);

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  // The records the AI is remembering are the objects hanging in this hall.
  const fragmentPositions = useMemo(() => fragments.map((f) => f.position), [fragments]);
  const artifacts = useArtifacts('humanity', fragmentPositions);
  const artifactFlags = useMemo(
    () => fragments.map((_, i) => (artifacts.idFor(i) ? 1 : 0)),
    [fragments, artifacts]
  );

  useFrame((_, delta) => {
    const t = scrollState.eased;
    const time = scrollState.elapsed;
    const corruption = scrollState.corruption;
    const w = weight();

    const chapterReveal = clamp(smoothstep(chapter.start - 0.03, chapter.start + 0.09, t));
    artifacts.tick(Math.min(delta, 0.1));

    for (let i = 0; i < uniformsList.length; i++) {
      const u = uniformsList[i];
      const f = fragments[i];
      u.uTime.value = time;
      // Staggered materialisation.
      u.uReveal.value = clamp(chapterReveal * 1.6 - f.offset * 0.6);
      u.uOpacity.value = 0.95 * w;
      // Some fragments are far more damaged than others.
      u.uCorruption.value = clamp(corruption * (0.5 + f.offset * 1.5));
      u.uScanIntensity.value = 0.7 + f.offset * 0.6;
      u.uArtifact.value = artifactFlags[i];
      u.uHover.value = artifacts.hoverFor(i);
    }

    if (group.current) group.current.visible = w > 0.003;
  });

  return (
    <group ref={group} position={[0, originY, 0]}>
      {fragments.map((f, i) => {
        const isArtifact = artifacts.idFor(i) !== null;
        return (
          <mesh
            key={i}
            position={f.position}
            rotation={f.rotation}
            geometry={geometries[i]}
            material={materials[i]}
            // Only artifacts are raycast targets. Ordinary memories stay inert,
            // so the hall does not become a field of hit-boxes and the cursor
            // only changes on something that genuinely opens.
            raycast={isArtifact ? undefined : () => null}
            {...(isArtifact ? artifacts.handlers(i) : {})}
          />
        );
      })}

      <Atmosphere
        radius={280}
        colorA="#0a0d16"
        colorB="#2a2418"
        density={0.9}
        opacity={0.42}
        weight={weight}
      />

      <DustField
        device={device}
        count={3200}
        radius={110}
        seed={29}
        color="#ffd9a0"
        colorAlt="#9fd8ff"
        opacity={0.5}
        spread={7}
        flow={0.85}
        weight={weight}
        corruptionResponse={1.6}
      />
    </group>
  );
}
