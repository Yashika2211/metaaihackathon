import type { Matrix4 } from 'three';
import type { Vec3 } from '../core/vec';
import { JOINT_COUNT, JOINT_NAMES, type HandPose, type HandsFrame } from './joints';

/**
 * Reads WebXR Hand Input (25 joints per hand) into plain HandPose objects in
 * world space. Uses the batched `fillPoses` / `fillJointRadii` APIs when the
 * runtime offers them, falling back to per-joint `getJointPose`.
 */
export class XRHandReader {
  private poses = new Float32Array(16 * JOINT_COUNT);
  private radii = new Float32Array(JOINT_COUNT);
  private spaces = new Map<XRHand, XRJointSpace[]>();
  /** Last time each hand was tracked, for "hands lost" prompts. */
  lastSeen = { left: 0, right: 0 };

  read(frame: XRFrame, refSpace: XRReferenceSpace, origin: Matrix4 | null, time: number): HandsFrame {
    const out: HandsFrame = { left: null, right: null, time };
    for (const source of frame.session.inputSources) {
      const hand = source.hand;
      if (!hand || (source.handedness !== 'left' && source.handedness !== 'right')) continue;
      const pose = this.readHand(frame, refSpace, hand, source.handedness, origin);
      if (pose) {
        out[source.handedness] = pose;
        this.lastSeen[source.handedness] = time;
      }
    }
    return out;
  }

  private jointSpaces(hand: XRHand): XRJointSpace[] {
    let s = this.spaces.get(hand);
    if (!s) {
      s = JOINT_NAMES.map((n) => hand.get(n as XRHandJoint)!).filter(Boolean);
      this.spaces.set(hand, s);
    }
    return s;
  }

  private readHand(
    frame: XRFrame,
    refSpace: XRReferenceSpace,
    hand: XRHand,
    handedness: 'left' | 'right',
    origin: Matrix4 | null,
  ): HandPose | null {
    const spaces = this.jointSpaces(hand);
    if (spaces.length !== JOINT_COUNT) return null;
    const joints: Vec3[] = new Array(JOINT_COUNT);
    const radii: number[] = new Array(JOINT_COUNT);

    let ok = false;
    const f = frame as XRFrame & {
      fillPoses?: (spaces: XRSpace[], base: XRSpace, out: Float32Array) => boolean;
      fillJointRadii?: (spaces: XRJointSpace[], out: Float32Array) => boolean;
    };
    if (f.fillPoses && f.fillJointRadii) {
      try {
        ok = f.fillPoses(spaces, refSpace, this.poses) && f.fillJointRadii(spaces, this.radii);
      } catch {
        ok = false;
      }
      if (ok) {
        for (let i = 0; i < JOINT_COUNT; i++) {
          const o = i * 16;
          joints[i] = [this.poses[o + 12], this.poses[o + 13], this.poses[o + 14]];
          radii[i] = this.radii[i];
        }
      }
    }
    if (!ok) {
      for (let i = 0; i < JOINT_COUNT; i++) {
        const jp = frame.getJointPose?.(spaces[i], refSpace);
        if (!jp) return null;
        const p = jp.transform.position;
        joints[i] = [p.x, p.y, p.z];
        radii[i] = jp.radius ?? 0.008;
      }
    }

    if (origin) {
      const e = origin.elements;
      for (let i = 0; i < JOINT_COUNT; i++) {
        const [x, y, z] = joints[i];
        joints[i] = [
          e[0] * x + e[4] * y + e[8] * z + e[12],
          e[1] * x + e[5] * y + e[9] * z + e[13],
          e[2] * x + e[6] * y + e[10] * z + e[14],
        ];
      }
    }
    return { handedness, joints, radii };
  }
}
