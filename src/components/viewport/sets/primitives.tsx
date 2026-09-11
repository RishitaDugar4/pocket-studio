"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/types";

/** A matte painted surface — every set is assembled from these. */
export function Slab({
  position,
  size,
  color,
  rotation,
  roughness = 0.9,
  metalness = 0,
}: {
  position: Vec3;
  size: Vec3;
  color: string;
  rotation?: Vec3;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Window / screen / anything that reads as its own source of light. */
export function Glow({
  position,
  size,
  color,
  intensity = 1,
  rotation,
}: {
  position: Vec3;
  size: [number, number];
  color: string;
  intensity?: number;
  rotation?: Vec3;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function Floor({
  size,
  color,
  y = 0,
}: {
  size: [number, number];
  color: string;
  y?: number;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

export function useCapsule(radius: number, length: number) {
  return useMemo(() => new THREE.CapsuleGeometry(radius, length, 4, 10), [radius, length]);
}
