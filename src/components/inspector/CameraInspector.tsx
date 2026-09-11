"use client";

import { bodyHeight, poseAimDrop } from "@/data/characters";
import { getPropDefinition } from "@/data/props";
import { Button } from "@/components/ui/Button";
import { ChipGrid, NumberScrub, Select, Slider, Switch } from "@/components/ui/Inputs";
import { Field, Row, Section } from "@/components/ui/Panel";
import {
  CAMERA_HEIGHT_SPECS,
  MOVEMENT_SPECS,
  SHOT_SIZE_SPECS,
  azimuthTo,
  calculateCameraForShotSize,
  calculateDepthOfField,
  getMovementSpec,
  isCameraTooClose,
  shotSizeForDistance,
  v,
} from "@/lib/cinematography";
import { useSceneStore } from "@/stores/sceneStore";
import { useCameraStore } from "@/stores/cameraStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  APERTURE_PRESETS,
  FOCAL_PRESETS,
  type CameraDoc,
  type CameraHeight,
  type SceneDoc,
  type ShotSize,
  type Vec3,
} from "@/types";

/** Anything the camera can be pointed at, with the height that matters for framing. */
interface FramingSubject {
  id: string;
  label: string;
  position: Vec3;
  height: number;
  aimDrop: number;
}

export function collectSubjects(scene: SceneDoc): FramingSubject[] {
  return [
    ...scene.characters.map((c) => ({
      id: c.id,
      label: c.name,
      position: c.position,
      height: bodyHeight(c.definitionId, c.scale),
      aimDrop: poseAimDrop(c.definitionId, c.scale, c.animation),
    })),
    ...scene.props.map((p) => ({
      id: p.id,
      label: p.name,
      position: p.position,
      height: getPropDefinition(p.definitionId).size[1] * p.scale,
      aimDrop: 0,
    })),
  ];
}

