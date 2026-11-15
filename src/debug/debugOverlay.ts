import { CREATURES } from '../recognizer/creatures';
import type { HandFeatures } from '../recognizer/features';
import type { RecognizerState } from '../recognizer/recognizer';

const bar = (v: number, width = 10): string => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * width);
  return '█'.repeat(n) + '·'.repeat(width - n);
};

const f2 = (v: number) => (v >= 0 ? ' ' : '') + v.toFixed(2);

function handLines(label: string, f: HandFeatures | null): string[] {
  if (!f) return [`${label}: not tracked`];
  const c = f.curl;
  return [
    `${label}: curl T${f2(c.thumb)} I${f2(c.index)} M${f2(c.middle)} R${f2(c.ring)} P${f2(c.pinky)}`,
    `   spread ${f2(f.spread)} jaw ${f2(f.jawAngle)} palm→wall ${f2(f.palmFacing)} palm↑ ${f2(f.palmUp)}`,
    `   point↑ ${f2(f.pointUp)} point→ ${f2(f.pointForward)} thumb↑ ${f2(f.thumbUp)} pinch ${(f.pinchDistance * 100).toFixed(1)}cm`,
  ];
}

/** On-screen recognizer readout for ?debug=1 (desktop and Quest 2D view). */
export class DebugOverlay {
  private el: HTMLElement;
  private frames = 0;
  private fpsTime = 0;
  private fps = 0;
  private lastDraw = 0;
  extra = '';

  constructor() {
    this.el = document.getElementById('debug')!;
    this.el.style.display = 'block';
  }

  update(now: number, state: RecognizerState | null, info: string): void {
    this.frames++;
    if (now - this.fpsTime > 1000) {
      this.fps = (this.frames * 1000) / (now - this.fpsTime);
      this.frames = 0;
      this.fpsTime = now;
    }
    if (now - this.lastDraw < 100) return;
    this.lastDraw = now;
    const lines = [`SHADOWFOLK debug · ${this.fps.toFixed(0)} fps · ${info}`];
    if (state) {
      lines.push(
        `pose: ${state.confirmed ?? '—'}${state.variant ? ` (${state.variant})` : ''}   candidate: ${state.candidate ?? '—'} ${bar(state.holdProgress)}   hands: ${state.hands ?? '—'}`,
      );
      lines.push(CREATURES.map((c) => `${c.padEnd(6)} ${bar(state.scores[c], 8)} ${state.scores[c].toFixed(2)}`).join('   '));
      lines.push(`flap ${bar(state.flap, 6)}  jaw ${bar(state.jaw, 6)}`);
      lines.push(...handLines('L', state.left), ...handLines('R', state.right));
    }
    lines.push('keys: 1 rabbit 2 bird 3 dog 4 snail 5 palm-up 0 relax · shift+1-4 one-handed · B bark · arrows move · P pause · J journal · R recenter · N skip');
    if (this.extra) lines.push(this.extra);
    this.el.textContent = lines.join('\n');
  }
}
