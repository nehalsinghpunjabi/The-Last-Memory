'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { applyHandheld, sampleRail } from '@/lib/cameraRail';
import { scrollState } from '@/lib/scrollState';
import { damp } from '@/utils/math';

/**
 * The camera operator.
 *
 * Reads the rail, adds handheld drift, and applies a Dutch roll — then damps
 * toward that pose rather than snapping to it. The damping is the reason the
 * camera feels like it has *mass*: fast scrolling does not teleport it, it
 * drags it, and it settles afterwards the way a real crane settles.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const pos = useRef(new THREE.Vector3(0, 1.2, 62));
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const fov = useRef(46);
  const matrix = useRef(new THREE.Matrix4());
  const quat = useRef(new THREE.Quaternion());
  const rollQuat = useRef(new THREE.Quaternion());
  const forward = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const t = scrollState.eased;

    const sample = sampleRail(t);

    // Handheld intensity rises with the shot's own setting and with how badly
    // the archive is failing.
    const intensity = sample.shake * (1 + scrollState.corruption * 2.4);
    applyHandheld(sample, scrollState.elapsed, intensity);

    // Damping: heavier for position (mass) than for aim (intent).
    pos.current.x = damp(pos.current.x, sample.position.x, 5.5, delta);
    pos.current.y = damp(pos.current.y, sample.position.y, 5.5, delta);
    pos.current.z = damp(pos.current.z, sample.position.z, 5.5, delta);

    target.current.x = damp(target.current.x, sample.target.x, 7.5, delta);
    target.current.y = damp(target.current.y, sample.target.y, 7.5, delta);
    target.current.z = damp(target.current.z, sample.target.z, 7.5, delta);

    camera.position.copy(pos.current);

    // Aim.
    matrix.current.lookAt(pos.current, target.current, up.current);
    quat.current.setFromRotationMatrix(matrix.current);

    // Roll about the view axis, not the world axis — a real Dutch angle.
    forward.current.subVectors(target.current, pos.current).normalize();
    rollQuat.current.setFromAxisAngle(forward.current, sample.roll);
    quat.current.premultiply(rollQuat.current);

    camera.quaternion.slerp(quat.current, 1 - Math.exp(-9 * delta));

    // Focal length. Damped so zooms breathe instead of stepping.
    fov.current = damp(fov.current, sample.fov, 5, delta);
    if (Math.abs(camera.fov - fov.current) > 0.002) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
