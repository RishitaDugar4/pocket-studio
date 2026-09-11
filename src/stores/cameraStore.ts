"use client";

import { create } from "zustand";

/**
 * Camera-authoring state that is not part of the saved document: which subject
 * the framing presets aim at, and whether the movement preview is armed.
 */
interface CameraState {
  /** Scene-character or prop id the shot-size presets frame. */
  framingSubjectId: string | null;
  /** Orbit-view helper visibility for the active camera's frustum. */
  showFrustum: boolean;
  /** True while the operator is dragging the camera in the viewport. */
  isDraggingCamera: boolean;

  setFramingSubject: (id: string | null) => void;
  setShowFrustum: (value: boolean) => void;
  setDraggingCamera: (value: boolean) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  framingSubjectId: null,
  showFrustum: true,
  isDraggingCamera: false,

  setFramingSubject: (framingSubjectId) => set({ framingSubjectId }),
  setShowFrustum: (showFrustum) => set({ showFrustum }),
  setDraggingCamera: (isDraggingCamera) => set({ isDraggingCamera }),
}));
