"use client";

import { create } from "zustand";
import type { CastMemberDoc, ProjectDoc, SceneDoc } from "@/types";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface ProjectState {
  project: ProjectDoc | null;
  activeSceneId: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  loadProject: (project: ProjectDoc) => void;
  setActiveScene: (sceneId: string) => void;
  patchProject: (patch: Partial<ProjectDoc>) => void;
  /** Mirrors an edited scene back into the project so lists stay in sync. */
  syncScene: (scene: SceneDoc) => void;
  addScene: (scene: SceneDoc) => void;
  removeScene: (sceneId: string) => void;
  addCastMember: (member: CastMemberDoc) => void;
  updateCastMember: (id: string, patch: Partial<CastMemberDoc>) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  activeSceneId: null,
  saveStatus: "idle",
  lastSavedAt: null,

  loadProject: (project) =>
    set((state) => ({
      project,
      activeSceneId:
        state.activeSceneId && project.scenes.some((s) => s.id === state.activeSceneId)
          ? state.activeSceneId
          : (project.scenes[0]?.id ?? null),
      saveStatus: "idle",
    })),

  setActiveScene: (sceneId) => set({ activeSceneId: sceneId }),

  patchProject: (patch) =>
    set((state) =>
      state.project ? { project: { ...state.project, ...patch }, saveStatus: "dirty" } : state,
    ),

  syncScene: (scene) =>
    set((state) => {
      if (!state.project) return state;
      const scenes = state.project.scenes.map((s) => (s.id === scene.id ? scene : s));
      return { project: { ...state.project, scenes } };
    }),

  addScene: (scene) =>
    set((state) =>
      state.project
        ? {
            project: { ...state.project, scenes: [...state.project.scenes, scene] },
            activeSceneId: scene.id,
          }
        : state,
    ),

  removeScene: (sceneId) =>
    set((state) => {
      if (!state.project) return state;
      const scenes = state.project.scenes
        .filter((s) => s.id !== sceneId)
        .map((s, i) => ({ ...s, index: i }));
      return {
        project: { ...state.project, scenes },
        activeSceneId: state.activeSceneId === sceneId ? (scenes[0]?.id ?? null) : state.activeSceneId,
      };
    }),

  addCastMember: (member) =>
    set((state) =>
      state.project
        ? { project: { ...state.project, cast: [...state.project.cast, member] }, saveStatus: "dirty" }
        : state,
    ),

  updateCastMember: (id, patch) =>
    set((state) => {
      if (!state.project) return state;
      const cast = state.project.cast.map((c) => (c.id === id ? { ...c, ...patch } : c));
      const scenes = state.project.scenes.map((scene) => ({
        ...scene,
        characters: scene.characters.map((c) =>
          c.characterId === id ? { ...c, ...("name" in patch ? { name: patch.name! } : {}) } : c,
        ),
      }));
      return { project: { ...state.project, cast, scenes }, saveStatus: "dirty" };
    }),

  setSaveStatus: (saveStatus) =>
    set((state) => ({
      saveStatus,
      lastSavedAt: saveStatus === "saved" ? Date.now() : state.lastSavedAt,
    })),
}));
