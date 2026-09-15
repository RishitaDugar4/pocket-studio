import Link from "next/link";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { listProjects } from "@/lib/db/projects";
import { ensureDemoProject } from "@/lib/db/demo";
import type { ProjectSummary } from "@/types";

// The dashboard reads the database on every request, so it is never prerendered
// and never needs a database connection at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let projects: ProjectSummary[] = [];
  let unreachable = false;

  try {
    // The demo film must be there on first launch (§42).
    await ensureDemoProject();
    projects = await listProjects();
  } catch (error) {
    // A database that is missing, unmigrated or unreachable should say so on
    // the page rather than becoming an opaque 500.
    console.error("Could not load projects", error);
    unreachable = true;
  }

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
          {unreachable ? (
            <div className="panel px-6 py-10 text-center">
              <p className="slate text-alert">Cannot reach the database</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fog-400">
                Pocket Studio keeps every film in PostgreSQL. Check that{" "}
                <span className="numeric text-fog-200">DATABASE_URL</span> is set for this
                environment and that the migrations have been applied. The server log has the
                underlying error.
              </p>
            </div>
          ) : (
            <ProjectGrid projects={projects} />
          )}
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
