"use client";

import { create } from "zustand";
import { getEnvironment } from "@/data/environments";
import { getCharacterDefinition } from "@/data/characters";
import { getPropDefinition } from "@/data/props";
import { lightsForPreset, newId } from "@/lib/db/defaults";
import { movementEndTransform } from "@/lib/cinematography";
import { CAST_COLORS_SERVER as CAST_COLORS } from "@/lib/db/castColors";
import { useProjectStore } from "./projectStore";
import { useTimelineStore } from "./timelineStore";
import { actorPositionAfterLastBeat, beatsFor } from "@/lib/animation";
import type {
  BlockingEventDoc,
  CameraDoc,
  CameraMovementDoc,
  CameraTransform,
  ShotDoc,
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

/** Poses an actor holds standing still; walking somewhere overrides them. */
const HELD_ACTIONS = new Set(["IDLE", "STAND", "SIT", "LOOK", "TALK", "PHONE", "TURN"]);

const travels = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.05;

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

  /** Blocking beats (§12). `captureBeat` records where an actor is at a time. */
  captureBeat: (sceneCharacterId: string, time: number) => string | null;
  updateBeat: (id: string, patch: Partial<BlockingEventDoc>, transient?: boolean) => void;
  removeBeat: (id: string) => void;

  addCamera: () => string;
  updateCamera: (id: string, patch: Partial<CameraDoc>, transient?: boolean) => void;
  removeCamera: (id: string) => void;
  setActiveCamera: (id: string) => void;

  /** Shots (§18): a capture freezes the camera; it never tracks it afterwards. */
  captureShot: () => string | null;
  updateShot: (id: string, patch: Partial<ShotDoc>, transient?: boolean) => void;
  duplicateShot: (id: string) => string | null;
  removeShot: (id: string) => void;
  reorderShots: (orderedIds: string[]) => void;

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
        (scene) => {
          // The first beat starts wherever the actor is standing, so moving the
          // placement drags the head of the chain with it.
          const first = beatsFor(scene, id)[0];
          const syncFirst =
            first && (patch.position !== undefined || patch.rotation !== undefined);
          return {
            ...scene,
            characters: scene.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            blockingEvents: syncFirst
              ? scene.blockingEvents.map((event) =>
                  event.id === first.id
                    ? {
                        ...event,
                        startPosition: patch.position ?? event.startPosition,
                      }
                    : event,
                )
              : scene.blockingEvents,
          };
        },
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
        blockingEvents: scene.blockingEvents.filter((e) => e.sceneCharacterId !== id),
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

  captureBeat: (sceneCharacterId, time) => {
    const scene = get().scene;
    const character = scene?.characters.find((c) => c.id === sceneCharacterId);
    if (!scene || !character) return null;

    const beats = beatsFor(scene, sceneCharacterId);
    const previous = actorPositionAfterLastBeat(character, beats);
    // A beat always runs from where the actor last was to where they are now.
    const startTime = previous.endTime;
    const endTime = Math.max(time, startTime + 0.5);
    const id = newId("blk");
    const travels = Math.hypot(
      character.position[0] - previous.position[0],
      character.position[2] - previous.position[2],
    ) > 0.05;

    set((s) =>
      mutate(s, `Block ${character.name}`, (current) => ({
        ...current,
        blockingEvents: [
          ...current.blockingEvents,
          {
            id,
            sceneCharacterId,
            startTime,
            endTime,
            action: travels ? "WALK" : character.animation,
            startPosition: previous.position,
            endPosition: character.position,
            rotation: character.rotation,
          },
        ],
      })),
    );
    return id;
  },

  updateBeat: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Adjust beat",
        (scene) => {
          const target = scene.blockingEvents.find((e) => e.id === id);
          if (!target) return scene;
          const updated = { ...target, ...patch };

          // The moment a beat starts covering ground it becomes a walk, unless
          // the director named the action themselves. Once it travels, their
          // choice sticks — we only ever decide the default.
          if (patch.action === undefined) {
            const wasTravel = travels(target.startPosition, target.endPosition);
            const nowTravel = travels(updated.startPosition, updated.endPosition);
            if (!wasTravel && nowTravel && HELD_ACTIONS.has(updated.action)) {
              updated.action = "WALK";
            } else if (wasTravel && !nowTravel && updated.action === "WALK") {
              updated.action = "IDLE";
            }
          }

          const next = beatsFor(scene, target.sceneCharacterId).find(
            (e) => e.startTime >= target.endTime && e.id !== id,
          );
          const chainNext =
            next && (patch.endPosition !== undefined || patch.endTime !== undefined);
          return {
            ...scene,
            blockingEvents: scene.blockingEvents.map((event) => {
              if (event.id === id) return updated;
              if (chainNext && event.id === next.id) {
                return {
                  ...event,
                  startPosition: updated.endPosition,
                  startTime: Math.max(updated.endTime, 0),
                  endTime: Math.max(event.endTime, updated.endTime + 0.5),
                };
              }
              return event;
            }),
          };
        },
        transient,
      ),
    ),

  removeBeat: (id) =>
    set((s) =>
      mutate(s, "Remove beat", (scene) => {
        const removed = scene.blockingEvents.find((e) => e.id === id);
        if (!removed) return scene;
        // Close the gap: the next beat now starts where this one began.
        const siblings = scene.blockingEvents
          .filter((e) => e.sceneCharacterId === removed.sceneCharacterId && e.id !== id)
          .sort((a, b) => a.startTime - b.startTime);
        const next = siblings.find((e) => e.startTime >= removed.endTime);
        return {
          ...scene,
          blockingEvents: scene.blockingEvents
            .filter((e) => e.id !== id)
            .map((e) =>
              next && e.id === next.id
                ? { ...e, startPosition: removed.startPosition, startTime: removed.startTime }
                : e,
            ),
        };
      }),
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

  captureShot: () => {
    const scene = get().scene;
    const camera = scene?.cameras.find((c) => c.isActive) ?? scene?.cameras[0];
    if (!scene || !camera) return null;

    const id = newId("sht");
    const index = scene.shots.length;
    // The shot takes a *copy* of the camera. Changing the scene camera later
    // must never reach back into a shot that has already been taken (§18).
    const cameraState: CameraTransform = {
      position: [...camera.position],
      target: [...camera.target],
      focalLength: camera.focalLength,
      aperture: camera.aperture,
      dofEnabled: camera.dofEnabled,
      focusTargetId: camera.focusTargetId,
    };
    const duration = Math.max(camera.movementDuration, 0.5);
    // The shot starts where the playhead is: a close-up can cover a later beat.
    const sceneTime = useTimelineStore.getState().currentTime;
    const subjects = camera.focusTargetId
      ? [camera.focusTargetId]
      : scene.characters.map((c) => c.id);

    const movements: CameraMovementDoc[] =
      camera.movementType === "STATIC"
        ? []
        : [
            {
              id: newId("mov"),
              type: camera.movementType,
              startTime: 0,
              duration,
              intensity: camera.movementIntensity,
              startTransform: cameraState,
              endTransform: movementEndTransform(
                cameraState,
                camera.movementType,
                camera.movementIntensity,
              ),
            },
          ];

    set((s) =>
      mutate(s, "Capture shot", (current) => ({
        ...current,
        shots: [
          ...current.shots,
          {
            id,
            index,
            name: `Shot ${String(index + 1).padStart(2, "0")}`,
            shotSize: camera.shotSize,
            duration,
            sceneTime,
            cameraState,
            subjects,
            notes: "",
            transition: "CUT",
            cameraId: camera.id,
            movements,
            frameUrl: null,
          },
        ],
      })),
    );
    return id;
  },

  updateShot: (id, patch, transient) =>
    set((s) =>
      mutate(
        s,
        "Edit shot",
        (scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot)),
        }),
        transient,
      ),
    ),

  duplicateShot: (id) => {
    const scene = get().scene;
    const source = scene?.shots.find((s) => s.id === id);
    if (!scene || !source) return null;
    const copy: ShotDoc = {
      ...source,
      id: newId("sht"),
      index: source.index + 1,
      name: `${source.name} · alt`,
      // A duplicate is a fresh take: same framing, its own decisions from here.
      movements: source.movements.map((m) => ({ ...m, id: newId("mov") })),
      cameraState: { ...source.cameraState },
      frameUrl: source.frameUrl,
    };
    set((s) =>
      mutate(s, "Duplicate shot", (current) => {
        const shots = [...current.shots];
        shots.splice(source.index + 1, 0, copy);
        return { ...current, shots: shots.map((shot, i) => ({ ...shot, index: i })) };
      }),
    );
    return copy.id;
  },

  removeShot: (id) =>
    set((s) =>
      mutate(s, "Delete shot", (scene) => ({
        ...scene,
        shots: scene.shots.filter((shot) => shot.id !== id).map((shot, i) => ({ ...shot, index: i })),
      })),
    ),

  reorderShots: (orderedIds) =>
    set((s) =>
      mutate(s, "Reorder shots", (scene) => {
        const byId = new Map(scene.shots.map((shot) => [shot.id, shot]));
        const next = orderedIds
          .map((id) => byId.get(id))
          .filter((shot): shot is ShotDoc => !!shot)
          .map((shot, index) => ({ ...shot, index }));
        return next.length === scene.shots.length ? { ...scene, shots: next } : scene;
      }),
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


