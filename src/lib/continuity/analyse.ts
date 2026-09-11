import { bodyHeight, poseAimDrop } from "@/data/characters";
import {
  SHOT_SIZE_SPECS,
  getShotSizeSpec,
  projectToFrame,
  sideOfLine,
  v,
} from "@/lib/cinematography";
import { beatsFor, evaluateBlocking } from "@/lib/animation";
import { getEnvironment } from "@/data/environments";
import type { ProjectDoc, SceneDoc, ShotDoc, Vec3 } from "@/types";

/**
 * Director's notes (§26) and continuity checks (§28).
 *
 * Every number here is measured from the project, never guessed and never sent
 * anywhere: pacing is arithmetic, coverage is a set of shot sizes, and the
 * 180° check is which side of a line the camera stood on. Notes describe what
 * the director did — they never grade it.
 */

export type NoteKind =
  | "PACING"
  | "COVERAGE"
  | "CAMERA"
  | "COMPOSITION"
  | "CONTINUITY"
  | "EXPERIMENT";

export type NoteSeverity = "INFO" | "NOTE" | "WARNING";

export interface DirectorNote {
  id: string;
  kind: NoteKind;
  severity: NoteSeverity;
  title: string;
  detail: string;
  shotIds?: string[];
}

export interface CoverageEntry {
  label: string;
  present: boolean;
  detail: string;
}

export interface FilmAnalysis {
  shotCount: number;
  runtime: number;
  pacing: {
    average: number;
    shortest: number;
    longest: number;
    /** Reads as fast / measured / slow, purely from the average. */
    character: string;
  };
  coverage: CoverageEntry[];
  camera: {
    static: number;
    moving: number;
    lenses: Array<{ focalLength: number; count: number }>;
    widest: number;
    longest: number;
  };
  composition: {
    left: number;
    centre: number;
    right: number;
    /** Subjects that never appear in their own shot's frame. */
    offFrame: number;
  };
  notes: DirectorNote[];
}

interface ShotContext {
  shot: ShotDoc;
  scene: SceneDoc;
}

/** Every shot in the film, in cut order when there is a cut, else board order. */
export function shotsInOrder(project: ProjectDoc): ShotContext[] {
  const byId = new Map<string, ShotContext>();
  for (const scene of project.scenes) {
    for (const shot of scene.shots) byId.set(shot.id, { shot, scene });
  }

  const cut = project.timeline
    .filter((item) => item.track === "VIDEO" && item.shotId)
    .sort((a, b) => a.index - b.index)
    .map((item) => byId.get(item.shotId!))
    .filter((entry): entry is ShotContext => !!entry);
  if (cut.length > 0) return cut;

  return project.scenes
    .filter((scene) => !scene.parentSceneId)
    .flatMap((scene) => scene.shots.map((shot) => ({ shot, scene })));
}

/** Where a character is standing when a given shot is taken. */
function subjectPosition(scene: SceneDoc, characterId: string, time: number): Vec3 | null {
  const character = scene.characters.find((c) => c.id === characterId);
  if (!character) return null;
  const state = evaluateBlocking(character, beatsFor(scene, character.id), time);
  return state.position;
}

function headPoint(scene: SceneDoc, characterId: string, time: number): Vec3 | null {
  const character = scene.characters.find((c) => c.id === characterId);
  const position = subjectPosition(scene, characterId, time);
  if (!character || !position) return null;
  const height = bodyHeight(character.definitionId, character.scale);
  const state = evaluateBlocking(character, beatsFor(scene, character.id), time);
  const drop = state.seated ? poseAimDrop(character.definitionId, character.scale, "SIT") : 0;
  return [position[0], position[1] + height * 0.88 - drop, position[2]];
}

