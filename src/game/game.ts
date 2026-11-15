import type { World } from '@iwsdk/core';
import { Color, Vector3 } from 'three';
import type { HandsFrame } from '../hands/joints';
import { XRHandReader } from '../hands/xrHands';
import { SyntheticDriver } from '../debug/syntheticDriver';
import { HandShadows } from '../render/handShadows';
import { Lantern } from '../render/lantern';
import { buildCozyRoom } from '../render/room';
import { ShadowWall } from '../render/shadowWall';
import { Stage } from '../render/stage';
import { LAYOUT } from '../config/tuning';

export type GameMode = 'ar' | 'vr' | 'desktop';
export interface GameFlags {
  debug: boolean;
  demo: boolean;
}

/** Orchestrates every Shadowfolk system from a single per-frame tick. */
export class Game {
  readonly wall = new ShadowWall();
  readonly lantern = new Lantern();
  readonly stage = new Stage(this.wall, this.lantern);
  readonly handShadows = new HandShadows();
  readonly synthetic: SyntheticDriver;
  private xrHands = new XRHandReader();
  private started = false;
  private inXR = false;
  hands: HandsFrame = { left: null, right: null, time: 0 };

  constructor(readonly world: World, readonly mode: GameMode, readonly flags: GameFlags) {
    Lantern.configureRenderer(world.renderer);
    world.scene.add(this.stage.group, this.handShadows.group);
    if (mode !== 'ar') {
      world.scene.add(buildCozyRoom());
      world.scene.background = new Color('#0a0604');
    }
    this.stage.placeAt(new Vector3(0, LAYOUT.defaultHeadHeight, 0), new Vector3(0, 0, -1));
    this.synthetic = new SyntheticDriver(this.poseStage());
    this.handShadows.setDebugVisible(flags.debug);
    this.wall.setBrightness(0.15);
  }

  /** Stage description for synthetic poses, derived from the placed stage. */
  poseStage() {
    return {
      center: this.stage.handZoneTuple(),
      forward: this.stage.forwardTuple(),
      up: [0, 1, 0] as [number, number, number],
    };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    document.getElementById('intro')?.classList.add('hidden');
    if (this.mode !== 'desktop') this.world.launchXR();
    this.lantern.ignite();
    this.wall.setBrightness(1);
  }

  private readHands(now: number, dt: number): HandsFrame {
    const frame = this.world.renderer.xr.getFrame?.() as XRFrame | undefined;
    const ref = this.world.renderer.xr.getReferenceSpace();
    if (this.inXR && frame && ref) {
      this.world.player.updateMatrixWorld();
      const real = this.xrHands.read(frame, ref, this.world.player.matrixWorld, now);
      if (real.left || real.right || !this.flags.debug) return real;
    }
    return this.synthetic.frame(now, dt);
  }

  tick(dtMs: number, now: number): void {
    const inXR = !!this.world.session;
    if (inXR !== this.inXR) {
      this.inXR = inXR;
      if (inXR) {
        // Seat the stage in front of wherever the player is looking.
        requestAnimationFrame(() => this.recenter());
      }
    }
    this.hands = this.readHands(now, dtMs);
    this.handShadows.update(this.hands.left, this.hands.right);
    this.lantern.update(dtMs, now);
    this.wall.update(dtMs);
  }

  recenter(): void {
    this.stage.recenter(this.world.camera);
    this.synthetic.stage = this.poseStage();
  }
}
