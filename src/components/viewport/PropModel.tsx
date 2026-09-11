"use client";

import { memo } from "react";
import type { Vec3 } from "@/types";
import { getPropDefinition } from "@/data/props";

/**
 * Stylized props. Each is authored with its origin on the floor so dropping one
 * into a set puts it where the director expects. Swap in a GLB by giving the
 * prop definition an `assetPath` — nothing else changes.
 */

function Box({
  position,
  size,
  color,
  rotation,
  roughness = 0.8,
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

function Chair() {
  return (
    <group>
      <Box position={[0, 0.44, 0]} size={[0.46, 0.05, 0.46]} color="#6b5a44" />
      <Box position={[0, 0.7, -0.2]} size={[0.44, 0.48, 0.05]} color="#6b5a44" />
      {[
        [0.19, 0.19],
        [-0.19, 0.19],
        [0.19, -0.19],
        [-0.19, -0.19],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} position={[x, 0.21, z]} size={[0.04, 0.42, 0.04]} color="#4e4132" />
      ))}
    </group>
  );
}

function Table() {
  return (
    <group>
      <Box position={[0, 0.72, 0]} size={[1.4, 0.06, 0.9]} color="#7a6547" />
      {[
        [0.62, 0.37],
        [-0.62, 0.37],
        [0.62, -0.37],
        [-0.62, -0.37],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} position={[x, 0.35, z]} size={[0.06, 0.7, 0.06]} color="#5c4b34" />
      ))}
    </group>
  );
}

function Phone() {
  return (
    <group>
      <Box position={[0, 0.005, 0]} size={[0.075, 0.01, 0.15]} color="#22252a" roughness={0.35} />
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.066, 0.138]} />
        <meshStandardMaterial
          color="#9fc4e8"
          emissive="#9fc4e8"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Laptop() {
  return (
    <group>
      <Box position={[0, 0.008, 0.06]} size={[0.34, 0.016, 0.24]} color="#3c4249" roughness={0.5} />
      <group position={[0, 0.016, -0.06]} rotation={[-0.34, 0, 0]}>
        <Box position={[0, 0.11, 0]} size={[0.34, 0.22, 0.012]} color="#33383e" roughness={0.5} />
        <mesh position={[0, 0.11, 0.008]}>
          <planeGeometry args={[0.31, 0.19]} />
          <meshStandardMaterial color="#8fb4d8" emissive="#8fb4d8" emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function CoffeeCup() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.033, 0.1, 14]} />
        <meshStandardMaterial color="#cfc4b4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.098, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.037, 14]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.19, 0.04, 16]} />
        <meshStandardMaterial color="#3a3733" roughness={0.6} />
      </mesh>
      <Box position={[0, 0.7, 0]} size={[0.035, 1.36, 0.035]} color="#4a453e" />
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.26, 16, 1, true]} />
        <meshStandardMaterial
          color="#e6d3a8"
          emissive="#ffc98a"
          emissiveIntensity={0.55}
          roughness={0.9}
          side={2}
        />
      </mesh>
      <pointLight position={[0, 1.36, 0]} intensity={2.2} distance={4.5} decay={2} color="#ffc98a" />
    </group>
  );
}

function Door() {
  return (
    <group>
      <Box position={[0, 1.02, 0]} size={[0.9, 2.05, 0.06]} color="#5a4b39" />
      <Box position={[0, 1.02, 0]} size={[0.98, 2.12, 0.03]} color="#48422f" />
      <mesh position={[0.34, 1, 0.055]} castShadow>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color="#b3a06b" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group>
      <Box position={[0, 0.18, 0]} size={[1.5, 0.22, 2]} color="#4a4550" />
      <Box position={[0, 0.38, 0.05]} size={[1.52, 0.2, 1.95]} color="#6a6370" />
      <Box position={[0, 0.52, -0.78]} size={[1.2, 0.14, 0.4]} color="#8d8794" />
      <Box position={[0, 0.62, -1.05]} size={[1.56, 0.9, 0.08]} color="#433e4c" />
    </group>
  );
}

function Plant() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.14, 0.32, 12]} />
        <meshStandardMaterial color="#6b4a38" roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.3) * 0.1, 0.55 + (i % 3) * 0.16, Math.cos(i * 1.3) * 0.1]}
          rotation={[Math.sin(i) * 0.5, i, Math.cos(i) * 0.4]}
          castShadow
        >
          <boxGeometry args={[0.32, 0.02, 0.1]} />
          <meshStandardMaterial color="#4d6b46" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Car() {
  return (
    <group>
      <Box position={[0, 0.52, 0]} size={[1.82, 0.5, 4.3]} color="#3f4a55" roughness={0.45} metalness={0.3} />
      <Box position={[0, 0.95, -0.24]} size={[1.64, 0.44, 2.1]} color="#33404c" roughness={0.35} metalness={0.2} />
      <mesh position={[0, 0.95, 0.82]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[1.5, 0.7]} />
        <meshStandardMaterial color="#8ba4bd" roughness={0.1} metalness={0.4} opacity={0.65} transparent />
      </mesh>
      {[
        [0.84, 1.42],
        [-0.84, 1.42],
        [0.84, -1.42],
        [-0.84, -1.42],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.22, 14]} />
          <meshStandardMaterial color="#1c1e21" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0.58, 0.6, 2.17]}>
        <planeGeometry args={[0.42, 0.2]} />
        <meshStandardMaterial color="#ffe9c0" emissive="#ffe9c0" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[-0.58, 0.6, 2.17]}>
        <planeGeometry args={[0.42, 0.2]} />
        <meshStandardMaterial color="#ffe9c0" emissive="#ffe9c0" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

const BUILDERS: Record<string, () => React.JSX.Element> = {
  chair: Chair,
  table: Table,
  phone: Phone,
  laptop: Laptop,
  coffee_cup: CoffeeCup,
  lamp: Lamp,
  door: Door,
  bed: Bed,
  plant: Plant,
  car: Car,
};

export const PropModel = memo(function PropModel({ definitionId }: { definitionId: string }) {
  const definition = getPropDefinition(definitionId);
  const Builder = BUILDERS[definition.builder] ?? Chair;
  return <Builder />;
});
