import type { Vec3 } from '../core/vec';

/** WebXR Hand Input joint order (25 joints per hand). */
export const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const;

export type JointName = (typeof JOINT_NAMES)[number];
export const JOINT_COUNT = JOINT_NAMES.length;

export const J = {
  wrist: 0,
  thumbMeta: 1,
  thumbProx: 2,
  thumbDist: 3,
  thumbTip: 4,
  indexMeta: 5,
  indexProx: 6,
  indexInter: 7,
  indexDist: 8,
  indexTip: 9,
  middleMeta: 10,
  middleProx: 11,
  middleInter: 12,
  middleDist: 13,
  middleTip: 14,
  ringMeta: 15,
  ringProx: 16,
  ringInter: 17,
  ringDist: 18,
  ringTip: 19,
  pinkyMeta: 20,
  pinkyProx: 21,
  pinkyInter: 22,
  pinkyDist: 23,
  pinkyTip: 24,
} as const;

export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
export const FINGERS: readonly Finger[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

/** Joint chain for each finger, from metacarpal to tip. */
export const FINGER_CHAINS: Record<Finger, readonly number[]> = {
  thumb: [J.thumbMeta, J.thumbProx, J.thumbDist, J.thumbTip],
  index: [J.indexMeta, J.indexProx, J.indexInter, J.indexDist, J.indexTip],
  middle: [J.middleMeta, J.middleProx, J.middleInter, J.middleDist, J.middleTip],
  ring: [J.ringMeta, J.ringProx, J.ringInter, J.ringDist, J.ringTip],
  pinky: [J.pinkyMeta, J.pinkyProx, J.pinkyInter, J.pinkyDist, J.pinkyTip],
};

/** Bone segments (pairs of joint indices) used to build shadow capsules. */
export const BONES: ReadonlyArray<readonly [number, number]> = (() => {
  const bones: Array<[number, number]> = [];
  for (const f of FINGERS) {
    const chain = FINGER_CHAINS[f];
    bones.push([J.wrist, chain[0]]);
    for (let i = 0; i < chain.length - 1; i++) bones.push([chain[i], chain[i + 1]]);
  }
  // Palm web so the shadow reads as a solid hand, not a skeleton.
  bones.push([J.indexProx, J.middleProx]);
  bones.push([J.middleProx, J.ringProx]);
  bones.push([J.ringProx, J.pinkyProx]);
  bones.push([J.thumbProx, J.indexProx]);
  bones.push([J.indexMeta, J.pinkyMeta]);
  bones.push([J.thumbMeta, J.indexMeta]);
  return bones;
})();

export type Handedness = 'left' | 'right';

/** A single tracked hand: 25 joint positions (world space, metres) and radii. */
export interface HandPose {
  handedness: Handedness;
  joints: Vec3[];
  radii: number[];
}

/** Both hands for one frame. Either may be missing (not tracked). */
export interface HandsFrame {
  left: HandPose | null;
  right: HandPose | null;
  /** Timestamp in ms. */
  time: number;
}
