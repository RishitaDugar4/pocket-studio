import { clamp, radToDeg } from "./vec";

/** Full-frame sensor. Focal-length numbers then mean what a director expects. */
export const SENSOR_WIDTH_MM = 36;
export const SENSOR_HEIGHT_MM = 24;
/** Acceptable circle of confusion for a full-frame negative. */
const COC_MM = 0.03;

export function verticalFovDeg(focalLength: number): number {
  const f = clamp(focalLength, 8, 400);
  return radToDeg(2 * Math.atan(SENSOR_HEIGHT_MM / 2 / f));
}

export function horizontalFovDeg(focalLength: number): number {
  const f = clamp(focalLength, 8, 400);
  return radToDeg(2 * Math.atan(SENSOR_WIDTH_MM / 2 / f));
}

export function focalLengthFromVerticalFov(fovDeg: number): number {
  const rad = (fovDeg * Math.PI) / 180;
  return SENSOR_HEIGHT_MM / 2 / Math.tan(rad / 2);
}

export interface DepthOfField {
  /** Metres from camera. */
  focusDistance: number;
  nearLimit: number;
  /** Infinity is reported as null so the UI can say so. */
  farLimit: number | null;
  totalDepth: number | null;
  hyperfocal: number;
}

/**
 * Standard thin-lens depth of field. The viewport approximates the look; this
 * function exists so the numbers shown to the director are honest.
 */
export function calculateDepthOfField(
  focalLength: number,
  aperture: number,
  focusDistance: number,
): DepthOfField {
  const f = clamp(focalLength, 8, 400);
  const N = clamp(aperture, 0.7, 32);
  const s = Math.max(focusDistance, 0.1) * 1000; // mm
  const hyperfocalMm = (f * f) / (N * COC_MM) + f;

  const nearMm = (s * (hyperfocalMm - f)) / (hyperfocalMm + s - 2 * f);
  const denom = hyperfocalMm - s;
  const farMm = denom <= 0 ? Infinity : (s * (hyperfocalMm - f)) / denom;

  const near = Math.max(nearMm / 1000, 0.01);
  const far = farMm === Infinity ? null : farMm / 1000;
  return {
    focusDistance: Math.max(focusDistance, 0.1),
    nearLimit: near,
    farLimit: far,
    totalDepth: far === null ? null : Math.max(far - near, 0),
    hyperfocal: hyperfocalMm / 1000,
  };
}

/**
 * How strongly the viewport should blur, on the effect's own scale. Driven by
 * the real f/N ratio so the ordering is always right, then capped: the point is
 * to show the director that they chose a shallow lens, not to render mush.
 */
export function bokehStrength(focalLength: number, aperture: number, focusDistance: number): number {
  const f = clamp(focalLength, 8, 400);
  const N = clamp(aperture, 0.7, 32);
  const s = Math.max(focusDistance, 0.4);
  return clamp(1.4 + (f / N) / 18 + 0.6 / s, 1.4, 6);
}

export const LENS_LABELS: Record<number, string> = {
  16: "Very wide",
  24: "Wide",
  35: "Natural wide",
  50: "Normal",
  85: "Portrait",
  135: "Long",
};
