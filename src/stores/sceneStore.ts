"use client";

import { create } from "zustand";
import { getEnvironment } from "@/data/environments";
import { getCharacterDefinition } from "@/data/characters";
import { getPropDefinition } from "@/data/props";
import { lightsForPreset, newId } from "@/lib/db/defaults";
import { CAST_COLORS_SERVER as CAST_COLORS } from "@/lib/db/castColors";
import { useProjectStore } from "./projectStore";
import type {
  CameraDoc,
  CharacterAnimation,
  LightDoc,
  LightingPresetId,
  SceneCharacterDoc,
  SceneDoc,
  ScenePropDoc,
  Selection,
  Vec3,
} from "@/types";

const HISTORY_LIMIT = 60;

interface HistoryEntry {
  label: string;
  scene: SceneDoc;
}

interface SceneState {
  scene: SceneDoc | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Snapshot held while a drag is in progress, committed on release. */
  pending: HistoryEntry | null;

  loadScene: (scene: SceneDoc) => void;

  /** Wrap a continuous interaction (gizmo drag, slider scrub) in one undo step. */
  beginInteraction: (label: string) => void;
  endInteraction: () => void;

  patchScene: (patch: Partial<Pick<SceneDoc, "name" | "location" | "timeOfDay" | "notes" | "versionLabel">>) => void;
  setEnvironment: (environmentId: string) => void;
  setLightingPreset: (presetId: LightingPresetId) => void;

  addCharacter: (input: { definitionId: string; name?: string; position?: Vec3 }) => string;
  updateCharacter: (id: string, patch: Partial<SceneCharacterDoc>, transient?: boolean) => void;
  setCharacterAnimation: (id: string, animation: CharacterAnimation) => void;
  removeCharacter: (id: string) => void;

  addProp: (input: { definitionId: string; position?: Vec3 }) => string;
  updateProp: (id: string, patch: Partial<ScenePropDoc>, transient?: boolean) => void;
  removeProp: (id: string) => void;

  updateLight: (id: string, patch: Partial<LightDoc>, transient?: boolean) => void;

  addCamera: () => string;
  updateCamera: (id: string, patch: Partial<CameraDoc>, transient?: boolean) => void;
  removeCamera: (id: string) => void;
  setActiveCamera: (id: string) => void;

