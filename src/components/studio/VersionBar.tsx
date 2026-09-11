"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { saveNow } from "@/features/persistence/save";
import { sceneDuration } from "@/lib/animation";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { ProjectDoc, SceneDoc } from "@/types";

/** Root scenes are the film; anything with a parent is an alternative take. */
export function rootScenes(project: ProjectDoc): SceneDoc[] {
  return project.scenes.filter((scene) => !scene.parentSceneId);
}

export function versionsOf(project: ProjectDoc, scene: SceneDoc): SceneDoc[] {
  const rootId = scene.parentSceneId ?? scene.id;
  const root = project.scenes.find((s) => s.id === rootId);
  const alternatives = project.scenes.filter((s) => s.parentSceneId === rootId);
  return root ? [root, ...alternatives] : alternatives;
}

/**
 * The signature move (§21). An alternative is a full, independent copy of the
 * scene — same room, same cast, and from that moment on, its own decisions.
 */
export function VersionBar({
  scene,
  onCompare,
}: {
  scene: SceneDoc;
  onCompare: () => void;
}) {
  const project = useProjectStore((s) => s.project);
  const [busy, setBusy] = useState(false);
  if (!project) return null;

  const versions = versionsOf(project, scene);

  const switchTo = async (next: SceneDoc) => {
    if (next.id === scene.id) return;
    if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
    useSelectionStore.getState().clear();
    useTimelineStore.getState().stop();
    useSceneStore.getState().loadScene(next);
  };

  const createVersion = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
      const response = await fetch(
        `/api/projects/${project.id}/scenes/${scene.id}/versions`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      );
      if (!response.ok) throw new Error(await response.text());
      const { scene: created } = (await response.json()) as { scene: SceneDoc };
      useProjectStore.getState().addScene(created);
      useSceneStore.getState().loadScene(created);
      useSelectionStore.getState().clear();
    } catch (error) {
      console.error("Could not create a version", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-ink-800 bg-ink-950 px-3">
      <span className="slate shrink-0 text-fog-500">Versions</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => void switchTo(version)}
            title={`${version.versionLabel} · ${sceneDuration(version).toFixed(1)}s · ${version.shots.length} shots`}
            className={cn(
              "slate shrink-0 rounded border px-2 py-0.5 transition-colors duration-150",
              version.id === scene.id
                ? "border-amber-dim bg-[#221d14] text-amber-film"
                : "border-ink-700 text-fog-400 hover:text-fog-200",
            )}
          >
            {version.versionLabel}
          </button>
        ))}
        <button
          type="button"
          onClick={createVersion}
          disabled={busy}
          title="Copy this scene and take it somewhere else"
          className="slate shrink-0 rounded border border-dashed border-ink-600 px-2 py-0.5 text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
        >
          {busy ? "Copying…" : "+ Try another version"}
        </button>
      </div>
      {versions.length > 1 ? (
        <button
          type="button"
          onClick={onCompare}
          className="slate shrink-0 rounded border border-ink-700 px-2 py-0.5 text-fog-300 transition-colors hover:border-ink-600 hover:text-amber-film"
        >
          Compare {versions.length} →
        </button>
      ) : null}
    </div>
  );
}
