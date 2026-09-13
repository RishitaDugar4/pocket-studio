"use client";

import { useRef, useState } from "react";
import { useStore, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/types";

interface OrbitLike {
  enabled: boolean;
}

type R3FStore = ReturnType<typeof useStore>;

function setControlsEnabled(store: R3FStore, enabled: boolean): void {
  const controls = store.getState().controls as unknown as OrbitLike | null;
  if (controls) controls.enabled = enabled;
}

/**
 * The ring on the floor under a selected object — and the handle you move it by.
 *
 * Dragging an object around a room is a floor-plan operation, not a
 * three-axis one, so the ring drags directly on the ground plane rather than
 * asking the director to grab the right gizmo arrow. The object's height is
 * left alone, which keeps a cup on the table it was resting on.
 */
export function DragRing({
  radius,
  height,
  position,
  color = "#d8ab4f",
  draggable,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  radius: number;
  height: number;
  position: Vec3;
  color?: string;
  draggable: boolean;
  onDragStart?: () => void;
  onDrag?: (next: Vec3) => void;
  onDragEnd?: () => void;
}) {
  // Read through the store rather than a hook value: orbit controls are an
  // external system this drag switches off, not state it renders from.
  const store = useStore();
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hit = useRef(new THREE.Vector3());
  // Where on the ring it was grabbed, so the object does not snap to the cursor.
  const grabOffset = useRef<[number, number]>([0, 0]);

  const pointOnFloor = (event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
    // The ground plane at this object's own height, so a cup keeps its table.
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position[1]);
    return event.ray.intersectPlane(plane, hit.current);
  };

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    const point = pointOnFloor(event);
    if (!point) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    grabOffset.current = [position[0] - point.x, position[2] - point.z];
    setDragging(true);
    // Otherwise the drag orbits the camera at the same time.
    setControlsEnabled(store, false);
    onDragStart?.();
  };

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    const point = pointOnFloor(event);
    if (!point) return;
    event.stopPropagation();
    onDrag?.([
      Math.round((point.x + grabOffset.current[0]) * 1000) / 1000,
      position[1],
      Math.round((point.z + grabOffset.current[1]) * 1000) / 1000,
    ]);
  };

  const handleUp = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    setDragging(false);
    setControlsEnabled(store, true);
    onDragEnd?.();
  };

  const lit = dragging || hovered;

  return (
    <group>
      {/* The grab surface: the ring's own annulus, a little wider than it looks. */}
      <mesh
        position={[0, 0.013, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerOver={() => draggable && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry args={[Math.max(radius * 0.72, 0.08), radius * 1.28, 32]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[radius * (lit ? 0.9 : 0.96), radius * (lit ? 1.06 : 1), 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={lit ? 0.95 : 0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <circleGeometry args={[radius * 0.96, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={lit ? 0.16 : 0.07}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* A faint vertical line to read height against the set. */}
      <mesh position={[0, height / 2, 0]} raycast={() => null}>
        <boxGeometry args={[0.004, height, 0.004]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
