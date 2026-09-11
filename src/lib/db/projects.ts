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

export async function addScene(
  projectId: string,
  input: { name?: string; environmentId?: string } = {},
): Promise<SceneDoc> {
  const count = await prisma.scene.count({ where: { projectId, parentSceneId: null } });
  const scene = buildNewScene({ projectId, index: count, ...input });
  await insertScene(scene);
  return scene;
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
