import { add, scale, type Vec3 } from '../core/vec';
import type { HandPose, HandsFrame } from '../hands/joints';
import { makePose, stageRight, type PoseName, type Stage as PoseStage } from '../hands/poseLibrary';
import { blendHands } from '../hands/synthetic';

/**
 * Plays scripted synthetic hands: used by the desktop preview, the debug
 * keyboard (keys 1–5) and the auto-playing demo. Poses blend smoothly and can
 * drift left/right/up/down to steer creatures.
 */
export class SyntheticDriver {
  pose: PoseName = 'relaxed';
  private prev: HandsFrame | null = null;
  private blendStart = 0;
  private blendMs = 260;
  /** Steering offset in stage units (x = right, y = up), metres. */
  offset: [number, number] = [0, 0];
  private offsetTarget: [number, number] = [0, 0];
  /** Animate flapping / barking. */
  animate = true;
  hidden = false;

  constructor(public stage: PoseStage) {}

  setPose(name: PoseName, now: number, blendMs = 260): void {
    if (name === this.pose) return;
    this.prev = this.lastFrame;
    this.pose = name;
    this.blendStart = now;
    this.blendMs = blendMs;
  }

  steer(x: number, y: number): void {
    this.offsetTarget = [x, y];
  }

  private lastFrame: HandsFrame | null = null;

  frame(now: number, dtMs: number): HandsFrame {
    if (this.hidden) return { left: null, right: null, time: now };
    const k = Math.min(1, dtMs / 400);
    this.offset[0] += (this.offsetTarget[0] - this.offset[0]) * k;
    this.offset[1] += (this.offsetTarget[1] - this.offset[1]) * k;
    const R = stageRight(this.stage);
    const off: Vec3 = add(scale(R, this.offset[0]), scale(this.stage.up, this.offset[1]));
    // Gentle idle sway so the shadow always feels alive.
    const sway: Vec3 = add(scale(R, Math.sin(now / 1300) * 0.006), scale(this.stage.up, Math.sin(now / 900) * 0.004));
    let phase = 0;
    if (this.animate) {
      if (this.pose === 'birdFlap' || this.pose === 'birdAlt') phase = now / 380;
      if (this.pose === 'dogBark') phase = now / 520;
    }
    const target = makePose(this.pose, this.stage, { offset: add(off, sway) }, phase);
    let out: HandsFrame = { ...target, time: now };
    if (this.prev) {
      const t = Math.max(0, Math.min(1, (now - this.blendStart) / this.blendMs));
      const e = t * t * (3 - 2 * t);
      const mix = (a: HandPose | null, b: HandPose | null): HandPose | null =>
        a && b ? blendHands(a, b, e) : t < 0.5 ? a : b;
      out = { left: mix(this.prev.left, target.left), right: mix(this.prev.right, target.right), time: now };
      if (t >= 1) this.prev = null;
    }
    this.lastFrame = out;
    return out;
  }
}
