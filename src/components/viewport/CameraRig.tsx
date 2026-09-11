"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { evaluateMovement, verticalFovDeg, v } from "@/lib/cinematography";
import { useTimelineStore } from "@/stores/timelineStore";
import type { CameraDoc, Vec3 } from "@/types";
import { liveFrame } from "./liveFrame";
import { captureBridge } from "./captureBridge";

/**
 * Owns both cameras: the editor's orbit camera (for staging) and the active
 * scene camera (the director's viewfinder). Only one is the render camera at a
 * time; the other still updates so the frustum helper stays truthful.
 */
export function CameraRig({
  camera,
  mode,
  aspect,
  focusPoint,
}: {
  camera: CameraDoc;
  mode: "ORBIT" | "CAMERA";
  aspect: number;
  focusPoint: Vec3 | null;
}) {
  const editorRef = useRef<THREE.PerspectiveCamera>(null);
  const shotRef = useRef<THREE.PerspectiveCamera>(null);

  // Publish the shot camera so a capture always renders the real framing,
  // whichever view the director happens to be working in.
  useEffect(() => {
    captureBridge.shotCamera = shotRef.current;
    return () => {
      captureBridge.shotCamera = null;
    };
  }, [mode]);
  const size = useThree((s) => s.size);

  const base = useMemo(
    () => ({ position: camera.position, target: camera.target }),
    [camera.position, camera.target],
  );

  useFrame(() => {
    const { currentTime } = useTimelineStore.getState();
    const duration = Math.max(camera.movementDuration, 0.1);
    const progress = Math.min(currentTime / duration, 1);
    const frame = evaluateMovement(base, camera.movementType, progress, {
      intensity: camera.movementIntensity,
      elapsed: currentTime,
    });

    liveFrame.position.set(...frame.position);
    liveFrame.target.set(...frame.target);
    liveFrame.roll = frame.roll;
    liveFrame.focalLength = camera.focalLength;
    liveFrame.aperture = camera.aperture;
    liveFrame.subjectDistance = v.distance(frame.position, frame.target);
    liveFrame.focusDistance = focusPoint
      ? v.distance(frame.position, focusPoint)
      : liveFrame.subjectDistance;

    const shot = shotRef.current;
    if (shot) {
      shot.position.copy(liveFrame.position);
      shot.up.set(Math.sin(frame.roll), Math.cos(frame.roll), 0);
      shot.lookAt(liveFrame.target);
      const fov = verticalFovDeg(camera.focalLength);
      const aspectRatio = mode === "CAMERA" ? size.width / size.height : aspect;
      if (shot.fov !== fov || shot.aspect !== aspectRatio) {
        shot.fov = fov;
        shot.aspect = aspectRatio;
        shot.updateProjectionMatrix();
      }
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={editorRef}
        makeDefault={mode === "ORBIT"}
        fov={42}
        near={0.05}
        far={220}
        position={[6.4, 4.6, 7.2]}
      />
      <PerspectiveCamera
        ref={shotRef}
        makeDefault={mode === "CAMERA"}
        fov={verticalFovDeg(camera.focalLength)}
        near={0.03}
        far={220}
      />
      <OrbitControls
        makeDefault
        enabled={mode === "ORBIT"}
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.14}
        minDistance={0.8}
        maxDistance={48}
        maxPolarAngle={Math.PI * 0.495}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
    </>
  );
}
