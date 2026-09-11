import { NextResponse } from "next/server";
import { addScene } from "@/lib/db/projects";
import type { TimeOfDay } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    environmentId?: string;
    location?: string;
    timeOfDay?: TimeOfDay;
  };
  const scene = await addScene(id, body);
  return NextResponse.json({ scene }, { status: 201 });
}
