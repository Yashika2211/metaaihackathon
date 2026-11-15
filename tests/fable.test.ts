import { describe, expect, it } from 'vitest';
import { COMING_SOON, FABLES, fireflyFable } from '../src/fable/fireflyFable';
import { CREATURE_INFO, CREATURES } from '../src/recognizer/creatures';

describe('fable data', () => {
  it('the firefly fable uses every creature exactly once', () => {
    const goals = fireflyFable.beats.map((b) => b.goal).sort();
    expect(goals).toEqual([...CREATURES].sort());
  });

  it('every beat has narration, a prompt, a hint and closing words', () => {
    for (const fable of FABLES) {
      expect(fable.opening.length).toBeGreaterThan(0);
      for (const b of fable.beats) {
        expect(b.narration.length, b.id).toBeGreaterThan(0);
        expect(b.prompt.length, b.id).toBeGreaterThan(5);
        expect(b.hint.length, b.id).toBeGreaterThan(10);
        expect(b.after.length, b.id).toBeGreaterThan(0);
      }
    }
  });

  it('only the dog beat needs a bark', () => {
    expect(fireflyFable.beats.filter((b) => b.needsBark).map((b) => b.goal)).toEqual(['dog']);
  });

  it('narration lines stay short enough to fit two lines on the wall', () => {
    for (const fable of FABLES) {
      const lines = [...fable.opening, ...fable.beats.flatMap((b) => [...b.narration, ...b.after])];
      for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(110);
    }
  });

  it('every creature documents a one-handed alternative', () => {
    for (const c of CREATURES) expect(CREATURE_INFO[c].oneHanded.length).toBeGreaterThan(5);
  });

  it('has teasers for tonight’s fable', () => {
    expect(COMING_SOON.length).toBeGreaterThan(0);
  });
});
