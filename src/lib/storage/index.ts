import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Object storage, kept behind an interface so nothing in the app knows where
 * bytes actually live (§Storage). The local-disk provider is what runs in
 * development; an S3/R2 provider implements the same three methods.
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

const ROOT = path.join(process.cwd(), ".storage");

/** Keys are app-generated, but never trust one enough to escape the root. */
function safePath(key: string): string {
  const normalised = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const resolved = path.resolve(ROOT, normalised);
  if (!resolved.startsWith(ROOT)) throw new Error("Invalid storage key");
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

class LocalDiskStorage implements StorageProvider {
  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const target = safePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    return { key, contentType, size: data.byteLength };
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const data = await readFile(safePath(key));
      return { data, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(safePath(key));
    } catch {
      // Deleting something that is already gone is not an error.
    }
  }

  url(key: string): string {
    return `/api/assets/${key}`;
  }
}

export const storage: StorageProvider = new LocalDiskStorage();

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
