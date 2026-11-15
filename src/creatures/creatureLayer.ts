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
    if (this.active && this.active !== p && !this.active.scripted) this.active.leave();
    this.bloom.burst(at);
    if (!p.alive) p.spawn(at);
    this.active = p;
    return p;
  }

  /** The player stopped making the shape: the creature melts back into ink. */
  release(id: CreatureId): void {
    const p = this.all[id];
    if (this.active === p) this.active = null;
    if (!p.scripted) p.leave();
  }

  dismissAll(): void {
    for (const p of Object.values(this.all)) p.leave();
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
