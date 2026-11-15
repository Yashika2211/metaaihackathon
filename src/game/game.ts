import type { World } from '@iwsdk/core';
import { Color, Raycaster, Vector2, Vector3 } from 'three';
import { Ambience } from '../audio/ambience';
import { AudioEngine } from '../audio/audioEngine';
import { Sfx } from '../audio/sfx';
import { LAYOUT, SHADOW } from '../config/tuning';
import type { Vec3 } from '../core/vec';
import { CreatureLayer } from '../creatures/creatureLayer';
import { DebugOverlay } from '../debug/debugOverlay';
import { DemoDirector } from '../debug/demo';
import { bindKeyboard } from '../debug/keyboard';
import { SyntheticDriver } from '../debug/syntheticDriver';
import { GameClock } from '../fable/clock';
import { FableEngine, type FableHost } from '../fable/engine';
import { fireflyFable } from '../fable/fireflyFable';
import type { Cue } from '../fable/types';
import { J, type HandsFrame } from '../hands/joints';
import { makePose, type PoseName } from '../hands/poseLibrary';
import { XRHandReader } from '../hands/xrHands';
import { CREATURES, type CreatureId } from '../recognizer/creatures';
import { HandShapeRecognizer, type RecognizerEvent, type RecognizerState } from '../recognizer/recognizer';
import { HandShadows } from '../render/handShadows';
import { Lantern } from '../render/lantern';
import { buildCozyRoom } from '../render/room';
import { ShadowWall } from '../render/shadowWall';
import { Stage } from '../render/stage';
import { Journal } from '../save/journal';
import { Fireflies } from '../scenery/fireflies';
import { Owl } from '../scenery/owl';
import { SceneryLayer } from '../scenery/sceneryLayer';
import { GhostHint } from '../ui/ghostHint';
import { JournalView } from '../ui/journalView';
import { PalmMenu, type MenuAction } from '../ui/palmMenu';
import { Subtitles } from '../ui/subtitles';

export type GameMode = 'ar' | 'vr' | 'desktop';
export interface GameFlags {
  debug: boolean;
  demo: boolean;
}

/** Distance (m) from a pinch to the lantern that counts as "tapping" it. */
const LANTERN_TAP = 0.09;

/** Orchestrates every Shadowfolk system from a single per-frame tick. */
export class Game {
  readonly wall = new ShadowWall();
  readonly lantern = new Lantern();
  readonly stage = new Stage(this.wall, this.lantern);
  readonly handShadows = new HandShadows();
  readonly creatures = new CreatureLayer();
  readonly recognizer = new HandShapeRecognizer();
  readonly scenery = new SceneryLayer(this.wall.width, this.wall.height);
  readonly fireflies = new Fireflies(this.wall.width, this.wall.height);
  readonly owl = new Owl();
  readonly subtitles = new Subtitles(this.wall.width, this.wall.height);
  readonly ghost = new GhostHint(this.wall);
  readonly journalView = new JournalView(this.wall.width, this.wall.height);
  readonly menu = new PalmMenu();
  readonly clock = new GameClock();
  readonly audio = new AudioEngine();
  readonly sfx = new Sfx(this.audio);
  readonly ambience = new Ambience(this.audio);
  readonly journal = new Journal();
  readonly synthetic: SyntheticDriver;
  readonly engine: FableEngine;
  private demo: DemoDirector | null = null;
  private xrHands = new XRHandReader();
  private debugOverlay: DebugOverlay | null = null;
  private started = false;
  private inXR = false;
  paused = false;
  hands: HandsFrame = { left: null, right: null, time: 0 };
  state: RecognizerState | null = null;
  /** Game clock (ms); synthetic poses blend on this clock. */
  now = 0;
  /** Where the active hand's shadow is on the wall (wall-local metres). */
  readonly handTarget = new Vector2();
  private hasTarget = false;
  private lightPos = new Vector3();
  private anchor = new Vector3();
  private wallPos = new Vector3();
  private aliveSince: Partial<Record<CreatureId, number>> = {};
  private barkCount = 0;
  private lastHandsSeen = -1e9;
  private chimeIndex = 0;
  private runId = 0;

