import Link from "next/link";

/**
 * Honest placeholder (§47): a section that is not built yet says so and points
 * at what does work. No fake buttons anywhere in this app.
 */
export function MilestonePlaceholder({
  title,
  milestone,
  body,
  nextHref,
  nextLabel,
}: {
  title: string;
  milestone: string;
  body: string;
  nextHref: string;
  nextLabel: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="slate text-amber-dim">{milestone}</p>
        <h2 className="mt-3 text-lg font-medium tracking-wide text-fog-100">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-fog-400">{body}</p>
        <Link
          href={nextHref}
          className="mt-6 inline-flex h-9 items-center rounded-md border border-ink-600 px-4 text-sm text-fog-200 transition-colors hover:border-ink-500 hover:bg-ink-800"
        >
          {nextLabel}
        </Link>
      </div>
    </div>
  );
}
