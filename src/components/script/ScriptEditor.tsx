"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import { ENVIRONMENTS } from "@/data/environments";
import { environmentForLocation, parseScript, type ParsedScene } from "@/lib/script/parse";
import { saveNow } from "@/features/persistence/save";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import type { SceneDoc } from "@/types";
import { ScriptPreview } from "./ScriptPreview";
import { Breakdown } from "./Breakdown";

const PLACEHOLDER = `INT. APARTMENT — NIGHT

Alex sits alone at the kitchen table.

His phone buzzes.

Alex looks at it.

His expression changes.

                    ALEX
              Hello?`;

/**
 * A screenplay editor only as far as it needs to go (§7): write in the left
 * pane, and the right pane tells you what the script contains — scenes, cast,
 * props — and offers to build the scenes for you.
 */
export function ScriptEditor() {
  const project = useProjectStore((s) => s.project);
  const patchProject = useProjectStore((s) => s.patchProject);
  const router = useRouter();
  const [mode, setMode] = useState<"WRITE" | "PREVIEW">("WRITE");
  const [busy, setBusy] = useState(false);

  const script = project?.script ?? "";
  const breakdown = useMemo(() => parseScript(script), [script]);

  if (!project) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  /** Which parsed scenes do not have a scene in the project yet. */
  const existing = new Set(
    project.scenes
      .filter((scene) => !scene.parentSceneId)
      .map((scene) => scene.name.trim().toLowerCase()),
  );
  const unbuilt = breakdown.scenes.filter(
    (scene) => !existing.has(sceneNameFor(scene).trim().toLowerCase()),
  );

  const buildScenes = async (candidates: ParsedScene[]) => {
    if (busy || candidates.length === 0) return;
    setBusy(true);
    try {
      if (useProjectStore.getState().saveStatus === "dirty") await saveNow();
      let last: SceneDoc | null = null;
      for (const candidate of candidates) {
        const response = await fetch(`/api/projects/${project.id}/scenes`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: sceneNameFor(candidate),
            location: candidate.location,
            timeOfDay: candidate.timeOfDay,
            environmentId: environmentForLocation(
              candidate.location,
              ENVIRONMENTS,
              candidate.interior,
            ),
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        const { scene } = (await response.json()) as { scene: SceneDoc };
        useProjectStore.getState().addScene(scene);
        last = scene;
      }
      if (last) {
        useSceneStore.getState().loadScene(last);
        router.push(`/studio/${project.id}/scenes`);
      }
    } catch (error) {
      console.error("Could not build scenes from the script", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-0 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-900 px-3">
          <SegmentedControl
            className="w-44"
            value={mode}
            onChange={setMode}
            options={[
              { value: "WRITE", label: "Write" },
              { value: "PREVIEW", label: "Screenplay" },
            ]}
          />
          <span className="slate">
            {breakdown.stats.pages.toFixed(1)} pages · ~{formatRuntime(breakdown.stats.pages)}
          </span>
          <span className="slate ml-auto text-fog-500">
            Sluglines like <span className="text-fog-300">INT. APARTMENT — NIGHT</span> become scenes
          </span>
        </div>

        {mode === "WRITE" ? (
          <textarea
            value={script}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            onChange={(event) => patchProject({ script: event.target.value })}
            className={cn(
              "min-h-0 flex-1 resize-none bg-ink-950 px-8 py-6 font-mono text-[13px] leading-[1.7]",
              "text-fog-100 outline-none placeholder:text-ink-600",
            )}
          />
        ) : (
          <ScriptPreview elements={breakdown.elements} />
        )}
      </div>

      <Breakdown
        breakdown={breakdown}
        unbuilt={unbuilt}
        busy={busy}
        onBuild={buildScenes}
        projectId={project.id}
      />
    </div>
  );
}

export function sceneNameFor(scene: ParsedScene): string {
  return scene.location || scene.heading;
}

/** A page of screenplay is about a minute on screen. */
function formatRuntime(pages: number): string {
  const seconds = Math.round(pages * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
