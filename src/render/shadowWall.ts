import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShadowMaterial,
  Vector2,
  Vector3,
} from 'three';
import { LAYOUT, SHADOW } from '../config/tuning';
import { paintParchment } from './parchment';

/** Z offsets (metres, toward the viewer) for things drawn on the wall. */
export const WALL_LAYER = {
  scenery: 0.0015,
  shadow: 0.003,
  creatures: 0.0045,
  fx: 0.006,
  text: 0.0075,
};

/**
 * The glowing parchment "shadow wall". Hand shadows land on a ShadowMaterial
 * overlay, so their darkness can be faded independently of the paper.
 */
export class ShadowWall {
  readonly group = new Group();
  /** Children are laid out in wall-local metres: x right, y up, origin at the centre. */
  readonly content = new Group();
  readonly width = LAYOUT.wallWidth;
  readonly height = LAYOUT.wallHeight;
  private paperMat: MeshBasicMaterial;
  private shadowMat: ShadowMaterial;
  private shadowOpacity: number = SHADOW.handOpacity;
  private shadowTarget: number = SHADOW.handOpacity;
  private brightness = 0;
  private brightnessTarget = 0;
  private tmp = new Vector3();

  constructor() {
    const parchment = paintParchment();
    this.paperMat = new MeshBasicMaterial({ map: parchment.texture, transparent: true, color: 0x000000 });
    const paper = new Mesh(new PlaneGeometry(this.width, this.height), this.paperMat);
    paper.renderOrder = 0;
    this.group.add(paper);

    this.shadowMat = new ShadowMaterial({ color: 0x1a0d05, opacity: this.shadowOpacity, transparent: true, depthWrite: false });
    const shadowPlane = new Mesh(new PlaneGeometry(this.width, this.height), this.shadowMat);
    shadowPlane.position.z = WALL_LAYER.shadow;
    shadowPlane.receiveShadow = true;
    shadowPlane.renderOrder = 2;
    this.group.add(shadowPlane);

    this.group.add(this.content);
  }

  /** 0 = dark paper, 1 = fully lantern-lit. */
  setBrightness(level: number): void {
    this.brightnessTarget = level;
  }

  /** Fade the player's own hand shadow (e.g. when a creature peels off). */
  setHandShadowOpacity(opacity: number): void {
    this.shadowTarget = opacity;
  }

  /** World point → wall-local 2D coordinates (metres). */
  toWallLocal(world: Vector3, out = new Vector2()): Vector2 {
    this.tmp.copy(world);
    this.group.worldToLocal(this.tmp);
    return out.set(this.tmp.x, this.tmp.y);
  }

  /** Wall-local 2D → world position on the wall surface (+ layer offset). */
  toWorld(x: number, y: number, z = 0, out = new Vector3()): Vector3 {
    return this.group.localToWorld(out.set(x, y, z));
  }

  /**
   * Where does a point's shadow land? Projects from the light through `world`
   * onto the wall plane. Returns wall-local 2D, or null if it misses.
   */
  shadowOf(world: Vector3, lightWorld: Vector3, out = new Vector2()): Vector2 | null {
    const p = this.group.worldToLocal(this.tmp.copy(world));
    const l = this.group.worldToLocal(new Vector3().copy(lightWorld));
    const dz = p.z - l.z;
    if (Math.abs(dz) < 1e-5) return null;
    const t = -l.z / dz;
    if (t <= 0) return null;
    return out.set(l.x + (p.x - l.x) * t, l.y + (p.y - l.y) * t);
  }

  /** Clamp wall-local coordinates to stay inside the paper with a margin. */
  clampToWall(v: Vector2, margin = 0.06): Vector2 {
    v.x = Math.max(-this.width / 2 + margin, Math.min(this.width / 2 - margin, v.x));
    v.y = Math.max(-this.height / 2 + margin, Math.min(this.height / 2 - margin, v.y));
    return v;
  }

  update(dtMs: number): void {
    const k = Math.min(1, dtMs / 250);
    this.shadowOpacity += (this.shadowTarget - this.shadowOpacity) * k;
    this.shadowMat.opacity = this.shadowOpacity * Math.min(1, this.brightness * 1.4);
    this.brightness += (this.brightnessTarget - this.brightness) * Math.min(1, dtMs / 600);
    const b = this.brightness;
    this.paperMat.color.setRGB(b, b * 0.97, b * 0.92);
    this.paperMat.opacity = 0.35 + 0.65 * Math.min(1, b * 1.5);
  }
}
