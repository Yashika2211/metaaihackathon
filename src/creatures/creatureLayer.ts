import { Group, Vector2 } from 'three';
import type { CreatureId } from '../recognizer/creatures';
import { WALL_LAYER } from '../render/shadowWall';
import { Bird } from './bird';
import { Dog } from './dog';
import { InkBloomFx } from './inkBloom';
import type { CreatureInput, Puppet } from './puppet';
import { Rabbit } from './rabbit';
import { Snail } from './snail';

/**
 * Owns the four puppets and the ink bloom. One creature is "summoned" at a
 * time (the one the player is making); story beats may keep a creature on
 * stage for a scripted exit.
 */
export class CreatureLayer {
  readonly group = new Group();
  readonly bloom = new InkBloomFx();
  readonly rabbit = new Rabbit();
  readonly bird = new Bird();
  readonly dog = new Dog();
  readonly snail = new Snail();
  readonly all: Record<CreatureId, Puppet>;
  /** The creature currently bound to the player's hands. */
  active: Puppet | null = null;
  /** Creatures performing a story script: they ignore the player's hands. */
  private held = new Set<Puppet>();

  constructor() {
    this.all = { rabbit: this.rabbit, bird: this.bird, dog: this.dog, snail: this.snail };
    this.group.position.z = WALL_LAYER.creatures;
    this.bloom.group.position.z = -0.0005;
    this.group.add(this.bloom.group);
    for (const p of Object.values(this.all)) this.group.add(p.mesh);
  }

  /** Bring a creature to life at a wall-local point (the hand's shadow). */
  summon(id: CreatureId, at: Vector2): Puppet {
    const p = this.all[id];
    if (this.active && this.active !== p && !this.held.has(this.active)) this.active.leave();
    this.bloom.burst(at);
    if (this.held.has(p)) return p; // busy in the story; don't steal it back
    if (!p.alive) p.spawn(at);
    this.active = p;
    return p;
  }

  /** The player stopped making the shape: the creature melts back into ink. */
  release(id: CreatureId): void {
    const p = this.all[id];
    if (this.active === p) this.active = null;
    if (!this.held.has(p)) p.leave();
  }

  /** Give a creature to the story script. */
  hold(p: Puppet): void {
    this.held.add(p);
    if (this.active === p) this.active = null;
  }

  isHeld(p: Puppet): boolean {
    return this.held.has(p);
  }

  /** Story is done with its creatures: they melt away. */
  releaseHeld(): void {
    for (const p of this.held) p.leave();
    this.held.clear();
  }

  dismissAll(): void {
    for (const p of Object.values(this.all)) p.leave();
    this.held.clear();
    this.active = null;
  }

  update(dtMs: number, input: CreatureInput): void {
    this.bloom.update(dtMs);
    const idle: CreatureInput = { target: null, flap: 0, jaw: 0 };
    for (const p of Object.values(this.all)) p.update(dtMs, p === this.active ? input : idle);
  }

  get anyAlive(): boolean {
    return Object.values(this.all).some((p) => p.alive);
  }

  /** Point near the hand shadow but on the ground, for ground creatures. */
  static groundPoint(at: Vector2, groundY: number): Vector2 {
    return new Vector2(at.x, groundY);
  }
}
