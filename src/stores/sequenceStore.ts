"use client";

import { create } from "zustand";
import { newId } from "@/lib/db/defaults";
import { useProjectStore } from "./projectStore";
import type { AudioTrack, ProjectDoc, TimelineItemDoc, TransitionType } from "@/types";

/**
 * The cut (§22). Kept separate from the scene document: reordering the edit must
 * never disturb the storyboard, and vice versa.
 */
interface SequenceState {
  selectedItemId: string | null;
  select: (id: string | null) => void;

  /** Lays every captured shot into the timeline, in storyboard order. */
  buildFromStoryboard: () => void;
  addShot: (shotId: string, duration: number) => void;
  reorder: (orderedIds: string[]) => void;
  trim: (id: string, patch: { trimIn?: number; trimOut?: number }) => void;
  setTransition: (id: string, transition: TransitionType) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;

  addAudioClip: (audioAssetId: string, track: AudioTrack, startTime: number, duration: number) => void;
  moveAudioClip: (id: string, startTime: number) => void;
}

function writeTimeline(update: (items: TimelineItemDoc[], project: ProjectDoc) => TimelineItemDoc[]) {
  const { project, patchProject } = useProjectStore.getState();
  if (!project) return;
  const next = update([...project.timeline], project);
  patchProject({ timeline: reindex(next) });
}

/** Video clips carry a contiguous index; audio keeps its own ordering per track. */
function reindex(items: TimelineItemDoc[]): TimelineItemDoc[] {
  let video = 0;
  return items.map((item) =>
    item.track === "VIDEO" ? { ...item, index: video++ } : item,
  );
}

export const useSequenceStore = create<SequenceState>((set) => ({
  selectedItemId: null,
  select: (selectedItemId) => set({ selectedItemId }),

  buildFromStoryboard: () =>
    writeTimeline((items, project) => {
      const existing = new Set(
        items.filter((i) => i.track === "VIDEO").map((i) => i.shotId),
      );
      const additions: TimelineItemDoc[] = [];
      for (const scene of project.scenes) {
        for (const shot of scene.shots) {
          if (existing.has(shot.id)) continue;
          additions.push({
            id: newId("tli"),
            index: 0,
            track: "VIDEO",
            startTime: 0,
            duration: shot.duration,
            trimIn: 0,
            trimOut: 0,
            transition: "CUT",
            shotId: shot.id,
            audioAssetId: null,
          });
        }
      }
      return [...items, ...additions];
    }),

  addShot: (shotId, duration) =>
    writeTimeline((items) => [
      ...items,
      {
        id: newId("tli"),
        index: 0,
        track: "VIDEO",
        startTime: 0,
        duration,
        trimIn: 0,
        trimOut: 0,
        transition: "CUT",
        shotId,
        audioAssetId: null,
      },
    ]),

  reorder: (orderedIds) =>
    writeTimeline((items) => {
      const video = new Map(
        items.filter((i) => i.track === "VIDEO").map((item) => [item.id, item]),
      );
      const ordered = orderedIds
        .map((id) => video.get(id))
        .filter((item): item is TimelineItemDoc => !!item);
      if (ordered.length !== video.size) return items;
      return [...ordered, ...items.filter((i) => i.track !== "VIDEO")];
    }),

  trim: (id, patch) =>
    writeTimeline((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              trimIn: Math.max(patch.trimIn ?? item.trimIn, 0),
              trimOut: Math.max(patch.trimOut ?? item.trimOut, 0),
            }
          : item,
      ),
    ),

  setTransition: (id, transition) =>
    writeTimeline((items) =>
      items.map((item) => (item.id === id ? { ...item, transition } : item)),
    ),

  duplicate: (id) =>
    writeTimeline((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return items;
      const copy = { ...items[index], id: newId("tli") };
      const next = [...items];
      next.splice(index + 1, 0, copy);
      return next;
    }),

  remove: (id) => {
    writeTimeline((items) => items.filter((item) => item.id !== id));
    set({ selectedItemId: null });
  },

  addAudioClip: (audioAssetId, track, startTime, duration) =>
    writeTimeline((items) => [
      ...items,
      {
        id: newId("tli"),
        index: items.filter((i) => i.track === track).length,
        track,
        startTime,
        duration,
        trimIn: 0,
        trimOut: 0,
        transition: "CUT",
        shotId: null,
        audioAssetId,
      },
    ]),

  moveAudioClip: (id, startTime) =>
    writeTimeline((items) =>
      items.map((item) => (item.id === id ? { ...item, startTime: Math.max(startTime, 0) } : item)),
    ),
}));
