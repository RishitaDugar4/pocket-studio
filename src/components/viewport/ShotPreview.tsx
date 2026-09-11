"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, DepthOfField, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { getLightingPreset } from "@/data/lighting";
import { bokehStrength, calculateDepthOfField, evaluateMovement, verticalFovDeg, v } from "@/lib/cinematography";
import { focusPointFor } from "@/lib/cinematography/focus";
import { useTimelineStore } from "@/stores/timelineStore";
import { SceneContents } from "./SceneContents";
import { StageClockDriver } from "./PlaybackClock";
import { CaptureBridgeBinding } from "./CaptureBridgeBinding";
import type { SceneDoc, ShotDoc } from "@/types";

/**
 * Plays one shot: its own frozen camera, its own move, over the scene's
 * blocking. Nothing here reads the live scene camera — a shot is independent of
 * it the moment it is captured (§18).
 */
export function ShotPreview({
  scene,
  shot,
  time,
  timeSource,
  capturable = false,
  className,
}: {
  scene: SceneDoc;
  shot: ShotDoc;
  /** Seconds into the shot. Omit to follow the global playback clock. */
  time?: number;
  /** Per-frame time source, for playback that must not re-render React. */
  timeSource?: () => number;
  /** Allow this preview to be grabbed as a storyboard frame. */
  capturable?: boolean;
  className?: string;
}) {
  const preset = getLightingPreset(scene.lightingPreset);
  const focusPoint = useMemo(() => focusPointFor(scene, shot.cameraState.focusTargetId), [scene, shot]);

  const dof = useMemo(() => {
    if (!shot.cameraState.dofEnabled) return null;
    const target = focusPoint ?? shot.cameraState.target;
    const distance = v.distance(shot.cameraState.position, target);
    return {
      distance,
      math: calculateDepthOfField(
        shot.cameraState.focalLength,
        shot.cameraState.aperture,
        distance,
      ),
      bokeh: bokehStrength(shot.cameraState.focalLength, shot.cameraState.aperture, distance),
    };
  }, [shot, focusPoint]);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: capturable,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      className={className}
    >
      <color attach="background" args={[preset.backgroundColor]} />
      <fog attach="fog" args={[preset.backgroundColor, 22, 90]} />
      {capturable ? <CaptureBridgeBinding slot="preview" /> : null}
      {/* Actors play the scene from where this shot sits in it. */}
      <StageClockDriver
        getSceneTime={() => shot.sceneTime + (timeSource?.() ?? time ?? shotTimeFromClock(shot))}
      />
      <ShotCamera shot={shot} time={time} timeSource={timeSource} />
      <SceneContents scene={scene} mode="CAMERA" preview />
      {dof ? (
        <EffectComposer>
          <DepthOfField
            worldFocusDistance={dof.distance}
            worldFocusRange={Math.max((dof.math.totalDepth ?? dof.distance) * 3, 0.3)}
            bokehScale={dof.bokeh}
            height={480}
          />
          <Vignette eskil={false} offset={0.24} darkness={0.42} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}

function ShotCamera({
  shot,
  time,
  timeSource,
}: {
  shot: ShotDoc;
  time?: number;
  timeSource?: () => number;
}) {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  const movement = shot.movements[0] ?? null;

  useFrame((state) => {
    const camera = ref.current;
    if (!camera) return;
    const elapsed = timeSource?.() ?? time ?? shotTimeFromClock(shot);
    const frame = movement
      ? evaluateMovement(
          { position: movement.startTransform.position, target: movement.startTransform.target },
          movement.type,
          Math.min(Math.max((elapsed - movement.startTime) / Math.max(movement.duration, 0.001), 0), 1),
          { intensity: movement.intensity, elapsed },
        )
      : { position: shot.cameraState.position, target: shot.cameraState.target, roll: 0 };

    camera.position.set(...frame.position);
    camera.up.set(Math.sin(frame.roll), Math.cos(frame.roll), 0);
    camera.lookAt(...frame.target);

    const fov = verticalFovDeg(shot.cameraState.focalLength);
    const aspect = state.size.width / state.size.height;
    if (camera.fov !== fov || camera.aspect !== aspect) {
      camera.fov = fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
  });

  return <PerspectiveCamera ref={ref} makeDefault near={0.03} far={220} />;
}

/** Shots are authored against scene time, so the clock has to be offset. */
function shotTimeFromClock(shot: ShotDoc): number {
  return Math.max(useTimelineStore.getState().currentTime - shot.sceneTime, 0);
}
