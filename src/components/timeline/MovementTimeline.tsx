"use client";

import { useEffect, useRef, useState } from "react";
import { ToolButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { getMovementSpec } from "@/lib/cinematography";
import { useTimelineStore } from "@/stores/timelineStore";
import type { SceneDoc } from "@/types";

/**
 * Transport for the camera-move preview. The playhead is driven from the render
 * loop, so it is read here with a subscription rather than a re-render per frame.
 */
export function MovementTimeline({ scene }: { scene: SceneDoc }) {
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const toggle = useTimelineStore((s) => s.toggle);
  const stop = useTimelineStore((s) => s.stop);
  const loop = useTimelineStore((s) => s.loop);
  const setLoop = useTimelineStore((s) => s.setLoop);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setTime = useTimelineStore((s) => s.setTime);
  const duration = useTimelineStore((s) => s.duration);

  const trackRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  // Keep the clock's duration in step with the camera's move.
  useEffect(() => {
    if (camera) setDuration(camera.movementDuration);
  }, [camera?.movementDuration, camera, setDuration]);

  // Playhead updates outside React so playback stays smooth.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { currentTime, duration: total } = useTimelineStore.getState();
      const ratio = Math.min(currentTime / Math.max(total, 0.001), 1);
      if (playheadRef.current) playheadRef.current.style.left = `${ratio * 100}%`;
      if (readoutRef.current) readoutRef.current.textContent = currentTime.toFixed(2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrubTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setTime(ratio * duration);
  };

  if (!camera) return null;
  const spec = getMovementSpec(camera.movementType);
  const seconds = Math.max(Math.ceil(duration), 1);

  return (
    <div className="flex h-24 shrink-0 flex-col border-t border-ink-800 bg-ink-900">
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
        <ToolButton label="Loop preview" active={loop} onClick={() => setLoop(!loop)}>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
            <path d="M3 5 H9.5 A2.6 2.6 0 0 1 9.5 10 H3.4" />
            <path d="M4.8 3 L2.6 5 L4.8 7" />
          </svg>
        </ToolButton>

        <div className="numeric ml-1 text-[11px] text-fog-300">
          <span ref={readoutRef}>0.00</span>
          <span className="text-fog-400"> / {duration.toFixed(2)}s</span>
        </div>

        <div className="slate ml-auto flex items-center gap-3">
          <span>{spec.label}</span>
          <span className="text-fog-300">{Math.round(camera.focalLength)}mm</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch px-2 py-2">
        <span className="slate w-14 shrink-0 self-center">Camera</span>
        <div
          ref={trackRef}
          onPointerDown={(event) => {
            setScrubbing(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            scrubTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (scrubbing) scrubTo(event.clientX);
          }}
          onPointerUp={(event) => {
            setScrubbing(false);
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          className="relative min-w-0 flex-1 cursor-ew-resize overflow-hidden rounded border border-ink-700 bg-ink-850"
        >
          {/* one tick per second */}
          {Array.from({ length: seconds }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 h-full w-px bg-ink-700"
              style={{ left: `${((i + 1) / duration) * 100}%` }}
            />
          ))}

          <div
            className={cn(
              "absolute inset-y-1 left-0 rounded-sm border px-2 py-0.5",
              camera.movementType === "STATIC"
                ? "border-ink-600 bg-ink-800"
                : "border-amber-dim bg-[#2a2318]",
            )}
            style={{ width: "100%" }}
          >
            <span className="slate text-fog-300">
              {spec.label}
              {camera.movementType !== "STATIC"
                ? ` · ${Math.round(camera.movementIntensity * 100)}%`
                : ""}
            </span>
          </div>

          <div
            ref={playheadRef}
            className="pointer-events-none absolute top-0 h-full w-px bg-amber-film"
            style={{ left: "0%" }}
          >
            <span className="absolute -left-[3px] top-0 h-1.5 w-[7px] bg-amber-film" />
          </div>
        </div>
      </div>
    </div>
  );
}
