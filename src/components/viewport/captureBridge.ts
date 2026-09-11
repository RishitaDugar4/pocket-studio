"use client";

import type * as THREE from "three";

/**
 * Frame grabbing, addressed by slot.
 *
 * Two renderers can be alive at once — the scene builder's viewport and an
 * off-screen preview developing storyboard cards — so a single global grabber
 * would mean Capture Shot could quietly photograph the wrong renderer. Each
 * registers under its own slot instead.
 *
 * Composition guides are DOM overlays, so a captured frame never contains them.
 */
export type CaptureSlot = "viewport" | "preview";

export const captureBridge = {
  grabbers: new Map<CaptureSlot, () => string | null>(),
  /** The scene builder's shot camera, published by its rig. */
  shotCamera: null as THREE.PerspectiveCamera | null,
};

/** Waits for the renderer to draw with the current settings, then grabs a frame. */
export async function grabFrame(slot: CaptureSlot = "viewport"): Promise<string | null> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return captureBridge.grabbers.get(slot)?.() ?? null;
}
