import { prisma } from "./prisma";
import { ensureLocalUser, insertScene } from "./projects";
import { buildNewScene, newId } from "./defaults";
import { calculateCameraForShotSize, v } from "@/lib/cinematography";
import { bodyHeight, poseAimDrop } from "@/data/characters";
import { CAST_COLORS_SERVER } from "./castColors";
import type { CameraDoc, SceneDoc, Vec3 } from "@/types";

/**
 * THE LAST CALL (§42) — the film that is already there the first time Pocket
 * Studio opens. Alex is at the kitchen table when the phone goes; Maya is in the
 * doorway. Three cameras are rigged with different interpretations of the same
 * moment, so pressing Preview does something within seconds of arriving.
 *
 * Shot capture, the storyboard and the sequence editor are not built yet, so the
 * demo deliberately ships no captured shots — it ships a set, a cast, a light
 * rig and three framings that all work today.
 */

const ALEX_POSITION: Vec3 = [0, 0, 0.62];
const MAYA_POSITION: Vec3 = [-1.95, 0, 1.05];
const ALEX_HEIGHT = bodyHeight("adult_average");
/** He is seated at the table, so the framing centre drops with him. */
const ALEX_SEATED_DROP = poseAimDrop("adult_average", 1, "SIT");

function camera(
  name: string,
  overrides: Partial<CameraDoc> & Pick<CameraDoc, "position" | "target">,
): CameraDoc {
  return {
    id: newId("cam"),
    name,
    focalLength: 35,
    aperture: 2.8,
    dofEnabled: false,
    focusTargetId: null,
    shotSize: "MEDIUM",
    heightPreset: "EYE",
    isActive: false,
    movementType: "STATIC",
    movementDuration: 4,
    movementIntensity: 0.5,
    ...overrides,
  };
}

/** Builds a camera that genuinely produces the requested framing of Alex. */
function framedCamera(
  name: string,
  shotSize: CameraDoc["shotSize"],
  focalLength: number,
  azimuth: number,
  heightPreset: CameraDoc["heightPreset"],
  extra: Partial<CameraDoc> = {},
): CameraDoc {
  const { position, target } = calculateCameraForShotSize({
    shotSize,
    subject: { position: ALEX_POSITION, height: ALEX_HEIGHT, aimDrop: ALEX_SEATED_DROP },
    focalLength,
    heightPreset,
    azimuth,
  });
  return camera(name, { position, target, focalLength, shotSize, heightPreset, ...extra });
}

function apartmentScene(projectId: string, alexId: string, mayaId: string): SceneDoc {
  const scene = buildNewScene({
    projectId,
    index: 0,
    name: "The Call",
    environmentId: "apartment",
    lightingPreset: "WARM_INTERIOR",
  });

  const alexPlacement = newId("sch");
  const mayaPlacement = newId("sch");

  // Alex faces the table (-z), so every camera works from a three-quarter front
  // angle on his right — clear of the table, with Maya left of frame behind him.
  const wide = framedCamera("Camera 01 — Master", "WIDE", 35, 2.15, "CHEST");
  const push = framedCamera("Camera 02 — Push In", "MEDIUM_CLOSE", 50, 2.35, "EYE", {
    movementType: "PUSH_IN",
    movementDuration: 5,
    movementIntensity: 0.55,
    isActive: true,
  });
  const close = framedCamera("Camera 03 — Close", "CLOSE_UP", 85, 2.55, "EYE", {
    movementType: "HANDHELD",
    movementDuration: 6,
    movementIntensity: 0.35,
    dofEnabled: true,
    aperture: 2,
    focusTargetId: alexPlacement,
  });

  return {
    ...scene,
    timeOfDay: "NIGHT",
    location: "Apartment",
    notes:
      "Alex has been waiting for this call without admitting it. Maya is close enough to hear and " +
      "far enough away to pretend she didn't. Try the same beat on all three cameras.",
    characters: [
      {
        id: alexPlacement,
        characterId: alexId,
        name: "Alex",
        definitionId: "adult_average",
        accentColor: CAST_COLORS_SERVER[0],
        position: ALEX_POSITION,
        rotation: [0, Math.PI, 0],
        scale: 1,
        animation: "SIT",
        locked: false,
      },
      {
        id: mayaPlacement,
        characterId: mayaId,
        name: "Maya",
        definitionId: "adult_slight",
        accentColor: CAST_COLORS_SERVER[1],
        position: MAYA_POSITION,
        // Turned toward Alex, watching.
        rotation: [0, Math.atan2(ALEX_POSITION[0] - MAYA_POSITION[0], ALEX_POSITION[2] - MAYA_POSITION[2]), 0],
        scale: 1,
        animation: "LOOK",
        locked: false,
      },
    ],
    props: [
      { id: newId("prp"), name: "Table", definitionId: "table", position: [0, 0, -0.42], rotation: [0, 0, 0], scale: 1 },
      { id: newId("prp"), name: "Chair", definitionId: "chair", position: [0, 0, 0.62], rotation: [0, Math.PI, 0], scale: 1 },
      { id: newId("prp"), name: "Phone", definitionId: "phone", position: [0.18, 0.75, -0.28], rotation: [0, 0.4, 0], scale: 1 },
      { id: newId("prp"), name: "Coffee Cup", definitionId: "coffee_cup", position: [-0.32, 0.75, -0.55], rotation: [0, 0, 0], scale: 1 },
      { id: newId("prp"), name: "Lamp", definitionId: "lamp", position: [1.72, 0, -1.35], rotation: [0, 0, 0], scale: 1 },
    ],
    cameras: [wide, push, close],
  };
}

