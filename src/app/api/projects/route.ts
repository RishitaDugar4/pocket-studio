import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db/projects";
import type { CreateProjectInput } from "@/lib/db/projects";

export async function GET() {
  return NextResponse.json({ projects: await listProjects() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateProjectInput;
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }
  const project = await createProject(body);
  return NextResponse.json({ project }, { status: 201 });
}
