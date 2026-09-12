import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toAudioAsset } from "@/lib/db/serialize";
import { storage, storageKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  // Microphone recordings.
  "audio/webm",
]);

/** Browsers append codec parameters: "audio/webm;codecs=opus". */
function baseType(contentType: string): string {
  return contentType.split(";")[0]!.trim().toLowerCase();
}

/** Uploads one sound and registers it on the project. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "SFX");
  const duration = Number.parseFloat(String(form.get("duration") ?? "0"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected an audio file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 25 MB." }, { status: 413 });
  }
  const contentType = baseType(file.type || "audio/mpeg");
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${contentType}` },
      { status: 415 },
    );
  }

  const key = storageKey(["audio", id, file.name.replace(/[^a-z0-9.]+/gi, "-")], contentType);
  await storage.put(key, Buffer.from(await file.arrayBuffer()), contentType);

  const asset = await prisma.audioAsset.create({
    data: {
      projectId: id,
      name: file.name.replace(/\.[^.]+$/, ""),
      kind,
      storageKey: key,
      duration: Number.isFinite(duration) ? duration : 0,
    },
  });

  return NextResponse.json({ asset: toAudioAsset(asset as unknown as Record<string, unknown>) });
}
