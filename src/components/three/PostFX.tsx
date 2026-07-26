'use client';

import { EffectComposer } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BloomEffect, KernelSize } from 'postprocessing';
import { CorruptionEffectImpl } from './effects/CorruptionEffect';
import { computeGrade } from '@/lib/director';
import { scrollState } from '@/lib/scrollState';
import { quality } from '@/lib/quality';
import type { DeviceProfile } from '@/utils/device';
import { lerp } from '@/utils/math';

interface Props {
  device: DeviceProfile;
}

/**
 * Post-processing chain.
 *
 * Two passes, and no more. Bloom (mipmap-blurred, so it stays cheap and soft
 * rather than boxy) followed by a single combined grade/lens/failure pass.
 * Everything a lesser stack would add — vignette, noise, chromatic aberration,
 * scanlines, tone mapping — is folded into that one shader so the frame is
 * only read and written once.
 *
 * Both effects are instantiated directly and mounted with `<primitive>` rather
 * than using the library's `<Bloom>` wrapper. The wrapper memoises on
 * `JSON.stringify(props)`, and under React 19 `ref` is an ordinary prop — so
 * serialising it walks into R3F's `__r3f` instance graph and throws on the
 * circular reference. Owning the instances also means uniforms can be driven
 * from `useFrame` with no React involvement at all.
 */
export function PostFX({ device }: Props) {
  const bloom = useMemo(
    () =>
      new BloomEffect({
        intensity: 0.9,
        luminanceThreshold: 0.12,
        luminanceSmoothing: 0.42,
        mipmapBlur: true,
        radius: 0.72,
        // Each level is another downsample + upsample pass over the whole
        // frame. Beyond ~6 the mips are so small that they only add a very wide,
        // very faint halo that the grain and vignette swallow entirely — two
        // full-frame passes bought nothing visible, so they are gone.
        levels: device.heavyPostFX ? 6 : 4,
        kernelSize: device.heavyPostFX ? KernelSize.LARGE : KernelSize.MEDIUM,
      }),
    [device.heavyPostFX]
  );

  const corruption = useMemo(() => new CorruptionEffectImpl(), []);

  // Dev-only handle so scripts/ can read and poke the grade uniforms.
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    const w = window as unknown as { __TLM?: Record<string, unknown> };
    if (w.__TLM) w.__TLM.post = { bloom, corruption };
  }

  useFrame(() => {
    const t = scrollState.eased;
    const c = scrollState.corruption;
    const grade = computeGrade(t, c);

    corruption.time = scrollState.elapsed;
    corruption.corruption = c;
    corruption.exposure = scrollState.exposure;
    corruption.vignette = grade.vignette;
    corruption.grain = grade.grain;
    corruption.aberration = grade.aberration;
    corruption.scanline = grade.scanline;
    corruption.distortion = grade.distortion;
    corruption.saturation = grade.saturation;
    corruption.contrast = grade.contrast;
    corruption.bleach = grade.bleach;
    corruption.lift.copy(grade.lift);
    corruption.gain.copy(grade.gain);

    // Bloom swells with the Golden Age and with corruption spikes alike — the
    // machine's light behaves the same whether it is joyful or failing. In
    // performance mode it is dialled back to shed additive-combine overdraw.
    const perf = quality.perfMode ? 0.72 : 1;
    bloom.intensity = grade.bloom * lerp(1, 1.5, c) * scrollState.exposure * perf;
  });

  return (
    // MSAA is off on every tier. The composer's output is bloomed, grain-
    // finished and vignetted, which destroys exactly the sub-pixel edge detail
    // multisampling preserves — so 2x was paying for a full-resolution resolve
    // every frame and handing the result to a shader that threw it away.
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={bloom} dispose={null} />
      <primitive object={corruption} dispose={null} />
    </EffectComposer>
  );
}
