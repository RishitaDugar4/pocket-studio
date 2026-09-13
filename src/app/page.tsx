import Link from "next/link";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { listProjects } from "@/lib/db/projects";
import { ensureDemoProject } from "@/lib/db/demo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // The demo film must be there on first launch (§42).
  await ensureDemoProject();
  const projects = await listProjects();

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium tracking-[0.22em] text-fog-100">POCKET STUDIO</h1>
            <p className="mt-2 text-sm text-fog-400">Make the movie before you shoot it.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/challenges"
              className="inline-flex h-10 items-center rounded-md border border-ink-600 px-4 text-sm text-fog-200 transition-colors hover:border-ink-500 hover:bg-ink-800"
            >
              Director Challenges
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex h-10 items-center rounded-md bg-amber-film px-5 text-sm font-medium text-ink-950 transition-colors hover:bg-[#e5bb63]"
            >
              + New Film
            </Link>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="slate mb-3">Recent films</h2>
          <ProjectGrid projects={projects} />
        </section>

        <footer className="mt-14 border-t border-ink-800 pt-5">
          <p className="text-[11px] leading-relaxed text-fog-400">
            Script to screen: write it, build the set, block the actors, work the camera — lenses,
            shot sizes, heights, movement, depth of field — capture shots, cut them together with
            sound, read your director&apos;s notes, and export the previs. Everything saves itself.
          </p>
        </footer>
      </div>
    </div>
  );
}
