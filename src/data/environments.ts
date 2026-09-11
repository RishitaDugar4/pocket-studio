import type { LightingPresetId, Vec3 } from "@/types";

/**
 * An environment is a reusable set. `assetPath` is the GLB that should be
 * loaded when one exists; until then `builder` names a procedural set that the
 * viewport knows how to assemble. Nothing outside this registry may branch on a
 * specific environment id.
 */
export interface EnvironmentDefinition {
  id: string;
  name: string;
  /** Short description shown in the asset browser. */
  description: string;
  /** CSS gradient used as the placeholder thumbnail. */
  thumbnail: string;
  assetPath: string | null;
  builder: "apartment" | "bedroom" | "office" | "street" | "park";
  defaultLighting: LightingPresetId;
  /** Floor extent in metres — used for the grid and camera framing limits. */
  floorSize: [number, number];
  /** Suggested standing marks so a newly added actor lands somewhere sensible. */
  marks: Vec3[];
  /** Prop definition ids that make sense here; the full library stays available. */
  availableProps: string[];
  interior: boolean;
}

export const ENVIRONMENTS: EnvironmentDefinition[] = [
  {
    id: "apartment",
    name: "Apartment",
    description: "Kitchen table, window wall, doorway.",
    thumbnail: "linear-gradient(150deg,#3b3327,#1b1814 60%,#0f0e0c)",
    assetPath: null,
    builder: "apartment",
    defaultLighting: "WARM_INTERIOR",
    floorSize: [8, 7],
    marks: [
      [0, 0, 0],
      [-1.6, 0, -0.6],
      [1.7, 0, 1.2],
    ],
    availableProps: ["table", "chair", "lamp", "phone", "laptop", "coffee_cup", "plant", "door"],
    interior: true,
  },
  {
    id: "bedroom",
    name: "Bedroom",
    description: "Bed, side lamp, low window.",
    thumbnail: "linear-gradient(150deg,#2f2b33,#191821 60%,#0d0c10)",
    assetPath: null,
    builder: "bedroom",
    defaultLighting: "NIGHT",
    floorSize: [7, 6],
    marks: [
      [0, 0, 1.2],
      [-1.8, 0, 0],
      [1.4, 0, -0.8],
    ],
    availableProps: ["bed", "lamp", "chair", "phone", "plant", "door"],
    interior: true,
  },
  {
    id: "office",
    name: "Office",
    description: "Desks, fluorescent ceiling, glass partition.",
    thumbnail: "linear-gradient(150deg,#2b3136,#171b1e 60%,#0c0e10)",
    assetPath: null,
    builder: "office",
    defaultLighting: "FLUORESCENT",
    floorSize: [10, 8],
    marks: [
      [0, 0, 0],
      [-2.4, 0, -1],
      [2.4, 0, 1],
    ],
    availableProps: ["table", "chair", "laptop", "coffee_cup", "plant", "phone", "door"],
    interior: true,
  },
  {
    id: "street",
    name: "Street",
    description: "Sidewalk, kerb, façade, parked car.",
    thumbnail: "linear-gradient(150deg,#24282e,#14171b 60%,#0a0b0d)",
    assetPath: null,
    builder: "street",
    defaultLighting: "NIGHT",
    floorSize: [18, 12],
    marks: [
      [0, 0, 2],
      [-3, 0, 2.4],
      [3.2, 0, 1.6],
    ],
    availableProps: ["car", "lamp", "phone", "coffee_cup", "plant"],
    interior: false,
  },
  {
    id: "park",
    name: "Park",
    description: "Open grass, path, trees, bench.",
    thumbnail: "linear-gradient(150deg,#2a3327,#171d16 60%,#0b0e0a)",
    assetPath: null,
    builder: "park",
    defaultLighting: "GOLDEN_HOUR",
    floorSize: [20, 16],
    marks: [
      [0, 0, 0],
      [-2.6, 0, 1.4],
      [2.8, 0, -1.2],
    ],
    availableProps: ["chair", "plant", "phone", "coffee_cup"],
    interior: false,
  },
];

export const DEFAULT_ENVIRONMENT_ID = "apartment";

export function getEnvironment(id: string): EnvironmentDefinition {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}
