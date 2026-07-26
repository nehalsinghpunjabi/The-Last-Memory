import * as THREE from 'three';
import { gaussian, inSphere, makeRng, range, type Rng } from './random';

/* ------------------------------------------------------------------ *
 * Neural lattice
 * ------------------------------------------------------------------ */

export interface NeuralGraph {
  /** Node point cloud. */
  nodePositions: Float32Array;
  nodeSizes: Float32Array;
  nodeSeeds: Float32Array;
  /** Edge line segments (2 vertices per edge). */
  linePositions: Float32Array;
  lineProgress: Float32Array;
  lineSeeds: Float32Array;
  lineLengths: Float32Array;
  edgeCount: number;
}

/**
 * Builds a small-world graph: nodes are clustered into "regions" (as a real
 * network would be), then wired mostly to near neighbours with a handful of
 * long-range shortcuts. Pure random wiring produces visual mush; this produces
 * something that reads as a *mind*.
 */
export function buildNeuralGraph(
  nodeCount: number,
  radius: number,
  seed = 1337,
  maxNeighbours = 3
): NeuralGraph {
  const rng = makeRng(seed);

  // Cluster centres.
  const clusterCount = Math.max(3, Math.round(nodeCount / 26));
  const clusters: THREE.Vector3[] = [];
  for (let i = 0; i < clusterCount; i++) {
    const [x, y, z] = inSphere(rng, radius * 0.82);
    clusters.push(new THREE.Vector3(x, y, z));
  }

  const nodes: THREE.Vector3[] = [];
  const nodePositions = new Float32Array(nodeCount * 3);
  const nodeSizes = new Float32Array(nodeCount);
  const nodeSeeds = new Float32Array(nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    const c = clusters[Math.floor(rng() * clusters.length)];
    const spread = radius * 0.16;
    const p = new THREE.Vector3(
      c.x + gaussian(rng, 0, spread),
      c.y + gaussian(rng, 0, spread * 0.7),
      c.z + gaussian(rng, 0, spread)
    );
    nodes.push(p);
    nodePositions[i * 3] = p.x;
    nodePositions[i * 3 + 1] = p.y;
    nodePositions[i * 3 + 2] = p.z;
    // A few hub nodes are much larger — hubs are what make a network legible.
    nodeSizes[i] = rng() < 0.06 ? range(rng, 5.5, 9) : range(rng, 1.2, 2.8);
    nodeSeeds[i] = rng() * 100;
  }

  // Wiring.
  const edges: Array<[number, number]> = [];
  const linkRadius = radius * 0.3;
  for (let i = 0; i < nodeCount; i++) {
    let made = 0;
    // Nearest-neighbour scan over a random subset keeps this O(n·k).
    const candidates: Array<{ j: number; d: number }> = [];
    for (let s = 0; s < 26; s++) {
      const j = Math.floor(rng() * nodeCount);
      if (j === i) continue;
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < linkRadius) candidates.push({ j, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    for (const c of candidates) {
      if (made >= maxNeighbours) break;
      edges.push([i, c.j]);
      made++;
    }
    // Long-range shortcut — the leap of association.
    if (rng() < 0.05) {
      edges.push([i, Math.floor(rng() * nodeCount)]);
    }
  }

  const edgeCount = edges.length;
  const linePositions = new Float32Array(edgeCount * 6);
  const lineProgress = new Float32Array(edgeCount * 2);
  const lineSeeds = new Float32Array(edgeCount * 2);
  const lineLengths = new Float32Array(edgeCount * 2);

  for (let e = 0; e < edgeCount; e++) {
    const [a, b] = edges[e];
    const pa = nodes[a];
    const pb = nodes[b];
    const len = pa.distanceTo(pb);
    const s = rng() * 100;

    linePositions[e * 6 + 0] = pa.x;
    linePositions[e * 6 + 1] = pa.y;
    linePositions[e * 6 + 2] = pa.z;
    linePositions[e * 6 + 3] = pb.x;
    linePositions[e * 6 + 4] = pb.y;
    linePositions[e * 6 + 5] = pb.z;

    lineProgress[e * 2 + 0] = 0;
    lineProgress[e * 2 + 1] = 1;
    lineSeeds[e * 2 + 0] = s;
    lineSeeds[e * 2 + 1] = s;
    lineLengths[e * 2 + 0] = len;
    lineLengths[e * 2 + 1] = len;
  }

  return {
    nodePositions,
    nodeSizes,
    nodeSeeds,
    linePositions,
    lineProgress,
    lineSeeds,
    lineLengths,
    edgeCount,
  };
}

/* ------------------------------------------------------------------ *
 * Megacity
 * ------------------------------------------------------------------ */

export interface CityBlock {
  matrix: THREE.Matrix4;
  seed: number;
  height: number;
}

/**
 * Generates a city with a *centre*: density and height fall off with distance
 * from the origin following a soft power law, streets are carved as gaps, and
 * a handful of megastructures break the skyline. Uniform random boxes read as
 * "programmer art"; this reads as a place someone lived.
 */
export function buildCity(count: number, extent: number, seed = 7): CityBlock[] {
  const rng = makeRng(seed);
  const blocks: CityBlock[] = [];
  const dummy = new THREE.Object3D();

  const STREET = 26;

  for (let i = 0; i < count; i++) {
    // Sample toward the centre.
    const r = Math.pow(rng(), 1.7) * extent;
    const theta = rng() * Math.PI * 2;
    let x = Math.cos(theta) * r;
    let z = Math.sin(theta) * r;

    // Snap to a street grid, then jitter — organic, but with arteries.
    x = Math.round(x / STREET) * STREET + range(rng, -5, 5);
    z = Math.round(z / STREET) * STREET + range(rng, -5, 5);

    const falloff = 1 - Math.min(1, r / extent);
    const mega = rng() < 0.012;
    const height = mega
      ? range(rng, 220, 460) * (0.4 + falloff)
      : range(rng, 18, 150) * (0.25 + falloff * 1.3);

    const w = mega ? range(rng, 14, 26) : range(rng, 8, 20);
    const d = mega ? range(rng, 14, 26) : range(rng, 8, 20);

    dummy.position.set(x, height / 2, z);
    dummy.rotation.set(0, Math.round(rng() * 4) * (Math.PI / 2) + range(rng, -0.06, 0.06), 0);
    dummy.scale.set(w, height, d);
    dummy.updateMatrix();

    blocks.push({ matrix: dummy.matrix.clone(), seed: rng() * 100, height });
  }

  return blocks;
}

/* ------------------------------------------------------------------ *
 * Orbital rings and debris
 * ------------------------------------------------------------------ */

export function buildRing(
  count: number,
  radius: number,
  thickness: number,
  tilt: number,
  seed = 99
): THREE.Matrix4[] {
  const rng = makeRng(seed);
  const out: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, tilt * 0.4));
  const UP = new THREE.Vector3(0, 1, 0);
  const yawQ = new THREE.Quaternion();

  for (let i = 0; i < count; i++) {
    // Evenly spaced, tight radial spread — a clean band, not a cloud.
    const a = (i / count) * Math.PI * 2;
    const rr = radius + gaussian(rng, 0, thickness * 0.28);
    const p = new THREE.Vector3(Math.cos(a) * rr, gaussian(rng, 0, thickness * 0.2), Math.sin(a) * rr);
    p.applyQuaternion(tiltQ);
    dummy.position.copy(p);

    // Orient each panel *tangent* to the ring so the segments form a continuous
    // arcology band rather than a field of randomly-tumbling debris. (The Fall
    // re-randomises these as the ring shatters; that lives in OrbitalRing.)
    yawQ.setFromAxisAngle(UP, a + Math.PI / 2);
    dummy.quaternion.copy(tiltQ).multiply(yawQ);

    // Consistent panel sizing — slight variation for life, no wild scaling.
    dummy.scale.set(range(rng, 1.05, 1.4), range(rng, 0.55, 1.0), range(rng, 0.9, 1.35));
    dummy.updateMatrix();
    out.push(dummy.matrix.clone());
  }
  return out;
}

