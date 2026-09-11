"use client";

import { useEffect } from "react";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useViewportStore } from "@/stores/viewportStore";
import type { TransformMode } from "@/types";

const TOOL_KEYS: Record<string, TransformMode> = {
  "1": "select",
  "2": "translate",
  "3": "rotate",
  "4": "scale",
};

/** One frame at 24fps — the unit a director thinks in. */
const FRAME = 1 / 24;

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

/** Keyboard map from §36. Only the parts that have something to act on yet. */
export function useStudioShortcuts({ enabled = true }: { enabled?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      const timeline = useTimelineStore.getState();

      if (event.code === "Space") {
        event.preventDefault();
        timeline.toggle();
        return;
      }

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) useSceneStore.getState().redo();
        else useSceneStore.getState().undo();
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "z" && !meta) {
        event.preventDefault();
        useSceneStore.getState().redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const selection = useSelectionStore.getState().selection;
        if (selection) {
          event.preventDefault();
          useSceneStore.getState().deleteSelection(selection);
          useSelectionStore.getState().clear();
        }
        return;
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        useViewportStore.getState().requestFrameSelected();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        timeline.setTime(timeline.currentTime - FRAME);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        timeline.setTime(timeline.currentTime + FRAME);
        return;
      }

      const tool = TOOL_KEYS[event.key];
      if (tool) {
        event.preventDefault();
        useViewportStore.getState().setMode("ORBIT");
        useViewportStore.getState().setTransformMode(tool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
