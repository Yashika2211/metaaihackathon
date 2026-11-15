import type { Vector2 } from 'three';
import type { CreatureLayer } from '../creatures/creatureLayer';
import type { Puppet } from '../creatures/puppet';
import type { CreatureId } from '../recognizer/creatures';
import type { SceneId } from '../scenery/backdrops';
import type { Fireflies } from '../scenery/fireflies';
import type { Owl } from '../scenery/owl';

/** Sound cues the story can trigger. */
export type Cue = 'chime' | 'pageTurn' | 'success' | 'owlHoot' | 'owlFlap' | 'splash' | 'dig' | 'glow' | 'swell';

/** What a story beat's script can touch. */
export interface StoryCtx {
  wait(ms: number): Promise<void>;
  /** Show a narration line and wait long enough to read it. */
  say(text: string): Promise<void>;
  prompt(text: string): void;
  scene(id: SceneId): void;
  cue(name: Cue): void;
  creatures: CreatureLayer;
  fireflies: Fireflies;
  owl: Owl;
  /** Hand a creature over to the script (it stays even if the player relaxes). */
  hold(p: Puppet): void;
  v(x: number, y: number): Vector2;
}

/**
 * One puzzle beat. Fully data-driven: the engine shows the scene, reads the
 * narration, waits for the goal creature (escalating hints at 10 s / 20 s),
 * then runs the `solve` animation and the closing lines.
 */
export interface Beat {
  id: string;
  scene: SceneId;
  /** Place props (Lumi, owl…) when the scene appears. */
  setup?(ctx: StoryCtx): void;
  narration: string[];
  goal: CreatureId;
  /** The dog must also bark. */
  needsBark?: boolean;
  /** Short question shown while waiting. */
  prompt: string;
  /** Spoken hint at the strong-hint stage (the classic pose). */
  hint: string;
  solve(ctx: StoryCtx, creature: Puppet): Promise<void>;
  after: string[];
}

export interface FableDef {
  id: string;
  title: string;
  /** One-line teaser for the journal ("tonight's fable"). */
  teaser: string;
  opening: string[];
  beats: Beat[];
  ending(ctx: StoryCtx): Promise<void>;
}
