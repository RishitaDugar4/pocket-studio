"use client";

import { cn } from "@/components/ui/cn";
import type { ScriptElement } from "@/lib/script/parse";

/** Screenplay layout, read-only. Indentation is what makes a script scannable. */
const STYLES: Record<ScriptElement["kind"], string> = {
  SCENE_HEADING: "mt-6 font-medium uppercase tracking-wide text-fog-100",
  ACTION: "mt-3 text-fog-200",
  CHARACTER: "mt-4 ml-[38%] uppercase text-fog-100",
  PARENTHETICAL: "ml-[30%] text-fog-400",
  DIALOGUE: "ml-[22%] mr-[18%] text-fog-200",
  TRANSITION: "mt-4 text-right uppercase tracking-wide text-fog-400",
  BLANK: "",
};

export function ScriptPreview({ elements }: { elements: ScriptElement[] }) {
  const visible = elements.filter((element) => element.kind !== "BLANK");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ink-950 px-8 py-8">
      <div className="mx-auto max-w-2xl font-mono text-[13px] leading-[1.65]">
        {visible.length === 0 ? (
          <p className="text-fog-500">Nothing written yet.</p>
        ) : (
          visible.map((element, index) => (
            <p key={`${element.line}-${index}`} className={cn(STYLES[element.kind])}>
              {element.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
