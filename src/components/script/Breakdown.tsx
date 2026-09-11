"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { CHARACTERS } from "@/data/characters";
import { ENVIRONMENTS } from "@/data/environments";
import { getPropDefinition } from "@/data/props";
import { environmentForLocation, type ParsedScene, type ScriptBreakdown } from "@/lib/script/parse";
import { CAST_COLORS_SERVER } from "@/lib/db/castColors";
import { newId } from "@/lib/db/defaults";
import { useProjectStore } from "@/stores/projectStore";

/**
 * What the script contains, pulled straight out of the text (§7). Everything
 * here is a suggestion the director accepts — nothing is created behind them.
 */
export function Breakdown({
  breakdown,
  unbuilt,
  busy,
  onBuild,
  projectId,
}: {
  breakdown: ScriptBreakdown;
  unbuilt: ParsedScene[];
  busy: boolean;
  onBuild: (scenes: ParsedScene[]) => void;
  projectId: string;
}) {
  const project = useProjectStore((s) => s.project);
  const addCastMember = useProjectStore((s) => s.addCastMember);
  const router = useRouter();

  const castNames = new Set((project?.cast ?? []).map((member) => member.name.toLowerCase()));
  const uncast = breakdown.characters.filter((name) => !castNames.has(name.toLowerCase()));

  return (
    <aside className="flex min-h-0 flex-col border-l border-ink-800 bg-ink-900">
      <div className="flex h-10 shrink-0 items-center border-b border-ink-700 px-3">
        <span className="slate">Breakdown</span>
        <span className="numeric ml-auto text-[10px] text-fog-400">
          {breakdown.stats.words} words
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section
          title={`Scenes · ${breakdown.scenes.length}`}
          action={
            unbuilt.length > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onBuild(unbuilt)}
                className="slate text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
              >
                {busy ? "Building…" : `Build ${unbuilt.length}`}
              </button>
            ) : null
          }
        >
          {breakdown.scenes.length === 0 ? (
            <p className="text-[10px] leading-relaxed text-fog-400">
              No sluglines found yet. A line like{" "}
              <span className="text-fog-200">INT. APARTMENT — NIGHT</span> starts a scene.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {breakdown.scenes.map((scene) => {
                const isUnbuilt = unbuilt.includes(scene);
                const environment = ENVIRONMENTS.find(
                  (e) => e.id === environmentForLocation(scene.location, ENVIRONMENTS, scene.interior),
                );
                return (
                  <li
                    key={`${scene.index}-${scene.line}`}
                    className={cn(
                      "rounded border px-2 py-1.5",
                      isUnbuilt ? "border-ink-700 bg-ink-850" : "border-ink-800 bg-ink-900",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="slate shrink-0">
                        {String(scene.index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[12px] text-fog-100">{scene.location}</span>
                      <span className="slate ml-auto shrink-0">
                        {scene.timeOfDay.toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="h-3 w-6 shrink-0 rounded-sm border border-ink-700"
                        style={{ background: environment?.thumbnail }}
                      />
                      <span className="slate truncate">
                        {environment?.name}
                        {scene.characters.length ? ` · ${scene.characters.join(", ")}` : ""}
                      </span>
                      {isUnbuilt ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onBuild([scene])}
                          className="slate ml-auto shrink-0 text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
                        >
                          Build
                        </button>
                      ) : (
                        <span className="slate ml-auto shrink-0 text-amber-dim">Built</span>
                      )}
                    </div>
                    {scene.props.length > 0 ? (
                      <p className="slate mt-1 truncate text-fog-500">
                        props: {scene.props.map((id) => getPropDefinition(id).name).join(", ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        <Section title={`Cast · ${breakdown.characters.length}`}>
          {breakdown.characters.length === 0 ? (
            <p className="text-[10px] leading-relaxed text-fog-400">
              A line in capitals above dialogue is read as a character.
            </p>
          ) : (
            <ul className="space-y-1">
              {breakdown.characters.map((name) => {
                const alreadyCast = castNames.has(name.toLowerCase());
                return (
                  <li key={name} className="flex items-center gap-2">
                    <span className="truncate text-[12px] text-fog-200">{name}</span>
                    {alreadyCast ? (
                      <span className="slate ml-auto shrink-0 text-amber-dim">Cast</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const index = project?.cast.length ?? 0;
                          addCastMember({
                            id: newId("cast"),
                            name,
                            definitionId: CHARACTERS[index % CHARACTERS.length].id,
                            accentColor: CAST_COLORS_SERVER[index % CAST_COLORS_SERVER.length],
                          });
                        }}
                        className="slate ml-auto shrink-0 text-fog-400 transition-colors hover:text-amber-film"
                      >
                        + Cast
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {uncast.length > 0 ? (
            <p className="text-[10px] leading-relaxed text-fog-400">
              Casting someone here adds them to the film. Put them on a set in the Scene Builder.
            </p>
          ) : null}
        </Section>

        <Section title={`Props · ${breakdown.props.length}`}>
          {breakdown.props.length === 0 ? (
            <p className="text-[10px] leading-relaxed text-fog-400">
              Props named in the action that exist in the library show up here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {breakdown.props.map((id) => (
                <span
                  key={id}
                  className="slate rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 text-fog-300"
                >
                  {getPropDefinition(id).name}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="shrink-0 border-t border-ink-800 p-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/studio/${projectId}/scenes`)}
        >
          Scene Builder →
        </Button>
      </div>
    </aside>
  );
}
