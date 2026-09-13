"use client";

import { beatsFor } from "@/lib/animation";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { Selection, Vec3 } from "@/types";

export interface TransformPatch {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}

export function clampScale(value: number): number {
  return Math.min(Math.max(value, 0.4), 2.5);
}

/**
 * The one place a moved object is written back to the scene.
 *
 * Shared by the gizmo and by dragging an object's floor ring, so the two can
 * never disagree about what moving something means — in particular that moving
 * a blocked actor edits the beat you have selected, not where they start.
 */
export function applyObjectTransform(
  selection: Selection,
  patch: TransformPatch,
  transient = true,
): void {
  const store = useSceneStore.getState();

  if (selection.kind === "character") {
    const beatId = useSelectionStore.getState().selectedBeatId;
    const beats = store.scene ? beatsFor(store.scene, selection.id) : [];
    const beat = beats.find((b) => b.id === beatId);

    if (beat) {
      // Editing a beat moves where the actor ends up, not where they start.
      // The store decides whether that turns the beat into a walk.
      store.updateBeat(
        beat.id,
        {
          ...(patch.position ? { endPosition: patch.position } : {}),
          ...(patch.rotation ? { rotation: patch.rotation } : {}),
        },
        transient,
      );
    } else if (beats.length === 0 || useTimelineStore.getState().currentTime === 0) {
      // Characters keep a uniform scale: an actor is a person, not a prop.
      store.updateCharacter(
        selection.id,
        {
          ...(patch.position ? { position: patch.position } : {}),
          ...(patch.rotation ? { rotation: patch.rotation } : {}),
          ...(patch.scale !== undefined ? { scale: clampScale(patch.scale) } : {}),
        },
        transient,
      );
    }
    return;
  }

  if (selection.kind === "prop") {
    store.updateProp(
      selection.id,
      {
        ...(patch.position ? { position: patch.position } : {}),
        ...(patch.rotation ? { rotation: patch.rotation } : {}),
        ...(patch.scale !== undefined ? { scale: clampScale(patch.scale) } : {}),
      },
      transient,
    );
    return;
  }

  if (selection.kind === "light" && patch.position) {
    store.updateLight(selection.id, { position: patch.position }, transient);
    return;
  }

  if (selection.kind === "camera" && patch.position) {
    store.updateCamera(selection.id, { position: patch.position }, transient);
  }
}

/**
 * Whether moving this actor is currently possible. A blocked actor is driven by
 * their beats, so there is nothing sensible to write unless a beat is selected
 * or the playhead is back at the top of the scene.
 */
export function canMoveCharacter(characterId: string): boolean {
  const store = useSceneStore.getState();
  const beats = store.scene ? beatsFor(store.scene, characterId) : [];
  if (beats.length === 0) return true;
  const beatId = useSelectionStore.getState().selectedBeatId;
  if (beats.some((beat) => beat.id === beatId)) return true;
  return useTimelineStore.getState().currentTime === 0;
}
