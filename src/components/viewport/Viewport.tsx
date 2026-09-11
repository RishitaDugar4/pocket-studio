"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, DepthOfField, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { bodyHeight, poseAimDrop } from "@/data/characters";
import { getLightingPreset } from "@/data/lighting";
import { getPropDefinition } from "@/data/props";
import {
  bokehStrength,
  calculateDepthOfField,
  getShotSizeSpec,
  shotSizeForDistance,
  v,
} from "@/lib/cinematography";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { aspectValue, useViewportStore } from "@/stores/viewportStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { SceneDoc, Vec3 } from "@/types";
import { CameraRig } from "./CameraRig";
import { Gizmo } from "./Gizmo";
import { Guides } from "./Guides";
import { SceneContents } from "./SceneContents";
import { ViewportToolbar } from "./ViewportToolbar";
import { PlaybackClock } from "./PlaybackClock";
import { DropBridgeBinding } from "./DropBridgeBinding";
import { FrameController } from "./FrameController";
import { floorPointFromEvent } from "./dropBridge";

/** The monitor. Everything the director decides shows up here immediately. */
export function Viewport({ scene }: { scene: SceneDoc }) {
  const mode = useViewportStore((s) => s.mode);
  const guides = useViewportStore((s) => s.guides);
  const aspectId = useViewportStore((s) => s.aspectId);
  const flashToken = useViewportStore((s) => s.flashToken);
  const selection = useSelectionStore((s) => s.selection);
  const aspect = aspectValue(aspectId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  // Letterbox the canvas itself in camera view, so the frame is never a lie.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = element;
      setBox({ width: clientWidth, height: clientHeight });
    });
    observer.observe(element);
    setBox({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  const frame = useMemo(() => {
    if (!box || mode === "ORBIT") return null;
    const width = Math.min(box.width, box.height * aspect);
    return { width, height: width / aspect };
  }, [box, mode, aspect]);

  const activeCamera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const preset = getLightingPreset(scene.lightingPreset);
  const focusPoint = useFocusPoint(scene);
  const dofSubject = focusPoint ?? activeCamera?.target ?? null;

  const dof = useMemo(() => {
    if (!activeCamera || !dofSubject) return null;
    const distance = v.distance(activeCamera.position, dofSubject);
    return {
      distance,
      math: calculateDepthOfField(activeCamera.focalLength, activeCamera.aperture, distance),
      bokeh: bokehStrength(activeCamera.focalLength, activeCamera.aperture, distance),
    };
  }, [activeCamera, dofSubject]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ink-950">
      <ViewportToolbar />

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          onDragOver={(event) => {
            if (useViewportStore.getState().pendingAsset) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const pending = useViewportStore.getState().pendingAsset;
            if (!pending) return;
            const point = floorPointFromEvent(event, event.currentTarget as HTMLElement);
            dropAsset(pending, point);
            useViewportStore.getState().setPendingAsset(null);
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[width,height] duration-200"
          style={
            frame
              ? { width: frame.width, height: frame.height }
              : { width: "100%", height: "100%" }
          }
        >
          <Canvas
            shadows
            dpr={[1, 1.75]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl, scene: threeScene }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              threeScene.background = new THREE.Color(preset.backgroundColor);
            }}
            className="!absolute inset-0"
          >
            <color attach="background" args={[preset.backgroundColor]} />
            <fog attach="fog" args={[preset.backgroundColor, 22, 90]} />

            <PlaybackClock />
            <DropBridgeBinding />
            <FrameController />
            {activeCamera ? (
              <CameraRig
                camera={activeCamera}
                mode={mode}
                aspect={aspect}
                focusPoint={activeCamera.dofEnabled ? dofSubject : null}
              />
            ) : null}

            <SceneContents scene={scene} mode={mode} />
            {mode === "ORBIT" && selection ? <Gizmo selection={selection} /> : null}

            {mode === "CAMERA" && activeCamera?.dofEnabled && dof ? (
              <EffectComposer>
                <DepthOfField
                  worldFocusDistance={dof.distance}
                  // Three times the true depth keeps the subject readable while
                  // the falloff still shows how shallow the choice was.
                  worldFocusRange={Math.max((dof.math.totalDepth ?? dof.distance) * 3, 0.3)}
                  bokehScale={dof.bokeh}
                  height={560}
                />
                <Vignette eskil={false} offset={0.24} darkness={0.42} />
              </EffectComposer>
            ) : null}
          </Canvas>

          {mode === "CAMERA" ? <Guides guides={guides} /> : null}
          {mode === "CAMERA" ? <FrameHud scene={scene} /> : null}

          {/* Shutter flash for capture + snap feedback (§38). */}
          <div
            key={flashToken}
            className={
              flashToken > 0
                ? "animate-shutter pointer-events-none absolute inset-0 bg-fog-100"
                : "hidden"
            }
          />
        </div>

        {mode === "CAMERA" ? (
          <div className="pointer-events-none absolute inset-0 border border-ink-800" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Adds a dragged asset where it was dropped. Placement is the one thing the
 * director should not have to think about, so a failed raycast still places the
 * asset at the set's centre rather than doing nothing.
 */
export function dropAsset(
  pending: { kind: "character" | "prop"; definitionId: string },
  point: Vec3 | null,
) {
  const store = useSceneStore.getState();
  const position = point ?? [0, 0, 0];
  if (pending.kind === "character") {
    const id = store.addCharacter({ definitionId: pending.definitionId, position });
    useSelectionStore.getState().select("character", id);
  } else {
    const definition = getPropDefinition(pending.definitionId);
    const resting: Vec3 = definition.restsOnSurface
      ? [position[0], surfaceHeightAt(position), position[2]]
      : position;
    const id = store.addProp({ definitionId: pending.definitionId, position: resting });
    useSelectionStore.getState().select("prop", id);
  }
  useViewportStore.getState().flash();
}

/** Small props land on a table if one is under them, otherwise on the floor. */
function surfaceHeightAt(position: Vec3): number {
  const scene = useSceneStore.getState().scene;
  if (!scene) return 0;
  for (const prop of scene.props) {
    const definition = getPropDefinition(prop.definitionId);
    if (definition.restsOnSurface) continue;
    const halfX = (definition.size[0] * prop.scale) / 2;
    const halfZ = (definition.size[2] * prop.scale) / 2;
    if (
      Math.abs(position[0] - prop.position[0]) <= halfX &&
      Math.abs(position[2] - prop.position[2]) <= halfZ
    ) {
      return prop.position[1] + definition.size[1] * prop.scale;
    }
  }
  return 0;
}

/** The point the camera is focused on, if the director picked a focus subject. */
function useFocusPoint(scene: SceneDoc): Vec3 | null {
  const activeCamera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const focusTargetId = activeCamera?.focusTargetId ?? null;
  return useMemo(() => {
    if (!focusTargetId) return null;
    const character = scene.characters.find((c) => c.id === focusTargetId);
    if (character) {
      return [
        character.position[0],
        character.position[1] +
          bodyHeight(character.definitionId, character.scale) * 0.9 -
          poseAimDrop(character.definitionId, character.scale, character.animation),
        character.position[2],
      ];
    }
    const prop = scene.props.find((p) => p.id === focusTargetId);
    if (prop) {
      const definition = getPropDefinition(prop.definitionId);
      return [
        prop.position[0],
        prop.position[1] + definition.size[1] * prop.scale * 0.6,
        prop.position[2],
      ];
    }
    return null;
  }, [focusTargetId, scene.characters, scene.props]);
}

/** Viewfinder readout: what lens, what size, how long. */
function FrameHud({ scene }: { scene: SceneDoc }) {
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const currentTime = useTimelineStore((s) => s.currentTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  if (!camera) return null;

  const subject =
    scene.characters.find((c) => c.id === camera.focusTargetId) ?? scene.characters[0] ?? null;
  const subjectHeight = subject ? bodyHeight(subject.definitionId, subject.scale) : 1.75;
  const drop = subject ? poseAimDrop(subject.definitionId, subject.scale, subject.animation) : 0;
  const distance = subject
    ? v.distance(camera.position, [
        subject.position[0],
        subject.position[1] + subjectHeight * 0.85 - drop,
        subject.position[2],
      ])
    : v.distance(camera.position, camera.target);
  const actualSize = getShotSizeSpec(
    shotSizeForDistance(distance, camera.focalLength, subjectHeight),
  );

  return (
    <div className="pointer-events-none absolute inset-0 p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-alert" : "bg-ink-500"}`}
          />
          <span className="slate text-fog-300">{camera.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="slate text-fog-300">{actualSize.short}</span>
          <span className="slate text-fog-300">{Math.round(camera.focalLength)}mm</span>
          <span className="slate text-fog-300">
            {camera.dofEnabled ? `f/${camera.aperture}` : "f/—"}
          </span>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        <span className="slate text-fog-400">
          {scene.name} · {scene.timeOfDay.toLowerCase()}
        </span>
        <span className="numeric text-[10px] text-fog-400">
          {currentTime.toFixed(2)}s · {distance.toFixed(2)}m
        </span>
      </div>
    </div>
  );
}
