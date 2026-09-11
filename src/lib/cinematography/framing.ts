import type { CameraHeight, CameraTransform, ShotSize, Vec3 } from "@/types";
import { verticalFovDeg } from "./lens";
import { clamp, degToRad, v } from "./vec";

/**
 * How each shot size frames a subject.
 * `coverage` is the vertical slice of the world the frame should hold, as a
 * multiple of the subject's height. `aim` is where the frame centre sits on the
 * body, 0 = floor, 1 = top of head.
 */
export interface ShotSizeSpec {
  id: ShotSize;
  label: string;
  short: string;
  coverage: number;
  aim: number;
  description: string;
}

export const SHOT_SIZE_SPECS: ShotSizeSpec[] = [
  { id: "EXTREME_WIDE", label: "Extreme Wide", short: "EWS", coverage: 5.5, aim: 0.42, description: "Subject inside the whole location." },
  { id: "WIDE", label: "Wide", short: "WS", coverage: 1.75, aim: 0.5, description: "Full body, room visible." },
  { id: "MEDIUM_WIDE", label: "Medium Wide", short: "MWS", coverage: 1.2, aim: 0.6, description: "Knees up." },
  { id: "MEDIUM", label: "Medium", short: "MS", coverage: 0.8, aim: 0.72, description: "Waist up." },
  { id: "MEDIUM_CLOSE", label: "Medium Close", short: "MCU", coverage: 0.52, aim: 0.83, description: "Chest up." },
  { id: "CLOSE_UP", label: "Close-Up", short: "CU", coverage: 0.34, aim: 0.9, description: "Head and shoulders." },
  { id: "EXTREME_CLOSE_UP", label: "Extreme Close-Up", short: "ECU", coverage: 0.17, aim: 0.94, description: "Eyes." },
];

export function getShotSizeSpec(id: ShotSize): ShotSizeSpec {
  return SHOT_SIZE_SPECS.find((s) => s.id === id) ?? SHOT_SIZE_SPECS[3];
}

export interface CameraHeightSpec {
  id: CameraHeight;
  label: string;
  /** Absolute metres, or a fraction of subject height when `relative`. */
  value: number;
  relative: boolean;
  description: string;
}

export const CAMERA_HEIGHT_SPECS: CameraHeightSpec[] = [
  { id: "GROUND", label: "Ground", value: 0.22, relative: false, description: "Looking up from the floor." },
  { id: "WAIST", label: "Waist", value: 0.55, relative: true, description: "Below the eyeline." },
  { id: "CHEST", label: "Chest", value: 0.74, relative: true, description: "Slightly low." },
  { id: "EYE", label: "Eye", value: 0.94, relative: true, description: "Neutral, level with the subject." },
  { id: "HIGH", label: "High", value: 1.35, relative: true, description: "Looking down." },
  { id: "OVERHEAD", label: "Overhead", value: 2.6, relative: true, description: "Directly above." },
];

export function getCameraHeightSpec(id: CameraHeight): CameraHeightSpec {
  return CAMERA_HEIGHT_SPECS.find((h) => h.id === id) ?? CAMERA_HEIGHT_SPECS[3];
}

export function resolveCameraHeight(id: CameraHeight, subjectHeight: number): number {
  const spec = getCameraHeightSpec(id);
  return spec.relative ? spec.value * subjectHeight : spec.value;
}

/** Distance from subject needed to frame `coverage` metres of vertical world. */
export function calculateShotDistance(
  shotSize: ShotSize,
  focalLength: number,
  subjectHeight: number,
): number {
  const spec = getShotSizeSpec(shotSize);
  const frameHeight = spec.coverage * subjectHeight;
  const halfFov = degToRad(verticalFovDeg(focalLength)) / 2;
  return clamp(frameHeight / 2 / Math.tan(halfFov), 0.25, 120);
}

/** Which shot size a given distance actually produces — used to keep the UI honest. */
export function shotSizeForDistance(
  distance: number,
  focalLength: number,
  subjectHeight: number,
): ShotSize {
  const halfFov = degToRad(verticalFovDeg(focalLength)) / 2;
  const frameHeight = 2 * distance * Math.tan(halfFov);
  const coverage = frameHeight / Math.max(subjectHeight, 0.1);
  let best = SHOT_SIZE_SPECS[0];
  let bestDelta = Infinity;
  for (const spec of SHOT_SIZE_SPECS) {
    const delta = Math.abs(Math.log(spec.coverage) - Math.log(coverage));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = spec;
    }
  }
  return best.id;
}

export interface Subject {
  position: Vec3;
  /** Standing height in metres — what shot sizes are measured against. */
  height: number;
  /**
   * Metres the framing centre drops below standing, e.g. because the subject is
   * seated. Coverage is unaffected: a seated head is the same size in frame.
   */
  aimDrop?: number;
  /** Facing in radians around Y — used to offer front/profile angles. */
  facing?: number;
}

export interface CameraPresetInput {
  shotSize: ShotSize;
  subject: Subject;
  focalLength: number;
  heightPreset?: CameraHeight;
  /** Horizontal angle to approach from, radians. Defaults to the subject's front. */
  azimuth?: number;
}

