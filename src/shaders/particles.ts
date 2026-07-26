import { HASH, SIMPLEX_3D } from './common';

/**
 * Volumetric dust / memory motes.
 *
 * One BufferGeometry, one draw call, all motion in the vertex shader. Particles
 * are advected through a curl-ish noise field so the drift never repeats and
 * never looks like a particle system on a sine wave.
 */
export const dustVertexShader = /* glsl */ `
${SIMPLEX_3D}

attribute float aSize;
attribute float aSeed;
attribute float aSpeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uSpread;
uniform float uFlow;
uniform float uCorruption;
uniform vec3 uAttractor;
uniform float uAttraction;

varying float vSeed;
varying float vAlpha;
varying float vDepth;

void main() {
  vSeed = aSeed;
  vec3 pos = position;

  float t = uTime * aSpeed * uFlow;

  // Pseudo-curl advection: three decorrelated noise samples.
  vec3 flow = vec3(
    snoise(pos * 0.045 + vec3(t * 0.35, 0.0, aSeed)),
    snoise(pos * 0.045 + vec3(0.0, t * 0.3, aSeed + 11.0)),
    snoise(pos * 0.045 + vec3(aSeed + 23.0, 0.0, t * 0.28))
  );
  pos += flow * uSpread;

  // Optional pull toward the core — the archive collapsing inward.
  vec3 toCore = uAttractor - pos;
  pos += normalize(toCore + 1e-5) * uAttraction * (0.4 + fract(aSeed) * 0.6);

  // Corruption scatters motes off their path.
  pos += vec3(
    snoise(vec3(aSeed * 3.0, uTime * 4.0, 0.0)),
    snoise(vec3(0.0, aSeed * 3.0, uTime * 4.0)),
    snoise(vec3(uTime * 4.0, 0.0, aSeed * 3.0))
  ) * uCorruption * 2.2;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mv.z;

  // Twinkle, plus a size falloff so distant motes stay sub-pixel-honest.
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed * 7.0) * 2.4) + aSeed * 30.0);
  vAlpha = twinkle * smoothstep(1600.0, 60.0, vDepth) * smoothstep(0.6, 6.0, vDepth);

  gl_PointSize = aSize * uPixelRatio * (300.0 / max(0.001, vDepth)) * (0.6 + twinkle * 0.6);
  gl_Position = projectionMatrix * mv;
}
`;

export const dustFragmentShader = /* glsl */ `
${HASH}

uniform vec3 uColor;
uniform vec3 uColorAlt;
uniform float uOpacity;

varying float vSeed;
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  // Soft gaussian-ish falloff with a hot centre.
  float core = smoothstep(0.14, 0.0, r);
  float halo = exp(-r * r * 14.0);

  vec3 color = mix(uColor, uColorAlt, hash11(vSeed * 4.1));
  float alpha = (halo * 0.7 + core * 0.9) * vAlpha * uOpacity;
  if (alpha < 0.003) discard;

  gl_FragColor = vec4(color * (0.8 + core * 1.6), alpha);
}
`;

/**
 * Starfield — the same idea, but static in world space and colour-graded by a
 * per-star temperature so it reads as a real sky rather than white dots.
 */
export const starVertexShader = /* glsl */ `
attribute float aSize;
attribute float aTemp;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uFade;

varying float vTemp;
varying float vTwinkle;

void main() {
  vTemp = aTemp;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vTwinkle = 0.7 + 0.3 * sin(uTime * (0.3 + fract(aSeed * 11.0) * 0.9) + aSeed * 50.0);
  gl_PointSize = aSize * uPixelRatio * vTwinkle * uFade;
  gl_Position = projectionMatrix * mv;
}
`;

export const starFragmentShader = /* glsl */ `
uniform float uOpacity;
uniform float uFade;
varying float vTemp;
varying float vTwinkle;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  float core = smoothstep(0.5, 0.0, r);
  core = pow(core, 2.4);

  // Blackbody-ish ramp from cool blue to warm amber.
  vec3 cool = vec3(0.62, 0.78, 1.0);
  vec3 warm = vec3(1.0, 0.84, 0.62);
  vec3 color = mix(cool, warm, vTemp);

  float alpha = core * uOpacity * vTwinkle * uFade;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color, alpha);
}
`;
