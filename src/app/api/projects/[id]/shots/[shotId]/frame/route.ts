import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decodeDataUrl, storage, storageKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string; shotId: string }> };

/** Stores the frame grabbed at capture time as the shot's storyboard image. */
export async function PUT(request: Request, { params }: Params) {
  const { id, shotId } = await params;
  const body = (await request.json()) as { image?: string; width?: number; height?: number };
  const decoded = body.image ? decodeDataUrl(body.image) : null;
  if (!decoded) return NextResponse.json({ error: "Expected an image data URL." }, { status: 400 });

  const shot = await prisma.shot.findFirst({
    where: { id: shotId, scene: { projectId: id } },
    include: { storyboardFrame: true },
  });
  if (!shot) return NextResponse.json({ error: "Shot not found." }, { status: 404 });

  const key = storageKey(["frames", id, shotId], decoded.contentType);
  await storage.put(key, decoded.data, decoded.contentType);

  // Replace the previous frame rather than letting old ones pile up.
  if (shot.storyboardFrame) await storage.remove(shot.storyboardFrame.imageKey);

  await prisma.storyboardFrame.upsert({
    where: { shotId },
    create: {
      shotId,
      imageKey: key,
      width: body.width ?? 640,
      height: body.height ?? 360,
    },
    update: { imageKey: key, width: body.width ?? 640, height: body.height ?? 360 },
  });

  return NextResponse.json({ frameUrl: storage.url(key) });
}
