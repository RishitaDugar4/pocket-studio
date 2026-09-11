"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToolButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { actionLabel, beatsFor, sceneDuration } from "@/lib/animation";
import { getMovementSpec } from "@/lib/cinematography";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { BlockingEventDoc, SceneDoc } from "@/types";

const MIN_BEAT = 0.25;

/**
 * The scene clock (§12, §14): the camera's move on one track, every actor's
 * blocking beats on their own. Scrub it and the set moves; that is the whole
 * point of blocking before you shoot.
 */
export function SceneTimeline({ scene }: { scene: SceneDoc }) {
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const toggle = useTimelineStore((s) => s.toggle);
  const stop = useTimelineStore((s) => s.stop);
  const loop = useTimelineStore((s) => s.loop);
  const setLoop = useTimelineStore((s) => s.setLoop);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setTime = useTimelineStore((s) => s.setTime);
  const duration = useTimelineStore((s) => s.duration);

  const selection = useSelectionStore((s) => s.selection);
  const selectedBeatId = useSelectionStore((s) => s.selectedBeatId);
  const captureBeat = useSceneStore((s) => s.captureBeat);

  const playheadRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);

  // The scene is exactly as long as its longest decision.
  const total = sceneDuration(scene);
  useEffect(() => setDuration(total), [total, setDuration]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { currentTime, duration: span } = useTimelineStore.getState();
      const ratio = Math.min(currentTime / Math.max(span, 0.001), 1);
      if (playheadRef.current) playheadRef.current.style.left = `${ratio * 100}%`;
      if (readoutRef.current) readoutRef.current.textContent = currentTime.toFixed(2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrubFromEvent = useCallback(
    (clientX: number) => {
      const lane = lanesRef.current;
      if (!lane) return;
      const rect = lane.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      setTime(ratio * duration);
    },
    [duration, setTime],
  );

  const selectedCharacter =
    selection?.kind === "character"
      ? scene.characters.find((c) => c.id === selection.id)
      : undefined;

  const addBeat = () => {
    if (!selectedCharacter) return;
    const time = useTimelineStore.getState().currentTime;
    const id = captureBeat(selectedCharacter.id, time);
    if (id) {
      useSelectionStore.getState().selectBeat(id);
      const beat = useSceneStore.getState().scene?.blockingEvents.find((b) => b.id === id);
      if (beat) useTimelineStore.getState().setTime(beat.endTime);
    }
  };

  const seconds = Math.max(Math.ceil(duration), 1);

  return (
    <div className="flex h-[188px] shrink-0 flex-col border-t border-ink-800 bg-ink-900">
      <div className="flex h-9 items-center gap-2 border-b border-ink-800 px-2">
        <ToolButton label={isPlaying ? "Pause (Space)" : "Play (Space)"} onClick={toggle} active={isPlaying}>
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
        <ToolButton label="Back to start" onClick={stop}>
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
            <rect x="2" y="1.5" width="1.6" height="9" />
            <path d="M10 1.5 L4.4 6 L10 10.5 Z" />
          </svg>
        </ToolButton>
        <ToolButton label="Loop" active={loop} onClick={() => setLoop(!loop)}>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
            <path d="M3 5 H9.5 A2.6 2.6 0 0 1 9.5 10 H3.4" />
            <path d="M4.8 3 L2.6 5 L4.8 7" />
          </svg>
        </ToolButton>

        <div className="numeric ml-1 text-[11px] text-fog-300">
          <span ref={readoutRef}>0.00</span>
          <span className="text-fog-400"> / {duration.toFixed(2)}s</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={addBeat}
            disabled={!selectedCharacter}
            title={
              selectedCharacter
                ? `Record where ${selectedCharacter.name} is at the playhead`
                : "Select an actor to block them"
            }
            className="slate rounded border border-ink-700 px-2 py-1 text-fog-300 transition-colors hover:border-ink-600 hover:text-amber-film disabled:opacity-35"
          >
            + Beat{selectedCharacter ? ` · ${selectedCharacter.name}` : ""}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-20 shrink-0 border-r border-ink-800">
          <div className="slate flex h-5 items-center px-2 text-fog-500">Time</div>
          <div className="slate flex h-7 items-center px-2">Camera</div>
          {scene.characters.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => useSelectionStore.getState().select("character", character.id)}
              className={cn(
                "flex h-7 w-full items-center gap-1.5 px-2 text-left transition-colors",
                selection?.kind === "character" && selection.id === character.id
                  ? "text-fog-100"
                  : "text-fog-400 hover:text-fog-200",
              )}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: character.accentColor }}
              />
              <span className="slate truncate">{character.name}</span>
            </button>
          ))}
        </div>

        <div
          ref={lanesRef}
          className="relative min-w-0 flex-1 overflow-y-auto"
          onPointerDown={(event) => {
            // Clicking empty timeline scrubs; beats stop propagation themselves.
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            scrubFromEvent(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) scrubFromEvent(event.clientX);
          }}
        >
          <div className="slate relative h-5 border-b border-ink-800">
            {Array.from({ length: seconds + 1 }, (_, i) => (
              <span
                key={i}
                className="absolute top-0 h-full border-l border-ink-800 pl-1 text-[9px] leading-5"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                {i}s
              </span>
            ))}
          </div>

          <div className="relative h-7 border-b border-ink-800/70 px-0">
            {camera ? (
              <div
                className={cn(
                  "absolute inset-y-1 left-0 flex items-center rounded-sm border px-2",
                  camera.movementType === "STATIC"
                    ? "border-ink-600 bg-ink-800"
                    : "border-amber-dim bg-[#2a2318]",
                )}
                style={{ width: `${Math.min((camera.movementDuration / duration) * 100, 100)}%` }}
              >
                <span className="slate truncate text-fog-300">
                  {getMovementSpec(camera.movementType).label}
                  {camera.movementType !== "STATIC"
                    ? ` · ${Math.round(camera.movementIntensity * 100)}%`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>

          {scene.characters.map((character) => (
            <BlockingLane
              key={character.id}
              character={character}
              beats={beatsFor(scene, character.id)}
              duration={duration}
              selectedBeatId={selectedBeatId}
            />
          ))}

          <div
            ref={playheadRef}
            className="pointer-events-none absolute top-0 z-10 h-full w-px bg-amber-film"
            style={{ left: "0%" }}
          >
            <span className="absolute -left-[3px] top-0 h-1.5 w-[7px] bg-amber-film" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockingLane({
  character,
  beats,
  duration,
  selectedBeatId,
}: {
  character: SceneDoc["characters"][number];
  beats: BlockingEventDoc[];
  duration: number;
  selectedBeatId: string | null;
}) {
  const laneRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={laneRef} className="relative h-7 border-b border-ink-800/70">
      {beats.length === 0 ? (
        <span className="slate pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-fog-500">
          no beats
        </span>
      ) : null}
      {beats.map((beat) => (
        <BeatBlock
          key={beat.id}
          beat={beat}
          character={character}
          duration={duration}
          laneRef={laneRef}
          selected={beat.id === selectedBeatId}
        />
      ))}
    </div>
  );
}

type DragMode = "move" | "resize" | null;

function BeatBlock({
  beat,
  character,
  duration,
  laneRef,
  selected,
}: {
  beat: BlockingEventDoc;
  character: SceneDoc["characters"][number];
  duration: number;
  laneRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
}) {
  const updateBeat = useSceneStore((s) => s.updateBeat);
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);
  const [drag, setDrag] = useState<DragMode>(null);
  const origin = useRef({ x: 0, start: 0, end: 0 });

  const left = (beat.startTime / duration) * 100;
  const width = Math.max(((beat.endTime - beat.startTime) / duration) * 100, 1.2);

  const secondsPerPixel = () => {
    const rect = laneRef.current?.getBoundingClientRect();
    return rect ? duration / rect.width : 0;
  };

  const select = () => {
    useSelectionStore.getState().select("character", character.id);
    useSelectionStore.getState().selectBeat(beat.id);
    // Park the playhead on the beat's end so what you see is what you edit.
    useTimelineStore.getState().setTime(beat.endTime);
  };

  function startDrag(mode: Exclude<DragMode, null>, event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    select();
    setDrag(mode);
    origin.current = { x: event.clientX, start: beat.startTime, end: beat.endTime };
    begin(mode === "resize" ? "Retime beat" : "Move beat");
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onDragBody(event: React.PointerEvent<HTMLElement>) {
    startDrag("move", event);
  }

  function onDragEdge(event: React.PointerEvent<HTMLElement>) {
    startDrag("resize", event);
  }

  const onMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag) return;
    const delta = (event.clientX - origin.current.x) * secondsPerPixel();
    if (drag === "move") {
      const span = origin.current.end - origin.current.start;
      const start = Math.max(origin.current.start + delta, 0);
      updateBeat(beat.id, { startTime: start, endTime: start + span }, true);
    } else {
      const endTime = Math.max(origin.current.end + delta, origin.current.start + MIN_BEAT);
      updateBeat(beat.id, { endTime }, true);
      useTimelineStore.getState().setTime(endTime);
    }
  };

  const stopDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag) return;
    setDrag(null);
    end();
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  const travels =
    Math.hypot(
      beat.endPosition[0] - beat.startPosition[0],
      beat.endPosition[2] - beat.startPosition[2],
    ) > 0.05;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onDragBody}
      onPointerMove={onMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") select();
      }}
      className={cn(
        "absolute inset-y-1 flex cursor-grab items-center overflow-hidden rounded-sm border pl-1.5 pr-2 transition-colors",
        selected
          ? "border-amber-film bg-[#33291a]"
          : "border-ink-600 bg-ink-800 hover:border-ink-500",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={`${actionLabel(beat.action)} · ${beat.startTime.toFixed(2)}s → ${beat.endTime.toFixed(2)}s`}
    >
      <span
        className="mr-1.5 h-3 w-[3px] shrink-0 rounded-full"
        style={{ background: character.accentColor }}
      />
      <span className="slate truncate text-fog-300">
        {actionLabel(beat.action)}
        {travels ? " →" : ""}
      </span>
      <span
        onPointerDown={onDragEdge}
        onPointerMove={onMove}
        onPointerUp={stopDrag}
        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-transparent hover:bg-amber-dim"
      />
    </div>
  );
}
