import { NextResponse } from "next/server";
import { addScene, type AddSceneInput } from "@/lib/db/projects";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as AddSceneInput;
  const scene = await addScene(id, body);
  return NextResponse.json({ scene }, { status: 201 });
}
