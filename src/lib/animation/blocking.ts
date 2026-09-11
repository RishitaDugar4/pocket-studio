import type {
  BlockingEventDoc,
  CharacterAnimation,
  SceneCharacterDoc,
  SceneDoc,
  Vec3,
} from "@/types";
import { smoothstep, v } from "@/lib/cinematography";

/**
 * Blocking evaluation (§12). A scene is a set of timed beats per actor; this
 * turns "what is Alex doing at 6.2 seconds" into a transform. Pure, so the
 * viewport, the shot preview and the sequence editor all agree.
 */

export interface ActorState {
  position: Vec3;
  rotation: Vec3;
  animation: CharacterAnimation;
  /** True while the actor is travelling — used to force a walk cycle. */
  moving: boolean;
  /**
   * Whether they are on the chair. Sitting is a state, not a one-off action:
   * an actor who sits down and then answers the phone is still sitting.
   */
  seated: boolean;
}

/** Actions that are a move rather than a held pose. */
const TRAVEL_ACTIONS: ReadonlySet<string> = new Set(["WALK", "ENTER", "EXIT"]);

/** Actions that get an actor out of the chair. */
const STANDING_ACTIONS: ReadonlySet<string> = new Set(["STAND", "WALK", "ENTER", "EXIT", "TURN"]);

function seatedAfter(action: BlockingEventDoc["action"], wasSeated: boolean): boolean {
  if (action === "SIT") return true;
  if (STANDING_ACTIONS.has(action)) return false;
  return wasSeated;
}

export function beatsFor(scene: SceneDoc, sceneCharacterId: string): BlockingEventDoc[] {
  return scene.blockingEvents
    .filter((event) => event.sceneCharacterId === sceneCharacterId)
    .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
}

/** The pose a beat resolves to: travel beats animate, held beats hold. */
export function beatAnimation(event: BlockingEventDoc, moving: boolean): CharacterAnimation {
  if (event.action === "ENTER" || event.action === "EXIT") return moving ? "WALK" : "IDLE";
  if (moving && TRAVEL_ACTIONS.has(event.action)) return "WALK";
  return event.action as CharacterAnimation;
}

/** Facing a travelling actor should adopt, if the director did not set one. */
function travelFacing(from: Vec3, to: Vec3): number | null {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  if (Math.hypot(dx, dz) < 0.15) return null;
  return Math.atan2(dx, dz);
}

function resolveRotation(
  event: BlockingEventDoc,
  previous: Vec3,
  progress: number,
  moving: boolean,
): Vec3 {
  const target: Vec3 = [...event.rotation];
  // An actor who is walking somewhere looks where they are going, unless the
  // director turned them deliberately.
  if (moving) {
    const facing = travelFacing(event.startPosition, event.endPosition);
    const deliberate = Math.abs(event.rotation[1] - previous[1]) > 0.02;
    if (facing !== null && !deliberate) target[1] = facing;
  }
  return [
    previous[0] + (target[0] - previous[0]) * progress,
    previous[1] + shortestAngleStep(previous[1], target[1]) * progress,
    previous[2] + (target[2] - previous[2]) * progress,
  ];
}

/** Turn the short way round, so an actor never spins 350° to face left. */
function shortestAngleStep(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Where an actor is at `time`. Before their first beat they hold their standing
 * placement; between beats they hold the last one; after the last they stay put.
 */
export function evaluateBlocking(
  character: SceneCharacterDoc,
  beats: BlockingEventDoc[],
  time: number,
): ActorState {
  const base: ActorState = {
    position: character.position,
    rotation: character.rotation,
    animation: character.animation,
    moving: false,
    seated: character.animation === "SIT",
  };
  if (beats.length === 0) return base;

  let previousPosition = base.position;
  let previousRotation = base.rotation;
  let seated = base.seated;
  let state = base;

  for (const beat of beats) {
    if (time < beat.startTime) {
      // Waiting for this beat to start.
      return {
        position: previousPosition,
        rotation: previousRotation,
        animation: state.animation,
        moving: false,
        seated,
      };
    }

    const span = Math.max(beat.endTime - beat.startTime, 0.001);
    const travels = v.distance(beat.startPosition, beat.endPosition) > 0.02;

    if (time <= beat.endTime) {
      const progress = smoothstep((time - beat.startTime) / span);
      const moving = travels && progress > 0.001 && progress < 0.999;
      return {
        position: v.lerp(beat.startPosition, beat.endPosition, progress),
        rotation: resolveRotation(beat, previousRotation, progress, travels),
        animation: beatAnimation(beat, moving),
        moving,
        seated: seatedAfter(beat.action, seated),
      };
    }

    previousPosition = beat.endPosition;
    previousRotation = resolveRotation(beat, previousRotation, 1, travels);
    seated = seatedAfter(beat.action, seated);
    state = {
      position: previousPosition,
      rotation: previousRotation,
      animation: beatAnimation(beat, false),
      moving: false,
      seated,
    };
  }

  return state;
}

/** Convenience for callers that only have the scene. */
export function actorStateAt(
  scene: SceneDoc,
  character: SceneCharacterDoc,
  time: number,
): ActorState {
  return evaluateBlocking(character, beatsFor(scene, character.id), time);
}

/** Where an actor stands when the next beat starts from "wherever they are". */
export function actorPositionAfterLastBeat(
  character: SceneCharacterDoc,
  beats: BlockingEventDoc[],
): { position: Vec3; rotation: Vec3; endTime: number; animation: CharacterAnimation } {
  const last = beats[beats.length - 1];
  if (!last) {
    return {
      position: character.position,
      rotation: character.rotation,
      endTime: 0,
      animation: character.animation,
    };
  }
  return {
    position: last.endPosition,
    rotation: last.rotation,
    endTime: last.endTime,
    animation: beatAnimation(last, false),
  };
}

/**
 * How long the scene runs: the last blocking beat, the camera move, or a
 * sensible minimum — whichever is longest.
 */
export function sceneDuration(scene: SceneDoc): number {
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const blockingEnd = scene.blockingEvents.reduce((max, e) => Math.max(max, e.endTime), 0);
  const shotEnd = scene.shots.reduce((max, s) => Math.max(max, s.duration), 0);
  return Math.max(camera?.movementDuration ?? 0, blockingEnd, shotEnd, 4);
}

export const BLOCKING_ACTIONS: Array<BlockingEventDoc["action"]> = [
  "ENTER",
  "WALK",
  "STAND",
  "SIT",
  "TURN",
  "LOOK",
  "TALK",
  "PHONE",
  "IDLE",
  "EXIT",
];

export function actionLabel(action: BlockingEventDoc["action"]): string {
  return action.charAt(0) + action.slice(1).toLowerCase();
}
