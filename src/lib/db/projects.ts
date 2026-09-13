import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { toProject } from "./serialize";
import { buildNewScene, newId } from "./defaults";
import type {
  CastMemberDoc,
  TimelineItemDoc,
  TimeOfDay,
  LightingPresetId,
  ProjectDoc,
  ProjectFormat,
  ProjectSummary,
  SceneDoc,
  VisualMood,
} from "@/types";

/** Pocket Studio is single-user locally; accounts arrive with real auth later. */
const LOCAL_USER_EMAIL = "director@pocket.studio";

export async function ensureLocalUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL, name: "Director" },
  });
  return user.id;
}

const projectInclude = {
  cast: { orderBy: { name: "asc" } },
  timeline: { orderBy: { index: "asc" } },
  audio: { orderBy: { name: "asc" } },
  scenes: {
    orderBy: { index: "asc" },
    include: {
      characters: true,
      props: true,
      lights: true,
      cameras: { orderBy: { name: "asc" } },
      shots: {
        orderBy: { index: "asc" },
        include: { movements: true, storyboardFrame: true },
      },
      blockingEvents: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export async function listProjects(): Promise<ProjectSummary[]> {
  const userId = await ensureLocalUser();
  const rows = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      scenes: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          environmentId: true,
          location: true,
          timeOfDay: true,
          shots: { select: { duration: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    format: row.format as ProjectFormat,
    mood: row.mood as VisualMood,
    genre: row.genre,
    status: row.status,
    isDemo: row.isDemo,
    updatedAt: row.updatedAt.toISOString(),
    sceneCount: row.scenes.length,
    shotCount: row.scenes.reduce((n, s) => n + s.shots.length, 0),
    runtime: row.scenes.reduce(
      (total, s) => total + s.shots.reduce((n, shot) => n + shot.duration, 0),
      0,
    ),
    environmentId: row.scenes[0]?.environmentId ?? null,
    location: row.scenes[0]?.location ?? null,
    timeOfDay: (row.scenes[0]?.timeOfDay as TimeOfDay | undefined) ?? null,
  }));
}

export async function getProject(id: string): Promise<ProjectDoc | null> {
  const row = await prisma.project.findUnique({ where: { id }, include: projectInclude });
  return row ? toProject(row as unknown as Record<string, unknown>) : null;
}

export interface CreateProjectInput {
  title: string;
  format?: ProjectFormat;
  mood?: VisualMood;
  genre?: string | null;
  logline?: string | null;
  challengeSlug?: string | null;
  environmentId?: string;
  lightingPreset?: LightingPresetId;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDoc> {
  const userId = await ensureLocalUser();
  const project = await prisma.project.create({
    data: {
      userId,
      title: input.title.trim() || "Untitled Film",
      format: input.format ?? "SHORT_FILM",
      mood: input.mood ?? "NATURALISTIC",
      genre: input.genre ?? null,
      logline: input.logline ?? null,
      challengeSlug: input.challengeSlug ?? null,
    },
  });

  const scene = buildNewScene({
    projectId: project.id,
    index: 0,
    environmentId: input.environmentId,
    lightingPreset: input.lightingPreset,
  });
  await insertScene(scene);

  const created = await getProject(project.id);
  if (!created) throw new Error("Project creation failed");
  return created;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<ProjectDoc, "title" | "format" | "mood" | "genre" | "logline" | "status" | "script">>,
): Promise<void> {
  await prisma.project.update({ where: { id }, data: patch });
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}

export async function insertScene(scene: SceneDoc): Promise<void> {
  await prisma.scene.create({
    data: {
      id: scene.id,
      projectId: scene.projectId,
      index: scene.index,
      name: scene.name,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      environmentId: scene.environmentId,
      lightingPreset: scene.lightingPreset,
      versionLabel: scene.versionLabel,
      parentSceneId: scene.parentSceneId,
      notes: scene.notes,
      characters: {
        create: scene.characters.map((c) => ({
          id: c.id,
          characterId: c.characterId,
          position: c.position,
          rotation: c.rotation,
          scale: c.scale,
          animation: c.animation,
          locked: c.locked,
        })),
      },
      props: {
        create: scene.props.map((p) => ({
          id: p.id,
          name: p.name,
          definitionId: p.definitionId,
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
        })),
      },
      lights: {
        create: scene.lights.map((l) => ({
          id: l.id,
          role: l.role,
          enabled: l.enabled,
          intensity: l.intensity,
          position: l.position,
          rotation: l.rotation,
          color: l.color,
          temperature: l.temperature,
          size: l.size,
        })),
      },
      cameras: {
        create: scene.cameras.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          target: c.target,
          focalLength: c.focalLength,
          aperture: c.aperture,
          dofEnabled: c.dofEnabled,
          focusTargetId: c.focusTargetId,
          shotSize: c.shotSize,
          heightPreset: c.heightPreset,
          isActive: c.isActive,
          movementType: c.movementType,
          movementDuration: c.movementDuration,
          movementIntensity: c.movementIntensity,
        })),
      },
      blockingEvents: {
        create: scene.blockingEvents.map((b) => ({
          id: b.id,
          sceneCharacterId: b.sceneCharacterId,
          startTime: b.startTime,
          endTime: b.endTime,
          action: b.action,
          startPosition: b.startPosition,
          endPosition: b.endPosition,
          rotation: b.rotation,
        })),
      },
      shots: {
        create: scene.shots.map((shot) => ({
          id: shot.id,
          index: shot.index,
          name: shot.name,
          shotSize: shot.shotSize,
          duration: shot.duration,
          sceneTime: shot.sceneTime,
          cameraState: shot.cameraState as unknown as Prisma.InputJsonValue,
          subjects: shot.subjects,
          notes: shot.notes,
          transition: shot.transition,
          movements: {
            create: shot.movements.map((m) => ({
              id: m.id,
              type: m.type,
              startTime: m.startTime,
              duration: m.duration,
              intensity: m.intensity,
              startTransform: m.startTransform as unknown as Prisma.InputJsonValue,
              endTransform: m.endTransform as unknown as Prisma.InputJsonValue,
            })),
          },
        })),
      },
    },
  });
}

