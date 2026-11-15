import { seeded } from '../render/canvasTexture';

/** Story scenes painted as shadow-theatre backdrops. */
export type SceneId = 'forest' | 'river' | 'fence' | 'oak' | 'roots' | 'meadow';

const INK = 'rgba(24,12,5,0.94)';
const FAR = 'rgba(60,32,14,0.35)';

export const GROUND_Y = -0.19;

type Ctx = CanvasRenderingContext2D;

function pine(ctx: Ctx, x: number, base: number, h: number, w: number, color = INK): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const y0 = base + h * 0.12 + (h * 0.8 * i) / tiers;
    const ww = w * (1 - i / (tiers + 0.6));
    ctx.moveTo(x - ww / 2, y0);
    ctx.lineTo(x, y0 + h * 0.38);
    ctx.lineTo(x + ww / 2, y0);
  }
  ctx.fill();
  ctx.fillRect(x - w * 0.05, base, w * 0.1, h * 0.2);
}

function ground(ctx: Ctx, rand: () => number, from = -0.5, to = 0.5): void {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(from, -0.4);
  ctx.lineTo(from, GROUND_Y);
  for (let x = from; x <= to; x += 0.01) {
    ctx.lineTo(x, GROUND_Y + Math.sin(x * 19) * 0.003 + (rand() - 0.5) * 0.002);
  }
  ctx.lineTo(to, -0.4);
  ctx.fill();
  // Grass tufts.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.0025;
  for (let x = from; x < to; x += 0.012 + rand() * 0.01) {
    const h = 0.006 + rand() * 0.014;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.quadraticCurveTo(x + 0.002, GROUND_Y + h * 0.6, x + (rand() - 0.5) * 0.008, GROUND_Y + h);
    ctx.stroke();
  }
}

