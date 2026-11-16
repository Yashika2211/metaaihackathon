import type { FableEngine } from '../fable/engine';

/**
 * ?video=1 — title card, lower-third captions and an end card layered over the
 * demo, so the auto-played fable can be recorded straight into a submission video.
 */
export class VideoCaptions {
  private root: HTMLElement;
  private caption: HTMLElement;
  private title: HTMLElement;
  private end: HTMLElement;
  private current = '';
  private startedAt = -1;

  constructor(private engine: FableEngine) {
    this.root = document.getElementById('video-layer')!;
    this.root.style.display = 'block';
    this.caption = document.getElementById('video-caption')!;
    this.title = document.getElementById('video-title')!;
    this.end = document.getElementById('video-end')!;
  }

  private set(text: string): void {
    if (text === this.current) return;
    this.current = text;
    this.caption.classList.remove('show');
    if (!text) return;
    window.setTimeout(() => {
      this.caption.textContent = text;
      this.caption.classList.add('show');
    }, 250);
  }

  showEnd(): void {
    this.set('');
    this.end.classList.add('show');
  }

  update(now: number, extra: { showcase: boolean; journal: boolean }): void {
    if (this.startedAt < 0) this.startedAt = now;
    const t = now - this.startedAt;
    this.title.classList.toggle('show', t < 4200);
    if (extra.journal) return this.set('Shadow Journal: pinch the lantern. Every creature you meet is remembered.');
    if (extra.showcase) return this.set('Accessibility: every creature also has a one-handed pose.');
    const e = this.engine;
    if (e.phase === 'onboarding') {
      return this.set(t < 4200 ? '' : 'Raise a hand into the lantern light. A ghost hand shows the shape to make.');
    }
    if (e.phase === 'story') {
      switch (e.currentBeat?.id) {
        case 'river':
          return this.set('Bird: hook your thumbs together, then wiggle your fingers to flap.');
        case 'fence':
          return this.set('Rabbit: two fingers up for ears. Move your hand to guide it.');
        case 'owl':
          return this.set('Dog: drop your pinky to open the jaw, snap it shut to bark.');
        case 'roots':
          return this.set('Snail: two fingers held level, like antennae.');
        default:
          return this.set('Make the shape, hold it a heartbeat, and the shadow comes alive.');
      }
    }
    if (e.phase === 'ending') return this.set('');
    this.set('');
  }
}
