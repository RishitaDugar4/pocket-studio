"use client";

import { create } from "zustand";
import type { GuideSettings, TransformMode, ViewportMode } from "@/types";

export type InspectorTab = "OBJECT" | "CAMERA" | "LIGHTING" | "SCENE";

/** Frame aspect the director is composing for. */
export const ASPECT_RATIOS = [
  { id: "2.39", label: "2.39 : 1", value: 2.39 },
  { id: "1.85", label: "1.85 : 1", value: 1.85 },
  { id: "1.78", label: "16 : 9", value: 16 / 9 },
  { id: "1.33", label: "4 : 3", value: 4 / 3 },
  { id: "1.00", label: "1 : 1", value: 1 },
] as const;

interface ViewportState {
  mode: ViewportMode;
  transformMode: TransformMode;
  guides: GuideSettings;
  aspectId: (typeof ASPECT_RATIOS)[number]["id"];
  showGrid: boolean;
  showHelpers: boolean;
  inspectorTab: InspectorTab;
  /** Pulses the frame after a capture or a snap. */
  flashToken: number;
  /** Incremented by the F shortcut; the viewport frames the selection. */
  frameToken: number;
  /** Set while dragging an asset from the browser onto the viewport. */
  pendingAsset: { kind: "character" | "prop"; definitionId: string } | null;

  setMode: (mode: ViewportMode) => void;
  toggleMode: () => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleGuide: (guide: keyof GuideSettings) => void;
  setAspect: (id: (typeof ASPECT_RATIOS)[number]["id"]) => void;
  setShowGrid: (value: boolean) => void;
  setShowHelpers: (value: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  flash: () => void;
  requestFrameSelected: () => void;
  setPendingAsset: (asset: ViewportState["pendingAsset"]) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  mode: "ORBIT",
  // Select is the default tool: objects are moved by dragging the ring under
  // them, which is a floor-plan action and needs no gizmo in the way. The
  // axis gizmos are there when a move has to be constrained or vertical.
  transformMode: "select",
  guides: {
    thirds: true,
    center: false,
    golden: false,
    horizon: false,
    safeArea: false,
    eyeline: false,
  },
  aspectId: "1.85",
  showGrid: true,
  showHelpers: true,
  inspectorTab: "CAMERA",
  flashToken: 0,
  frameToken: 0,
  pendingAsset: null,

  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === "ORBIT" ? "CAMERA" : "ORBIT" })),
  setTransformMode: (transformMode) => set({ transformMode }),
  toggleGuide: (guide) => set((s) => ({ guides: { ...s.guides, [guide]: !s.guides[guide] } })),
  setAspect: (aspectId) => set({ aspectId }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowHelpers: (showHelpers) => set({ showHelpers }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  flash: () => set((s) => ({ flashToken: s.flashToken + 1 })),
  requestFrameSelected: () => set((s) => ({ frameToken: s.frameToken + 1 })),
  setPendingAsset: (pendingAsset) => set({ pendingAsset }),
}));

export function aspectValue(id: string): number {
  return ASPECT_RATIOS.find((a) => a.id === id)?.value ?? 1.85;
}
