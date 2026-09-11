"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Grid } from "@react-three/drei";
import { getCharacterDefinition } from "@/data/characters";
import { getEnvironment } from "@/data/environments";
import { getPropDefinition } from "@/data/props";
import { useSelectionStore } from "@/stores/selectionStore";
import { beatsFor } from "@/lib/animation";
import { useViewportStore } from "@/stores/viewportStore";
import type { SceneDoc, SelectionKind, Vec3 } from "@/types";
import { CharacterFigure } from "./CharacterFigure";
import { PropModel } from "./PropModel";
import { SceneLights } from "./SceneLights";
import { CameraHelper, LightHelper, SelectionMarker } from "./CameraHelper";
import { BlockingMotion, useLivePose } from "./BlockingMotion";
import { EnvironmentSet } from "./sets/EnvironmentSet";
import { DeselectOnBackground } from "./Gizmo";
import { objectKey, useObjectRegistry } from "./objectRegistry";

/** Stable per-actor offset so two figures never breathe in lockstep. */
function phaseSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  return (hash / 9973) * 10;
}

/** Registers a scene object so the gizmo can attach to it when selected. */
function useRegisterObject(kind: SelectionKind, id: string) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    const object = ref.current;
    if (!object) return;
    const key = objectKey(kind, id);
    useObjectRegistry.getState().register(key, object);
    return () => useObjectRegistry.getState().unregister(key);
  }, [kind, id]);
  return ref;
}

function SelectableCharacter({
  character,
  beats,
  selected,
  hovered,
  interactive,
}: {
  character: SceneDoc["characters"][number];
  beats: SceneDoc["blockingEvents"];
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
}) {
  const ref = useRegisterObject("character", character.id);
  const select = useSelectionStore((s) => s.select);
  const setHovered = useSelectionStore((s) => s.setHovered);
  const definition = getCharacterDefinition(character.definitionId);
  const [pose, setPose] = useLivePose(character.animation);

  return (
    <group
      ref={ref}
      position={character.position}
      rotation={character.rotation}
      scale={character.scale}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation();
              select("character", character.id);
            }
          : undefined
      }
      onPointerOver={interactive ? () => setHovered({ kind: "character", id: character.id }) : undefined}
      onPointerOut={interactive ? () => setHovered(null) : undefined}
    >
      <BlockingMotion character={character} beats={beats} target={ref} onPose={setPose} />
      <CharacterFigure
        definitionId={character.definitionId}
        animation={beats.length > 0 ? pose.animation : character.animation}
        seated={beats.length > 0 ? pose.seated : character.animation === "SIT"}
        accentColor={character.accentColor}
        highlight={selected ? 1 : hovered ? 0.4 : 0}
        seed={phaseSeed(character.id)}
      />
      {selected || hovered ? (
        <SelectionMarker
          radius={0.42}
          height={definition.build.height}
          color={selected ? "#d8ab4f" : "#6c7277"}
        />
      ) : null}
    </group>
  );
}

function SelectableProp({
  prop,
  selected,
  hovered,
  interactive,
}: {
  prop: SceneDoc["props"][number];
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
}) {
  const ref = useRegisterObject("prop", prop.id);
  const select = useSelectionStore((s) => s.select);
  const setHovered = useSelectionStore((s) => s.setHovered);
  const definition = getPropDefinition(prop.definitionId);

  return (
    <group
      ref={ref}
      position={prop.position}
      rotation={prop.rotation}
      scale={prop.scale}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation();
              select("prop", prop.id);
            }
          : undefined
      }
      onPointerOver={interactive ? () => setHovered({ kind: "prop", id: prop.id }) : undefined}
      onPointerOut={interactive ? () => setHovered(null) : undefined}
    >
      <PropModel definitionId={prop.definitionId} />
      {selected || hovered ? (
        <SelectionMarker
          radius={Math.max(definition.size[0], definition.size[2]) * 0.75 + 0.1}
          height={definition.size[1]}
          color={selected ? "#d8ab4f" : "#6c7277"}
        />
      ) : null}
    </group>
  );
}

