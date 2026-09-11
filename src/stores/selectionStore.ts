"use client";

import { create } from "zustand";
import type { Selection, SelectionKind } from "@/types";

interface SelectionState {
  selection: Selection | null;
  hovered: Selection | null;
  /** Shot selected in the storyboard / sequence editor. */
  selectedShotId: string | null;
  /** Blocking beat being authored in the scene timeline. */
  selectedBeatId: string | null;

  select: (kind: SelectionKind, id: string) => void;
  setSelection: (selection: Selection | null) => void;
  clear: () => void;
  setHovered: (selection: Selection | null) => void;
  selectShot: (shotId: string | null) => void;
  selectBeat: (beatId: string | null) => void;
  isSelected: (kind: SelectionKind, id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selection: null,
  hovered: null,
  selectedShotId: null,
  selectedBeatId: null,

  select: (kind, id) => set({ selection: { kind, id }, selectedBeatId: null }),
  setSelection: (selection) => set({ selection }),
  clear: () => set({ selection: null, selectedBeatId: null }),
  setHovered: (hovered) => set({ hovered }),
  selectShot: (selectedShotId) => set({ selectedShotId }),
  selectBeat: (selectedBeatId) => set({ selectedBeatId }),
  isSelected: (kind, id) => {
    const s = get().selection;
    return !!s && s.kind === kind && s.id === id;
  },
}));
