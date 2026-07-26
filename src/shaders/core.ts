import { FBM, FRESNEL, SIMPLEX_3D } from './common';

/**
 * The AI core.
 *
 * A sphere whose surface is displaced by domain-warped noise and shaded almost
 * entirely by emission: it is not lit by the world, it *is* the light in the
 * world. Two colours are mixed by depth so the core reads as a volume rather
 * than a shell — cold plasma outside, a warmer heart inside.
 *
 * `uLife` (1 → 0) drives everything about its death: the displacement calms,
 * the fresnel rim thins, the heartbeat slows and the emission collapses inward.
 */
export const coreVertexShader = /* glsl */ `
${SIMPLEX_3D}
${FBM}

uniform float uTime;
uniform float uLife;
uniform float uPulse;
uniform float uCorruption;
uniform float uDisplace;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying float vNoise;

void main() {
  vec3 pos = position;

  // Domain warp: noise sampled at a position that is itself noisy. This is what
  // separates "wobbly ball" from "something alive".
  vec3 warp = vec3(
    fbm(pos * 1.6 + uTime * 0.08),
    fbm(pos * 1.6 + 17.3 - uTime * 0.06),
    fbm(pos * 1.6 + 41.7 + uTime * 0.05)
  );

  float n = fbm(pos * 2.1 + warp * 0.9 + vec3(0.0, uTime * 0.12, 0.0), 5, 2.05, 0.55);

  // Heartbeat — slower and shallower as the core dies.
  float beat = sin(uTime * mix(0.7, 2.4, uLife)) * 0.5 + 0.5;
  beat = pow(beat, 3.0) * uPulse;

  float amount = uDisplace * (0.35 + 0.65 * uLife);
  float displacement = n * amount + beat * 0.06 * uLife;

  // Corruption tears facets off the surface.
  float shard = step(0.72, fract(n * 6.0 + uTime * 0.4)) * uCorruption * 0.22;
  displacement += shard;

  pos += normal * displacement;

  vNoise = n;
  vNormal = normalize(normalMatrix * normal);
  vPosition = pos;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewDir = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const coreFragmentShader = /* glsl */ `
${FRESNEL}

uniform float uTime;
uniform float uLife;
uniform float uCorruption;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform vec3 uColorDecay;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying float vNoise;

void main() {
  float f = fresnel(vViewDir, vNormal, 2.4);

  // Depth-mixed body colour: the heart shows through the shell.
  float depth = smoothstep(-0.6, 0.8, vNoise);
  vec3 body = mix(uColorInner, uColorOuter, depth);

  // Veins of energy tracking the noise field.
  float veins = smoothstep(0.55, 0.95, abs(sin(vNoise * 9.0 - uTime * 0.9)));
  body += uColorOuter * veins * 0.55 * uLife;

  // Rim.
  vec3 rim = uColorOuter * f * (1.2 + 1.6 * uLife);

  // As the core fails, it bruises toward the decay colour.
  vec3 color = mix(body + rim, uColorDecay, uCorruption * 0.65);

  // Flicker: the failing power supply.
  float flick = 1.0 - uCorruption * 0.5 * step(0.85, fract(sin(uTime * 23.0) * 43758.5453));
  float life = mix(0.12, 1.0, uLife);

  color *= uIntensity * life * flick;

  // The core never fully goes out until the very last frame — it dims to a
  // single ember rather than snapping to black.
  float alpha = clamp(0.35 + f * 0.9 + veins * 0.3, 0.0, 1.0) * mix(0.25, 1.0, uLife);

  gl_FragColor = vec4(color, alpha);
}
`;

/** The soft volumetric shell surrounding the core. */
export const coreGlowVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const coreGlowFragmentShader = /* glsl */ `
${FRESNEL}
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uLife;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  // Inverted fresnel: brightest at the silhouette, hollow in the middle, which
  // is how a real volumetric glow integrates.
  float f = fresnel(vViewDir, vNormal, 3.2);
  float body = pow(f, 1.35);
  float breathe = 0.85 + 0.15 * sin(uTime * mix(0.6, 1.8, uLife));
  float a = body * uIntensity * breathe * mix(0.15, 1.0, uLife);
  gl_FragColor = vec4(uColor * a, a * 0.85);
}
`;
