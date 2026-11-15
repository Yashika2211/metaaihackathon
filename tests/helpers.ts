import type { Vec3 } from '../src/core/vec';
import type { HandPose, HandsFrame } from '../src/hands/joints';
import { makePose, type PoseName } from '../src/hands/poseLibrary';
import type { WallFrame } from '../src/recognizer/features';

export const FRAME: WallFrame = { forward: [0, 0, -1], up: [0, 1, 0] };

/** Deterministic pseudo-random generator so noisy tests are repeatable. */
export function rng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Add Gaussian-ish jitter (metres) to every joint, like real tracking noise. */
export function jitter(h: HandPose | null, amount: number, rand: () => number): HandPose | null {
  if (!h) return null;
  const n = () => (rand() + rand() + rand() - 1.5) * amount;
  return { ...h, joints: h.joints.map((j) => [j[0] + n(), j[1] + n(), j[2] + n()] as Vec3) };
}

export function noisyFrame(name: PoseName, time: number, amount: number, rand: () => number, phase = 0): HandsFrame {
  const f = makePose(name, undefined, {}, phase);
  return { left: jitter(f.left, amount, rand), right: jitter(f.right, amount, rand), time };
}

export const at = (name: PoseName, time: number, phase = 0): HandsFrame => ({
  ...makePose(name, undefined, {}, phase),
  time,
});