  deleteSelection: (selection: Selection) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** Every mutation funnels through here so history and autosave stay consistent. */
function mutate(
  state: SceneState,
  label: string,
  transform: (scene: SceneDoc) => SceneDoc,
  transient = false,
): Partial<SceneState> {
  if (!state.scene) return {};
  const next = transform(state.scene);
  if (next === state.scene) return {};

  useProjectStore.getState().syncScene(next);
  useProjectStore.getState().setSaveStatus("dirty");

  if (transient) {
    // Mid-drag: keep the pre-drag snapshot, do not grow history.
    return {
      scene: next,
      pending: state.pending ?? { label, scene: state.scene },
    };
  }

  const past = [...state.past, { label, scene: state.scene }].slice(-HISTORY_LIMIT);
  return { scene: next, past, future: [], pending: null };
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: null,
  past: [],
  future: [],
  pending: null,

  loadScene: (scene) => set({ scene, past: [], future: [], pending: null }),

  beginInteraction: (label) =>
    set((state) =>
      state.scene && !state.pending ? { pending: { label, scene: state.scene } } : {},
    ),

  endInteraction: () =>
    set((state) => {
      if (!state.pending) return {};
      if (state.pending.scene === state.scene) return { pending: null };
      return {
        past: [...state.past, state.pending].slice(-HISTORY_LIMIT),
        future: [],
        pending: null,
      };
    }),

  patchScene: (patch) => set((s) => mutate(s, "Edit scene", (scene) => ({ ...scene, ...patch }))),

  setEnvironment: (environmentId) =>
    set((s) =>
      mutate(s, "Change environment", (scene) => {
        const env = getEnvironment(environmentId);
        return { ...scene, environmentId, location: env.name };
      }),
    ),

  setLightingPreset: (presetId) =>
    set((s) =>
      mutate(s, "Change lighting", (scene) => ({
        ...scene,
        lightingPreset: presetId,
        lights: lightsForPreset(presetId),
      })),
    ),

  addCharacter: ({ definitionId, name, position }) => {
    const id = newId("sch");
    const castId = newId("cast");
    const definition = getCharacterDefinition(definitionId);
    const projectStore = useProjectStore.getState();
    const castIndex = projectStore.project?.cast.length ?? 0;
    const accentColor = CAST_COLORS[castIndex % CAST_COLORS.length];
    const castName = name ?? `Actor ${String(castIndex + 1).padStart(2, "0")}`;

    projectStore.addCastMember({ id: castId, name: castName, definitionId, accentColor });

    set((s) =>
      mutate(s, `Add ${castName}`, (scene) => ({
        ...scene,
        characters: [
          ...scene.characters,
          {
            id,
            characterId: castId,
            name: castName,
            definitionId,
            accentColor,
            position: position ?? [0, 0, 0],
            rotation: [0, 0, 0],
            scale: definition.defaultScale,
            animation: "IDLE",
            locked: false,
          },
        ],
      })),
    );
    return id;
  },

  updateCharacter: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Move actor",
        (scene) => ({
          ...scene,
          characters: scene.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
        transient,
      ),
    ),

  setCharacterAnimation: (id, animation) =>
    set((s) =>
      mutate(s, "Change action", (scene) => ({
        ...scene,
        characters: scene.characters.map((c) => (c.id === id ? { ...c, animation } : c)),
      })),
    ),

  removeCharacter: (id) =>
    set((s) =>
      mutate(s, "Remove actor", (scene) => ({
        ...scene,
        characters: scene.characters.filter((c) => c.id !== id),
        cameras: scene.cameras.map((cam) =>
          cam.focusTargetId === id ? { ...cam, focusTargetId: null } : cam,
        ),
      })),
    ),

  addProp: ({ definitionId, position }) => {
    const id = newId("prp");
    const definition = getPropDefinition(definitionId);
    set((s) =>
      mutate(s, `Add ${definition.name}`, (scene) => ({
        ...scene,
        props: [
          ...scene.props,
          {
            id,
            name: definition.name,
            definitionId,
            position: position ?? [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1,
          },
        ],
      })),
    );
    return id;
  },

  updateProp: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Move prop",
        (scene) => ({
          ...scene,
          props: scene.props.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),
        transient,
      ),
    ),

  removeProp: (id) =>
    set((s) =>
      mutate(s, "Remove prop", (scene) => ({
        ...scene,
        props: scene.props.filter((p) => p.id !== id),
      })),
    ),

  updateLight: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Adjust light",
        (scene) => ({
          ...scene,
          lights: scene.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        transient,
      ),
    ),

  addCamera: () => {
    const id = newId("cam");
    set((s) =>
      mutate(s, "Add camera", (scene) => {
        const source = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
        const name = `Camera ${String(scene.cameras.length + 1).padStart(2, "0")}`;
        const camera: CameraDoc = source
          ? { ...source, id, name, isActive: true }
          : {
              id,
              name,
              position: [2, 1.6, 3],
              target: [0, 1.1, 0],
              focalLength: 35,
              aperture: 2.8,
              dofEnabled: false,
              focusTargetId: null,
              shotSize: "MEDIUM",
              heightPreset: "EYE",
              isActive: true,
              movementType: "STATIC",
              movementDuration: 4,
              movementIntensity: 0.5,
            };
        return {
          ...scene,
          cameras: [...scene.cameras.map((c) => ({ ...c, isActive: false })), camera],
        };
      }),
    );
    return id;
  },

  updateCamera: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Adjust camera",
        (scene) => ({
          ...scene,
          cameras: scene.cameras.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
        transient,
      ),
    ),

  removeCamera: (id) =>
    set((s) =>
      mutate(s, "Remove camera", (scene) => {
        if (scene.cameras.length <= 1) return scene;
        const cameras = scene.cameras.filter((c) => c.id !== id);
        if (!cameras.some((c) => c.isActive)) cameras[0] = { ...cameras[0], isActive: true };
        return { ...scene, cameras };
      }),
    ),

  setActiveCamera: (id) =>
    set((s) =>
      mutate(s, "Switch camera", (scene) => ({
        ...scene,
        cameras: scene.cameras.map((c) => ({ ...c, isActive: c.id === id })),
      })),
    ),

  deleteSelection: (selection) => {
    if (selection.kind === "character") get().removeCharacter(selection.id);
    else if (selection.kind === "prop") get().removeProp(selection.id);
    else if (selection.kind === "camera") get().removeCamera(selection.id);
  },

  undo: () =>
    set((state) => {
      const entry = state.past[state.past.length - 1];
      if (!entry || !state.scene) return {};
      useProjectStore.getState().syncScene(entry.scene);
      useProjectStore.getState().setSaveStatus("dirty");
      return {
        scene: entry.scene,
        past: state.past.slice(0, -1),
        future: [{ label: entry.label, scene: state.scene }, ...state.future].slice(0, HISTORY_LIMIT),
        pending: null,
      };
    }),

  redo: () =>
    set((state) => {
      const entry = state.future[0];
      if (!entry || !state.scene) return {};
      useProjectStore.getState().syncScene(entry.scene);
      useProjectStore.getState().setSaveStatus("dirty");
      return {
        scene: entry.scene,
        past: [...state.past, { label: entry.label, scene: state.scene }].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        pending: null,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));


