import { Mesh, MeshBasicMaterial, PlaneGeometry, Vector2, Vector3 } from 'three';
import { BONES, type HandsFrame } from '../hands/joints';
import { createCanvasTex } from '../render/canvasTexture';
import { WALL_LAYER, type ShadowWall } from '../render/shadowWall';

/**
 * The "ghost hand": a glowing outline on the wall showing exactly where and
 * how the player's hand shadow should look. It is the shadow of a scripted
 * synthetic hand, projected from the real lantern, so copying it works.
 */
export class GhostHint {
  readonly mesh: Mesh;
  private tex;
  private mat: MeshBasicMaterial;
  private level = 0;
  private target = 0;
  private t = 0;
  private readonly pxPerM: number;

  constructor(private wall: ShadowWall) {
    this.tex = createCanvasTex(768, Math.round((768 * wall.height) / wall.width));
    this.pxPerM = 768 / wall.width;
    this.mat = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0 });
    this.mesh = new Mesh(new PlaneGeometry(wall.width, wall.height), this.mat);
    this.mesh.position.z = WALL_LAYER.fx - 0.0005;
    this.mesh.renderOrder = 6;
    this.mesh.visible = false;
  }

  /** Draw the shadow of `pose` (world-space synthetic hands) from the light. */
  show(pose: HandsFrame, lightWorld: Vector3, strength: number): void {
    const { ctx, width, height } = this.tex;
    ctx.clearRect(0, 0, width, height);
    const to = (x: number, y: number): [number, number] => [width / 2 + x * this.pxPerM, height / 2 - y * this.pxPerM];
    const p2 = new Vector2();
    const w3 = new Vector3();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      for (const hand of [pose.left, pose.right]) {
        if (!hand) continue;
        const pts = hand.joints.map((j) => {
          const hit = this.wall.shadowOf(w3.set(j[0], j[1], j[2]), lightWorld, p2);
          return hit ? to(hit.x, hit.y) : null;
        });
        // Approximate magnification for line thickness.
        const mag = 2.3 * this.pxPerM;
        for (const [a, b] of BONES) {
          const pa = pts[a];
          const pb = pts[b];
          if (!pa || !pb) continue;
          const r = Math.min(hand.radii[a], hand.radii[b]) * mag;
          ctx.strokeStyle = pass === 0 ? 'rgba(255,248,215,0.9)' : 'rgba(255,250,235,0.0)';
          ctx.lineWidth = pass === 0 ? r * 2 + 10 : r * 2;
          if (pass === 1) ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(pb[0], pb[1]);
          ctx.strokeStyle = pass === 1 ? 'rgba(0,0,0,0.75)' : ctx.strokeStyle;
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    this.tex.commit();
    this.target = strength;
    this.mesh.visible = true;
  }

  hide(): void {
    this.target = 0;
  }

  get visible(): boolean {
    return this.target > 0;
  }

  update(dtMs: number): void {
    this.t += dtMs / 1000;
    this.level += (this.target - this.level) * Math.min(1, dtMs / 400);
    const breathe = 0.75 + 0.25 * Math.sin(this.t * 2.4);
    this.mat.opacity = this.level * breathe;
    this.mesh.visible = this.level > 0.01;
  }
}
