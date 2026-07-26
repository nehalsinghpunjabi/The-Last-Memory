/**
 * Procedurally generated impulse responses.
 *
 * Shipping a 2MB cathedral IR would be the obvious thing to do; generating one
 * costs ~8ms and keeps the whole experience asset-free. The shape (exponential
 * decay over decorrelated noise, with a slight high-frequency roll-off applied
 * by a running average) reads as a very large, very empty room — which is
 * exactly the room this story takes place in.
 */
export function createImpulseResponse(
  ctx: BaseAudioContext,
  seconds: number,
  decay: number,
  brightness = 0.55
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    // Slight inter-channel decorrelation widens the stereo field.
    const seed = ch === 0 ? 0.0 : 0.37;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const white = Math.random() * 2 - 1;
      lp += (white - lp) * brightness * (1 - t * 0.7);
      const env = Math.pow(1 - t, decay);
      // Pre-delay-ish fade-in avoids a clicky transient.
      const attack = Math.min(1, i / (rate * 0.012));
      data[i] = lp * env * attack * (1 - seed * 0.15 * Math.sin(t * 40 + ch));
    }
  }
  return buffer;
}

/** A short, metallic IR used for glitch artefacts. */
export function createGlitchImpulse(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * 0.18);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const comb = Math.sin(i * (ch === 0 ? 0.21 : 0.19)) > 0 ? 1 : -1;
      data[i] = (Math.random() * 2 - 1) * comb * Math.pow(1 - t, 3.4);
    }
  }
  return buffer;
}
