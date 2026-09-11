"use client";

import Link from "next/link";
import { getEnvironment } from "@/data/environments";
import type { ProjectSummary } from "@/types";

const FORMAT_LABELS: Record<string, string> = {
  SHORT_FILM: "Short Film",
  MUSIC_VIDEO: "Music Video",
  COMMERCIAL: "Commercial",
  SCENE_EXERCISE: "Scene Exercise",
  EXPERIMENTAL: "Experimental",
  OTHER: "Film",
};

function runtimeLabel(seconds: number): string {
  if (seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function editedLabel(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

/** Where the film actually is, computed from its contents — never a guess. */
function stage(project: ProjectSummary): { label: string; step: number } {
  if (project.shotCount > 0) return { label: "Shots captured", step: 3 };
  if (project.sceneCount > 0) return { label: "Blocking", step: 2 };
  return { label: "Empty set", step: 1 };
}

export function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="slate text-fog-300">No films yet</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fog-400">
          A film is a place to try things. Start one and put someone in a room.
        </p>
        <Link
          href="/projects/new"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-amber-film px-5 text-sm font-medium text-ink-950 transition-colors hover:bg-[#e5bb63]"
        >
          + New Film
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => {
        const environment = project.environmentId ? getEnvironment(project.environmentId) : null;
        const gradient = environment?.thumbnail ?? "linear-gradient(150deg,#22252a,#0e1012)";
        const { label, step } = stage(project);
        return (
          <Link
            key={project.id}
            href={`/studio/${project.id}`}
            className="animate-fade-up group overflow-hidden rounded-md border border-ink-800 bg-ink-850 transition-colors duration-200 hover:border-ink-600"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div
              className="relative h-36 w-full overflow-hidden"
              style={{ background: gradient }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
              {project.isDemo ? (
                <span className="slate absolute left-3 top-3 rounded border border-ink-600 bg-ink-950/70 px-1.5 py-0.5 text-amber-film">
                  Demo
                </span>
              ) : null}
              <span className="slate absolute bottom-3 left-3 text-fog-200">
                {project.location || environment?.name || "No set yet"}
                {project.timeOfDay ? ` · ${project.timeOfDay.toLowerCase()}` : ""}
              </span>
              <span className="numeric absolute bottom-3 right-3 text-[10px] text-fog-200">
                {runtimeLabel(project.runtime)}
              </span>
            </div>

            <div className="px-3 py-3">
              <h3 className="truncate text-[13px] font-medium tracking-wide text-fog-100">
                {project.title}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-fog-400">
                {project.genre || FORMAT_LABELS[project.format] || "Film"}
              </p>
              <p className="numeric mt-2 text-[10px] text-fog-400">
                {project.sceneCount} scene{project.sceneCount === 1 ? "" : "s"} ·{" "}
                {project.shotCount} shot{project.shotCount === 1 ? "" : "s"}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-ink-800 pt-2.5">
                <span className="flex items-center gap-1.5">
                  {[1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`h-1 w-1 rounded-full ${dot <= step ? "bg-amber-film" : "bg-ink-600"}`}
                    />
                  ))}
                  <span className="slate ml-1">{label}</span>
                </span>
                <span className="slate transition-colors group-hover:text-amber-film">
                  Continue →
                </span>
              </div>
              <p className="slate mt-2">Edited {editedLabel(project.updatedAt)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
