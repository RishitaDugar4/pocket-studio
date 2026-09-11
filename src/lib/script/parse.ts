import { PROPS } from "@/data/props";
import type { TimeOfDay } from "@/types";

/**
 * A deliberately small screenplay parser (§7). It is not trying to be Final
 * Draft — it exists to recognise structure well enough to pull scenes, cast and
 * props out of a script the director has already written.
 */

export type ElementKind =
  | "SCENE_HEADING"
  | "ACTION"
  | "CHARACTER"
  | "PARENTHETICAL"
  | "DIALOGUE"
  | "TRANSITION"
  | "BLANK";

export interface ScriptElement {
  kind: ElementKind;
  text: string;
  /** Line number in the source, for mapping edits back. */
  line: number;
}

export interface ParsedScene {
  index: number;
  heading: string;
  /** INT / EXT / INT-EXT, when the heading says. */
  interior: "INT" | "EXT" | "BOTH" | null;
  location: string;
  timeOfDay: TimeOfDay;
  /** Characters who speak in this scene, in order of first line. */
  characters: string[];
  /** Prop ids mentioned in the action of this scene. */
  props: string[];
  action: string;
  line: number;
}

export interface ScriptBreakdown {
  elements: ScriptElement[];
  scenes: ParsedScene[];
  characters: string[];
  props: string[];
  stats: {
    /** One page of screenplay is roughly a minute of screen time. */
    pages: number;
    words: number;
    dialogueLines: number;
  };
}

const HEADING = /^\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s+(.*)$/i;
const TRANSITION = /^\s*([A-Z][A-Z\s]*(TO:|OUT\.?|IN:))\s*$/;
const PARENTHETICAL = /^\s*\(.*\)\s*$/;

const TIME_WORDS: Array<[RegExp, TimeOfDay]> = [
  [/\b(night|evening|midnight)\b/i, "NIGHT"],
  [/\b(dawn|sunrise|early morning)\b/i, "DAWN"],
  [/\b(dusk|sunset|twilight|magic hour|golden hour)\b/i, "DUSK"],
  [/\b(day|morning|afternoon|noon)\b/i, "DAY"],
];

/** "CONTINUOUS" and "LATER" mean "same as the scene before", not "daytime". */
const INHERITS_TIME = /\b(continuous|later|moments later|same)\b/i;

function timeOfDayFrom(text: string, previous: TimeOfDay | null): TimeOfDay {
  for (const [pattern, value] of TIME_WORDS) if (pattern.test(text)) return value;
  if (previous && INHERITS_TIME.test(text)) return previous;
  return previous ?? "DAY";
}

