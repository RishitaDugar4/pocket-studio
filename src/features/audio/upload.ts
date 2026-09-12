"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSequenceStore } from "@/stores/sequenceStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { AudioAssetDoc, AudioTrack } from "@/types";

/**
 * One path into the timeline for every source of sound — an uploaded file, a
 * microphone take, or a rendered library sound. They are all just a blob with a
 * name, so the rest of the app never has to care where it came from.
 */
export async function addSound({
  projectId,
  file,
  track,
  duration,
  startTime,
}: {
  projectId: string;
  file: File;
  track: AudioTrack;
  /** Known length, when the caller has one; otherwise it is measured. */
  duration?: number;
  /** Where to drop the clip. Defaults to the playhead. */
  startTime?: number;
}): Promise<AudioAssetDoc> {
  const length = duration ?? (await readDuration(file));

  const form = new FormData();
  form.set("file", file);
  form.set("kind", track);
  form.set("duration", String(length));

  const response = await fetch(`/api/projects/${projectId}/audio`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Upload failed.");
  }

  const { asset } = (await response.json()) as { asset: AudioAssetDoc };

  const project = useProjectStore.getState().project;
  if (project) {
    useProjectStore.getState().patchProject({ audio: [...project.audio, asset] });
  }
  useSequenceStore
    .getState()
    .addAudioClip(
      asset.id,
      track,
      startTime ?? useTimelineStore.getState().currentTime,
      asset.duration || length || 3,
    );

  return asset;
}

/** Reads a file's real length so the clip is laid in at the right width. */
export function readDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.addEventListener("loadedmetadata", () =>
      done(Number.isFinite(audio.duration) ? audio.duration : 0),
    );
    audio.addEventListener("error", () => done(0));
    audio.src = url;
  });
}
