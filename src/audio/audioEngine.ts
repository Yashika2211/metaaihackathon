import type { Object3D, Vector3 } from 'three';
import { Vector3 as V3 } from 'three';
import { AUDIO } from '../config/tuning';

/**
 * Owns the AudioContext, a master bus, an ambience bus and a spatial bus whose
 * panner sits on the shadow wall, so creature sounds come from the story.
 * Everything is synthesized; there are no audio files.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  ambienceBus!: GainNode;
  /** Sounds that come from the wall. */
  wallBus!: GainNode;
  /** Non-spatial UI sounds. */
  uiBus!: GainNode;
  private panner!: PannerNode;
  private noise: AudioBuffer | null = null;
  private fwd = new V3();
  private upv = new V3();
  private pos = new V3();
  private muted = false;

  /** Must be called from a user gesture (the start button). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
    } catch {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = AUDIO.master;
    // Gentle limiter so swells never clip.
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);

    this.ambienceBus = c.createGain();
    this.ambienceBus.gain.value = AUDIO.ambience;
    this.ambienceBus.connect(this.master);

    this.panner = c.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 0.6;
    this.panner.rolloffFactor = 0.6;
    this.wallBus = c.createGain();
    this.wallBus.gain.value = AUDIO.sfx;
    this.wallBus.connect(this.panner).connect(this.master);

    this.uiBus = c.createGain();
    this.uiBus.gain.value = AUDIO.sfx * 0.8;
    this.uiBus.connect(this.master);
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state !== 'closed';
  }

  /** A shared 2-second white-noise buffer. */
  noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noise) {
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /** Place the wall emitter and the listener (call every frame). */
  updateSpatial(wallWorld: Vector3, head: Object3D): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const p = this.panner;
    if (p.positionX) {
      p.positionX.setTargetAtTime(wallWorld.x, t, 0.05);
      p.positionY.setTargetAtTime(wallWorld.y, t, 0.05);
      p.positionZ.setTargetAtTime(wallWorld.z, t, 0.05);
    } else {
      p.setPosition(wallWorld.x, wallWorld.y, wallWorld.z);
    }
    head.getWorldPosition(this.pos);
    head.getWorldDirection(this.fwd).negate(); // camera looks down -Z
    this.upv.set(0, 1, 0).applyQuaternion(head.quaternion);
    const l = c.listener;
    if (l.positionX) {
      l.positionX.setTargetAtTime(this.pos.x, t, 0.05);
      l.positionY.setTargetAtTime(this.pos.y, t, 0.05);
      l.positionZ.setTargetAtTime(this.pos.z, t, 0.05);
      l.forwardX.setTargetAtTime(this.fwd.x, t, 0.05);
      l.forwardY.setTargetAtTime(this.fwd.y, t, 0.05);
      l.forwardZ.setTargetAtTime(this.fwd.z, t, 0.05);
      l.upX.setTargetAtTime(this.upv.x, t, 0.05);
      l.upY.setTargetAtTime(this.upv.y, t, 0.05);
      l.upZ.setTargetAtTime(this.upv.z, t, 0.05);
    } else {
      l.setPosition(this.pos.x, this.pos.y, this.pos.z);
      l.setOrientation(this.fwd.x, this.fwd.y, this.fwd.z, this.upv.x, this.upv.y, this.upv.z);
    }
  }

  /** Pause: duck everything smoothly (the context keeps running for UI sounds). */
  setPaused(paused: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambienceBus.gain.setTargetAtTime(paused ? AUDIO.ambience * 0.25 : AUDIO.ambience, t, 0.3);
    this.wallBus.gain.setTargetAtTime(paused ? 0 : AUDIO.sfx, t, 0.1);
  }

  /** Session hidden (system menu, headset off): suspend the context entirely. */
  setSuspended(suspended: boolean): void {
    if (!this.ctx || this.muted === suspended) return;
    this.muted = suspended;
    void (suspended ? this.ctx.suspend() : this.ctx.resume());
  }
}
