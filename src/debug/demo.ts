import type { FableEngine } from '../fable/engine';
import type { PoseName } from '../hands/poseLibrary';
import { CREATURE_INFO, type CreatureId } from '../recognizer/creatures';
import type { Subtitles } from '../ui/subtitles';
import type { SyntheticDriver } from './syntheticDriver';

const CLASSIC: Record<CreatureId, PoseName> = { rabbit: 'rabbit', bird: 'birdFlap', dog: 'dog', snail: 'snail' };
const ALT: Array<[CreatureId, PoseName]> = [
  ['rabbit', 'rabbitAlt'],
  ['bird', 'birdAlt'],
  ['dog', 'dogAlt'],
  ['snail', 'snailAlt'],
];

/**
 * ?demo=1 — plays the entire fable hands-free with scripted hand poses, then
 * shows off the one-handed alternatives. Made for screen recording.
 */
export class DemoDirector {
  private lastWant: CreatureId | null = null;
  private wantSince = 0;
  private posed = false;
  private barked = false;
  private relaxAt = 0;
  private showcaseStart = 0;
  private showcaseIndex = -1;

  constructor(
    private engine: FableEngine,
    private hands: SyntheticDriver,
    private subtitles: Subtitles,
    /** Delay before the "player" makes each shape (ms). */
    private thinkMs = 2600,
  ) {}

  update(now: number): void {
    if (this.engine.phase === 'done') {
      this.showcase(now);
      return;
    }
    const want = this.engine.waitingFor;
    if (want !== this.lastWant) {
      this.lastWant = want;
      this.wantSince = now;
      this.posed = false;
      this.barked = false;
      if (!want) this.relaxAt = now + 1200;
    }
    if (want) {
      const steer = want === 'bird' ? [-0.03, 0.03] : want === 'rabbit' ? [-0.02, 0] : [0, 0];
      if (!this.posed && now - this.wantSince > this.thinkMs) {
        this.posed = true;
        this.hands.steer(steer[0], steer[1]);
        this.hands.setPose(CLASSIC[want], now, 450);
      }
      if (want === 'dog' && this.posed && !this.barked && now - this.wantSince > this.thinkMs + 1900) {
        this.barked = true;
        this.hands.setPose('dogBark', now, 150);
      }
    } else if (this.relaxAt && now > this.relaxAt) {
      this.relaxAt = 0;
      this.hands.steer(0, 0);
      this.hands.setPose('relaxed', now, 600);
    }
  }

  /** After the fable: each one-handed alternative, 4 seconds apiece. */
  private showcase(now: number): void {
    if (!this.showcaseStart) {
      this.showcaseStart = now + 3000;
      return;
    }
    if (now < this.showcaseStart) return;
    const i = Math.floor((now - this.showcaseStart) / 4000);
    if (i === this.showcaseIndex) return;
    this.showcaseIndex = i;
    if (i < ALT.length) {
      const [id, pose] = ALT[i];
      this.hands.setPose(pose, now, 500);
      this.subtitles.say(`One-handed ${CREATURE_INFO[id].name.toLowerCase()}: ${CREATURE_INFO[id].oneHanded}`);
    } else if (i === ALT.length) {
      this.hands.setPose('relaxed', now, 600);
      this.subtitles.say('Every creature can be made with one hand.');
    }
  }
}