/** Broken fragments used in the Fall and in Solitude. */
export function buildDebris(count: number, radius: number, seed = 42) {
  const rng = makeRng(seed);
  const matrices: THREE.Matrix4[] = [];
  const drift: Array<{ rot: THREE.Vector3; speed: number }> = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const [x, y, z] = inSphere(rng, radius);
    dummy.position.set(x, y * 0.55, z);
    dummy.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    const s = Math.pow(rng(), 2) * 5 + 0.35;
    dummy.scale.set(s * range(rng, 0.4, 1.6), s * range(rng, 0.2, 1.2), s * range(rng, 0.4, 1.6));
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
    drift.push({
      rot: new THREE.Vector3(range(rng, -0.05, 0.05), range(rng, -0.05, 0.05), range(rng, -0.05, 0.05)),
      speed: range(rng, 0.2, 1),
    });
  }
  return { matrices, drift };
}

/* ------------------------------------------------------------------ *
 * Point clouds
 * ------------------------------------------------------------------ */

export interface PointCloud {
  positions: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  speeds: Float32Array;
}

export function buildDust(count: number, radius: number, seed = 5, flatten = 1): PointCloud {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const [x, y, z] = inSphere(rng, radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y * flatten;
    positions[i * 3 + 2] = z;
    sizes[i] = Math.pow(rng(), 2.4) * 3.2 + 0.35;
    seeds[i] = rng() * 100;
    speeds[i] = range(rng, 0.25, 1.35);
  }
  return { positions, sizes, seeds, speeds };
}

export interface StarField {
  positions: Float32Array;
  sizes: Float32Array;
  temps: Float32Array;
  seeds: Float32Array;
}

/** A sky with structure: a galactic band plus a uniform field. */
export function buildStars(count: number, radius: number, seed = 11): StarField {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const temps = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const inBand = rng() < 0.42;
    let x: number, y: number, z: number;

    if (inBand) {
      const a = rng() * Math.PI * 2;
      const bandY = gaussian(rng, 0, 0.12);
      const r = radius * range(rng, 0.85, 1);
      x = Math.cos(a) * r;
      y = bandY * radius * 0.55;
      z = Math.sin(a) * r;
      // Rotate the band off-axis so it crosses the frame diagonally.
      const t = 0.5;
      const y2 = y * Math.cos(t) - z * Math.sin(t);
      const z2 = y * Math.sin(t) + z * Math.cos(t);
      y = y2;
      z = z2;
    } else {
      [x, y, z] = inSphere(rng, radius);
      const l = Math.hypot(x, y, z) || 1;
      const k = radius / l;
      x *= k;
      y *= k;
      z *= k;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    sizes[i] = Math.pow(rng(), 3.2) * 3.6 + 0.5;
    temps[i] = Math.pow(rng(), 1.6);
    seeds[i] = rng() * 100;
  }

  return { positions, sizes, temps, seeds };
}

/** Convenience: build a BufferGeometry from a point cloud. */
export function pointCloudGeometry(cloud: PointCloud): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(cloud.sizes, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(cloud.seeds, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(cloud.speeds, 1));
  return g;
}

/** Random unit-ish rotation helper used by several scenes. */
export function randomEuler(rng: Rng): THREE.Euler {
  return new THREE.Euler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
}
