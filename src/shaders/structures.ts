import { FRESNEL, HASH, SIMPLEX_3D } from './common';

/**
 * Architecture shader — used by every built structure in the film.
 *
 * One instanced material renders the Golden Age megacity *and* its ruin: the
 * same towers, with `uDecay` raised, lose their windows, blacken, and are eaten
 * away by a noise field that clips fragments out of existence.
 *
 * Windows are procedural (a grid in local UV space with a per-cell hash) so a
 * hundred thousand lit windows cost nothing and no texture is loaded.
 */
export const structureVertexShader = /* glsl */ `
${SIMPLEX_3D}

uniform float uTime;
uniform float uDecay;
uniform float uReveal;

attribute float aSeed;
attribute float aHeight;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vSeed;
varying float vHeight;
varying float vReveal;
varying float vViewDist;
varying float vGroundHeight;

void main() {
  vUv = uv;
  vSeed = aSeed;
  vHeight = aHeight;

  vec3 pos = position;

  // Buildings rise into existence as the chapter opens.
  float threshold = fract(aSeed * 3.77);
  vReveal = smoothstep(threshold - 0.4, threshold + 0.15, uReveal);

  // During the collapse, structures tilt, sink and shear apart.
  if (uDecay > 0.001) {
    float fall = uDecay * (0.4 + fract(aSeed * 5.1));
    float shear = snoise(vec3(aSeed, position.y * 0.02, uTime * 0.2)) * fall * 9.0;
    pos.x += shear;
    pos.z += shear * 0.6;
    pos.y -= fall * fall * 30.0 * (0.3 + fract(aSeed * 9.3));
  }

  #ifdef USE_INSTANCING
    // Recover the instance's scale so the window grid is sized in world units:
    // a 400m tower gets 400m worth of floors, not a stretched texture.
    vec3 instScale = vec3(
      length(instanceMatrix[0].xyz),
      length(instanceMatrix[1].xyz),
      length(instanceMatrix[2].xyz)
    );
    vLocalPos = (pos + vec3(0.0, 0.5, 0.0)) * instScale;
    vec4 world = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vLocalPos = pos;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
  #endif

  vViewDir = cameraPosition - world.xyz;
  vViewDist = length(vViewDir);
  // Height above this structure group's own origin (its ground plane), robust
  // to wherever the group is placed in the world. Drives ground haze.
  vGroundHeight = world.y - modelMatrix[3].y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const structureFragmentShader = /* glsl */ `
${HASH}
${FRESNEL}
${SIMPLEX_3D}

uniform float uTime;
uniform float uDecay;
uniform vec3 uBaseColor;
uniform vec3 uWindowColor;
uniform vec3 uAccentColor;
uniform vec3 uSkyColor;
uniform float uWindowDensity;
uniform float uOpacity;
uniform float uEmissive;
uniform vec3 uHazeColor;
uniform float uHazeDensity;
uniform float uHazeStrength;
uniform float uGroundHaze;
uniform float uGroundHazeFalloff;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vLocalPos;
varying float vSeed;
varying float vHeight;
varying float vReveal;
varying float vViewDist;
varying float vGroundHeight;

