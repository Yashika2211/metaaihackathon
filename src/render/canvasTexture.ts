import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

/** A 2D canvas paired with a three.js texture, for procedural art. */
export interface CanvasTex {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D;
  texture: CanvasTexture;
  width: number;
  height: number;
  /** Mark the texture for re-upload after drawing. */
  commit(): void;
}

export function createCanvasTex(width: number, height: number): CanvasTex {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  return {
    canvas,
    ctx,
    texture,
    width,
    height,
    commit() {
      texture.needsUpdate = true;
    },
  };
}

/** Seeded random for repeatable procedural art. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
