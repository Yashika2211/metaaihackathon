import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { COMING_SOON, FABLES } from '../fable/fireflyFable';
import { CREATURE_INFO, CREATURES } from '../recognizer/creatures';
import { createCanvasTex } from '../render/canvasTexture';
import { WALL_LAYER } from '../render/shadowWall';
import { Journal, type JournalData } from '../save/journal';

const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const INK = 'rgba(30,14,5,0.95)';

/**
 * The Shadow Journal page, written onto the wall: creatures you have met (with
 * both ways to make them), fables finished, nights visited and tonight's teaser.
 * Opened by pinch-tapping the lantern; pinch it again (or palm-up → Resume) to close.
 */
export class JournalView {
  readonly mesh: Mesh;
  private tex = createCanvasTex(1280, 836);
  private mat: MeshBasicMaterial;
  private level = 0;
  isOpen = false;

  constructor(wallW: number, wallH: number) {
    this.mat = new MeshBasicMaterial({ map: this.tex.texture, transparent: true, depthWrite: false, opacity: 0 });
    this.mesh = new Mesh(new PlaneGeometry(wallW * 0.96, wallH * 0.94), this.mat);
    this.mesh.position.z = WALL_LAYER.text + 0.002;
    this.mesh.renderOrder = 12;
    this.mesh.visible = false;
  }

  open(data: JournalData): void {
    this.draw(data);
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  update(dtMs: number): void {
    this.level += ((this.isOpen ? 1 : 0) - this.level) * Math.min(1, dtMs / 250);
    this.mat.opacity = this.level;
    this.mesh.visible = this.level > 0.01;
  }

  private draw(data: JournalData): void {
    const { ctx, width, height } = this.tex;
    ctx.clearRect(0, 0, width, height);
    // Page.
    const g = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
    g.addColorStop(0, 'rgba(255,243,214,0.97)');
    g.addColorStop(1, 'rgba(226,190,130,0.97)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = `italic 64px ${FONT}`;
    ctx.fillText('Shadow Journal', width / 2, 92);
    ctx.font = `28px ${FONT}`;
    const nights = data.nights === 1 ? '1 night by the lantern' : `${data.nights} nights by the lantern`;
    ctx.fillText(`${nights} · ${data.creatures.length} of ${CREATURES.length} creatures met`, width / 2, 136);

    // Creatures.
    ctx.textAlign = 'left';
    const colW = (width - 120) / 2;
    CREATURES.forEach((id, i) => {
      const info = CREATURE_INFO[id];
      const met = data.creatures.includes(id);
      const x = 60 + (i % 2) * colW;
      const y = 196 + Math.floor(i / 2) * 200;
      ctx.globalAlpha = met ? 1 : 0.45;
      ctx.font = `bold 36px ${FONT}`;
      ctx.fillText(met ? info.name : `${info.name} (not yet met)`, x, y);
      ctx.font = `24px ${FONT}`;
      wrapText(ctx, `Classic: ${info.classic}`, x, y + 34, colW - 30, 28, 3);
      ctx.font = `italic 24px ${FONT}`;
      wrapText(ctx, `One hand: ${info.oneHanded}`, x, y + 34 + 28 * 3 + 4, colW - 30, 28, 2);
      ctx.globalAlpha = 1;
    });

    // Fables.
    ctx.textAlign = 'center';
    const done = FABLES.filter((f) => data.fablesCompleted.includes(f.id)).map((f) => f.title);
    ctx.font = `30px ${FONT}`;
    ctx.fillText(done.length ? `Fables told: ${done.join(', ')}` : 'No fables finished yet. The firefly is waiting.', width / 2, height - 150);
    const tonight = COMING_SOON[Journal.teaserIndex(COMING_SOON.length)];
    ctx.font = `italic 30px ${FONT}`;
    ctx.fillText(`Tonight's fable: “${tonight.title}” — ${tonight.teaser}`, width / 2, height - 104);
    ctx.font = `24px ${FONT}`;
    ctx.globalAlpha = 0.7;
    ctx.fillText('Pinch the lantern to close · Palm up for the menu', width / 2, height - 52);
    ctx.globalAlpha = 1;
    this.tex.commit();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number): void {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + n * lh);
      n++;
      line = w;
      if (n >= maxLines) return;
    } else {
      line = test;
    }
  }
  if (line && n < maxLines) ctx.fillText(line, x, y + n * lh);
}
