'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { scrollState } from '@/lib/scrollState';
import { CHAPTERS } from '@/lib/chapters';
import { makeRng, range } from '@/utils/random';
import { clamp, smoothstep } from '@/utils/math';
import type { DeviceProfile } from '@/utils/device';

/**
 * "Attention is all you need."
 *
 * The one moment in the film where an idea is rendered instead of narrated.
 *
 * As the AI reaches 2017 — the architecture it is actually built from — a field
 * of tokens condenses out of the city light in front of the camera, and every
 * token reaches toward every other. The connections are not uniform: each is
 * weighted, and the strong ones burn while the weak ones stay almost invisible.
 * That is precisely what attention is — not a diagram of it, the thing itself,
 * drawn at the scale of the sky. Then it dissolves and the crane carries on.
 *
 * It is placed relative to the camera rather than pinned to a world coordinate,
 * so the beat cannot be missed by looking the wrong way at the wrong instant,
 * and it lasts about four seconds of scroll. Cost is two draw calls.
 */

const NODES = 14;

const CHAPTER = CHAPTERS[3];
const BEAT_IN = CHAPTER.start + (CHAPTER.end - CHAPTER.start) * 0.6;
const BEAT_OUT = CHAPTER.start + (CHAPTER.end - CHAPTER.start) * 0.88;

/**
 * 0..1 strength of the attention beat at a given timeline position.
 *
 * Exported because the scene needs the *same* curve to pull the city down while
 * the idea surfaces: additive light is invisible against a blown-out golden
 * skyline, so the moment only reads if the world recedes for it. Two components
 * agreeing on one function is the only way that dip stays in sync with the beat.
 */
export function attentionEnvelope(t: number): number {
  const local = clamp((t - BEAT_IN) / Math.max(BEAT_OUT - BEAT_IN, 1e-6));
  return smoothstep(0, 0.12, local) * (1 - smoothstep(0.82, 1, local));
}

export function attentionProgress(t: number): number {
  return clamp((t - BEAT_IN) / Math.max(BEAT_OUT - BEAT_IN, 1e-6));
}

const vertexShader = /* glsl */ `
  attribute float aWeight;
  attribute float aEnd;
  attribute float aOrder;
  uniform float uProgress;
  uniform float uTime;
  varying float vAlpha;
  varying float vWeight;

  void main() {
    // Each edge draws itself on: the line grows from source to target, ordered
    // so the field wires up in a sweep rather than blinking on all at once.
    float appear = smoothstep(aOrder * 0.55, aOrder * 0.55 + 0.42, uProgress);
    float draw = smoothstep(aEnd - 0.001, aEnd + 0.85, appear * 1.85);
    // Strong links persist; weak ones fade first as the moment lets go.
    float release = smoothstep(0.72, 1.0, uProgress) * (1.0 - aWeight * 0.75);
    vAlpha = draw * (1.0 - release);
    vWeight = aWeight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uHot;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vWeight;

  void main() {
    vec3 c = mix(uColor, uHot, smoothstep(0.55, 1.0, vWeight));
    // Read against a fully lit golden city: the weak links stay whisper-faint
    // so the sparsity is legible, but the strong ones must genuinely burn.
    float a = vAlpha * uOpacity * (0.10 + vWeight * 1.5);
    if (a < 0.004) discard;
    gl_FragColor = vec4(c * (1.4 + vWeight * 2.2), a);
  }
`;

interface Props {
  device: DeviceProfile;
  weight: () => number;
}

export function AttentionMoment({ device, weight }: Props) {
  const group = useRef<THREE.Group>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const points = useRef<THREE.Points>(null);

  // Token positions: a loose shell, so the field has real depth rather than
  // reading as a flat constellation pinned to the screen.
  const nodes = useMemo(() => {
    const rng = makeRng(1706); // arXiv 1706.03762
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < NODES; i++) {
      const a = (i / NODES) * Math.PI * 2 + range(rng, -0.18, 0.18);
      const r = range(rng, 26, 46);
      out.push(
        new THREE.Vector3(
          Math.cos(a) * r,
          Math.sin(a) * r * range(rng, 0.42, 0.68) + range(rng, -6, 6),
          range(rng, -22, 22)
        )
      );
    }
    return out;
  }, []);

  const lineGeometry = useMemo(() => {
    const rng = makeRng(3762);
    const pos: number[] = [];
    const wts: number[] = [];
    const ends: number[] = [];
    const orders: number[] = [];
    for (let i = 0; i < NODES; i++) {
      for (let j = i + 1; j < NODES; j++) {
        // Attention is sparse in practice — most pairs matter very little.
        const w = Math.pow(rng(), 2.4);
        const order = i / NODES;
        pos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        wts.push(w, w);
        ends.push(0, 1);
        orders.push(order, order);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aWeight', new THREE.Float32BufferAttribute(wts, 1));
    g.setAttribute('aEnd', new THREE.Float32BufferAttribute(ends, 1));
    g.setAttribute('aOrder', new THREE.Float32BufferAttribute(orders, 1));
    return g;
  }, [nodes]);

  const nodeGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(nodes.flatMap((n) => [n.x, n.y, n.z]), 3)
    );
    return g;
  }, [nodes]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#9fd8ff') },
      uHot: { value: new THREE.Color('#ffd9a0') },
    }),
    []
  );

  const lineMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        // Drawn over the city, not into it. The camera is deep between towers
        // at this beat, so a depth-tested field is swallowed by the skyline —
        // and this is a concept surfacing in the AI's mind, not a structure
        // standing in the street. Depth testing off is the honest reading.
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms]
  );

  const nodeMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: device.tier === 'low' ? 3.4 : 4.6,
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        toneMapped: false,
      }),
    [device.tier]
  );

  useFrame(({ camera }) => {
    const t = scrollState.eased;
    const w = weight();
    const local = attentionProgress(t);
    // A single arc: wire up, hold, let go.
    const envelope = attentionEnvelope(t);
    const visible = w > 0.01 && envelope > 0.005;

    if (group.current) {
      group.current.visible = visible;
      if (visible) {
        // Sit the field in front of the camera so the beat cannot be missed,
        // and face it squarely — this is an idea, not an object in the city.
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        group.current.position.copy(camera.position).addScaledVector(forward, 150);
        group.current.quaternion.copy(camera.quaternion);
      }
    }
    if (!visible) return;

    uniforms.uProgress.value = local;
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uOpacity.value = envelope * w * 0.9;
    nodeMaterial.opacity = envelope * w * smoothstep(0.02, 0.3, local) * 0.85;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments ref={lines} geometry={lineGeometry} material={lineMaterial} frustumCulled={false} />
      <points ref={points} geometry={nodeGeometry} material={nodeMaterial} frustumCulled={false} />
    </group>
  );
}
