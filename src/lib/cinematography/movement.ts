import type { CameraMovementType, CameraTransform, Vec3 } from "@/types";
import { clamp, smoothstep, v } from "./vec";

export interface MovementSpec {
  id: CameraMovementType;
  label: string;
  description: string;
  /** Handheld is a texture applied for the whole shot, not an A→B move. */
  continuous: boolean;
}

export const MOVEMENT_SPECS: MovementSpec[] = [
  { id: "STATIC", label: "Static", description: "Locked off. The frame does the work.", continuous: false },
  { id: "PAN", label: "Pan", description: "Camera pivots horizontally.", continuous: false },
  { id: "TILT", label: "Tilt", description: "Camera pivots vertically.", continuous: false },
  { id: "PUSH_IN", label: "Push In", description: "Camera moves toward the subject.", continuous: false },
  { id: "PULL_OUT", label: "Pull Out", description: "Camera retreats, revealing context.", continuous: false },
  { id: "TRUCK_LEFT", label: "Truck Left", description: "Camera slides left, parallel to the subject.", continuous: false },
  { id: "TRUCK_RIGHT", label: "Truck Right", description: "Camera slides right.", continuous: false },
  { id: "PEDESTAL", label: "Pedestal", description: "Camera rises on its column.", continuous: false },
  { id: "ORBIT", label: "Orbit", description: "Camera arcs around the subject.", continuous: false },
  { id: "HANDHELD", label: "Handheld", description: "Subtle operator drift for the whole shot.", continuous: true },
];

export function getMovementSpec(id: CameraMovementType): MovementSpec {
  return MOVEMENT_SPECS.find((m) => m.id === id) ?? MOVEMENT_SPECS[0];
}

export interface FrameTransform {
  position: Vec3;
  target: Vec3;
  /** Camera roll in radians — only handheld uses it. */
  roll: number;
}

/** Smooth, repeatable drift. Deterministic so playback and export match. */
function drift(t: number, seed: number): number {
  return (
    Math.sin(t * 1.113 + seed * 12.9898) * 0.6 +
    Math.sin(t * 0.371 + seed * 78.233) * 0.3 +
    Math.sin(t * 2.717 + seed * 39.425) * 0.1
  );
}

function rotateAroundY(point: Vec3, pivot: Vec3, angle: number): Vec3 {
  const dx = point[0] - pivot[0];
  const dz = point[2] - pivot[2];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [pivot[0] + dx * cos - dz * sin, point[1], pivot[2] + dx * sin + dz * cos];
}

function rightVector(position: Vec3, target: Vec3): Vec3 {
  const forward = v.normalize(v.sub(target, position));
  // cross(worldUp, forward) with worldUp = (0,1,0)
  return v.normalize([forward[2], 0, -forward[0]]);
}

/**
 * Where the camera sits partway through a move.
 * `progress` is 0→1 across the move; `elapsed` is seconds into the shot and is
 * only needed for continuous textures like handheld.
 */
export function evaluateMovement(
  base: Pick<CameraTransform, "position" | "target">,
  type: CameraMovementType,
  progress: number,
  options: { intensity?: number; elapsed?: number } = {},
): FrameTransform {
  const intensity = clamp(options.intensity ?? 0.5, 0, 1);
  const elapsed = options.elapsed ?? 0;
  const eased = smoothstep(progress);
  const scale = 0.35 + intensity * 1.3;
  const position: Vec3 = [...base.position];
  const target: Vec3 = [...base.target];
  const forward = v.normalize(v.sub(target, position));
  const distance = Math.max(v.distance(target, position), 0.2);

  switch (type) {
    case "PAN": {
      const angle = 0.44 * scale * eased;
      return { position, target: rotateAroundY(target, position, angle), roll: 0 };
    }
    case "TILT": {
      const lift = distance * 0.42 * scale * eased;
      return { position, target: [target[0], target[1] + lift, target[2]], roll: 0 };
    }
    case "PUSH_IN": {
      const travel = Math.min(distance - 0.3, distance * 0.42 * scale) * eased;
      return { position: v.add(position, v.scale(forward, travel)), target, roll: 0 };
    }
    case "PULL_OUT": {
      const travel = distance * 0.5 * scale * eased;
      return { position: v.sub(position, v.scale(forward, travel)), target, roll: 0 };
    }
    case "TRUCK_LEFT":
    case "TRUCK_RIGHT": {
      const dir = type === "TRUCK_LEFT" ? -1 : 1;
      const offset = v.scale(rightVector(position, target), dir * 1.3 * scale * eased);
      return { position: v.add(position, offset), target: v.add(target, offset), roll: 0 };
    }
    case "PEDESTAL": {
      const lift = 0.7 * scale * eased;
      return {
        position: [position[0], position[1] + lift, position[2]],
        target: [target[0], target[1] + lift * 0.55, target[2]],
        roll: 0,
      };
    }
    case "ORBIT": {
      const angle = 0.7 * scale * eased;
      return { position: rotateAroundY(position, target, angle), target, roll: 0 };
    }
    case "HANDHELD": {
      // Controlled, breathing drift — never a random shake.
      const amp = 0.012 + intensity * 0.035;
      const right = rightVector(position, target);
      const swayPos = v.add(
        v.scale(right, drift(elapsed * 0.9, 1) * amp * 2),
        [0, drift(elapsed * 0.7, 2) * amp * 1.6, 0] as Vec3,
      );
      const swayTarget = v.add(
        v.scale(right, drift(elapsed * 0.9 + 1.7, 3) * amp * 4),
        [0, drift(elapsed * 0.75 + 3.1, 4) * amp * 3.2, 0] as Vec3,
      );
      return {
        position: v.add(position, swayPos),
        target: v.add(target, swayTarget),
        roll: drift(elapsed * 0.55, 5) * amp * 0.35,
      };
    }
    case "STATIC":
    default:
      return { position, target, roll: 0 };
  }
}

/** The transform a move lands on — stored with a shot so playback is reproducible. */
export function movementEndTransform(
  base: CameraTransform,
  type: CameraMovementType,
  intensity = 0.5,
): CameraTransform {
  const frame = evaluateMovement(base, type, 1, { intensity });
  return { ...base, position: v.round(frame.position), target: v.round(frame.target) };
}
