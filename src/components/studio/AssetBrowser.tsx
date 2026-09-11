"use client";

import { useState } from "react";
import { CHARACTERS } from "@/data/characters";
import { ENVIRONMENTS, getEnvironment } from "@/data/environments";
import { LIGHTING_PRESET_LIST } from "@/data/lighting";
import { PROPS, PROP_CATEGORIES } from "@/data/props";
import { Tabs } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useViewportStore } from "@/stores/viewportStore";
import { dropAsset } from "@/components/viewport/Viewport";
import type { SceneDoc, Vec3 } from "@/types";

type AssetTab = "CAST" | "SETS" | "PROPS" | "LIGHT";

/**
 * The shelf the director pulls from. Everything here is one drag (or one click)
 * away from being in the scene — no import dialogs, no asset settings.
 */
export function AssetBrowser({ scene }: { scene: SceneDoc }) {
  const [tab, setTab] = useState<AssetTab>("CAST");

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-ink-800 bg-ink-900">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "CAST", label: "Cast" },
          { value: "SETS", label: "Sets" },
          { value: "PROPS", label: "Props" },
          { value: "LIGHT", label: "Light" },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "CAST" ? <CastTab scene={scene} /> : null}
        {tab === "SETS" ? <SetsTab scene={scene} /> : null}
        {tab === "PROPS" ? <PropsTab scene={scene} /> : null}
        {tab === "LIGHT" ? <LightTab scene={scene} /> : null}
      </div>
      <p className="border-t border-ink-800 px-3 py-2 text-[10px] leading-relaxed text-fog-400">
        Drag onto the set to place exactly, or click to drop it on an open mark.
      </p>
    </div>
  );
}

/** Next unoccupied standing mark in the current set. */
function openMark(scene: SceneDoc): Vec3 {
  const environment = getEnvironment(scene.environmentId);
  const taken = [...scene.characters, ...scene.props].map((o) => o.position);
  for (const mark of environment.marks) {
    if (!taken.some((p) => Math.hypot(p[0] - mark[0], p[2] - mark[2]) < 0.55)) return mark;
  }
  const angle = taken.length * 1.1;
  return [Math.sin(angle) * 1.6, 0, Math.cos(angle) * 1.6];
}

function AssetCard({
  title,
  subtitle,
  swatch,
  onClick,
  onDragStart,
  active,
}: {
  title: string;
  subtitle: string;
  swatch: React.ReactNode;
  onClick: () => void;
  onDragStart?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={() => useViewportStore.getState().setPendingAsset(null)}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded border px-2 py-1.5 text-left transition-colors duration-150",
        active
          ? "border-amber-dim bg-[#221d14]"
          : "border-ink-800 bg-ink-850 hover:border-ink-600 hover:bg-ink-800",
      )}
    >
      {swatch}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] text-fog-100">{title}</span>
        <span className="block truncate text-[10px] text-fog-400">{subtitle}</span>
      </span>
    </button>
  );
}