/**
 * The core "reposition the camera intelligently" operation: returns where the
 * camera has to stand to make the requested shot of this subject.
 */
export function calculateCameraForShotSize({
  shotSize,
  subject,
  focalLength,
  heightPreset = "EYE",
  azimuth,
}: CameraPresetInput): { position: Vec3; target: Vec3 } {
  const spec = getShotSizeSpec(shotSize);
  const distance = calculateShotDistance(shotSize, focalLength, subject.height);
  const angle = azimuth ?? (subject.facing ?? 0);
  const drop = subject.aimDrop ?? 0;

  const target: Vec3 = [
    subject.position[0],
    subject.position[1] + spec.aim * subject.height - drop,
    subject.position[2],
  ];

  if (heightPreset === "OVERHEAD") {
    const height = resolveCameraHeight("OVERHEAD", subject.height);
    return {
      position: v.round([
        subject.position[0] + Math.sin(angle) * distance * 0.25,
        Math.max(height, subject.position[1] + distance * 0.85),
        subject.position[2] + Math.cos(angle) * distance * 0.25,
      ]),
      target: v.round(target),
    };
  }

  // A seated subject lowers the camera with them: eye level means their eye level.
  const spec2 = getCameraHeightSpec(heightPreset);
  const cameraY =
    resolveCameraHeight(heightPreset, subject.height) +
    subject.position[1] -
    (spec2.relative ? drop : 0);
  // Keep the requested framing after the height offset eats into the distance.
  const verticalDelta = cameraY - target[1];
  const planar = Math.sqrt(Math.max(distance * distance - verticalDelta * verticalDelta, 0.09));

  return {
    position: v.round([
      subject.position[0] + Math.sin(angle) * planar,
      cameraY,
      subject.position[2] + Math.cos(angle) * planar,
    ]),
    target: v.round(target),
  };
}

/** Azimuth the camera currently sits at relative to a point, in radians. */
export function azimuthTo(from: Vec3, subject: Vec3): number {
  return Math.atan2(from[0] - subject[0], from[2] - subject[2]);
}

export interface LookAtTransform {
  position: Vec3;
  /** Euler XYZ in radians, matching three.js object rotation order. */
  rotation: Vec3;
  distance: number;
}

/** Where a camera at `position` must be rotated to hold `target` centre frame. */
export function calculateLookAtTransform(position: Vec3, target: Vec3): LookAtTransform {
  const d = v.sub(target, position);
  const planar = Math.hypot(d[0], d[2]);
  const yaw = Math.atan2(-d[0], -d[2]);
  const pitch = Math.atan2(d[1], planar);
  return { position, rotation: [pitch, yaw, 0], distance: v.length(d) };
}

/** True when the camera is close enough to a body that it would clip it. */
export function isCameraTooClose(camera: Vec3, subject: Vec3, subjectHeight: number): boolean {
  return v.planarDistance(camera, subject) < Math.max(0.28, subjectHeight * 0.16);
}

/**
 * Where a world point lands in the frame, as normalised coordinates:
 * x is -1 at the left edge and +1 at the right, y likewise bottom to top.
 * `behind` is true when the point is behind the camera, where x and y mean
 * nothing. This is what composition analysis is measured with.
 */
export function projectToFrame(
  camera: { position: Vec3; target: Vec3; focalLength: number },
  point: Vec3,
  aspect = 1.85,
): { x: number; y: number; behind: boolean; distance: number } {
  const forward = v.normalize(v.sub(camera.target, camera.position));
  // Right-handed basis with world up; a rolled camera does not change framing.
  const right = v.normalize([forward[2], 0, -forward[0]]);
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];

  const offset = v.sub(point, camera.position);
  const depth = offset[0] * forward[0] + offset[1] * forward[1] + offset[2] * forward[2];
  if (depth <= 0.001) return { x: 0, y: 0, behind: true, distance: Math.abs(depth) };

  const lateral = offset[0] * right[0] + offset[1] * right[1] + offset[2] * right[2];
  const vertical = offset[0] * up[0] + offset[1] * up[1] + offset[2] * up[2];

  const halfV = Math.tan(degToRad(verticalFovDeg(camera.focalLength)) / 2);
  const halfH = halfV * aspect;

  return {
    x: lateral / depth / halfH,
    y: vertical / depth / halfV,
    behind: false,
    distance: depth,
  };
}

/**
 * Which side of the line between two subjects the camera is standing on.
 * Crossing it between consecutive shots is the 180° rule violation (§28).
 */
export function sideOfLine(cameraPosition: Vec3, a: Vec3, b: Vec3): number {
  const line: [number, number] = [b[0] - a[0], b[2] - a[2]];
  const toCamera: [number, number] = [cameraPosition[0] - a[0], cameraPosition[2] - a[2]];
  const cross = line[0] * toCamera[1] - line[1] * toCamera[0];
  return Math.abs(cross) < 0.05 ? 0 : Math.sign(cross);
}

export function defaultCameraTransform(): CameraTransform {
  return {
    position: [3.2, 1.62, 3.6],
    target: [0, 1.1, 0],
    focalLength: 35,
    aperture: 2.8,
    dofEnabled: false,
    focusTargetId: null,
  };
}