export function analyseProject(project: ProjectDoc): FilmAnalysis {
  const shots = shotsInOrder(project);
  const durations = shots.map((entry) => entry.shot.duration);
  const runtime = durations.reduce((total, duration) => total + duration, 0);
  const average = durations.length ? runtime / durations.length : 0;

  const sizes = new Set(shots.map((entry) => entry.shot.shotSize));
  const movingShots = shots.filter((entry) => entry.shot.movements.length > 0);

  const lensCounts = new Map<number, number>();
  for (const entry of shots) {
    const focal = Math.round(entry.shot.cameraState.focalLength);
    lensCounts.set(focal, (lensCounts.get(focal) ?? 0) + 1);
  }

  const composition = { left: 0, centre: 0, right: 0, offFrame: 0 };
  for (const { shot, scene } of shots) {
    const subjectId = shot.subjects[0] ?? scene.characters[0]?.id;
    if (!subjectId) continue;
    const point = headPoint(scene, subjectId, shot.sceneTime);
    if (!point) continue;
    const framed = projectToFrame(shot.cameraState, point);
    if (framed.behind || Math.abs(framed.x) > 1.15 || Math.abs(framed.y) > 1.15) {
      composition.offFrame += 1;
    } else if (framed.x < -0.22) composition.left += 1;
    else if (framed.x > 0.22) composition.right += 1;
    else composition.centre += 1;
  }

  const analysis: FilmAnalysis = {
    shotCount: shots.length,
    runtime,
    pacing: {
      average,
      shortest: durations.length ? Math.min(...durations) : 0,
      longest: durations.length ? Math.max(...durations) : 0,
      character: average === 0 ? "—" : average < 2.5 ? "fast" : average < 6 ? "measured" : "slow",
    },
    coverage: coverageOf(shots),
    camera: {
      static: shots.length - movingShots.length,
      moving: movingShots.length,
      lenses: [...lensCounts.entries()]
        .map(([focalLength, count]) => ({ focalLength, count }))
        .sort((a, b) => a.focalLength - b.focalLength),
      widest: shots.length ? Math.min(...shots.map((e) => e.shot.cameraState.focalLength)) : 0,
      longest: shots.length ? Math.max(...shots.map((e) => e.shot.cameraState.focalLength)) : 0,
    },
    composition,
    notes: [],
  };

  analysis.notes = buildNotes(project, shots, analysis, sizes);
  return analysis;
}

function coverageOf(shots: ShotContext[]): CoverageEntry[] {
  const sizes = new Set(shots.map((entry) => entry.shot.shotSize));
  const has = (...ids: string[]) => ids.some((id) => sizes.has(id as ShotDoc["shotSize"]));

  return [
    {
      label: "Master",
      present: has("EXTREME_WIDE", "WIDE"),
      detail: "A wide that shows where everyone is.",
    },
    {
      label: "Medium",
      present: has("MEDIUM_WIDE", "MEDIUM"),
      detail: "The workhorse: close enough to read, wide enough to hold the room.",
    },
    {
      label: "Close-up",
      present: has("MEDIUM_CLOSE", "CLOSE_UP", "EXTREME_CLOSE_UP"),
      detail: "Somewhere for the audience to look when it matters.",
    },
    {
      label: "Reverse angle",
      present: hasReverse(shots),
      detail: "A shot from the other side of the conversation.",
    },
    {
      label: "Insert",
      present: shots.some((entry) => entry.shot.subjects.length === 0),
      detail: "A detail — an object, a hand, a screen.",
    },
  ];
}

/** Two shots of the same scene taken from opposite sides count as a reverse. */
function hasReverse(shots: ShotContext[]): boolean {
  const byScene = new Map<string, ShotContext[]>();
  for (const entry of shots) {
    const list = byScene.get(entry.scene.id) ?? [];
    list.push(entry);
    byScene.set(entry.scene.id, list);
  }

  for (const list of byScene.values()) {
    const angles = list.map((entry) => {
      const target = entry.shot.cameraState.target;
      const position = entry.shot.cameraState.position;
      return Math.atan2(position[0] - target[0], position[2] - target[2]);
    });
    for (let i = 0; i < angles.length; i += 1) {
      for (let j = i + 1; j < angles.length; j += 1) {
        let delta = Math.abs(angles[i] - angles[j]);
        if (delta > Math.PI) delta = Math.PI * 2 - delta;
        if (delta > Math.PI / 2) return true;
      }
    }
  }
  return false;
}

