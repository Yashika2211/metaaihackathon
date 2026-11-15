import { Vector2 } from 'three';
import { Puppet, type CreatureInput } from './puppet';

/** Flying shadow bird. Flaps faster when the player waves their fingers. */
export class Bird extends Puppet {
  readonly id = 'bird' as const;
  private wingPhase = 0;
  private wing = 0;
  /** Point (wall-local, relative to pos) where a carried firefly hangs. */
  readonly carryOffset = new Vector2(0.0, 0.065);
  /** Highest the bird flies under player control (wall-local metres). */
  static readonly CEILING = 0.07;

  constructor() {
    super(30, 0.1);
  }

  protected poseKey(): string {
    return `${this.q(this.wing, 20)}`;
  }

  protected behave(dt: number, input: CreatureInput): void {
    if (!this.scripted && input.target && this.alive) {
      // Stay between the ground and the narration band at the top of the wall.
      this.goal.set(input.target.x, Math.min(Bird.CEILING, Math.max(this.groundY + 0.06, input.target.y)));
    }
    if (!this.scripted) {
      const dx = this.goal.x - this.pos.x;
      const dy = this.goal.y - this.pos.y;
      const k = Math.min(1, dt * 2.2);
      this.pos.x += dx * k;
      this.pos.y += dy * k;
      if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
    }
    const speed = 5 + input.flap * 9;
    this.wingPhase += dt * speed;
    this.wing = Math.sin(this.wingPhase);
    this.lift = Math.sin(this.age * 2.1) * 0.008 - this.wing * 0.004;
  }

  /** World-free helper: where the carried firefly should be. */
  carryPoint(out = new Vector2()): Vector2 {
    return out.set(this.pos.x + this.carryOffset.x * this.facing, this.pos.y + this.lift + this.carryOffset.y);
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const w = this.wing;
    const wingShape = (scaleY: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(1.5, 10.2);
      const tipX = -5.5;
      const tipY = 10 + 10 * w * scaleY;
      ctx.quadraticCurveTo(-1, 10 + 7 * w * scaleY, tipX, tipY);
      // Feathered trailing edge.
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        const x = tipX + (2.5 - tipX) * t;
        const y = tipY + (9.6 - tipY) * t - (i % 2 === 0 ? 0 : 1.2 * Math.sign(w || 1));
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    wingShape(0.75, 0.85);
    // Body, head, beak, tail.
    this.ellipse(ctx, 0, 10, 5.2, 2.4, 0.06);
    this.ellipse(ctx, 5, 11.4, 2.2, 2.0);
    ctx.beginPath();
    ctx.moveTo(6.8, 12);
    ctx.lineTo(9.8, 11.3);
    ctx.lineTo(6.9, 10.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4.4, 10.6);
    ctx.lineTo(-10.2, 13);
    ctx.lineTo(-9.4, 11);
    ctx.lineTo(-10.8, 9.3);
    ctx.lineTo(-9.6, 7.8);
    ctx.lineTo(-4.4, 9);
    ctx.closePath();
    ctx.fill();
    // Tucked feet.
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(0.5, 7.9);
    ctx.lineTo(-0.5, 6.6);
    ctx.moveTo(1.4, 7.9);
    ctx.lineTo(0.6, 6.5);
    ctx.stroke();
    wingShape(1, 1);
    this.hole(ctx, 5.7, 12, 0.42);
  }
}
