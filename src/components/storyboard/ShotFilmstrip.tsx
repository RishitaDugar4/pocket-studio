"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/stores/projectStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { SceneDoc } from "@/types";
import { FrameBackfiller } from "./FrameBackfiller";
import { ShotCard } from "./ShotCard";

/**
 * Shots taken in this scene, right under the monitor. Appears with the first
 * capture, so the card visibly lands somewhere (§38).
 */
export function ShotFilmstrip({ scene }: { scene: SceneDoc }) {
  const selectedShotId = useSelectionStore((s) => s.selectedShotId);
  const selectShot = useSelectionStore((s) => s.selectShot);
  const project = useProjectStore((s) => s.project);
  const router = useRouter();

  if (scene.shots.length === 0) return null;

  // Shots seeded without a card (the demo film) develop one here too, so the
  // strip is never a row of grey boxes.
  const pendingFrames = scene.shots
    .filter((shot) => !shot.frameUrl)
    .map((shot) => ({ scene, shot }));

  return (
    <div className="flex h-[136px] shrink-0 items-stretch gap-2 border-t border-ink-800 bg-ink-900 px-2 py-2">
      <FrameBackfiller pending={pendingFrames} />
      <div className="flex w-20 shrink-0 flex-col justify-center gap-1">
        <span className="slate">Shots</span>
        <span className="numeric text-[10px] text-fog-400">
          {scene.shots.length} · {scene.shots.reduce((n, s) => n + s.duration, 0).toFixed(1)}s
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 justify-start px-0 text-[10px]"
          onClick={() => project && router.push(`/studio/${project.id}/storyboard`)}
        >
          Storyboard →
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-2 overflow-x-auto">
        {scene.shots.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            compact
            selected={shot.id === selectedShotId}
            onClick={() => {
              selectShot(shot.id);
              // Put the scene clock where the shot was taken so the set matches.
              useTimelineStore.getState().setTime(shot.sceneTime);
            }}
            onDoubleClick={() =>
              project && router.push(`/studio/${project.id}/storyboard?shot=${shot.id}`)
            }
          />
        ))}
      </div>
    </div>
  );
}
