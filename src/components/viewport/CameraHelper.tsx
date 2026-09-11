"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { degToRad, verticalFovDeg } from "@/lib/cinematography";
import { liveFrame } from "./liveFrame";

/**
 * The camera as seen from the set: a small body plus the frustum it is actually
 * seeing. Drawn from `liveFrame`, so a movement preview drags the frustum along
 * with it and the director can watch the move from outside.
 */
export function CameraHelper({ visible, selected }: { visible: boolean; selected: boolean }) {
  const group = useRef<THREE.Group>(null);
  const frustum = useRef<THREE.Group>(null);
  const depth = 2.4;

  const lineGeometry = useMemo(() => {
    // Unit frustum: apex at origin, base corners at (±1, ±1, +1).
    // Object3D.lookAt() points a plain group's +Z at the target (only cameras
    // and lights use -Z), so the frustum is built down the +Z axis.
    const points: number[] = [];
    const corners: Array<[number, number]> = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    corners.forEach(([x, y]) => points.push(0, 0, 0, x, y, 1));
    corners.forEach(([x, y], i) => {
      const [nx, ny] = corners[(i + 1) % corners.length];
      points.push(x, y, 1, nx, ny, 1);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(liveFrame.position);
    g.up.set(Math.sin(liveFrame.roll), Math.cos(liveFrame.roll), 0);
    g.lookAt(liveFrame.target);

    const f = frustum.current;
    if (f) {
      const halfHeight = depth * Math.tan(degToRad(verticalFovDeg(liveFrame.focalLength)) / 2);
      f.scale.set(halfHeight * (16 / 9), halfHeight, depth);
    }
  });

  if (!visible) return null;
  const color = selected ? "#d8ab4f" : "#6fa8bd";

  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[0.2, 0.16, 0.3]} />
        <meshStandardMaterial color="#1e2124" roughness={0.5} emissive={color} emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.12, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 12]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.6} />
      </mesh>
      <group ref={frustum}>
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color={color} transparent opacity={selected ? 0.8 : 0.42} />
        </lineSegments>
      </group>
    </group>
  );
}

/** Subtle floor ring + corner ticks. Never a hard outline (§38). */
export function SelectionMarker({
  radius,
  height,
  color = "#d8ab4f",
}: {
  radius: number;
  height: number;
  color?: string;
}) {
  return (
    <group>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.96, radius, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.96, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
      {/* A faint vertical line to read height against the set. */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.004, height, 0.004]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

/** Where a light is standing, so the rig can be positioned by hand. */
export function LightHelper({
  position,
  color,
  enabled,
  selected,
}: {
  position: [number, number, number];
  color: string;
  enabled: boolean;
  selected: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <octahedronGeometry args={[selected ? 0.15 : 0.11, 0]} />
        <meshBasicMaterial
          color={enabled ? color : "#454a50"}
          transparent
          opacity={selected ? 0.95 : 0.6}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshBasicMaterial color={enabled ? color : "#2e3237"} />
      </mesh>
    </group>
  );
}
