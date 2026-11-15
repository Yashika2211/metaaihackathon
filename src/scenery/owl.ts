import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { createCanvasTex } from '../render/canvasTexture';

const INK = 'rgba(24,12,5,0.96)';

/** The blinking owl guarding the old oak. Startles and flies off at a bark. */
export class Owl {
  readonly mesh: Mesh;
  private tex = createCanvasTex(256, 256);
  private mat: MeshBasicMaterial;
  private t = 0;
  private blink = 0;
  private flying = false;
  private flyT = 0;
  private home = { x: 0, y: 0 };
  private lastKey = '';
  private startle = 0;
  visible = false;

  constructor() {
    this.mat = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0 });
    this.mesh = new Mesh(new PlaneGeometry(0.14, 0.14), this.mat);
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
  }

  perch(x: number, y: number): void {
    this.home = { x, y };
    this.flying = false;
    this.flyT = 0;
    this.visible = true;
    this.mesh.visible = true;
    this.mesh.position.set(x, y + 0.05, 0);
  }

  /** Ruffle without leaving (a bark that is not quite enough). */
  ruffle(): void {
    this.startle = 1;
  }

  flyAway(): void {
    this.flying = true;
    this.flyT = 0;
  }

  hide(): void {
    this.visible = false;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.t += dt;
    const target = this.visible ? 1 : 0;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dt * 3);
    this.mesh.visible = this.mat.opacity > 0.01;
    this.startle = Math.max(0, this.startle - dt * 2);
    // Blink every few seconds.
    const cycle = this.t % 3.2;
    this.blink = cycle < 0.15 ? 1 : 0;
    let wing = 0;
    if (this.flying) {
      this.flyT += dt;
      const k = this.flyT;
      this.mesh.position.set(this.home.x + k * 0.35, this.home.y + 0.05 + k * k * 0.2, 0);
      wing = Math.sin(this.flyT * 22);
      if (k > 1.8) this.visible = false;
    } else {
      this.mesh.position.set(this.home.x, this.home.y + 0.05 + this.startle * 0.01 * Math.sin(this.t * 40), 0);
    }
    const key = `${this.blink}|${this.flying ? Math.round(wing * 4) : 'p'}|${Math.round(this.startle * 3)}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.draw(wing);
    }
  }

  private draw(wing: number): void {
    const { ctx, width, height } = this.tex;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // Units: cm, origin at feet, y up. 14 cm wide drawing.
    const k = width / 14;
    ctx.setTransform(k, 0, 0, -k, width / 2, height * 0.85);
    ctx.fillStyle = INK;
    ctx.shadowColor = INK;
    ctx.shadowBlur = 4;
    const puff = 1 + this.startle * 0.15;
    ctx.beginPath();
    ctx.ellipse(0, 4, 3 * puff, 4 * puff, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 8.6, 2.6 * puff, 2.3 * puff, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ear tufts.
    ctx.beginPath();
    ctx.moveTo(-2.4, 9.6);
    ctx.lineTo(-2.6, 12);
    ctx.lineTo(-1.2, 10.6);
    ctx.moveTo(2.4, 9.6);
    ctx.lineTo(2.6, 12);
    ctx.lineTo(1.2, 10.6);
    ctx.fill();
    if (this.flying) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 2, 5);
        ctx.quadraticCurveTo(s * 6, 6 + wing * 3, s * 7, 3 + wing * 5);
        ctx.lineTo(s * 2.5, 2.5);
        ctx.fill();
      }
    }
    // Feet on the branch.
    ctx.fillRect(-1.2, -0.2, 0.6, 0.6);
    ctx.fillRect(0.6, -0.2, 0.6, 0.6);
    // Big eyes: light shows through unless blinking.
    if (!this.blink) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.shadowBlur = 0;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 1.05, 8.8, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = INK;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 1.05, 8.7, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    this.tex.commit();
  }
}
