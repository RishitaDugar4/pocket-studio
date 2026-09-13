"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Inputs";
import type { ProjectDoc } from "@/types";
import {
  ALL,
  CarryOverFields,
  NOTHING,
  carryOverSummary,
  nothingSelected,
  type CarryOver,
} from "./CarryOverFields";

export type { CarryOver };

export interface NewSceneRequest {
  name?: string;
  copyFrom?: string;
  include?: CarryOver;
}

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
  const [include, setInclude] = useState<CarryOver>(ALL);

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

  const source = project.scenes.find((scene) => scene.id === copyFrom);
  const summary = carryOverSummary(source, include);

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

      <CarryOverFields
        project={project}
        value={copyFrom}
        include={include}
        onChange={setCopyFrom}
        onIncludeChange={setInclude}
        emptyOptionLabel="Nothing — start from an empty set"
      />

      <p className="mt-1.5 text-[10px] leading-relaxed text-fog-400">
        {!source
          ? "An empty set with a default light rig and one camera."
          : nothingSelected(include)
            ? "Nothing carried over — the new scene starts empty."
            : `Starts with ${summary.join(", ")}. Blocking and shots stay with the scene they were made in.`}
      </p>

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
