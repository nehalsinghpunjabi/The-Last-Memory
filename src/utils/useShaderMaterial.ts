'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Owns a ShaderMaterial instance so its uniforms can be mutated from useFrame.
 *
 * This exists because of a genuinely nasty trap:
 *
 *   const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
 *   useFrame(() => { uniforms.uTime.value = t; });          // looks fine
 *   return <shaderMaterial uniforms={uniforms} />;          // is not fine
 *
 * The material does **not** end up holding that object. React Three Fiber
 * reconciles the `uniforms` prop rather than assigning it, so the material gets
 * its own copy — and the component then spends the rest of its life animating
 * an object nobody renders. Nothing errors, nothing warns; the scene simply
 * freezes at its initial uniform values, which is very hard to spot when the
 * initial values are plausible.
 *
 * Constructing the material directly sidesteps the reconciler entirely:
 * `new THREE.ShaderMaterial({ uniforms })` assigns the reference as-is, so the
 * object the render loop writes to is the object the GPU reads from.
 *
 * Usage:
 *   const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
 *   const material = useShaderMaterial(() => ({ vertexShader, fragmentShader, uniforms }), [uniforms]);
 *   return <mesh><primitive object={material} attach="material" /></mesh>;
 */
export function useShaderMaterial(
  factory: () => THREE.ShaderMaterialParameters,
  deps: React.DependencyList = []
): THREE.ShaderMaterial {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => new THREE.ShaderMaterial(factory()), deps);

  // <primitive> does not dispose what it is given — we created it, we free it.
  useEffect(() => () => material.dispose(), [material]);

  return material;
}
