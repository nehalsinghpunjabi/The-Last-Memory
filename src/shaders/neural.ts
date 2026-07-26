import { HASH, SIMPLEX_3D } from './common';

/**
 * The neural lattice.
 *
 * Connections are drawn as a single indexed LineSegments mesh. Each vertex
 * carries the parametric position along its edge (aProgress) and a per-edge
 * seed (aSeed), which lets one draw call render thousands of independently
 * timed energy pulses with zero CPU work per frame.
 */
export const neuralLineVertexShader = /* glsl */ `
attribute float aProgress;
attribute float aSeed;
attribute float aLength;

uniform float uTime;
uniform float uReveal;

varying float vProgress;
varying float vSeed;
varying float vLength;
varying float vFade;

void main() {
  vProgress = aProgress;
  vSeed = aSeed;
  vLength = aLength;

  // Edges switch on in seeded waves — the lattice assembles itself.
  float threshold = fract(aSeed * 7.31);
  vFade = smoothstep(threshold - 0.25, threshold + 0.08, uReveal);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const neuralLineFragmentShader = /* glsl */ `
${HASH}

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uPulseColor;
uniform float uOpacity;
uniform float uSpeed;
uniform float uCorruption;

varying float vProgress;
varying float vSeed;
varying float vLength;
varying float vFade;

void main() {
  if (vFade <= 0.001) discard;

  // A travelling packet of light. Each edge has its own phase and speed.
  float speed = uSpeed * (0.5 + hash11(vSeed * 3.7) * 1.4);
  float phase = fract(vSeed * 13.1 + uTime * speed);
  float d = abs(fract(vProgress - phase + 0.5) - 0.5);
  float pulse = smoothstep(0.08, 0.0, d);

  // Second, dimmer packet travelling the other way keeps the lattice busy.
  float phase2 = fract(vSeed * 5.9 - uTime * speed * 0.6);
  float d2 = abs(fract(vProgress - phase2 + 0.5) - 0.5);
  float pulse2 = smoothstep(0.05, 0.0, d2) * 0.45;

  // Base filament: brightest near the nodes it connects.
  float ends = smoothstep(0.5, 0.0, abs(vProgress - 0.5));
  float base = mix(0.35, 0.08, ends);

  // Corruption drops packets entirely.
  float alive = step(uCorruption * 0.8, hash11(floor(uTime * 6.0) + vSeed * 91.0));

  vec3 color = uColor * base + uPulseColor * (pulse + pulse2) * 2.2 * alive;
  float alpha = (base + (pulse + pulse2) * alive) * uOpacity * vFade;

  gl_FragColor = vec4(color, alpha);
}
`;

/** Nodes of the lattice — instanced billboard sprites. */
export const neuralNodeVertexShader = /* glsl */ `
${SIMPLEX_3D}

attribute float aSize;
attribute float aSeed;

uniform float uTime;
uniform float uReveal;
uniform float uPixelRatio;
uniform float uCorruption;

varying float vSeed;
varying float vFade;

void main() {
  vSeed = aSeed;

  vec3 pos = position;
  // Nodes drift, never perfectly still.
  pos += vec3(
    snoise(vec3(aSeed, uTime * 0.08, 0.0)),
    snoise(vec3(0.0, aSeed, uTime * 0.09)),
    snoise(vec3(uTime * 0.07, 0.0, aSeed))
  ) * 0.55;

  float threshold = fract(aSeed * 7.31);
  vFade = smoothstep(threshold - 0.3, threshold + 0.05, uReveal);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);

  // Firing pulse: nodes flash when a packet arrives.
  float fire = pow(max(0.0, sin(uTime * (0.8 + fract(aSeed * 3.3) * 2.2) + aSeed * 20.0)), 8.0);
  float size = aSize * (1.0 + fire * 1.8) * (1.0 - uCorruption * 0.3);

  gl_PointSize = size * uPixelRatio * (240.0 / max(0.001, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

export const neuralNodeFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHotColor;
uniform float uOpacity;
uniform float uTime;

varying float vSeed;
varying float vFade;

void main() {
  if (vFade <= 0.001) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  float core = smoothstep(0.16, 0.0, r);
  float halo = smoothstep(0.5, 0.06, r);
  float fire = pow(max(0.0, sin(uTime * (0.8 + fract(vSeed * 3.3) * 2.2) + vSeed * 20.0)), 8.0);

  vec3 color = mix(uColor, uHotColor, core + fire * 0.7);
  float alpha = (halo * 0.35 + core) * uOpacity * vFade;
  gl_FragColor = vec4(color * (0.6 + fire * 1.4), alpha);
}
`;
