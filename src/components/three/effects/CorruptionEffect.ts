'use client';

import * as THREE from 'three';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { corruptionEffectShader } from '@/shaders/corruption';

/**
 * The final pass: colour grade, lens, film and failure, in one shader.
 *
 * Declared as a CONVOLUTION effect because it samples `inputBuffer` at offsets
 * of its own choosing (chromatic aberration, block tearing) — postprocessing
 * needs to know not to merge it into a shared pass.
 */
export class CorruptionEffectImpl extends Effect {
  constructor() {
    super('CorruptionEffect', corruptionEffectShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uTime', new THREE.Uniform(0)],
        ['uCorruption', new THREE.Uniform(0)],
        ['uExposure', new THREE.Uniform(1)],
        ['uVignette', new THREE.Uniform(0.7)],
        ['uGrain', new THREE.Uniform(0.05)],
        ['uAberration', new THREE.Uniform(0.0016)],
        ['uScanline', new THREE.Uniform(0.4)],
        ['uDistortion', new THREE.Uniform(0.06)],
        ['uLift', new THREE.Uniform(new THREE.Color(0x02040a))],
        ['uGain', new THREE.Uniform(new THREE.Color(0xffffff))],
        ['uSaturation', new THREE.Uniform(1)],
        ['uContrast', new THREE.Uniform(1)],
        ['uBleach', new THREE.Uniform(0)],
      ]),
    });
  }

  private u(name: string) {
    return this.uniforms.get(name)!;
  }

  set time(v: number) {
    this.u('uTime').value = v;
  }
  set corruption(v: number) {
    this.u('uCorruption').value = v;
  }
  set exposure(v: number) {
    this.u('uExposure').value = v;
  }
  set vignette(v: number) {
    this.u('uVignette').value = v;
  }
  set grain(v: number) {
    this.u('uGrain').value = v;
  }
  set aberration(v: number) {
    this.u('uAberration').value = v;
  }
  set scanline(v: number) {
    this.u('uScanline').value = v;
  }
  set distortion(v: number) {
    this.u('uDistortion').value = v;
  }
  set saturation(v: number) {
    this.u('uSaturation').value = v;
  }
  set contrast(v: number) {
    this.u('uContrast').value = v;
  }
  set bleach(v: number) {
    this.u('uBleach').value = v;
  }
  get lift(): THREE.Color {
    return this.u('uLift').value as THREE.Color;
  }
  get gain(): THREE.Color {
    return this.u('uGain').value as THREE.Color;
  }
}
