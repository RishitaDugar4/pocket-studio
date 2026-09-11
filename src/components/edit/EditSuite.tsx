"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ToolButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Panel";
import { NumberScrub, Select } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import { ShotThumbnail } from "@/components/storyboard/ShotCard";
import { getShotSizeSpec } from "@/lib/cinematography";
import {
  formatTimecode,
  resolveSequence,
  sequenceDuration,
  type ResolvedClip,
} from "@/lib/edit/sequence";
import { usePlaybackClock } from "@/features/playback/usePlaybackClock";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSequenceStore } from "@/stores/sequenceStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { aspectValue, useViewportStore } from "@/stores/viewportStore";
import { TRANSITIONS, type TransitionType } from "@/types";
import { SequencePlayer } from "./SequencePlayer";
import { AudioTracks } from "./AudioTracks";

/** The cutting room (§22): viewer on top, the cut underneath. */
export function EditSuite() {
  const project = useProjectStore((s) => s.project);
  const activeScene = useSceneStore((s) => s.scene);
  const router = useRouter();
  const aspect = aspectValue(useViewportStore((s) => s.aspectId));
  usePlaybackClock();

  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const toggle = useTimelineStore((s) => s.toggle);
  const stop = useTimelineStore((s) => s.stop);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setTime = useTimelineStore((s) => s.setTime);
  const setLoop = useTimelineStore((s) => s.setLoop);

  const buildFromStoryboard = useSequenceStore((s) => s.buildFromStoryboard);

  // The edited scene lives in the scene store; merge it back for playback.
  const merged = useMemo(() => {
    if (!project) return null;
    if (!activeScene) return project;
    return {
      ...project,
      scenes: project.scenes.map((scene) =>
        scene.id === activeScene.id ? activeScene : scene,
      ),
    };
  }, [project, activeScene]);

  const clips = useMemo(() => (merged ? resolveSequence(merged) : []), [merged]);
  const duration = sequenceDuration(clips);
  const shotCount = merged?.scenes.reduce((n, scene) => n + scene.shots.length, 0) ?? 0;

  useEffect(() => {
    setLoop(false);
    setDuration(Math.max(duration, 0.5));
  }, [duration, setDuration, setLoop]);

  // Leaving the cutting room should not leave the clock running.
  useEffect(() => () => useTimelineStore.getState().stop(), []);

  if (!project || !merged) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  if (clips.length === 0) {
    return (
      <EmptyState
        title="Nothing in the cut yet"
        body={
          shotCount > 0
            ? "You have shots in the storyboard. Lay them into the timeline and start cutting."
            : "Capture some shots in the Scene Builder first — then assemble them here."
        }
        action={
          shotCount > 0 ? (
            <Button variant="primary" onClick={buildFromStoryboard}>
              Lay in {shotCount} shot{shotCount === 1 ? "" : "s"}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => router.push(`/studio/${project.id}/scenes`)}>
              Open Scene Builder →
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 bg-ink-950 p-5">
        <SequencePlayer clips={clips} aspect={aspect} />
      </div>

      <Transport
        clips={clips}
        duration={duration}
        isPlaying={isPlaying}
        onToggle={toggle}
        onStop={stop}
        onScrub={setTime}
      />

      <SequenceTrack clips={clips} duration={duration} />
      <AudioTracks project={merged} duration={duration} />
      <ClipInspector clips={clips} shotCount={shotCount} />
    </div>
  );
}

function Transport({
  clips,
  duration,
  isPlaying,
  onToggle,
  onStop,
  onScrub,
}: {
  clips: ResolvedClip[];
  duration: number;
  isPlaying: boolean;
  onToggle: () => void;
  onStop: () => void;
  onScrub: (time: number) => void;
}) {
  const readout = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { currentTime } = useTimelineStore.getState();
      if (readout.current) readout.current.textContent = formatTimecode(currentTime);
      if (progress.current) {
        progress.current.style.width = `${Math.min((currentTime / Math.max(duration, 0.001)) * 100, 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const scrub = (clientX: number) => {
    const rect = bar.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * duration);
  };

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-t border-ink-800 bg-ink-900 px-3">
      <ToolButton label={isPlaying ? "Pause (Space)" : "Play (Space)"} onClick={onToggle} active={isPlaying}>
        {isPlaying ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
            <rect x="2" y="1.5" width="3" height="9" />
            <rect x="7" y="1.5" width="3" height="9" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
            <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
          </svg>
        )}
      </ToolButton>
      <ToolButton label="Back to start" onClick={onStop}>
        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
          <rect x="2" y="1.5" width="1.6" height="9" />
          <path d="M10 1.5 L4.4 6 L10 10.5 Z" />
        </svg>
      </ToolButton>

      <span className="numeric text-[11px] text-fog-200">
        <span ref={readout}>00:00:00</span>
        <span className="text-fog-400"> / {formatTimecode(duration)}</span>
      </span>

      <div
        ref={bar}
        onPointerDown={(event) => {
          setScrubbing(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event.clientX);
        }}
        onPointerMove={(event) => scrubbing && scrub(event.clientX)}
        onPointerUp={(event) => {
          setScrubbing(false);
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        className="relative h-1.5 min-w-0 flex-1 cursor-ew-resize rounded-full bg-ink-700"
      >
        <div ref={progress} className="h-full rounded-full bg-amber-film" style={{ width: "0%" }} />
        {/* Cut marks, so the shape of the edit is visible in the scrubber. */}
        {clips.slice(1).map((clip) => (
          <span
            key={clip.item.id}
            className="absolute top-0 h-full w-px bg-ink-950"
            style={{ left: `${(clip.start / Math.max(duration, 0.001)) * 100}%` }}
          />
        ))}
      </div>

      <span className="slate shrink-0">
        {clips.length} shot{clips.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function SequenceTrack({ clips, duration }: { clips: ResolvedClip[]; duration: number }) {
  const selectedItemId = useSequenceStore((s) => s.selectedItemId);
  const select = useSequenceStore((s) => s.select);
  const reorder = useSequenceStore((s) => s.reorder);
  const [dragId, setDragId] = useState<string | null>(null);
  const playhead = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { currentTime } = useTimelineStore.getState();
      if (playhead.current) {
        playhead.current.style.left = `${Math.min((currentTime / Math.max(duration, 0.001)) * 100, 100)}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = clips.map((clip) => clip.item.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    reorder(ids);
    setDragId(null);
  };

  return (
    <div className="shrink-0 border-t border-ink-800 bg-ink-900 px-2 pb-2 pt-2">
      {/* The video lane shares the audio lanes' geometry, so a clip boundary and
          a sound cue line up on screen exactly as they do in time. */}
      <div className="flex items-center gap-2">
        <div className="w-[70px] shrink-0">
          <span className="slate block">Video</span>
          <span className="slate block text-fog-500">drag to sort</span>
        </div>
        <div className="relative h-14 min-w-0 flex-1">
          {clips.map((clip) => (
            <button
              key={clip.item.id}
              type="button"
              draggable
              onDragStart={() => setDragId(clip.item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(clip.item.id)}
              onClick={() => {
                select(clip.item.id);
                useTimelineStore.getState().setTime(clip.start);
              }}
              className={cn(
                "group absolute inset-y-0 overflow-hidden rounded border transition-colors",
                clip.item.id === selectedItemId
                  ? "border-amber-film"
                  : "border-ink-700 hover:border-ink-500",
              )}
              style={{
                left: `${(clip.start / Math.max(duration, 0.001)) * 100}%`,
                width: `${(clip.length / Math.max(duration, 0.001)) * 100}%`,
              }}
              title={`${clip.shot.name} · ${clip.length.toFixed(2)}s`}
            >
              <ShotThumbnail shot={clip.shot} className="h-full w-full" />
              <span className="slate absolute left-1 top-1 rounded bg-ink-950/75 px-1 text-fog-200">
                {String(clip.item.index + 1).padStart(2, "0")}
              </span>
              {clip.item.transition !== "CUT" ? (
                <span className="slate absolute bottom-1 left-1 rounded bg-ink-950/75 px-1 text-amber-film">
                  {clip.item.transition === "FADE" ? "FADE" : "DISS"}
                </span>
              ) : null}
              <span className="numeric absolute bottom-1 right-1 rounded bg-ink-950/75 px-1 text-[9px] text-fog-200">
                {clip.length.toFixed(1)}s
              </span>
            </button>
          ))}
          <div
            ref={playhead}
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-amber-film"
            style={{ left: "0%" }}
          />
        </div>
      </div>
    </div>
  );
}

function ClipInspector({ clips, shotCount }: { clips: ResolvedClip[]; shotCount: number }) {
  const selectedItemId = useSequenceStore((s) => s.selectedItemId);
  const trim = useSequenceStore((s) => s.trim);
  const setTransition = useSequenceStore((s) => s.setTransition);
  const duplicate = useSequenceStore((s) => s.duplicate);
  const remove = useSequenceStore((s) => s.remove);
  const buildFromStoryboard = useSequenceStore((s) => s.buildFromStoryboard);
  const clip = clips.find((c) => c.item.id === selectedItemId) ?? null;
  const unplaced = shotCount - clips.length;

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-t border-ink-800 bg-ink-900 px-3">
      {clip ? (
        <>
          <span className="slate w-14 shrink-0 truncate text-fog-300">
            {String(clip.item.index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[12px] text-fog-100">{clip.shot.name}</span>
          <span className="slate shrink-0">
            {getShotSizeSpec(clip.shot.shotSize).short} ·{" "}
            {Math.round(clip.shot.cameraState.focalLength)}mm
          </span>

          <label className="ml-2 flex items-center gap-1.5">
            <span className="slate">Trim in</span>
            <NumberScrub
              className="w-20"
              value={clip.item.trimIn}
              min={0}
              max={Math.max(clip.shot.duration - clip.item.trimOut - 0.1, 0)}
              step={0.02}
              precision={2}
              suffix="s"
              onChange={(trimIn) => trim(clip.item.id, { trimIn })}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="slate">Trim out</span>
            <NumberScrub
              className="w-20"
              value={clip.item.trimOut}
              min={0}
              max={Math.max(clip.shot.duration - clip.item.trimIn - 0.1, 0)}
              step={0.02}
              precision={2}
              suffix="s"
              onChange={(trimOut) => trim(clip.item.id, { trimOut })}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="slate">In on</span>
            <Select<TransitionType>
              className="w-28"
              value={clip.item.transition}
              onChange={(transition) => setTransition(clip.item.id, transition)}
              options={TRANSITIONS.map((t) => ({
                value: t,
                label: t.charAt(0) + t.slice(1).toLowerCase(),
              }))}
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => duplicate(clip.item.id)}>
              Duplicate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(clip.item.id)}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="slate text-fog-400">Select a clip to trim it or change its transition</span>
          {unplaced > 0 ? (
            <Button size="sm" variant="outline" className="ml-auto" onClick={buildFromStoryboard}>
              Lay in {unplaced} new shot{unplaced === 1 ? "" : "s"}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
