"use client";

import { useFrame } from "@react-three/fiber";
import { useTimelineStore } from "@/stores/timelineStore";

/** Advances the timeline from inside the render loop so motion is frame-accurate. */
export function PlaybackClock() {
  useFrame((_, delta) => {
    const state = useTimelineStore.getState();
    if (state.isPlaying) state.advance(Math.min(delta, 0.1));
  });
  return null;
}
