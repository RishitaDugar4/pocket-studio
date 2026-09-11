"use client";

import { memo } from "react";
import { getLightingPreset } from "@/data/lighting";
import type { LightDoc, LightingPresetId } from "@/types";

/**
 * Maps the director-facing light rig (key / fill / back / practical / ambient)
 * onto three.js lights. Only the key casts shadows — one good shadow reads
 * better in previs than five competing ones, and it keeps the viewport fast.
 */
function RigLight({ light, castShadow }: { light: LightDoc; castShadow: boolean }) {
  if (!light.enabled) return null;

  switch (light.role) {
    case "AMBIENT":
      return (
        <>
          <ambientLight intensity={light.intensity * 0.7} color={light.color} />
          <hemisphereLight
            intensity={light.intensity * 0.55}
            color={light.color}
            groundColor="#14120f"
          />
        </>
      );
    case "PRACTICAL":
      return (
        <pointLight
          position={light.position}
          intensity={light.intensity * 6}
          color={light.color}
          distance={Math.max(light.size, 0.4) * 9}
          decay={2}
        />
      );
    case "KEY":
    case "BACK":
      return (
        <spotLight
          position={light.position}
          intensity={light.intensity * 26}
          color={light.color}
          // A bigger "size" is a bigger source: wider cone, softer edge.
          angle={Math.min(0.35 + light.size * 0.16, 1.2)}
          penumbra={Math.min(0.25 + light.size * 0.22, 1)}
          distance={30}
          decay={1.1}
          castShadow={castShadow}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0012}
          shadow-normalBias={0.02}
        />
      );
    case "FILL":
    default:
      return (
        <directionalLight
          position={light.position}
          intensity={light.intensity * 1.1}
          color={light.color}
        />
      );
  }
}

export const SceneLights = memo(function SceneLights({
  lights,
  presetId,
}: {
  lights: LightDoc[];
  presetId: LightingPresetId;
}) {
  const preset = getLightingPreset(presetId);
  const key = lights.find((l) => l.role === "KEY" && l.enabled);
  return (
    <>
      {/* A floor of light so nothing is ever fully black while blocking. */}
      <ambientLight intensity={preset.ambientIntensity * 0.25} color={preset.ambientColor} />
      {lights.map((light) => (
        <RigLight key={light.id} light={light} castShadow={light.id === key?.id} />
      ))}
    </>
  );
});
