import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  Vector2,
} from 'three';
import { createCanvasTex } from '../render/canvasTexture';
import { WALL_LAYER } from '../render/shadowWall';

function glowTexture() {
  const t = createCanvasTex(64, 64);
  const g = t.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(0.2, 'rgba(230,255,140,0.9)');
  g.addColorStop(0.5, 'rgba(190,240,90,0.25)');
  g.addColorStop(1, 'rgba(160,220,60,0)');
  t.ctx.fillStyle = g;
  t.ctx.fillRect(0, 0, 64, 64);
  t.commit();
  return t.texture;
}

/**
 * Lumi, the firefly who lost her light, plus the swarm of fireflies that
 * fills the wall at the end. Both are light, not shadow: additive glows.
 */
export class Fireflies {
  readonly group = new Group();
  readonly lumi: Sprite;
  private lumiMat: SpriteMaterial;
  /** Lumi's brightness: 0.15 = lost her light, 1 = shining. */
  lumiGlow = 0.15;
  private lumiGlowShown = 0;
  readonly lumiPos = new Vector2(-0.3, -0.12);
  readonly lumiGoal = new Vector2(-0.3, -0.12);
  /** When set, Lumi is carried to this point every frame (e.g. by the bird). */
  carriedBy: (() => Vector2) | null = null;
  lumiVisible = false;

  private swarm: Points;
  private swarmMat: PointsMaterial;
  private seeds: Float32Array;
  private count = 90;
  private swarmLevel = 0;
  private swarmTarget = 0;
  private t = 0;

  constructor(private wallW: number, private wallH: number) {
    const tex = glowTexture();
    this.group.position.z = WALL_LAYER.fx;
    this.lumiMat = new SpriteMaterial({ map: tex, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
    this.lumi = new Sprite(this.lumiMat);
    this.lumi.scale.setScalar(0.03);
    this.lumi.renderOrder = 8;
    this.group.add(this.lumi);

    const pos = new Float32Array(this.count * 3);
    this.seeds = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      this.seeds[i * 4] = Math.random();
      this.seeds[i * 4 + 1] = Math.random();
      this.seeds[i * 4 + 2] = Math.random() * Math.PI * 2;
      this.seeds[i * 4 + 3] = 0.4 + Math.random() * 0.8;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    this.swarmMat = new PointsMaterial({
      map: tex,
      size: 0.022,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      opacity: 0,
    });
    this.swarm = new Points(geo, this.swarmMat);
    this.swarm.frustumCulled = false;
    this.swarm.renderOrder = 7;
    this.group.add(this.swarm);
  }

  /** Start (1) or stop (0) the ending swarm. */
  setSwarm(level: number): void {
    this.swarmTarget = level;
  }

  placeLumi(x: number, y: number): void {
    this.lumiPos.set(x, y);
    this.lumiGoal.set(x, y);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.t += dt;

    // Lumi: drifts toward her goal with a little figure-eight wander.
    if (this.carriedBy) {
      this.lumiPos.copy(this.carriedBy());
    } else {
      this.lumiPos.lerp(this.lumiGoal, Math.min(1, dt * 1.5));
    }
    const wx = Math.sin(this.t * 1.7) * 0.008;
    const wy = Math.sin(this.t * 3.4) * 0.005;
    this.lumi.position.set(this.lumiPos.x + wx, this.lumiPos.y + wy, 0);
    this.lumiGlowShown += (this.lumiGlow - this.lumiGlowShown) * Math.min(1, dt * 1.2);
    const pulse = 0.8 + 0.2 * Math.sin(this.t * 4.2);
    const target = this.lumiVisible ? 1 : 0;
    this.lumiMat.opacity += (target * (0.5 + 0.5 * this.lumiGlowShown) * pulse - this.lumiMat.opacity) * Math.min(1, dt * 4);
    this.lumi.scale.setScalar(0.03 + 0.035 * this.lumiGlowShown);
    this.lumi.visible = this.lumiMat.opacity > 0.01;

    // Swarm.
    this.swarmLevel += (this.swarmTarget - this.swarmLevel) * Math.min(1, dt * 0.5);
    this.swarm.visible = this.swarmLevel > 0.01;
    if (!this.swarm.visible) return;
    this.swarmMat.opacity = this.swarmLevel;
    const attr = this.swarm.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    const shown = Math.floor(this.count * Math.min(1, this.swarmLevel * 1.2));
    for (let i = 0; i < this.count; i++) {
      const s = i * 4;
      const sp = this.seeds[s + 3];
      const ph = this.seeds[s + 2];
      const x = (this.seeds[s] - 0.5) * this.wallW * 0.9 + Math.sin(this.t * 0.5 * sp + ph) * 0.04;
      const y = (this.seeds[s + 1] - 0.45) * this.wallH * 0.8 + Math.sin(this.t * 0.7 * sp + ph * 2) * 0.03;
      const blink = Math.sin(this.t * 2 * sp + ph) > -0.2 ? 0 : -10;
      arr[i * 3] = x;
      arr[i * 3 + 1] = i < shown ? y : -10;
      arr[i * 3 + 2] = blink * 0.0001;
    }
    attr.needsUpdate = true;
  }
}
