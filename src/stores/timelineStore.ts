"use client";

import { create } from "zustand";

/**
 * Playback clock. In Milestone 3 it drives the camera-movement preview; the
 * sequence editor reuses the same clock for shot playback.
 */
interface TimelineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  setTime: (time: number) => void;
  advance: (delta: number) => void;
  setDuration: (duration: number) => void;
  setLoop: (loop: boolean) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 4,
  loop: true,

  play: () => set((s) => ({ isPlaying: true, currentTime: s.currentTime >= s.duration ? 0 : s.currentTime })),
  pause: () => set({ isPlaying: false }),
  toggle: () => (get().isPlaying ? get().pause() : get().play()),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  setTime: (time) => set((s) => ({ currentTime: Math.min(Math.max(time, 0), s.duration) })),
  advance: (delta) =>
    set((s) => {
      const next = s.currentTime + delta;
      if (next >= s.duration) {
        return s.loop
          ? { currentTime: next % s.duration }
          : { currentTime: s.duration, isPlaying: false };
      }
      return { currentTime: Math.max(next, 0) };
    }),
  setDuration: (duration) =>
    set((s) => ({
      duration: Math.max(duration, 0.5),
      currentTime: Math.min(s.currentTime, Math.max(duration, 0.5)),
    })),
  setLoop: (loop) => set({ loop }),
}));