  constructor(readonly world: World, readonly mode: GameMode, readonly flags: GameFlags) {
    Lantern.configureRenderer(world.renderer);
    world.scene.add(this.stage.group, this.handShadows.group, this.menu.group);
    this.wall.content.add(
      this.scenery.group,
      this.creatures.group,
      this.fireflies.group,
      this.ghost.mesh,
      this.subtitles.mesh,
      this.journalView.mesh,
    );
    this.creatures.group.add(this.owl.mesh);
    if (mode !== 'ar') {
      world.scene.add(buildCozyRoom());
      world.scene.background = new Color('#0a0604');
    }
    this.stage.placeAt(new Vector3(0, LAYOUT.defaultHeadHeight, 0), new Vector3(0, 0, -1));
    this.synthetic = new SyntheticDriver(this.poseStage());
    this.handShadows.setDebugVisible(flags.debug);
    this.wall.setBrightness(0.15);
    if (flags.debug) this.debugOverlay = new DebugOverlay();

    this.engine = new FableEngine(this.host());
    if (flags.demo) this.demo = new DemoDirector(this.engine, this.synthetic, this.subtitles);

    bindKeyboard(
      {
        pose: (name) => this.injectPose(name),
        steer: (x, y) => this.synthetic.steer(x, y),
        togglePause: () => (this.paused ? this.resume() : this.pause('Paused')),
        journal: () => this.toggleJournal(),
        recenter: () => this.recenter(),
        skip: () => this.engine.skip(),
      },
      flags.debug,
    );
    this.bindPointer();
    this.bindVisibility();
  }

  // --- Setup helpers -----------------------------------------------------------

  /** Stage description for synthetic poses, derived from the placed stage. */
  poseStage() {
    return {
      center: this.stage.handZoneTuple(),
      forward: this.stage.forwardTuple(),
      up: [0, 1, 0] as [number, number, number],
    };
  }

  private host(): FableHost {
    return {
      clock: this.clock,
      subtitles: this.subtitles,
      scenery: this.scenery,
      creatures: this.creatures,
      fireflies: this.fireflies,
      owl: this.owl,
      cue: (c) => this.cue(c),
      ghost: (pose, strength) => this.showGhost(pose, strength),
      handsVisible: () => this.now - this.lastHandsSeen < 500,
      aliveFor: (id) => {
        const since = this.aliveSince[id];
        const p = this.creatures.all[id];
        return since !== undefined && p.alive ? this.clock.now - since : 0;
      },
      barks: () => this.barkCount,
      onFableComplete: (f) => {
        this.journal.complete(f.id);
        this.subtitles.setPrompt('Pinch the lantern to open your Shadow Journal.');
      },
      onCreatureMet: (id) => {
        this.journal.meet(id);
      },
      onPhase: () => {},
    };
  }

  private showGhost(pose: PoseName | null, strength: number): void {
    if (!pose || strength <= 0) {
      this.ghost.hide();
      return;
    }
    this.lantern.light.getWorldPosition(this.lightPos);
    this.ghost.show(makePose(pose, this.poseStage()), this.lightPos, strength);
  }

  private cue(c: Cue): void {
    switch (c) {
      case 'chime':
        this.sfx.chime(this.chimeIndex++);
        break;
      case 'pageTurn':
        this.sfx.pageTurn();
        break;
      case 'success':
        this.sfx.success();
        this.lantern.flash(0.8);
        break;
      case 'owlHoot':
        this.sfx.owlHoot();
        break;
      case 'owlFlap':
        this.sfx.owlFlap();
        break;
      case 'splash':
        this.sfx.splash();
        break;
      case 'dig':
        this.sfx.dig();
        break;
      case 'glow':
        this.sfx.glow();
        break;
      case 'swell':
        this.sfx.swell();
        this.ambience.swell();
        break;
    }
  }

