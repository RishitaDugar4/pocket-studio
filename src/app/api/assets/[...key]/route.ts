import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

/** Serves stored objects (storyboard frames, audio) through the storage layer. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const object = await storage.get(key.join("/"));
  if (!object) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return new NextResponse(new Uint8Array(object.data), {
    headers: {
      "content-type": object.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
