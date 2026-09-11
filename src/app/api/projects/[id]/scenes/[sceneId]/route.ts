import { NextResponse } from "next/server";
import { deleteScene, saveScene } from "@/lib/db/projects";
import type { CastMemberDoc, SceneDoc } from "@/types";

type Params = { params: Promise<{ id: string; sceneId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id, sceneId } = await params;
  const body = (await request.json()) as { scene: SceneDoc; cast: CastMemberDoc[] };
  if (!body?.scene || body.scene.id !== sceneId || body.scene.projectId !== id) {
    return NextResponse.json({ error: "Scene payload does not match the URL." }, { status: 400 });
  }
  await saveScene(body.scene, body.cast ?? []);
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { sceneId } = await params;
  await deleteScene(sceneId);
  return NextResponse.json({ ok: true });
}
