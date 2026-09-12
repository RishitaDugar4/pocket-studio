"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";

let active: Promise<void> | null = null;
let waiting: Promise<void> | null = null;

/**
 * Writes the project meta, the cut and the active scene immediately. Used by
 * autosave and by anything about to change what "the active scene" means.
 *
 * Saves are serialised. Two in flight at once each carry their own snapshot of
 * the scene, and the later one's "delete anything not in this list" would drop
 * rows the other had just created — a shot captured mid-save could lose its
 * storyboard frame that way. At most one save runs and one waits; extra callers
 * share the waiting one, because it will write whatever is current when it runs.
 */
export function saveNow(): Promise<void> {
  if (active === null) {
    active = performSave().finally(() => {
      active = null;
    });
    return active;
  }
  if (waiting === null) {
    waiting = active
      .catch(() => undefined)
      .then(() => {
        waiting = null;
        return saveNow();
      });
  }
  return waiting;
}

async function performSave(): Promise<void> {
  const { project, setSaveStatus } = useProjectStore.getState();
  const scene = useSceneStore.getState().scene;
  if (!project) return;

  setSaveStatus("saving");
  try {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: project.title,
        genre: project.genre,
        logline: project.logline,
        format: project.format,
        mood: project.mood,
        script: project.script,
      }),
    });

    await fetch(`/api/projects/${project.id}/timeline`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: project.timeline }),
    });

    if (scene) {
      const response = await fetch(`/api/projects/${project.id}/scenes/${scene.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene, cast: project.cast }),
      });
      if (!response.ok) throw new Error(await response.text());
    }

    if (useProjectStore.getState().saveStatus === "saving") setSaveStatus("saved");
  } catch (error) {
    console.error("Save failed", error);
    setSaveStatus("error");
  }
}
