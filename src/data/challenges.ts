export interface ChallengeDefinition {
  slug: string;
  order: number;
  title: string;
  prompt: string;
  constraints: string[];
  /** Suggested starting point when a project is created from the challenge. */
  starter: {
    environmentId: string;
    lightingPreset: string;
    castSize: number;
  };
}

export const CHALLENGES: ChallengeDefinition[] = [
  {
    slug: "tension",
    order: 1,
    title: "Tension",
    prompt: "Two characters are waiting for something. Create tension without using dialogue.",
    constraints: ["No dialogue", "At least 4 shots", "One shot longer than 6 seconds"],
    starter: { environmentId: "apartment", lightingPreset: "CINEMATIC_LOW_KEY", castSize: 2 },
  },
  {
    slug: "reveal",
    order: 2,
    title: "Reveal",
    prompt: "Make the audience realize something before the protagonist does.",
    constraints: ["Include one insert shot", "The reveal happens in camera, not in dialogue"],
    starter: { environmentId: "office", lightingPreset: "FLUORESCENT", castSize: 2 },
  },
  {
    slug: "long-take",
    order: 3,
    title: "Long Take",
    prompt: "Tell the entire scene using one continuous shot.",
    constraints: ["Exactly one shot", "At least 20 seconds", "Camera must move"],
    starter: { environmentId: "street", lightingPreset: "NIGHT", castSize: 2 },
  },
  {
    slug: "distance",
    order: 4,
    title: "Distance",
    prompt: "Shoot an emotional conversation without using a close-up.",
    constraints: ["No shot tighter than Medium", "Two characters", "No lens longer than 50mm"],
    starter: { environmentId: "park", lightingPreset: "GOLDEN_HOUR", castSize: 2 },
  },
  {
    slug: "misdirection",
    order: 5,
    title: "Misdirection",
    prompt: "Make the audience look at the wrong thing.",
    constraints: ["Use at least one prop as a focal point", "One deliberate rack of attention"],
    starter: { environmentId: "bedroom", lightingPreset: "NIGHT", castSize: 1 },
  },
];

export function getChallenge(slug: string): ChallengeDefinition | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}
