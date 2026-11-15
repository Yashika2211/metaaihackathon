import {
  angleBetween,
  clamp01,
  cross,
  distance,
  dot,
  normalize,
  scale,
  sub,
  type Vec3,
} from '../core/vec';
import { FINGER_CHAINS, J, type HandPose } from '../hands/joints';

/** Reference frame for direction features: toward the wall, and world up. */
export interface WallFrame {
  forward: Vec3;
  up: Vec3;
}

export interface HandFeatures {
  handedness: 'left' | 'right';
  /** 0 = straight, 1 = fully curled. */
  curl: { thumb: number; index: number; middle: number; ring: number; pinky: number };
  /** Mean angle (radians) between index–middle and middle–ring directions. */
  spread: number;
  /** Angle (radians) between ring and pinky directions: the dog's jaw. */
  jawAngle: number;
  /** Thumb tip to each fingertip distance divided by hand size. */
  thumbTo: { index: number; middle: number; ring: number; pinky: number };
  /** Thumb tip to index tip, metres (pinch). */
  pinchDistance: number;
  /** Wrist to middle knuckle, metres. */
  handSize: number;
  palmNormal: Vec3;
  /** Mean pointing direction of index + middle fingers. */
  pointDir: Vec3;
  indexDir: Vec3;
  thumbDir: Vec3;
  /** palmNormal · forward (+1 = palm faces the wall). */
  palmFacing: number;
  /** palmNormal · up (+1 = palm faces the sky). */
  palmUp: number;
  /** pointDir · up */
  pointUp: number;
  /** pointDir · forward */
  pointForward: number;
  indexForward: number;
  /** thumbDir · up */
  thumbUp: number;
  wrist: Vec3;
  thumbTip: Vec3;
  indexTip: Vec3;
  /** Centroid of all joints. */
  center: Vec3;
}

/** Sum of bend angles along a joint chain. */
function chainBend(h: HandPose, chain: readonly number[]): number {
  let total = 0;
  for (let i = 0; i + 2 < chain.length; i++) {
    const a = sub(h.joints[chain[i + 1]], h.joints[chain[i]]);
    const b = sub(h.joints[chain[i + 2]], h.joints[chain[i + 1]]);
    total += angleBetween(a, b);
  }
  return total;
}

/** Maximum plausible total bend for a finger (MCP + PIP + DIP), radians. */
const FINGER_MAX_BEND = 4.0;
const THUMB_MAX_BEND = 1.6;

export function palmNormalOf(h: HandPose): Vec3 {
  const w = h.joints[J.wrist];
  const n = normalize(cross(sub(h.joints[J.indexProx], w), sub(h.joints[J.pinkyProx], w)));
  return h.handedness === 'right' ? n : scale(n, -1);
}

const dirOf = (h: HandPose, from: number, to: number): Vec3 =>
  normalize(sub(h.joints[to], h.joints[from]));

export function computeFeatures(h: HandPose, frame: WallFrame): HandFeatures {
  const fwd = normalize(frame.forward);
  const up = normalize(frame.up);
  const handSize = Math.max(0.04, distance(h.joints[J.wrist], h.joints[J.middleProx]));

  const curl = {
    thumb: clamp01(chainBend(h, FINGER_CHAINS.thumb) / THUMB_MAX_BEND),
    index: clamp01(chainBend(h, FINGER_CHAINS.index) / FINGER_MAX_BEND),
    middle: clamp01(chainBend(h, FINGER_CHAINS.middle) / FINGER_MAX_BEND),
    ring: clamp01(chainBend(h, FINGER_CHAINS.ring) / FINGER_MAX_BEND),
    pinky: clamp01(chainBend(h, FINGER_CHAINS.pinky) / FINGER_MAX_BEND),
  };

  const indexDir = dirOf(h, J.indexProx, J.indexTip);
  const middleDir = dirOf(h, J.middleProx, J.middleTip);
  const thumbDir = dirOf(h, J.thumbProx, J.thumbTip);
  const pointDir = normalize([
    indexDir[0] + middleDir[0],
    indexDir[1] + middleDir[1],
    indexDir[2] + middleDir[2],
  ]);

  // Spread and jaw use the proximal phalanges: they show the fan of the fingers
  // without being thrown off by how much each finger is curled.
  const iK = dirOf(h, J.indexProx, J.indexInter);
  const mK = dirOf(h, J.middleProx, J.middleInter);
  const rK = dirOf(h, J.ringProx, J.ringInter);
  const pK = dirOf(h, J.pinkyProx, J.pinkyInter);
  const spread = (angleBetween(iK, mK) + angleBetween(mK, rK)) / 2;
  const jawAngle = angleBetween(rK, pK);

  const tt = h.joints[J.thumbTip];
  const thumbTo = {
    index: distance(tt, h.joints[J.indexTip]) / handSize,
    middle: distance(tt, h.joints[J.middleTip]) / handSize,
    ring: distance(tt, h.joints[J.ringTip]) / handSize,
    pinky: distance(tt, h.joints[J.pinkyTip]) / handSize,
  };

  const palmNormal = palmNormalOf(h);
  let cx = 0, cy = 0, cz = 0;
  for (const j of h.joints) { cx += j[0]; cy += j[1]; cz += j[2]; }
  const n = h.joints.length;

  return {
    handedness: h.handedness,
    curl,
    spread,
    jawAngle,
    thumbTo,
    pinchDistance: distance(tt, h.joints[J.indexTip]),
    handSize,
    palmNormal,
    pointDir,
    indexDir,
    thumbDir,
    palmFacing: dot(palmNormal, fwd),
    palmUp: dot(palmNormal, up),
    pointUp: dot(pointDir, up),
    pointForward: dot(pointDir, fwd),
    indexForward: dot(indexDir, fwd),
    thumbUp: dot(thumbDir, up),
    wrist: h.joints[J.wrist],
    thumbTip: tt,
    indexTip: h.joints[J.indexTip],
    center: [cx / n, cy / n, cz / n],
  };
}
