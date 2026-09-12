"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { useSequenceStore } from "@/stores/sequenceStore";
import { AUDIO_TRACKS, type AudioTrack, type ProjectDoc } from "@/types";
import { AddSoundMenu } from "./AddSoundMenu";
import { AudioEngine } from "./AudioEngine";

const TRACK_LABELS: Record<AudioTrack, string> = {
  DIALOGUE: "Dialogue",
  AMBIENCE: "Ambience",
  SFX: "SFX",
  MUSIC: "Music",
};

/**
 * Sound against picture (§24). Three sources feed these tracks — the generated
 * library, the microphone, and files from the computer — and all of them end up
 * as the same kind of clip on the same clock as the cut.
 */
export function AudioTracks({ project, duration }: { project: ProjectDoc; duration: number }) {
  const [openTrack, setOpenTrack] = useState<AudioTrack | null>(null);
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
          open={openTrack === track}
          onToggle={() => setOpenTrack((current) => (current === track ? null : track))}
          onClose={() => setOpenTrack(null)}
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
  open,
  onToggle,
  onClose,
  onError,
}: {
  track: AudioTrack;
  project: ProjectDoc;
  duration: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onError: (message: string | null) => void;
}) {
  const lane = useRef<HTMLDivElement>(null);
  const moveAudioClip = useSequenceStore((s) => s.moveAudioClip);
  const removeClip = useSequenceStore((s) => s.remove);
  const assets = new Map(project.audio.map((asset) => [asset.id, asset]));
  const clips = project.timeline.filter((item) => item.track === track && item.audioAssetId);

  return (
    <div className="relative flex items-center gap-2 py-0.5">
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
              title={`${asset?.name ?? "Audio"} · ${clip.duration.toFixed(1)}s · double-click to remove`}
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
        onClick={onToggle}
        className={cn(
          "slate shrink-0 rounded border px-1.5 py-0.5 transition-colors",
          open
            ? "border-amber-dim bg-[#221d14] text-amber-film"
            : "border-ink-700 text-fog-400 hover:text-amber-film",
        )}
      >
        + Sound
      </button>

      {open ? (
        <AddSoundMenu
          projectId={project.id}
          track={track}
          onDone={onClose}
          onError={onError}
        />
      ) : null}
    </div>
  );
}