/** Which parts of an existing scene a new scene should start from. */
export interface SceneCarryOver {
  /** The set itself: environment, location and time of day. */
  set?: boolean;
  /** The light rig, including any adjustments made to individual lights. */
  lighting?: boolean;
  /** The cast, standing where they stood. */
  cast?: boolean;
  /** Props, where they were dressed. */
  props?: boolean;
}

export interface AddSceneInput {
  name?: string;
  environmentId?: string;
  location?: string;
  timeOfDay?: TimeOfDay;
  /** Scene to carry things over from. */
  copyFrom?: string;
  include?: SceneCarryOver;
}

/**
 * Creates the next scene in the film, optionally carrying the set, the rig, the
 * cast and the dressing over from a scene that already exists.
 *
 * Everything copied gets fresh ids — two scenes never share a row — but cast
 * members are referenced, not duplicated: the same actor walks into the next
 * scene, rather than a second actor with the same name.
 */
export async function addScene(
  projectId: string,
  input: AddSceneInput = {},
): Promise<SceneDoc> {
  const count = await prisma.scene.count({ where: { projectId, parentSceneId: null } });
  const source =
    input.copyFrom && input.include && Object.values(input.include).some(Boolean)
      ? await loadSceneDoc(input.copyFrom, projectId)
      : null;

  const include = input.include ?? {};
  const base = buildNewScene({
    projectId,
    index: count,
    name: input.name,
    location: input.location,
    timeOfDay: input.timeOfDay,
    // The set decides the default camera and lighting, so resolve it first.
    environmentId:
      input.environmentId ?? (source && include.set ? source.environmentId : undefined),
    lightingPreset: source && include.lighting ? source.lightingPreset : undefined,
  });

  const scene: SceneDoc = {
    ...base,
    ...(source && include.set
      ? {
          location: input.location ?? source.location,
          timeOfDay: input.timeOfDay ?? source.timeOfDay,
        }
      : {}),
    ...(source && include.lighting
      ? { lights: source.lights.map((light) => ({ ...light, id: newId("lgt") })) }
      : {}),
    ...(source && include.cast
      ? {
          characters: source.characters.map((character) => ({
            ...character,
            id: newId("sch"),
          })),
        }
      : {}),
    ...(source && include.props
      ? { props: source.props.map((prop) => ({ ...prop, id: newId("prp") })) }
      : {}),
  };

  // A camera focused on an actor from the old scene would point at nothing.
  scene.cameras = scene.cameras.map((camera) => ({ ...camera, focusTargetId: null }));

  await insertScene(scene);
  return scene;
}

