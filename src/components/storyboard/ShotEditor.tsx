"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGrid, NumberScrub, Select, Slider, TextArea, TextInput } from "@/components/ui/Inputs";
import { Field, Section } from "@/components/ui/Panel";
import { LetterboxFrame } from "@/components/ui/LetterboxFrame";
import { ShotPreview } from "@/components/viewport/ShotPreview";
import { backfillShotFrame } from "@/features/shots/backfillFrame";
import { collectSubjects } from "@/components/inspector/CameraInspector";
import {
  MOVEMENT_SPECS,
  SHOT_SIZE_SPECS,
  azimuthTo,
  calculateCameraForShotSize,
  calculateDepthOfField,
  movementEndTransform,
  v,
} from "@/lib/cinematography";
import { APERTURE_PRESETS, FOCAL_PRESETS, TRANSITIONS } from "@/types";
import { newId } from "@/lib/db/defaults";
import { useSceneStore } from "@/stores/sceneStore";
import { aspectValue, useViewportStore } from "@/stores/viewportStore";
import type {
  CameraMovementType,
  CameraTransform,
  SceneDoc,
  ShotDoc,
  ShotSize,
  TransitionType,
} from "@/types";

/**
 * Work on one shot (§20). Everything here edits the shot's own frozen camera —
 * the scene camera is not touched, and changing it later will not touch this.
 */
