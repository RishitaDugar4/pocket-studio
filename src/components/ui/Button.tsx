"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-amber-film text-ink-950 hover:bg-[#e5bb63] active:bg-[#c99c42] font-medium shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
  secondary: "bg-ink-700 text-fog-100 hover:bg-ink-600 active:bg-ink-700",
  ghost: "text-fog-300 hover:text-fog-100 hover:bg-ink-800",
  outline: "border border-ink-600 text-fog-200 hover:border-ink-500 hover:bg-ink-800",
  danger: "border border-ink-600 text-alert hover:bg-[#2a1c19] hover:border-[#5a332b]",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors duration-150 select-none",
        "disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label?: string;
}

/** Square icon button used by the viewport toolbars. */
export function ToolButton({ active, label, className, children, ...rest }: ToolButtonProps) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid h-7 w-7 place-items-center rounded transition-colors duration-150",
        active ? "bg-ink-600 text-amber-film" : "text-fog-400 hover:text-fog-100 hover:bg-ink-800",
        className,
      )}
    >
      {children}
    </button>
  );
}
