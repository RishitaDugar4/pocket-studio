"use client";

import { useMemo } from "react";
import { Checkbox, Select } from "@/components/ui/Inputs";
import { getEnvironment } from "@/data/environments";
import { getLightingPreset } from "@/data/lighting";
import type { ProjectDoc, SceneDoc } from "@/types";

export interface CarryOver {
  set: boolean;
  lighting: boolean;
  cast: boolean;
  props: boolean;
}

export const NOTHING = "";

export const ALL: CarryOver = { set: true, lighting: true, cast: true, props: true };

/**
 * Picking a scene to take things from, and choosing what to take.
 *
 * Shared by "+ Scene" and "Bring in", so the two can never drift apart — the
 * only difference between them is the verb, which the caller supplies.
 */
export function CarryOverFields({
  project,
  value,
  include,
  onChange,
  onIncludeChange,
  /** Scenes that cannot be a source — a scene cannot import from itself. */
  excludeSceneId,
  emptyOptionLabel,
  /** Name of each actor already on set, so they can be reported as skipped. */
  alreadyPresentCastIds,
}: {
  project: ProjectDoc;
  value: string;
  include: CarryOver;
  onChange: (sceneId: string) => void;
  onIncludeChange: (include: CarryOver) => void;
  excludeSceneId?: string;
  emptyOptionLabel: string;
  alreadyPresentCastIds?: Set<string>;
}) {
  const options = useMemo(() => {
    const roots = project.scenes.filter((scene) => !scene.parentSceneId);
    const entries: Array<{ value: string; label: string }> = [];
    for (const root of roots) {
      const number = String(root.index + 1).padStart(2, "0");
      if (root.id !== excludeSceneId) {
        entries.push({ value: root.id, label: `Scene ${number} — ${root.name}` });
      }
      for (const version of project.scenes.filter((s) => s.parentSceneId === root.id)) {
        if (version.id === excludeSceneId) continue;
        entries.push({ value: version.id, label: `Scene ${number} · ${version.versionLabel}` });
      }
    }
    return [{ value: NOTHING, label: emptyOptionLabel }, ...entries];
  }, [project.scenes, excludeSceneId, emptyOptionLabel]);

  const source = project.scenes.find((scene) => scene.id === value);
  const newCast = source
    ? source.characters.filter((c) => !alreadyPresentCastIds?.has(c.characterId))
    : [];

  return (
    <>
      <label className="mb-2 block">
        <span className="mb-1 block text-[11px] text-fog-300">Carry over from</span>
        <Select value={value} onChange={onChange} options={options} />
      </label>

      {source ? (
        <div className="space-y-0.5 rounded border border-ink-800 bg-ink-900 px-2 py-1.5">
          <Checkbox
            label="Set — room, location and time of day"
            checked={include.set}
            onChange={(set) => onIncludeChange({ ...include, set })}
          />
          <Checkbox
            label="Lighting — the rig, with your adjustments"
            checked={include.lighting}
            onChange={(lighting) => onIncludeChange({ ...include, lighting })}
          />
          <Checkbox
            label={castLabel(source, newCast, alreadyPresentCastIds)}
            checked={include.cast}
            onChange={(cast) => onIncludeChange({ ...include, cast })}
          />
          <Checkbox
            label={`Props${source.props.length ? ` — ${source.props.length} in place` : " — none dressed"}`}
            checked={include.props}
            onChange={(props) => onIncludeChange({ ...include, props })}
          />
        </div>
      ) : null}
    </>
  );
}

function castLabel(
  source: SceneDoc,
  newCast: SceneDoc["characters"],
  alreadyPresent?: Set<string>,
): string {
  if (source.characters.length === 0) return "Cast — nobody on set";
  if (!alreadyPresent) return `Cast — ${source.characters.map((c) => c.name).join(", ")}`;
  if (newCast.length === 0) {
    return `Cast — ${source.characters.map((c) => c.name).join(", ")} (already here)`;
  }
  const skipped = source.characters.length - newCast.length;
  return `Cast — ${newCast.map((c) => c.name).join(", ")}${skipped ? ` (${skipped} already here)` : ""}`;
}

/** Plain-language summary of what a carry-over will actually do. */
export function carryOverSummary(
  source: SceneDoc | undefined,
  include: CarryOver,
  newCastCount?: number,
): string[] {
  if (!source) return [];
  const cast = newCastCount ?? source.characters.length;
  return [
    include.set ? getEnvironment(source.environmentId).name.toLowerCase() : null,
    include.lighting ? getLightingPreset(source.lightingPreset).name.toLowerCase() : null,
    include.cast && cast ? `${cast} actor${cast === 1 ? "" : "s"}` : null,
    include.props && source.props.length
      ? `${source.props.length} prop${source.props.length === 1 ? "" : "s"}`
      : null,
  ].filter((entry): entry is string => entry !== null);
}

export function nothingSelected(include: CarryOver): boolean {
  return !include.set && !include.lighting && !include.cast && !include.props;
}
