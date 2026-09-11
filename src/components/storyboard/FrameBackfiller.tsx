"use client";

import { useEffect, useState } from "react";
import { ShotPreview } from "@/components/viewport/ShotPreview";
import { backfillShotFrame } from "@/features/shots/backfillFrame";
import type { SceneDoc, ShotDoc } from "@/types";

/** How long to let a preview settle before grabbing it. */
const SETTLE_MS = 850;

/**
 * Develops the storyboard. Shots created by the demo seed have no frame — there
 * is no renderer on a server — so the board quietly renders each missing one in
 * an off-screen preview and stores it. One shot at a time, one WebGL context.
 *
 * No cursor is needed: a shot leaves `pending` the moment its frame lands, so
 * the head of the queue is always the next thing to render.
 */
export function FrameBackfiller({ pending }: { pending: Array<{ scene: SceneDoc; shot: ShotDoc }> }) {
  // Shots whose frame could not be rendered; skipped so the queue cannot stall.
  const [failed, setFailed] = useState<string[]>([]);
  const next = pending.find((entry) => !failed.includes(entry.shot.id));

  useEffect(() => {
    if (!next) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const ok = await backfillShotFrame(next.shot.id);
      if (cancelled) return;
      // Don't loop forever on a shot that will not render.
      if (!ok) setFailed((ids) => [...ids, next.shot.id]);
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [next]);

  if (!next) return null;

  return (
    <div
      aria-hidden
      // Rendered off-screen: it must have a real size to produce a real frame.
      className="pointer-events-none fixed left-[-12000px] top-0 h-[270px] w-[480px] opacity-0"
    >
      <ShotPreview
        key={next.shot.id}
        scene={next.scene}
        shot={next.shot}
        time={Math.min(next.shot.duration * 0.35, 1.2)}
        capturable
        className="!absolute inset-0"
      />
    </div>
  );
}
