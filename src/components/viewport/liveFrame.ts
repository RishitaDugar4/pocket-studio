import * as THREE from "three";

/**
 * The active camera's transform for the current frame, including any movement
 * preview. Mutated once per frame by CameraRig and read by the frustum helper,
 * the DOF pass and the HUD — deliberately outside React so a moving camera
 * never triggers a re-render.
 */
export const liveFrame = {
  position: new THREE.Vector3(3.2, 1.6, 3.6),
  target: new THREE.Vector3(0, 1.1, 0),
  roll: 0,
  focalLength: 35,
  aperture: 2.8,
  focusDistance: 3,
  /** Metres between camera and the framed subject, for the HUD readout. */
  subjectDistance: 3,
};

export function frameAspect(aspect: number, focalLength: number) {
  return { aspect, focalLength };
}
