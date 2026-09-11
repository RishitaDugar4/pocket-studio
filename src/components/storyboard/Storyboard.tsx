"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Panel";
import { saveNow } from "@/features/persistence/save";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { SceneDoc } from "@/types";
import { FrameBackfiller } from "./FrameBackfiller";
import { ShotCard } from "./ShotCard";
import { ShotEditor } from "./ShotEditor";

/**
 * Every shot in the film, scene by scene (§19). Reorder by dragging, duplicate
 * to try an alternative, or open one to work on the framing.
 */
export function Storyboard() {
  const project = useProjectStore((s) => s.project);
  const activeScene = useSceneStore((s) => s.scene);
  const params = useSearchParams();
  const router = useRouter();
  const openShotId = params.get("shot");

  if (!project) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  // The edited scene lives in the scene store; the rest come from the project.
  const scenes = project.scenes.map((scene) =>
    activeScene && scene.id === activeScene.id ? activeScene : scene,
  );
  const total = scenes.reduce((n, scene) => n + scene.shots.length, 0);

  const openShot = openShotId
    ? scenes
        .flatMap((scene) => scene.shots.map((shot) => ({ scene, shot })))
        .find(({ shot }) => shot.id === openShotId)
    : undefined;

  if (openShot) {
    return (
      <ShotEditor
        scene={openShot.scene}
        shot={openShot.shot}
        onClose={() => router.push(`/studio/${project.id}/storyboard`)}
      />
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        title="Your storyboard is empty"
        body="Build your first shot in the Scene Builder: frame the camera, then press Capture Shot."
        action={
          <Button
            variant="primary"
            onClick={() => router.push(`/studio/${project.id}/scenes`)}
          >
            Open Scene Builder →
          </Button>
        }
      />
    );
  }

  const pendingFrames = scenes.flatMap((scene) =>
    scene.shots.filter((shot) => !shot.frameUrl).map((shot) => ({ scene, shot })),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <FrameBackfiller pending={pendingFrames} />
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-medium tracking-wide text-fog-100">Storyboard</h1>
            <p className="numeric mt-1 text-[11px] text-fog-400">
              {pendingFrames.length > 0 ? `developing ${pendingFrames.length} frames · ` : ""}
              {total} shot{total === 1 ? "" : "s"} ·{" "}
              {scenes
                .reduce((n, scene) => n + scene.shots.reduce((t, s) => t + s.duration, 0), 0)
                .toFixed(1)}
              s total
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/studio/${project.id}/scenes`)}>
            Scene Builder →
          </Button>
        </header>

        <div className="space-y-9">
          {scenes.map((scene) => (
            <SceneRow key={scene.id} scene={scene} projectId={project.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneRow({ scene, projectId }: { scene: SceneDoc; projectId: string }) {
  const router = useRouter();
  const selectedShotId = useSelectionStore((s) => s.selectedShotId);
  const selectShot = useSelectionStore((s) => s.selectShot);
  const [dragId, setDragId] = useState<string | null>(null);

  const isActiveScene = useSceneStore((s) => s.scene?.id) === scene.id;
  const reorderShots = useSceneStore((s) => s.reorderShots);
  const duplicateShot = useSceneStore((s) => s.duplicateShot);
  const removeShot = useSceneStore((s) => s.removeShot);

  const openScene = async () => {
    if (isActiveScene) return true;
    if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
    useSceneStore.getState().loadScene(scene);
    useTimelineStore.getState().stop();
    return true;
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    await openScene();
    const ids = scene.shots.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    reorderShots(ids);
    setDragId(null);
  };

  const selected = scene.shots.find((s) => s.id === selectedShotId);

  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2 className="slate text-fog-300">
          Scene {String(scene.index + 1).padStart(2, "0")}
        </h2>
        <span className="text-[12px] text-fog-100">{scene.name}</span>
        <span className="slate">{scene.location}</span>
        {selected ? (
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await openScene();
                const id = duplicateShot(selected.id);
                if (id) selectShot(id);
              }}
              className="slate text-fog-400 transition-colors hover:text-amber-film"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={async () => {
                await openScene();
                removeShot(selected.id);
                selectShot(null);
              }}
              className="slate text-fog-400 transition-colors hover:text-alert"
            >
              Delete
            </button>
          </span>
        ) : null}
      </div>

      {scene.shots.length === 0 ? (
        <p className="rounded border border-dashed border-ink-700 px-3 py-6 text-center text-[11px] text-fog-400">
          No shots captured in this scene yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {scene.shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              selected={shot.id === selectedShotId}
              draggable
              onDragStart={() => setDragId(shot.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(shot.id)}
              onClick={() => selectShot(shot.id)}
              onDoubleClick={async () => {
                await openScene();
                router.push(`/studio/${projectId}/storyboard?shot=${shot.id}`);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