function buildNotes(
  project: ProjectDoc,
  shots: ShotContext[],
  analysis: FilmAnalysis,
  sizes: Set<string>,
): DirectorNote[] {
  const notes: DirectorNote[] = [];

  if (shots.length === 0) {
    return [
      {
        id: "empty",
        kind: "EXPERIMENT",
        severity: "INFO",
        title: "Nothing to read yet",
        detail:
          "Capture a few shots in the Scene Builder and these notes will describe what you did: pacing, coverage, where you put the camera, and where your subjects sit in frame.",
      },
    ];
  }

  notes.push({
    id: "pacing",
    kind: "PACING",
    severity: "INFO",
    title: `You averaged ${analysis.pacing.average.toFixed(1)} seconds per shot`,
    detail: `Shortest ${analysis.pacing.shortest.toFixed(1)}s, longest ${analysis.pacing.longest.toFixed(
      1,
    )}s, across ${shots.length} shot${shots.length === 1 ? "" : "s"} — that reads as ${
      analysis.pacing.character
    }.`,
  });

  const missing = analysis.coverage.filter((entry) => !entry.present);
  if (missing.length > 0) {
    notes.push({
      id: "coverage",
      kind: "COVERAGE",
      severity: "NOTE",
      title: `No ${missing.map((entry) => entry.label.toLowerCase()).join(", no ")}`,
      detail: missing.map((entry) => `${entry.label}: ${entry.detail}`).join(" "),
    });
  }

  notes.push({
    id: "camera",
    kind: "CAMERA",
    severity: "INFO",
    title: `${analysis.camera.static} static, ${analysis.camera.moving} moving`,
    detail:
      analysis.camera.lenses.length === 1
        ? `Everything is on a ${analysis.camera.lenses[0].focalLength}mm. One lens is a decision — just make sure it is one.`
        : `Lenses from ${Math.round(analysis.camera.widest)}mm to ${Math.round(
            analysis.camera.longest,
          )}mm.`,
  });

  const placed = analysis.composition.left + analysis.composition.centre + analysis.composition.right;
  if (placed > 0) {
    const dominant =
      analysis.composition.centre >= analysis.composition.left &&
      analysis.composition.centre >= analysis.composition.right
        ? "centre"
        : analysis.composition.left >= analysis.composition.right
          ? "the left third"
          : "the right third";
    notes.push({
      id: "composition",
      kind: "COMPOSITION",
      severity: "INFO",
      title: `Your subjects sit mostly in ${dominant}`,
      detail: `${analysis.composition.left} left · ${analysis.composition.centre} centre · ${analysis.composition.right} right.`,
    });
  }

  if (analysis.composition.offFrame > 0) {
    notes.push({
      id: "off-frame",
      kind: "COMPOSITION",
      severity: "WARNING",
      title: `${analysis.composition.offFrame} shot${
        analysis.composition.offFrame === 1 ? " has" : "s have"
      } their subject outside the frame`,
      detail:
        "The camera is not pointed at the person it lists as its subject. That may be deliberate — or the actor moved after the shot was taken.",
    });
  }

  notes.push(...continuityNotes(project, shots));

  notes.push({
    id: "experiment",
    kind: "EXPERIMENT",
    severity: "INFO",
    title: experimentFor(analysis, sizes),
    detail: "Try another version of a scene and compare them back to back.",
  });

  return notes;
}

function experimentFor(analysis: FilmAnalysis, sizes: Set<string>): string {
  if (analysis.shotCount > 1 && analysis.pacing.average < 3) {
    return "Try the whole scene again in one shot.";
  }
  if (analysis.camera.moving === 0) {
    return "Try one moving shot — the same blocking, a camera that travels.";
  }
  if (!sizes.has("CLOSE_UP") && !sizes.has("EXTREME_CLOSE_UP")) {
    return "Try the same beat again in close-up and see what you gain and lose.";
  }
  if (analysis.camera.lenses.length < 2) {
    return "Try the same framing on a much longer lens — stand further back.";
  }
  return "Try cutting one shot out entirely and see if the scene still works.";
}

