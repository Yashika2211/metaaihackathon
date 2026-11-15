import {
  add,
  cross,
  lerp3,
  normalize,
  rotateAxis,
  scale,
  sub,
  type Vec3,
} from '../core/vec';
import { J, JOINT_COUNT, type Handedness, type HandPose } from './joints';

/**
 * Forward-kinematic synthetic hand. Builds a plausible 25-joint WebXR hand
 * from a handful of intuitive parameters (finger curls, spread, thumb target).
 *
 * Canonical RIGHT hand local frame:
 *   +Y  fingers point this way
 *   -Z  palm faces this way (palm normal)
 *   -X  thumb side
 * The left hand mirrors X.
 */

export interface FingerCurls {
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}

export interface SynthHandParams {
  handedness: Handedness;
  /** Wrist position, world space. */
  position: Vec3;
  /** World direction the fingers point (local +Y). */
  fingerDir: Vec3;
  /** World direction the palm faces (palm normal, local -Z). */
  palmFacing: Vec3;
  curls: FingerCurls;
  /** 0 = thumb straight, 1 = thumb folded across the palm. */
  thumbCurl?: number;
  /** Local direction for the thumb (before curl). */
  thumbDir?: Vec3;
  /** If set, the thumb tip is bent to touch this world point. */
  thumbTargetWorld?: Vec3;
  /** If set, the thumb tip touches this finger's tip. */
  thumbTouch?: keyof FingerCurls;
  /** Finger fan angle, radians (0 = together, 0.3 = wide). */
  spread?: number;
  /** Extra pinky rotation away from the ring finger, radians (dog jaw). */
  pinkyAbduct?: number;
  /** Uniform size multiplier (1 = adult average). */
  size?: number;
}

const FINGER_LAYOUT: Record<keyof FingerCurls, { base: Vec3; knuckle: Vec3; lengths: [number, number, number]; fan: number }> = {
  index: { base: [-0.02, 0.022, 0], knuckle: [-0.028, 0.09, 0], lengths: [0.041, 0.024, 0.022], fan: 1.0 },
  middle: { base: [-0.005, 0.024, 0], knuckle: [-0.007, 0.093, 0], lengths: [0.045, 0.028, 0.023], fan: 0.2 },
  ring: { base: [0.01, 0.022, 0], knuckle: [0.013, 0.087, 0], lengths: [0.042, 0.027, 0.022], fan: -0.6 },
  pinky: { base: [0.022, 0.018, 0], knuckle: [0.03, 0.077, 0], lengths: [0.033, 0.019, 0.02], fan: -1.4 },
};

const FINGER_JOINT_START: Record<keyof FingerCurls, number> = {
  index: J.indexMeta,
  middle: J.middleMeta,
  ring: J.ringMeta,
  pinky: J.pinkyMeta,
};

/** Bend distribution across MCP / PIP / DIP for curl = 1, radians. */
const BEND = [1.4, 1.75, 1.2];
const THUMB_BASE: Vec3 = [-0.02, 0.012, -0.012];
const THUMB_LENGTHS = [0.04, 0.032, 0.026];
const PALM: Vec3 = [0, 0, -1];

