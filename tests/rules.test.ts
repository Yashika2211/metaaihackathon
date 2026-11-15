import { describe, expect, it } from 'vitest';
import { RECOGNIZER } from '../src/config/tuning';
import { makePose, NEUTRAL_POSES, type PoseName } from '../src/hands/poseLibrary';
import type { CreatureId, Variant } from '../src/recognizer/creatures';
import { computeFeatures } from '../src/recognizer/features';
import { scoreAll } from '../src/recognizer/rules';
import { FRAME, jitter, rng } from './helpers';

function best(name: PoseName, noise = 0, seed = 3, phase = 0) {
  const rand = rng(seed);
  const f = makePose(name, undefined, {}, phase);
  const l = jitter(f.left, noise, rand);
  const r = jitter(f.right, noise, rand);
  const scores = scoreAll(l && computeFeatures(l, FRAME), r && computeFeatures(r, FRAME));
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

const POSITIVES: Array<[PoseName, CreatureId, Variant]> = [
  ['rabbit', 'rabbit', 'classic'],
  ['rabbitAlt', 'rabbit', 'oneHanded'],
  ['bird', 'bird', 'classic'],
  ['birdFlap', 'bird', 'classic'],
  ['birdAlt', 'bird', 'oneHanded'],
  ['dog', 'dog', 'classic'],
  ['dogBark', 'dog', 'classic'],
  ['dogAlt', 'dog', 'oneHanded'],
  ['snail', 'snail', 'classic'],
  ['snailAlt', 'snail', 'oneHanded'],
];

describe('rules: positive poses', () => {
  for (const [pose, creature, variant] of POSITIVES) {
    it(`${pose} → ${creature} (${variant})`, () => {
      const top = best(pose);
      expect(top.creature).toBe(creature);
      expect(top.variant).toBe(variant);
      expect(top.score).toBeGreaterThanOrEqual(RECOGNIZER.enterScore);
    });

    it(`${pose} survives 4 mm tracking noise`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const top = best(pose, 0.004, seed);
        expect(top.creature).toBe(creature);
        expect(top.score).toBeGreaterThanOrEqual(RECOGNIZER.stayScore);
      }
    });
  }

  it('works for left hands too', () => {
    for (const pose of ['rabbit', 'dog', 'snail', 'dogAlt', 'birdAlt'] as PoseName[]) {
      const f = makePose(pose, undefined, { handedness: 'left' });
      const s = scoreAll(computeFeatures(f.left!, FRAME), null).sort((a, b) => b.score - a.score)[0];
      expect(s.score, pose).toBeGreaterThanOrEqual(RECOGNIZER.enterScore);
    }
  });

  it('works for small and large hands', () => {
    for (const size of [0.8, 1.2]) {
      for (const pose of ['rabbit', 'dog', 'snail'] as PoseName[]) {
        const f = makePose(pose, undefined, { size });
        const s = scoreAll(null, computeFeatures(f.right!, FRAME)).sort((a, b) => b.score - a.score)[0];
        expect(s.score, `${pose}@${size}`).toBeGreaterThanOrEqual(RECOGNIZER.enterScore);
      }
    }
  });
});

describe('rules: near-miss negatives never reach the entry threshold', () => {
  for (const pose of NEUTRAL_POSES) {
    it(`${pose} is not a creature`, () => {
      for (let seed = 1; seed <= 6; seed++) {
        const top = best(pose, 0.003, seed);
        expect(top?.score ?? 0).toBeLessThan(RECOGNIZER.enterScore);
      }
    });
  }

  it('rabbit ears pointing at the wall read as a snail, not a rabbit', () => {
    expect(best('snail').creature).toBe('snail');
  });

  it('a single raised finger is not a rabbit', () => {
    const f = makePose('pointUp');
    const s = scoreAll(null, computeFeatures(f.right!, FRAME)).find((x) => x.creature === 'rabbit' && x.variant === 'oneHanded')!;
    expect(s.score).toBeLessThan(0.2);
  });

  it('two hands far apart are not a bird', () => {
    const f = makePose('bird');
    const shift = (h: typeof f.left) => h && { ...h, joints: h.joints.map((j) => [j[0] - 0.25, j[1], j[2]] as [number, number, number]) };
    const s = scoreAll(computeFeatures(shift(f.left)!, FRAME), computeFeatures(f.right!, FRAME)).find((x) => x.hands === 'both')!;
    expect(s.score).toBe(0);
  });

  it('a flat hand facing the wall with fingers together is not a dog', () => {
    const f = makePose('flatFacing');
    const s = scoreAll(null, computeFeatures(f.right!, FRAME)).find((x) => x.creature === 'dog')!;
    expect(s.score).toBeLessThan(0.1);
  });

  it('a palm-up hand (menu gesture) is not a dog', () => {
    const f = makePose('palmUp');
    const s = scoreAll(null, computeFeatures(f.right!, FRAME)).find((x) => x.creature === 'dog' && x.variant === 'classic')!;
    expect(s.score).toBeLessThan(0.1);
  });

  it('two hooked hands are one bird, not two dogs', () => {
    const f = makePose('bird');
    const all = scoreAll(computeFeatures(f.left!, FRAME), computeFeatures(f.right!, FRAME));
    const dog = Math.max(...all.filter((x) => x.creature === 'dog').map((x) => x.score));
    expect(dog).toBeLessThan(0.05);
  });
});
