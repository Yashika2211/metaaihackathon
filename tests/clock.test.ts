import { describe, expect, it } from 'vitest';
import { GameClock } from '../src/fable/clock';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('GameClock', () => {
  it('resolves waits only as game time passes', async () => {
    const c = new GameClock();
    let done = false;
    void c.wait(100).then(() => (done = true));
    c.tick(50);
    await flush();
    expect(done).toBe(false);
    c.tick(60);
    await flush();
    expect(done).toBe(true);
  });

  it('freezes while not ticked (pause)', async () => {
    const c = new GameClock();
    let done = false;
    void c.wait(10).then(() => (done = true));
    await new Promise((r) => setTimeout(r, 30));
    expect(done).toBe(false);
  });

  it('until() resolves when the condition becomes true', async () => {
    const c = new GameClock();
    let flag = false;
    let done = false;
    void c.until(() => flag).then(() => (done = true));
    c.tick(16);
    await flush();
    expect(done).toBe(false);
    flag = true;
    c.tick(16);
    await flush();
    expect(done).toBe(true);
  });

  it('cancel() abandons pending waits (restart)', async () => {
    const c = new GameClock();
    let done = false;
    void c.wait(10).then(() => (done = true));
    c.cancel();
    c.tick(100);
    await flush();
    expect(done).toBe(false);
    let after = false;
    void c.wait(10).then(() => (after = true));
    c.tick(20);
    await flush();
    expect(after).toBe(true);
  });
});
