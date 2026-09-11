"use client";

import * as THREE from "three";

/**
 * Lets DOM drag-and-drop reach into the 3D scene: the bridge holds the live
 * render camera, and `floorPointFromEvent` turns a drop position into a spot on
 * the floor. Kept outside React because it is read during a DOM event.
 */
export const dropBridge = {
  camera: null as THREE.Camera | null,
};

const raycaster = new THREE.Raycaster();
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
const pointer = new THREE.Vector2();

export function floorPointFromEvent(
  event: { clientX: number; clientY: number },
  element: HTMLElement,
): [number, number, number] | null {
  const camera = dropBridge.camera;
  if (!camera) return null;
  const rect = element.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const point = raycaster.ray.intersectPlane(floor, hit);
  if (!point) return null;
  return [
    Math.round(point.x * 100) / 100,
    0,
    Math.round(point.z * 100) / 100,
  ];
}