/** Splits "APARTMENT — NIGHT" into its location and its time. */
function splitHeading(
  rest: string,
  previous: TimeOfDay | null,
): { location: string; timeOfDay: TimeOfDay } {
  const parts = rest.split(/\s[—–-]{1,2}\s|\s{2,}/);
  const location = (parts[0] ?? rest).trim().replace(/[.,]$/, "");
  const tail = parts.slice(1).join(" ");
  return {
    location: titleCase(location),
    timeOfDay: timeOfDayFrom(tail || rest, previous),
  };
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

/** A character cue: short, upper case, and something follows it. */
function isCharacterCue(raw: string, next: string | undefined): boolean {
  const text = raw.trim();
  if (!text || text.length > 40) return false;
  if (!next || next.trim() === "") return false;
  if (HEADING.test(text) || TRANSITION.test(text)) return false;
  if (!/[A-Z]/.test(text)) return false;
  // Allow "ALEX (V.O.)" and "ALEX (CONT'D)".
  const withoutExtension = text.replace(/\(.*\)\s*$/, "").trim();
  return withoutExtension === withoutExtension.toUpperCase() && /^[A-Z0-9 .'#-]+$/.test(withoutExtension);
}

export function characterName(cue: string): string {
  return titleCase(cue.replace(/\(.*\)\s*$/, "").trim());
}

export function parseScript(source: string): ScriptBreakdown {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const elements: ScriptElement[] = [];
  const scenes: ParsedScene[] = [];
  const allCharacters: string[] = [];
  const allProps = new Set<string>();

  let current: ParsedScene | null = null;
  let inDialogue = false;
  let dialogueLines = 0;

  lines.forEach((raw, index) => {
    const text = raw.trim();

    if (text === "") {
      elements.push({ kind: "BLANK", text: "", line: index });
      inDialogue = false;
      return;
    }

    const heading = HEADING.exec(text);
    if (heading) {
      const { location, timeOfDay } = splitHeading(
        heading[2],
        scenes[scenes.length - 1]?.timeOfDay ?? null,
      );
      const prefix = heading[1].toUpperCase();
      current = {
        index: scenes.length,
        heading: text,
        interior: prefix.startsWith("INT") && prefix.includes("EXT")
          ? "BOTH"
          : prefix.startsWith("INT")
            ? "INT"
            : "EXT",
        location,
        timeOfDay,
        characters: [],
        props: [],
        action: "",
        line: index,
      };
      scenes.push(current);
      elements.push({ kind: "SCENE_HEADING", text, line: index });
      inDialogue = false;
      return;
    }

    if (TRANSITION.test(text)) {
      elements.push({ kind: "TRANSITION", text, line: index });
      inDialogue = false;
      return;
    }

    if (PARENTHETICAL.test(text) && inDialogue) {
      elements.push({ kind: "PARENTHETICAL", text, line: index });
      return;
    }

    if (!inDialogue && isCharacterCue(raw, lines[index + 1])) {
      const name = characterName(text);
      elements.push({ kind: "CHARACTER", text, line: index });
      if (!allCharacters.includes(name)) allCharacters.push(name);
      if (current && !current.characters.includes(name)) current.characters.push(name);
      inDialogue = true;
      return;
    }

    if (inDialogue) {
      elements.push({ kind: "DIALOGUE", text, line: index });
      dialogueLines += 1;
      return;
    }

    elements.push({ kind: "ACTION", text, line: index });
    if (current) {
      current.action = current.action ? `${current.action} ${text}` : text;
      for (const prop of propsMentioned(text)) {
        current.props.push(prop);
        allProps.add(prop);
      }
      current.props = [...new Set(current.props)];
    }
  });

  const words = source.split(/\s+/).filter(Boolean).length;

  return {
    elements,
    scenes,
    characters: allCharacters,
    props: [...allProps],
    stats: {
      // A screenplay page is ~55 lines; a minute of screen time is ~a page.
      pages: Math.max(Math.round((lines.length / 55) * 10) / 10, 0),
      words,
      dialogueLines,
    },
  };
}

/** Props from the library that the action mentions by name. */
export function propsMentioned(text: string): string[] {
  const lower = text.toLowerCase();
  return PROPS.filter((prop) => {
    const name = prop.name.toLowerCase();
    return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`).test(lower);
  }).map((prop) => prop.id);
}

/** Best-guess environment for a slugline, matched against the set library. */
export function environmentForLocation(
  location: string,
  environments: Array<{ id: string; name: string; interior: boolean }>,
  interior: ParsedScene["interior"],
): string {
  const lower = location.toLowerCase();
  const exact = environments.find((environment) => lower.includes(environment.name.toLowerCase()));
  if (exact) return exact.id;

  const aliases: Record<string, string> = {
    kitchen: "apartment",
    "living room": "apartment",
    flat: "apartment",
    house: "apartment",
    bed: "bedroom",
    desk: "office",
    work: "office",
    road: "street",
    sidewalk: "street",
    alley: "street",
    park: "park",
    garden: "park",
    field: "park",
  };
  for (const [word, id] of Object.entries(aliases)) {
    if (lower.includes(word) && environments.some((e) => e.id === id)) return id;
  }

  // Fall back to something with the right inside/outside feel.
  const wantsExterior = interior === "EXT";
  return environments.find((e) => e.interior !== wantsExterior)?.id ?? environments[0].id;
}
