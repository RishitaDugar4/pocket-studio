"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSceneStore } from "@/stores/sceneStore";
import type { ProjectDoc, SceneDoc } from "@/types";
import {
  ALL,
  CarryOverFields,
  NOTHING,
  carryOverSummary,
  nothingSelected,
  type CarryOver,
} from "./CarryOverFields";

/**
 * Bringing another scene's work into the scene you are already in (§8).
 *
 * The same choices as starting a new scene, but the consequences differ: a
 * scene has one set and one light rig, so those are replaced, while cast and
 * props join whatever is already here. Actors already on set are not brought in
 * twice. The whole thing is one undo away.
 */
export function ImportSceneMenu({
  project,
  scene,
  onClose,
}: {
  project: ProjectDoc;
  scene: SceneDoc;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const importFromScene = useSceneStore((s) => s.importFromScene);
  const [copyFrom, setCopyFrom] = useState(NOTHING);
  const [include, setInclude] = useState<CarryOver>(ALL);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const present = useMemo(
    () => new Set(scene.characters.map((c) => c.characterId)),
    [scene.characters],
  );
  const source = project.scenes.find((s) => s.id === copyFrom);
  const newCast = source
    ? source.characters.filter((c) => !present.has(c.characterId)).length
    : 0;
  const summary = carryOverSummary(source, include, newCast);
  const canApply = !!source && !nothingSelected(include);

  const apply = () => {
    if (!source || !canApply) return;
    const result = importFromScene(source, include);
    const parts = [
      result.set ? "set" : null,
      result.lighting ? "lighting" : null,
      result.cast ? `${result.cast} actor${result.cast === 1 ? "" : "s"}` : null,
      result.props ? `${result.props} prop${result.props === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    setDone(
      parts.length
        ? `Brought in ${parts.join(", ")}${result.skippedCast ? ` · ${result.skippedCast} already on set` : ""}.`
        : "Nothing to bring in.",
    );
  };

  return (
    <div
      ref={container}
      className="animate-fade absolute left-0 top-full z-30 mt-1 w-[292px] panel p-3 shadow-xl shadow-black/50"
    >
      <p className="slate mb-2.5">Bring into {scene.name}</p>

      <CarryOverFields
        project={project}
        value={copyFrom}
        include={include}
        onChange={(id) => {
          setCopyFrom(id);
          setDone(null);
        }}
        onIncludeChange={(next) => {
          setInclude(next);
          setDone(null);
        }}
        excludeSceneId={scene.id}
        emptyOptionLabel="Choose a scene…"
        alreadyPresentCastIds={present}
      />

      <p className="mt-1.5 text-[10px] leading-relaxed text-fog-400">
        {done
          ? done
          : !source
            ? "Take the set, the light rig, the cast or the props from any other scene."
            : nothingSelected(include)
              ? "Nothing selected."
              : `Adds ${summary.join(", ")}. The set and the light rig replace this scene's; cast and props join what is already here.`}
      </p>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          disabled={!canApply}
          onClick={apply}
        >
          {done ? "Bring in again" : "Bring in"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {done ? "Done" : "Cancel"}
        </Button>
      </div>

      {done ? (
        <p className="mt-2 border-t border-ink-800 pt-2 text-[10px] leading-relaxed text-fog-500">
          Not what you wanted? ⌘Z puts it back.
        </p>
      ) : null}
    </div>
  );
}