function buildLocal(p: SynthHandParams): Vec3[] {
  const joints: Vec3[] = new Array(JOINT_COUNT);
  joints[J.wrist] = [0, 0, 0];
  const spread = p.spread ?? 0.08;

  for (const name of Object.keys(FINGER_LAYOUT) as Array<keyof FingerCurls>) {
    const lay = FINGER_LAYOUT[name];
    const start = FINGER_JOINT_START[name];
    joints[start] = lay.base;
    joints[start + 1] = lay.knuckle;
    let fan = lay.fan * spread;
    if (name === 'pinky') fan -= p.pinkyAbduct ?? 0;
    // Fan rotates the finger in the palm plane around the palm normal axis.
    let dir = rotateAxis([0, 1, 0], [0, 0, 1], fan);
    const axis = normalize(cross(dir, PALM));
    const curl = p.curls[name];
    let pos = lay.knuckle;
    for (let s = 0; s < 3; s++) {
      dir = normalize(rotateAxis(dir, axis, BEND[s] * curl));
      pos = add(pos, scale(dir, lay.lengths[s]));
      joints[start + 2 + s] = pos;
    }
  }

  // Thumb.
  joints[J.thumbMeta] = THUMB_BASE;
  if (p.thumbTouch || p.thumbTargetWorld) {
    const target = p.thumbTouch ? joints[FINGER_JOINT_START[p.thumbTouch] + 4] : p.thumbTargetWorld!;
    const base = THUMB_BASE;
    // Bow the chain slightly away from the palm so it reads as a thumb.
    const mid = lerp3(base, target, 0.5);
    const bow: Vec3 = add(mid, [-0.012, 0, 0.004]);
    joints[J.thumbProx] = lerp3(base, bow, 0.7);
    joints[J.thumbDist] = lerp3(bow, target, 0.55);
    joints[J.thumbTip] = target;
  } else {
    let dir = normalize(p.thumbDir ?? [-0.72, 0.62, -0.3]);
    const towardPalm = normalize([0.8, 0.2, -0.6]);
    const axis = normalize(cross(dir, towardPalm));
    const curl = p.thumbCurl ?? 0.15;
    let pos = THUMB_BASE;
    for (let s = 0; s < 3; s++) {
      if (s > 0) dir = normalize(rotateAxis(dir, axis, 0.75 * curl));
      pos = add(pos, scale(dir, THUMB_LENGTHS[s]));
      joints[J.thumbProx + s] = pos;
    }
  }
  return joints;
}

/** Build a world-space HandPose from parameters. */
export function synthHand(p: SynthHandParams): HandPose {
  const local = buildLocal(
    p.thumbTargetWorld ? { ...p, thumbTargetWorld: undefined } : p,
  );
  const size = p.size ?? 1;
  const mirror = p.handedness === 'left' ? -1 : 1;
  const ay = normalize(p.fingerDir);
  // Make palm facing orthogonal to the finger direction.
  const pf = normalize(p.palmFacing);
  const az0 = scale(pf, -1);
  const ax = normalize(cross(ay, az0));
  const az = normalize(cross(ax, ay));

  const toWorld = (l: Vec3): Vec3 =>
    add(
      p.position,
      add(add(scale(ax, l[0] * mirror * size), scale(ay, l[1] * size)), scale(az, l[2] * size)),
    );

  const joints = local.map(toWorld);

  if (p.thumbTargetWorld) {
    // Re-bend the thumb in world space toward the requested point.
    const base = joints[J.thumbMeta];
    const target = p.thumbTargetWorld;
    const mid = lerp3(base, target, 0.5);
    const outward = scale(ax, -0.01 * mirror);
    const bow = add(mid, outward);
    joints[J.thumbProx] = lerp3(base, bow, 0.7);
    joints[J.thumbDist] = lerp3(bow, target, 0.55);
    joints[J.thumbTip] = target;
  }

  const radii = joints.map((_, i) => {
    if (i === J.wrist) return 0.02 * size;
    if (i <= J.thumbTip) return 0.011 * size;
    if (i === J.pinkyTip || i === J.pinkyDist) return 0.007 * size;
    return 0.009 * size;
  });
  return { handedness: p.handedness, joints, radii };
}

/** Offset all joints of a hand (used for steering creatures in demo mode). */
export function translateHand(h: HandPose, offset: Vec3): HandPose {
  return { ...h, joints: h.joints.map((j) => add(j, offset)) };
}

/** Blend two hands joint-by-joint (for smooth synthetic transitions). */
export function blendHands(a: HandPose, b: HandPose, t: number): HandPose {
  return {
    handedness: b.handedness,
    joints: a.joints.map((j, i) => lerp3(j, b.joints[i], t)),
    radii: a.radii.map((r, i) => r + (b.radii[i] - r) * t),
  };
}

export const handCentroid = (h: HandPose): Vec3 => {
  let c: Vec3 = [0, 0, 0];
  for (const j of h.joints) c = add(c, j);
  return scale(c, 1 / h.joints.length);
};

export const handSpan = (h: HandPose): number => {
  const d = sub(h.joints[J.middleTip], h.joints[J.wrist]);
  return Math.hypot(d[0], d[1], d[2]);
};
