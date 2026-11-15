import { Puppet, type CreatureInput } from './puppet';

/** Patient shadow snail. Crawls slowly toward the hand, antennae wobbling. */
export class Snail extends Puppet {
  readonly id = 'snail' as const;
  private stretch = 0;
  private wobble = 0;

  constructor() {
    super(22, 0.18);
  }

  protected poseKey(): string {
    return `${this.q(this.stretch, 16)}|${this.q(this.wobble, 12)}`;
  }

  protected behave(dt: number, input: CreatureInput): void {
    if (!this.scripted && input.target && this.alive) {
      this.goal.set(input.target.x, this.groundY);
    }
    if (!this.scripted) {
      this.pos.y += (this.groundY - this.pos.y) * Math.min(1, dt * 6);
      const dx = this.goal.x - this.pos.x;
      // Snails move in little pulses.
      const pulse = 0.5 + 0.5 * Math.sin(this.age * 4);
      const step = Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.06 * pulse);
      this.pos.x += step;
      if (Math.abs(dx) > 0.02) this.facing = dx > 0 ? 1 : -1;
    }
    this.stretch = 0.5 + 0.5 * Math.sin(this.age * 4);
    this.wobble = Math.sin(this.age * 3.1);
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const st = this.stretch * 0.8;
    // Foot.
    ctx.beginPath();
    ctx.moveTo(-6.5 - st, 0);
    ctx.quadraticCurveTo(-7.5 - st, 1.4, -4, 1.8);
    ctx.lineTo(4.6 + st, 1.8);
    ctx.quadraticCurveTo(5.8 + st, 2.4, 6.2 + st, 4.4);
    ctx.quadraticCurveTo(7.6 + st, 4.6, 7.8 + st, 3);
    ctx.quadraticCurveTo(8 + st, 0, 5 + st, 0);
    ctx.closePath();
    ctx.fill();
    // Antennae.
    ctx.lineWidth = 0.4;
    const w = this.wobble;
    const stalk = (bx: number, tx: number, ty: number) => {
      ctx.beginPath();
      ctx.moveTo(bx + st, 4);
      ctx.quadraticCurveTo(bx + 0.6 + st, ty - 1.5, tx + st + w * 0.4, ty + w * 0.2);
      ctx.stroke();
      this.ellipse(ctx, tx + st + w * 0.4, ty + w * 0.2, 0.45, 0.45);
    };
    stalk(6.4, 8.4, 8.4);
    stalk(7.0, 10, 7.4);
    // Shell with a spiral cut so the light draws the swirl.
    this.ellipse(ctx, -1, 5.6, 4.6, 4.3);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.15) {
      const r = 0.25 + a * 0.24;
      const x = -1 + Math.cos(a) * r;
      const y = 5.6 + Math.sin(a) * r * 0.95;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    this.hole(ctx, 6.9, 3.3, 0.32);
  }
}
