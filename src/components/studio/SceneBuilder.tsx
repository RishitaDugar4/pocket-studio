"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/Panel";
import { Inspector } from "@/components/inspector/Inspector";
import { SceneTimeline } from "@/components/timeline/SceneTimeline";
import { AssetBrowser } from "@/components/studio/AssetBrowser";
import { ShotFilmstrip } from "@/components/storyboard/ShotFilmstrip";
import { CompareVersions } from "@/components/studio/CompareVersions";
import { NewSceneMenu, type NewSceneRequest } from "@/components/studio/NewSceneMenu";
import { VersionBar, rootScenes, versionsOf } from "@/components/studio/VersionBar";
import { Viewport } from "@/components/viewport/Viewport";
import { getEnvironment } from "@/data/environments";
import { saveNow } from "@/features/persistence/save";
import { usePlaybackClock } from "@/features/playback/usePlaybackClock";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { SceneDoc } from "@/types";

/**
 * The Scene Builder (§8): assets on the left, the monitor in the middle, the
 * inspector on the right, the clock underneath. Everything the director changes
 * shows up in the viewport on the same frame.
 */
export function SceneBuilder() {
  const project = useProjectStore((s) => s.project);
  const scene = useSceneStore((s) => s.scene);
  const [busy, setBusy] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [creating, setCreating] = useState(false);
  usePlaybackClock();

  // Scene previews loop; the cutting room does not, and it turns this off.
  useEffect(() => {
    useTimelineStore.getState().setLoop(true);
  }, []);

  // Keep the active scene id in step with what is actually loaded.
  useEffect(() => {
    if (scene) useProjectStore.getState().setActiveScene(scene.id);
  }, [scene?.id, scene]);

  const switchScene = async (next: SceneDoc) => {
    if (next.id === scene?.id) return;
    if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
    useSelectionStore.getState().clear();
    useTimelineStore.getState().stop();
    useSceneStore.getState().loadScene(next);
  };

  const createScene = async (request: NewSceneRequest = {}) => {
    if (!project || busy) return;
    setBusy(true);
    try {
      if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
      const response = await fetch(`/api/projects/${project.id}/scenes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const { scene: created } = (await response.json()) as { scene: SceneDoc };
      useProjectStore.getState().addScene(created);
      useSceneStore.getState().loadScene(created);
      useSelectionStore.getState().clear();
      useTimelineStore.getState().stop();
      setCreating(false);
    } finally {
      setBusy(false);
    }
  };

  if (!project) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  if (!scene) {
    return (
      <EmptyState
        title="No scenes yet"
        body="Every film starts with one scene."
        action={
          <Button variant="primary" onClick={() => void createScene()} disabled={busy}>
            + Create scene
          </Button>
        }
      />
    );
  }

  const environment = getEnvironment(scene.environmentId);

  return (
    <>
      {/* Desktop tool (§39) — the 3D editor is not offered on small screens. */}
      <div className="flex flex-1 items-center justify-center p-8 lg:hidden">
        <p className="max-w-xs text-center text-sm leading-relaxed text-fog-400">
          The Scene Builder needs a larger screen. Open Pocket Studio on a laptop or desktop to
          block a scene.
        </p>
      </div>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="relative flex h-10 shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900 px-3">
          <span className="slate shrink-0 text-fog-300">
            Scene {String(scene.index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[12px] text-fog-100">{scene.name}</span>
          {scene.parentSceneId ? (
            <span className="slate shrink-0 text-amber-film">{scene.versionLabel}</span>
          ) : null}
          <span className="slate shrink-0">
            {environment.name} · {scene.timeOfDay.toLowerCase()}
          </span>

          <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto">
            {rootScenes(project).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void switchScene(item)}
                title={item.name}
                className={cn(
                  "slate shrink-0 rounded border px-2 py-1 transition-colors duration-150",
                  item.id === scene.id || item.id === (scene.parentSceneId ?? "")
                    ? "border-amber-dim bg-[#221d14] text-amber-film"
                    : "border-ink-700 text-fog-400 hover:text-fog-200",
                )}
              >
                {String(item.index + 1).padStart(2, "0")}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreating((open) => !open)}
              disabled={busy}
              title="Add a scene, carrying over what you need"
              className={cn(
                "slate shrink-0 rounded border border-dashed px-2 py-1 transition-colors disabled:opacity-40",
                creating
                  ? "border-amber-dim bg-[#221d14] text-amber-film"
                  : "border-ink-600 text-fog-400 hover:text-amber-film",
              )}
            >
              + Scene
            </button>
          </div>

          {creating ? (
            <NewSceneMenu
              project={project}
              currentSceneId={scene.id}
              busy={busy}
              onCreate={(request) => void createScene(request)}
              onClose={() => setCreating(false)}
            />
          ) : null}
        </div>

        <VersionBar scene={scene} onCompare={() => setComparing(true)} />

        <div className="relative grid min-h-0 flex-1 grid-cols-[224px_minmax(0,1fr)_296px]">
          <AssetBrowser scene={scene} />
          <div className="flex min-h-0 flex-col">
            <Viewport scene={scene} />
            <ShotFilmstrip scene={scene} />
            <SceneTimeline scene={scene} />
          </div>
          <Inspector scene={scene} />

          {comparing ? (
            <CompareVersions
              versions={versionsOf(project, scene)}
              onClose={() => setComparing(false)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
