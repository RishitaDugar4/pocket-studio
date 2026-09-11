"use client";

import { LIGHTING_PRESET_LIST, LIGHT_ROLE_LABELS } from "@/data/lighting";
import { ChipGrid, Slider, Switch } from "@/components/ui/Inputs";
import { Field, Row, Section } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import type { LightingPresetId, SceneDoc } from "@/types";

/** The whole rig at a glance — which lights are doing the work. */
export function LightingInspector({ scene }: { scene: SceneDoc }) {
  const setLightingPreset = useSceneStore((s) => s.setLightingPreset);
  const updateLight = useSceneStore((s) => s.updateLight);
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);
  const select = useSelectionStore((s) => s.select);
  const selection = useSelectionStore((s) => s.selection);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title="Preset">
        <ChipGrid<LightingPresetId>
          columns={2}
          value={scene.lightingPreset}
          onChange={setLightingPreset}
          options={LIGHTING_PRESET_LIST.map((p) => ({
            value: p.id,
            label: p.name,
            title: p.description,
          }))}
        />
      </Section>

      <Section title="Rig">
        {scene.lights.map((light) => {
          const active = selection?.kind === "light" && selection.id === light.id;
          return (
            <div
              key={light.id}
              className={cn(
                "rounded border px-2 py-2 transition-colors",
                active ? "border-amber-dim bg-[#221d14]" : "border-ink-800 bg-ink-900",
              )}
            >
              <Row className="justify-between">
                <button
                  type="button"
                  onClick={() => select("light", light.id)}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink-700"
                    style={{ background: light.enabled ? light.color : "#2e3237" }}
                  />
                  <span className="truncate text-[11px] text-fog-200">
                    {LIGHT_ROLE_LABELS[light.role]}
                  </span>
                </button>
                <Switch
                  checked={light.enabled}
                  label={`${LIGHT_ROLE_LABELS[light.role]} enabled`}
                  onChange={(enabled) => updateLight(light.id, { enabled })}
                />
              </Row>
              <div className="mt-2">
                <Field label="Intensity" hint={light.intensity.toFixed(2)}>
                  <Slider
                    value={light.intensity}
                    min={0}
                    max={5}
                    step={0.02}
                    onBegin={() => begin("Change intensity")}
                    onCommit={end}
                    onChange={(intensity) => updateLight(light.id, { intensity }, true)}
                  />
                </Field>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] leading-relaxed text-fog-400">
          Only the key casts shadows — one clear shadow reads better in previs than five.
        </p>
      </Section>
    </div>
  );
}