/** One scene of a project, as a document. */
async function loadSceneDoc(sceneId: string, projectId: string): Promise<SceneDoc | null> {
  const project = await getProject(projectId);
  return project?.scenes.find((scene) => scene.id === sceneId) ?? null;
}

/**
 * "Try another version" (§21): a complete, independent copy of a scene, hung off
 * the original as an alternative. Every internal reference — blocking, focus
 * targets, shot subjects — is remapped to the copy, so the two versions can
 * never reach into each other.
 */
export async function duplicateScene(sceneId: string, label?: string): Promise<SceneDoc> {
  const project = await prisma.scene.findUnique({
    where: { id: sceneId },
    select: { projectId: true },
  });
  if (!project) throw new Error("Scene not found");

  const full = await getProject(project.projectId);
  const source = full?.scenes.find((scene) => scene.id === sceneId);
  if (!full || !source) throw new Error("Scene not found");

  const rootId = source.parentSceneId ?? source.id;
  const versionCount = full.scenes.filter((scene) => scene.parentSceneId === rootId).length;
  const versionLabel = label ?? `Alternative ${String(versionCount + 1).padStart(2, "0")}`;

  // Old id → new id, so references inside the scene keep pointing at the copy.
  const remap = new Map<string, string>();
  const next = (id: string, prefix: string) => {
    const created = newId(prefix);
    remap.set(id, created);
    return created;
  };

  const characters = source.characters.map((character) => ({
    ...character,
    id: next(character.id, "sch"),
  }));
  const props = source.props.map((prop) => ({ ...prop, id: next(prop.id, "prp") }));
  const lights = source.lights.map((light) => ({ ...light, id: newId("lgt") }));
  const cameras = source.cameras.map((camera) => ({
    ...camera,
    id: next(camera.id, "cam"),
    focusTargetId: camera.focusTargetId ? (remap.get(camera.focusTargetId) ?? null) : null,
  }));

  const copy: SceneDoc = {
    ...source,
    id: newId("scn"),
    parentSceneId: rootId,
    versionLabel,
    characters,
    props,
    lights,
    cameras,
    blockingEvents: source.blockingEvents.map((event) => ({
      ...event,
      id: newId("blk"),
      sceneCharacterId: remap.get(event.sceneCharacterId) ?? event.sceneCharacterId,
    })),
    shots: source.shots.map((shot) => ({
      ...shot,
      id: newId("sht"),
      cameraId: shot.cameraId ? (remap.get(shot.cameraId) ?? null) : null,
      subjects: shot.subjects.map((id) => remap.get(id) ?? id),
      cameraState: {
        ...shot.cameraState,
        focusTargetId: shot.cameraState.focusTargetId
          ? (remap.get(shot.cameraState.focusTargetId) ?? null)
          : null,
      },
      // A copy starts with no storyboard card: it is not the same frame yet.
      frameUrl: null,
      movements: shot.movements.map((movement) => ({ ...movement, id: newId("mov") })),
    })),
  };

  await insertScene(copy);
  return copy;
}

export async function deleteScene(sceneId: string): Promise<void> {
  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  if (!scene) return;
  await prisma.scene.delete({ where: { id: sceneId } });
  const remaining = await prisma.scene.findMany({
    where: { projectId: scene.projectId, parentSceneId: null },
    orderBy: { index: "asc" },
  });
  await prisma.$transaction(
    remaining.map((s, i) => prisma.scene.update({ where: { id: s.id }, data: { index: i } })),
  );
}

export async function upsertCast(projectId: string, cast: CastMemberDoc[]): Promise<void> {
  if (cast.length === 0) return;
  await prisma.$transaction(
    cast.map((member) =>
      prisma.character.upsert({
        where: { id: member.id },
        create: {
          id: member.id,
          projectId,
          name: member.name,
          definitionId: member.definitionId,
          accentColor: member.accentColor,
        },
        update: {
          name: member.name,
          definitionId: member.definitionId,
          accentColor: member.accentColor,
        },
      }),
    ),
  );
}

/**
 * Full replace of a scene's staging. The client owns ids, so this is idempotent
 * and safe to call from autosave as often as it likes.
 */
