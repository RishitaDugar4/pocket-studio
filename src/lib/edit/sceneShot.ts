import { movementEndTransform } from "@/lib/cinematography";
import { sceneDuration } from "@/lib/animation";
import type { SceneDoc, ShotDoc } from "@/types";

/**
 * Treats a whole scene as if it were one shot from its active camera. Used to
 * play a scene back — for comparing versions, and anywhere a scene needs to be
 * previewed with the same machinery a real shot uses.
 */
export function sceneAsShot(scene: SceneDoc): ShotDoc | null {
  const camera = scene.cameras.find((c) => c.isActive) ?? scene.cameras[0];
  if (!camera) return null;

  const duration = sceneDuration(scene);
  const cameraState = {
    position: camera.position,
    target: camera.target,
    focalLength: camera.focalLength,
    aperture: camera.aperture,
    dofEnabled: camera.dofEnabled,
    focusTargetId: camera.focusTargetId,
  };

  return {
    id: `scene-shot-${scene.id}`,
    index: 0,
    name: scene.name,
    shotSize: camera.shotSize,
    duration,
    sceneTime: 0,
    cameraState,
    subjects: scene.characters.map((c) => c.id),
    notes: scene.notes,
    transition: "CUT",
    cameraId: camera.id,
    frameUrl: null,
    movements:
      camera.movementType === "STATIC"
        ? []
        : [
            {
              id: `scene-move-${scene.id}`,
              type: camera.movementType,
              startTime: 0,
              duration: Math.max(camera.movementDuration, 0.1),
              intensity: camera.movementIntensity,
              startTransform: cameraState,
              endTransform: movementEndTransform(
                cameraState,
                camera.movementType,
                camera.movementIntensity,
              ),
            },
          ],
  };
}
