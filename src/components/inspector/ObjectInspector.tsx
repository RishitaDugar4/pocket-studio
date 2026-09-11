"use client";

import { CHARACTER_ANIMATIONS, type CharacterAnimation, type SceneDoc, type Vec3 } from "@/types";
import { getCharacterDefinition } from "@/data/characters";
import { getPropDefinition } from "@/data/props";
import { Button } from "@/components/ui/Button";
import { ChipGrid, NumberScrub, Select, Slider, Switch, TextInput } from "@/components/ui/Inputs";
import { EmptyState, Field, Row, Section } from "@/components/ui/Panel";
import { LIGHT_ROLE_LABELS } from "@/data/lighting";
import { beatsFor } from "@/lib/animation";
import { BlockingSection } from "./BlockingSection";
import { kelvinToHex } from "@/lib/rendering/color";
import { radToDeg, degToRad } from "@/lib/cinematography";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useCameraStore } from "@/stores/cameraStore";
import { useViewportStore } from "@/stores/viewportStore";
import type { Selection } from "@/types";

export function ObjectInspector({ scene, selection }: { scene: SceneDoc; selection: Selection | null }) {
  if (!selection) {
    return (
      <EmptyState
        title="Nothing selected"
        body="Click an actor, prop, light or the camera in the set view to edit it."
      />
    );
  }

  if (selection.kind === "character") {
    const character = scene.characters.find((c) => c.id === selection.id);
    return character ? <CharacterPanel scene={scene} character={character} /> : <MissingObject />;
  }
  if (selection.kind === "prop") {
    const prop = scene.props.find((p) => p.id === selection.id);
    return prop ? <PropPanel prop={prop} /> : <MissingObject />;
  }
  if (selection.kind === "light") {
    const light = scene.lights.find((l) => l.id === selection.id);
    return light ? <LightPanel light={light} /> : <MissingObject />;
  }
  return (
    <div className="p-4 text-[11px] leading-relaxed text-fog-400">
      The camera is selected. Its controls live in the Camera tab.
    </div>
  );
}

function MissingObject() {
  return (
    <EmptyState title="Gone" body="That object is no longer in the scene." />
  );
}

/** Shared position / rotation / scale block. */
function TransformSection({
  position,
  rotation,
  scale,
  onChange,
  scaleRange = [0.6, 1.6],
  label = "Transform",
}: {
  position: Vec3;
  rotation: Vec3;
  scale: number;
  onChange: (patch: { position?: Vec3; rotation?: Vec3; scale?: number }, transient: boolean) => void;
  scaleRange?: [number, number];
  label?: string;
}) {
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);

  const setAxis = (key: "position" | "rotation", axis: number, value: number) => {
    const source = key === "position" ? position : rotation;
    const next: Vec3 = [...source];
    next[axis] = value;
    onChange({ [key]: next }, true);
  };

  return (
    <Section title={label}>
      <div className="grid grid-cols-3 gap-1.5">
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <Field key={axis} label={axis}>
            <NumberScrub
              value={position[index]}
              step={0.02}
              onBegin={() => begin("Move object")}
              onCommit={end}
              onChange={(value) => setAxis("position", index, value)}
            />
          </Field>
        ))}
      </div>
      <Field label="Facing" hint={`${Math.round(radToDeg(rotation[1]))}°`}>
        <Slider
          value={radToDeg(rotation[1])}
          min={-180}
          max={180}
          step={1}
          onBegin={() => begin("Rotate object")}
          onCommit={end}
          onChange={(value) => setAxis("rotation", 1, degToRad(value))}
        />
      </Field>
      <Field label="Scale" hint={scale.toFixed(2)}>
        <Slider
          value={scale}
          min={scaleRange[0]}
          max={scaleRange[1]}
          step={0.01}
          onBegin={() => begin("Scale object")}
          onCommit={end}
          onChange={(value) => onChange({ scale: value }, true)}
        />
      </Field>
    </Section>
  );
}

