"use client";

import { useEffect } from "react";
import { captureShot } from "@/features/shots/captureShot";
import { resolveSequence } from "@/lib/edit/sequence";
import { useProjectStore } from "@/stores/projectStore";
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

/**
 * Shift+← / → steps between cuts. In the cutting room that means the clips of
 * the sequence; in the scene builder it means the shots taken of this scene.
 */
function jumpShot(backwards: boolean): void {
  const timeline = useTimelineStore.getState();
  const project = useProjectStore.getState().project;
  const scene = useSceneStore.getState().scene;
  if (!project) return;

  const merged = scene
    ? { ...project, scenes: project.scenes.map((s) => (s.id === scene.id ? scene : s)) }
    : project;

  const clips = resolveSequence(merged);
  const marks = clips.length
    ? clips.map((clip) => clip.start)
    : (scene?.shots ?? []).map((shot) => shot.sceneTime).sort((a, b) => a - b);
  if (marks.length === 0) return;

  const now = timeline.currentTime;
  const target = backwards
    ? [...marks].reverse().find((mark) => mark < now - 0.05)
    : marks.find((mark) => mark > now + 0.05);
  timeline.setTime(target ?? (backwards ? 0 : marks[marks.length - 1]));
}

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
        // A selected beat is the more specific target: remove it first.
        const beatId = useSelectionStore.getState().selectedBeatId;
        if (beatId) {
          event.preventDefault();
          useSceneStore.getState().removeBeat(beatId);
          useSelectionStore.getState().selectBeat(null);
          return;
        }
        const selection = useSelectionStore.getState().selection;
        if (selection) {
          event.preventDefault();
          useSceneStore.getState().deleteSelection(selection);
          useSelectionStore.getState().clear();
        }
        return;
      }

      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        void captureShot();
        return;
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        useViewportStore.getState().requestFrameSelected();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const back = event.key === "ArrowLeft";
        if (event.shiftKey) jumpShot(back);
        else timeline.setTime(timeline.currentTime + (back ? -FRAME : FRAME));
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
