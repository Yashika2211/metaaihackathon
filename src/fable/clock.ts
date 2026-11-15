/**
 * A pausable clock for story scripts. `wait()` resolves on game ticks, so when
 * the game is paused (the clock isn't ticked) the whole story freezes in place.
 * `cancel()` abandons every pending wait (used by Restart).
 */
export class GameClock {
  now = 0;
  private waits: Array<{ at: number; resolve: () => void; gen: number }> = [];
  private conditions: Array<{ test: () => boolean; resolve: () => void; gen: number }> = [];
  private gen = 0;

  tick(dtMs: number): void {
    this.now += dtMs;
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.at <= this.now);
      if (due.length) {
        this.waits = this.waits.filter((w) => w.at > this.now);
        for (const w of due) if (w.gen === this.gen) w.resolve();
      }
    }
    if (this.conditions.length) {
      const ready = this.conditions.filter((c) => c.gen !== this.gen || c.test());
      if (ready.length) {
        this.conditions = this.conditions.filter((c) => !ready.includes(c));
        for (const c of ready) if (c.gen === this.gen) c.resolve();
      }
    }
  }

  wait(ms: number): Promise<void> {
    const gen = this.gen;
    return new Promise((resolve) => this.waits.push({ at: this.now + ms, resolve, gen }));
  }

  /** Resolve once `test()` returns true (checked every tick). */
  until(test: () => boolean): Promise<void> {
    const gen = this.gen;
    return new Promise((resolve) => this.conditions.push({ test, resolve, gen }));
  }

  /** Abandon all pending waits; scripts awaiting them never continue. */
  cancel(): void {
    this.gen++;
    this.waits = [];
    this.conditions = [];
  }

  get generation(): number {
    return this.gen;
  }
}
