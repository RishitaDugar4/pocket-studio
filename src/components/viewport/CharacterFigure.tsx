"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCharacterDefinition } from "@/data/characters";
import type { CharacterAnimation } from "@/types";

/**
 * A stylized stand-in actor built from primitives. It is not meant to look
 * real — it is meant to read clearly at any shot size, so the director can see
 * where a body is, which way it faces and roughly what it is doing.
 *
 * Everything is authored at a nominal height of 1.0 and scaled by the cast
 * definition, which keeps every framing calculation in `lib/cinematography`
 * valid for any actor.
 */

interface Pose {
  hipDrop: number;
  torsoLean: number;
  torsoTwist: number;
  headPitch: number;
  headYaw: number;
  shoulderL: [number, number];
  shoulderR: [number, number];
  elbowL: number;
  elbowR: number;
  hipL: [number, number];
  hipR: [number, number];
  kneeL: number;
  kneeR: number;
}

const NEUTRAL: Pose = {
  hipDrop: 0,
  torsoLean: 0.02,
  torsoTwist: 0,
  headPitch: 0,
  headYaw: 0,
  shoulderL: [0.06, 0.1],
  shoulderR: [0.06, -0.1],
  elbowL: -0.18,
  elbowR: -0.18,
  hipL: [0.02, 0.035],
  hipR: [-0.02, -0.035],
  kneeL: -0.05,
  kneeR: -0.05,
};

const POSES: Record<CharacterAnimation, Pose> = {
  IDLE: NEUTRAL,
  STAND: { ...NEUTRAL, shoulderL: [0.02, 0.06], shoulderR: [0.02, -0.06], elbowL: -0.08, elbowR: -0.08 },
  WALK: {
    ...NEUTRAL,
    torsoLean: 0.06,
    shoulderL: [-0.5, 0.08],
    shoulderR: [0.5, -0.08],
    elbowL: -0.5,
    elbowR: -0.4,
    hipL: [0.42, 0.02],
    hipR: [-0.38, -0.02],
    kneeL: -0.2,
    kneeR: -0.65,
  },
  SIT: {
    ...NEUTRAL,
    // 0.27 of body height puts the hips at chair-seat height with feet on the floor.
    hipDrop: 0.27,
    torsoLean: 0.08,
    shoulderL: [0.3, 0.16],
    shoulderR: [0.3, -0.16],
    elbowL: -0.95,
    elbowR: -0.95,
    hipL: [1.5, 0.1],
    hipR: [1.5, -0.1],
    kneeL: -1.55,
    kneeR: -1.55,
  },
  TURN: { ...NEUTRAL, torsoTwist: 0.7, headYaw: 0.45, hipL: [0.06, 0.14], hipR: [-0.04, -0.06] },
  LOOK: { ...NEUTRAL, torsoTwist: 0.16, headYaw: 0.62, headPitch: -0.08 },
  TALK: {
    ...NEUTRAL,
    headPitch: -0.05,
    shoulderL: [0.5, 0.28],
    shoulderR: [0.35, -0.22],
    elbowL: -1.1,
    elbowR: -0.9,
  },
  PHONE: {
    ...NEUTRAL,
    headPitch: 0.34,
    torsoLean: 0.07,
    shoulderL: [0.95, 0.2],
    shoulderR: [0.2, -0.08],
    elbowL: -1.5,
    elbowR: -0.12,
  },
};

/** Per-pose idle motion. Subtle on purpose: previs, not a game character. */
const MOTION: Record<CharacterAnimation, { breathe: number; cycle: number; sway: number }> = {
  IDLE: { breathe: 1, cycle: 0, sway: 0.6 },
  STAND: { breathe: 0.8, cycle: 0, sway: 0.3 },
  WALK: { breathe: 0.6, cycle: 2.6, sway: 0.4 },
  SIT: { breathe: 0.9, cycle: 0, sway: 0.2 },
  TURN: { breathe: 0.8, cycle: 0, sway: 0.4 },
  LOOK: { breathe: 0.8, cycle: 0, sway: 0.35 },
  TALK: { breathe: 1.2, cycle: 1.4, sway: 0.7 },
  PHONE: { breathe: 0.9, cycle: 0, sway: 0.3 },
};

function Limb({
  length,
  radius,
  color,
  emissive,
}: {
  length: number;
  radius: number;
  color: string;
  emissive: number;
}) {
  const geometry = useMemo(
    () => new THREE.CapsuleGeometry(radius, Math.max(length - radius * 1.4, 0.01), 3, 8),
    [radius, length],
  );
  return (
    <mesh geometry={geometry} position={[0, -length / 2, 0]} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        emissive={color}
        emissiveIntensity={emissive}
        flatShading
      />
    </mesh>
  );
}

