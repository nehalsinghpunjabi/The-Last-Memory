import { FBM, SIMPLEX_3D } from './common';

/**
 * Volumetric atmosphere.
 *
 * A large inward-facing sphere that surrounds a chapter's environment. Instead
 * of real light scattering (far too expensive here) it ray-marches a *very*
 * short distance through a noise field along the view direction, which is
 * enough to produce believable drifting nebulosity and depth haze.
 */
export const atmosphereVertexShader = /* glsl */ `
varying vec3 vDirection;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDirection = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const atmosphereFragmentShader = /* glsl */ `
${SIMPLEX_3D}
${FBM}

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uDensity;
uniform float uOpacity;
uniform float uHorizon;

varying vec3 vDirection;
varying vec3 vLocalPos;

void main() {
  vec3 dir = normalize(vDirection);

  // Four taps of two-octave fbm along the view ray.
  //
  // This is the most expensive shader in the film — it covers the whole screen
  // in every chapter, so its per-pixel cost is paid more than any other. It ran
  // six taps of three octaves: eighteen 3D simplex evaluations per pixel. The
  // later taps are weighted 1/(1+i) and the third octave is a fine detail that
  // is immediately swallowed by bloom, grain and the vignette, so eight
  // evaluations produce the same drifting nebulosity for 55% of the arithmetic.
  // The weights below are renormalised so overall density matches the original.
  float density = 0.0;
  vec3 p = vLocalPos * 0.0016;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    density += fbm(p * (1.0 + fi * 0.8) + vec3(0.0, uTime * 0.012, uTime * 0.008), 2, 2.1, 0.5)
             * (1.0 / (1.0 + fi));
    p += dir * 0.09;
  }
  density *= 1.17;
  density = density * 0.5 + 0.5;
  density = pow(clamp(density, 0.0, 1.0), 2.2) * uDensity;

  // Vertical gradient: brighter toward the "horizon" of the volume.
  float h = smoothstep(-0.9, 0.9, dir.y);
  vec3 color = mix(uColorA, uColorB, h * uHorizon + density * 0.5);

  float alpha = density * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color * density * 1.4, alpha);
}
`;

/**
 * God rays / light shafts, rendered as a soft additive cone billboard.
 * Used sparingly — one shaft in the Golden Age, one in the final memory.
 */
export const shaftVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const shaftFragmentShader = /* glsl */ `
${SIMPLEX_3D}

uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uSoftness;

varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  // Radial falloff across the shaft, fading along its length.
  float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
  across = pow(clamp(across, 0.0, 1.0), uSoftness);

  float along = smoothstep(1.0, 0.15, vUv.y);

  // Dust moving through the beam.
  float motes = snoise(vec3(vUv * vec2(6.0, 2.0), uTime * 0.09)) * 0.5 + 0.5;

  float a = across * along * (0.65 + motes * 0.5) * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a * 1.6, a);
}
`;
