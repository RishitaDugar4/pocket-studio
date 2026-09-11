import { NextResponse } from "next/server";
import { saveTimeline } from "@/lib/db/projects";
import type { TimelineItemDoc } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { items?: TimelineItemDoc[] };
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "Expected a list of timeline items." }, { status: 400 });
  }
  await saveTimeline(id, body.items);
  return NextResponse.json({ ok: true });
}
