import { Vector2 } from 'three';
import { Puppet, type CreatureInput } from './puppet';

/** Hopping shadow rabbit. Follows the hand shadow along the ground. */
export class Rabbit extends Puppet {
  readonly id = 'rabbit' as const;
  private hopT = 1;
  private hopDur = 0.55;
  private nextIdleHop = 1.2;
  private earSwing = 0;
  private squash = 0;
  /** Digging animation 0..1 (fence beat). */
  digging = false;
  private digT = 0;
  private digThen: { to: Vector2; done?: () => void } | null = null;

  constructor() {
    super(24, 0.15);
  }

  protected poseKey(): string {
    return `${this.q(this.squash, 16)}|${this.q(this.earSwing, 16)}|${this.digging ? this.q(Math.sin(this.digT * 18), 6) : 'n'}`;
  }

  protected behave(dt: number, input: CreatureInput): void {
    if (!this.scripted && input.target && this.alive) {
      this.goal.set(input.target.x, this.groundY);
    }
    if (!this.scripted) this.pos.y += (this.groundY - this.pos.y) * Math.min(1, dt * 6);

    const dx = this.goal.x - this.pos.x;
    const moving = Math.abs(dx) > 0.015 || this.scripted;

    if (this.digging) {
      this.digT += dt;
      if (this.digT > 1.4 && this.digThen) {
        const { to, done } = this.digThen;
        this.digThen = null;
        this.digging = false;
        this.moveTo(to, 1100, done);
        return;
      }
      this.squash = 0.15 + 0.08 * Math.sin(this.digT * 18);
      this.lift = 0;
      this.earSwing = 0.3 + 0.1 * Math.sin(this.digT * 9);
      return;
    }

    // Hop cycle: a parabola in height with squash on take-off and landing.
    if (this.hopT >= 1) {
      this.nextIdleHop -= dt;
      if (moving || this.nextIdleHop <= 0) {
        this.hopT = 0;
        this.nextIdleHop = 1.4 + Math.random() * 1.5;
        if (!this.scripted && Math.abs(dx) > 0.002) this.facing = dx > 0 ? 1 : -1;
      }
    }
    if (this.hopT < 1) {
      this.hopT = Math.min(1, this.hopT + dt / this.hopDur);
      const h = Math.sin(this.hopT * Math.PI);
      this.lift = h * (moving ? 0.045 : 0.025);
      if (!this.scripted && moving) {
        const step = Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.32);
        this.pos.x += step;
      }
      this.squash = this.hopT < 0.15 ? 0.2 * (1 - this.hopT / 0.15) : this.hopT > 0.85 ? 0.2 * ((this.hopT - 0.85) / 0.15) : -0.06 * h;
      this.earSwing = -0.35 * h;
    } else {
      this.lift = 0;
      this.squash *= 0.85;
      this.earSwing = 0.08 * Math.sin(this.age * 2.3);
    }
  }

  /** Dig under something, then pop out on the other side. */
  digThrough(to: Vector2, done?: () => void): void {
    // Timed by the game clock (not setTimeout) so pausing freezes the dig too.
    this.digging = true;
    this.digT = 0;
    this.digThen = { to, done };
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const s = this.squash;
    ctx.save();
    ctx.scale(1 + s * 0.5, 1 - s);
    // Back foot, body, haunch, tail.
    this.ellipse(ctx, -2.4, 0.7, 3.2, 0.9);
    this.ellipse(ctx, -0.8, 4.4, 6, 4.2, -0.12);
    this.ellipse(ctx, -3.4, 3.7, 4, 3.6);
    this.ellipse(ctx, -7.1, 5.4, 1.7, 1.6);
    // Front paw.
    this.ellipse(ctx, 3.8, 0.9, 1.6, 0.8);
    this.ellipse(ctx, 3.2, 2.6, 1.2, 2.0, 0.2);
    // Neck and head.
    this.ellipse(ctx, 3.2, 6.8, 2.6, 2.6);
    this.ellipse(ctx, 4.6, 8.8, 3.3, 2.7, 0.2);
    this.ellipse(ctx, 7.1, 8.3, 1.6, 1.4);
    // Ears swing back on hops.
    const ear = (bx: number, by: number, angle: number, len: number) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, len / 2, 1.1, len / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    ear(3.2, 10.4, 0.25 + this.earSwing, 7.2);
    ear(4.4, 10.6, -0.05 + this.earSwing * 0.8, 7.6);
    // Whiskers.
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(8, 8.2);
    ctx.lineTo(10.4, 9);
    ctx.moveTo(8, 7.9);
    ctx.lineTo(10.6, 7.7);
    ctx.stroke();
    this.hole(ctx, 5.4, 9.5, 0.45);
    ctx.restore();
  }
}
