'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { structureFragmentShader, structureVertexShader } from '@/shaders/structures';
import { scrollState } from '@/lib/scrollState';
import { makeRng, range, type Rng } from '@/utils/random';
import { useShaderMaterial } from '@/utils/useShaderMaterial';

/**
 * Hero towers.
 *
 * The instanced city gives the Golden Age its *density*; these give it its
 * *identity*. Five landmark skyscrapers with deliberately distinct silhouettes
 * — a needle spire, an Art-Deco setback, a two-legged sky-gate, a wide sail
 * blade, and a crowned cylinder — stand taller than everything around them and
 * are staggered in depth so the atmospheric haze layers them into a skyline
 * that reads, at a glance, as "future megacity".
 *
 * They share the city's own shader (so windows, warm grade and haze all match)
 * and each carries a slow-blinking aircraft-warning beacon at its apex, which
 * is the cheapest possible signal that the city is inhabited and enormous.
 *
 * Cost: five short meshes and five point-sprites. Negligible.
 */

interface Props {
  reveal: () => number;
  weight: () => number;
  windowColor?: THREE.ColorRepresentation;
  accentColor?: THREE.ColorRepresentation;
  skyColor?: THREE.ColorRepresentation;
  baseColor?: THREE.ColorRepresentation;
  hazeColor?: THREE.ColorRepresentation;
}

/** Bake a constant per-vertex seed + height onto a primitive geometry so the
 *  shared (non-instanced) structure shader can tile windows up it. */
function tag(geo: THREE.BufferGeometry, seed: number, height: number): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n).fill(seed), 1));
  geo.setAttribute('aHeight', new THREE.BufferAttribute(new Float32Array(n).fill(height), 1));
  return geo;
}

function box(w: number, h: number, d: number, y: number, rotY = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(0, y + h / 2, 0);
  return g;
}

interface TowerDef {
  seed: number;
  position: [number, number, number];
  rotationY: number;
  height: number;
  /** All of the tower's parts merged into one buffer — one draw call. */
  geometry: THREE.BufferGeometry;
  /** Apex beacon position in tower-local space. */
  beacon: [number, number, number];
  beaconColor: THREE.Color;
}

type Builder = (rng: Rng, h: number, seed: number) => { parts: THREE.BufferGeometry[]; beacon: [number, number, number] };

/** 1 — Needle spire: broad shaft, tapered crown, long antenna. */
const buildSpire: Builder = (rng, h, seed) => {
  const w = range(rng, 30, 38);
  const parts = [
    tag(box(w, h * 0.72, w * 0.92, 0), seed, h),
    tag(box(w * 0.6, h * 0.16, w * 0.56, h * 0.72), seed, h),
  ];
  // Tapered crown.
  const crown = new THREE.CylinderGeometry(2, w * 0.32, h * 0.14, 6);
  crown.translate(0, h * 0.88 + h * 0.07, 0);
  parts.push(tag(crown, seed, h));
  // Antenna.
  const mast = new THREE.CylinderGeometry(0.6, 1.2, h * 0.16, 6);
  mast.translate(0, h * 0.95 + h * 0.08, 0);
  parts.push(tag(mast, seed, h));
  return { parts, beacon: [0, h * 1.04, 0] };
};

/** 2 — Art-Deco setback ziggurat. */
const buildSetback: Builder = (rng, h, seed) => {
  const w = range(rng, 44, 52);
  const steps = [
    [w, 0.42, 0.0],
    [w * 0.72, 0.26, 0.42],
    [w * 0.5, 0.18, 0.68],
    [w * 0.32, 0.12, 0.86],
  ] as const;
  const parts = steps.map(([sw, sh, sy]) => tag(box(sw, h * sh, sw, h * sy), seed, h));
  const mast = new THREE.CylinderGeometry(0.8, 1.6, h * 0.1, 6);
  mast.translate(0, h * 0.98 + h * 0.05, 0);
  parts.push(tag(mast, seed, h));
  return { parts, beacon: [0, h * 1.03, 0] };
};

/** 3 — Sky-gate: two legs joined by a bridge near the top. */
const buildGate: Builder = (rng, h, seed) => {
  const legW = range(rng, 16, 22);
  const gap = range(rng, 34, 44);
  const parts = [
    tag(box(legW, h, legW, 0).translate(-gap, 0, 0), seed, h),
    tag(box(legW, h, legW, 0).translate(gap, 0, 0), seed, h),
    // Sky-bridge.
    tag(box(gap * 2 + legW, h * 0.14, legW * 0.9, h * 0.78), seed, h),
    // Roof caps.
    tag(box(legW * 1.2, h * 0.05, legW * 1.2, h).translate(-gap, 0, 0), seed, h),
    tag(box(legW * 1.2, h * 0.05, legW * 1.2, h).translate(gap, 0, 0), seed, h),
  ];
  return { parts, beacon: [gap, h * 1.02, 0] };
};

/** 4 — Sail blade: wide, thin, chamfered — reads instantly from any angle. */
const buildBlade: Builder = (rng, h, seed) => {
  const w = range(rng, 66, 82);
  const d = range(rng, 12, 16);
  const parts = [tag(box(w, h * 0.9, d, 0), seed, h)];
  // Chamfered top (a leaning wedge).
  const wedge = box(w, h * 0.16, d, h * 0.9);
  wedge.rotateX(0.12);
  parts.push(tag(wedge, seed, h));
  return { parts, beacon: [w * 0.4, h * 1.0, 0] };
};

