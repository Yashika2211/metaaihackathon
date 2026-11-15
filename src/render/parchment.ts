import { createCanvasTex, seeded, type CanvasTex } from './canvasTexture';

/**
 * Paints a warm, lantern-lit parchment: a hot spot in the middle, fibres,
 * blotches and a burnt, darker rim. Entirely procedural.
 */
export function paintParchment(width = 1024, height = 672): CanvasTex {
  const tex = createCanvasTex(width, height);
  const { ctx } = tex;
  const rand = seeded(1729);

  // Base warm glow, brightest where the lantern points.
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.56, 10, width * 0.5, height * 0.5, width * 0.62);
  glow.addColorStop(0, '#fff1cf');
  glow.addColorStop(0.45, '#f6d9a0');
  glow.addColorStop(0.8, '#d9a86a');
  glow.addColorStop(1, '#8a5a30');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Soft blotches.
  for (let i = 0; i < 60; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 20 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.5;
    g.addColorStop(0, dark ? 'rgba(120,70,30,0.07)' : 'rgba(255,245,220,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Paper fibres.
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const len = 4 + rand() * 18;
    const a = rand() * Math.PI;
    ctx.strokeStyle = `rgba(${rand() > 0.5 ? '110,70,35' : '255,240,210'},${0.05 + rand() * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 4, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // Grain.
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 0.8;
  }
  ctx.putImageData(img, 0, 0);

  // Burnt rim vignette.
  const rim = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.36, width / 2, height / 2, width * 0.66);
  rim.addColorStop(0, 'rgba(40,18,6,0)');
  rim.addColorStop(1, 'rgba(40,18,6,0.65)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, width, height);

  // Ragged, slightly transparent edge so the wall feels like hung paper in passthrough.
  ctx.globalCompositeOperation = 'destination-out';
  const edge = 14;
  for (let x = 0; x < width; x += 6) {
    const t = rand() * edge;
    const b = rand() * edge;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(x, 0, 7, t);
    ctx.fillRect(x, height - b, 7, b);
  }
  for (let y = 0; y < height; y += 6) {
    const l = rand() * edge;
    const r = rand() * edge;
    ctx.fillRect(0, y, l, 7);
    ctx.fillRect(width - r, y, r, 7);
  }
  ctx.globalCompositeOperation = 'source-over';
  tex.commit();
  return tex;
}
