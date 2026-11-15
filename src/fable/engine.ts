import { Vector2 } from 'three';
import { FABLE } from '../config/tuning';
import type { CreatureLayer } from '../creatures/creatureLayer';
import type { Puppet } from '../creatures/puppet';
import type { PoseName } from '../hands/poseLibrary';
import { CREATURE_INFO, type CreatureId } from '../recognizer/creatures';
import type { Fireflies } from '../scenery/fireflies';
import type { Owl } from '../scenery/owl';
import type { SceneryLayer } from '../scenery/sceneryLayer';
import { Subtitles } from '../ui/subtitles';
import type { GameClock } from './clock';
import type { Beat, Cue, FableDef, StoryCtx } from './types';

/** What the engine needs from the game. */
export interface FableHost {
  clock: GameClock;
  subtitles: Subtitles;
  scenery: SceneryLayer;
  creatures: CreatureLayer;
  fireflies: Fireflies;
  owl: Owl;
  cue(name: Cue): void;
  /** Show the ghost hand for a pose at a strength (0 hides). */
  ghost(pose: PoseName | null, strength: number): void;
  handsVisible(): boolean;
  /** ms the given creature has been alive and bound to the player's hands. */
  aliveFor(id: CreatureId): number;
  /** Barks since the dog last appeared. */
  barks(): number;
  /** Called when a fable is completed (journal). */
  onFableComplete(fable: FableDef): void;
  onCreatureMet(id: CreatureId): void;
  onPhase(phase: FablePhase): void;
}

export type FablePhase = 'onboarding' | 'story' | 'ending' | 'done';

const GHOST_POSE: Record<CreatureId, PoseName> = { rabbit: 'rabbit', bird: 'bird', dog: 'dog', snail: 'snail' };

/**
 * Runs a fable: onboarding (first shadow → first rabbit), opening narration,
 * each puzzle beat with hint escalation, and the ending.
 */
export class FableEngine {
  phase: FablePhase = 'onboarding';
  /** Debug/demo: complete the current goal immediately. */
  private forceSolve = false;
  currentBeat: Beat | null = null;
  waitingFor: CreatureId | null = null;

  constructor(private host: FableHost) {}

  private ctx(): StoryCtx {
    const h = this.host;
    return {
      wait: (ms) => h.clock.wait(ms),
      say: (text) => this.say(text),
      prompt: (text) => h.subtitles.setPrompt(text),
      scene: (id) => h.scenery.show(id),
      cue: (c) => h.cue(c),
      creatures: h.creatures,
      fireflies: h.fireflies,
      owl: h.owl,
      hold: (p) => h.creatures.hold(p),
      v: (x, y) => new Vector2(x, y),
    };
  }

  async say(text: string): Promise<void> {
    this.host.subtitles.setPrompt('');
    this.host.subtitles.say(text);
    await this.host.clock.wait(Subtitles.readingTime(text));
  }

  skip(): void {
    this.forceSolve = true;
  }

  /** Wait for the player to make `goal`, with hints at 10 s and 20 s. */
  private async waitForGoal(goal: CreatureId, prompt: string, hint: string, needsBark = false): Promise<Puppet> {
    const h = this.host;
    const start = h.clock.now;
    let stage = 0;
    this.waitingFor = goal;
    h.subtitles.setPrompt(prompt);
    const info = CREATURE_INFO[goal];
    let handsLostSince: number | null = null;
    let showingHandsPrompt = false;
    await h.clock.until(() => {
      const elapsed = h.clock.now - start;
      if (this.forceSolve) return true;
      // Hands dropped out of tracking for a while: gently ask for them back.
      if (!h.handsVisible()) {
        handsLostSince ??= h.clock.now;
        if (!showingHandsPrompt && h.clock.now - handsLostSince > 4000) {
          showingHandsPrompt = true;
          h.subtitles.setPrompt('Raise your hands into the lantern light.');
        }
      } else {
        handsLostSince = null;
        if (showingHandsPrompt) {
          showingHandsPrompt = false;
          h.subtitles.setPrompt(stage >= 2 ? `One hand? ${info.oneHanded}` : prompt);
        }
      }
      const alive = h.aliveFor(goal);
      if (alive > 0) h.ghost(null, 0);
      if (alive >= FABLE.goalHoldMs && (!needsBark || h.barks() > 0)) return true;
      if (stage < 1 && elapsed > FABLE.hintSoftMs && alive === 0) {
        stage = 1;
        h.ghost(GHOST_POSE[goal], 0.35);
      }
      if (stage < 2 && elapsed > FABLE.hintStrongMs && alive === 0) {
        stage = 2;
        h.ghost(GHOST_POSE[goal], 0.85);
        h.subtitles.say(hint);
        h.subtitles.setPrompt(`One hand? ${info.oneHanded}`);
      }
      if (needsBark && alive >= FABLE.goalHoldMs && h.barks() === 0 && stage < 3) {
        stage = 3;
        h.subtitles.setPrompt('Now bark! Drop your pinky and snap it shut.');
      }
      return false;
    });
    this.waitingFor = null;
    h.ghost(null, 0);
    if (this.forceSolve) {
      this.forceSolve = false;
      const p = h.creatures.summon(goal, new Vector2(-0.1, goal === 'bird' ? 0 : h.creatures.all[goal].groundY));
      if (goal === 'dog') h.creatures.dog.bark();
      await h.clock.wait(700);
      return p;
    }
    return h.creatures.all[goal];
  }