void main() {
  if (vReveal <= 0.001) discard;

  vec3 V = normalize(vViewDir);
  vec3 N = normalize(vNormal);

  // ---- window grid --------------------------------------------------------
  // Cell size is constant in world units, not UV, so tall towers get more
  // floors rather than stretched windows.
  vec2 cell = vec2(vUv.x * 14.0, vLocalPos.y * 0.9);
  vec2 id = floor(cell);
  vec2 f = fract(cell);

  float lit = step(1.0 - uWindowDensity, hash12(id + vSeed * 31.0));
  // Windows flicker out as the world dies, a few at a time.
  float alive = step(uDecay, hash12(id * 1.7 + vSeed * 7.0 + floor(uTime * 0.5) * 0.01));
  lit *= alive;

  // Window shape with a mullion gap, analytically anti-aliased.
  //
  // A hard step() here is what separates "a city" from "a shimmering mess": the
  // window grid is a very high frequency pattern with no mip chain to fall back
  // on, so at distance every camera move makes it crawl. Widening the edge by
  // the screen-space derivative gives each window a correctly-sized soft edge
  // at any depth.
  vec2 fw = fwidth(cell) + 1e-5;
  float sx = smoothstep(0.12 - fw.x, 0.12 + fw.x, f.x) * (1.0 - smoothstep(0.82 - fw.x, 0.82 + fw.x, f.x));
  float sy = smoothstep(0.22 - fw.y, 0.22 + fw.y, f.y) * (1.0 - smoothstep(0.74 - fw.y, 0.74 + fw.y, f.y));
  float shape = sx * sy;

  // Slow, per-window brightness variation — offices, not LEDs.
  float breathe = 0.55 + 0.45 * sin(uTime * 0.3 + hash12(id) * 40.0);

  float windows = lit * shape * breathe;

  // Procedural LOD: once one screen pixel covers most of a cell, resolving
  // individual windows is meaningless and only produces moiré. Fade the whole
  // product toward its *mean* — the tower still glows, it just stops lying
  // about detail it cannot represent.
  //
  // Two things matter here. It has to be applied to the final value, not to
  // the window shape alone, or the per-cell lit hash keeps flickering
  // underneath it. And the target has to be the real average
  // (density x lit area x mean brightness),
  // not a round number: overstate it and every distant or glancing face lights
  // up as a solid emissive slab, which is worse than the aliasing it replaced.
  float texelDensity = max(fw.x, fw.y);
  float meanWindow = uWindowDensity * 0.45 * 0.55;
  // Start dissolving to the mean earlier and finish sooner — combined with the
  // atmospheric haze below, distant façades read as a soft warm glow instead of
  // a crawling grid, with no visible LOD seam.
  windows = mix(windows, meanWindow, smoothstep(0.25, 0.7, texelDensity));

  // ---- surface ------------------------------------------------------------
  // Cheap directional key + sky fill. A full PBR pass would be invisible at
  // these distances and cost three times as much.
  vec3 keyDir = normalize(vec3(0.4, 0.75, 0.3));
  float key = max(0.0, dot(N, keyDir));
  float fill = 0.5 + 0.5 * N.y;

  vec3 base = uBaseColor * (0.18 + key * 0.55) + uSkyColor * fill * 0.22;

  // Height gradient: towers catch more light the higher they go.
  base *= 0.6 + 0.9 * smoothstep(0.0, 1.0, vLocalPos.y / max(1.0, vHeight));

  // Ash and soot during the collapse.
  float soot = snoise(vLocalPos * 0.08 + vSeed) * 0.5 + 0.5;
  base = mix(base, base * vec3(0.22, 0.2, 0.19), uDecay * soot);

  vec3 color = base;
  color += uWindowColor * windows * uEmissive;
  color += uAccentColor * fresnel(V, N, 3.0) * 0.5 * (1.0 - uDecay * 0.7);

  // ---- structural failure -------------------------------------------------
  // Chunks of the building stop existing.
  float erosion = snoise(vLocalPos * 0.14 + vec3(vSeed, uTime * 0.05, 0.0)) * 0.5 + 0.5;
  if (erosion < uDecay * 0.75) discard;

  // Glowing wound at the erosion edge.
  float wound = smoothstep(uDecay * 0.75 + 0.06, uDecay * 0.75, erosion);
  color = mix(color, vec3(1.0, 0.34, 0.16), wound * uDecay);

  // ---- atmospheric perspective --------------------------------------------
  // The single biggest legibility win for the megacity: distant towers fade
  // into a warm haze, which is what the eye reads as *depth* and *scale*. Two
  // terms — an exponential distance fog, plus extra haze pooled near the ground
  // so tower bases dissolve before their tops. Together they turn a flat wall
  // of geometry into a city that recedes for kilometres.
  float distFog = 1.0 - exp(-vViewDist * uHazeDensity);
  float groundFog = uGroundHaze * exp(-max(vGroundHeight, 0.0) * uGroundHazeFalloff);
  float fog = clamp(distFog * (uHazeStrength + groundFog), 0.0, 1.0);
  color = mix(color, uHazeColor, fog);

  gl_FragColor = vec4(color, uOpacity * vReveal);
}
`;
