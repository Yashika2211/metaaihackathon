import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Vector2 } from 'three';
import { createCanvasTex, seeded } from '../render/canvasTexture';

function paintSplat(seed: number) {
  const t = createCanvasTex(256, 256);
  const { ctx } = t;
  const rand = seeded(seed);
  ctx.fillStyle = 'rgba(24,12,5,1)';
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.arc(128, 128, 54, 0, Math.PI * 2);
  ctx.fill();
  // Tendrils and droplets, like ink touching wet paper.
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2;
    const len = 50 + rand() * 60;
    const w = 6 + rand() * 12;
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(len * 0.6, 0, len * 0.5, w / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(len + rand() * 16, (rand() - 0.5) * 10, 3 + rand() * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.filter = 'none';
  t.commit();
  return t;
}

interface Bloom {
  mesh: Mesh;
  mat: MeshBasicMaterial;
  t: number;
  active: boolean;
}

/**
 * The "ink bloom": when a pose is confirmed, ink spreads out from the hand's
 * shadow and the creature grows out of it.
 */
export class InkBloomFx {
  readonly group = new Group();
  private pool: Bloom[] = [];
  private readonly duration = 0.9;

  constructor() {
    const tex = paintSplat(99);
    for (let i = 0; i < 3; i++) {
      const mat = new MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new Mesh(new PlaneGeometry(0.3, 0.3), mat);
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.pool.push({ mesh, mat, t: 0, active: false });
    }
  }

  burst(at: Vector2): void {
    const b = this.pool.find((p) => !p.active) ?? this.pool[0];
    b.active = true;
    b.t = 0;
    b.mesh.visible = true;
    b.mesh.position.set(at.x, at.y, 0);
    b.mesh.rotation.z = Math.random() * Math.PI * 2;
  }

  update(dtMs: number): void {
    for (const b of this.pool) {
      if (!b.active) continue;
      b.t += dtMs / 1000;
      const k = Math.min(1, b.t / this.duration);
      const grow = 1 - Math.pow(1 - k, 3);
      b.mesh.scale.setScalar(0.25 + grow * 1.1);
      b.mat.opacity = k < 0.25 ? (k / 0.25) * 0.9 : 0.9 * (1 - (k - 0.25) / 0.75);
      b.mesh.rotation.z += dtMs * 0.0002;
      if (k >= 1) {
        b.active = false;
        b.mesh.visible = false;
      }
    }
  }
}
