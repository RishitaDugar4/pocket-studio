import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { toProject } from "./serialize";
import { buildNewScene, newId } from "./defaults";
import type {
  CastMemberDoc,
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
  scenes: {
    orderBy: { index: "asc" },
    include: {
      characters: true,
      props: true,
      lights: true,
      cameras: { orderBy: { name: "asc" } },
      shots: { orderBy: { index: "asc" }, include: { movements: true } },
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
    prisma.sceneCharacter.deleteMany({
      where: { sceneId: scene.id, id: { notIn: characterIds.length ? characterIds : ["__none__"] } },
    }),
    prisma.sceneProp.deleteMany({
      where: { sceneId: scene.id, id: { notIn: propIds.length ? propIds : ["__none__"] } },
    }),
    prisma.light.deleteMany({
      where: { sceneId: scene.id, id: { notIn: lightIds.length ? lightIds : ["__none__"] } },
    }),
    prisma.camera.deleteMany({
      where: { sceneId: scene.id, id: { notIn: cameraIds.length ? cameraIds : ["__none__"] } },
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
    prisma.project.update({ where: { id: scene.projectId }, data: { updatedAt: new Date() } }),
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
