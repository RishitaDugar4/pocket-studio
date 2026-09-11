"use client";

import { create } from "zustand";
import type * as THREE from "three";
import type { SelectionKind } from "@/types";

export const objectKey = (kind: SelectionKind, id: string) => `${kind}:${id}`;

/**
 * Selectable scene objects register their Object3D here so the transform gizmo
 * can attach to whatever is selected without prop-drilling refs through the
 * whole viewport tree.
 */
interface RegistryState {
  objects: Record<string, THREE.Object3D>;
  register: (key: string, object: THREE.Object3D) => void;
  unregister: (key: string) => void;
}

export const useObjectRegistry = create<RegistryState>((set) => ({
  objects: {},
  register: (key, object) => set((s) => ({ objects: { ...s.objects, [key]: object } })),
  unregister: (key) =>
    set((s) => {
      if (!(key in s.objects)) return s;
      const next = { ...s.objects };
      delete next[key];
      return { objects: next };
    }),
}));