export async function saveScene(scene: SceneDoc, cast: CastMemberDoc[]): Promise<void> {
  await upsertCast(scene.projectId, cast);

  const characterIds = scene.characters.map((c) => c.id);
  const propIds = scene.props.map((p) => p.id);
  const lightIds = scene.lights.map((l) => l.id);
  const cameraIds = scene.cameras.map((c) => c.id);
  const beatIds = scene.blockingEvents.map((b) => b.id);
  const shotIds = scene.shots.map((s) => s.id);
  const movementIds = scene.shots.flatMap((s) => s.movements.map((m) => m.id));

  /** `notIn: []` matches nothing in Prisma, so keep a sentinel in the list. */
  const keep = (ids: string[]) => (ids.length ? ids : ["__none__"]);

  await prisma.$transaction([
    prisma.scene.update({
      where: { id: scene.id },
      data: {
        name: scene.name,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        environmentId: scene.environmentId,
        lightingPreset: scene.lightingPreset,
        versionLabel: scene.versionLabel,
        notes: scene.notes,
      },
    }),
    // Blocking beats hang off scene characters, so they go first.
    prisma.blockingEvent.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(beatIds) } },
    }),
    prisma.cameraMovement.deleteMany({
      where: { shot: { sceneId: scene.id }, id: { notIn: keep(movementIds) } },
    }),
    prisma.shot.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(shotIds) } },
    }),
    prisma.sceneCharacter.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(characterIds) } },
    }),
    prisma.sceneProp.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(propIds) } },
    }),
    prisma.light.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(lightIds) } },
    }),
    prisma.camera.deleteMany({
      where: { sceneId: scene.id, id: { notIn: keep(cameraIds) } },
    }),
    ...scene.characters.map((c) =>
      prisma.sceneCharacter.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          sceneId: scene.id,
          characterId: c.characterId,
          position: c.position,
          rotation: c.rotation,
          scale: c.scale,
          animation: c.animation,
          locked: c.locked,
        },
        update: {
          position: c.position,
          rotation: c.rotation,
          scale: c.scale,
          animation: c.animation,
          locked: c.locked,
        },
      }),
    ),
    ...scene.props.map((p) =>
      prisma.sceneProp.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          sceneId: scene.id,
          name: p.name,
          definitionId: p.definitionId,
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
        },
        update: {
          name: p.name,
          position: p.position,
          rotation: p.rotation,
          scale: p.scale,
        },
      }),
    ),
    ...scene.lights.map((l) =>
      prisma.light.upsert({
        where: { id: l.id },
        create: {
          id: l.id,
          sceneId: scene.id,
          role: l.role,
          enabled: l.enabled,
          intensity: l.intensity,
          position: l.position,
          rotation: l.rotation,
          color: l.color,
          temperature: l.temperature,
          size: l.size,
        },
        update: {
          enabled: l.enabled,
          intensity: l.intensity,
          position: l.position,
          rotation: l.rotation,
          color: l.color,
          temperature: l.temperature,
          size: l.size,
        },
      }),
    ),
    ...scene.cameras.map((c) =>
      prisma.camera.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          sceneId: scene.id,
          name: c.name,
          position: c.position,
          target: c.target,
          focalLength: c.focalLength,
          aperture: c.aperture,
          dofEnabled: c.dofEnabled,
          focusTargetId: c.focusTargetId,
          shotSize: c.shotSize,
          heightPreset: c.heightPreset,
          isActive: c.isActive,
          movementType: c.movementType,
          movementDuration: c.movementDuration,
          movementIntensity: c.movementIntensity,
        },
        update: {
          name: c.name,
          position: c.position,
          target: c.target,
          focalLength: c.focalLength,
          aperture: c.aperture,
          dofEnabled: c.dofEnabled,
          focusTargetId: c.focusTargetId,
          shotSize: c.shotSize,
          heightPreset: c.heightPreset,
          isActive: c.isActive,
          movementType: c.movementType,
          movementDuration: c.movementDuration,
          movementIntensity: c.movementIntensity,
        },
      }),
    ),
    ...scene.blockingEvents.map((beat) =>
      prisma.blockingEvent.upsert({
        where: { id: beat.id },
        create: {
          id: beat.id,
          sceneId: scene.id,
          sceneCharacterId: beat.sceneCharacterId,
          startTime: beat.startTime,
          endTime: beat.endTime,
          action: beat.action,
          startPosition: beat.startPosition,
          endPosition: beat.endPosition,
          rotation: beat.rotation,
        },
        update: {
          startTime: beat.startTime,
          endTime: beat.endTime,
          action: beat.action,
          startPosition: beat.startPosition,
          endPosition: beat.endPosition,
          rotation: beat.rotation,
        },
      }),
    ),
    ...scene.shots.map((shot) =>
      prisma.shot.upsert({
        where: { id: shot.id },
        create: {
          id: shot.id,
          sceneId: scene.id,
          index: shot.index,
          name: shot.name,
          shotSize: shot.shotSize,
          duration: shot.duration,
          sceneTime: shot.sceneTime,
          cameraState: shot.cameraState as unknown as Prisma.InputJsonValue,
          subjects: shot.subjects,
          notes: shot.notes,
          transition: shot.transition,
          cameraId: shot.cameraId,
        },
        update: {
          index: shot.index,
          name: shot.name,
          shotSize: shot.shotSize,
          duration: shot.duration,
          sceneTime: shot.sceneTime,
          cameraState: shot.cameraState as unknown as Prisma.InputJsonValue,
          subjects: shot.subjects,
          notes: shot.notes,
          transition: shot.transition,
        },
      }),
    ),
    ...scene.shots.flatMap((shot) =>
      shot.movements.map((movement) =>
        prisma.cameraMovement.upsert({
          where: { id: movement.id },
          create: {
            id: movement.id,
            shotId: shot.id,
            type: movement.type,
            startTime: movement.startTime,
            duration: movement.duration,
            intensity: movement.intensity,
            startTransform: movement.startTransform as unknown as Prisma.InputJsonValue,
            endTransform: movement.endTransform as unknown as Prisma.InputJsonValue,
          },
          update: {
            type: movement.type,
            startTime: movement.startTime,
            duration: movement.duration,
            intensity: movement.intensity,
            startTransform: movement.startTransform as unknown as Prisma.InputJsonValue,
            endTransform: movement.endTransform as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
    ),
    prisma.project.update({ where: { id: scene.projectId }, data: { updatedAt: new Date() } }),
  ]);
}

/** Replaces the whole cut in one write — the client owns the item ids. */
export async function saveTimeline(
  projectId: string,
  items: TimelineItemDoc[],
): Promise<void> {
  // A client can be holding a clip whose shot has since been deleted. Dropping
  // it here is right either way, and it stops one stale tab from wedging every
  // subsequent save on a foreign key.
  const [shots, audio] = await Promise.all([
    prisma.shot.findMany({ where: { scene: { projectId } }, select: { id: true } }),
    prisma.audioAsset.findMany({ where: { projectId }, select: { id: true } }),
  ]);
  const liveShots = new Set(shots.map((shot) => shot.id));
  const liveAudio = new Set(audio.map((asset) => asset.id));
  items = items.filter(
    (item) =>
      (item.shotId === null || liveShots.has(item.shotId)) &&
      (item.audioAssetId === null || liveAudio.has(item.audioAssetId)),
  );

  const ids = items.map((item) => item.id);
  await prisma.$transaction([
    prisma.timelineItem.deleteMany({
      where: { projectId, id: { notIn: ids.length ? ids : ["__none__"] } },
    }),
    ...items.map((item) =>
      prisma.timelineItem.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          projectId,
          index: item.index,
          track: item.track,
          startTime: item.startTime,
          duration: item.duration,
          trimIn: item.trimIn,
          trimOut: item.trimOut,
          transition: item.transition,
          shotId: item.shotId,
          audioAssetId: item.audioAssetId,
        },
        update: {
          index: item.index,
          track: item.track,
          startTime: item.startTime,
          duration: item.duration,
          trimIn: item.trimIn,
          trimOut: item.trimOut,
          transition: item.transition,
          shotId: item.shotId,
          audioAssetId: item.audioAssetId,
        },
      }),
    ),
    prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } }),
  ]);
}

export async function createCastMember(
  projectId: string,
  input: { name: string; definitionId: string; accentColor?: string },
): Promise<CastMemberDoc> {
  const member = await prisma.character.create({
    data: {
      id: newId("cast"),
      projectId,
      name: input.name,
      definitionId: input.definitionId,
      accentColor: input.accentColor ?? "#c9a227",
    },
  });
  return {
    id: member.id,
    name: member.name,
    definitionId: member.definitionId,
    accentColor: member.accentColor,
  };
}
