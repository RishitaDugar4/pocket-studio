"use client";

import { Tabs } from "@/components/ui/Inputs";
import { useSelectionStore } from "@/stores/selectionStore";
import { useViewportStore, type InspectorTab } from "@/stores/viewportStore";
import type { SceneDoc } from "@/types";
import { CameraEmptyState, CameraInspector } from "./CameraInspector";
import { LightingInspector } from "./LightingInspector";
import { ObjectInspector } from "./ObjectInspector";
import { SceneInspector } from "./SceneInspector";

const TABS: Array<{ value: InspectorTab; label: string }> = [
  { value: "OBJECT", label: "Object" },
  { value: "CAMERA", label: "Camera" },
  { value: "LIGHTING", label: "Light" },
  { value: "SCENE", label: "Scene" },
];

export function Inspector({ scene }: { scene: SceneDoc }) {
  const tab = useViewportStore((s) => s.inspectorTab);
  const setTab = useViewportStore((s) => s.setInspectorTab);
  const selection = useSelectionStore((s) => s.selection);
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-ink-800 bg-ink-900">
      <Tabs value={tab} onChange={setTab} tabs={TABS} />
      {tab === "OBJECT" ? <ObjectInspector scene={scene} selection={selection} /> : null}
      {tab === "CAMERA" ? (
        camera ? (
          <CameraInspector scene={scene} camera={camera} />
        ) : (
          <CameraEmptyState />
        )
      ) : null}
      {tab === "LIGHTING" ? <LightingInspector scene={scene} /> : null}
      {tab === "SCENE" ? <SceneInspector scene={scene} /> : null}
    </div>
  );
}
