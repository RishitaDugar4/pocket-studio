"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSelectionStore } from "@/stores/selectionStore";
import { useViewportStore } from "@/stores/viewportStore";
import { objectKey, useObjectRegistry } from "./objectRegistry";

interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

/** Implements the F shortcut: put the selected object in the middle of the set view. */
export function FrameController() {
  const frameToken = useViewportStore((s) => s.frameToken);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  useEffect(() => {
    if (frameToken === 0 || !controls) return;
    const selection = useSelectionStore.getState().selection;
    const object = selection
      ? useObjectRegistry.getState().objects[objectKey(selection.kind, selection.id)]
      : null;

    const focus = new THREE.Vector3(0, 1, 0);
    let radius = 3.2;
    if (object) {
      const box = new THREE.Box3().setFromObject(object);
      if (!box.isEmpty()) {
        box.getCenter(focus);
        radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.9, 1.1);
      } else {
        focus.copy(object.position);
      }
    }

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 0.001) direction.set(3, 2.4, 3.4);
    direction.setLength(radius * 2.1);
    controls.target.copy(focus);
    camera.position.copy(focus.clone().add(direction));
    controls.update();
  }, [frameToken, camera, controls]);

  return null;
}
