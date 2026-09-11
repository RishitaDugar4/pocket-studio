"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ChallengeDefinition } from "@/data/challenges";
import type { ProjectDoc } from "@/types";

export function ChallengeCard({ challenge }: { challenge: ChallengeDefinition }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `Challenge ${String(challenge.order).padStart(2, "0")} — ${challenge.title}`,
          format: "SCENE_EXERCISE",
          mood: "TENSE",
          challengeSlug: challenge.slug,
          environmentId: challenge.starter.environmentId,
          lightingPreset: challenge.starter.lightingPreset,
        }),
      });
      if (!response.ok) throw new Error("Could not start the challenge.");
      const { project } = (await response.json()) as { project: ProjectDoc };
      router.push(`/studio/${project.id}/scenes`);
    } catch (error) {
      console.error(error);
      setBusy(false);
    }
  };

  return (
    <article className="panel p-4">
      <p className="slate text-amber-dim">
        Challenge {String(challenge.order).padStart(2, "0")}
      </p>
      <h2 className="mt-1.5 text-[15px] font-medium tracking-wide text-fog-100">
        {challenge.title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog-200">{challenge.prompt}</p>

      <div className="mt-3">
        <h3 className="slate">Constraints</h3>
        <ul className="mt-1.5 space-y-1">
          {challenge.constraints.map((constraint) => (
            <li key={constraint} className="text-[12px] leading-relaxed text-fog-400">
              · {constraint}
            </li>
          ))}
        </ul>
      </div>

      <Button className="mt-4" size="sm" variant="outline" onClick={start} disabled={busy}>
        {busy ? "Starting…" : "Start challenge"}
      </Button>
    </article>
  );
}