function SelectableLight({
  light,
  selected,
  interactive,
}: {
  light: SceneDoc["lights"][number];
  selected: boolean;
  interactive: boolean;
}) {
  const ref = useRegisterObject("light", light.id);
  const select = useSelectionStore((s) => s.select);
  if (light.role === "AMBIENT") return null;

  return (
    <group
      ref={ref}
      position={light.position}
      onPointerDown={
        interactive
          ? (event) => {
              event.stopPropagation();
              select("light", light.id);
            }
          : undefined
      }
    >
      <LightHelper position={[0, 0, 0]} color={light.color} enabled={light.enabled} selected={selected} />
    </group>
  );
}

export function SceneContents({
  scene,
  mode,
  preview = false,
}: {
  scene: SceneDoc;
  mode: "ORBIT" | "CAMERA";
  /** A clean render for previews and exports: no selection marks at all. */
  preview?: boolean;
}) {
  const selection = useSelectionStore((s) => s.selection);
  const hovered = useSelectionStore((s) => s.hovered);
  const showGrid = useViewportStore((s) => s.showGrid);
  const showHelpers = useViewportStore((s) => s.showHelpers);
  const environment = getEnvironment(scene.environmentId);
  const interactive = mode === "ORBIT";
  const activeCamera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];

  return (
    <>
      <SceneLights lights={scene.lights} presetId={scene.lightingPreset} />
      <EnvironmentSet environmentId={scene.environmentId} />
      {interactive ? <DeselectOnBackground /> : null}

      {scene.characters.map((character) => (
        <SelectableCharacter
          key={character.id}
          character={character}
          beats={beatsFor(scene, character.id)}
          selected={!preview && selection?.kind === "character" && selection.id === character.id}
          hovered={!preview && hovered?.kind === "character" && hovered.id === character.id}
          interactive={interactive}
        />
      ))}

      {scene.props.map((prop) => (
        <SelectableProp
          key={prop.id}
          prop={prop}
          selected={!preview && selection?.kind === "prop" && selection.id === prop.id}
          hovered={!preview && hovered?.kind === "prop" && hovered.id === prop.id}
          interactive={interactive}
        />
      ))}

      {interactive && showHelpers
        ? scene.lights.map((light) => (
            <SelectableLight
              key={light.id}
              light={light}
              selected={selection?.kind === "light" && selection.id === light.id}
              interactive={interactive}
            />
          ))
        : null}

      {/* The camera is a scene object too: selectable, and visible from the set. */}
      {interactive && showHelpers ? (
        <group
          onPointerDown={
            activeCamera
              ? (event) => {
                  event.stopPropagation();
                  useSelectionStore.getState().select("camera", activeCamera.id);
                }
              : undefined
          }
        >
          <CameraHelper
            visible
            selected={selection?.kind === "camera" && selection.id === activeCamera?.id}
          />
        </group>
      ) : null}

      {/* The camera body needs a registered transform target for the gizmo. */}
      {activeCamera ? <CameraProxy id={activeCamera.id} position={activeCamera.position} /> : null}

      {interactive && showGrid ? (
        <Grid
          position={[0, 0.002, 0]}
          args={environment.floorSize}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#2e3237"
          sectionSize={2}
          sectionThickness={0.8}
          sectionColor="#3d434a"
          fadeDistance={34}
          fadeStrength={1.4}
          followCamera={false}
          infiniteGrid={false}
        />
      ) : null}
    </>
  );
}

/** Invisible stand-in the gizmo can grab to move the camera around the set. */
function CameraProxy({ id, position }: { id: string; position: Vec3 }) {
  const ref = useRegisterObject("camera", id);
  return <group ref={ref} position={position} />;
}