/** §28 — the warnings are meant to be useful, never blocking. */
export function continuityNotes(project: ProjectDoc, shots: ShotContext[]): DirectorNote[] {
  const notes: DirectorNote[] = [];

  // 180° rule: consecutive shots of the same pair, taken from opposite sides.
  for (let i = 1; i < shots.length; i += 1) {
    const previous = shots[i - 1];
    const current = shots[i];
    if (previous.scene.id !== current.scene.id) continue;

    const pair = current.scene.characters.slice(0, 2);
    if (pair.length < 2) continue;

    const a = subjectPosition(current.scene, pair[0].id, current.shot.sceneTime);
    const b = subjectPosition(current.scene, pair[1].id, current.shot.sceneTime);
    if (!a || !b || v.planarDistance(a, b) < 0.4) continue;

    const before = sideOfLine(previous.shot.cameraState.position, a, b);
    const after = sideOfLine(current.shot.cameraState.position, a, b);
    if (before !== 0 && after !== 0 && before !== after) {
      notes.push({
        id: `line-${current.shot.id}`,
        kind: "CONTINUITY",
        severity: "WARNING",
        title: "Possible 180° rule violation",
        detail: `The camera crosses the line between ${pair[0].name} and ${pair[1].name} between ${previous.shot.name} and ${current.shot.name}. Their screen positions swap, which can read as them changing places.`,
        shotIds: [previous.shot.id, current.shot.id],
      });
    }
  }

  // Coverage of people, not just sizes: who never gets a close-up?
  for (const scene of project.scenes.filter((s) => !s.parentSceneId)) {
    if (scene.characters.length < 2 || scene.shots.length === 0) continue;
    const closeSizes = new Set(["MEDIUM_CLOSE", "CLOSE_UP", "EXTREME_CLOSE_UP"]);
    for (const character of scene.characters) {
      const hasClose = scene.shots.some(
        (shot) => closeSizes.has(shot.shotSize) && shot.subjects.includes(character.id),
      );
      if (!hasClose) {
        notes.push({
          id: `reverse-${scene.id}-${character.id}`,
          kind: "COVERAGE",
          severity: "NOTE",
          title: `${character.name} has no close-up`,
          detail: `In ${scene.name}, ${character.name} is on set but never gets a shot of their own. If the scene is between them, the audience needs somewhere to look when they react.`,
        });
      }
    }
  }

  // Cameras standing inside things.
  for (const { shot, scene } of shots) {
    const environment = getEnvironment(scene.environmentId);
    const [width, depth] = environment.floorSize;
    const position = shot.cameraState.position;
    const outside =
      Math.abs(position[0]) > width / 2 + 0.6 || Math.abs(position[2]) > depth / 2 + 0.6;
    const underfloor = position[1] < 0.05;

    const insideActor = scene.characters.some((character) => {
      const at = subjectPosition(scene, character.id, shot.sceneTime);
      return at ? v.planarDistance(position, at) < 0.3 : false;
    });

    if (outside || underfloor || insideActor) {
      notes.push({
        id: `camera-${shot.id}`,
        kind: "CONTINUITY",
        severity: "WARNING",
        title: `Camera note on ${shot.name}`,
        detail: underfloor
          ? "The camera is below the floor."
          : insideActor
            ? "The camera is inside an actor — it will clip straight through them."
            : `The camera is outside the ${environment.name.toLowerCase()}, shooting in through the set.`,
        shotIds: [shot.id],
      });
    }
  }

  return notes;
}

/** The shot-size vocabulary, for rendering a coverage chart. */
export function shotSizeHistogram(shots: ShotContext[]): Array<{ label: string; count: number }> {
  return SHOT_SIZE_SPECS.map((spec) => ({
    label: spec.short,
    count: shots.filter((entry) => entry.shot.shotSize === spec.id).length,
  }));
}

export { getShotSizeSpec };
