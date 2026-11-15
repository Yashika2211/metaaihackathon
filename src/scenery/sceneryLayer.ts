import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { createCanvasTex, type CanvasTex } from '../render/canvasTexture';
import { WALL_LAYER } from '../render/shadowWall';
import { paintScene, type SceneId } from './backdrops';

/**
 * Two stacked backdrop planes that cross-fade between scenes, like a
 * shadow-theatre stagehand swapping a painted screen.
 */
export class SceneryLayer {
  readonly group = new Group();
  private planes: Array<{ tex: CanvasTex; mat: MeshBasicMaterial; mesh: Mesh }> = [];
  private front = 0;
  private fade = 1;
  current: SceneId | null = null;

  constructor(private wallW: number, wallH: number) {
    this.group.position.z = WALL_LAYER.scenery;
    for (let i = 0; i < 2; i++) {
      const tex = createCanvasTex(1024, Math.round((1024 * wallH) / wallW));
      const mat = new MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new Mesh(new PlaneGeometry(wallW, wallH), mat);
      mesh.renderOrder = 1;
      mesh.position.z = i * 0.0002;
      this.group.add(mesh);
      this.planes.push({ tex, mat, mesh });
    }
  }

  show(scene: SceneId): void {
    if (scene === this.current) return;
    this.current = scene;
    this.front = 1 - this.front;
    const p = this.planes[this.front];
    paintScene(p.tex.ctx, p.tex.width, p.tex.height, this.wallW, scene);
    p.tex.commit();
    // The incoming plane draws on top.
    p.mesh.renderOrder = 1.5;
    this.planes[1 - this.front].mesh.renderOrder = 1;
    this.fade = 0;
  }

  hide(): void {
    this.current = null;
    this.front = 1 - this.front;
    this.planes[this.front].tex.ctx.clearRect(0, 0, 4096, 4096);
    this.planes[this.front].tex.commit();
    this.fade = 0;
  }

  update(dtMs: number): void {
    if (this.fade >= 1) return;
    this.fade = Math.min(1, this.fade + dtMs / 1200);
    const e = this.fade * this.fade * (3 - 2 * this.fade);
    this.planes[this.front].mat.opacity = e;
    this.planes[1 - this.front].mat.opacity = 1 - e;
  }
}
