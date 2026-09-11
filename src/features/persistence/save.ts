"use client";

import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";

/**
 * Writes the project meta and the active scene immediately. Used by autosave and
 * by anything that is about to change what "the active scene" means.
 */
export async function saveNow(): Promise<void> {
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