function CastTab({ scene }: { scene: SceneDoc }) {
  const select = useSelectionStore((s) => s.select);
  const selection = useSelectionStore((s) => s.selection);

  return (
    <div className="space-y-4 p-2.5">
      <section>
        <h3 className="slate mb-2">In this scene</h3>
        {scene.characters.length === 0 ? (
          <p className="rounded border border-dashed border-ink-700 px-2 py-3 text-[11px] leading-relaxed text-fog-400">
            No one is on set yet. Add an actor below, then block them.
          </p>
        ) : (
          <div className="space-y-1">
            {scene.characters.map((character) => (
              <AssetCard
                key={character.id}
                title={character.name}
                subtitle={character.animation.toLowerCase()}
                active={selection?.kind === "character" && selection.id === character.id}
                onClick={() => select("character", character.id)}
                swatch={
                  <span
                    className="h-7 w-7 shrink-0 rounded-sm border border-ink-700"
                    style={{ background: character.accentColor }}
                  />
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="slate mb-2">Casting</h3>
        <div className="space-y-1">
          {CHARACTERS.map((definition) => (
            <AssetCard
              key={definition.id}
              title={definition.name}
              subtitle={`${definition.build.height.toFixed(2)} m`}
              onDragStart={() =>
                useViewportStore
                  .getState()
                  .setPendingAsset({ kind: "character", definitionId: definition.id })
              }
              onClick={() =>
                dropAsset({ kind: "character", definitionId: definition.id }, openMark(scene))
              }
              swatch={
                <span className="grid h-7 w-7 shrink-0 place-items-end justify-center rounded-sm border border-ink-700 bg-ink-900 pb-0.5">
                  <span
                    className="w-1.5 rounded-sm"
                    style={{
                      height: `${(definition.build.height / 1.95) * 22}px`,
                      background: definition.build.clothing,
                    }}
                  />
                </span>
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SetsTab({ scene }: { scene: SceneDoc }) {
  const setEnvironment = useSceneStore((s) => s.setEnvironment);
  return (
    <div className="space-y-1.5 p-2.5">
      {ENVIRONMENTS.map((environment) => {
        const active = environment.id === scene.environmentId;
        return (
          <button
            key={environment.id}
            type="button"
            onClick={() => setEnvironment(environment.id)}
            className={cn(
              "w-full overflow-hidden rounded border text-left transition-colors duration-150",
              active ? "border-amber-dim" : "border-ink-800 hover:border-ink-600",
            )}
          >
            <span
              className="block h-16 w-full"
              style={{ background: environment.thumbnail }}
              aria-hidden
            />
            <span className="block px-2 py-1.5">
              <span className="flex items-center justify-between">
                <span className="text-[12px] text-fog-100">{environment.name}</span>
                {active ? <span className="slate text-amber-film">Current</span> : null}
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-fog-400">
                {environment.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PropsTab({ scene }: { scene: SceneDoc }) {
  const environment = getEnvironment(scene.environmentId);
  return (
    <div className="space-y-4 p-2.5">
      {PROP_CATEGORIES.map((category) => {
        const items = PROPS.filter((p) => p.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="slate mb-2">{category.replace("_", " ")}</h3>
            <div className="space-y-1">
              {items.map((prop) => (
                <AssetCard
                  key={prop.id}
                  title={prop.name}
                  subtitle={
                    environment.availableProps.includes(prop.id)
                      ? `suits ${environment.name.toLowerCase()}`
                      : `${prop.size[0].toFixed(2)} × ${prop.size[2].toFixed(2)} m`
                  }
                  onDragStart={() =>
                    useViewportStore
                      .getState()
                      .setPendingAsset({ kind: "prop", definitionId: prop.id })
                  }
                  onClick={() => dropAsset({ kind: "prop", definitionId: prop.id }, openMark(scene))}
                  swatch={
                    <span
                      className="h-7 w-7 shrink-0 rounded-sm border border-ink-700"
                      style={{ background: prop.thumbnail }}
                    />
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LightTab({ scene }: { scene: SceneDoc }) {
  const setLightingPreset = useSceneStore((s) => s.setLightingPreset);
  return (
    <div className="space-y-1.5 p-2.5">
      {LIGHTING_PRESET_LIST.map((preset) => {
        const active = preset.id === scene.lightingPreset;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => setLightingPreset(preset.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded border px-2 py-2 text-left transition-colors duration-150",
              active ? "border-amber-dim bg-[#221d14]" : "border-ink-800 hover:border-ink-600",
            )}
          >
            <span
              className="h-7 w-7 shrink-0 rounded-sm border border-ink-700"
              style={{
                background: `linear-gradient(140deg, ${preset.lights[0]?.color ?? "#fff"}, ${preset.backgroundColor})`,
              }}
            />
            <span className="min-w-0">
              <span className="block text-[12px] text-fog-100">{preset.name}</span>
              <span className="block truncate text-[10px] text-fog-400">{preset.description}</span>
            </span>
          </button>
        );
      })}
      <p className="pt-1 text-[10px] leading-relaxed text-fog-400">
        Switching a preset rebuilds the rig. Individual lights stay editable in the inspector.
      </p>
    </div>
  );
}
