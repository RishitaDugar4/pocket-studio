"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/components/ui/cn";
import { useAutosave } from "@/features/persistence/useAutosave";
import { useStudioShortcuts } from "@/features/shortcuts/useStudioShortcuts";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import type { ProjectDoc } from "@/types";
import { SaveIndicator } from "./SaveIndicator";

const SECTIONS = [
  { segment: "", label: "Overview" },
  { segment: "script", label: "Script" },
  { segment: "scenes", label: "Scenes" },
  { segment: "storyboard", label: "Storyboard" },
  { segment: "edit", label: "Edit" },
  { segment: "export", label: "Export" },
] as const;

/**
 * Persistent project context (§6). The project is hydrated into the client
 * stores once; navigating between sections never reloads or discards edits.
 */
export function StudioShell({
  project,
  children,
}: {
  project: ProjectDoc;
  children: React.ReactNode;
}) {
  const loadProject = useProjectStore((s) => s.loadProject);
  const loadedId = useProjectStore((s) => s.project?.id);
  const pathname = usePathname();

  useEffect(() => {
    if (loadedId !== project.id) {
      loadProject(project);
      const first = project.scenes[0];
      if (first) useSceneStore.getState().loadScene(first);
    }
  }, [project, loadedId, loadProject]);

  useAutosave();
  useStudioShortcuts();

  const base = `/studio/${project.id}`;
  const title = useProjectStore((s) => s.project?.title) ?? project.title;

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-ink-800 bg-ink-900 px-3">
        <Link
          href="/"
          className="slate shrink-0 transition-colors hover:text-fog-100"
          title="All films"
        >
          ← Pocket Studio
        </Link>
        <div className="h-5 w-px bg-ink-700" />
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-[13px] font-medium tracking-wide text-fog-100">{title}</h1>
          <SaveIndicator />
        </div>

        <nav className="ml-auto flex items-center gap-0.5">
          {SECTIONS.map((section) => {
            const href = section.segment ? `${base}/${section.segment}` : base;
            const active = section.segment
              ? pathname.startsWith(href)
              : pathname === base || pathname === `${base}/`;
            return (
              <Link
                key={section.segment}
                href={href}
                className={cn(
                  "slate rounded px-2.5 py-1.5 transition-colors duration-150",
                  active ? "bg-ink-700 text-fog-100" : "hover:text-fog-200",
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
