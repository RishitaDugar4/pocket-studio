"use client";

import { formatTimecode, playheadAt, type ResolvedClip } from "@/lib/edit/sequence";
import { getShotSizeSpec } from "@/lib/cinematography";
import { useTimelineStore } from "@/stores/timelineStore";

/**
 * Export (§31). The previs is recorded the way it plays: the sequence runs in
 * real time and every frame is composited into a second canvas — both decks of
 * a dissolve, the fade, and any overlays — which is what MediaRecorder writes.
 *
 * Compositing through our own canvas rather than capturing the WebGL one is
 * what makes burned-in labels possible at all, and it is the seam where a
 * server-side FFmpeg encoder would slot in later: the same per-frame draw,
 * handed to a different sink.
 */
export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  includeAudio: boolean;
  shotLabels: boolean;
  timecode: boolean;
  storyboardOverlay: boolean;
}

export interface ExportResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function supportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** One audio graph per page: a second source node on an element throws. */
let audioContext: AudioContext | null = null;
const audioSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function buildAudioStream(): MediaStream | null {
  const elements = Array.from(document.querySelectorAll("audio"));
  if (elements.length === 0) return null;

  audioContext ??= new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  for (const element of elements) {
    let source = audioSources.get(element);
    if (!source) {
      source = audioContext.createMediaElementSource(element);
      audioSources.set(element, source);
      // Keep it audible as well as recorded.
      source.connect(audioContext.destination);
    }
    source.connect(destination);
  }

  void audioContext.resume();
  return destination.stream;
}

interface StageLayer {
  canvas: HTMLCanvasElement;
  opacity: number;
}

/** The decks currently on screen, with the opacity each is being mixed at. */
function readStage(stage: HTMLElement): { layers: StageLayer[]; fade: number } {
  const layers: StageLayer[] = [];
  for (const deck of Array.from(stage.querySelectorAll<HTMLElement>("[data-deck]"))) {
    const canvas = deck.querySelector("canvas");
    const opacity = Number.parseFloat(deck.style.opacity || "1");
    if (canvas && opacity > 0.001) layers.push({ canvas, opacity });
  }
  // Most opaque first, so the incoming deck mixes over the outgoing one.
  layers.sort((a, b) => b.opacity - a.opacity);
  const fadeElement = stage.querySelector<HTMLElement>("[data-fade]");
  return { layers, fade: fadeElement ? Number.parseFloat(fadeElement.style.opacity || "0") : 0 };
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
) {
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(
    source,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

export async function recordSequence({
  stage,
  clips,
  duration,
  options,
  onProgress,
}: {
  stage: HTMLElement;
  clips: ResolvedClip[];
  duration: number;
  options: ExportOptions;
  onProgress?: (seconds: number) => void;
}): Promise<ExportResult> {
  const mimeType = supportedMimeType();
  if (!mimeType) throw new Error("This browser cannot record video.");
  if (duration <= 0 || clips.length === 0) throw new Error("There is nothing in the cut to export.");

  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not open a drawing context.");

  const stream = canvas.captureStream(options.fps);
  if (options.includeAudio) {
    const audio = buildAudioStream();
    for (const track of audio?.getAudioTracks() ?? []) stream.addTrack(track);
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const timeline = useTimelineStore.getState();
  timeline.setLoop(false);
  timeline.setDuration(duration);
  timeline.setTime(0);

  const frames = new Map<string, HTMLImageElement>();
  if (options.storyboardOverlay) {
    await Promise.all(
      clips
        .filter((clip) => clip.shot.frameUrl)
        .map(
          (clip) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.crossOrigin = "anonymous";
              image.onload = () => {
                frames.set(clip.item.id, image);
                resolve();
              };
              image.onerror = () => resolve();
              image.src = clip.shot.frameUrl as string;
            }),
        ),
    );
  }

  const started = performance.now();
  recorder.start();
  // Give the first frame a moment to be on screen before the clock starts.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  useTimelineStore.getState().play();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const { currentTime } = useTimelineStore.getState();
      const state = playheadAt(clips, currentTime);

      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const { layers, fade } = readStage(stage);
      for (const layer of layers) {
        context.globalAlpha = layer.opacity;
        drawCover(
          context,
          layer.canvas,
          layer.canvas.width,
          layer.canvas.height,
          canvas.width,
          canvas.height,
        );
      }
      context.globalAlpha = 1;

      if (fade > 0) {
        context.fillStyle = `rgba(0,0,0,${fade})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      drawOverlays(context, canvas, state.clip, currentTime, options, frames);
      onProgress?.(currentTime);

      if (currentTime >= duration - 0.001) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  useTimelineStore.getState().pause();
  // Let the encoder flush the tail before closing the file.
  await new Promise((resolve) => setTimeout(resolve, 220));

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.stop();
  });

  for (const track of stream.getTracks()) track.stop();

  return { blob, durationMs: performance.now() - started, mimeType };
}

function drawOverlays(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  clip: ResolvedClip | null,
  currentTime: number,
  options: ExportOptions,
  frames: Map<string, HTMLImageElement>,
) {
  const scale = canvas.height / 720;
  const margin = 24 * scale;

  if (options.shotLabels && clip) {
    const size = getShotSizeSpec(clip.shot.shotSize);
    const label = `${String(clip.item.index + 1).padStart(2, "0")}  ${clip.shot.name}`;
    const movement = clip.shot.movements[0];
    const detail = `${size.short} · ${Math.round(clip.shot.cameraState.focalLength)}mm${
      movement ? ` · ${movement.type.replace(/_/g, " ").toLowerCase()}` : ""
    }`;

    context.font = `${Math.round(15 * scale)}px ui-monospace, monospace`;
    const width = Math.max(context.measureText(label).width, context.measureText(detail).width);
    context.fillStyle = "rgba(0,0,0,0.55)";
    context.fillRect(margin - 8 * scale, margin - 8 * scale, width + 16 * scale, 46 * scale);
    context.fillStyle = "#e4e6e7";
    context.fillText(label, margin, margin + 12 * scale);
    context.fillStyle = "#d8ab4f";
    context.fillText(detail, margin, margin + 32 * scale);
  }

  if (options.timecode) {
    context.font = `${Math.round(15 * scale)}px ui-monospace, monospace`;
    const text = formatTimecode(currentTime);
    const width = context.measureText(text).width;
    context.fillStyle = "rgba(0,0,0,0.55)";
    context.fillRect(
      canvas.width - margin - width - 8 * scale,
      canvas.height - margin - 20 * scale,
      width + 16 * scale,
      28 * scale,
    );
    context.fillStyle = "#e4e6e7";
    context.fillText(text, canvas.width - margin - width, canvas.height - margin);
  }

  if (options.storyboardOverlay && clip) {
    const image = frames.get(clip.item.id);
    if (image) {
      const width = canvas.width * 0.18;
      const height = (width / image.width) * image.height;
      const x = canvas.width - margin - width;
      const y = margin;
      context.fillStyle = "rgba(0,0,0,0.6)";
      context.fillRect(x - 3 * scale, y - 3 * scale, width + 6 * scale, height + 6 * scale);
      context.drawImage(image, x, y, width, height);
      context.font = `${Math.round(11 * scale)}px ui-monospace, monospace`;
      context.fillStyle = "#b4b9bd";
      context.fillText("BOARD", x, y + height + 14 * scale);
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
