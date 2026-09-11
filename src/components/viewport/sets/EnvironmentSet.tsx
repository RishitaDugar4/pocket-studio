"use client";

import { memo } from "react";
import { getEnvironment } from "@/data/environments";
import { Floor, Glow, Slab } from "./primitives";

/**
 * Stylized previs sets. These are deliberately simple volumes — the director is
 * blocking a scene, not dressing a final set. When an environment definition
 * gains a GLB `assetPath`, load it here instead of the procedural builder; the
 * rest of the app never needs to know which happened.
 */
function ApartmentSet() {
  return (
    <group>
      <Floor size={[8, 7]} color="#3a322a" />
      {/* Back wall with window */}
      <Slab position={[0, 1.4, -3.5]} size={[8, 2.8, 0.12]} color="#4a4238" />
      <Slab position={[-1.7, 1.5, -3.42]} size={[1.9, 1.5, 0.06]} color="#2a251f" />
      <Glow position={[-1.7, 1.5, -3.36]} size={[1.75, 1.36]} color="#2f3f56" intensity={0.55} />
      <Slab position={[-1.7, 0.72, -3.4]} size={[2.1, 0.08, 0.22]} color="#5a5046" />
      {/* Side wall with doorway */}
      <Slab position={[-4, 1.4, -1.2]} size={[0.12, 2.8, 4.6]} color="#443c33" />
      <Slab position={[-4, 2.45, 1.9]} size={[0.12, 0.7, 1.6]} color="#443c33" />
      <Slab position={[-4, 1.4, 2.95]} size={[0.12, 2.8, 1.5]} color="#443c33" />
      <Glow position={[-3.92, 1.05, 1.9]} size={[1.5, 2.1]} color="#1b1a18" intensity={0.12} rotation={[0, Math.PI / 2, 0]} />
      {/* Counter run */}
      <Slab position={[2.6, 0.45, -3.05]} size={[2.4, 0.9, 0.7]} color="#4f463b" />
      <Slab position={[2.6, 0.92, -3.05]} size={[2.5, 0.05, 0.76]} color="#6a6053" />
      {/* Baseboards + rug */}
      <Slab position={[0, 0.06, -3.42]} size={[8, 0.12, 0.06]} color="#584e43" />
      <Slab position={[0.6, 0.005, 0.6]} size={[3.4, 0.01, 2.6]} color="#463a33" />
    </group>
  );
}

function BedroomSet() {
  return (
    <group>
      <Floor size={[7, 6]} color="#332f36" />
      <Slab position={[0, 1.35, -3]} size={[7, 2.7, 0.12]} color="#3d3944" />
      <Slab position={[-3.5, 1.35, -0.5]} size={[0.12, 2.7, 5]} color="#37333d" />
      {/* Low window, curtains */}
      <Slab position={[1.8, 1.3, -2.93]} size={[1.7, 1.3, 0.05]} color="#241f28" />
      <Glow position={[1.8, 1.3, -2.87]} size={[1.55, 1.16]} color="#27344a" intensity={0.4} />
      <Slab position={[0.82, 1.35, -2.82]} size={[0.34, 1.7, 0.08]} color="#4a4550" />
      <Slab position={[2.78, 1.35, -2.82]} size={[0.34, 1.7, 0.08]} color="#4a4550" />
      {/* Dresser */}
      <Slab position={[-2.9, 0.4, 1.4]} size={[0.5, 0.8, 1.4]} color="#443f4a" />
      <Slab position={[0, 0.005, 0.4]} size={[3.6, 0.01, 3]} color="#3a3540" />
    </group>
  );
}

function OfficeSet() {
  return (
    <group>
      <Floor size={[10, 8]} color="#2f3438" />
      <Slab position={[0, 1.5, -4]} size={[10, 3, 0.12]} color="#3a4045" />
      {/* Glass partition */}
      <Slab position={[4.5, 1.5, 0]} size={[0.08, 3, 8]} color="#46505a" roughness={0.25} />
      <Glow position={[4.44, 1.5, 0]} size={[7.6, 2.8]} color="#3c4a58" intensity={0.18} rotation={[0, Math.PI / 2, 0]} />
      {/* Ceiling strips */}
      <Glow position={[-1.6, 2.92, -1]} size={[3.2, 0.36]} color="#e6f2e8" intensity={1.5} rotation={[Math.PI / 2, 0, 0]} />
      <Glow position={[1.8, 2.92, 1.4]} size={[3.2, 0.36]} color="#e6f2e8" intensity={1.5} rotation={[Math.PI / 2, 0, 0]} />
      {/* Desk bank */}
      <Slab position={[-2.2, 0.36, -2.3]} size={[3.2, 0.72, 1.4]} color="#3e4449" />
      <Slab position={[-2.2, 0.74, -2.3]} size={[3.3, 0.05, 1.5]} color="#565e64" />
      <Slab position={[-2.2, 1.1, -3]} size={[3.3, 0.7, 0.06]} color="#4a5257" />
    </group>
  );
}