function moon(ctx: Ctx, x: number, y: number, r: number, glow = 0.5): void {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
  g.addColorStop(0, `rgba(255,250,225,${glow})`);
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ctx.strokeStyle = 'rgba(40,20,8,0.45)';
  ctx.lineWidth = 0.002;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function farHills(ctx: Ctx, rand: () => number): void {
  ctx.fillStyle = FAR;
  ctx.beginPath();
  ctx.moveTo(-0.5, GROUND_Y);
  for (let x = -0.5; x <= 0.5; x += 0.02) ctx.lineTo(x, GROUND_Y + 0.05 + Math.sin(x * 6 + 1) * 0.025 + rand() * 0.004);
  ctx.lineTo(0.5, GROUND_Y);
  ctx.fill();
  for (let i = 0; i < 9; i++) pine(ctx, -0.45 + i * 0.11 + rand() * 0.03, GROUND_Y + 0.03, 0.09 + rand() * 0.05, 0.05, FAR);
}

function river(ctx: Ctx, x0: number, x1: number, rand: () => number): void {
  // Cut the river out of the ground and draw ripples across it.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(x0, GROUND_Y + 0.01);
  ctx.quadraticCurveTo((x0 + x1) / 2, GROUND_Y - 0.03, x1, GROUND_Y + 0.01);
  ctx.lineTo(x1 - 0.02, -0.4);
  ctx.lineTo(x0 + 0.02, -0.4);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.003;
  for (let i = 0; i < 7; i++) {
    const y = GROUND_Y - 0.025 - i * 0.017;
    ctx.beginPath();
    for (let x = x0 + 0.03; x < x1 - 0.03; x += 0.008) {
      const yy = y + Math.sin(x * 70 + i) * 0.003;
      if (x === x0 + 0.03) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // Reeds on both banks.
  for (const bx of [x0 - 0.01, x1 + 0.01]) {
    for (let i = 0; i < 6; i++) {
      const x = bx + (rand() - 0.5) * 0.04;
      const h = 0.05 + rand() * 0.05;
      ctx.lineWidth = 0.0025;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.quadraticCurveTo(x + 0.01, GROUND_Y + h * 0.6, x + (rand() - 0.5) * 0.02, GROUND_Y + h);
      ctx.stroke();
      if (rand() > 0.5) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(x + 0.002, GROUND_Y + h * 0.85, 0.004, 0.014, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Fence posts, x in metres; rabbit digs under at `gapX`. */
export const FENCE_X = 0.02;
function fence(ctx: Ctx): void {
  ctx.fillStyle = INK;
  const top = GROUND_Y + 0.17;
  for (let i = -3; i <= 3; i++) {
    const x = FENCE_X + i * 0.032;
    ctx.beginPath();
    ctx.moveTo(x - 0.011, GROUND_Y);
    ctx.lineTo(x - 0.011, top - 0.01 + (i % 2) * 0.008);
    ctx.lineTo(x, top + 0.008 + (i % 2) * 0.008);
    ctx.lineTo(x + 0.011, top - 0.01 + (i % 2) * 0.008);
    ctx.lineTo(x + 0.011, GROUND_Y);
    ctx.fill();
  }
  ctx.fillRect(FENCE_X - 0.115, GROUND_Y + 0.045, 0.23, 0.014);
  ctx.fillRect(FENCE_X - 0.115, GROUND_Y + 0.12, 0.23, 0.014);
}

/** The old oak: hollow on the right, branch where the owl perches. */
export const OWL_PERCH = { x: 0.2, y: 0.07 };
function oak(ctx: Ctx, rand: () => number): void {
  ctx.fillStyle = INK;
  const x = 0.27;
  ctx.beginPath();
  ctx.moveTo(x - 0.09, GROUND_Y);
  ctx.quadraticCurveTo(x - 0.05, GROUND_Y + 0.05, x - 0.055, GROUND_Y + 0.2);
  ctx.quadraticCurveTo(x - 0.1, 0.18, x - 0.2, 0.27);
  ctx.lineTo(x - 0.17, 0.3);
  ctx.quadraticCurveTo(x - 0.06, 0.2, x - 0.02, 0.33);
  ctx.lineTo(x + 0.02, 0.33);
  ctx.quadraticCurveTo(x + 0.06, 0.2, x + 0.2, 0.3);
  ctx.lineTo(x + 0.22, 0.27);
  ctx.quadraticCurveTo(x + 0.08, 0.16, x + 0.06, GROUND_Y + 0.2);
  ctx.quadraticCurveTo(x + 0.05, GROUND_Y + 0.05, x + 0.11, GROUND_Y);
  ctx.fill();
  // Branch for the owl.
  ctx.beginPath();
  ctx.moveTo(x - 0.05, 0.06);
  ctx.quadraticCurveTo(x - 0.1, 0.07, OWL_PERCH.x - 0.06, OWL_PERCH.y - 0.004);
  ctx.lineTo(OWL_PERCH.x - 0.06, OWL_PERCH.y - 0.014);
  ctx.quadraticCurveTo(x - 0.09, 0.052, x - 0.05, 0.04);
  ctx.fill();
  // Hollow (light shows through).
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 0.05, 0.025, 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Leaves clusters.
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI;
    const r = 0.12 + rand() * 0.1;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 1.4, 0.28 + Math.sin(a) * r * 0.5, 0.02 + rand() * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Roots with a tiny tunnel the snail must enter. */
export const TUNNEL = { x: 0.16, y: GROUND_Y };
function roots(ctx: Ctx, rand: () => number): void {
  ctx.fillStyle = INK;
  // Huge trunk base on the right.
  ctx.beginPath();
  ctx.moveTo(0.05, GROUND_Y);
  ctx.quadraticCurveTo(0.2, GROUND_Y + 0.05, 0.25, 0.35);
  ctx.lineTo(0.5, 0.35);
  ctx.lineTo(0.5, GROUND_Y);
  ctx.fill();
  // Tunnel opening.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(TUNNEL.x + 0.015, GROUND_Y + 0.018, 0.028, 0.02, 0, 0, Math.PI);
  ctx.fill();
  ctx.restore();
  // Root tendrils.
  ctx.strokeStyle = INK;
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 0.004 + rand() * 0.006;
    const sx = 0.12 + rand() * 0.2;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y + 0.03 + rand() * 0.05);
    ctx.bezierCurveTo(sx - 0.05, GROUND_Y + 0.02, sx - 0.12 - rand() * 0.1, GROUND_Y + 0.01, sx - 0.2 - rand() * 0.15, GROUND_Y);
    ctx.stroke();
  }
  // Mushrooms.
  for (const mx of [-0.3, -0.26, 0.0]) {
    ctx.fillRect(mx - 0.002, GROUND_Y, 0.004, 0.02);
    ctx.beginPath();
    ctx.ellipse(mx, GROUND_Y + 0.02, 0.014, 0.008, 0, 0, Math.PI);
    ctx.fill();
  }
}

/** Paint a scene into a canvas sized to the wall. */
export function paintScene(ctx: Ctx, w: number, h: number, wallW: number, scene: SceneId): void {
  const rand = seeded(scene.length * 977 + scene.charCodeAt(0));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const k = w / wallW;
  ctx.setTransform(k, 0, 0, -k, w / 2, h / 2);
  ctx.shadowColor = INK;
  ctx.shadowBlur = 4;

  const bright = scene === 'meadow';
  moon(ctx, scene === 'meadow' ? -0.05 : -0.3, scene === 'meadow' ? 0.18 : 0.2, scene === 'meadow' ? 0.06 : 0.035, bright ? 0.8 : 0.45);
  farHills(ctx, rand);

  switch (scene) {
    case 'forest':
      ground(ctx, rand);
      pine(ctx, -0.38, GROUND_Y, 0.34, 0.16);
      pine(ctx, -0.28, GROUND_Y, 0.25, 0.12);
      pine(ctx, 0.36, GROUND_Y, 0.38, 0.18);
      pine(ctx, 0.27, GROUND_Y, 0.22, 0.1);
      break;
    case 'river':
      ground(ctx, rand);
      river(ctx, -0.13, 0.13, rand);
      pine(ctx, -0.4, GROUND_Y, 0.3, 0.14);
      pine(ctx, 0.4, GROUND_Y, 0.32, 0.15);
      break;
    case 'fence':
      ground(ctx, rand);
      fence(ctx);
      pine(ctx, -0.4, GROUND_Y, 0.28, 0.13);
      // A pumpkin and a watering can for a garden feel.
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(0.3, GROUND_Y + 0.025, 0.04, 0.027, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(0.297, GROUND_Y + 0.045, 0.006, 0.016);
      break;
    case 'oak':
      ground(ctx, rand);
      oak(ctx, rand);
      pine(ctx, -0.4, GROUND_Y, 0.26, 0.12);
      break;
    case 'roots':
      ground(ctx, rand);
      roots(ctx, rand);
      break;
    case 'meadow':
      ground(ctx, rand);
      pine(ctx, -0.42, GROUND_Y, 0.22, 0.1);
      pine(ctx, 0.42, GROUND_Y, 0.24, 0.11);
      for (let i = 0; i < 16; i++) {
        const x = -0.35 + rand() * 0.7;
        ctx.lineWidth = 0.002;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x, GROUND_Y + 0.02 + rand() * 0.03);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, GROUND_Y + 0.04, 0.005, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
      }
      break;
  }
  ctx.shadowBlur = 0;
}
