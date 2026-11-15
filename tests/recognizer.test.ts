import { describe, expect, it } from 'vitest';
import { RECOGNIZER } from '../src/config/tuning';
import type { HandsFrame } from '../src/hands/joints';
import type { PoseName } from '../src/hands/poseLibrary';
import { HandShapeRecognizer, type RecognizerEvent } from '../src/recognizer/recognizer';
import { at, FRAME, noisyFrame, rng } from './helpers';

const STEP = 1000 / 72; // Quest frame time

function run(rec: HandShapeRecognizer, frames: (t: number) => HandsFrame, from: number, to: number) {
  const events: RecognizerEvent[] = [];
  let last = rec.update(frames(from));
  events.push(...last.events);
  for (let t = from + STEP; t <= to; t += STEP) {
    last = rec.update(frames(t));
    events.push(...last.events);
  }
  return { events, state: last.state };
}

describe('recognizer stabiliser', () => {
  it('does not confirm before the hold time', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { state, events } = run(rec, (t) => at('rabbit', t), 0, RECOGNIZER.holdMs - 40);
    expect(state.confirmed).toBeNull();
    expect(state.candidate).toBe('rabbit');
    expect(state.holdProgress).toBeGreaterThan(0.7);
    expect(events.filter((e) => e.type === 'confirm')).toHaveLength(0);
  });

  it('confirms after ~300 ms and emits exactly one confirm event', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { state, events } = run(rec, (t) => at('rabbit', t), 0, 1500);
    expect(state.confirmed).toBe('rabbit');
    expect(state.variant).toBe('classic');
    expect(events.filter((e) => e.type === 'confirm')).toEqual([{ type: 'confirm', creature: 'rabbit', variant: 'classic' }]);
  });

  for (const [pose, creature] of [['bird', 'bird'], ['dog', 'dog'], ['snail', 'snail'], ['dogAlt', 'dog'], ['birdAlt', 'bird'], ['snailAlt', 'snail'], ['rabbitAlt', 'rabbit']] as const) {
    it(`confirms ${pose} as ${creature}`, () => {
      const rec = new HandShapeRecognizer(FRAME);
      expect(run(rec, (t) => at(pose, t), 0, 800).state.confirmed).toBe(creature);
    });
  }

  it('never flickers under noisy tracking (one confirm, zero releases)', () => {
    const rand = rng(42);
    for (const pose of ['rabbit', 'dog', 'snail', 'bird'] as PoseName[]) {
      const rec = new HandShapeRecognizer(FRAME);
      const { events } = run(rec, (t) => noisyFrame(pose, t, 0.005, rand), 0, 5000);
      expect(events.filter((e) => e.type === 'confirm'), pose).toHaveLength(1);
      expect(events.filter((e) => e.type === 'release'), pose).toHaveLength(0);
    }
  });

  it('keeps the bird alive while flapping', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { events, state } = run(rec, (t) => at('birdFlap', t, t / 400), 0, 4000);
    expect(state.confirmed).toBe('bird');
    expect(events.filter((e) => e.type === 'release')).toHaveLength(0);
    expect(state.flap).toBeGreaterThan(0.1);
  });

  it('survives a brief tracking dropout shorter than the release time', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const dropout = (t: number): HandsFrame =>
      t > 1000 && t < 1000 + RECOGNIZER.releaseMs * 0.6 ? { left: null, right: null, time: t } : at('dog', t);
    const { events, state } = run(rec, dropout, 0, 2000);
    expect(state.confirmed).toBe('dog');
    expect(events.filter((e) => e.type === 'release')).toHaveLength(0);
  });

  it('releases after the hand relaxes', () => {
    const rec = new HandShapeRecognizer(FRAME);
    run(rec, (t) => at('rabbit', t), 0, 800);
    const { state, events } = run(rec, (t) => at('relaxed', t), 800 + STEP, 1600);
    expect(state.confirmed).toBeNull();
    expect(events.some((e) => e.type === 'release' && e.creature === 'rabbit')).toBe(true);
  });

  it('switches cleanly from rabbit to snail', () => {
    const rec = new HandShapeRecognizer(FRAME);
    run(rec, (t) => at('rabbit', t), 0, 800);
    const { state } = run(rec, (t) => at('snail', t), 800 + STEP, 2200);
    expect(state.confirmed).toBe('snail');
  });

  it('never confirms anything for neutral hands', () => {
    const rand = rng(7);
    const rec = new HandShapeRecognizer(FRAME);
    for (const pose of ['relaxed', 'fist', 'pointUp', 'flatFacing', 'pinch', 'okSign', 'threeUp'] as PoseName[]) {
      const { events } = run(rec, (t) => noisyFrame(pose, t, 0.003, rand), 0, 1500);
      expect(events.filter((e) => e.type === 'confirm'), pose).toHaveLength(0);
    }
  });

  it('respects the allowed set', () => {
    const rec = new HandShapeRecognizer(FRAME);
    rec.allowed = new Set(['dog']);
    expect(run(rec, (t) => at('rabbit', t), 0, 1000).state.confirmed).toBeNull();
  });
});

describe('recognizer actions', () => {
  it('dog barks when the jaw snaps shut', () => {
    const rec = new HandShapeRecognizer(FRAME);
    run(rec, (t) => at('dog', t), 0, 600);
    // Open/close the jaw three times (phase cycles every 500 ms).
    const { events } = run(rec, (t) => at('dogBark', t, (t - 600) / 500 + 0.75), 600 + STEP, 2100);
    expect(events.filter((e) => e.type === 'bark').length).toBe(3);
  });

  it('one-handed dog barks on its own', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { events } = run(rec, (t) => at('dogAlt', t), 0, 5000);
    expect(events.filter((e) => e.type === 'bark').length).toBeGreaterThanOrEqual(2);
  });

  it('palm up opens the menu once per gesture', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { events } = run(rec, (t) => at('palmUp', t), 0, 2000);
    expect(events.filter((e) => e.type === 'palmUp')).toHaveLength(1);
  });

  it('palm up held briefly does nothing', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { events } = run(rec, (t) => at('palmUp', t), 0, RECOGNIZER.palmUpHoldMs - 100);
    expect(events.filter((e) => e.type === 'palmUp')).toHaveLength(0);
  });

  it('pinch fires start and end events', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const a = run(rec, (t) => at('pinch', t), 0, 300);
    const b = run(rec, (t) => at('relaxed', t), 300 + STEP, 600);
    expect(a.events.filter((e) => e.type === 'pinch')).toHaveLength(1);
    expect(b.events.filter((e) => e.type === 'pinchEnd')).toHaveLength(1);
  });

  it('anchor follows the posing hand', () => {
    const rec = new HandShapeRecognizer(FRAME);
    const { state } = run(rec, (t) => at('rabbit', t), 0, 600);
    expect(state.anchor).not.toBeNull();
    expect(Math.abs(state.anchor![1] - 1.1)).toBeLessThan(0.12);
  });
});
