import type { AudioEngine } from './audioEngine';

/**
 * A warm night: a low, slowly breathing drone (two detuned voices through a
 * soft low-pass), a hush of wind, and crickets that chirp in little trills.
 */
export class Ambience {
  private started = false;
  private nextCricket = 0;
  private droneGain: GainNode | null = null;

  constructor(private audio: AudioEngine) {}

  start(): void {
    const c = this.audio.ctx;
    if (!c || this.started) return;
    this.started = true;
    const t = c.currentTime;

    // Drone.
    const drone = c.createGain();
    drone.gain.value = 0;
    drone.gain.setTargetAtTime(0.5, t, 3);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.6;
    drone.connect(lp).connect(this.audio.ambienceBus);
    for (const [f, type, g] of [
      [110, 'triangle', 0.35],
      [110.6, 'triangle', 0.3],
      [164.8, 'sine', 0.18],
      [55, 'sine', 0.4],
    ] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og).connect(drone);
      o.start(t);
    }
    // Breathing LFO on the filter.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start(t);
    this.droneGain = drone;

    // Wind: filtered noise, very quiet.
    const buf = this.audio.noiseBuffer();
    if (buf) {
      const n = c.createBufferSource();
      n.buffer = buf;
      n.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.4;
      const ng = c.createGain();
      ng.gain.value = 0.06;
      const wlfo = c.createOscillator();
      wlfo.frequency.value = 0.11;
      const wlg = c.createGain();
      wlg.gain.value = 0.04;
      wlfo.connect(wlg).connect(ng.gain);
      wlfo.start(t);
      n.connect(bp).connect(ng).connect(this.audio.ambienceBus);
      n.start(t);
    }
    this.nextCricket = t + 1.5;
  }

  /** Brighten the drone for the ending. */
  swell(): void {
    const c = this.audio.ctx;
    if (!c || !this.droneGain) return;
    this.droneGain.gain.setTargetAtTime(0.85, c.currentTime, 1.5);
  }

  /** Schedule crickets; call every frame. */
  update(): void {
    const c = this.audio.ctx;
    if (!c || !this.started || c.state !== 'running') return;
    while (this.nextCricket < c.currentTime + 0.2) {
      this.cricket(this.nextCricket);
      this.nextCricket += 0.6 + Math.random() * 2.2;
    }
  }

  private cricket(at: number): void {
    const c = this.audio.ctx!;
    const pan = c.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const out = c.createGain();
    out.gain.value = 0.05 + Math.random() * 0.05;
    out.connect(pan).connect(this.audio.ambienceBus);
    const freq = 4200 + Math.random() * 900;
    const pulses = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < pulses; i++) {
      const t0 = at + i * 0.055;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(1, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + 0.05);
    }
  }
}
