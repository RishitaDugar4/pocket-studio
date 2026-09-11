"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { evaluateBlocking, stageClock } from "@/lib/animation";
import type { BlockingEventDoc, CharacterAnimation, SceneCharacterDoc } from "@/types";

/**
 * Drives an actor's transform from their blocking beats. The transform is
 * mutated directly in the render loop — a walking actor must not re-render
 * React sixty times a second — while the pose, which only changes at beat
 * boundaries, is published as state so the figure can ease into it.
 */
export function BlockingMotion({
  character,
  beats,
  target,
  onPose,
}: {
  character: SceneCharacterDoc;
  beats: BlockingEventDoc[];
  target: React.RefObject<THREE.Group | null>;
  onPose: (pose: { animation: CharacterAnimation; seated: boolean }) => void;
}) {
  const lastAnimation = useRef<CharacterAnimation>(character.animation);
  const lastSeated = useRef<boolean>(character.animation === "SIT");

  useFrame(() => {
    const group = target.current;
    if (!group || beats.length === 0) return;
    const state = evaluateBlocking(character, beats, stageClock.sceneTime);
    group.position.set(...state.position);
    group.rotation.set(...state.rotation);
    if (state.animation !== lastAnimation.current || state.seated !== lastSeated.current) {
      lastAnimation.current = state.animation;
      lastSeated.current = state.seated;
      onPose({ animation: state.animation, seated: state.seated });
    }
  });

  // Snap back to the standing placement when the blocking is removed.
  useEffect(() => {
    if (beats.length !== 0) return;
    const group = target.current;
    if (group) {
      group.position.set(...character.position);
      group.rotation.set(...character.rotation);
    }
    if (lastAnimation.current !== character.animation) {
      lastAnimation.current = character.animation;
      lastSeated.current = character.animation === "SIT";
      onPose({ animation: character.animation, seated: character.animation === "SIT" });
    }
  }, [beats.length, character.position, character.rotation, character.animation, target, onPose]);

  return null;
}

/** Pose currently showing for an actor, kept out of the render loop. */
export function useLivePose(initial: CharacterAnimation) {
  const [pose, setPose] = useState<{ animation: CharacterAnimation; seated: boolean }>({
    animation: initial,
    seated: initial === "SIT",
  });
  return [pose, setPose] as const;
}