function streetScene(projectId: string, alexId: string): SceneDoc {
  const scene = buildNewScene({
    projectId,
    index: 1,
    name: "Outside, After",
    environmentId: "street",
    lightingPreset: "NIGHT",
  });

  const alexPlacement = newId("sch");
  const alexAt: Vec3 = [0.4, 0, 2.6];
  const alexFacing = -1.9;
  // Meet him head-on: the camera stands where he is walking to.
  const azimuth = alexFacing;
  const { position, target } = calculateCameraForShotSize({
    shotSize: "WIDE",
    subject: { position: alexAt, height: ALEX_HEIGHT },
    focalLength: 24,
    heightPreset: "EYE",
    azimuth,
  });

  return {
    ...scene,
    timeOfDay: "NIGHT",
    location: "Street",
    notes: "Where Alex goes next. One long move, no cuts — see how little you need.",
    characters: [
      {
        id: alexPlacement,
        characterId: alexId,
        name: "Alex",
        definitionId: "adult_average",
        accentColor: CAST_COLORS_SERVER[0],
        position: alexAt,
        rotation: [0, -1.9, 0],
        scale: 1,
        animation: "WALK",
        locked: false,
      },
    ],
    props: [
      { id: newId("prp"), name: "Car", definitionId: "car", position: [-4.2, 0, -1.6], rotation: [0, Math.PI / 2, 0], scale: 1 },
    ],
    cameras: [
      {
        ...scene.cameras[0],
        name: "Camera 01 — Truck",
        position,
        target: v.round(target),
        focalLength: 24,
        shotSize: "WIDE",
        movementType: "TRUCK_RIGHT",
        movementDuration: 8,
        movementIntensity: 0.6,
        isActive: true,
      },
    ],
  };
}

/** Idempotent: creates the demo film once, then never touches it again. */
export async function ensureDemoProject(): Promise<void> {
  const userId = await ensureLocalUser();
  const existing = await prisma.project.findFirst({ where: { userId, isDemo: true } });
  if (existing) return;

  const project = await prisma.project.create({
    data: {
      userId,
      title: "The Last Call",
      format: "SHORT_FILM",
      mood: "DARK",
      genre: "Psychological Drama",
      logline: "Alex receives a phone call that changes the direction of their night.",
      isDemo: true,
    },
  });

  const alex = await prisma.character.create({
    data: {
      id: newId("cast"),
      projectId: project.id,
      name: "Alex",
      definitionId: "adult_average",
      accentColor: CAST_COLORS_SERVER[0],
    },
  });
  const maya = await prisma.character.create({
    data: {
      id: newId("cast"),
      projectId: project.id,
      name: "Maya",
      definitionId: "adult_slight",
      accentColor: CAST_COLORS_SERVER[1],
    },
  });

  await insertScene(apartmentScene(project.id, alex.id, maya.id));
  await insertScene(streetScene(project.id, alex.id));
}
