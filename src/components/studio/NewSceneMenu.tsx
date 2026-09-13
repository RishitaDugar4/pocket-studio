"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Select, TextInput } from "@/components/ui/Inputs";
import { getEnvironment } from "@/data/environments";
import { getLightingPreset } from "@/data/lighting";
import type { ProjectDoc, SceneDoc } from "@/types";

export interface CarryOver {
  set: boolean;
  lighting: boolean;
  cast: boolean;
  props: boolean;
}

export interface NewSceneRequest {
  name?: string;
  copyFrom?: string;
  include?: CarryOver;
}

const NOTHING = "";

/**
 * Starting the next scene (§8).
 *
 * Most scenes in a film are not a fresh start — they are the same room, the
 * same people, half an hour later. Rather than making the director dress the
 * set twice, the new scene can carry the set, the rig, the cast and the props
 * over from any scene that already exists.
 */
export function NewSceneMenu({
  project,
  currentSceneId,
  busy,
  onCreate,
  onClose,
}: {
  project: ProjectDoc;
  currentSceneId: string | null;
  busy: boolean;
  onCreate: (request: NewSceneRequest) => void;
  onClose: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState(currentSceneId ?? NOTHING);
  const [include, setInclude] = useState<CarryOver>({
    set: true,
    lighting: true,
    cast: true,
    props: true,
  });

  // Clicking away, or Escape, puts the menu back.
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

  /** Every scene in the film, alternatives included and labelled as such. */
  const options = useMemo(() => {
    const roots = project.scenes.filter((scene) => !scene.parentSceneId);
    const entries: Array<{ value: string; label: string }> = [];
    for (const root of roots) {
      const number = String(root.index + 1).padStart(2, "0");
      entries.push({ value: root.id, label: `Scene ${number} — ${root.name}` });
      for (const version of project.scenes.filter((s) => s.parentSceneId === root.id)) {
        entries.push({
          value: version.id,
          label: `Scene ${number} · ${version.versionLabel}`,
        });
      }
    }
    return [{ value: NOTHING, label: "Nothing — start from an empty set" }, ...entries];
  }, [project.scenes]);

  const source: SceneDoc | undefined = project.scenes.find((scene) => scene.id === copyFrom);
  const nothingChecked = !include.set && !include.lighting && !include.cast && !include.props;

  const summary = source
    ? [
        include.set ? getEnvironment(source.environmentId).name.toLowerCase() : null,
        include.lighting ? getLightingPreset(source.lightingPreset).name.toLowerCase() : null,
        include.cast && source.characters.length
          ? `${source.characters.length} actor${source.characters.length === 1 ? "" : "s"}`
          : null,
        include.props && source.props.length
          ? `${source.props.length} prop${source.props.length === 1 ? "" : "s"}`
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div
      ref={container}
      className="animate-fade absolute right-0 top-full z-30 mt-1 w-[292px] panel p-3 shadow-xl shadow-black/50"
    >
      <p className="slate mb-2.5">New scene</p>

      <label className="mb-2.5 block">
        <span className="mb-1 block text-[11px] text-fog-300">Name</span>
        <TextInput
          autoFocus
          value={name}
          placeholder={`Scene ${String(
            project.scenes.filter((s) => !s.parentSceneId).length + 1,
          ).padStart(2, "0")}`}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCreate({ name: name.trim() || undefined, copyFrom: copyFrom || undefined, include });
            }
          }}
        />
      </label>

      <label className="mb-2 block">
        <span className="mb-1 block text-[11px] text-fog-300">Carry over from</span>
        <Select value={copyFrom} onChange={setCopyFrom} options={options} />
      </label>

      {source ? (
        <>
          <div className="space-y-0.5 rounded border border-ink-800 bg-ink-900 px-2 py-1.5">
            <Checkbox
              label="Set — room, location and time of day"
              checked={include.set}
              onChange={(set) => setInclude((current) => ({ ...current, set }))}
            />
            <Checkbox
              label="Lighting — the rig, with your adjustments"
              checked={include.lighting}
              onChange={(lighting) => setInclude((current) => ({ ...current, lighting }))}
            />
            <Checkbox
              label={`Cast${source.characters.length ? ` — ${source.characters.map((c) => c.name).join(", ")}` : " — nobody on set"}`}
              checked={include.cast}
              onChange={(cast) => setInclude((current) => ({ ...current, cast }))}
            />
            <Checkbox
              label={`Props${source.props.length ? ` — ${source.props.length} in place` : " — none dressed"}`}
              checked={include.props}
              onChange={(props) => setInclude((current) => ({ ...current, props }))}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-fog-400">
            {nothingChecked
              ? "Nothing carried over — the new scene starts empty."
              : `Starts with ${summary.join(", ")}. Blocking and shots stay with the scene they were made in.`}
          </p>
        </>
      ) : (
        <p className="text-[10px] leading-relaxed text-fog-400">
          An empty set with a default light rig and one camera.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          disabled={busy}
          onClick={() =>
            onCreate({ name: name.trim() || undefined, copyFrom: copyFrom || undefined, include })
          }
        >
          {busy ? "Creating…" : "Create scene"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
