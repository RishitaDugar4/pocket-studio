"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ENVIRONMENTS } from "@/data/environments";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import type { ProjectDoc, ProjectFormat, VisualMood } from "@/types";

const FORMATS: Array<{ value: ProjectFormat; label: string; hint: string }> = [
  { value: "SHORT_FILM", label: "Short Film", hint: "A few scenes, one idea." },
  { value: "MUSIC_VIDEO", label: "Music Video", hint: "Image led, cut to sound." },
  { value: "COMMERCIAL", label: "Commercial", hint: "Short, precise, one message." },
  { value: "SCENE_EXERCISE", label: "Scene Exercise", hint: "One scene, done properly." },
  { value: "EXPERIMENTAL", label: "Experimental", hint: "No rules to follow." },
  { value: "OTHER", label: "Other", hint: "Something else entirely." },
];

/** Mood picks the starting light rig — the fastest way to set a tone. */
const MOODS: Array<{ value: VisualMood; label: string; lighting: string; environment: string }> = [
  { value: "NATURALISTIC", label: "Naturalistic", lighting: "NATURAL_DAY", environment: "apartment" },
  { value: "DREAMLIKE", label: "Dreamlike", lighting: "GOLDEN_HOUR", environment: "park" },
  { value: "DARK", label: "Dark", lighting: "CINEMATIC_LOW_KEY", environment: "apartment" },
  { value: "WARM", label: "Warm", lighting: "WARM_INTERIOR", environment: "apartment" },
  { value: "COLD", label: "Cold", lighting: "FLUORESCENT", environment: "office" },
  { value: "TENSE", label: "Tense", lighting: "NIGHT", environment: "street" },
  { value: "MINIMAL", label: "Minimal", lighting: "NATURAL_DAY", environment: "bedroom" },
];

export function NewFilmFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ProjectFormat>("SHORT_FILM");
  const [mood, setMood] = useState<VisualMood>("NATURALISTIC");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setCreating(true);
    setError(null);
    const moodChoice = MOODS.find((m) => m.value === mood)!;
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled Film",
          format,
          mood,
          environmentId: moodChoice.environment,
          lightingPreset: moodChoice.lighting,
        }),
      });
      if (!response.ok) throw new Error("Could not create the film.");
      const { project } = (await response.json()) as { project: ProjectDoc };
      router.push(`/studio/${project.id}/scenes`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 py-12">
      <Link href="/" className="slate transition-colors hover:text-fog-100">
        ← All films
      </Link>

      <div className="mt-10 flex-1">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                "h-0.5 w-8 rounded-full transition-colors",
                index <= step ? "bg-amber-film" : "bg-ink-700",
              )}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="animate-fade-up mt-8">
            <h1 className="text-lg font-medium tracking-wide text-fog-100">
              What&apos;s your film called?
            </h1>
            <p className="mt-2 text-sm text-fog-400">You can change this later.</p>
            <TextInput
              autoFocus
              value={title}
              placeholder="The Last Call"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setStep(1);
              }}
              className="mt-6 h-11 text-base"
            />
            <div className="mt-6 flex gap-2">
              <Button variant="primary" size="lg" onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="animate-fade-up mt-8">
            <h1 className="text-lg font-medium tracking-wide text-fog-100">
              What are you making?
            </h1>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {FORMATS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setFormat(option.value);
                    setStep(2);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left transition-colors duration-150",
                    format === option.value
                      ? "border-amber-dim bg-[#221d14]"
                      : "border-ink-700 bg-ink-850 hover:border-ink-600",
                  )}
                >
                  <span className="block text-[13px] text-fog-100">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] text-fog-400">{option.hint}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="slate mt-6 transition-colors hover:text-fog-100"
            >
              ← Back
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="animate-fade-up mt-8">
            <h1 className="text-lg font-medium tracking-wide text-fog-100">
              What&apos;s the visual mood?
            </h1>
            <p className="mt-2 text-sm text-fog-400">
              This picks your opening set and light rig. Everything stays editable.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {MOODS.map((option) => {
                const environment = ENVIRONMENTS.find((e) => e.id === option.environment);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood(option.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150",
                      mood === option.value
                        ? "border-amber-dim bg-[#221d14]"
                        : "border-ink-700 bg-ink-850 hover:border-ink-600",
                    )}
                  >
                    <span
                      className="h-9 w-9 shrink-0 rounded border border-ink-700"
                      style={{ background: environment?.thumbnail }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-fog-100">{option.label}</span>
                      <span className="block truncate text-[11px] text-fog-400">
                        {environment?.name} · {option.lighting.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? <p className="mt-4 text-[12px] text-alert">{error}</p> : null}

            <div className="mt-7 flex items-center gap-2">
              <Button variant="primary" size="lg" onClick={create} disabled={creating}>
                {creating ? "Creating…" : "Create film"}
              </Button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="slate transition-colors hover:text-fog-100"
              >
                ← Back
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
