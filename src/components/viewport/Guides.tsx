"use client";

import { useEffect, useRef } from "react";
import { degToRad, verticalFovDeg } from "@/lib/cinematography";
import type { GuideSettings } from "@/types";
import { liveFrame } from "./liveFrame";

/**
 * Composition guides live in the DOM, not in the scene — so they are always
 * crisp, and they can never end up in an exported frame (§27).
 */
export function Guides({ guides }: { guides: GuideSettings }) {
  const horizon = useRef<SVGLineElement>(null);
  const active = guides.horizon;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const line = horizon.current;
      if (line) {
        // Project the true horizon: where the camera's level plane crosses frame.
        const dy = liveFrame.target.y - liveFrame.position.y;
        const dx = liveFrame.target.x - liveFrame.position.x;
        const dz = liveFrame.target.z - liveFrame.position.z;
        const pitch = Math.atan2(dy, Math.hypot(dx, dz));
        const halfFov = degToRad(verticalFovDeg(liveFrame.focalLength)) / 2;
        const normalised = Math.tan(pitch) / Math.tan(halfFov);
        const y = 50 + normalised * 50;
        const clamped = Math.min(Math.max(y, -20), 120);
        line.setAttribute("y1", `${clamped}`);
        line.setAttribute("y2", `${clamped}`);
        line.style.opacity = y < -5 || y > 105 ? "0.25" : "0.7";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {guides.thirds ? (
        <g stroke="#e4e6e7" strokeWidth={0.14} opacity={0.3}>
          <line x1="33.333" y1="0" x2="33.333" y2="100" />
          <line x1="66.667" y1="0" x2="66.667" y2="100" />
          <line x1="0" y1="33.333" x2="100" y2="33.333" />
          <line x1="0" y1="66.667" x2="100" y2="66.667" />
        </g>
      ) : null}

      {guides.golden ? (
        <g stroke="#d8ab4f" strokeWidth={0.14} opacity={0.42}>
          <line x1="38.2" y1="0" x2="38.2" y2="100" />
          <line x1="61.8" y1="0" x2="61.8" y2="100" />
          <line x1="0" y1="38.2" x2="100" y2="38.2" />
          <line x1="0" y1="61.8" x2="100" y2="61.8" />
        </g>
      ) : null}

      {guides.center ? (
        <g stroke="#e4e6e7" strokeWidth={0.16} opacity={0.5}>
          <line x1="50" y1="46" x2="50" y2="54" />
          <line x1="46" y1="50" x2="54" y2="50" />
        </g>
      ) : null}

      {guides.safeArea ? (
        <g fill="none" stroke="#e4e6e7" strokeWidth={0.14} opacity={0.28}>
          <rect x="5" y="5" width="90" height="90" />
          <rect x="10" y="10" width="80" height="80" strokeDasharray="1.5 1.5" />
        </g>
      ) : null}

      {guides.eyeline ? (
        <g stroke="#6fa8bd" strokeWidth={0.16} opacity={0.5}>
          <line x1="0" y1="28" x2="100" y2="28" strokeDasharray="2 1.4" />
        </g>
      ) : null}

      {guides.horizon ? (
        <line
          ref={horizon}
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="#c9705c"
          strokeWidth={0.16}
          opacity={0.7}
        />
      ) : null}
    </svg>
  );
}
