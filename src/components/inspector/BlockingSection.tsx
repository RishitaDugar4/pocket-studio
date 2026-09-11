"use client";

import { Button } from "@/components/ui/Button";
import { NumberScrub, Select } from "@/components/ui/Inputs";
import { Field, Section } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { BLOCKING_ACTIONS, actionLabel, beatsFor } from "@/lib/animation";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { BlockingEventDoc, SceneCharacterDoc, SceneDoc } from "@/types";

/**
 * An actor's blocking, as a director would write it in the margin (§12):
 *
 *   00:00 — Enter
 *   00:02 — Walk to table
 *   00:05 — Sit
 */
export function BlockingSection({
  scene,
  character,
}: {
  scene: SceneDoc;
  character: SceneCharacterDoc;
}) {
  const beats = beatsFor(scene, character.id);
  const captureBeat = useSceneStore((s) => s.captureBeat);
  const selectedBeatId = useSelectionStore((s) => s.selectedBeatId);
  const selectBeat = useSelectionStore((s) => s.selectBeat);

  const addBeat = () => {
    const time = useTimelineStore.getState().currentTime;
    const id = captureBeat(character.id, time);
    if (!id) return;
    selectBeat(id);
    const beat = useSceneStore.getState().scene?.blockingEvents.find((b) => b.id === id);
    if (beat) useTimelineStore.getState().setTime(beat.endTime);
  };

  const selected = beats.find((b) => b.id === selectedBeatId) ?? null;
  const currentTime = useTimelineStore((s) => s.currentTime);
  const betweenBeats = beats.length > 0 && !selected && currentTime > 0;

  return (
    <>
      {betweenBeats ? (
        <div className="border-b border-ink-800 px-3 py-2">
          <p className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] leading-relaxed text-fog-400">
            {character.name} is being driven by their blocking at this point. Pick a beat below to
            move them, or return the playhead to 0s to change where they start.
          </p>
        </div>
      ) : null}
      <Section
        title="Blocking"
        action={
          <button
            type="button"
            onClick={addBeat}
            className="slate text-fog-400 transition-colors hover:text-amber-film"
          >
            + Beat
          </button>
        }
      >
        {beats.length === 0 ? (
          <p className="text-[10px] leading-relaxed text-fog-400">
            No beats yet. Move the playhead to when the beat should land, add it, then move{" "}
            {character.name} in the set view to say where they end up. The travel between beats is
            interpolated for you.
          </p>
        ) : (
          <ol className="space-y-0.5">
            {beats.map((beat) => (
              <li key={beat.id}>
                <button
                  type="button"
                  onClick={() => {
                    selectBeat(beat.id);
                    useTimelineStore.getState().setTime(beat.endTime);
                  }}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left transition-colors",
                    beat.id === selectedBeatId
                      ? "bg-[#221d14] text-fog-100"
                      : "text-fog-300 hover:bg-ink-800",
                  )}
                >
                  <span className="numeric w-10 shrink-0 text-[10px] text-fog-400">
                    {formatTimecode(beat.endTime)}
                  </span>
                  <span className="truncate text-[11px]">{actionLabel(beat.action)}</span>
                  <span className="numeric ml-auto shrink-0 text-[10px] text-fog-400">
                    {(beat.endTime - beat.startTime).toFixed(1)}s
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {selected ? <BeatEditor beat={selected} characterName={character.name} /> : null}
    </>
  );
}

function BeatEditor({ beat, characterName }: { beat: BlockingEventDoc; characterName: string }) {
  const updateBeat = useSceneStore((s) => s.updateBeat);
  const removeBeat = useSceneStore((s) => s.removeBeat);
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);
  const selectBeat = useSelectionStore((s) => s.selectBeat);

  const travels =
    Math.hypot(
      beat.endPosition[0] - beat.startPosition[0],
      beat.endPosition[2] - beat.startPosition[2],
    ) > 0.05;

  return (
    <Section title="Selected beat">
      <Field label="Action">
        <Select
          value={beat.action}
          onChange={(action) => updateBeat(beat.id, { action })}
          options={BLOCKING_ACTIONS.map((action) => ({ value: action, label: actionLabel(action) }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="Starts">
          <NumberScrub
            value={beat.startTime}
            min={0}
            step={0.05}
            precision={2}
            suffix="s"
            onBegin={() => begin("Retime beat")}
            onCommit={end}
            onChange={(startTime) =>
              updateBeat(
                beat.id,
                { startTime, endTime: Math.max(beat.endTime, startTime + 0.25) },
                true,
              )
            }
          />
        </Field>
        <Field label="Ends">
          <NumberScrub
            value={beat.endTime}
            min={beat.startTime + 0.25}
            step={0.05}
            precision={2}
            suffix="s"
            onBegin={() => begin("Retime beat")}
            onCommit={end}
            onChange={(endTime) => {
              updateBeat(beat.id, { endTime }, true);
              useTimelineStore.getState().setTime(endTime);
            }}
          />
        </Field>
      </div>

      <p className="text-[10px] leading-relaxed text-fog-400">
        {travels
          ? `${characterName} travels ${Math.hypot(
              beat.endPosition[0] - beat.startPosition[0],
              beat.endPosition[2] - beat.startPosition[2],
            ).toFixed(2)} m during this beat. Move them in the set view to change where they end up.`
          : `${characterName} holds position. Move them in the set view to turn this into a move.`}
      </p>

      <Button
        size="sm"
        variant="danger"
        className="w-full"
        onClick={() => {
          removeBeat(beat.id);
          selectBeat(null);
        }}
      >
        Delete beat
      </Button>
    </Section>
  );
}

function formatTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const frames = Math.round((seconds - whole) * 24);
  return `${String(whole).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}
