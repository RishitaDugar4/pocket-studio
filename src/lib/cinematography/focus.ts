import { getCharacterDefinition } from "@/data/characters";
import { getPropDefinition } from "@/data/props";
import type { SceneDoc, Vec3 } from "@/types";

/**
 * World point a camera is focused on. Shared by the viewport, the shot preview
 * and the sequence editor so "focus on Alex" means one thing everywhere.
 */
export function focusPointFor(scene: SceneDoc, focusTargetId: string | null): Vec3 | null {
  if (!focusTargetId) return null;

  const character = scene.characters.find((c) => c.id === focusTargetId);
  if (character) {
    const definition = getCharacterDefinition(character.definitionId);
    return [
      character.position[0],
      character.position[1] + definition.build.height * character.scale * 0.9,
      character.position[2],
    ];
  }

  const prop = scene.props.find((p) => p.id === focusTargetId);
  if (prop) {
    const definition = getPropDefinition(prop.definitionId);
    return [
      prop.position[0],
      prop.position[1] + definition.size[1] * prop.scale * 0.6,
      prop.position[2],
    ];
  }
  return null;
}
