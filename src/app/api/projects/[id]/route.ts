import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/db/projects";
import type { ProjectDoc } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const patch = (await request.json()) as Partial<ProjectDoc>;
  await updateProject(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
