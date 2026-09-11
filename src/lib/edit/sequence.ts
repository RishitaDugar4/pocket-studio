import type { ProjectDoc, SceneDoc, ShotDoc, TimelineItemDoc, TransitionType } from "@/types";

/**
 * Turning a list of clips into "what is on screen at 12.4 seconds". Pure, so
 * playback, the scrubber and (later) export all agree on the cut.
 */

export interface ResolvedClip {
  item: TimelineItemDoc;
  shot: ShotDoc;
  scene: SceneDoc;
  /** Position in the sequence. */
  start: number;
  end: number;
  /** Playable length after trimming. */
  length: number;
}

export const TRANSITION_SECONDS: Record<TransitionType, number> = {
  CUT: 0,
  FADE: 0.5,
  DISSOLVE: 0.6,
};

export function clipLength(item: TimelineItemDoc, shot: ShotDoc | undefined): number {
  const source = shot?.duration ?? item.duration;
  return Math.max(source - item.trimIn - item.trimOut, 0.1);
}

/** Video clips are packed end to end in index order — cuts, not gaps. */
export function resolveSequence(project: ProjectDoc): ResolvedClip[] {
  const shots = new Map<string, { shot: ShotDoc; scene: SceneDoc }>();
  for (const scene of project.scenes) {
    for (const shot of scene.shots) shots.set(shot.id, { shot, scene });
  }

  const clips: ResolvedClip[] = [];
  let cursor = 0;
  for (const item of project.timeline
    .filter((i) => i.track === "VIDEO")
    .sort((a, b) => a.index - b.index)) {
    const found = item.shotId ? shots.get(item.shotId) : undefined;
    if (!found) continue; // the shot was deleted; the clip simply is not there
    const length = clipLength(item, found.shot);
    clips.push({
      item,
      shot: found.shot,
      scene: found.scene,
      start: cursor,
      end: cursor + length,
      length,
    });
    cursor += length;
  }
  return clips;
}

export function sequenceDuration(clips: ResolvedClip[]): number {
  return clips.length ? clips[clips.length - 1].end : 0;
}

export interface PlayheadState {
  clip: ResolvedClip | null;
  /** Seconds into the clip's source, including its trim. */
  sourceTime: number;
  /** 0 = fully black / fully outgoing, 1 = fully this clip. */
  opacity: number;
  /** The clip being mixed out of, while a dissolve is running. */
  outgoing: ResolvedClip | null;
}

/** What the viewer sees at `time`, including any transition in progress. */
export function playheadAt(clips: ResolvedClip[], time: number): PlayheadState {
  if (clips.length === 0) return { clip: null, sourceTime: 0, opacity: 1, outgoing: null };

  const clamped = Math.max(time, 0);
  const index = clips.findIndex((clip) => clamped < clip.end);
  const clip = index === -1 ? clips[clips.length - 1] : clips[index];
  const local = Math.min(Math.max(clamped - clip.start, 0), clip.length);
  const sourceTime = clip.item.trimIn + local;

  const transition = clip.item.transition;
  const window = TRANSITION_SECONDS[transition];
  let opacity = 1;
  let outgoing: ResolvedClip | null = null;

  if (window > 0 && local < window) {
    opacity = local / window;
    const previous = clips[clips.indexOf(clip) - 1] ?? null;
    if (transition === "DISSOLVE") outgoing = previous;
  }

  return { clip, sourceTime, opacity, outgoing };
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60);
  const frames = Math.floor((safe % 1) * 24);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

/** Audio clips that should be sounding at `time`. */
export function audioAt(
  project: ProjectDoc,
  time: number,
): Array<{ item: TimelineItemDoc; offset: number }> {
  return project.timeline
    .filter((item) => item.track !== "VIDEO" && item.audioAssetId)
    .filter((item) => time >= item.startTime && time < item.startTime + item.duration)
    .map((item) => ({ item, offset: time - item.startTime + item.trimIn }));
}
