"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { captureBridge, type CaptureSlot } from "./captureBridge";

/**
 * Registers this renderer as grabbable.
 *
 * The viewport renders through the scene builder's shot camera, which its rig
 * publishes; a preview already renders through the shot's own camera and must
 * ignore that, or every card it develops comes out framed like the live camera.
 */
export function CaptureBridgeBinding({ slot = "viewport" }: { slot?: CaptureSlot }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const defaultCamera = useThree((s) => s.camera);

  useEffect(() => {
    const grab = () => {
      const camera = slot === "viewport" ? (captureBridge.shotCamera ?? defaultCamera) : defaultCamera;
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/jpeg", 0.75);
      } catch (error) {
        console.error("Frame capture failed", error);
        return null;
      }
    };

    captureBridge.grabbers.set(slot, grab);
    return () => {
      if (captureBridge.grabbers.get(slot) === grab) captureBridge.grabbers.delete(slot);
    };
  }, [gl, scene, defaultCamera, slot]);

  return null;
}
