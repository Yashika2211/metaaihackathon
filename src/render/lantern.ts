import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFShadowMap,
  SpotLight,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { SHADOW } from '../config/tuning';
import { createCanvasTex } from './canvasTexture';

const WARM = new Color('#ffcf86');

function glowSprite(size: number, inner: string): Sprite {
  const t = createCanvasTex(128, 128);
  const g = t.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, 'rgba(255,190,110,0.35)');
  g.addColorStop(1, 'rgba(255,160,80,0)');
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0, 0, 128, 128);
  t.commit();
  const s = new Sprite(new SpriteMaterial({ map: t.texture, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

/**
 * The paper lantern: a glowing lathe-shaped shade with bamboo ribs, a halo,
 * and the spot light that throws every shadow in the game.
 */
export class Lantern {
  readonly group = new Group();
  readonly light: SpotLight;
  readonly target = new Object3D();
  private shade: Mesh;
  private shadeMat: MeshBasicMaterial;
  private halo: Sprite;
  private lit = 0;
  private litTarget = 0;
  private flickerSeed = Math.random() * 100;
  /** Extra brightness pulse (e.g. on pose confirm). */
  private pulse = 0;
  /** Hover highlight when a pinch is near (0..1). */
  hover = 0;

  constructor() {
    const profile: Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      profile.push(new Vector2(0.018 + Math.sin(t * Math.PI) * 0.03, -0.04 + t * 0.08));
    }
    this.shadeMat = new MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0.92, side: DoubleSide });
    this.shade = new Mesh(new LatheGeometry(profile, 18), this.shadeMat);
    this.group.add(this.shade);

    const ribMat = new MeshBasicMaterial({ color: '#4a2a12' });
    for (let i = 0; i < 6; i++) {
      const rib = new Mesh(new LatheGeometry(profile.map((p) => new Vector2(p.x + 0.0008, p.y)), 1, (i / 6) * Math.PI * 2, 0.06), ribMat);
      this.group.add(rib);
    }
    const capGeo = new CylinderGeometry(0.016, 0.02, 0.008, 14);
    const top = new Mesh(capGeo, ribMat);
    top.position.y = 0.043;
    const bottom = new Mesh(capGeo, ribMat);
    bottom.position.y = -0.043;
    bottom.rotation.x = Math.PI;
    this.group.add(top, bottom);

    this.halo = glowSprite(0.32, 'rgba(255,220,150,0.9)');
    this.group.add(this.halo);

    this.light = new SpotLight(WARM, 0, 3, SHADOW.lightAngle, SHADOW.lightPenumbra, 1.2);
    // SpotLight defaults to (0, 1, 0); the flame sits at the lantern's centre.
    this.light.position.set(0, 0, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(SHADOW.mapSize, SHADOW.mapSize);
    this.light.shadow.bias = SHADOW.bias;
    this.light.shadow.normalBias = SHADOW.normalBias;
    this.light.shadow.radius = SHADOW.radius;
    this.light.shadow.camera.near = 0.04;
    this.light.shadow.camera.far = 2.5;
    this.light.target = this.target;
    this.group.add(this.light);

    for (const o of [this.shade, this.halo, top, bottom]) o.castShadow = false;
  }

  /** Configure the renderer for soft lantern shadows. */
  static configureRenderer(renderer: WebGLRenderer): void {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
  }

  /** Aim the light at an object by parenting the light target to it. */
  aimAt(object: Object3D): void {
    object.add(this.target);
    this.target.position.set(0, 0, 0);
  }

  ignite(): void {
    this.litTarget = 1;
  }

  dim(level = 0.35): void {
    this.litTarget = level;
  }

  flash(amount = 0.6): void {
    this.pulse = Math.max(this.pulse, amount);
  }

  get isLit(): boolean {
    return this.lit > 0.6;
  }

  worldPosition(out = new Vector3()): Vector3 {
    return this.group.getWorldPosition(out);
  }

  update(dtMs: number, timeMs: number): void {
    const dt = dtMs / 1000;
    // Ignition: a wobbly climb, like a wick catching.
    const speed = this.litTarget > this.lit ? 0.9 : 2.0;
    this.lit += (this.litTarget - this.lit) * Math.min(1, dt * speed * 2);
    const t = timeMs / 1000 + this.flickerSeed;
    const catching = this.lit < 0.95 && this.litTarget === 1 ? (Math.sin(t * 37) > 0.6 ? -0.35 : 0) : 0;
    const flicker = 0.93 + 0.04 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 13.1 + 1.3) + 0.02 * Math.sin(t * 23.7);
    this.pulse = Math.max(0, this.pulse - dt * 1.6);
    const level = Math.max(0, this.lit + catching) * flicker + this.pulse * 0.5;
    this.light.intensity = SHADOW.lightIntensity * level;
    this.shadeMat.color.copy(WARM).multiplyScalar(0.25 + 0.85 * Math.min(1.2, level + this.hover * 0.3));
    this.halo.material.opacity = Math.min(1, 0.15 + level * 0.85 + this.hover * 0.4);
    this.halo.scale.setScalar(0.26 + level * 0.08 + this.hover * 0.06);
    // A slow turn and gentle bob so it feels like it floats.
    this.group.rotation.y += dt * 0.15;
    this.shade.position.y = Math.sin(t * 1.1) * 0.003;
  }
}
