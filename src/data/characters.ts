import type { CharacterAnimation } from "@/types";

/**
 * Stylized stand-in actors. Deliberately generic: the director should be able
 * to imagine anyone in the role. `assetPath` takes over once a GLB exists;
 * `build` drives the procedural figure until then.
 */
export interface CharacterDefinition {
  id: string;
  name: string;
  assetPath: string | null;
  defaultScale: number;
  animations: CharacterAnimation[];
  build: {
    /** Standing height in metres, used by every shot-size calculation. */
    height: number;
    shoulders: number;
    hips: number;
    /** Base body colour; per-cast accent colour tints the torso. */
    skin: string;
    clothing: string;
  };
}

const FULL_VOCABULARY: CharacterAnimation[] = [
  "IDLE",
  "WALK",
  "SIT",
  "STAND",
  "TURN",
  "LOOK",
  "TALK",
  "PHONE",
];

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: "adult_tall",
    name: "Adult · Tall",
    assetPath: null,
    defaultScale: 1,
    animations: FULL_VOCABULARY,
    build: { height: 1.88, shoulders: 0.46, hips: 0.34, skin: "#c9a78a", clothing: "#4a5560" },
  },
  {
    id: "adult_average",
    name: "Adult · Average",
    assetPath: null,
    defaultScale: 1,
    animations: FULL_VOCABULARY,
    build: { height: 1.75, shoulders: 0.43, hips: 0.33, skin: "#a8785a", clothing: "#565049" },
  },
  {
    id: "adult_slight",
    name: "Adult · Slight",
    assetPath: null,
    defaultScale: 1,
    animations: FULL_VOCABULARY,
    build: { height: 1.66, shoulders: 0.38, hips: 0.31, skin: "#e0bfa4", clothing: "#6b4f4a" },
  },
  {
    id: "youth",
    name: "Youth",
    assetPath: null,
    defaultScale: 1,
    animations: FULL_VOCABULARY,
    build: { height: 1.42, shoulders: 0.33, hips: 0.27, skin: "#8a5f43", clothing: "#3f5a55" },
  },
  {
    id: "elder",
    name: "Elder",
    assetPath: null,
    defaultScale: 1,
    animations: FULL_VOCABULARY,
    build: { height: 1.68, shoulders: 0.41, hips: 0.35, skin: "#d8c1ad", clothing: "#4c4a52" },
  },
];

export const DEFAULT_CHARACTER_ID = "adult_average";

export function getCharacterDefinition(id: string): CharacterDefinition {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1];
}

/** Standing height of a placed actor. Shot sizes are measured against this:
 *  a close-up of a seated person is the same size of head as a standing one. */
export function bodyHeight(definitionId: string, scale = 1): number {
  return getCharacterDefinition(definitionId).build.height * scale;
}

/**
 * How far the actor's head drops below standing, given what they are doing.
 * Sitting does not change how big they are in frame — it changes where the
 * camera has to aim, and how high it has to stand.
 */
const POSE_DROP_FACTOR: Record<CharacterAnimation, number> = {
  IDLE: 0,
  STAND: 0,
  WALK: 0,
  SIT: 0.24,
  TURN: 0,
  LOOK: 0,
  TALK: 0,
  PHONE: 0,
};

export function poseAimDrop(
  definitionId: string,
  scale = 1,
  animation: CharacterAnimation = "IDLE",
): number {
  return bodyHeight(definitionId, scale) * POSE_DROP_FACTOR[animation];
}

/** Eye height for a placed actor — the anchor most framing decisions use. */
export function eyeHeight(definitionId: string, scale = 1, animation: CharacterAnimation = "IDLE"): number {
  return bodyHeight(definitionId, scale) * 0.94 - poseAimDrop(definitionId, scale, animation);
}
