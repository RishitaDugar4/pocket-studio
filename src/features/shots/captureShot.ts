"use client";

import { captureBridge, grabFrame } from "@/components/viewport/captureBridge";
import { saveNow } from "@/features/persistence/save";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useViewportStore } from "@/stores/viewportStore";

/**
 * Take a shot (§18). The camera state is frozen into the shot, the viewfinder
 * flashes, and the frame the camera was seeing becomes the storyboard card.
 */
export async function captureShot(): Promise<string | null> {
  const project = useProjectStore.getState().project;
  const scene = useSceneStore.getState().scene;
  if (!project || !scene) return null;
  // Nothing to capture unless the scene builder's viewport is on screen.
  if (!captureBridge.grabbers.has("viewport")) return null;

  const viewport = useViewportStore.getState();
  // Capture what the camera sees, not what the director happens to be looking
  // at — switching to the viewfinder first also makes the flash make sense.
  const wasOrbit = viewport.mode === "ORBIT";
  if (wasOrbit) viewport.setMode("CAMERA");
  useTimelineStore.getState().pause();

  const image = await grabFrame("viewport");

  const shotId = useSceneStore.getState().captureShot();
  if (!shotId) return null;
  useViewportStore.getState().flash();
  useSelectionStore.getState().selectShot(shotId);

  // The shot row has to exist before a frame can be attached to it.
  await saveNow();

  if (image) {
    try {
      const response = await fetch(`/api/projects/${project.id}/shots/${shotId}/frame`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (response.ok) {
        const { frameUrl } = (await response.json()) as { frameUrl: string };
        // Straight into the store: the storyboard card should not wait for a refetch.
        useSceneStore.getState().updateShot(shotId, { frameUrl }, true);
        useProjectStore.getState().setSaveStatus("saved");
      }
    } catch (error) {
      console.error("Could not store the storyboard frame", error);
    }
  }

  return shotId;
}
