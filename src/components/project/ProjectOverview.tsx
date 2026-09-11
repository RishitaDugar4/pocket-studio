"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getChallenge } from "@/data/challenges";
import { getEnvironment } from "@/data/environments";
import { Button } from "@/components/ui/Button";
import { Select, TextArea, TextInput } from "@/components/ui/Inputs";
import { Field } from "@/components/ui/Panel";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { PROJECT_FORMATS, VISUAL_MOODS, type ProjectFormat, type VisualMood } from "@/types";

const FORMAT_LABELS: Record<ProjectFormat, string> = {
  SHORT_FILM: "Short Film",
  MUSIC_VIDEO: "Music Video",
  COMMERCIAL: "Commercial",
  SCENE_EXERCISE: "Scene Exercise",
  EXPERIMENTAL: "Experimental",
  OTHER: "Other",
};

const MOOD_LABELS: Record<VisualMood, string> = {
  NATURALISTIC: "Naturalistic",
  DREAMLIKE: "Dreamlike",
  DARK: "Dark",
  WARM: "Warm",
  COLD: "Cold",
  TENSE: "Tense",
  MINIMAL: "Minimal",
};

export function ProjectOverview() {
  const project = useProjectStore((s) => s.project);
  const patchProject = useProjectStore((s) => s.patchProject);
  const router = useRouter();

  if (!project) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  const roots = project.scenes.filter((scene) => !scene.parentSceneId);
  const shots = project.scenes.reduce((n, scene) => n + scene.shots.length, 0);
  const runtime = project.scenes.reduce(
    (total, scene) => total + scene.shots.reduce((n, shot) => n + shot.duration, 0),
    0,
  );
  const challenge = project.challengeSlug ? getChallenge(project.challengeSlug) : undefined;

  const openScene = (sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (scene) useSceneStore.getState().loadScene(scene);
    router.push(`/studio/${project.id}/scenes`);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="slate">Film</p>
            <input
              value={project.title}
              onChange={(e) => patchProject({ title: e.target.value })}
              className="mt-1 w-full bg-transparent text-2xl font-medium tracking-wide text-fog-100 outline-none placeholder:text-ink-500"
              placeholder="Untitled Film"
            />

            <div className="mt-6 max-w-xl space-y-3">
              <Field label="Logline">
                <TextArea
                  rows={3}
                  value={project.logline ?? ""}
                  placeholder="One sentence. What happens, and to whom?"
                  onChange={(e) => patchProject({ logline: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Format">
                  <Select<ProjectFormat>
                    value={project.format}
                    onChange={(format) => patchProject({ format })}
                    options={PROJECT_FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] }))}
                  />
                </Field>
                <Field label="Visual mood">
                  <Select<VisualMood>
                    value={project.mood}
                    onChange={(mood) => patchProject({ mood })}
                    options={VISUAL_MOODS.map((m) => ({ value: m, label: MOOD_LABELS[m] }))}
                  />
                </Field>
              </div>
              <Field label="Genre">
                <TextInput
                  value={project.genre ?? ""}
                  placeholder="Psychological drama"
                  onChange={(e) => patchProject({ genre: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <aside className="space-y-4">
            <dl className="panel divide-y divide-ink-800">
              {[
                ["Scenes", String(roots.length)],
                ["Shots", String(shots)],
                ["Runtime", `${runtime.toFixed(1)}s`],
                ["Cast", String(project.cast.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between px-3 py-2.5">
                  <dt className="slate">{label}</dt>
                  <dd className="numeric text-sm text-fog-100">{value}</dd>
                </div>
              ))}
            </dl>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push(`/studio/${project.id}/scenes`)}
            >
              Open Scene Builder
            </Button>

            {challenge ? (
              <div className="panel p-3">
                <p className="slate text-amber-dim">Challenge · {challenge.title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-fog-200">{challenge.prompt}</p>
                <ul className="mt-2 space-y-1">
                  {challenge.constraints.map((constraint) => (
                    <li key={constraint} className="text-[11px] leading-relaxed text-fog-400">
                      · {constraint}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="slate mb-3">Scenes</h2>
          {roots.length === 0 ? (
            <div className="panel px-4 py-8 text-center">
              <p className="slate text-fog-300">No scenes yet</p>
              <p className="mt-2 text-sm text-fog-400">Every film starts with one scene.</p>
              <Link
                href={`/studio/${project.id}/scenes`}
                className="mt-4 inline-flex h-9 items-center rounded-md bg-amber-film px-4 text-sm font-medium text-ink-950"
              >
                + Create scene
              </Link>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roots.map((scene) => {
                const environment = getEnvironment(scene.environmentId);
                const alternatives = project.scenes.filter((s) => s.parentSceneId === scene.id).length;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => openScene(scene.id)}
                    className="group overflow-hidden rounded border border-ink-800 bg-ink-850 text-left transition-colors duration-150 hover:border-ink-600"
                  >
                    <span
                      className="block h-20 w-full"
                      style={{ background: environment.thumbnail }}
                      aria-hidden
                    />
                    <span className="block px-3 py-2.5">
                      <span className="slate">
                        Scene {String(scene.index + 1).padStart(2, "0")}
                        {alternatives > 0
                          ? ` · ${alternatives + 1} versions`
                          : ""}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-fog-100">
                        {scene.name}
                      </span>
                      <span className="numeric mt-1 block text-[10px] text-fog-400">
                        {scene.characters.length} cast · {scene.props.length} props ·{" "}
                        {scene.shots.length} shots
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
