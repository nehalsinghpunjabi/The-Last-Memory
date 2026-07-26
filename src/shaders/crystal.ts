import { FRESNEL, SIMPLEX_3D } from './common';

/**
 * The memory crystal.
 *
 * Faked refraction: rather than paying for a transmission pass, we sample an
 * environment-ish procedural gradient along a refracted view vector and add
 * strong iridescent fresnel plus internal caustic banding. At the scale the
 * crystal is seen (a speck against a dead universe) this is indistinguishable
 * from the real thing and costs a fraction of the frame.
 *
 * Rendered with side = DoubleSide so the camera can start *inside* it.
 */
export const crystalVertexShader = /* glsl */ `
${SIMPLEX_3D}

uniform float uTime;
uniform float uFacet;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec3 vObjPos;

void main() {
  vec3 pos = position;

  // Breathe the facets very slightly — the crystal is still holding something.
  pos += normal * snoise(position * 0.6 + uTime * 0.05) * uFacet;

  vObjPos = pos;
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = cameraPosition - world.xyz;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const crystalFragmentShader = /* glsl */ `
${FRESNEL}
${SIMPLEX_3D}

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uInnerColor;
uniform float uOpacity;
uniform float uPower;
uniform float uLife;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec3 vObjPos;

void main() {
  vec3 V = normalize(vViewDir);
  vec3 N = normalize(vNormal);

  float f = fresnel(V, N, 2.1);

  // Fake refraction — bend the view ray and sample a procedural interior.
  vec3 refr = refract(-V, N, 0.72);
  float interior = snoise(refr * 2.4 + vObjPos * 0.8 + uTime * 0.07) * 0.5 + 0.5;

  // Caustic banding along the refracted ray.
  float caustic = pow(abs(sin(interior * 9.0 + uTime * 0.35)), 6.0);

  // Iridescence: split the fresnel across RGB by a tiny index difference.
  vec3 irid = vec3(
    fresnel(V, N, 1.9),
    fresnel(V, N, 2.1),
    fresnel(V, N, 2.35)
  );

  vec3 color = uInnerColor * interior * 0.6;
  color += uColor * irid * uPower;
  color += uColor * caustic * 0.9 * uLife;

  // The light inside is the last thing to go.
  float heart = smoothstep(1.4, 0.0, length(vObjPos)) * uLife;
  color += uInnerColor * heart * 1.6;

  float alpha = clamp(f * 0.85 + caustic * 0.35 + heart * 0.4, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(color, alpha);
}
`;
