import Link from "next/link";
import { CHALLENGES } from "@/data/challenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";

export default function ChallengesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/" className="slate transition-colors hover:text-fog-100">
        ← All films
      </Link>

      <header className="mt-8">
        <h1 className="text-xl font-medium tracking-[0.18em] text-fog-100">DIRECTOR CHALLENGES</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-fog-400">
          Short exercises with constraints. Constraints are what make directing decisions visible —
          pick one and it becomes a film you can open in the Scene Builder.
        </p>
      </header>

      <div className="mt-8 space-y-3">
        {CHALLENGES.map((challenge) => (
          <ChallengeCard key={challenge.slug} challenge={challenge} />
        ))}
      </div>
    </div>
  );
}
