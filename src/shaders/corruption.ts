import { COLOR_UTILS, HASH } from './common';

/**
 * The grade + failure pass.
 *
 * This is the shader that makes the whole thing feel like it was shot on
 * something physical and is now being replayed by a machine that is dying:
 *
 *   · anamorphic-ish chromatic aberration that grows toward the frame edge
 *   · barrel distortion and a soft-focus falloff outside the centre
 *   · RGB tearing in horizontal blocks (data loss, not "a glitch filter")
 *   · rolling interlace + a vertical refresh bar
 *   · animated film grain that lives in the shadows, not the highlights
 *   · a lift/gamma/gain grade that cross-fades between chapters
 *   · exposure for the final fade — the machine simply stops rendering
 */
export const corruptionEffectShader = /* glsl */ `
${HASH}
${COLOR_UTILS}

uniform float uTime;
uniform float uCorruption;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uAberration;
uniform float uScanline;
uniform float uDistortion;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uContrast;
uniform float uBleach;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);

  // ---- lens ---------------------------------------------------------------
  vec2 warped = uv + centered * r2 * uDistortion;

  // ---- block tearing ------------------------------------------------------
  float band = floor(warped.y * 34.0);
  float tearGate = step(0.9 - uCorruption * 0.55, hash12(vec2(band, floor(uTime * 12.0))));
  float tear = (hash12(vec2(band, floor(uTime * 12.0) + 3.0)) - 0.5) * 0.13 * uCorruption * tearGate;
  warped.x += tear;

  // Occasional whole-frame slip: one lost sync pulse.
  float slipGate = step(0.985 - uCorruption * 0.05, hash11(floor(uTime * 4.0)));
  warped.y += slipGate * uCorruption * 0.05 * sin(uTime * 60.0);

  // ---- chromatic aberration ----------------------------------------------
  // Grows toward the frame edge, like a real lens — but gently. A steep edge
  // falloff reads as a broken display rather than glass, and it is brutal on
  // scenes full of small bright highlights (a city of lit windows, a starfield).
  float amount = (uAberration + uCorruption * 0.012) * (0.3 + r2 * 1.5);
  vec2 dir = normalize(centered + 1e-6);
  vec3 color;
  color.r = texture2D(inputBuffer, warped + dir * amount).r;
  color.g = texture2D(inputBuffer, warped).g;
  color.b = texture2D(inputBuffer, warped - dir * amount).b;

  // A second, wider red smear only when things are truly failing.
  if (uCorruption > 0.35) {
    vec3 ghost;
    ghost.r = texture2D(inputBuffer, warped + dir * amount * 4.0).r;
    ghost.g = texture2D(inputBuffer, warped - dir * amount * 2.0).g;
    ghost.b = texture2D(inputBuffer, warped + dir * amount * 3.0).b;
    color = mix(color, max(color, ghost), (uCorruption - 0.35) * 0.9);
  }

  // ---- grade --------------------------------------------------------------
  // Contrast pivots at 0.18, not 0.5. This film lives almost entirely in the
  // bottom of the range — a 0.5 pivot would push nearly every pixel in every
  // shot below zero and crush the shadow detail that *is* the image.
  const float PIVOT = 0.18;
  color = color * uGain + uLift;
  color = (color - PIVOT) * uContrast + PIVOT;
  color = saturateColor(color, uSaturation);

  // Bleach bypass — used in the Fall to drain the world of colour.
  float l = luma(color);
  color = mix(color, vec3(l), uBleach);

  // The contrast pivot subtracts, so anything below it comes out negative.
  // Everything downstream (grain weighting, vignette, tone mapping) assumes a
  // non-negative signal — and the ACES approximation in particular maps
  // negative input to *bright* output — so clamp here, once, before it can be
  // amplified back into the picture.
  color = max(color, vec3(0.0));

  // ---- scanlines / interlace ---------------------------------------------
  float scan = sin(uv.y * 900.0 + uTime * 3.0) * 0.5 + 0.5;
  color *= 1.0 - scan * 0.045 * uScanline;
  float roll = fract(uv.y + uTime * 0.07);
  color += vec3(0.02, 0.03, 0.045) * smoothstep(0.02, 0.0, abs(roll - 0.5)) * uScanline;

  // ---- grain --------------------------------------------------------------
  // Grain lives in the midtones. Silver halide has nothing to develop in a
  // fully unexposed frame and saturates in the highlights, so weighting it
  // toward the shadows — the intuitive thing to do — is exactly backwards, and
  // on a film this dark it turns every black frame into television static.
  float g = hash12(uv * vec2(1920.0, 1080.0) + fract(uTime) * 137.0) - 0.5;
  float lg = luma(color);
  float grainWeight = smoothstep(0.0, 0.14, lg) * (1.0 - smoothstep(0.55, 1.0, lg) * 0.75);
  color += g * uGrain * (0.08 + grainWeight);

  // ---- vignette -----------------------------------------------------------
  float vig = 1.0 - smoothstep(0.25, 0.95, length(centered) * (1.0 + uVignette));
  color *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0));

  // ---- exposure / final fade ---------------------------------------------
  color *= uExposure;
  color = aces(color);

  outputColor = vec4(color, inputColor.a);
}
`;
