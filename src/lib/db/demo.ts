import { prisma } from "./prisma";
import { ensureLocalUser, insertScene, saveTimeline } from "./projects";
import { buildNewScene, newId } from "./defaults";
import { calculateCameraForShotSize, movementEndTransform, v } from "@/lib/cinematography";
import { bodyHeight, poseAimDrop } from "@/data/characters";
import { CAST_COLORS_SERVER } from "./castColors";
import type {
  BlockingEventDoc,
  CameraDoc,
  CameraMovementType,
  CameraTransform,
  SceneDoc,
  ShotDoc,
  ShotSize,
  Vec3,
} from "@/types";

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
const MAYA_FACING = Math.atan2(
  ALEX_POSITION[0] - MAYA_POSITION[0],
  ALEX_POSITION[2] - MAYA_POSITION[2],
);

function beat(
  sceneCharacterId: string,
  startTime: number,
  endTime: number,
  action: BlockingEventDoc["action"],
  startPosition: Vec3,
  endPosition: Vec3,
  rotation: Vec3,
): BlockingEventDoc {
  return {
    id: newId("blk"),
    sceneCharacterId,
    startTime,
    endTime,
    action,
    startPosition,
    endPosition,
    rotation,
  };
}
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

/** A shot frozen from a framing, exactly as Capture Shot would record it. */
function shotFrom(
  index: number,
  name: string,
  options: {
    shotSize: ShotSize;
    focalLength: number;
    azimuth: number;
    heightPreset?: CameraDoc["heightPreset"];
    subject: { position: Vec3; height: number; aimDrop?: number };
    sceneTime: number;
    duration: number;
    movement?: CameraMovementType;
    intensity?: number;
    aperture?: number;
    focusTargetId?: string | null;
    subjects?: string[];
    notes?: string;
  },
): ShotDoc {
  const { position, target } = calculateCameraForShotSize({
    shotSize: options.shotSize,
    subject: options.subject,
    focalLength: options.focalLength,
    heightPreset: options.heightPreset ?? "EYE",
    azimuth: options.azimuth,
  });
  const cameraState: CameraTransform = {
    position,
    target,
    focalLength: options.focalLength,
    aperture: options.aperture ?? 2.8,
    dofEnabled: options.aperture !== undefined,
    focusTargetId: options.focusTargetId ?? null,
  };
  const movement = options.movement && options.movement !== "STATIC" ? options.movement : null;

  return {
    id: newId("sht"),
    index,
    name,
    shotSize: options.shotSize,
    duration: options.duration,
    sceneTime: options.sceneTime,
    cameraState,
    subjects: options.subjects ?? [],
    notes: options.notes ?? "",
    transition: "CUT",
    cameraId: null,
    frameUrl: null,
    movements: movement
      ? [
          {
            id: newId("mov"),
            type: movement,
            startTime: 0,
            duration: options.duration,
            intensity: options.intensity ?? 0.5,
            startTransform: cameraState,
            endTransform: movementEndTransform(cameraState, movement, options.intensity ?? 0.5),
          },
        ]
      : [],
  };
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

  const alexSubject = { position: ALEX_POSITION, height: ALEX_HEIGHT, aimDrop: ALEX_SEATED_DROP };
  const alexStanding = { position: ALEX_POSITION, height: ALEX_HEIGHT };
  const mayaSubject = { position: MAYA_POSITION, height: bodyHeight("adult_slight") };
  const doorway: Vec3 = [-2.75, 0, 1.7];
  const phoneAt: Vec3 = [0.18, 0.75, -0.28];

  /**
   * The beat sheet:
   *   00:00  Alex waits at the table
   *   00:03  the phone goes; he picks it up
   *   00:05  Maya turns away
   *   00:07  he stands
   *   00:08  he walks out
   */
  const blockingEvents: SceneDoc["blockingEvents"] = [
    beat(alexPlacement, 0, 3, "SIT", ALEX_POSITION, ALEX_POSITION, [0, Math.PI, 0]),
    beat(alexPlacement, 3, 4.6, "PHONE", ALEX_POSITION, ALEX_POSITION, [0, Math.PI, 0]),
    beat(alexPlacement, 6.8, 8, "STAND", ALEX_POSITION, ALEX_POSITION, [0, Math.PI * 0.75, 0]),
    beat(alexPlacement, 8, 11.5, "WALK", ALEX_POSITION, doorway, [0, -2.2, 0]),
    beat(mayaPlacement, 0, 5, "LOOK", MAYA_POSITION, MAYA_POSITION, [0, MAYA_FACING, 0]),
    beat(mayaPlacement, 5, 7.5, "TURN", MAYA_POSITION, MAYA_POSITION, [0, MAYA_FACING - 1.5, 0]),
  ];

  const shots: ShotDoc[] = [
    shotFrom(0, "Shot 01 — Master", {
      shotSize: "WIDE",
      focalLength: 35,
      azimuth: 2.15,
      heightPreset: "CHEST",
      subject: alexSubject,
      sceneTime: 0,
      duration: 4,
      subjects: [alexPlacement, mayaPlacement],
      notes: "Let the room do the work. Maya is in the background on purpose.",
    }),
    shotFrom(1, "Shot 02 — Push In", {
      shotSize: "MEDIUM_CLOSE",
      focalLength: 50,
      azimuth: 2.35,
      subject: alexSubject,
      sceneTime: 2,
      duration: 3.5,
      movement: "PUSH_IN",
      intensity: 0.55,
      subjects: [alexPlacement],
      notes: "Arrive on him just as the phone goes.",
    }),
    shotFrom(2, "Shot 03 — Insert", {
      shotSize: "CLOSE_UP",
      focalLength: 85,
      azimuth: 2.6,
      // An insert is framed on the object, not on a body: the "subject" is a
      // short column standing on the table, aimed at the tabletop itself.
      heightPreset: "HIGH",
      subject: { position: phoneAt, height: 0.55, aimDrop: 0.49 },
      sceneTime: 3,
      duration: 1.8,
      aperture: 2,
      subjects: [],
      notes: "The phone. Cut here and the audience knows before he moves.",
    }),
    shotFrom(3, "Shot 04 — Close", {
      shotSize: "CLOSE_UP",
      focalLength: 85,
      azimuth: 2.55,
      subject: alexSubject,
      sceneTime: 4.2,
      duration: 3,
      movement: "HANDHELD",
      intensity: 0.35,
      aperture: 2,
      focusTargetId: alexPlacement,
      subjects: [alexPlacement],
      notes: "Handheld from here on — the night stops being still.",
    }),
    shotFrom(4, "Shot 05 — Maya", {
      shotSize: "MEDIUM",
      focalLength: 50,
      azimuth: 0.6,
      subject: mayaSubject,
      sceneTime: 5,
      duration: 2.4,
      subjects: [mayaPlacement],
      notes: "Her reverse. She heard it too.",
    }),
    shotFrom(5, "Shot 06 — He leaves", {
      shotSize: "MEDIUM_WIDE",
      focalLength: 35,
      azimuth: 1.9,
      subject: alexStanding,
      sceneTime: 8,
      duration: 3.5,
      subjects: [alexPlacement],
      notes: "Hold the empty room for a beat after he goes.",
    }),
  ];

  return {
    ...scene,
    timeOfDay: "NIGHT",
    location: "Apartment",
    blockingEvents,
    shots,
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
        rotation: [0, MAYA_FACING, 0],
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

  const streetShot = shotFrom(0, "Shot 07 — Outside", {
    shotSize: "WIDE",
    focalLength: 24,
    azimuth: alexFacing,
    subject: { position: alexAt, height: ALEX_HEIGHT },
    sceneTime: 0,
    duration: 6,
    movement: "TRUCK_RIGHT",
    intensity: 0.6,
    subjects: [alexPlacement],
    notes: "One long move. Let him walk into it.",
  });

  return {
    ...scene,
    timeOfDay: "NIGHT",
    location: "Street",
    notes: "Where Alex goes next. One long move, no cuts — see how little you need.",
    shots: [streetShot],
    blockingEvents: [
      beat(alexPlacement, 0, 6, "WALK", alexAt, [alexAt[0] - 2.6, 0, alexAt[2] - 0.9], [0, alexFacing, 0]),
    ],
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

  const apartment = apartmentScene(project.id, alex.id, maya.id);
  const street = streetScene(project.id, alex.id);
  await insertScene(apartment);
  await insertScene(street);

  // The film is already cut together, so Edit → play works on first launch.
  await saveTimeline(
    project.id,
    [...apartment.shots, ...street.shots].map((shot, index) => ({
      id: newId("tli"),
      index,
      track: "VIDEO" as const,
      startTime: 0,
      duration: shot.duration,
      trimIn: 0,
      trimOut: 0,
      transition: index === 0 ? ("FADE" as const) : ("CUT" as const),
      shotId: shot.id,
      audioAssetId: null,
    })),
  );
}
