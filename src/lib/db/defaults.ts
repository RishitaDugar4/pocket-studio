import { getEnvironment } from "@/data/environments";
import { getLightingPreset } from "@/data/lighting";
import type { CameraDoc, LightDoc, LightingPresetId, SceneDoc, TimeOfDay } from "@/types";

export function newId(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

export function lightsForPreset(presetId: LightingPresetId): LightDoc[] {
  return getLightingPreset(presetId).lights.map((light) => ({ ...light, id: newId("lgt") }));
}

export function defaultCameraForEnvironment(environmentId: string): CameraDoc {
  const env = getEnvironment(environmentId);
  const depth = env.floorSize[1];
  return {
    id: newId("cam"),
    name: "Camera 01",
    position: [1.9, 1.62, Math.min(depth * 0.42, 3.6)],
    target: [0, 1.15, 0],
    focalLength: 35,
    aperture: 2.8,
    dofEnabled: false,
    focusTargetId: null,
    shotSize: "MEDIUM",
    heightPreset: "EYE",
    isActive: true,
    movementType: "STATIC",
    movementDuration: 4,
    movementIntensity: 0.5,
  };
}

export interface NewSceneInput {
  projectId: string;
  index: number;
  name?: string;
  location?: string;
  timeOfDay?: TimeOfDay;
  environmentId?: string;
  lightingPreset?: LightingPresetId;
  versionLabel?: string;
  parentSceneId?: string | null;
}

/** A scene is never born empty: it has a set, a light rig and a camera. */
export function buildNewScene(input: NewSceneInput): SceneDoc {
  const environmentId = input.environmentId ?? "apartment";
  const env = getEnvironment(environmentId);
  const lightingPreset = input.lightingPreset ?? env.defaultLighting;
  return {
    id: newId("scn"),
    projectId: input.projectId,
    index: input.index,
    name: input.name ?? `Scene ${String(input.index + 1).padStart(2, "0")}`,
    location: input.location ?? env.name,
    timeOfDay: input.timeOfDay ?? (env.defaultLighting === "NIGHT" ? "NIGHT" : "DAY"),
    environmentId,
    lightingPreset,
    versionLabel: input.versionLabel ?? "Original",
    parentSceneId: input.parentSceneId ?? null,
    notes: "",
    characters: [],
    props: [],
    lights: lightsForPreset(lightingPreset),
    cameras: [defaultCameraForEnvironment(environmentId)],
    shots: [],
    blockingEvents: [],
  };
}

export function sceneSlate(scene: Pick<SceneDoc, "index" | "name">): string {
  return `Scene ${String(scene.index + 1).padStart(2, "0")} — ${scene.name}`;
}