export function CameraInspector({ scene, camera }: { scene: SceneDoc; camera: CameraDoc }) {
  const updateCamera = useSceneStore((s) => s.updateCamera);
  const beginInteraction = useSceneStore((s) => s.beginInteraction);
  const endInteraction = useSceneStore((s) => s.endInteraction);
  const addCamera = useSceneStore((s) => s.addCamera);
  const setActiveCamera = useSceneStore((s) => s.setActiveCamera);
  const framingSubjectId = useCameraStore((s) => s.framingSubjectId);
  const setFramingSubject = useCameraStore((s) => s.setFramingSubject);

  const subjects = collectSubjects(scene);
  const subject =
    subjects.find((s) => s.id === framingSubjectId) ??
    subjects.find((s) => s.id === camera.focusTargetId) ??
    subjects[0] ??
    null;

  const aimPoint: Vec3 = subject
    ? [
        subject.position[0],
        subject.position[1] + subject.height * 0.85 - subject.aimDrop,
        subject.position[2],
      ]
    : camera.target;
  const distance = v.distance(camera.position, aimPoint);
  const actualShotSize = subject
    ? shotSizeForDistance(distance, camera.focalLength, subject.height)
    : camera.shotSize;
  const dof = calculateDepthOfField(camera.focalLength, camera.aperture, distance);
  const tooClose = subject
    ? isCameraTooClose(camera.position, subject.position, subject.height)
    : false;

  /** Reframe: keep the side we are shooting from, change the distance and height. */
  const applyFraming = (shotSize: ShotSize, heightPreset: CameraHeight = camera.heightPreset) => {
    if (!subject) return;
    const azimuth = azimuthTo(camera.position, subject.position);
    const { position, target } = calculateCameraForShotSize({
      shotSize,
      subject: {
        position: subject.position,
        height: subject.height,
        aimDrop: subject.aimDrop,
        facing: azimuth,
      },
      focalLength: camera.focalLength,
      heightPreset,
      azimuth,
    });
    updateCamera(camera.id, { position, target, shotSize, heightPreset });
  };

  const lookAtSubject = () => {
    if (!subject) return;
    updateCamera(camera.id, { target: v.round(aimPoint) });
  };

  const setVectorComponent = (
    key: "position" | "target",
    axis: 0 | 1 | 2,
    value: number,
  ) => {
    const next: Vec3 = [...camera[key]];
    next[axis] = value;
    updateCamera(camera.id, { [key]: next }, true);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section
        title="Camera"
        action={
          <button
            type="button"
            onClick={addCamera}
            className="slate text-fog-400 transition-colors hover:text-amber-film"
          >
            + Add
          </button>
        }
      >
        {scene.cameras.length > 1 ? (
          <Select
            value={camera.id}
            onChange={setActiveCamera}
            options={scene.cameras.map((c) => ({ value: c.id, label: c.name }))}
          />
        ) : null}
        <Field label="Framing subject" hint={subject ? `${distance.toFixed(2)} m` : "none on set"}>
          <Select
            value={subject?.id ?? ""}
            onChange={(id) => setFramingSubject(id || null)}
            options={
              subjects.length
                ? subjects.map((s) => ({ value: s.id, label: s.label }))
                : [{ value: "", label: "Nothing on set yet" }]
            }
          />
        </Field>
      </Section>

      <Section title="Shot size">
        <ChipGrid<ShotSize>
          columns={2}
          value={camera.shotSize}
          onChange={(size) => applyFraming(size)}
          options={SHOT_SIZE_SPECS.map((spec) => ({
            value: spec.id,
            label: spec.label,
            title: spec.description,
          }))}
        />
        {subject ? (
          <p className="text-[10px] leading-relaxed text-fog-400">
            Currently reading as{" "}
            <span className="text-fog-200">
              {SHOT_SIZE_SPECS.find((s) => s.id === actualShotSize)?.label}
            </span>{" "}
            on {subject.label}.
          </p>
        ) : (
          <p className="text-[10px] leading-relaxed text-fog-400">
            Add an actor or a prop to use the framing presets.
          </p>
        )}
      </Section>

      <Section title="Lens">
        <ChipGrid<number>
          columns={3}
          value={FOCAL_PRESETS.includes(camera.focalLength as 16) ? camera.focalLength : null}
          onChange={(focalLength) => {
            // Changing the lens keeps the framing: distance follows focal length.
            if (subject) {
              const azimuth = azimuthTo(camera.position, subject.position);
              const { position, target } = calculateCameraForShotSize({
                shotSize: camera.shotSize,
                subject: {
                  position: subject.position,
                  height: subject.height,
                  aimDrop: subject.aimDrop,
                },
                focalLength,
                heightPreset: camera.heightPreset,
                azimuth,
              });
              updateCamera(camera.id, { focalLength, position, target });
            } else {
              updateCamera(camera.id, { focalLength });
            }
          }}
          options={FOCAL_PRESETS.map((f: number) => ({ value: f, label: `${f}mm` }))}
        />
        <Field label="Focal length" hint="mm">
          <NumberScrub
            value={camera.focalLength}
            min={8}
            max={300}
            step={0.5}
            precision={0}
            suffix="mm"
            onBegin={() => beginInteraction("Change lens")}
            onCommit={endInteraction}
            onChange={(focalLength) => updateCamera(camera.id, { focalLength }, true)}
          />
        </Field>
      </Section>

      <Section title="Height">
        <ChipGrid<CameraHeight>
          columns={3}
          value={camera.heightPreset}
          onChange={(heightPreset) => {
            if (subject) applyFraming(camera.shotSize, heightPreset);
            else updateCamera(camera.id, { heightPreset });
          }}
          options={CAMERA_HEIGHT_SPECS.map((spec) => ({
            value: spec.id,
            label: spec.label,
            title: spec.description,
          }))}
        />
      </Section>

      <Section
        title="Position"
        action={
          <button
            type="button"
            onClick={lookAtSubject}
            disabled={!subject}
            className="slate text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
          >
            Look at subject
          </button>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((axis, index) => (
            <Field key={axis} label={axis}>
              <NumberScrub
                value={camera.position[index]}
                step={0.02}
                onBegin={() => beginInteraction("Move camera")}
                onCommit={endInteraction}
                onChange={(value) => setVectorComponent("position", index as 0 | 1 | 2, value)}
              />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((axis, index) => (
            <Field key={axis} label={`Look ${axis}`}>
              <NumberScrub
                value={camera.target[index]}
                step={0.02}
                onBegin={() => beginInteraction("Aim camera")}
                onCommit={endInteraction}
                onChange={(value) => setVectorComponent("target", index as 0 | 1 | 2, value)}
              />
            </Field>
          ))}
        </div>
        {tooClose ? (
          <p className="rounded border border-[#4a2c24] bg-[#241a17] px-2 py-1.5 text-[10px] leading-relaxed text-alert">
            Camera note — this is inside the actor. Pull back or the frame will clip through them.
          </p>
        ) : null}
      </Section>

      <MovementSection camera={camera} />

      <Section title="Depth of field">
        <Row className="justify-between">
          <span className="text-[11px] text-fog-300">Depth of field</span>
          <Switch
            checked={camera.dofEnabled}
            label="Depth of field"
            onChange={(dofEnabled) => updateCamera(camera.id, { dofEnabled })}
          />
        </Row>
        <ChipGrid<number>
          columns={3}
          value={camera.aperture}
          onChange={(aperture) => updateCamera(camera.id, { aperture, dofEnabled: true })}
          options={APERTURE_PRESETS.map((a: number) => ({ value: a, label: `f/${a}` }))}
        />
        <Field label="Focus on">
          <Select
            value={camera.focusTargetId ?? ""}
            onChange={(id) => updateCamera(camera.id, { focusTargetId: id || null })}
            options={[
              { value: "", label: "Where the camera is aimed" },
              ...subjects.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
        </Field>
        <div className="numeric space-y-1 rounded border border-ink-800 bg-ink-900 px-2 py-1.5 text-[10px] text-fog-400">
          <div className="flex justify-between">
            <span>Focus</span>
            <span className="text-fog-200">{dof.focusDistance.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between">
            <span>In focus</span>
            <span className="text-fog-200">
              {dof.nearLimit.toFixed(2)} m → {dof.farLimit ? `${dof.farLimit.toFixed(2)} m` : "∞"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Hyperfocal</span>
            <span className="text-fog-200">{dof.hyperfocal.toFixed(1)} m</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function MovementSection({ camera }: { camera: CameraDoc }) {
  const updateCamera = useSceneStore((s) => s.updateCamera);
  const beginInteraction = useSceneStore((s) => s.beginInteraction);
  const endInteraction = useSceneStore((s) => s.endInteraction);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const toggle = useTimelineStore((s) => s.toggle);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const spec = getMovementSpec(camera.movementType);

  return (
    <Section
      title="Movement"
      action={
        <button
          type="button"
          onClick={toggle}
          className="slate text-fog-400 transition-colors hover:text-amber-film"
        >
          {isPlaying ? "Pause" : "Preview"}
        </button>
      }
    >
      <Select
        value={camera.movementType}
        onChange={(movementType) => updateCamera(camera.id, { movementType })}
        options={MOVEMENT_SPECS.map((m) => ({ value: m.id, label: m.label }))}
      />
      <p className="text-[10px] leading-relaxed text-fog-400">{spec.description}</p>
      <Field label="Duration" hint={`${camera.movementDuration.toFixed(1)}s`}>
        <NumberScrub
          value={camera.movementDuration}
          min={0.5}
          max={60}
          step={0.05}
          precision={1}
          suffix="s"
          onBegin={() => beginInteraction("Change move duration")}
          onCommit={endInteraction}
          onChange={(movementDuration) => {
            updateCamera(camera.id, { movementDuration }, true);
            setDuration(movementDuration);
          }}
        />
      </Field>
      {camera.movementType !== "STATIC" ? (
        <Field
          label={camera.movementType === "HANDHELD" ? "Operator energy" : "Travel"}
          hint={`${Math.round(camera.movementIntensity * 100)}%`}
        >
          <Slider
            value={camera.movementIntensity}
            min={0}
            max={1}
            step={0.01}
            onBegin={() => beginInteraction("Change move intensity")}
            onCommit={endInteraction}
            onChange={(movementIntensity) =>
              updateCamera(camera.id, { movementIntensity }, true)
            }
          />
        </Field>
      ) : null}
      {camera.movementType === "HANDHELD" ? (
        <p className="text-[10px] leading-relaxed text-fog-400">
          Handheld is a controlled drift, not a shake — it runs for the whole shot.
        </p>
      ) : null}
    </Section>
  );
}

export function CameraEmptyState() {
  return (
    <div className="p-4">
      <p className="text-[11px] leading-relaxed text-fog-400">
        This scene has no camera. Add one to start framing.
      </p>
      <Button
        size="sm"
        className="mt-2"
        onClick={() => useSceneStore.getState().addCamera()}
      >
        Add camera
      </Button>
    </div>
  );
}
