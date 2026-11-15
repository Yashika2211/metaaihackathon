import type { World } from '@iwsdk/core';
import { Color, Vector2, Vector3 } from 'three';
import { LAYOUT, SHADOW } from '../config/tuning';
import { CreatureLayer } from '../creatures/creatureLayer';
import { DebugOverlay } from '../debug/debugOverlay';
import { bindKeyboard } from '../debug/keyboard';
import { SyntheticDriver } from '../debug/syntheticDriver';
import type { HandsFrame } from '../hands/joints';
import type { PoseName } from '../hands/poseLibrary';
import { XRHandReader } from '../hands/xrHands';
import { HandShapeRecognizer, type RecognizerEvent, type RecognizerState } from '../recognizer/recognizer';
import { HandShadows } from '../render/handShadows';
import { Lantern } from '../render/lantern';
import { buildCozyRoom } from '../render/room';
import { ShadowWall } from '../render/shadowWall';
import { Stage } from '../render/stage';

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
  readonly creatures = new CreatureLayer();
  readonly recognizer = new HandShapeRecognizer();
  readonly synthetic: SyntheticDriver;
  private xrHands = new XRHandReader();
  private debugOverlay: DebugOverlay | null = null;
  private started = false;
  private inXR = false;
  hands: HandsFrame = { left: null, right: null, time: 0 };
  state: RecognizerState | null = null;
  /** Where the active hand's shadow is on the wall (wall-local metres). */
  readonly handTarget = new Vector2();
  private hasTarget = false;
  private lightPos = new Vector3();
  private anchor = new Vector3();

  constructor(readonly world: World, readonly mode: GameMode, readonly flags: GameFlags) {
    Lantern.configureRenderer(world.renderer);
    world.scene.add(this.stage.group, this.handShadows.group);
    this.wall.content.add(this.creatures.group);
    if (mode !== 'ar') {
      world.scene.add(buildCozyRoom());
      world.scene.background = new Color('#0a0604');
    }
    this.stage.placeAt(new Vector3(0, LAYOUT.defaultHeadHeight, 0), new Vector3(0, 0, -1));
    this.synthetic = new SyntheticDriver(this.poseStage());
    this.handShadows.setDebugVisible(flags.debug);
    this.wall.setBrightness(0.15);
    if (flags.debug) this.debugOverlay = new DebugOverlay();

    bindKeyboard(
      {
        pose: (name) => this.injectPose(name),
        steer: (x, y) => this.synthetic.steer(x, y),
        togglePause: () => {},
        journal: () => {},
        recenter: () => this.recenter(),
        skip: () => {},
      },
      flags.debug,
    );
  }

  /** Stage description for synthetic poses, derived from the placed stage. */
  poseStage() {
    return {
      center: this.stage.handZoneTuple(),
      forward: this.stage.forwardTuple(),
      up: [0, 1, 0] as [number, number, number],
    };
  }

  /** Game clock (ms); synthetic poses blend on this clock. */
  now = 0;

  injectPose(name: PoseName): void {
    this.synthetic.setPose(name, this.now);
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
      // In debug mode, keyboard poses take over when no real hands are tracked.
      if (real.left || real.right || !this.flags.debug) return real;
    }
    return this.synthetic.frame(now, dt);
  }

  tick(dtMs: number, now: number): void {
    this.now = now;
    const inXR = !!this.world.session;
    if (inXR !== this.inXR) {
      this.inXR = inXR;
      if (inXR) requestAnimationFrame(() => this.recenter());
    }
    this.hands = this.readHands(now, dtMs);
    this.handShadows.update(this.hands.left, this.hands.right);

    this.recognizer.frame = { forward: this.stage.forwardTuple(), up: [0, 1, 0] };
    const { state, events } = this.recognizer.update(this.hands);
    this.state = state;

    this.lantern.light.getWorldPosition(this.lightPos);
    this.hasTarget = false;
    if (state.anchor) {
      this.anchor.set(state.anchor[0], state.anchor[1], state.anchor[2]);
      if (this.wall.shadowOf(this.anchor, this.lightPos, this.handTarget)) {
        this.wall.clampToWall(this.handTarget);
        this.hasTarget = true;
      }
    }
    for (const e of events) this.onEvent(e);

    this.creatures.update(dtMs, {
      target: this.hasTarget ? this.handTarget : null,
      flap: state.flap,
      jaw: state.jaw,
    });
    this.wall.setHandShadowOpacity(this.creatures.active?.alive ? SHADOW.handOpacityWithCreature : SHADOW.handOpacity);

    this.lantern.update(dtMs, now);
    this.wall.update(dtMs);
    this.debugOverlay?.update(now, state, `${this.mode}${this.inXR ? ' · in XR' : ''}`);
  }

  private onEvent(e: RecognizerEvent): void {
    switch (e.type) {
      case 'confirm': {
        const at = this.hasTarget ? this.handTarget.clone() : new Vector2(0, 0);
        const p = this.creatures.summon(e.creature, at);
        if (e.creature === 'dog') this.creatures.dog.autoJaw = e.variant === 'oneHanded';
        if (p.id !== 'bird') p.goal.set(at.x, p.groundY);
        this.lantern.flash(0.5);
        break;
      }
      case 'release':
        this.creatures.release(e.creature);
        break;
      case 'bark':
        this.creatures.dog.bark();
        break;
      default:
        break;
    }
  }

  recenter(): void {
    if (this.inXR) this.stage.recenter(this.world.camera);
    this.synthetic.stage = this.poseStage();
  }
}