export interface CharacterFigureProps {
  definitionId: string;
  animation: CharacterAnimation;
  accentColor: string;
  /** 0 = unselected, 1 = selected. Drives a subtle rim lift, never an outline. */
  highlight?: number;
  /** Offsets the idle motion so two actors never breathe in lockstep. */
  seed?: number;
}

export const CharacterFigure = memo(function CharacterFigure({
  definitionId,
  animation,
  accentColor,
  highlight = 0,
  seed = 0,
}: CharacterFigureProps) {
  const definition = getCharacterDefinition(definitionId);
  const { build } = definition;
  const shoulders = build.shoulders / build.height;
  const hips = build.hips / build.height;

  const joints = useRef<Record<string, THREE.Group | null>>({});
  const current = useRef<Pose>({ ...POSES[animation] });
  const phase = useRef(seed);

  useFrame((_, delta) => {
    const target = POSES[animation];
    const motion = MOTION[animation];
    phase.current += delta;
    const t = phase.current;

    // Ease toward the target pose so changing an action reads as a move, not a cut.
    const k = Math.min(delta * 9, 1);
    const cur = current.current;
    const lerp = (a: number, b: number) => a + (b - a) * k;
    cur.hipDrop = lerp(cur.hipDrop, target.hipDrop);
    cur.torsoLean = lerp(cur.torsoLean, target.torsoLean);
    cur.torsoTwist = lerp(cur.torsoTwist, target.torsoTwist);
    cur.headPitch = lerp(cur.headPitch, target.headPitch);
    cur.headYaw = lerp(cur.headYaw, target.headYaw);
    cur.elbowL = lerp(cur.elbowL, target.elbowL);
    cur.elbowR = lerp(cur.elbowR, target.elbowR);
    cur.kneeL = lerp(cur.kneeL, target.kneeL);
    cur.kneeR = lerp(cur.kneeR, target.kneeR);
    cur.shoulderL = [lerp(cur.shoulderL[0], target.shoulderL[0]), lerp(cur.shoulderL[1], target.shoulderL[1])];
    cur.shoulderR = [lerp(cur.shoulderR[0], target.shoulderR[0]), lerp(cur.shoulderR[1], target.shoulderR[1])];
    cur.hipL = [lerp(cur.hipL[0], target.hipL[0]), lerp(cur.hipL[1], target.hipL[1])];
    cur.hipR = [lerp(cur.hipR[0], target.hipR[0]), lerp(cur.hipR[1], target.hipR[1])];

    const breath = Math.sin(t * 1.35) * 0.012 * motion.breathe;
    const sway = Math.sin(t * 0.62) * 0.018 * motion.sway;
    const cycle = motion.cycle > 0 ? Math.sin(t * 3.1) : 0;

    const hipGroup = joints.current.hips;
    if (hipGroup) {
      hipGroup.position.y = 0.52 - cur.hipDrop + breath * 0.4;
      hipGroup.rotation.z = sway * 0.4;
    }
    const torso = joints.current.torso;
    if (torso) {
      torso.rotation.x = cur.torsoLean + breath;
      torso.rotation.y = cur.torsoTwist + sway;
    }
    const head = joints.current.head;
    if (head) {
      head.rotation.x = cur.headPitch + breath * 0.6;
      head.rotation.y = cur.headYaw + sway * 1.6 + (motion.cycle > 1 ? cycle * 0.03 : 0);
    }
    const armL = joints.current.armL;
    const armR = joints.current.armR;
    if (armL) {
      armL.rotation.x = cur.shoulderL[0] + cycle * 0.22 * motion.cycle * 0.4;
      armL.rotation.z = cur.shoulderL[1];
    }
    if (armR) {
      armR.rotation.x = cur.shoulderR[0] - cycle * 0.22 * motion.cycle * 0.4;
      armR.rotation.z = cur.shoulderR[1];
    }
    const elbowL = joints.current.elbowL;
    const elbowR = joints.current.elbowR;
    if (elbowL) elbowL.rotation.x = cur.elbowL;
    if (elbowR) elbowR.rotation.x = cur.elbowR;

    const legL = joints.current.legL;
    const legR = joints.current.legR;
    if (legL) {
      legL.rotation.x = cur.hipL[0] + cycle * 0.3 * motion.cycle * 0.4;
      legL.rotation.z = cur.hipL[1];
    }
    if (legR) {
      legR.rotation.x = cur.hipR[0] - cycle * 0.3 * motion.cycle * 0.4;
      legR.rotation.z = cur.hipR[1];
    }
    const kneeL = joints.current.kneeL;
    const kneeR = joints.current.kneeR;
    if (kneeL) kneeL.rotation.x = cur.kneeL - Math.max(cycle, 0) * 0.4 * motion.cycle * 0.35;
    if (kneeR) kneeR.rotation.x = cur.kneeR - Math.max(-cycle, 0) * 0.4 * motion.cycle * 0.35;
  });

  const emissive = highlight * 0.16;
  const skin = build.skin;
  const cloth = build.clothing;

  const thigh = 0.245;
  const shin = 0.235;
  const upperArm = 0.17;
  const foreArm = 0.16;

  return (
    <group scale={build.height}>
      <group ref={(el) => void (joints.current.hips = el)} position={[0, 0.52, 0]}>
        {/* pelvis */}
        <mesh castShadow>
          <boxGeometry args={[hips, 0.12, hips * 0.66]} />
          <meshStandardMaterial color={cloth} roughness={0.8} emissive={cloth} emissiveIntensity={emissive} flatShading />
        </mesh>

        {/* torso */}
        <group ref={(el) => void (joints.current.torso = el)}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[shoulders * 0.94, 0.3, hips * 0.62]} />
            <meshStandardMaterial
              color={accentColor}
              roughness={0.78}
              emissive={accentColor}
              emissiveIntensity={0.04 + emissive}
              flatShading
            />
          </mesh>
          {/* shoulder line */}
          <mesh position={[0, 0.29, 0]} castShadow>
            <boxGeometry args={[shoulders, 0.07, hips * 0.6]} />
            <meshStandardMaterial color={cloth} roughness={0.8} emissive={cloth} emissiveIntensity={emissive} flatShading />
          </mesh>

          {/* neck + head */}
          <group ref={(el) => void (joints.current.head = el)} position={[0, 0.32, 0]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.032, 0.036, 0.06, 7]} />
              <meshStandardMaterial color={skin} roughness={0.7} emissive={skin} emissiveIntensity={emissive} flatShading />
            </mesh>
            <mesh position={[0, 0.125, 0]} castShadow>
              <boxGeometry args={[0.105, 0.142, 0.115]} />
              <meshStandardMaterial color={skin} roughness={0.68} emissive={skin} emissiveIntensity={emissive} flatShading />
            </mesh>
            {/* nose — the only detail, so facing direction is unmistakable */}
            <mesh position={[0, 0.115, 0.075]}>
              <boxGeometry args={[0.028, 0.03, 0.035]} />
              <meshStandardMaterial color={skin} roughness={0.7} flatShading />
            </mesh>
          </group>

          {/* arms */}
          <group ref={(el) => void (joints.current.armL = el)} position={[shoulders / 2, 0.28, 0]}>
            <Limb length={upperArm} radius={0.036} color={cloth} emissive={emissive} />
            <group ref={(el) => void (joints.current.elbowL = el)} position={[0, -upperArm, 0]}>
              <Limb length={foreArm} radius={0.031} color={skin} emissive={emissive} />
            </group>
          </group>
          <group ref={(el) => void (joints.current.armR = el)} position={[-shoulders / 2, 0.28, 0]}>
            <Limb length={upperArm} radius={0.036} color={cloth} emissive={emissive} />
            <group ref={(el) => void (joints.current.elbowR = el)} position={[0, -upperArm, 0]}>
              <Limb length={foreArm} radius={0.031} color={skin} emissive={emissive} />
            </group>
          </group>
        </group>

        {/* legs */}
        <group ref={(el) => void (joints.current.legL = el)} position={[hips * 0.26, -0.05, 0]}>
          <Limb length={thigh} radius={0.05} color={cloth} emissive={emissive} />
          <group ref={(el) => void (joints.current.kneeL = el)} position={[0, -thigh, 0]}>
            <Limb length={shin} radius={0.042} color={cloth} emissive={emissive} />
            <mesh position={[0, -shin - 0.01, 0.03]} castShadow>
              <boxGeometry args={[0.07, 0.035, 0.14]} />
              <meshStandardMaterial color="#1f2124" roughness={0.7} flatShading />
            </mesh>
          </group>
        </group>
        <group ref={(el) => void (joints.current.legR = el)} position={[-hips * 0.26, -0.05, 0]}>
          <Limb length={thigh} radius={0.05} color={cloth} emissive={emissive} />
          <group ref={(el) => void (joints.current.kneeR = el)} position={[0, -thigh, 0]}>
            <Limb length={shin} radius={0.042} color={cloth} emissive={emissive} />
            <mesh position={[0, -shin - 0.01, 0.03]} castShadow>
              <boxGeometry args={[0.07, 0.035, 0.14]} />
              <meshStandardMaterial color="#1f2124" roughness={0.7} flatShading />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
});
