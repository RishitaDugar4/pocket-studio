"use client";

import { useEffect, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import type * as THREE from "three";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useViewportStore } from "@/stores/viewportStore";
import type { Selection, Vec3 } from "@/types";
import { objectKey, useObjectRegistry } from "./objectRegistry";

/**
 * Bridges the three.js transform gizmo back into the scene document. A whole
 * drag is one undo step: `beginInteraction` on grab, `endInteraction` on release.
 */
export function Gizmo({ selection }: { selection: Selection }) {
  const transformMode = useViewportStore((s) => s.transformMode);
  const object = useObjectRegistry((s) => s.objects[objectKey(selection.kind, selection.id)]);
  const controls = useRef<{ addEventListener: (t: string, fn: () => void) => void } | null>(null);
  const dragging = useRef(false);

  const write = (target: THREE.Object3D) => {
    const store = useSceneStore.getState();
    const position: Vec3 = [target.position.x, target.position.y, target.position.z];
    const rotation: Vec3 = [target.rotation.x, target.rotation.y, target.rotation.z];
    const scale = Math.max(target.scale.x, 0.2);

    if (selection.kind === "character") {
      // Characters keep a uniform scale: an actor is a person, not a prop.
      store.updateCharacter(selection.id, { position, rotation, scale: clampScale(scale) }, true);
    } else if (selection.kind === "prop") {
      store.updateProp(selection.id, { position, rotation, scale: clampScale(scale) }, true);
    } else if (selection.kind === "light") {
      store.updateLight(selection.id, { position }, true);
    } else if (selection.kind === "camera") {
      store.updateCamera(selection.id, { position }, true);
    }
  };

  useEffect(() => {
    const instance = controls.current as unknown as THREE.EventDispatcher | null;
    if (!instance) return;
    const onDragging = (event: unknown) => {
      const value = (event as { value?: boolean }).value;
      if (value) {
        dragging.current = true;
        useSceneStore.getState().beginInteraction("Transform");
      } else if (dragging.current) {
        dragging.current = false;
        useSceneStore.getState().endInteraction();
      }
    };
    // @ts-expect-error three's EventDispatcher typing is narrower than the event we get
    instance.addEventListener("dragging-changed", onDragging);
    // @ts-expect-error same
    return () => instance.removeEventListener("dragging-changed", onDragging);
  }, [object, transformMode]);

  if (!object || transformMode === "select") return null;

  return (
    <TransformControls
      // @ts-expect-error drei forwards the underlying controls instance
      ref={controls}
      object={object}
      mode={transformMode}
      size={0.72}
      translationSnap={null}
      space="world"
      showY={transformMode !== "rotate"}
      onObjectChange={(event) => {
        const target = (event?.target as { object?: THREE.Object3D } | undefined)?.object ?? object;
        write(target);
      }}
    />
  );
}

function clampScale(value: number) {
  return Math.min(Math.max(value, 0.4), 2.5);
}

/** Clears the selection when the user clicks empty space. */
export function DeselectOnBackground() {
  const clear = useSelectionStore((s) => s.clear);
  return (
    <mesh
      position={[0, -0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={() => clear()}
      visible={false}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial />
    </mesh>
  );
}
