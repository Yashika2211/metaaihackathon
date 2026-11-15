import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type Camera } from 'three';
import type { Vec3 } from '../core/vec';
import { createCanvasTex } from '../render/canvasTexture';

export type MenuAction = 'resume' | 'restart' | 'journal' | 'recenter';

const ITEMS: Array<{ id: MenuAction; label: string }> = [
  { id: 'resume', label: 'Resume' },
  { id: 'restart', label: 'Restart fable' },
  { id: 'journal', label: 'Shadow Journal' },
  { id: 'recenter', label: 'Recenter' },
];

const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const W = 0.2;
const H = 0.24;

/**
 * Small pause menu opened by turning a palm up. It floats within easy reach
 * (about 35 cm away, below eye level) and buttons are pressed by poking them
 * with any fingertip. On desktop it can be clicked or driven by keys.
 */
export class PalmMenu {
  readonly group = new Group();
  private tex = createCanvasTex(512, 614);
  private mat: MeshBasicMaterial;
  private hover: number = -1;
  private pressCooldown = 0;
  private openT = 0;
  private wasInside = false;
  isOpen = false;
  title = 'Paused';

  constructor() {
    this.mat = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0, depthTest: false });
    const mesh = new Mesh(new PlaneGeometry(W, H), this.mat);
    mesh.renderOrder = 20;
    this.group.add(mesh);
    this.group.visible = false;
    this.draw();
  }

  /** Open in front of the head, within arm's reach. */
  open(head: Camera, title = 'Paused'): void {
    this.title = title;
    const pos = new Vector3();
    head.getWorldPosition(pos);
    const fwd = new Vector3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(this.group.quaternion.clone()));
    fwd.y = 0;
    fwd.normalize();
    this.group.position.copy(pos).addScaledVector(fwd, 0.36);
    this.group.position.y -= 0.14;
    this.group.lookAt(pos.x, this.group.position.y + 0.05, pos.z);
    this.isOpen = true;
    this.group.visible = true;
    this.openT = 0;
    this.pressCooldown = 600;
    this.hover = -1;
    this.draw();
  }

  close(): void {
    this.isOpen = false;
  }

  /** Map a world point to a button index if it is touching the panel. */
  private hit(tip: Vec3, depth: number): { index: number; distance: number } | null {
    const local = this.group.worldToLocal(new Vector3(tip[0], tip[1], tip[2]));
    if (Math.abs(local.x) > W / 2 || Math.abs(local.y) > H / 2) return null;
    if (local.z > depth || local.z < -0.04) return null;
    const v = (H / 2 - local.y) / H; // 0 at top
    const rowTop = 0.2;
    const rowH = 0.19;
    const i = Math.floor((v - rowTop) / rowH);
    if (i < 0 || i >= ITEMS.length) return { index: -1, distance: local.z };
    return { index: i, distance: local.z };
  }

  /**
   * Feed fingertip positions; returns the action pressed this frame, if any.
   * A press is a fingertip pushing through the panel surface.
   */
  update(dtMs: number, tips: Vec3[]): MenuAction | null {
    this.openT += dtMs;
    const target = this.isOpen ? 1 : 0;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dtMs / 150);
    this.group.visible = this.mat.opacity > 0.01;
    if (!this.isOpen) return null;
    this.pressCooldown = Math.max(0, this.pressCooldown - dtMs);

    let hover = -1;
    let pressed: number | null = null;
    let inside = false;
    for (const tip of tips) {
      const near = this.hit(tip, 0.06);
      if (near && near.index >= 0) hover = near.index;
      const touch = this.hit(tip, 0.004);
      if (touch && touch.index >= 0) {
        inside = true;
        if (!this.wasInside && this.pressCooldown === 0) pressed = touch.index;
      }
    }
    this.wasInside = inside;
    if (hover !== this.hover) {
      this.hover = hover;
      this.draw();
    }
    if (pressed !== null) {
      this.pressCooldown = 400;
      return ITEMS[pressed].id;
    }
    return null;
  }

  /** Desktop click: uv on the panel (0..1). */
  actionAtUv(v: number): MenuAction | null {
    const i = Math.floor((1 - v - 0.2) / 0.19);
    return i >= 0 && i < ITEMS.length ? ITEMS[i].id : null;
  }

  get mesh(): Mesh {
    return this.group.children[0] as Mesh;
  }

  private draw(): void {
    const { ctx, width, height } = this.tex;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(30,18,10,0.9)';
    ctx.beginPath();
    ctx.roundRect(6, 6, width - 12, height - 12, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,180,90,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f6e7c8';
    ctx.font = `italic 50px ${FONT}`;
    ctx.fillText(this.title, width / 2, height * 0.1);
    ITEMS.forEach((item, i) => {
      const y = height * (0.2 + i * 0.19);
      const h = height * 0.16;
      ctx.fillStyle = i === this.hover ? 'rgba(242,180,90,0.95)' : 'rgba(242,180,90,0.18)';
      ctx.beginPath();
      ctx.roundRect(36, y, width - 72, h, 24);
      ctx.fill();
      ctx.fillStyle = i === this.hover ? '#1b1006' : '#f6e7c8';
      ctx.font = `42px ${FONT}`;
      ctx.fillText(item.label, width / 2, y + h / 2);
    });
    ctx.fillStyle = 'rgba(246,231,200,0.6)';
    ctx.font = `italic 26px ${FONT}`;
    ctx.fillText('Touch a button with a fingertip', width / 2, height * 0.965);
    this.tex.commit();
  }
}