  private bindPointer(): void {
    const canvas = this.world.renderer.domElement;
    const ray = new Raycaster();
    canvas.addEventListener('click', (e) => {
      if (!this.menu.isOpen) return;
      const r = canvas.getBoundingClientRect();
      const ndc = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.world.camera);
      const hit = ray.intersectObject(this.menu.mesh)[0];
      if (hit?.uv) {
        const action = this.menu.actionAtUv(hit.uv.y);
        if (action) this.onMenu(action);
      }
    });
  }

  private bindVisibility(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.started) this.pause('Welcome back');
    });
  }

  // --- Lifecycle -------------------------------------------------------------------

  injectPose(name: PoseName): void {
    this.synthetic.setPose(name, this.now);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    document.getElementById('intro')?.classList.add('hidden');
    // Audio needs a user gesture. Demo mode auto-starts, so it unlocks on the first click/key.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!activation || activation.hasBeenActive) this.audio.unlock();
    const unlock = () => {
      this.audio.unlock();
      this.ambience.start();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    if (this.mode !== 'desktop') this.world.launchXR();
    this.journal.startNight();
    // In XR, wait one beat for the head pose before lighting (recenter happens on session start).
    const delay = this.mode === 'desktop' ? 150 : 600;
    void this.clock.wait(delay).then(() => this.lightUp());
  }

  private lightUp(): void {
    this.lantern.ignite();
    this.wall.setBrightness(1);
    this.sfx.ignite();
    this.ambience.start();
    void this.runFable(true);
  }

  private async runFable(withOnboarding: boolean): Promise<void> {
    const id = ++this.runId;
    if (this.journal.isReturning && withOnboarding) {
      this.subtitles.say('Welcome back. The lantern remembers you.');
    }
    await this.engine.play(fireflyFable, withOnboarding);
    if (id === this.runId) this.journal.markOnboarded();
  }

  restart(): void {
    this.clock.cancel();
    this.engine.reset();
    this.creatures.dismissAll();
    this.owl.hide();
    this.fireflies.lumiVisible = false;
    this.fireflies.lumiGlow = 0.15;
    this.fireflies.carriedBy = null;
    this.fireflies.setSwarm(0);
    this.ghost.hide();
    this.subtitles.say('');
    this.subtitles.setPrompt('');
    this.journalView.close();
    this.resume();
    void this.runFable(false);
  }

  pause(title = 'Paused'): void {
    if (!this.started) return;
    if (!this.paused) {
      this.paused = true;
      this.audio.setPaused(true);
      this.lantern.dim(0.55);
    }
    if (this.inXR) this.menu.open(this.world.camera, title);
    else this.menu.open(this.world.camera, title, 0.42, 0.0);
    this.sfx.click();
  }

  resume(): void {
    this.paused = false;
    this.menu.close();
    this.audio.setPaused(false);
    this.audio.setSuspended(false);
    this.lantern.ignite();
    this.recognizer.reset();
  }

  toggleJournal(): void {
    if (this.journalView.isOpen) {
      this.journalView.close();
    } else {
      this.journalView.open(this.journal.data);
    }
    this.sfx.pageTurn();
  }

  recenter(): void {
    if (this.inXR) this.stage.recenter(this.world.camera);
    this.synthetic.stage = this.poseStage();
  }

  private onMenu(action: MenuAction): void {
    this.sfx.click();
    switch (action) {
      case 'resume':
        this.resume();
        break;
      case 'restart':
        this.restart();
        break;
      case 'journal':
        this.resume();
        if (!this.journalView.isOpen) this.toggleJournal();
        break;
      case 'recenter':
        this.recenter();
        this.resume();
        break;
    }
  }

  // --- Per frame -------------------------------------------------------------------

  private readHands(now: number, dt: number): HandsFrame {
    const frame = this.world.renderer.xr.getFrame?.() as XRFrame | undefined;
    const ref = this.world.renderer.xr.getReferenceSpace();
    if (this.inXR && frame && ref) {
      this.world.player.updateMatrixWorld();
      const real = this.xrHands.read(frame, ref, this.world.player.matrixWorld, now);
      // In debug/demo mode, scripted poses take over when no real hands are tracked.
      if (real.left || real.right || !(this.flags.debug || this.flags.demo)) return real;
    }
    return this.synthetic.frame(now, dt);
  }

  private fingertips(): Vec3[] {
    const tips: Vec3[] = [];
    for (const h of [this.hands.left, this.hands.right]) if (h) tips.push(h.joints[J.indexTip]);
    return tips;
  }

  tick(dtMs: number, now: number): void {
    this.now = now;
    dtMs = Math.min(dtMs, 100);
    const inXR = !!this.world.session;
    if (inXR !== this.inXR) {
      this.inXR = inXR;
      if (inXR) requestAnimationFrame(() => this.recenter());
    }
    // Session hidden (Quest system menu / headset off): pause and silence.
    const vis = this.world.visibilityState.value as string;
    const hidden = inXR && vis !== 'visible';
    this.audio.setSuspended(hidden && vis === 'hidden');
    if (hidden && !this.paused && this.started) this.pause('Welcome back');

    this.hands = this.readHands(now, dtMs);
    if (this.hands.left || this.hands.right) this.lastHandsSeen = now;
    this.handShadows.update(this.hands.left, this.hands.right);

    // Menu poking works while paused.
    const action = this.menu.update(dtMs, this.fingertips());
    if (action) this.onMenu(action);

    if (!this.paused) {
      this.clock.tick(dtMs);
      this.updatePlay(dtMs);
      this.demo?.update(now);
    } else {
      // Keep the palm-up gesture responsive (so a second palm-up does nothing odd).
      this.recognizer.update(this.hands);
    }

    this.lantern.update(dtMs, now);
    this.wall.update(dtMs);
    this.scenery.update(dtMs);
    this.subtitles.update(dtMs);
    this.ghost.update(dtMs);
    this.journalView.update(dtMs);
    this.fireflies.update(this.paused ? 0 : dtMs);
    this.owl.update(this.paused ? 0 : dtMs);
    this.ambience.update();
    this.wall.group.getWorldPosition(this.wallPos);
    this.audio.updateSpatial(this.wallPos, this.world.camera);
    this.debugOverlay?.update(now, this.state, `${this.mode}${this.inXR ? ' · in XR' : ''} · ${this.engine.phase}${this.paused ? ' · PAUSED' : ''}`);
  }

  private updatePlay(dtMs: number): void {
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

    // Lantern glows when a fingertip comes close (it can be pinched).
    let near = 1;
    const lp = this.lantern.worldPosition();
    for (const t of this.fingertips()) near = Math.min(near, lp.distanceTo(new Vector3(t[0], t[1], t[2])));
    this.lantern.hover = Math.max(0, Math.min(1, (0.15 - near) / 0.08));

    this.creatures.update(dtMs, {
      target: this.hasTarget ? this.handTarget : null,
      flap: state.flap,
      jaw: state.jaw,
    });
    const bound = this.creatures.active?.alive;
    this.wall.setHandShadowOpacity(bound ? SHADOW.handOpacityWithCreature : SHADOW.handOpacity);
  }

  private onEvent(e: RecognizerEvent): void {
    switch (e.type) {
      case 'confirm': {
        const at = this.hasTarget ? this.handTarget.clone() : new Vector2(0, 0);
        const p = this.creatures.summon(e.creature, at);
        if (e.creature === 'dog') {
          this.creatures.dog.autoJaw = e.variant === 'oneHanded';
          this.barkCount = 0;
        }
        if (p.id !== 'bird' && !this.creatures.isHeld(p)) p.goal.set(at.x, p.groundY);
        this.aliveSince[e.creature] = this.clock.now;
        this.lantern.flash(0.5);
        this.sfx.chime(this.chimeIndex++);
        this.sfx.creature(e.creature);
        if (this.journal.meet(e.creature) && this.engine.phase !== 'onboarding') {
          this.subtitles.setPrompt(`New in your journal: the ${e.creature}!`);
        }
        break;
      }
      case 'release':
        delete this.aliveSince[e.creature];
        this.creatures.release(e.creature);
        break;
      case 'bark':
        this.barkCount++;
        this.creatures.dog.bark();
        this.sfx.bark();
        break;
      case 'palmUp':
        // Don't hijack the dog or bird; only when no creature is bound.
        if (!this.creatures.active?.alive) this.pause('Paused');
        break;
      case 'pinch': {
        const lp = this.lantern.worldPosition();
        if (lp.distanceTo(new Vector3(e.at[0], e.at[1], e.at[2])) < LANTERN_TAP) {
          this.lantern.flash(0.4);
          this.toggleJournal();
        }
        break;
      }
      default:
        break;
    }
  }

  /** Creatures the player has met (for tests and the debug overlay). */
  get met(): CreatureId[] {
    return CREATURES.filter((c) => this.journal.data.creatures.includes(c));
  }
}
