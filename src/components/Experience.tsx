'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneDirector } from './three/SceneDirector';
import { PostFX } from './three/PostFX';
import { PerformanceGovernor } from './three/PerformanceGovernor';
import { CAMERA } from '@/lib/constants';
import { useExperience } from '@/lib/store';
import { scrollState } from '@/lib/scrollState';
import { quality } from '@/lib/quality';
import { disposeMemoryTextures } from '@/assets/memoryTextures';

/**
 * Flips `renderReady` once WebGL has actually produced a few frames — meaning
 * the prologue's shaders have finished their (synchronous) first-frame compile.
 * The BEGIN control waits on this, so the film can never start on a black
 * screen while a slow GPU is still compiling.
 */
function RenderReadySignal() {
  const setRenderReady = useExperience((s) => s.setRenderReady);
  const invalidate = useThree((s) => s.invalidate);
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) {
      setRenderReady(true);
      invalidate();
    }
  });
  return null;
}

/**
 * The WebGL layer.
 *
 * Tone mapping is disabled on the renderer because the final grade pass applies
 * ACES itself — doing it twice would flatten every highlight in the film. The
 * canvas is fixed behind the scroll spacer and never receives pointer events:
 * the only input this experience takes is scroll.
 */
export function Experience() {
  const device = useExperience((s) => s.device);
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  const setPhase = useExperience((s) => s.setPhase);
  const phase = useExperience((s) => s.phase);

  // Procedural assets are built synchronously on first scene mount; the boot
  // sequence needs a beat to breathe regardless, so we run a short scripted
  // "archive check" rather than a fake progress bar. The bar holds just short
  // of full until WebGL has actually rendered (renderReady), so BEGIN never
  // appears before there is a frame behind it — even on a slow GPU.
  useEffect(() => {
    if (phase !== 'boot') return;
    let raf = 0;
    const start = performance.now();
    const DURATION = 2600;

    const tick = () => {
      const elapsed = (performance.now() - start) / DURATION;
      const ready = useExperience.getState().renderReady;
      // Advance to 100% only when both the scripted beat *and* the first frame
      // are done; otherwise hold at 92%.
      const p = ready ? Math.min(1, elapsed) : Math.min(0.92, elapsed);
      setLoadProgress(p);
      if (elapsed >= 1 && ready) {
        setPhase('ready');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, setLoadProgress, setPhase]);

  useEffect(() => () => disposeMemoryTextures(), []);

  return (
    <div className="fixed inset-0 z-0 h-[100svh] w-full">
      <Canvas
        dpr={device.dpr}
        gl={{
          antialias: device.tier !== 'low',
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
        }}
        camera={{
          fov: CAMERA.fov,
          near: CAMERA.near,
          far: CAMERA.far,
          position: [0, 1.2, 62],
        }}
        onCreated={({ gl, scene, camera }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(0x000000, 1);
          scene.background = new THREE.Color(0x000000);

          // Dev-only handle for scripts/probe-scene.mjs. Stripped from
          // production builds by the bundler's dead-code elimination.
          if (process.env.NODE_ENV !== 'production') {
            (window as unknown as { __TLM?: unknown }).__TLM = {
              gl,
              scene,
              camera,
              scrollState,
              quality,
            };
          }
        }}
        // The canvas now accepts pointer events so artifacts inside the film can
        // be hovered and selected directly. `touchAction: manipulation` keeps
        // the browser from waiting on a double-tap gesture before delivering a
        // tap, so artifacts respond immediately on touch, while vertical
        // scrolling still reaches Lenis (which listens on the window).
        style={{ touchAction: 'manipulation' }}
      >
        <Suspense fallback={null}>
          <SceneDirector device={device} />
          <PostFX device={device} />
          <Preload all />
        </Suspense>
        <PerformanceGovernor device={device} />
        <RenderReadySignal />
      </Canvas>
    </div>
  );
}
