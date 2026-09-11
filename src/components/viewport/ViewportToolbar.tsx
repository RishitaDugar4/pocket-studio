"use client";

import { useState } from "react";
import { ToolButton } from "@/components/ui/Button";
import { Checkbox, Select } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import { captureShot } from "@/features/shots/captureShot";
import { useSceneStore } from "@/stores/sceneStore";
import { ASPECT_RATIOS, useViewportStore } from "@/stores/viewportStore";
import type { GuideSettings, TransformMode } from "@/types";

const TOOLS: Array<{ mode: TransformMode; label: string; key: string; icon: React.ReactNode }> = [
  {
    mode: "select",
    label: "Select",
    key: "1",
    icon: (
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-current">
        <path d="M3 1.4 L11 7.2 L7.4 7.8 L9.6 11.6 L8.2 12.4 L6 8.6 L3.6 10.6 Z" />
      </svg>
    ),
  },
  {
    mode: "translate",
    label: "Move",
    key: "2",
    icon: (
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
        <path d="M7 1.5 V12.5 M1.5 7 H12.5" />
        <path d="M7 1.5 L5.4 3.2 M7 1.5 L8.6 3.2 M7 12.5 L5.4 10.8 M7 12.5 L8.6 10.8" />
        <path d="M1.5 7 L3.2 5.4 M1.5 7 L3.2 8.6 M12.5 7 L10.8 5.4 M12.5 7 L10.8 8.6" />
      </svg>
    ),
  },
  {
    mode: "rotate",
    label: "Rotate",
    key: "3",
    icon: (
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
        <path d="M11.6 5.6 A5 5 0 1 0 9.4 10.8" />
        <path d="M11.9 2.2 V5.9 H8.4" />
      </svg>
    ),
  },
  {
    mode: "scale",
    label: "Scale",
    key: "4",
    icon: (
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
        <path d="M2.5 11.5 L11.5 2.5" />
        <path d="M8 2.5 H11.5 V6" />
        <rect x="1.8" y="9.2" width="2.6" height="2.6" />
      </svg>
    ),
  },
];

const GUIDE_LABELS: Array<{ key: keyof GuideSettings; label: string }> = [
  { key: "thirds", label: "Rule of thirds" },
  { key: "center", label: "Centre" },
  { key: "golden", label: "Golden ratio" },
  { key: "horizon", label: "Horizon" },
  { key: "safeArea", label: "Safe areas" },
  { key: "eyeline", label: "Eyeline" },
];

