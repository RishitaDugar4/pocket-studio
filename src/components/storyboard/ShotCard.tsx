"use client";

import Image from "next/image";
import { cn } from "@/components/ui/cn";
import { getShotSizeSpec, getMovementSpec } from "@/lib/cinematography";
import type { ShotDoc } from "@/types";

/** The storyboard frame itself — the thing a director actually looks at. */
export function ShotThumbnail({ shot, className }: { shot: ShotDoc; className?: string }) {
  if (!shot.frameUrl) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-ink-900 text-center",
          className,
        )}
      >
        <span className="slate px-2 text-fog-500">No frame</span>
      </div>
    );
  }
  return (
    <Image
      src={shot.frameUrl}
      alt={shot.name}
      width={640}
      height={360}
      unoptimized
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function ShotCard({
  shot,
  selected,
  onClick,
  onDoubleClick,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  compact,
}: {
  shot: ShotDoc;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: () => void;
  compact?: boolean;
}) {
  const size = getShotSizeSpec(shot.shotSize);
  const movement = shot.movements[0];

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "animate-fade-up group shrink-0 overflow-hidden rounded border text-left transition-colors duration-150",
        selected
          ? "border-amber-film bg-[#221d14]"
          : "border-ink-700 bg-ink-850 hover:border-ink-500",
        compact ? "w-[136px]" : "w-full",
      )}
    >
      <div className={cn("relative w-full overflow-hidden", compact ? "h-[70px]" : "aspect-[16/9]")}>
        <ShotThumbnail shot={shot} className="h-full w-full" />
        <span className="slate absolute left-1.5 top-1.5 rounded bg-ink-950/75 px-1 py-px text-fog-200">
          {String(shot.index + 1).padStart(2, "0")}
        </span>
        <span className="numeric absolute bottom-1.5 right-1.5 rounded bg-ink-950/75 px-1 py-px text-[9px] text-fog-200">
          {shot.duration.toFixed(1)}s
        </span>
      </div>
      <div className={cn("px-2", compact ? "py-1" : "py-2")}>
        <p className={cn("truncate text-fog-100", compact ? "text-[11px]" : "text-[12px]")}>
          {shot.name}
        </p>
        <p className="slate mt-0.5 truncate">
          {size.short}
          {" · "}
          {Math.round(shot.cameraState.focalLength)}mm
          {movement ? ` · ${getMovementSpec(movement.type).label}` : ""}
        </p>
      </div>
    </button>
  );
}
