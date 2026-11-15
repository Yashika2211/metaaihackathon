import { add, cross, normalize, scale, type Vec3 } from '../core/vec';
import type { HandPose, HandsFrame } from './joints';
import { synthHand, type SynthHandParams } from './synthetic';

/**
 * A "stage": where the player's hands are, relative to the wall.
 * forward points from the player toward the wall; up is world up.
 */
export interface Stage {
  /** Comfortable point in front of the player where hands make shapes. */
  center: Vec3;
  forward: Vec3;
  up: Vec3;
}

export const DEFAULT_STAGE: Stage = {
  center: [0, 1.08, -0.33],
  forward: [0, 0, -1],
  up: [0, 1, 0],
};

export const stageRight = (s: Stage): Vec3 => normalize(cross(s.forward, s.up));

/** Names of every scripted pose, used by tests, debug keys, demo mode and ghost hints. */
export type PoseName =
  | 'rabbit'
  | 'rabbitAlt'
  | 'bird'
  | 'birdFlap'
  | 'birdAlt'
  | 'dog'
  | 'dogBark'
  | 'dogAlt'
  | 'snail'
  | 'snailAlt'
  | 'relaxed'
  | 'fist'
  | 'pointUp'
  | 'flatFacing'
  | 'palmUp'
  | 'pinch'
  | 'okSign'
  | 'threeUp';

/** Wrist position that puts the fingers roughly at the stage centre. */
const wristFor = (s: Stage, fingerDir: Vec3, offset: Vec3 = [0, 0, 0]): Vec3 =>
  add(add(s.center, scale(normalize(fingerDir), -0.07)), offset);

type Opt = { offset?: Vec3; handedness?: 'left' | 'right'; size?: number };

function oneHand(s: Stage, p: Omit<SynthHandParams, 'position' | 'handedness'>, o: Opt): HandsFrame {
  const handedness = o.handedness ?? 'right';
  const R = stageRight(s);
  const side = handedness === 'right' ? 0.04 : -0.04;
  const hand = synthHand({
    ...p,
    handedness,
    size: o.size,
    position: wristFor(s, p.fingerDir, add(scale(R, side), o.offset ?? [0, 0, 0])),
  });
  return {
    left: handedness === 'left' ? hand : null,
    right: handedness === 'right' ? hand : null,
    time: 0,
  };
}