export function ViewportToolbar() {
  const mode = useViewportStore((s) => s.mode);
  const setMode = useViewportStore((s) => s.setMode);
  const transformMode = useViewportStore((s) => s.transformMode);
  const setTransformMode = useViewportStore((s) => s.setTransformMode);
  const guides = useViewportStore((s) => s.guides);
  const toggleGuide = useViewportStore((s) => s.toggleGuide);
  const showGrid = useViewportStore((s) => s.showGrid);
  const setShowGrid = useViewportStore((s) => s.setShowGrid);
  const showHelpers = useViewportStore((s) => s.showHelpers);
  const setShowHelpers = useViewportStore((s) => s.setShowHelpers);
  const aspectId = useViewportStore((s) => s.aspectId);
  const setAspect = useViewportStore((s) => s.setAspect);

  const undo = useSceneStore((s) => s.undo);
  const redo = useSceneStore((s) => s.redo);
  const past = useSceneStore((s) => s.past.length);
  const future = useSceneStore((s) => s.future.length);

  const [guidesOpen, setGuidesOpen] = useState(false);
  const activeGuides = GUIDE_LABELS.filter((g) => guides[g.key]).length;

  return (
    <div className="relative z-10 flex h-10 shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900 px-2">
      {/* Set view vs. viewfinder */}
      <div className="flex rounded border border-ink-700 bg-ink-850 p-0.5">
        {(["ORBIT", "CAMERA"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "slate rounded-sm px-2.5 py-1 transition-colors duration-150",
              mode === value ? "bg-ink-600 text-fog-100" : "hover:text-fog-200",
            )}
          >
            {value === "ORBIT" ? "Set" : "Camera"}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-ink-700" />

      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => (
          <ToolButton
            key={tool.mode}
            label={`${tool.label} (${tool.key})`}
            active={transformMode === tool.mode && mode === "ORBIT"}
            disabled={mode === "CAMERA"}
            onClick={() => {
              setMode("ORBIT");
              setTransformMode(tool.mode);
            }}
            className={mode === "CAMERA" ? "opacity-40" : undefined}
          >
            {tool.icon}
          </ToolButton>
        ))}
      </div>

      <div className="h-5 w-px bg-ink-700" />

      <div className="flex items-center gap-0.5">
        <ToolButton label="Undo (⌘Z)" disabled={past === 0} onClick={undo} className={past === 0 ? "opacity-30" : undefined}>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
            <path d="M2.4 6.4 H8.2 A3.4 3.4 0 1 1 8.2 12.4 H5" />
            <path d="M4.8 3.6 L2.2 6.4 L4.8 9" />
          </svg>
        </ToolButton>
        <ToolButton label="Redo (⇧Z)" disabled={future === 0} onClick={redo} className={future === 0 ? "opacity-30" : undefined}>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-current" strokeWidth={1.2} fill="none">
            <path d="M11.6 6.4 H5.8 A3.4 3.4 0 1 0 5.8 12.4 H9" />
            <path d="M9.2 3.6 L11.8 6.4 L9.2 9" />
          </svg>
        </ToolButton>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => void captureShot()}
          title="Capture the current framing as a shot (K)"
          className="slate flex h-7 items-center gap-1.5 rounded border border-amber-dim bg-[#241f14] px-2.5 text-amber-film transition-colors hover:bg-[#2f2818]"
        >
          <svg viewBox="0 0 14 14" className="h-3 w-3 fill-current">
            <path d="M5 1.6 h4 l0.8 1.2 h2.2 a1 1 0 0 1 1 1 v7 a1 1 0 0 1 -1 1 h-10 a1 1 0 0 1 -1 -1 v-7 a1 1 0 0 1 1 -1 h2.2 Z M7 5.2 a2.6 2.6 0 1 0 0 5.2 a2.6 2.6 0 0 0 0 -5.2 Z" />
          </svg>
          Capture Shot
        </button>

        <div className="h-5 w-px bg-ink-700" />

        <button
          type="button"
          onClick={() => setGuidesOpen((open) => !open)}
          className={cn(
            "slate flex h-7 items-center gap-1.5 rounded border px-2 transition-colors",
            guidesOpen || activeGuides > 0
              ? "border-ink-600 bg-ink-850 text-fog-200"
              : "border-ink-700 text-fog-400 hover:text-fog-200",
          )}
        >
          Guides
          {activeGuides > 0 ? <span className="numeric text-amber-film">{activeGuides}</span> : null}
        </button>

        {guidesOpen ? (
          <div className="animate-fade absolute right-2 top-11 z-20 w-44 panel p-2 shadow-xl shadow-black/40">
            <div className="space-y-1">
              {GUIDE_LABELS.map((guide) => (
                <Checkbox
                  key={guide.key}
                  label={guide.label}
                  checked={guides[guide.key]}
                  onChange={() => toggleGuide(guide.key)}
                />
              ))}
            </div>
            <div className="mt-2 space-y-1 border-t border-ink-800 pt-2">
              <Checkbox label="Floor grid" checked={showGrid} onChange={setShowGrid} />
              <Checkbox label="Rig helpers" checked={showHelpers} onChange={setShowHelpers} />
            </div>
            <p className="mt-2 border-t border-ink-800 pt-2 text-[10px] leading-relaxed text-fog-400">
              Guides are overlays only — they never appear in an export.
            </p>
          </div>
        ) : null}

        <Select
          className="w-24"
          value={aspectId}
          onChange={setAspect}
          options={ASPECT_RATIOS.map((a) => ({ value: a.id, label: a.label }))}
        />
      </div>
    </div>
  );
}
