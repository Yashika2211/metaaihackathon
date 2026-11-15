import { describe, expect, it } from 'vitest';
import { distance, dot } from '../src/core/vec';
import { J, JOINT_COUNT } from '../src/hands/joints';
import { CREATURE_POSES, makePose, NEUTRAL_POSES } from '../src/hands/poseLibrary';
import { synthHand } from '../src/hands/synthetic';
import { palmNormalOf } from '../src/recognizer/features';

describe('synthetic hands', () => {
  const base = {
    position: [0, 1, -0.3] as [number, number, number],
    fingerDir: [0, 1, 0] as [number, number, number],
    palmFacing: [0, 0, -1] as [number, number, number],
    curls: { index: 0, middle: 0, ring: 0, pinky: 0 },
  };

  it('produces 25 finite joints', () => {
    const h = synthHand({ ...base, handedness: 'right' });
    expect(h.joints).toHaveLength(JOINT_COUNT);
    expect(h.radii).toHaveLength(JOINT_COUNT);
    for (const j of h.joints) for (const c of j) expect(Number.isFinite(c)).toBe(true);
  });

  it('has a realistic hand length (wrist to middle tip)', () => {
    const h = synthHand({ ...base, handedness: 'right' });
    const len = distance(h.joints[J.wrist], h.joints[J.middleTip]);
    expect(len).toBeGreaterThan(0.16);
    expect(len).toBeLessThan(0.21);
  });

  it('palm normal matches the requested facing for both hands', () => {
    for (const handedness of ['left', 'right'] as const) {
      const h = synthHand({ ...base, handedness });
      expect(dot(palmNormalOf(h), [0, 0, -1])).toBeGreaterThan(0.95);
    }
  });

  it('puts the thumb on opposite sides for left and right hands', () => {
    const r = synthHand({ ...base, handedness: 'right' });
    const l = synthHand({ ...base, handedness: 'left' });
    expect(r.joints[J.thumbTip][0]).toBeLessThan(0);
    expect(l.joints[J.thumbTip][0]).toBeGreaterThan(0);
  });

  it('curling brings fingertips toward the wrist', () => {
    const open = synthHand({ ...base, handedness: 'right' });
    const fist = synthHand({ ...base, handedness: 'right', curls: { index: 1, middle: 1, ring: 1, pinky: 1 } });
    expect(distance(fist.joints[J.indexTip], fist.joints[J.wrist])).toBeLessThan(
      distance(open.joints[J.indexTip], open.joints[J.wrist]) * 0.7,
    );
  });

  it('thumbTouch puts the thumb tip on the chosen fingertip', () => {
    const h = synthHand({ ...base, handedness: 'right', curls: { index: 0, middle: 0, ring: 1, pinky: 1 }, thumbTouch: 'ring' });
    expect(distance(h.joints[J.thumbTip], h.joints[J.ringTip])).toBeLessThan(1e-6);
  });

  it('every scripted pose builds at least one hand', () => {
    for (const p of [...CREATURE_POSES, ...NEUTRAL_POSES]) {
      const f = makePose(p);
      expect(f.left ?? f.right).not.toBeNull();
    }
  });
});