/** Build a scripted pose. `phase` (0..1) animates flapping / jaw where relevant. */
export function makePose(name: PoseName, s: Stage = DEFAULT_STAGE, o: Opt = {}, phase = 0): HandsFrame {
  const F = normalize(s.forward);
  const U = normalize(s.up);
  const R = stageRight(s);
  const handed = o.handedness ?? 'right';
  // For a right hand, palm facing "left" (-R) means side-on with thumb up when fingers point forward.
  const sideFacing = handed === 'right' ? scale(R, -1) : R;
  // Profile poses point the fingers sideways, parallel to the wall: right hand → right.
  const outward = handed === 'right' ? R : scale(R, -1);
  const curled = { index: 0.92, middle: 0.95, ring: 0.95, pinky: 0.95 };

  switch (name) {
    case 'rabbit':
      return oneHand(s, {
        fingerDir: normalize(add(U, scale(F, 0.15))),
        palmFacing: F,
        curls: { index: 0.04, middle: 0.04, ring: 0.95, pinky: 0.95 },
        thumbTouch: 'ring',
        spread: 0.14,
      }, o);
    case 'rabbitAlt':
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: { index: 0.05, middle: 0.05, ring: 0.9, pinky: 0.9 },
        thumbCurl: 0.2,
        spread: 0.3,
      }, o);
    case 'snail':
      return oneHand(s, {
        fingerDir: normalize(add(add(outward, scale(F, 0.5)), scale(U, 0.15))),
        palmFacing: scale(U, -1),
        curls: { index: 0.08, middle: 0.08, ring: 0.95, pinky: 0.95 },
        thumbTouch: 'ring',
        spread: 0.2,
      }, o);
    case 'snailAlt':
      return oneHand(s, {
        fingerDir: F,
        palmFacing: scale(U, -1),
        curls: { index: 0.05, middle: 0.92, ring: 0.95, pinky: 0.95 },
        thumbTouch: 'middle',
      }, o);
    case 'dog':
    case 'dogBark': {
      const open = name === 'dogBark' ? 0.5 + 0.5 * Math.sin(phase * Math.PI * 2) : 0;
      return oneHand(s, {
        fingerDir: normalize(add(outward, scale(U, 0.1))),
        palmFacing: F,
        curls: { index: 0.05, middle: 0.05, ring: 0.06, pinky: 0.1 },
        spread: 0.02,
        pinkyAbduct: 0.75 * open,
        thumbDir: [-0.95, 0.3, 0.05],
        thumbCurl: 0.05,
      }, o);
    }
    case 'dogAlt':
      return oneHand(s, {
        fingerDir: outward,
        palmFacing: F,
        curls: curled,
        thumbDir: [-1, 0.05, 0],
        thumbCurl: 0,
      }, o);
    case 'birdAlt':
    case 'flatFacing': {
      const flap = name === 'birdAlt' ? 0.4 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) : 0;
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: { index: flap, middle: flap, ring: flap, pinky: flap },
        thumbDir: [-1, 0.25, 0],
        spread: name === 'birdAlt' ? 0.34 : 0.0,
      }, o);
    }
    case 'bird':
    case 'birdFlap': {
      const flap = name === 'birdFlap' ? 0.32 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) : 0.04;
      const hook = add(add(s.center, scale(U, 0.035)), o.offset ?? [0, 0, 0]);
      const make = (h: 'left' | 'right'): HandPose => {
        const sign = h === 'right' ? 1 : -1;
        const fingerDir = normalize(add(scale(R, sign), scale(U, 0.35)));
        return synthHand({
          handedness: h,
          position: add(add(add(s.center, scale(R, -sign * 0.035)), scale(U, -0.02)), o.offset ?? [0, 0, 0]),
          fingerDir,
          palmFacing: F,
          curls: { index: flap, middle: flap, ring: flap, pinky: flap },
          spread: 0.16,
          thumbTargetWorld: add(hook, scale(R, sign * 0.006)),
          size: o.size,
        });
      };
      return { left: make('left'), right: make('right'), time: 0 };
    }
    case 'relaxed':
      return oneHand(s, {
        fingerDir: normalize(add(U, scale(F, 0.6))),
        palmFacing: normalize(add(scale(U, -0.5), sideFacing)),
        curls: { index: 0.35, middle: 0.42, ring: 0.48, pinky: 0.5 },
        thumbCurl: 0.3,
        spread: 0.1,
      }, o);
    case 'fist':
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: curled,
        thumbCurl: 0.9,
      }, o);
    case 'pointUp':
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: { index: 0.04, middle: 0.92, ring: 0.95, pinky: 0.95 },
        thumbTouch: 'middle',
      }, o);
    case 'threeUp':
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: { index: 0.04, middle: 0.04, ring: 0.06, pinky: 0.95 },
        thumbTouch: 'pinky',
        spread: 0.15,
      }, o);
    case 'palmUp':
      return oneHand(s, {
        fingerDir: F,
        palmFacing: U,
        curls: { index: 0.08, middle: 0.08, ring: 0.1, pinky: 0.12 },
        spread: 0.12,
      }, o);
    case 'pinch':
      return oneHand(s, {
        fingerDir: normalize(add(F, U)),
        palmFacing: sideFacing,
        curls: { index: 0.42, middle: 0.5, ring: 0.6, pinky: 0.65 },
        thumbTouch: 'index',
      }, o);
    case 'okSign':
      return oneHand(s, {
        fingerDir: U,
        palmFacing: F,
        curls: { index: 0.55, middle: 0.05, ring: 0.06, pinky: 0.08 },
        thumbTouch: 'index',
        spread: 0.12,
      }, o);
  }
}

/** All creature-making poses, for iteration in tests and the journal. */
export const CREATURE_POSES: PoseName[] = [
  'rabbit', 'rabbitAlt', 'bird', 'birdAlt', 'dog', 'dogAlt', 'snail', 'snailAlt',
];

/** Poses that must NOT be recognised as any creature. */
export const NEUTRAL_POSES: PoseName[] = [
  'relaxed', 'fist', 'pointUp', 'flatFacing', 'palmUp', 'pinch', 'okSign', 'threeUp',
];