export function ShotEditor({
  scene,
  shot,
  onClose,
}: {
  scene: SceneDoc;
  shot: ShotDoc;
  onClose: () => void;
}) {
  const updateShot = useSceneStore((s) => s.updateShot);
  const duplicateShot = useSceneStore((s) => s.duplicateShot);
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);

  const aspect = aspectValue(useViewportStore((s) => s.aspectId));
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);

  // The shot editor runs its own little clock — it previews one shot, not the scene.
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - last.current) / 1000;
      last.current = now;
      setTime((current) => (current + delta > shot.duration ? 0 : current + delta));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, shot.duration]);

  // A shot with no card gets one from the preview the director is looking at.
  useEffect(() => {
    if (shot.frameUrl) return;
    const timer = setTimeout(() => void backfillShotFrame(shot.id), 1200);
    return () => clearTimeout(timer);
  }, [shot.id, shot.frameUrl]);

  const movement = shot.movements[0] ?? null;
  const subjects = collectSubjects(scene);
  const focusSubject = subjects.find((s) => s.id === shot.cameraState.focusTargetId) ?? null;
  const distance = v.distance(
    shot.cameraState.position,
    focusSubject
      ? [
          focusSubject.position[0],
          focusSubject.position[1] + focusSubject.height * 0.85 - focusSubject.aimDrop,
          focusSubject.position[2],
        ]
      : shot.cameraState.target,
  );
  const dof = calculateDepthOfField(
    shot.cameraState.focalLength,
    shot.cameraState.aperture,
    distance,
  );

  /** Every camera edit writes a new frozen transform onto the shot. */
  const patchCamera = (patch: Partial<CameraTransform>, transient = false) => {
    const cameraState = { ...shot.cameraState, ...patch };
    const movements = shot.movements.map((m) => ({
      ...m,
      startTransform: cameraState,
      endTransform: movementEndTransform(cameraState, m.type, m.intensity),
    }));
    updateShot(shot.id, { cameraState, movements }, transient);
  };

  const setMovement = (type: CameraMovementType) => {
    if (type === "STATIC") {
      updateShot(shot.id, { movements: [] });
      return;
    }
    const existing = shot.movements[0];
    const intensity = existing?.intensity ?? 0.5;
    updateShot(shot.id, {
      movements: [
        {
          id: existing?.id ?? newId("mov"),
          type,
          startTime: 0,
          duration: shot.duration,
          intensity,
          startTransform: shot.cameraState,
          endTransform: movementEndTransform(shot.cameraState, type, intensity),
        },
      ],
    });
  };

  const applyShotSize = (shotSize: ShotSize) => {
    if (!focusSubject && subjects.length === 0) {
      updateShot(shot.id, { shotSize });
      return;
    }
    const subject = focusSubject ?? subjects[0];
    const azimuth = azimuthTo(shot.cameraState.position, subject.position);
    const { position, target } = calculateCameraForShotSize({
      shotSize,
      subject: { position: subject.position, height: subject.height, aimDrop: subject.aimDrop },
      focalLength: shot.cameraState.focalLength,
      azimuth,
    });
    const cameraState = { ...shot.cameraState, position, target };
    updateShot(shot.id, {
      shotSize,
      cameraState,
      movements: shot.movements.map((m) => ({
        ...m,
        startTransform: cameraState,
        endTransform: movementEndTransform(cameraState, m.type, m.intensity),
      })),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-900 px-3">
        <button
          type="button"
          onClick={onClose}
          className="slate transition-colors hover:text-fog-100"
        >
          ← Storyboard
        </button>
        <span className="slate text-fog-300">
          Scene {String(scene.index + 1).padStart(2, "0")}
        </span>
        <span className="text-[12px] text-fog-100">{shot.name}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 flex-col bg-ink-950">
          {/* The preview is letterboxed to the frame the film is composed for,
              so what you judge here is what the audience will see. */}
          <div className="min-h-0 flex-1 p-6">
            <LetterboxFrame aspect={aspect} className="rounded border border-ink-800">
              <ShotPreview
                scene={scene}
                shot={shot}
                time={time}
                capturable
                className="!absolute inset-0"
              />
            </LetterboxFrame>
          </div>

          <div className="flex h-11 shrink-0 items-center gap-3 border-t border-ink-800 bg-ink-900 px-3">
            <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </Button>
            <span className="numeric text-[11px] text-fog-300">
              {time.toFixed(2)}
              <span className="text-fog-400"> / {shot.duration.toFixed(2)}s</span>
            </span>
            <input
              type="range"
              min={0}
              max={shot.duration}
              step={0.01}
              value={time}
              onChange={(event) => {
                setPlaying(false);
                setTime(Number.parseFloat(event.target.value));
              }}
              className="min-w-0 flex-1"
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto border-l border-ink-800 bg-ink-900">
          <Section title="Shot">
            <Field label="Name">
              <TextInput
                value={shot.name}
                onChange={(event) => updateShot(shot.id, { name: event.target.value })}
              />
            </Field>
            <Field label="Duration" hint={`${shot.duration.toFixed(1)}s`}>
              <NumberScrub
                value={shot.duration}
                min={0.3}
                max={120}
                step={0.05}
                precision={2}
                suffix="s"
                onBegin={() => begin("Change duration")}
                onCommit={end}
                onChange={(duration) =>
                  updateShot(
                    shot.id,
                    {
                      duration,
                      movements: shot.movements.map((m) => ({ ...m, duration })),
                    },
                    true,
                  )
                }
              />
            </Field>
            <Field label="Starts at" hint="scene time">
              <NumberScrub
                value={shot.sceneTime}
                min={0}
                step={0.05}
                precision={2}
                suffix="s"
                onBegin={() => begin("Move shot in scene")}
                onCommit={end}
                onChange={(sceneTime) => updateShot(shot.id, { sceneTime }, true)}
              />
            </Field>
            <Field label="Transition in">
              <Select<TransitionType>
                value={shot.transition}
                onChange={(transition) => updateShot(shot.id, { transition })}
                options={TRANSITIONS.map((t) => ({
                  value: t,
                  label: t.charAt(0) + t.slice(1).toLowerCase(),
                }))}
              />
            </Field>
          </Section>

          <Section title="Shot size">
            <ChipGrid<ShotSize>
              columns={2}
              value={shot.shotSize}
              onChange={applyShotSize}
              options={SHOT_SIZE_SPECS.map((spec) => ({ value: spec.id, label: spec.label }))}
            />
          </Section>

          <Section title="Lens">
            <ChipGrid<number>
              columns={3}
              value={
                FOCAL_PRESETS.includes(shot.cameraState.focalLength as 16)
                  ? shot.cameraState.focalLength
                  : null
              }
              onChange={(focalLength) => patchCamera({ focalLength })}
              options={FOCAL_PRESETS.map((f: number) => ({ value: f, label: `${f}mm` }))}
            />
            <Field label="Focal length" hint="mm">
              <NumberScrub
                value={shot.cameraState.focalLength}
                min={8}
                max={300}
                step={0.5}
                precision={0}
                suffix="mm"
                onBegin={() => begin("Change lens")}
                onCommit={end}
                onChange={(focalLength) => patchCamera({ focalLength }, true)}
              />
            </Field>
          </Section>

          <Section title="Movement">
            <Select
              value={movement?.type ?? "STATIC"}
              onChange={setMovement}
              options={MOVEMENT_SPECS.map((m) => ({ value: m.id, label: m.label }))}
            />
            {movement ? (
              <Field
                label={movement.type === "HANDHELD" ? "Operator energy" : "Travel"}
                hint={`${Math.round(movement.intensity * 100)}%`}
              >
                <Slider
                  value={movement.intensity}
                  min={0}
                  max={1}
                  step={0.01}
                  onBegin={() => begin("Change move")}
                  onCommit={end}
                  onChange={(intensity) =>
                    updateShot(
                      shot.id,
                      {
                        movements: [
                          {
                            ...movement,
                            intensity,
                            endTransform: movementEndTransform(
                              shot.cameraState,
                              movement.type,
                              intensity,
                            ),
                          },
                        ],
                      },
                      true,
                    )
                  }
                />
              </Field>
            ) : null}
          </Section>

          <Section title="Focus">
            <Field label="Focus on">
              <Select
                value={shot.cameraState.focusTargetId ?? ""}
                onChange={(id) =>
                  patchCamera({ focusTargetId: id || null, dofEnabled: id ? true : shot.cameraState.dofEnabled })
                }
                options={[
                  { value: "", label: "Where the camera is aimed" },
                  ...subjects.map((s) => ({ value: s.id, label: s.label })),
                ]}
              />
            </Field>
            <ChipGrid<number>
              columns={3}
              value={shot.cameraState.aperture}
              onChange={(aperture) => patchCamera({ aperture, dofEnabled: true })}
              options={APERTURE_PRESETS.map((a: number) => ({ value: a, label: `f/${a}` }))}
            />
            <p className="numeric text-[10px] leading-relaxed text-fog-400">
              {shot.cameraState.dofEnabled
                ? `In focus ${dof.nearLimit.toFixed(2)} m → ${
                    dof.farLimit ? `${dof.farLimit.toFixed(2)} m` : "∞"
                  }`
                : "Deep focus — everything sharp."}
            </p>
          </Section>

          <Section title="Notes">
            <TextArea
              rows={3}
              value={shot.notes}
              placeholder="What is this shot for?"
              onChange={(event) => updateShot(shot.id, { notes: event.target.value })}
            />
          </Section>

          <Section title="Alternatives">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                const id = duplicateShot(shot.id);
                if (id) onClose();
              }}
            >
              Duplicate shot
            </Button>
            <p className="text-[10px] leading-relaxed text-fog-400">
              A duplicate keeps this framing and then goes its own way — the fastest way to try the
              scene a second time.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
