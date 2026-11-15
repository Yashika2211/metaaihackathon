import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { FABLE } from '../config/tuning';
import { createCanvasTex } from '../render/canvasTexture';
import { WALL_LAYER } from '../render/shadowWall';

const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

/**
 * Narration written onto the top of the wall in ink, revealed a few
 * characters at a time like a storyteller speaking. A smaller "prompt" line
 * (e.g. "Who could carry her over?") sits underneath.
 */
export class Subtitles {
  readonly mesh: Mesh;
  private tex = createCanvasTex(1024, 180);
  private mat: MeshBasicMaterial;
  private text = '';
  private prompt = '';
  private shown = 0;
  private lastDrawn = -1;
  private lastPrompt = '';
  private opacity = 0;
  private opacityTarget = 0;

  constructor(wallW: number, wallH: number) {
    this.mat = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0 });
    const w = wallW * 0.9;
    this.mesh = new Mesh(new PlaneGeometry(w, (w * 180) / 1024), this.mat);
    this.mesh.position.set(0, wallH / 2 - (w * 180) / 1024 / 2 - 0.012, WALL_LAYER.text);
    this.mesh.renderOrder = 9;
  }

  /** Show a narration line (replaces the previous one). */
  say(text: string): void {
    this.text = text;
    this.shown = 0;
    this.lastDrawn = -1;
    this.opacityTarget = 1;
  }

  setPrompt(prompt: string): void {
    this.prompt = prompt;
    this.opacityTarget = 1;
  }

  clear(): void {
    this.opacityTarget = 0;
  }

  /** True once the current line has been fully revealed. */
  get done(): boolean {
    return this.shown >= this.text.length;
  }

  /** Approximate reading time for a line, ms. */
  static readingTime(text: string): number {
    return 1400 + (text.length / FABLE.narrationCps) * 1000 + text.split(' ').length * 140;
  }

  update(dtMs: number): void {
    this.shown = Math.min(this.text.length, this.shown + (dtMs / 1000) * FABLE.narrationCps);
    this.opacity += (this.opacityTarget - this.opacity) * Math.min(1, dtMs / 300);
    this.mat.opacity = this.opacity;
    this.mesh.visible = this.opacity > 0.01;
    const n = Math.floor(this.shown);
    if (n === this.lastDrawn && this.prompt === this.lastPrompt) return;
    if (this.opacityTarget === 0 && this.opacity < 0.02) return;
    this.lastDrawn = n;
    this.lastPrompt = this.prompt;
    this.draw(this.text.slice(0, n));
  }

  private draw(visible: string): void {
    const { ctx, width, height } = this.tex;
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30,14,5,0.92)';
    ctx.shadowColor = 'rgba(255,235,190,0.6)';
    ctx.shadowBlur = 6;
    ctx.font = `italic 44px ${FONT}`;
    const lines = wrap(ctx, visible, width - 80);
    const lh = 50;
    const top = this.prompt ? 52 - (lines.length - 1) * lh * 0.5 : height / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, width / 2, top + i * lh));
    if (this.prompt && this.done) {
      ctx.font = `600 38px ${FONT}`;
      ctx.fillStyle = 'rgba(70,30,8,0.95)';
      ctx.fillText(this.prompt, width / 2, height - 34);
    }
    ctx.shadowBlur = 0;
    this.tex.commit();
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}
