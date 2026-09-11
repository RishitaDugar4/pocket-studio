"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LetterboxFrame } from "@/components/ui/LetterboxFrame";
import { ShotPreview } from "@/components/viewport/ShotPreview";
import { TRANSITION_SECONDS, playheadAt, type ResolvedClip } from "@/lib/edit/sequence";
import { useTimelineStore } from "@/stores/timelineStore";

/**
 * The viewer (§22). One 3D stage, re-pointed at whichever shot the playhead is
 * inside. Fades and dissolves are composited over it in the DOM — good enough to
 * judge the cut, which is what the director is here to do.
 */
export function SequencePlayer({ clips, aspect }: { clips: ResolvedClip[]; aspect: number }) {
  const [activeId, setActiveId] = useState<string | null>(clips[0]?.item.id ?? null);
  const sourceTime = useRef(0);
  const fadeRef = useRef<HTMLDivElement>(null);
  const dissolveRef = useRef<HTMLDivElement>(null);
  const [outgoing, setOutgoing] = useState<ResolvedClip | null>(null);

  // The clock runs at 60fps; React only needs to hear about it when the cut changes.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const { currentTime } = useTimelineStore.getState();
      const state = playheadAt(clips, currentTime);
      sourceTime.current = state.sourceTime;

      setActiveId((current) => (state.clip?.item.id ?? null) === current ? current : state.clip?.item.id ?? null);
      setOutgoing((current) =>
        (state.outgoing?.item.id ?? null) === (current?.item.id ?? null) ? current : state.outgoing,
      );

      const transition = state.clip?.item.transition ?? "CUT";
      const fading = TRANSITION_SECONDS[transition] > 0 && state.opacity < 1;
      if (fadeRef.current) {
        fadeRef.current.style.opacity =
          fading && transition === "FADE" ? String(1 - state.opacity) : "0";
      }
      if (dissolveRef.current) {
        dissolveRef.current.style.opacity =
          fading && transition === "DISSOLVE" ? String(1 - state.opacity) : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clips]);

  const active = clips.find((clip) => clip.item.id === activeId) ?? clips[0] ?? null;

  return (
    <LetterboxFrame aspect={aspect} className="rounded border border-ink-800 bg-black">
      {/* Deliberately not keyed: one WebGL context is re-pointed at each shot.
          Remounting per cut would burn through the browser's context limit
          within a couple of dozen edits. */}
      {active ? (
        <ShotPreview
          scene={active.scene}
          shot={active.shot}
          timeSource={() => sourceTime.current}
          className="!absolute inset-0"
        />
      ) : (
        <div className="grid h-full place-items-center">
          <p className="slate text-fog-500">Nothing in the cut yet</p>
        </div>
      )}

      {/* Dissolve: the outgoing shot's own frame, mixed out under the incoming
          one. It is a still rather than live footage, so a dissolve over a
          moving camera reads as approximate. */}
      {outgoing?.shot.frameUrl ? (
        <div ref={dissolveRef} className="pointer-events-none absolute inset-0" style={{ opacity: 0 }}>
          <Image
            src={outgoing.shot.frameUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}

      <div
        ref={fadeRef}
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: 0 }}
      />
    </LetterboxFrame>
  );
}
