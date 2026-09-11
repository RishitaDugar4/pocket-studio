import type { LightDoc, LightingPresetId, LightRole, Vec3 } from "@/types";

export interface LightingPreset {
  id: LightingPresetId;
  name: string;
  description: string;
  /** Colour of the sky/ambient wash, used for the viewport background too. */
  ambientColor: string;
  ambientIntensity: number;
  backgroundColor: string;
  lights: Array<Omit<LightDoc, "id">>;
}

function light(
  role: LightRole,
  position: Vec3,
  intensity: number,
  color: string,
  temperature: number,
  size = 1,
  enabled = true,
): Omit<LightDoc, "id"> {
  return { role, position, rotation: [0, 0, 0], intensity, color, temperature, size, enabled };
}

export const LIGHTING_PRESET_LIST: LightingPreset[] = [
  {
    id: "NATURAL_DAY",
    name: "Natural Day",
    description: "Soft overcast key, open shadows.",
    ambientColor: "#b8c6d6",
    ambientIntensity: 0.55,
    backgroundColor: "#1a1f26",
    lights: [
      light("KEY", [4, 4.2, 3.4], 2.4, "#fff4e2", 5600, 2.4),
      light("FILL", [-3.6, 2.6, 2.2], 0.85, "#cddcf0", 7000, 3),
      light("BACK", [-1.6, 3.4, -4.2], 1.1, "#ffffff", 6000, 1.4),
      light("AMBIENT", [0, 5, 0], 0.5, "#b8c6d6", 6500, 6),
    ],
  },
  {
    id: "GOLDEN_HOUR",
    name: "Golden Hour",
    description: "Low raking key, long warm falloff.",
    ambientColor: "#7a6a5c",
    ambientIntensity: 0.4,
    backgroundColor: "#221a14",
    lights: [
      light("KEY", [6.5, 1.6, 2.4], 3.2, "#ffb454", 3000, 2),
      light("FILL", [-3.2, 2, 1.4], 0.5, "#7ea0c8", 8000, 3.5),
      light("BACK", [-2.4, 2.2, -4], 2.2, "#ffd9a0", 3400, 1.2),
      light("AMBIENT", [0, 5, 0], 0.35, "#8a6a4c", 4000, 6),
    ],
  },
  {
    id: "NIGHT",
    name: "Night",
    description: "Cool moonlight key, deep shadow.",
    ambientColor: "#2a3a52",
    ambientIntensity: 0.22,
    backgroundColor: "#0b0f16",
    lights: [
      light("KEY", [-4.2, 4.6, -2.4], 1.6, "#9fc0ff", 9000, 2.2),
      light("FILL", [2.6, 1.8, 2.6], 0.28, "#4a6a92", 8000, 3),
      light("PRACTICAL", [1.4, 1.5, 0.6], 1.2, "#ffb26b", 2700, 0.6),
      light("AMBIENT", [0, 5, 0], 0.2, "#22304a", 9000, 6),
    ],
  },
  {
    id: "CINEMATIC_LOW_KEY",
    name: "Cinematic Low Key",
    description: "Hard single source, almost no fill.",
    ambientColor: "#1a1b20",
    ambientIntensity: 0.1,
    backgroundColor: "#08090b",
    lights: [
      light("KEY", [3.2, 2.6, 1.6], 3.4, "#ffe8cc", 4200, 0.6),
      light("FILL", [-3, 1.6, 1.2], 0.12, "#6b7d92", 7000, 2.5),
      light("BACK", [-1.2, 2.8, -3.2], 2.6, "#dce8ff", 6500, 0.8),
      light("AMBIENT", [0, 5, 0], 0.08, "#141518", 6000, 6),
    ],
  },
  {
    id: "FLUORESCENT",
    name: "Fluorescent",
    description: "Flat overhead, green-cool cast.",
    ambientColor: "#c2d6c8",
    ambientIntensity: 0.7,
    backgroundColor: "#161a18",
    lights: [
      light("KEY", [1.6, 4.4, 1.2], 1.8, "#e8f6ea", 4800, 4),
      light("FILL", [-2, 4.4, -1.2], 1.4, "#dff0e4", 5000, 4),
      light("PRACTICAL", [0, 3.9, 0], 0.9, "#eaf7ec", 4600, 3),
      light("AMBIENT", [0, 5, 0], 0.6, "#c2d6c8", 5000, 6),
    ],
  },
  {
    id: "WARM_INTERIOR",
    name: "Warm Interior",
    description: "Lamplight key, soft window fill.",
    ambientColor: "#5c4a3a",
    ambientIntensity: 0.34,
    backgroundColor: "#12100d",
    lights: [
      light("KEY", [2.4, 2.2, 1.8], 2.6, "#ffc98a", 2900, 1.2),
      light("FILL", [-3.4, 2.4, 1.6], 0.55, "#9ab6d8", 7200, 3),
      light("BACK", [-1.4, 2.6, -3.4], 1.4, "#ffdcb0", 3200, 1),
      light("PRACTICAL", [1.5, 1.45, 0.4], 0.9, "#ffb26b", 2700, 0.5),
      light("AMBIENT", [0, 5, 0], 0.3, "#4a3a2c", 3400, 6),
    ],
  },
];

export const LIGHT_ROLE_LABELS: Record<LightRole, string> = {
  KEY: "Key Light",
  FILL: "Fill Light",
  BACK: "Back Light",
  PRACTICAL: "Practical",
  AMBIENT: "Ambient",
};

export function getLightingPreset(id: LightingPresetId): LightingPreset {
  return LIGHTING_PRESET_LIST.find((p) => p.id === id) ?? LIGHTING_PRESET_LIST[0];
}
