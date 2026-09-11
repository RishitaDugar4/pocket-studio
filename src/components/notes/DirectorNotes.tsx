"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { getChallenge } from "@/data/challenges";
import {
  analyseProject,
  shotSizeHistogram,
  shotsInOrder,
  type DirectorNote,
} from "@/lib/continuity/analyse";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";

const KIND_LABELS: Record<DirectorNote["kind"], string> = {
  PACING: "Shot pacing",
  COVERAGE: "Coverage",
  CAMERA: "Camera",
  COMPOSITION: "Composition",
  CONTINUITY: "Continuity",
  EXPERIMENT: "Experiment",
};

/**
 * Director's notes (§26). Measured, never graded: the app tells you what you
 * did, and leaves what it means to you.
 */
export function DirectorNotes() {
  const project = useProjectStore((s) => s.project);
  const activeScene = useSceneStore((s) => s.scene);
  const router = useRouter();

  const merged = useMemo(() => {
    if (!project) return null;
    if (!activeScene) return project;
    return {
      ...project,
      scenes: project.scenes.map((scene) =>
        scene.id === activeScene.id ? activeScene : scene,
      ),
    };
  }, [project, activeScene]);

  const analysis = useMemo(() => (merged ? analyseProject(merged) : null), [merged]);
  const shots = useMemo(() => (merged ? shotsInOrder(merged) : []), [merged]);
  const histogram = useMemo(() => shotSizeHistogram(shots), [shots]);

  if (!project || !analysis) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  if (analysis.shotCount === 0) {
    return (
      <EmptyState
        title="No notes yet"
        body="Capture a few shots and this page will tell you what you actually did — how fast you cut, what coverage you have, where you put the camera and where your subjects sit in frame."
        action={
          <Button variant="primary" onClick={() => router.push(`/studio/${project.id}/scenes`)}>
            Open Scene Builder →
          </Button>
        }
      />
    );
  }

  const challenge = project.challengeSlug ? getChallenge(project.challengeSlug) : undefined;
  const warnings = analysis.notes.filter((note) => note.severity === "WARNING");
  const rest = analysis.notes.filter((note) => note.severity !== "WARNING");
  const peak = Math.max(...histogram.map((entry) => entry.count), 1);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-7">
          <h1 className="text-lg font-medium tracking-wide text-fog-100">Director&apos;s notes</h1>
          <p className="numeric mt-1 text-[11px] text-fog-400">
            {analysis.shotCount} shots · {analysis.runtime.toFixed(1)}s · measured from your film,
            not judged
          </p>
        </header>

        {challenge ? (
          <section className="panel mb-6 p-4">
            <p className="slate text-amber-dim">Challenge · {challenge.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-fog-200">{challenge.prompt}</p>
            <ul className="mt-3 space-y-1">
              {challenge.constraints.map((constraint) => (
                <li key={constraint} className="text-[11px] leading-relaxed text-fog-400">
                  · {constraint}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Average shot" value={`${analysis.pacing.average.toFixed(1)}s`} hint={analysis.pacing.character} />
          <Stat
            label="Range"
            value={`${analysis.pacing.shortest.toFixed(1)}–${analysis.pacing.longest.toFixed(1)}s`}
            hint="shortest to longest"
          />
          <Stat
            label="Camera"
            value={`${analysis.camera.static} / ${analysis.camera.moving}`}
            hint="static / moving"
          />
          <Stat
            label="Lenses"
            value={`${Math.round(analysis.camera.widest)}–${Math.round(analysis.camera.longest)}mm`}
            hint={`${analysis.camera.lenses.length} in use`}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            {warnings.length > 0 ? (
              <section>
                <h2 className="slate mb-2 text-alert">Worth a look</h2>
                <div className="space-y-2">
                  {warnings.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="slate mb-2">What you did</h2>
              <div className="space-y-2">
                {rest.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section>
              <h2 className="slate mb-2">Coverage</h2>
              <ul className="panel divide-y divide-ink-800">
                {analysis.coverage.map((entry) => (
                  <li key={entry.label} className="flex items-baseline gap-2 px-3 py-2">
                    <span
                      className={cn(
                        "numeric w-3 shrink-0 text-center",
                        entry.present ? "text-amber-film" : "text-fog-500",
                      )}
                    >
                      {entry.present ? "✓" : "✕"}
                    </span>
                    <span className="text-[12px] text-fog-200">{entry.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="slate mb-2">Shot sizes</h2>
              <div className="panel space-y-1.5 p-3">
                {histogram.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2">
                    <span className="slate w-8 shrink-0">{entry.label}</span>
                    <span className="h-1.5 min-w-0 flex-1 rounded-full bg-ink-800">
                      <span
                        className="block h-full rounded-full bg-amber-dim"
                        style={{ width: `${(entry.count / peak) * 100}%` }}
                      />
                    </span>
                    <span className="numeric w-4 shrink-0 text-right text-[10px] text-fog-400">
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="slate mb-2">Subject placement</h2>
              <div className="panel grid grid-cols-3 divide-x divide-ink-800">
                {(
                  [
                    ["Left", analysis.composition.left],
                    ["Centre", analysis.composition.centre],
                    ["Right", analysis.composition.right],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="px-2 py-2.5 text-center">
                    <div className="numeric text-sm text-fog-100">{count}</div>
                    <div className="slate mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel px-3 py-3">
      <div className="slate">{label}</div>
      <div className="numeric mt-1 text-lg text-fog-100">{value}</div>
      <div className="slate mt-0.5 text-fog-500">{hint}</div>
    </div>
  );
}

function NoteCard({ note }: { note: DirectorNote }) {
  return (
    <article
      className={cn(
        "rounded border px-3.5 py-3",
        note.severity === "WARNING"
          ? "border-[#4a2c24] bg-[#1d1613]"
          : "border-ink-800 bg-ink-850",
      )}
    >
      <p className={cn("slate", note.severity === "WARNING" ? "text-alert" : "text-amber-dim")}>
        {KIND_LABELS[note.kind]}
      </p>
      <h3 className="mt-1 text-[13px] text-fog-100">{note.title}</h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-fog-400">{note.detail}</p>
    </article>
  );
}
