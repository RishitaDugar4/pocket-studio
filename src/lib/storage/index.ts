import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";

/**
 * Object storage, kept behind an interface so nothing in the app knows where
 * bytes actually live (§Storage).
 *
 * Bytes are kept in the database. The application is deployed to a serverless
 * platform whose filesystem is read-only outside /tmp and is thrown away
 * between invocations, so writing files next to the code does not survive — and
 * would fail outright in production. Using the database the app already has
 * keeps deployment to one managed service; an S3/R2/Blob provider implements
 * the same four methods when the volume justifies it.
 */
export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  remove(key: string): Promise<void>;
  /** Public path the browser can load this object from. */
  url(key: string): string;
}

/** Where the pre-database local provider wrote its files, for reading back. */
const LEGACY_ROOT = path.join(process.cwd(), ".storage");

/** Keys are app-generated, but never trust one enough to escape the root. */
function safePath(key: string): string {
  const normalised = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const resolved = path.resolve(LEGACY_ROOT, normalised);
  if (!resolved.startsWith(LEGACY_ROOT)) throw new Error("Invalid storage key");
  return resolved;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  // Microphone takes. The .weba extension keeps audio distinct from video/webm.
  "audio/webm": ".weba",
  "video/webm": ".webm",
};

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? "";
}

export function contentTypeFor(key: string): string {
  const extension = path.extname(key).toLowerCase();
  const match = Object.entries(EXTENSIONS).find(([, value]) => value === extension);
  return match?.[0] ?? "application/octet-stream";
}

class DatabaseStorage implements StorageProvider {
  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const size = data.byteLength;
    // Prisma maps Bytes to Uint8Array; Buffer is one, but not the same generic.
    const bytes = new Uint8Array(data);
    await prisma.storedAsset.upsert({
      where: { key },
      create: { key, contentType, size, data: bytes },
      update: { contentType, size, data: bytes },
    });
    return { key, contentType, size };
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    const row = await prisma.storedAsset.findUnique({ where: { key } });
    if (row) return { data: Buffer.from(row.data), contentType: row.contentType };

    // Assets written by the earlier local-disk provider are still readable in a
    // development checkout, so an existing storyboard does not go blank after
    // the switch. There is no such directory in production.
    try {
      const data = await readFile(safePath(key));
      return { data, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await prisma.storedAsset.deleteMany({ where: { key } });
  }

  url(key: string): string {
    return `/api/assets/${key}`;
  }
}

export const storage: StorageProvider = new DatabaseStorage();

/** Decodes a `data:` URL produced by the viewport's frame grab. */
export function decodeDataUrl(dataUrl: string): { data: Buffer; contentType: string } | null {
  const match = /^data:([a-z]+\/[a-z0-9+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], data: Buffer.from(match[2], "base64") };
}

export function storageKey(parts: string[], contentType: string): string {
  const hash = createHash("sha1").update(`${parts.join("/")}:${Date.now()}`).digest("hex").slice(0, 10);
  return `${parts.join("/")}-${hash}${extensionFor(contentType)}`;
}
