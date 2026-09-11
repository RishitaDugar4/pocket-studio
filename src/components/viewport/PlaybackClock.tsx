"use client";

import { useFrame } from "@react-three/fiber";
import { stageClock } from "@/lib/animation";

/**
 * Publishes the set's scene time from inside the render loop, so blocking is
 * evaluated with the same value the camera is drawn with on that frame.
 */
export function StageClockDriver({ getSceneTime }: { getSceneTime: () => number }) {
  useFrame(() => {
    stageClock.sceneTime = getSceneTime();
  });
  return null;
}