/** 5 — Crowned cylinder: shaft, flared crown ring, cap. */
const buildCrown: Builder = (rng, h, seed) => {
  const r = range(rng, 18, 24);
  const shaft = new THREE.CylinderGeometry(r * 0.86, r, h * 0.82, 12);
  shaft.translate(0, h * 0.41, 0);
  const flare = new THREE.CylinderGeometry(r * 1.35, r * 0.86, h * 0.1, 12);
  flare.translate(0, h * 0.87, 0);
  const cap = new THREE.CylinderGeometry(r * 0.4, r * 1.2, h * 0.1, 12);
  cap.translate(0, h * 0.95, 0);
  return {
    parts: [tag(shaft, seed, h), tag(flare, seed, h), tag(cap, seed, h)],
    beacon: [0, h * 1.02, 0],
  };
};

const LAYOUT: Array<{
  builder: Builder;
  position: [number, number, number];
  rotationY: number;
  height: number;
  beaconColor: string;
}> = [
  { builder: buildSpire, position: [55, 0, -150], rotationY: 0.3, height: 470, beaconColor: '#ff5a4a' },
  { builder: buildCrown, position: [275, 0, -210], rotationY: -0.4, height: 340, beaconColor: '#ffd9a0' },
  { builder: buildSetback, position: [-175, 0, -300], rotationY: 0.15, height: 380, beaconColor: '#ff5a4a' },
  { builder: buildGate, position: [200, 0, -400], rotationY: -0.2, height: 420, beaconColor: '#9fd8ff' },
  { builder: buildBlade, position: [-70, 0, -560], rotationY: 0.5, height: 500, beaconColor: '#ff5a4a' },
];

export function HeroTowers({
  reveal,
  weight,
  windowColor = '#ffd9a0',
  accentColor = '#ffb774',
  skyColor = '#ff9b52',
  baseColor = '#3d4152',
  hazeColor = '#ff9b52',
}: Props) {
  // Each tower's parts share one material and never move relative to each
  // other, so they are merged into a single buffer at build time: 19 meshes
  // become 5. Identical pixels, a quarter of the draw calls.
  const towers = useMemo<TowerDef[]>(() => {
    return LAYOUT.map((def, i) => {
      const seed = 100 + i * 13.7;
      const rng = makeRng(700 + i * 91);
      const { parts, beacon } = def.builder(rng, def.height, seed);
      const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
      if (merged !== parts[0]) parts.forEach((p) => p.dispose());
      return {
        seed,
        position: def.position,
        rotationY: def.rotationY,
        height: def.height,
        geometry: merged ?? parts[0],
        beacon,
        beaconColor: new THREE.Color(def.beaconColor),
      };
    });
  }, []);

  useEffect(() => () => towers.forEach((t) => t.geometry.dispose()), [towers]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDecay: { value: 0 },
      uReveal: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseColor) },
      uWindowColor: { value: new THREE.Color(windowColor) },
      uAccentColor: { value: new THREE.Color(accentColor) },
      uSkyColor: { value: new THREE.Color(skyColor) },
      // Denser, brighter windows than the instanced city — these are the
      // buildings the camera actually flies past.
      uWindowDensity: { value: 0.44 },
      uOpacity: { value: 1 },
      uEmissive: { value: 2.2 },
      uHazeColor: { value: new THREE.Color(hazeColor) },
      uHazeDensity: { value: 0.00055 },
      uHazeStrength: { value: 0.9 },
      uGroundHaze: { value: 1.6 },
      uGroundHazeFalloff: { value: 0.0075 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const material = useShaderMaterial(
    () => ({
      vertexShader: structureVertexShader,
      fragmentShader: structureFragmentShader,
      uniforms,
      transparent: true,
    }),
    [uniforms]
  );

  const group = useRef<THREE.Group>(null);
  const beaconRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    const w = weight();
    const r = reveal();
    uniforms.uTime.value = scrollState.elapsed;
    uniforms.uReveal.value = r;
    uniforms.uOpacity.value = w;
    if (group.current) group.current.visible = w > 0.003 && r > 0.001;

    // Staggered beacon blink — each on its own phase, a slow aircraft warning.
    const t = scrollState.elapsed;
    for (let i = 0; i < towers.length; i++) {
      const mesh = beaconRefs.current[i];
      if (!mesh) continue;
      const phase = i * 1.37;
      const blink = Math.pow(0.5 + 0.5 * Math.sin(t * 1.6 + phase), 6);
      const s = 0.4 + blink * 2.6;
      mesh.scale.setScalar(s * 6);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (0.15 + blink) * w;
    }
  });

  return (
    <group ref={group}>
      {towers.map((tower, i) => (
        <group key={i} position={tower.position} rotation={[0, tower.rotationY, 0]}>
          <mesh geometry={tower.geometry} material={material} />
          {/* Aircraft-warning beacon at the apex. */}
          <mesh
            ref={(m) => {
              beaconRefs.current[i] = m;
            }}
            position={tower.beacon}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={tower.beaconColor}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
