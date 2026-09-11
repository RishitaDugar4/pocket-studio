"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { useProjectStore } from "@/stores/projectStore";
import { useSequenceStore } from "@/stores/sequenceStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { AUDIO_TRACKS, type AudioAssetDoc, type AudioTrack, type ProjectDoc } from "@/types";
import { AudioEngine } from "./AudioEngine";

const TRACK_LABELS: Record<AudioTrack, string> = {
  DIALOGUE: "Dialogue",
  AMBIENCE: "Ambience",
  SFX: "SFX",
  MUSIC: "Music",
};

/**
 * Sound against picture (§24). Audio is uploaded by the director — Pocket Studio
 * does not ship a sound library — and laid against the same clock the cut runs on.
 */
export function AudioTracks({ project, duration }: { project: ProjectDoc; duration: number }) {
  const [busyTrack, setBusyTrack] = useState<AudioTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="shrink-0 border-t border-ink-800 bg-ink-900 px-2 py-2">
      <AudioEngine project={project} />
      {AUDIO_TRACKS.map((track) => (
        <TrackRow
          key={track}
          track={track}
          project={project}
          duration={duration}
          busy={busyTrack === track}
          onBusy={setBusyTrack}
          onError={setError}
        />
      ))}
      {error ? <p className="px-1 pt-1 text-[10px] text-alert">{error}</p> : null}
    </div>
  );
}

function TrackRow({
  track,
  project,
  duration,
  busy,
  onBusy,
  onError,
}: {
  track: AudioTrack;
  project: ProjectDoc;
  duration: number;
  busy: boolean;
  onBusy: (track: AudioTrack | null) => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const addAudioClip = useSequenceStore((s) => s.addAudioClip);
  const moveAudioClip = useSequenceStore((s) => s.moveAudioClip);
  const removeClip = useSequenceStore((s) => s.remove);
  const assets = new Map(project.audio.map((asset) => [asset.id, asset]));
  const clips = project.timeline.filter((item) => item.track === track && item.audioAssetId);

  const upload = async (file: File) => {
    onBusy(track);
    onError(null);
    try {
      const length = await readDuration(file);
      const form = new FormData();
      form.set("file", file);
      form.set("kind", track);
      form.set("duration", String(length));

      const response = await fetch(`/api/projects/${project.id}/audio`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Upload failed.");
      }
      const { asset } = (await response.json()) as { asset: AudioAssetDoc };

      // Register the asset locally, then drop it at the playhead.
      useProjectStore.getState().patchProject({ audio: [...project.audio, asset] });
      addAudioClip(
        asset.id,
        track,
        useTimelineStore.getState().currentTime,
        asset.duration || 3,
      );
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      onBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="slate w-[70px] shrink-0 truncate">{TRACK_LABELS[track]}</span>
      <div
        ref={lane}
        className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-sm border border-ink-800 bg-ink-850"
      >
        {clips.map((clip) => {
          const asset = clip.audioAssetId ? assets.get(clip.audioAssetId) : undefined;
          const left = (clip.startTime / Math.max(duration, 0.001)) * 100;
          const width = (clip.duration / Math.max(duration, 0.001)) * 100;
          return (
            <button
              key={clip.id}
              type="button"
              title={`${asset?.name ?? "Audio"} · double-click to remove`}
              onDoubleClick={() => removeClip(clip.id)}
              onPointerDown={(event) => {
                const rect = lane.current?.getBoundingClientRect();
                if (!rect) return;
                const grabOffset = event.clientX - (rect.left + (left / 100) * rect.width);
                event.currentTarget.setPointerCapture(event.pointerId);
                const move = (moveEvent: PointerEvent) => {
                  const ratio = (moveEvent.clientX - grabOffset - rect.left) / rect.width;
                  moveAudioClip(clip.id, Math.max(ratio * duration, 0));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
              className={cn(
                "absolute inset-y-0.5 cursor-grab overflow-hidden rounded-sm border border-lens/40 bg-[#1b2a30] px-1.5 text-left",
              )}
              style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
            >
              <span className="slate truncate text-lens">{asset?.name ?? "Audio"}</span>
            </button>
          );
        })}
        {clips.length === 0 ? (
          <span className="slate pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-fog-500">
            empty
          </span>
        ) : null}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="slate shrink-0 rounded border border-ink-700 px-1.5 py-0.5 text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
      >
        {busy ? "…" : "+ Sound"}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** Reads a file's real length so the clip is laid in at the right width. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.addEventListener("loadedmetadata", () => done(Number.isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener("error", () => done(0));
    audio.src = url;
  });
}
