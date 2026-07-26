import { HASH, SIMPLEX_3D } from './common';

/**
 * Memory fragments.
 *
 * A photograph that is not quite a photograph: scanned, re-scanned, and losing
 * a little of itself each time. The shader layers (a) chromatic separation that
 * grows with corruption, (b) horizontal block displacement, (c) interlace
 * scanlines, (d) an edge burn that keeps fragments from looking like flat
 * rectangles, and (e) a slow vertical "read head" sweep — the AI physically
 * scanning the memory as it recalls it.
 */
export const hologramVertexShader = /* glsl */ `
${SIMPLEX_3D}

uniform float uTime;
uniform float uCorruption;
uniform float uCurl;

varying vec2 vUv;
varying vec3 vViewDir;
varying float vDepth;

void main() {
  vUv = uv;
  vec3 pos = position;

  // A very slight curl gives the plane the presence of physical film.
  float curl = (uv.x - 0.5) * (uv.y - 0.5) * uCurl;
  pos.z += curl + snoise(vec3(uv * 2.0, uTime * 0.15)) * 0.03 * (1.0 + uCorruption * 3.0);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vViewDir = -mv.xyz;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const hologramFragmentShader = /* glsl */ `
${HASH}
${SIMPLEX_3D}

uniform sampler2D uTexture;
uniform float uTime;
uniform float uOpacity;
uniform float uCorruption;
uniform float uReveal;
uniform vec3 uTint;
uniform float uScanIntensity;
uniform float uWarmth;
uniform float uSeed;
uniform float uFocus;
/** 1 when this fragment carries a real historical record (a selectable artifact). */
uniform float uArtifact;
/** 0..1 pointer/focus proximity — drives the highlight. */
uniform float uHover;

varying vec2 vUv;
varying vec3 vViewDir;
varying float vDepth;

void main() {
  vec2 uv = vUv;

  // ---- block displacement -------------------------------------------------
  float blockLine = floor(uv.y * 28.0);
  float glitchGate = step(0.86 - uCorruption * 0.45, hash12(vec2(blockLine, floor(uTime * 9.0 + uSeed))));
  float shift = (hash12(vec2(blockLine, floor(uTime * 9.0))) - 0.5) * 0.09 * uCorruption * glitchGate;
  uv.x += shift;

  // ---- rack focus + chromatic separation ---------------------------------
  // uFocus 0 → 1 resolves the memory from soft to sharp as the camera arrives.
  // A cheap 5-tap disc blur whose radius collapses to zero at full focus, with
  // the R/B channels split for chromatic aberration.
  float blur = (1.0 - uFocus) * 0.03;
  float ca = 0.0016 + uCorruption * 0.018 + blur * 0.25;
  vec3 color = vec3(
    texture2D(uTexture, uv + vec2(ca, 0.0)).r,
    texture2D(uTexture, uv).g,
    texture2D(uTexture, uv - vec2(ca, 0.0)).b
  );
  if (blur > 0.0006) {
    color += texture2D(uTexture, uv + vec2(blur, blur)).rgb;
    color += texture2D(uTexture, uv + vec2(-blur, blur)).rgb;
    color += texture2D(uTexture, uv + vec2(blur, -blur)).rgb;
    color += texture2D(uTexture, uv + vec2(-blur, -blur)).rgb;
    color *= 0.2; // average the centre sample with the four disc taps
  }

  // ---- read head ----------------------------------------------------------
  float head = fract(uTime * 0.11 + uSeed);
  float headBand = smoothstep(0.035, 0.0, abs(uv.y - head));
  color += uTint * headBand * 0.5;

  // ---- interlace ----------------------------------------------------------
  float scan = sin(uv.y * 620.0 + uTime * 2.0) * 0.5 + 0.5;
  color *= 1.0 - scan * 0.14 * uScanIntensity;
  color *= 1.0 - step(0.5, fract(uv.y * 160.0)) * 0.05 * uScanIntensity;

  // ---- grade --------------------------------------------------------------
  // Human memories are warm; the machine's rendering of them is cold. Warmth
  // is a uniform so the Golden Age can be remembered in gold and the Fall in
  // ash, from the same texture.
  vec3 warm = color * vec3(1.12, 1.0, 0.86);
  vec3 cool = color * vec3(0.78, 0.94, 1.18);
  color = mix(cool, warm, uWarmth);
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, 0.55 + uWarmth * 0.5);
  color *= uTint;

  // ---- edges --------------------------------------------------------------
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.045, min(e.x, e.y));
  float burn = smoothstep(0.0, 0.12, min(e.x, e.y));
  color += uTint * (1.0 - burn) * 0.25;

  // ---- reveal & decay -----------------------------------------------------
  // Fragments materialise as a dissolve driven by noise, not a crossfade.
  float dissolve = snoise(vec3(vUv * 5.0, uSeed)) * 0.5 + 0.5;
  float appear = smoothstep(dissolve - 0.35, dissolve + 0.15, uReveal);

  // Whole rows drop out at high corruption — data loss, not a filter.
  float dropout = step(uCorruption * 0.55, hash12(vec2(blockLine * 3.1, floor(uTime * 5.0))));

  float alpha = uOpacity * edge * appear * dropout;
  // Depth cueing: distant fragments sit back in the haze.
  alpha *= 1.0 - 0.45 * smoothstep(8.0, 160.0, vDepth);

  // ---- artifact affordance ------------------------------------------------
  // uArtifact marks a fragment that holds a real historical record. It carries
  // a slow breathing lift so it reads as *selectable* without ever looking like
  // a web button, and uHover adds a bright inner edge on approach — the frame
  // catching the light as you lean toward it in a vitrine.
  float breathe = 0.5 + 0.5 * sin(uTime * 1.1 + uSeed);
  color += uTint * uArtifact * (0.06 + 0.05 * breathe);
  alpha *= 1.0 + uArtifact * (0.10 + 0.08 * breathe);

  float frame = 1.0 - smoothstep(0.0, 0.085, min(e.x, e.y));
  color += uTint * frame * uHover * 1.5;
  color *= 1.0 + uHover * 0.35;
  alpha *= 1.0 + uHover * 0.5;

  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color, alpha);
}
`;
