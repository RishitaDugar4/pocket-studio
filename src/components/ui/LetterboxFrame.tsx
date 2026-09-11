"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Fits a frame of a given aspect inside whatever space is available, letting
 * height be the constraint when it needs to be. CSS `aspect-ratio` alone cannot
 * do this — it only ever solves for one axis — and a cropped viewer is worse
 * than useless to someone judging a composition.
 */
export function LetterboxFrame({
  aspect,
  className,
  innerRef,
  children,
}: {
  aspect: number;
  className?: string;
  /** The framed box itself, for callers that need to read or capture it. */
  innerRef?: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  const size = useMemo(() => {
    if (!box || box.width === 0 || box.height === 0) return null;
    const width = Math.min(box.width, box.height * aspect);
    return { width, height: width / aspect };
  }, [box, aspect]);

  return (
    <div ref={container} className="grid h-full w-full place-items-center overflow-hidden">
      <div
        ref={(element) => {
          if (innerRef) innerRef.current = element;
        }}
        className={cn("relative overflow-hidden", className)}
        style={size ? { width: size.width, height: size.height } : { opacity: 0 }}
      >
        {children}
      </div>
    </div>
  );
}
