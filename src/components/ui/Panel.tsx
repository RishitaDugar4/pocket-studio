import type { ReactNode } from "react";
import { cn } from "./cn";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-between border-b border-ink-700 px-3",
        className,
      )}
    >
      <span className="slate">{title}</span>
      {action}
    </div>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-ink-800 px-3 py-3 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="slate">{title}</h3>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-fog-300">{label}</span>
        {hint ? <span className="numeric text-[10px] text-fog-400">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <h3 className="slate text-fog-300">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-fog-400">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
