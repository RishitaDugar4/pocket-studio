"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { saveNow } from "./save";

const DEBOUNCE_MS = 800;

/**
 * Autosave (§35): nothing the director does should need a save button, and
 * saving must never interrupt them. Debounced, and the whole active scene is
 * written at once because the client owns the ids.
 */
export function useAutosave() {
  const status = useProjectStore((s) => s.saveStatus);

  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(() => void saveNow(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [status]);
}
