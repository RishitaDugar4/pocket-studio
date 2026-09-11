"use client";

import { useCallback, useEffect, useRef } from "react";
import { audioAt } from "@/lib/edit/sequence";
import { useTimelineStore } from "@/stores/timelineStore";
import type { ProjectDoc } from "@/types";

/** How far out of step a clip may drift before it is re-seeked. */
const DRIFT_TOLERANCE = 0.12;

/**
 * Keeps the sound in step with the cut (§24). One element per asset, told where
 * to be on every frame: scrubbing seeks, pausing pauses, and nothing sounds when
 * the playhead is outside its clip.
 */
export function AudioEngine({ project }: { project: ProjectDoc }) {
  const elements = useRef(new Map<string, HTMLAudioElement>());

  const register = useCallback((id: string, element: HTMLAudioElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  }, []);

  useEffect(() => {
    const pool = elements.current;
    let raf = 0;

    const tick = () => {
      const { currentTime, isPlaying } = useTimelineStore.getState();
      const sounding = audioAt(project, currentTime);
      const active = new Set<string>();

      for (const { item, offset } of sounding) {
        const id = item.audioAssetId;
        const audio = id ? pool.get(id) : undefined;
        if (!audio || !id) continue;
        active.add(id);

        if (Math.abs(audio.currentTime - offset) > DRIFT_TOLERANCE) {
          try {
            audio.currentTime = offset;
          } catch {
            // Seeking before metadata is ready throws; the next frame retries.
          }
        }
        if (isPlaying && audio.paused) void audio.play().catch(() => undefined);
        if (!isPlaying && !audio.paused) audio.pause();
      }

      for (const [id, audio] of pool) {
        if (!active.has(id) && !audio.paused) audio.pause();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const audio of pool.values()) audio.pause();
    };
  }, [project]);

  // Mounted, not detached: React owns their lifecycle and they are inspectable.
  return (
    <div hidden aria-hidden>
      {project.audio.map((asset) => (
        <audio
          key={asset.id}
          ref={(element) => register(asset.id, element)}
          src={asset.url}
          preload="auto"
          data-asset={asset.name}
        />
      ))}
    </div>
  );
}
