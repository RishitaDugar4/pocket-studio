"use client";

import { useEffect, useRef, useState } from "react";
import { LetterboxFrame } from "@/components/ui/LetterboxFrame";
import { ShotPreview } from "@/components/viewport/ShotPreview";
import { TRANSITION_SECONDS, playheadAt, type ResolvedClip } from "@/lib/edit/sequence";
import { useTimelineStore } from "@/stores/timelineStore";

type DeckId = "a" | "b";

interface Decks {
  a: ResolvedClip | null;
  b: ResolvedClip | null;
  front: DeckId;
}

/**
 * The viewer (§22), cut on an A/B roll.
 *
 * Two decks alternate: the incoming shot loads onto whichever one is not
 * showing, so during a dissolve both shots are genuinely live — the outgoing
 * camera keeps moving and its actors keep acting while it mixes out. A cut just
 * swaps them instantly, and a fade takes the incoming deck up from black.
 */
export function SequencePlayer({
  clips,
  aspect,
  stageRef,
}: {
  clips: ResolvedClip[];
  aspect: number;
  /** Handed to the exporter so it can composite exactly what is on screen. */
  stageRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [decks, setDecks] = useState<Decks>({ a: clips[0] ?? null, b: null, front: "a" });
  const deckElements = useRef<Record<DeckId, HTMLDivElement | null>>({ a: null, b: null });
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const { currentTime, isPlaying } = useTimelineStore.getState();
      const state = playheadAt(clips, currentTime);

      setDecks((current) => {
        const showing = current[current.front];
        if (!state.clip) return current.a || current.b ? { a: null, b: null, front: "a" } : current;
        if (showing?.item.id === state.clip.item.id) return current;
        // Load the incoming shot onto the deck that is not on screen.
        const back: DeckId = current.front === "a" ? "b" : "a";
        return { ...current, [back]: state.clip, front: back };
      });

      const transition = state.clip?.item.transition ?? "CUT";
      // Parked at the very top of the film, show the shot rather than the black
      // it fades up from — otherwise the viewer just looks broken at rest.
      const parkedAtStart = !isPlaying && currentTime <= 0.001;
      const mixing = TRANSITION_SECONDS[transition] > 0 && state.opacity < 1 && !parkedAtStart;

      for (const id of ["a", "b"] as DeckId[]) {
        const element = deckElements.current[id];
        if (!element) continue;
        const isFront = decks.front === id;
        const holds = decks[id];
        if (!holds) {
          element.style.opacity = "0";
          continue;
        }
        if (isFront) {
          // Dissolving in over the outgoing deck; fades come up from black instead.
          element.style.opacity = mixing && transition === "DISSOLVE" ? String(state.opacity) : "1";
        } else {
          element.style.opacity = mixing && transition === "DISSOLVE" ? "1" : "0";
        }
      }

      if (fadeRef.current) {
        fadeRef.current.style.opacity =
          mixing && transition === "FADE" ? String(1 - state.opacity) : "0";
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restarts on a cut, which is rare; every frame in between reads `decks`
    // from this closure, so the loop never has to look at a ref mid-render.
  }, [clips, decks]);

  return (
    <LetterboxFrame aspect={aspect} className="rounded border border-ink-800 bg-black" innerRef={stageRef}>
      {(["a", "b"] as DeckId[]).map((id) => {
        const clip = decks[id];
        return (
          <div
            key={id}
            data-deck={id}
            ref={(element) => {
              deckElements.current[id] = element;
            }}
            className="absolute inset-0"
            style={{ opacity: decks.front === id ? 1 : 0, zIndex: decks.front === id ? 2 : 1 }}
          >
            {clip ? (
              <ShotPreview
                scene={clip.scene}
                shot={clip.shot}
                timeSource={() => sourceTimeFor(clip)}
                className="!absolute inset-0"
              />
            ) : null}
          </div>
        );
      })}

      {!decks.a && !decks.b ? (
        <div className="grid h-full place-items-center">
          <p className="slate text-fog-500">Nothing in the cut yet</p>
        </div>
      ) : null}

      <div
        ref={fadeRef}
        data-fade
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: 0 }}
      />
    </LetterboxFrame>
  );
}

/**
 * Where a deck's shot is, in its own source time. An outgoing deck is allowed to
 * run past the end of its clip — that is exactly what makes the mix look right.
 */
function sourceTimeFor(clip: ResolvedClip): number {
  const { currentTime } = useTimelineStore.getState();
  return Math.max(clip.item.trimIn + (currentTime - clip.start), 0);
}
