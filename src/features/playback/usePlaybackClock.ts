"use client";

import { useEffect } from "react";
import { useTimelineStore } from "@/stores/timelineStore";

/**
 * Advances the playback clock in real time. Lives outside the 3D canvas so the
 * scene builder, the cutting room and (later) export all run on one clock —
 * whichever of them happens to be mounted.
 */
export function usePlaybackClock() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      const state = useTimelineStore.getState();
      // Cap the step so a backgrounded tab does not jump the playhead.
      if (state.isPlaying) state.advance(Math.min(delta, 0.1));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
