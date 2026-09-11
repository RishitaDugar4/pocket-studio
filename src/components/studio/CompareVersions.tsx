"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LetterboxFrame } from "@/components/ui/LetterboxFrame";
import { ShotPreview } from "@/components/viewport/ShotPreview";
import { sceneDuration } from "@/lib/animation";
import { getMovementSpec, getShotSizeSpec } from "@/lib/cinematography";
import { sceneAsShot } from "@/lib/edit/sceneShot";
import { aspectValue, useViewportStore } from "@/stores/viewportStore";
import type { SceneDoc } from "@/types";

/**
 * Compare versions (§21): the same scene, its alternatives played one after the
 * other. Seeing them back to back is the whole point — the differences only
 * mean something in sequence.
 */
export function CompareVersions({
  versions,
  onClose,
}: {
  versions: SceneDoc[];
  onClose: () => void;
}) {
  const aspect = aspectValue(useViewportStore((s) => s.aspectId));
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = useRef(0);
  const raf = useRef(0);

  const takes = useMemo(
    () =>
      versions
        .map((scene) => ({ scene, shot: sceneAsShot(scene), duration: sceneDuration(scene) }))
        .filter((take): take is { scene: SceneDoc; shot: NonNullable<ReturnType<typeof sceneAsShot>>; duration: number } => !!take.shot),
    [versions],
  );

  const take = takes[index];

  useEffect(() => {
    if (!playing || !take) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - last.current) / 1000;
      last.current = now;
      setTime((current) => {
        const next = current + delta;
        if (next < take.duration) return next;
        // Roll straight into the next version, and loop at the end.
        setIndex((i) => (i + 1) % takes.length);
        return 0;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, take, takes.length]);

  if (!take) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ink-950/95 backdrop-blur-sm">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-ink-800 px-3">
        <span className="slate text-fog-300">Compare versions</span>
        <span className="text-[12px] text-fog-100">{take.scene.name}</span>
        <button
          type="button"
          onClick={onClose}
          className="slate ml-auto transition-colors hover:text-fog-100"
        >
          Close ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 p-5">
        <LetterboxFrame aspect={aspect} className="rounded border border-ink-800 bg-black">
          <ShotPreview
            key={take.scene.id}
            scene={take.scene}
            shot={take.shot}
            time={time}
            className="!absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-between p-3">
            <span className="slate rounded bg-ink-950/70 px-1.5 py-0.5 text-amber-film">
              {take.scene.versionLabel}
            </span>
            <span className="numeric rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] text-fog-200">
              {time.toFixed(1)} / {take.duration.toFixed(1)}s
            </span>
          </div>
        </LetterboxFrame>
      </div>

      <div className="shrink-0 border-t border-ink-800 px-3 py-2">
        <div className="mb-2 flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </Button>
          <span className="slate text-fog-500">
            Playing each version in turn — the same scene, directed differently.
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {takes.map((entry, i) => {
            const camera =
              entry.scene.cameras.find((c) => c.isActive) ?? entry.scene.cameras[0];
            return (
              <button
                key={entry.scene.id}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setTime(0);
                }}
                className={`rounded border px-2.5 py-2 text-left transition-colors ${
                  i === index ? "border-amber-film bg-[#221d14]" : "border-ink-700 hover:border-ink-500"
                }`}
              >
                <span className="slate block text-amber-dim">{entry.scene.versionLabel}</span>
                <span className="numeric mt-0.5 block text-[11px] text-fog-200">
                  {camera ? `${getShotSizeSpec(camera.shotSize).short} · ${Math.round(camera.focalLength)}mm` : "no camera"}
                  {camera && camera.movementType !== "STATIC"
                    ? ` · ${getMovementSpec(camera.movementType).label}`
                    : " · Static"}
                </span>
                <span className="slate mt-0.5 block text-fog-400">
                  {entry.duration.toFixed(1)}s · {entry.scene.characters.length} cast ·{" "}
                  {entry.scene.shots.length} shots
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