function CharacterPanel({
  scene,
  character,
}: {
  scene: SceneDoc;
  character: SceneDoc["characters"][number];
}) {
  const updateCharacter = useSceneStore((s) => s.updateCharacter);
  const setCharacterAnimation = useSceneStore((s) => s.setCharacterAnimation);
  const removeCharacter = useSceneStore((s) => s.removeCharacter);
  const updateCastMember = useProjectStore((s) => s.updateCastMember);
  const clear = useSelectionStore((s) => s.clear);
  const setFramingSubject = useCameraStore((s) => s.setFramingSubject);
  const setInspectorTab = useViewportStore((s) => s.setInspectorTab);
  const updateBeat = useSceneStore((s) => s.updateBeat);
  const selectedBeatId = useSelectionStore((s) => s.selectedBeatId);
  const definition = getCharacterDefinition(character.definitionId);

  const beats = beatsFor(scene, character.id);
  const beat = beats.find((b) => b.id === selectedBeatId) ?? null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title="Actor">
        <Field label="Name">
          <TextInput
            value={character.name}
            onChange={(e) => updateCastMember(character.characterId, { name: e.target.value })}
          />
        </Field>
        <Field label="Casting" hint={`${(definition.build.height * character.scale).toFixed(2)} m`}>
          <Select
            value={character.definitionId}
            onChange={(definitionId) => {
              updateCharacter(character.id, { definitionId });
              updateCastMember(character.characterId, { definitionId });
            }}
            options={[
              { value: "adult_tall", label: "Adult · Tall" },
              { value: "adult_average", label: "Adult · Average" },
              { value: "adult_slight", label: "Adult · Slight" },
              { value: "youth", label: "Youth" },
              { value: "elder", label: "Elder" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Action">
        <ChipGrid<CharacterAnimation>
          columns={2}
          value={character.animation}
          onChange={(animation) => setCharacterAnimation(character.id, animation)}
          options={CHARACTER_ANIMATIONS.map((a) => ({
            value: a,
            label: a.charAt(0) + a.slice(1).toLowerCase(),
          }))}
        />
        <p className="text-[10px] leading-relaxed text-fog-400">
          The pose {character.name} holds before their first blocking beat.
        </p>
      </Section>

      {/* With a beat selected, the transform is where the actor ends up in that
          beat — the same thing the gizmo edits, so the two never disagree. */}
      <TransformSection
        label={beat ? "Beat destination" : beats.length > 0 ? "Placement at 0s" : "Transform"}
        position={beat ? beat.endPosition : character.position}
        rotation={beat ? beat.rotation : character.rotation}
        scale={character.scale}
        onChange={(patch, transient) => {
          if (patch.scale !== undefined) {
            updateCharacter(character.id, { scale: patch.scale }, transient);
            return;
          }
          if (beat) {
            updateBeat(
              beat.id,
              {
                ...(patch.position ? { endPosition: patch.position } : {}),
                ...(patch.rotation ? { rotation: patch.rotation } : {}),
              },
              transient,
            );
          } else {
            updateCharacter(character.id, patch, transient);
          }
        }}
      />

      <BlockingSection scene={scene} character={character} />

      <Section title="Directing">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            setFramingSubject(character.id);
            setInspectorTab("CAMERA");
          }}
        >
          Frame this actor
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="w-full"
          onClick={() => {
            removeCharacter(character.id);
            clear();
          }}
        >
          Remove from scene
        </Button>
      </Section>
    </div>
  );
}

function PropPanel({ prop }: { prop: SceneDoc["props"][number] }) {
  const updateProp = useSceneStore((s) => s.updateProp);
  const removeProp = useSceneStore((s) => s.removeProp);
  const clear = useSelectionStore((s) => s.clear);
  const setFramingSubject = useCameraStore((s) => s.setFramingSubject);
  const setInspectorTab = useViewportStore((s) => s.setInspectorTab);
  const definition = getPropDefinition(prop.definitionId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title="Prop">
        <Field label="Name">
          <TextInput
            value={prop.name}
            onChange={(e) => updateProp(prop.id, { name: e.target.value })}
          />
        </Field>
        <p className="slate">{definition.category.replace("_", " ")}</p>
      </Section>

      <TransformSection
        position={prop.position}
        rotation={prop.rotation}
        scale={prop.scale}
        scaleRange={[0.4, 2.5]}
        onChange={(patch, transient) => updateProp(prop.id, patch, transient)}
      />

      <Section title="Directing">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            setFramingSubject(prop.id);
            setInspectorTab("CAMERA");
          }}
        >
          Frame this prop
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="w-full"
          onClick={() => {
            removeProp(prop.id);
            clear();
          }}
        >
          Remove from scene
        </Button>
      </Section>
    </div>
  );
}

function LightPanel({ light }: { light: SceneDoc["lights"][number] }) {
  const updateLight = useSceneStore((s) => s.updateLight);
  const begin = useSceneStore((s) => s.beginInteraction);
  const end = useSceneStore((s) => s.endInteraction);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title={LIGHT_ROLE_LABELS[light.role]}>
        <Row className="justify-between">
          <span className="text-[11px] text-fog-300">Enabled</span>
          <Switch
            checked={light.enabled}
            label="Light enabled"
            onChange={(enabled) => updateLight(light.id, { enabled })}
          />
        </Row>
        <Field label="Intensity" hint={light.intensity.toFixed(2)}>
          <Slider
            value={light.intensity}
            min={0}
            max={5}
            step={0.02}
            onBegin={() => begin("Change intensity")}
            onCommit={end}
            onChange={(intensity) => updateLight(light.id, { intensity }, true)}
          />
        </Field>
        <Field label="Source size" hint={light.size.toFixed(2)}>
          <Slider
            value={light.size}
            min={0.1}
            max={6}
            step={0.05}
            onBegin={() => begin("Change source size")}
            onCommit={end}
            onChange={(size) => updateLight(light.id, { size }, true)}
          />
        </Field>
        <Field label="Colour temperature" hint={`${light.temperature}K`}>
          <Slider
            value={light.temperature}
            min={1800}
            max={10000}
            step={50}
            onBegin={() => begin("Change temperature")}
            onCommit={end}
            onChange={(temperature) =>
              // Temperature is the control; colour is what it produces.
              updateLight(light.id, { temperature, color: kelvinToHex(temperature) }, true)
            }
          />
        </Field>
        <div
          className="h-6 rounded border border-ink-700"
          style={{ background: light.color }}
          aria-hidden
        />
      </Section>

      <Section title="Position">
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((axis, index) => (
            <Field key={axis} label={axis}>
              <NumberScrub
                value={light.position[index]}
                step={0.05}
                onBegin={() => begin("Move light")}
                onCommit={end}
                onChange={(value) => {
                  const next: Vec3 = [...light.position];
                  next[index] = value;
                  updateLight(light.id, { position: next }, true);
                }}
              />
            </Field>
          ))}
        </div>
      </Section>
    </div>
  );
}