function StreetSet() {
  return (
    <group>
      <Floor size={[18, 12]} color="#23262a" />
      {/* Roadway + kerb + sidewalk */}
      <Slab position={[0, 0.005, -2.6]} size={[18, 0.01, 6]} color="#1b1e21" />
      <Slab position={[0, 0.07, 0.5]} size={[18, 0.14, 0.4]} color="#3a3d40" />
      <Slab position={[0, 0.04, 3]} size={[18, 0.08, 5]} color="#32353a" />
      {/* Façade with lit windows */}
      <Slab position={[0, 3, 6]} size={[18, 6, 0.4]} color="#2b2e33" />
      {[-5.4, -2.7, 0, 2.7, 5.4].map((x, i) => (
        <Glow
          key={x}
          position={[x, i % 2 === 0 ? 1.9 : 3.3, 5.78]}
          size={[1.2, 1.05]}
          color={i % 2 === 0 ? "#d8ab4f" : "#4a5a70"}
          intensity={i % 2 === 0 ? 0.8 : 0.35}
        />
      ))}
      {/* Street lamp */}
      <Slab position={[-3.2, 2.1, 1.4]} size={[0.12, 4.2, 0.12]} color="#31353a" />
      <Slab position={[-2.7, 4.15, 1.4]} size={[1.1, 0.1, 0.14]} color="#31353a" />
      <Glow position={[-2.25, 4.05, 1.4]} size={[0.5, 0.24]} color="#ffc98a" intensity={2.2} rotation={[Math.PI / 2, 0, 0]} />
      {/* Centre line dashes */}
      {[-7, -4.2, -1.4, 1.4, 4.2, 7].map((x) => (
        <Slab key={x} position={[x, 0.011, -2.6]} size={[1.6, 0.01, 0.12]} color="#5a5d52" />
      ))}
    </group>
  );
}

function ParkSet() {
  return (
    <group>
      <Floor size={[20, 16]} color="#2c3527" />
      {/* Path */}
      <Slab position={[0, 0.008, 1.4]} size={[20, 0.01, 2.2]} color="#3d3a30" rotation={[0, 0.06, 0]} />
      {/* Bench */}
      <Slab position={[-2.4, 0.42, 3]} size={[1.8, 0.08, 0.5]} color="#4a3f2f" />
      <Slab position={[-2.4, 0.68, 3.24]} size={[1.8, 0.5, 0.07]} color="#4a3f2f" />
      <Slab position={[-3.2, 0.21, 3]} size={[0.1, 0.42, 0.5]} color="#33302a" />
      <Slab position={[-1.6, 0.21, 3]} size={[0.1, 0.42, 0.5]} color="#33302a" />
      {/* Trees as simple stylized volumes */}
      {[
        [-6, -4.5, 1.15],
        [5.5, -5.5, 1.35],
        [7.5, 2, 1],
        [-8, 3.5, 0.9],
      ].map(([x, z, s]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} scale={s}>
          <Slab position={[0, 1.1, 0]} size={[0.26, 2.2, 0.26]} color="#3b3328" />
          <mesh position={[0, 2.6, 0]} castShadow>
            <icosahedronGeometry args={[1.15, 1]} />
            <meshStandardMaterial color="#3f5236" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
      {/* Distant treeline */}
      <Slab position={[0, 1.2, -7.6]} size={[20, 2.4, 0.4]} color="#232c20" />
    </group>
  );
}

const BUILDERS = {
  apartment: ApartmentSet,
  bedroom: BedroomSet,
  office: OfficeSet,
  street: StreetSet,
  park: ParkSet,
} as const;

export const EnvironmentSet = memo(function EnvironmentSet({
  environmentId,
}: {
  environmentId: string;
}) {
  const definition = getEnvironment(environmentId);
  const Builder = BUILDERS[definition.builder] ?? ApartmentSet;
  return <Builder />;
});
