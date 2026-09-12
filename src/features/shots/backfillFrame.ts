"use client";

import { grabFrame } from "@/components/viewport/captureBridge";
import { saveNow } from "@/features/persistence/save";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";

/**
 * Gives a shot a storyboard card if it does not have one. Shots created by the
 * demo seed have no frame — there is no renderer on the server — so the first
 * time one is opened, the preview that is already on screen becomes its card.
 */
export async function backfillShotFrame(shotId: string): Promise<boolean> {
  const project = useProjectStore.getState().project;
  if (!project) return false;

  // A shot captured moments ago may not have reached the database yet — the
  // frame endpoint has nothing to hang the image on until it has.
  if (useProjectStore.getState().saveStatus === "dirty") await saveNow();

  const image = await grabFrame("preview");
  if (!image) return false;

  try {
    const response = await fetch(`/api/projects/${project.id}/shots/${shotId}/frame`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
    });
    // 404 means the shot is gone or not saved yet; neither is an error worth
    // shouting about, and the queue simply moves on.
    if (!response.ok) return false;
    const { frameUrl } = (await response.json()) as { frameUrl: string };
    // The shot may belong to a scene that is not the one being edited.
    const inActiveScene = useSceneStore.getState().scene?.shots.some((s) => s.id === shotId);
    if (inActiveScene) useSceneStore.getState().updateShot(shotId, { frameUrl }, true);
    else useProjectStore.getState().setShotFrame(shotId, frameUrl);
    return true;
  } catch (error) {
    console.error("Could not store the storyboard frame", error);
    return false;
  }
}
