import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/projects";
import { StudioShell } from "@/components/project/StudioShell";

export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return <StudioShell project={project}>{children}</StudioShell>;
}
