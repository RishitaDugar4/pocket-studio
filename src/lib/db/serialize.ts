import type {
  AudioAssetDoc,
  TimelineItemDoc,
  CameraDoc,
  CameraHeight,
  CameraMovementDoc,
  CameraMovementType,
  CameraTransform,
  CastMemberDoc,
  CharacterAnimation,
  LightDoc,
  LightRole,
  LightingPresetId,
  ProjectDoc,
  ProjectFormat,
  SceneCharacterDoc,
  SceneDoc,
  ScenePropDoc,
  ShotDoc,
  ShotSize,
  TimeOfDay,
  TransitionType,
  Vec3,
  VisualMood,
  BlockingEventDoc,
} from "@/types";
import { defaultCameraTransform } from "@/lib/cinematography";

/* Prisma Json columns come back as `unknown`; these coercions keep the rest of
   the app free of defensive casting. */

export function asVec3(value: unknown, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (Array.isArray(value) && value.length >= 3) {
    const [x, y, z] = value;
    if (typeof x === "number" && typeof y === "number" && typeof z === "number") return [x, y, z];
  }
  return fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function asCameraTransform(value: unknown): CameraTransform {
  const fallback = defaultCameraTransform();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  return {
    position: asVec3(raw.position, fallback.position),
    target: asVec3(raw.target, fallback.target),
    focalLength: typeof raw.focalLength === "number" ? raw.focalLength : fallback.focalLength,
    aperture: typeof raw.aperture === "number" ? raw.aperture : fallback.aperture,
    dofEnabled: raw.dofEnabled === true,
    focusTargetId: typeof raw.focusTargetId === "string" ? raw.focusTargetId : null,
  };
}

/* ------------------------------------------------------------ row → document */

type Row = Record<string, unknown>;

export function toCastMember(row: Row): CastMemberDoc {
  return {
    id: row.id as string,
    name: row.name as string,
    definitionId: row.definitionId as string,
    accentColor: row.accentColor as string,
  };
}

export function toSceneCharacter(row: Row, cast: Map<string, CastMemberDoc>): SceneCharacterDoc {
  const member = cast.get(row.characterId as string);
  return {
    id: row.id as string,
    characterId: row.characterId as string,
    name: member?.name ?? "Actor",
    definitionId: member?.definitionId ?? "adult_average",
    accentColor: member?.accentColor ?? "#c9a227",
    position: asVec3(row.position),
    rotation: asVec3(row.rotation),
    scale: (row.scale as number) ?? 1,
    animation: (row.animation as CharacterAnimation) ?? "IDLE",
    locked: row.locked === true,
  };
}

export function toSceneProp(row: Row): ScenePropDoc {
  return {
    id: row.id as string,
    name: row.name as string,
    definitionId: row.definitionId as string,
    position: asVec3(row.position),
    rotation: asVec3(row.rotation),
    scale: (row.scale as number) ?? 1,
  };
}

export function toLight(row: Row): LightDoc {
  return {
    id: row.id as string,
    role: row.role as LightRole,
    enabled: row.enabled !== false,
    intensity: (row.intensity as number) ?? 1,
    position: asVec3(row.position),
    rotation: asVec3(row.rotation),
    color: (row.color as string) ?? "#ffffff",
    temperature: (row.temperature as number) ?? 5600,
    size: (row.size as number) ?? 1,
  };
}

export function toCamera(row: Row): CameraDoc {
  return {
    id: row.id as string,
    name: row.name as string,
    position: asVec3(row.position, [3.2, 1.6, 3.6]),
    target: asVec3(row.target, [0, 1.1, 0]),
    focalLength: (row.focalLength as number) ?? 35,
    aperture: (row.aperture as number) ?? 2.8,
    dofEnabled: row.dofEnabled === true,
    focusTargetId: (row.focusTargetId as string | null) ?? null,
    shotSize: (row.shotSize as ShotSize) ?? "MEDIUM",
    heightPreset: (row.heightPreset as CameraHeight) ?? "EYE",
    isActive: row.isActive === true,
    movementType: (row.movementType as CameraMovementType) ?? "STATIC",
    movementDuration: (row.movementDuration as number) ?? 4,
    movementIntensity: (row.movementIntensity as number) ?? 0.5,
  };
}

export function toCameraMovement(row: Row): CameraMovementDoc {
  return {
    id: row.id as string,
    type: row.type as CameraMovementType,
    startTime: (row.startTime as number) ?? 0,
    duration: (row.duration as number) ?? 2,
    startTransform: asCameraTransform(row.startTransform),
    endTransform: asCameraTransform(row.endTransform),
    intensity: (row.intensity as number) ?? 0.5,
  };
}

export function toShot(row: Row): ShotDoc {
  const movements = Array.isArray(row.movements) ? (row.movements as Row[]) : [];
  const frame = row.storyboardFrame as Row | null | undefined;
  return {
    id: row.id as string,
    index: row.index as number,
    name: row.name as string,
    shotSize: row.shotSize as ShotSize,
    duration: (row.duration as number) ?? 4,
    sceneTime: (row.sceneTime as number) ?? 0,
    cameraState: asCameraTransform(row.cameraState),
    subjects: asStringArray(row.subjects),
    notes: (row.notes as string) ?? "",
    transition: (row.transition as TransitionType) ?? "CUT",
    cameraId: (row.cameraId as string | null) ?? null,
    movements: movements.map(toCameraMovement),
    frameUrl: frame?.imageKey ? `/api/assets/${frame.imageKey as string}` : null,
  };
}

export function toBlockingEvent(row: Row): BlockingEventDoc {
  return {
    id: row.id as string,
    sceneCharacterId: row.sceneCharacterId as string,
    startTime: row.startTime as number,
    endTime: row.endTime as number,
    action: row.action as BlockingEventDoc["action"],
    startPosition: asVec3(row.startPosition),
    endPosition: asVec3(row.endPosition),
    rotation: asVec3(row.rotation),
  };
}

/** Rig order the director expects to read, not the order rows came back in. */
const LIGHT_ROLE_ORDER: LightRole[] = ["KEY", "FILL", "BACK", "PRACTICAL", "AMBIENT"];

function byLabel<T extends { name: string; id: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function toScene(row: Row, cast: Map<string, CastMemberDoc>): SceneDoc {
  const characters = (row.characters as Row[] | undefined) ?? [];
  const props = (row.props as Row[] | undefined) ?? [];
  const lights = (row.lights as Row[] | undefined) ?? [];
  const cameras = (row.cameras as Row[] | undefined) ?? [];
  const shots = (row.shots as Row[] | undefined) ?? [];
  const blocking = (row.blockingEvents as Row[] | undefined) ?? [];
  return {
    id: row.id as string,
    projectId: row.projectId as string,
    index: row.index as number,
    name: row.name as string,
    location: (row.location as string) ?? "",
    timeOfDay: (row.timeOfDay as TimeOfDay) ?? "DAY",
    environmentId: (row.environmentId as string) ?? "apartment",
    lightingPreset: (row.lightingPreset as LightingPresetId) ?? "WARM_INTERIOR",
    versionLabel: (row.versionLabel as string) ?? "Original",
    parentSceneId: (row.parentSceneId as string | null) ?? null,
    notes: (row.notes as string) ?? "",
    characters: characters.map((c) => toSceneCharacter(c, cast)).sort(byLabel),
    props: props.map(toSceneProp).sort(byLabel),
    lights: lights
      .map(toLight)
      .sort(
        (a, b) =>
          LIGHT_ROLE_ORDER.indexOf(a.role) - LIGHT_ROLE_ORDER.indexOf(b.role) ||
          a.id.localeCompare(b.id),
      ),
    cameras: cameras.map(toCamera),
    shots: shots.map(toShot),
    blockingEvents: blocking.map(toBlockingEvent),
  };
}

export function toTimelineItem(row: Row): TimelineItemDoc {
  return {
    id: row.id as string,
    index: row.index as number,
    track: (row.track as TimelineItemDoc["track"]) ?? "VIDEO",
    startTime: (row.startTime as number) ?? 0,
    duration: (row.duration as number) ?? 4,
    trimIn: (row.trimIn as number) ?? 0,
    trimOut: (row.trimOut as number) ?? 0,
    transition: (row.transition as TransitionType) ?? "CUT",
    shotId: (row.shotId as string | null) ?? null,
    audioAssetId: (row.audioAssetId as string | null) ?? null,
  };
}

export function toAudioAsset(row: Row): AudioAssetDoc {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: (row.kind as AudioAssetDoc["kind"]) ?? "SFX",
    url: `/api/assets/${row.storageKey as string}`,
    duration: (row.duration as number) ?? 0,
  };
}

export function toProject(row: Row): ProjectDoc {
  const castRows = (row.cast as Row[] | undefined) ?? [];
  const cast = castRows.map(toCastMember);
  const castMap = new Map(cast.map((c) => [c.id, c]));
  const scenes = ((row.scenes as Row[] | undefined) ?? []).map((s) => toScene(s, castMap));
  const timeline = ((row.timeline as Row[] | undefined) ?? []).map(toTimelineItem);
  const audio = ((row.audio as Row[] | undefined) ?? []).map(toAudioAsset);
  return {
    id: row.id as string,
    title: row.title as string,
    format: (row.format as ProjectFormat) ?? "SHORT_FILM",
    mood: (row.mood as VisualMood) ?? "NATURALISTIC",
    genre: (row.genre as string | null) ?? null,
    logline: (row.logline as string | null) ?? null,
    status: (row.status as string) ?? "IN_PROGRESS",
    isDemo: row.isDemo === true,
    script: (row.script as string) ?? "",
    challengeSlug: (row.challengeSlug as string | null) ?? null,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
    cast,
    scenes,
    timeline,
    audio,
  };
}
