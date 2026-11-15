import { describe, expect, it } from 'vitest';
import { Journal, type KV } from '../src/save/journal';

class MemoryKV implements KV {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

class BrokenKV implements KV {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

describe('Shadow Journal', () => {
  it('starts empty', () => {
    const j = new Journal(new MemoryKV());
    expect(j.data.creatures).toEqual([]);
    expect(j.data.nights).toBe(0);
  });

  it('remembers creatures and fables across sessions', () => {
    const kv = new MemoryKV();
    const a = new Journal(kv);
    a.startNight(new Date('2026-11-16T20:00:00Z'));
    expect(a.meet('rabbit')).toBe(true);
    expect(a.meet('rabbit')).toBe(false);
    a.meet('bird');
    expect(a.complete('firefly')).toBe(true);
    const b = new Journal(kv);
    expect(b.data.creatures).toEqual(['rabbit', 'bird']);
    expect(b.data.fablesCompleted).toEqual(['firefly']);
    expect(b.data.onboarded).toBe(true);
    b.startNight(new Date('2026-11-17T20:00:00Z'));
    expect(b.isReturning).toBe(true);
    expect(b.data.firstNight).toBe('2026-11-16');
    expect(b.data.lastNight).toBe('2026-11-17');
  });

  it('survives broken storage (private mode, quota)', () => {
    const j = new Journal(new BrokenKV());
    expect(() => j.startNight()).not.toThrow();
    expect(j.meet('dog')).toBe(true);
    expect(j.save()).toBe(false);
    expect(j.data.creatures).toEqual(['dog']);
  });

  it('works with no storage at all', () => {
    const j = new Journal(null);
    j.meet('snail');
    expect(j.data.creatures).toEqual(['snail']);
  });

  it('ignores corrupt or foreign data', () => {
    const kv = new MemoryKV();
    kv.setItem('shadowfolk.journal.v1', '{not json');
    expect(new Journal(kv).data.creatures).toEqual([]);
    kv.setItem('shadowfolk.journal.v1', JSON.stringify({ version: 1, creatures: ['rabbit', 'dragon'], fablesCompleted: [3, 'firefly'] }));
    const j = new Journal(kv);
    expect(j.data.creatures).toEqual(['rabbit']);
    expect(j.data.fablesCompleted).toEqual(['firefly']);
  });

  it('rotates tonight’s teaser daily', () => {
    const d1 = Journal.teaserIndex(2, new Date('2026-11-16T12:00:00Z'));
    const d2 = Journal.teaserIndex(2, new Date('2026-11-17T12:00:00Z'));
    expect(d1).not.toBe(d2);
    expect(Journal.teaserIndex(0)).toBe(0);
  });
});
