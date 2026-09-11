"use client";

import {
  useCallback,
  useRef,
  useState,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full rounded border border-ink-700 bg-ink-900 px-2 text-fog-100 outline-none transition-colors " +
  "placeholder:text-fog-400 hover:border-ink-600 focus:border-amber-dim";

export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(CONTROL, "h-8 text-sm", className)} />;
}

export function TextArea({
  className,
  ...rest
}: InputHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return (
    <textarea
      {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      className={cn(CONTROL, "resize-none py-1.5 text-sm leading-relaxed", className)}
    />
  );
}

/**
 * Numeric field that can be dragged like a camera wheel. Directing is tactile:
 * scrubbing a value is faster than typing it, but typing still works.
 */
export function NumberScrub({
  value,
  onChange,
  onCommit,
  onBegin,
  step = 0.05,
  min = -Infinity,
  max = Infinity,
  precision = 2,
  suffix,
  className,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onCommit?: () => void;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const dragging = useRef(false);

  const clampValue = useCallback(
    (next: number) => Math.min(max, Math.max(min, next)),
    [min, max],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || draft !== null) return;
    dragging.current = true;
    onBegin?.();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const multiplier = event.shiftKey ? 0.2 : event.altKey ? 4 : 1;
    onChange(clampValue(value + event.movementX * step * multiplier));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onCommit?.();
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed)) {
      onChange(clampValue(parsed));
      onCommit?.();
    }
    setDraft(null);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        CONTROL,
        "flex h-8 items-center justify-between gap-1 text-sm",
        disabled ? "opacity-40" : "cursor-ew-resize",
        className,
      )}
    >
      <input
        value={draft ?? value.toFixed(precision)}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(value.toFixed(precision))}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitDraft();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="numeric w-full min-w-0 bg-transparent text-sm outline-none"
      />
      {suffix ? <span className="numeric shrink-0 text-[10px] text-fog-400">{suffix}</span> : null}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  onBegin,
  onCommit,
  min = 0,
  max = 1,
  step = 0.01,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  onBegin?: () => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onPointerDown={onBegin}
      onPointerUp={onCommit}
      onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      className={cn("w-full cursor-pointer", className)}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(CONTROL, "h-8 appearance-none pr-7 text-sm")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink-850">
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-2 top-1/2 h-1.5 w-2.5 -translate-y-1/2 fill-fog-400"
      >
        <path d="M0 0 L5 6 L10 0 Z" />
      </svg>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; title?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded border border-ink-700 bg-ink-900 p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-sm py-1 text-[11px] transition-colors duration-150",
            option.value === value
              ? "bg-ink-600 text-fog-100"
              : "text-fog-400 hover:text-fog-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Compact grid of preset chips — lenses, shot sizes, heights. */
export function ChipGrid<T extends string | number>({
  value,
  onChange,
  options,
  columns = 3,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; title?: string }>;
  columns?: number;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            "numeric rounded border px-1 py-1.5 text-[11px] transition-colors duration-150",
            option.value === value
              ? "border-amber-dim bg-[#2a2318] text-amber-film"
              : "border-ink-700 bg-ink-900 text-fog-300 hover:border-ink-600 hover:text-fog-100",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-4 w-7 shrink-0 rounded-full transition-colors duration-150",
        checked ? "bg-amber-dim" : "bg-ink-600",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3 w-3 rounded-full bg-fog-100 transition-transform duration-150",
          checked ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2 py-0.5 text-left text-[11px] text-fog-300 transition-colors hover:text-fog-100"
    >
      <span
        className={cn(
          "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border transition-colors",
          checked ? "border-amber-dim bg-amber-dim" : "border-ink-600 bg-ink-900",
        )}
      >
        {checked ? (
          <svg viewBox="0 0 10 8" className="h-2 w-2.5 fill-none stroke-ink-950" strokeWidth={2}>
            <path d="M1 4 L3.6 6.5 L9 1" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-ink-700">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "slate relative flex-1 px-2 transition-colors duration-150",
            tab.value === value ? "text-fog-100" : "hover:text-fog-200",
          )}
        >
          {tab.label}
          {tab.value === value ? (
            <span className="absolute inset-x-2 bottom-0 h-px bg-amber-film" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="numeric rounded border border-ink-700 bg-ink-900 px-1 py-px text-[9px] text-fog-400">
      {children}
    </span>
  );
}
