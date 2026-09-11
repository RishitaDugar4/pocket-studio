"use client";

import { ENVIRONMENTS } from "@/data/environments";
import { Select, TextArea, TextInput } from "@/components/ui/Inputs";
import { Field, Section } from "@/components/ui/Panel";
import { useSceneStore } from "@/stores/sceneStore";
import { TIMES_OF_DAY, type SceneDoc, type TimeOfDay } from "@/types";

export function SceneInspector({ scene }: { scene: SceneDoc }) {
  const patchScene = useSceneStore((s) => s.patchScene);
  const setEnvironment = useSceneStore((s) => s.setEnvironment);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title="Slate">
        <Field label="Scene name">
          <TextInput value={scene.name} onChange={(e) => patchScene({ name: e.target.value })} />
        </Field>
        <Field label="Location">
          <TextInput
            value={scene.location}
            onChange={(e) => patchScene({ location: e.target.value })}
          />
        </Field>
        <Field label="Time of day">
          <Select<TimeOfDay>
            value={scene.timeOfDay}
            onChange={(timeOfDay) => patchScene({ timeOfDay })}
            options={TIMES_OF_DAY.map((t) => ({
              value: t,
              label: t.charAt(0) + t.slice(1).toLowerCase(),
            }))}
          />
        </Field>
        <Field label="Version">
          <TextInput
            value={scene.versionLabel}
            onChange={(e) => patchScene({ versionLabel: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="Set">
        <Select
          value={scene.environmentId}
          onChange={setEnvironment}
          options={ENVIRONMENTS.map((e) => ({ value: e.id, label: e.name }))}
        />
      </Section>

      <Section title="Director's notes">
        <TextArea
          rows={6}
          value={scene.notes}
          placeholder="What is this scene really about?"
          onChange={(e) => patchScene({ notes: e.target.value })}
        />
      </Section>

      <Section title="Contents">
        <dl className="numeric space-y-1 text-[10px] text-fog-400">
          {[
            ["Actors", scene.characters.length],
            ["Props", scene.props.length],
            ["Lights", scene.lights.filter((l) => l.enabled).length],
            ["Cameras", scene.cameras.length],
            ["Shots", scene.shots.length],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between">
              <dt>{label}</dt>
              <dd className="text-fog-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
