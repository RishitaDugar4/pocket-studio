import { NextResponse } from "next/server";
import { duplicateScene } from "@/lib/db/projects";

type Params = { params: Promise<{ id: string; sceneId: string }> };

/** Creates an alternative take of a scene (§21). */
export async function POST(request: Request, { params }: Params) {
  const { sceneId } = await params;
  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const scene = await duplicateScene(sceneId, body.label);
  return NextResponse.json({ scene }, { status: 201 });
}
