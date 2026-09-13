/** Shared vocabulary for Pocket Studio. Kept free of React and three.js so it
 *  can be used by the server, the stores and the cinematography helpers alike. */

export type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ project */

export const PROJECT_FORMATS = [
  "SHORT_FILM",
  "MUSIC_VIDEO",
  "COMMERCIAL",
  "SCENE_EXERCISE",
  "EXPERIMENTAL",
  "OTHER",
] as const;
export type ProjectFormat = (typeof PROJECT_FORMATS)[number];

export const VISUAL_MOODS = [
  "NATURALISTIC",
  "DREAMLIKE",
  "DARK",
  "WARM",
  "COLD",
  "TENSE",
  "MINIMAL",
] as const;
export type VisualMood = (typeof VISUAL_MOODS)[number];

export const TIMES_OF_DAY = ["DAY", "NIGHT", "DAWN", "DUSK"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/* ------------------------------------------------------------ cinematography */

export const SHOT_SIZES = [
  "EXTREME_WIDE",
  "WIDE",
  "MEDIUM_WIDE",
  "MEDIUM",
  "MEDIUM_CLOSE",
  "CLOSE_UP",
  "EXTREME_CLOSE_UP",
] as const;
export type ShotSize = (typeof SHOT_SIZES)[number];

export const CAMERA_HEIGHTS = [
  "GROUND",
  "WAIST",
  "CHEST",
  "EYE",
  "HIGH",
  "OVERHEAD",
] as const;
export type CameraHeight = (typeof CAMERA_HEIGHTS)[number];

export const CAMERA_MOVEMENTS = [
  "STATIC",
  // "PAN" is a pan to the right; it predates the left/right pair and is kept
  // as-is so shots already recorded with it keep working.
  "PAN",
  "PAN_LEFT",
  "TILT",
  "PUSH_IN",
  "PULL_OUT",
  "TRUCK_LEFT",
  "TRUCK_RIGHT",
  "PEDESTAL",
  "ORBIT",
  "HANDHELD",
] as const;
export type CameraMovementType = (typeof CAMERA_MOVEMENTS)[number];

export const FOCAL_PRESETS = [16, 24, 35, 50, 85, 135] as const;
export const APERTURE_PRESETS = [1.4, 2, 2.8, 4, 5.6, 8] as const;

export const LIGHT_ROLES = [
  "KEY",
  "FILL",
  "BACK",
  "PRACTICAL",
  "AMBIENT",
] as const;
export type LightRole = (typeof LIGHT_ROLES)[number];

export const LIGHTING_PRESETS = [
  "NATURAL_DAY",
  "GOLDEN_HOUR",
  "NIGHT",
  "CINEMATIC_LOW_KEY",
  "FLUORESCENT",
  "WARM_INTERIOR",
] as const;
export type LightingPresetId = (typeof LIGHTING_PRESETS)[number];

export const CHARACTER_ANIMATIONS = [
  "IDLE",
  "WALK",
  "SIT",
  "STAND",
  "TURN",
  "LOOK",
  "TALK",
  "PHONE",
] as const;
export type CharacterAnimation = (typeof CHARACTER_ANIMATIONS)[number];

export const TRANSITIONS = ["CUT", "FADE", "DISSOLVE"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

/* ------------------------------------------------------------- scene content */

export interface SceneCharacterDoc {
  id: string;
  characterId: string;
  name: string;
  definitionId: string;
  accentColor: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  animation: CharacterAnimation;
  locked: boolean;
}

export interface ScenePropDoc {
  id: string;
  name: string;
  definitionId: string;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

export interface LightDoc {
  id: string;
  role: LightRole;
  enabled: boolean;
  intensity: number;
  position: Vec3;
  rotation: Vec3;
  color: string;
  temperature: number;
  size: number;
}

export interface CameraDoc {
  id: string;
  name: string;
  position: Vec3;
  target: Vec3;
  focalLength: number;
  aperture: number;
  dofEnabled: boolean;
  focusTargetId: string | null;
  shotSize: ShotSize;
  heightPreset: CameraHeight;
  isActive: boolean;
  movementType: CameraMovementType;
  movementDuration: number;
  movementIntensity: number;
}

export interface CameraMovementDoc {
  id: string;
  type: CameraMovementType;
  startTime: number;
  duration: number;
  startTransform: CameraTransform;
  endTransform: CameraTransform;
  intensity: number;
}

/** The minimum a shot needs to reproduce a framing without the live scene. */
export interface CameraTransform {
  position: Vec3;
  target: Vec3;
  focalLength: number;
  aperture: number;
  dofEnabled: boolean;
  focusTargetId: string | null;
}

export interface ShotDoc {
  id: string;
  index: number;
  name: string;
  shotSize: ShotSize;
  duration: number;
  /** Scene time the shot starts at — blocking plays from here. */
  sceneTime: number;
  cameraState: CameraTransform;
  subjects: string[];
  notes: string;
  transition: TransitionType;
  cameraId: string | null;
  movements: CameraMovementDoc[];
  /** Storyboard frame captured at the moment the shot was taken. */
  frameUrl: string | null;
}

export interface BlockingEventDoc {
  id: string;
  sceneCharacterId: string;
  startTime: number;
  endTime: number;
  action: CharacterAnimation | "ENTER" | "EXIT";
  startPosition: Vec3;
  endPosition: Vec3;
  rotation: Vec3;
}

export interface SceneDoc {
  id: string;
  projectId: string;
  index: number;
  name: string;
  location: string;
  timeOfDay: TimeOfDay;
  environmentId: string;
  lightingPreset: LightingPresetId;
  versionLabel: string;
  parentSceneId: string | null;
  notes: string;
  characters: SceneCharacterDoc[];
  props: ScenePropDoc[];
  lights: LightDoc[];
  cameras: CameraDoc[];
  shots: ShotDoc[];
  blockingEvents: BlockingEventDoc[];
}

export const AUDIO_TRACKS = ["DIALOGUE", "AMBIENCE", "SFX", "MUSIC"] as const;
export type AudioTrack = (typeof AUDIO_TRACKS)[number];
export type TimelineTrack = "VIDEO" | AudioTrack;

export interface AudioAssetDoc {
  id: string;
  name: string;
  kind: AudioTrack;
  url: string;
  duration: number;
}

/** One clip in the cut: a shot on the video track, or a sound on an audio track. */
export interface TimelineItemDoc {
  id: string;
  index: number;
  track: TimelineTrack;
  /** Seconds from the start of the sequence (audio only; video items are packed). */
  startTime: number;
  duration: number;
  /** Seconds trimmed from the head and tail of the source. */
  trimIn: number;
  trimOut: number;
  transition: TransitionType;
  shotId: string | null;
  audioAssetId: string | null;
}

export interface CastMemberDoc {
  id: string;
  name: string;
  definitionId: string;
  accentColor: string;
}

export interface ProjectDoc {
  id: string;
  title: string;
  format: ProjectFormat;
  mood: VisualMood;
  genre: string | null;
  logline: string | null;
  status: string;
  isDemo: boolean;
  script: string;
  challengeSlug: string | null;
  createdAt: string;
  updatedAt: string;
  cast: CastMemberDoc[];
  scenes: SceneDoc[];
  timeline: TimelineItemDoc[];
  audio: AudioAssetDoc[];
}

/** Dashboard-sized view of a project — no scene contents. */
export interface ProjectSummary {
  id: string;
  title: string;
  format: ProjectFormat;
  mood: VisualMood;
  genre: string | null;
  status: string;
  isDemo: boolean;
  updatedAt: string;
  sceneCount: number;
  shotCount: number;
  runtime: number;
  /** Set of the opening scene — drives the card's thumbnail. */
  environmentId: string | null;
  location: string | null;
  timeOfDay: TimeOfDay | null;
}

/* --------------------------------------------------------------- editor bits */

export type TransformMode = "select" | "translate" | "rotate" | "scale";
export type ViewportMode = "ORBIT" | "CAMERA";
export type SelectionKind = "character" | "prop" | "light" | "camera";

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export interface GuideSettings {
  thirds: boolean;
  center: boolean;
  golden: boolean;
  horizon: boolean;
  safeArea: boolean;
  eyeline: boolean;
}
