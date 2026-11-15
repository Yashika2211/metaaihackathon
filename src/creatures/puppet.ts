import { Mesh, MeshBasicMaterial, PlaneGeometry, Vector2 } from 'three';
import type { CreatureId } from '../recognizer/creatures';
import { createCanvasTex, type CanvasTex } from '../render/canvasTexture';

/** Ink colour of every shadow puppet. */
export const INK = 'rgba(24,12,5,0.96)';

/** Input a creature receives each frame from the recognizer / fable. */
export interface CreatureInput {
  /** Where the player's hand shadow is, wall-local metres (null if no hands). */
  target: Vector2 | null;
  flap: number;
  jaw: number;
}

export type PuppetState = 'blooming' | 'alive' | 'leaving' | 'gone';

/**
 * Base class for the shadow-puppet creatures. Each creature draws its
 * silhouette parametrically (in centimetres, origin at its feet, y up) into
 * its own canvas, redrawn only when its pose parameters change.
 */
export abstract class Puppet {
  abstract readonly id: CreatureId;
  readonly mesh: Mesh;
  protected tex: CanvasTex;
  protected material: MeshBasicMaterial;
  /** Wall-local position of the creature's feet, metres. */
  readonly pos = new Vector2();
  /** Where the creature wants to be (steering / scripts). */
  readonly goal = new Vector2();
  facing: 1 | -1 = 1;
  state: PuppetState = 'gone';
  /** Ground line in wall-local metres. */
  groundY = -0.19;
  protected age = 0;
  protected stateAge = 0;
  /** Scripted movement overrides steering while set. */
  protected script: { from: Vector2; to: Vector2; t: number; dur: number; done?: () => void } | null = null;
  private lastKey = '';
  /** Size of the drawing area in cm, and where the feet sit inside it. */
  constructor(protected readonly spanCm: number, protected readonly feetFrac = 0.22, pxPerCm = 12) {
    const px = Math.round(spanCm * pxPerCm);
    this.tex = createCanvasTex(px, px);
    this.material = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0 });
    const size = spanCm / 100;
    const geo = new PlaneGeometry(size, size);
    geo.translate(0, size / 2 - size * feetFrac, 0);
    this.mesh = new Mesh(geo, this.material);
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }

  /** Pose parameters that affect the drawing; changing them triggers a redraw. */
  protected abstract poseKey(): string;
  /** Draw the silhouette. ctx is set up in cm, origin at the feet, y up. */
  protected abstract draw(ctx: CanvasRenderingContext2D): void;
  /** Per-creature behaviour. */
  protected abstract behave(dt: number, input: CreatureInput): void;

  /** Scale at full size (bloom overshoots this). */
  protected baseScale = 1;
  /** Additional vertical offset (hops, flight bob), metres. */
  protected lift = 0;

  spawn(at: Vector2): void {
    this.pos.copy(at);
    this.goal.copy(at);
    this.state = 'blooming';
    this.stateAge = 0;
    this.age = 0;
    this.script = null;
    this.mesh.visible = true;
    this.lastKey = '';
  }

  leave(): void {
    if (this.state === 'gone' || this.state === 'leaving') return;
    this.state = 'leaving';
    this.stateAge = 0;
  }

  get alive(): boolean {
    return this.state === 'blooming' || this.state === 'alive';
  }

  /** Move along a scripted path (used by fable beats). */
  moveTo(to: Vector2, durMs: number, done?: () => void): void {
    this.script = { from: this.pos.clone(), to: to.clone(), t: 0, dur: Math.max(1, durMs), done };
  }

  get scripted(): boolean {
    return this.script !== null;
  }

  update(dtMs: number, input: CreatureInput): void {
    if (this.state === 'gone') return;
    const dt = dtMs / 1000;
    this.age += dt;
    this.stateAge += dt;

    if (this.script) {
      const s = this.script;
      s.t += dtMs;
      const k = Math.min(1, s.t / s.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const nx = s.from.x + (s.to.x - s.from.x) * e;
      if (Math.abs(nx - this.pos.x) > 1e-4) this.facing = nx > this.pos.x ? 1 : -1;
      this.pos.set(nx, s.from.y + (s.to.y - s.from.y) * e);
      this.goal.copy(this.pos);
      if (k >= 1) {
        this.script = null;
        s.done?.();
      }
    }
    this.behave(dt, input);

    // Bloom: scale up with a soft overshoot; leaving: shrink back into ink.
    let scale = this.baseScale;
    let opacity = 1;
    if (this.state === 'blooming') {
      const k = Math.min(1, this.stateAge / 0.65);
      const overshoot = 1 + 0.12 * Math.sin(k * Math.PI);
      scale *= (0.25 + 0.75 * (1 - Math.pow(1 - k, 3))) * overshoot;
      opacity = Math.min(1, k * 1.6);
      if (k >= 1) {
        this.state = 'alive';
        this.stateAge = 0;
      }
    } else if (this.state === 'leaving') {
      const k = Math.min(1, this.stateAge / 0.5);
      opacity = 1 - k;
      scale *= 1 - 0.3 * k;
      if (k >= 1) {
        this.state = 'gone';
        this.mesh.visible = false;
      }
    }
    this.material.opacity = opacity;
    this.mesh.scale.set(scale * this.facing, scale, 1);
    this.mesh.position.set(this.pos.x, this.pos.y + this.lift, this.mesh.position.z);

    const key = this.poseKey();
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.redraw();
    }
  }

  protected redraw(): void {
    const { ctx, width, height } = this.tex;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const ppc = width / this.spanCm;
    ctx.setTransform(ppc, 0, 0, -ppc, width / 2, height * (1 - this.feetFrac));
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.shadowColor = INK;
    ctx.shadowBlur = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.draw(ctx);
    ctx.shadowBlur = 0;
    this.tex.commit();
  }

  /** Small helpers for drawing in cm. */
  protected ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Punch a hole (an eye) so lantern light shows through, like real puppets. */
  protected hole(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Quantise a number so tiny pose changes don't force redraws. */
  protected q(x: number, steps = 24): number {
    return Math.round(x * steps) / steps;
  }
}
