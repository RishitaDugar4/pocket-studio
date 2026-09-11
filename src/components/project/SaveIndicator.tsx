"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";

const SAVED_BADGE_MS = 2200;

/** "Saving…" / "Saved" near the title, and never in the way (§35). */
export function SaveIndicator() {
  const status = useProjectStore((s) => s.saveStatus);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  // The badge fades on its own; the timer is the only thing that sets state.
  useEffect(() => {
    if (!lastSavedAt) return;
    const timer = setTimeout(() => setCheckedAt(Date.now()), SAVED_BADGE_MS);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  const showSaved = lastSavedAt !== null && checkedAt - lastSavedAt < SAVED_BADGE_MS;

  if (status === "error") {
    return <span className="slate text-alert">Save failed — retrying on next change</span>;
  }
  if (status === "saving") return <span className="slate animate-fade">Saving…</span>;
  if (status === "dirty") return <span className="slate text-fog-400">Unsaved changes</span>;
  if (showSaved) return <span className="slate animate-fade text-amber-film">Saved ✓</span>;
  return <span className="slate text-fog-400">All changes saved</span>;
}
