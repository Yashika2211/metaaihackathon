import type { CreatureId } from '../recognizer/creatures';
import type { AudioEngine } from './audioEngine';

type Dest = 'wall' | 'ui';

/** Synthesized sound effects. Each is a few oscillators with envelopes. */
export class Sfx {
  constructor(private audio: AudioEngine) {}

  private out(dest: Dest): AudioNode | null {
    if (!this.audio.ctx) return null;
    return dest === 'wall' ? this.audio.wallBus : this.audio.uiBus;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; dest?: Dest; slideTo?: number; attack?: number } = {}): void {
    const c = this.audio.ctx;
    const out = this.out(opts.dest ?? 'wall');
    if (!c || !out) return;
    const t = c.currentTime + (opts.at ?? 0);
    const o = c.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const g = c.createGain();
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, filterFreq: number, opts: { gain?: number; at?: number; q?: number; type?: BiquadFilterType; dest?: Dest; sweepTo?: number } = {}): void {
    const c = this.audio.ctx;
    const out = this.out(opts.dest ?? 'wall');
    const buf = this.audio.noiseBuffer();
    if (!c || !out || !buf) return;
    const t = c.currentTime + (opts.at ?? 0);
    const n = c.createBufferSource();
    n.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(filterFreq, t);
    if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(out);
    n.start(t, Math.random());
    n.stop(t + dur + 0.05);
  }

  /** Soft bell when a pose is confirmed: a pentatonic pair with shimmer. */
  chime(pitch = 0): void {
    const base = [523.25, 587.33, 659.25, 783.99, 880][pitch % 5];
    this.tone(base, 1.6, { gain: 0.18, dest: 'ui', type: 'sine' });
    this.tone(base * 2, 1.0, { gain: 0.06, dest: 'ui', at: 0.01 });
    this.tone(base * 1.5, 1.4, { gain: 0.08, dest: 'ui', at: 0.09 });
  }

  /** Each creature's voice. */
  creature(id: CreatureId): void {
    switch (id) {
      case 'rabbit':
        this.hop();
        break;
      case 'bird':
        this.chirp();
        break;
      case 'dog':
        this.bark();
        break;
      case 'snail':
        this.slurp();
        break;
    }
  }

  hop(): void {
    this.tone(220, 0.12, { slideTo: 440, gain: 0.18, type: 'triangle' });
    this.noiseBurst(0.08, 900, { gain: 0.06, at: 0.1 });
  }

  chirp(): void {
    for (let i = 0; i < 3; i++) this.tone(2400 + i * 200, 0.08, { slideTo: 3600, gain: 0.1, at: i * 0.11 });
  }

  bark(): void {
    // A short formant-y "woof": a pitched saw drop through a band-pass, plus breath.
    const c = this.audio.ctx;
    const out = this.out('wall');
    if (!c || !out) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.16);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.16);
    f.Q.value = 2.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.25);
    this.noiseBurst(0.12, 1200, { gain: 0.12, q: 0.8 });
  }

  slurp(): void {
    this.tone(180, 0.35, { slideTo: 120, gain: 0.08, type: 'sine', attack: 0.08 });
    this.noiseBurst(0.3, 600, { gain: 0.04, sweepTo: 300 });
  }

  success(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.2, { gain: 0.12, at: i * 0.09, dest: 'ui' }));
  }

  pageTurn(): void {
    this.noiseBurst(0.35, 2500, { gain: 0.08, sweepTo: 900, q: 0.6, dest: 'ui' });
  }

  owlHoot(): void {
    this.tone(330, 0.25, { gain: 0.16, slideTo: 300, attack: 0.05 });
    this.tone(320, 0.55, { gain: 0.18, slideTo: 280, at: 0.32, attack: 0.08 });
  }

  owlFlap(): void {
    for (let i = 0; i < 5; i++) this.noiseBurst(0.12, 500, { gain: 0.12, at: i * 0.13, q: 0.7 });
  }

  splash(): void {
    this.noiseBurst(0.6, 1800, { gain: 0.08, sweepTo: 400, q: 0.5 });
  }

  dig(): void {
    for (let i = 0; i < 6; i++) this.noiseBurst(0.07, 1400 + Math.random() * 600, { gain: 0.1, at: i * 0.2, q: 1.5 });
  }

  glow(): void {
    this.tone(880, 2, { gain: 0.07, attack: 0.6, dest: 'ui' });
    this.tone(1318.5, 2, { gain: 0.05, attack: 0.8, at: 0.2, dest: 'ui' });
  }

  /** The ending: a rising major chord bloom. */
  swell(): void {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone(f, 5, { gain: 0.07, at: i * 0.25, attack: 1.2, dest: 'ui', type: i % 2 ? 'triangle' : 'sine' }),
    );
  }

  /** The lantern catching light. */
  ignite(): void {
    this.noiseBurst(0.5, 3000, { gain: 0.08, sweepTo: 700, dest: 'ui', type: 'highpass' });
    this.tone(196, 1.5, { gain: 0.08, attack: 0.4, dest: 'ui' });
  }

  click(): void {
    this.tone(1200, 0.05, { gain: 0.08, dest: 'ui', type: 'triangle' });
  }
}