  /** The very first minute: lantern → own shadow → ghost rabbit → rabbit lives. */
  async onboarding(): Promise<void> {
    const h = this.host;
    this.phase = 'onboarding';
    h.onPhase('onboarding');
    h.scenery.show('forest');
    await h.clock.wait(1400);
    if (!h.handsVisible()) {
      h.subtitles.setPrompt('Raise a hand into the lantern light.');
      await h.clock.until(() => h.handsVisible() || this.forceSolve);
    }
    // Let them play with their own shadow for a heartbeat.
    await h.clock.wait(1200);
    h.ghost('rabbit', 0.75);
    h.cue('chime');
    h.subtitles.say('Can you make a rabbit?');
    const rabbit = await this.waitForGoalOnboarding();
    h.ghost(null, 0);
    h.onCreatureMet(rabbit.id);
    await this.say('Oh! Hello, little rabbit.');
  }

  private async waitForGoalOnboarding(): Promise<Puppet> {
    const h = this.host;
    const start = h.clock.now;
    let hinted = false;
    this.waitingFor = 'rabbit';
    await h.clock.until(() => {
      if (this.forceSolve) return true;
      if (h.aliveFor('rabbit') > 200) return true;
      if (!hinted && h.clock.now - start > 12_000) {
        hinted = true;
        h.subtitles.say('Two fingers up for ears, the other two curled to meet your thumb.');
        h.subtitles.setPrompt(`One hand? ${CREATURE_INFO.rabbit.oneHanded}`);
      }
      return false;
    });
    this.waitingFor = null;
    if (this.forceSolve) {
      this.forceSolve = false;
      return h.creatures.summon('rabbit', new Vector2(0, h.creatures.rabbit.groundY));
    }
    return h.creatures.rabbit;
  }

  async play(fable: FableDef, withOnboarding: boolean): Promise<void> {
    const h = this.host;
    const ctx = this.ctx();
    if (withOnboarding) await this.onboarding();
    this.phase = 'story';
    h.onPhase('story');
    for (const line of fable.opening) await this.say(line);
    h.creatures.dismissAll();
    for (const beat of fable.beats) {
      this.currentBeat = beat;
      h.cue('pageTurn');
      h.scenery.show(beat.scene);
      beat.setup?.(ctx);
      await h.clock.wait(900);
      for (const line of beat.narration) await this.say(line);
      const creature = await this.waitForGoal(beat.goal, beat.prompt, beat.hint, beat.needsBark);
      h.subtitles.setPrompt('');
      h.cue('success');
      h.onCreatureMet(beat.goal);
      await beat.solve(ctx, creature);
      for (const line of beat.after) await this.say(line);
      h.creatures.releaseHeld();
      h.owl.hide();
    }
    this.currentBeat = null;
    this.phase = 'ending';
    h.onPhase('ending');
    await fable.ending(ctx);
    h.onFableComplete(fable);
    this.phase = 'done';
    h.onPhase('done');
  }

  reset(): void {
    this.forceSolve = false;
    this.waitingFor = null;
    this.currentBeat = null;
  }
}
