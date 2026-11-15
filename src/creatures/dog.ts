import { Puppet, type CreatureInput } from './puppet';

/** Shadow dog. Its jaw follows the player's pinky; snapping it shut barks. */
export class Dog extends Puppet {
  readonly id = 'dog' as const;
  private jaw = 0;
  private barkT = 1;
  private tail = 0;
  /** Set by the game when the recognizer's jaw is not available (one-handed). */
  autoJaw = false;

  constructor() {
    super(30, 0.12);
  }

  protected poseKey(): string {
    return `${this.q(this.jaw, 16)}|${this.q(this.tail, 10)}|${this.barkT < 0.3 ? 'b' : ''}`;
  }

  /** Visual + positional bark kick. Sound is handled by the audio system. */
  bark(): void {
    this.barkT = 0;
  }

  protected behave(dt: number, input: CreatureInput): void {
    if (!this.scripted && input.target && this.alive) {
      this.goal.set(input.target.x, this.groundY);
    }
    if (!this.scripted) {
      this.pos.y += (this.groundY - this.pos.y) * Math.min(1, dt * 6);
      const dx = this.goal.x - this.pos.x;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.25);
      this.pos.x += step;
      if (Math.abs(dx) > 0.02) this.facing = dx > 0 ? 1 : -1;
    }
    this.barkT += dt;
    const barkOpen = this.barkT < 0.25 ? Math.sin((this.barkT / 0.25) * Math.PI) : 0;
    const target = Math.max(this.autoJaw ? 0 : input.jaw, barkOpen);
    this.jaw += (target - this.jaw) * Math.min(1, dt * 18);
    this.tail = Math.sin(this.age * 9);
    this.lift = this.barkT < 0.2 ? Math.sin((this.barkT / 0.2) * Math.PI) * 0.006 : 0;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    // Legs.
    const leg = (x: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.roundRect(x, 0, w, h, 0.7);
      ctx.fill();
    };
    leg(-8.2, 1.9, 5.5);
    leg(-5.8, 1.6, 5);
    leg(2, 1.8, 6);
    leg(4.2, 1.6, 6);
    // Body and haunch.
    this.ellipse(ctx, -2.5, 7.4, 7.6, 3.6, 0.04);
    this.ellipse(ctx, -6.8, 7, 2.9, 3.2);
    // Tail wag.
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-9.6, 8.6);
    ctx.quadraticCurveTo(-11.8, 10.5 + this.tail, -12.4 + this.tail * 0.6, 13.2);
    ctx.stroke();
    // Neck and skull.
    ctx.beginPath();
    ctx.moveTo(2, 9.5);
    ctx.lineTo(3.4, 14.4);
    ctx.lineTo(7.4, 13.6);
    ctx.lineTo(5.6, 7.4);
    ctx.closePath();
    ctx.fill();
    this.ellipse(ctx, 5.6, 14, 3.2, 2.8);
    // Upper snout.
    ctx.beginPath();
    ctx.roundRect(6.2, 12.4, 5.2, 2.4, 1.1);
    ctx.fill();
    this.ellipse(ctx, 11.3, 14.2, 0.9, 0.7);
    // Lower jaw hinges open.
    ctx.save();
    ctx.translate(7, 12.9);
    ctx.rotate(-this.jaw * 0.6);
    ctx.beginPath();
    ctx.roundRect(-0.6, -1.4, 4.6, 1.5, 0.7);
    ctx.fill();
    ctx.restore();
    // Floppy ear.
    ctx.save();
    ctx.translate(4.4, 15.6);
    ctx.rotate(0.5 + this.jaw * 0.2);
    ctx.beginPath();
    ctx.ellipse(-0.5, -1.9, 1.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.hole(ctx, 7.3, 14.6, 0.45);
    // Bark lines.
    if (this.barkT < 0.3) {
      ctx.lineWidth = 0.35;
      ctx.globalAlpha = 1 - this.barkT / 0.3;
      for (const [y, l] of [[15.5, 2], [13, 2.6], [10.5, 2]] as const) {
        ctx.beginPath();
        ctx.moveTo(12.6, y);
        ctx.lineTo(12.6 + l, y + (y - 13) * 0.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}
