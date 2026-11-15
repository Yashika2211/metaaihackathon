import {
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
} from 'three';
import { createCanvasTex, seeded } from './canvasTexture';

/**
 * Fallback environment for `immersive-vr` and the desktop preview: a dim,
 * cozy attic room at night. Unlit materials only — the lantern does the mood.
 */
export function buildCozyRoom(): Group {
  const room = new Group();
  room.name = 'cozy-room';

  // Walls: warm dark plaster with a soft glow band where the lantern is.
  const wallTex = createCanvasTex(512, 512);
  {
    const { ctx } = wallTex;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0b0705');
    g.addColorStop(0.55, '#24160d');
    g.addColorStop(1, '#120a06');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const rand = seeded(42);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '60,40,25' : '10,6,4'},${rand() * 0.15})`;
      ctx.fillRect(rand() * 512, rand() * 512, 2, 2);
    }
    wallTex.commit();
  }
  const walls = new Mesh(new BoxGeometry(6, 3.2, 6), new MeshBasicMaterial({ map: wallTex.texture, side: BackSide }));
  walls.position.y = 1.6;
  room.add(walls);

  // Floorboards.
  const floorTex = createCanvasTex(512, 512);
  {
    const { ctx } = floorTex;
    const rand = seeded(7);
    for (let i = 0; i < 8; i++) {
      const shade = 22 + rand() * 10;
      ctx.fillStyle = `rgb(${shade + 10},${shade},${shade - 8})`;
      ctx.fillRect(0, i * 64, 512, 62);
      ctx.fillStyle = '#080503';
      ctx.fillRect(0, i * 64 + 62, 512, 2);
    }
    floorTex.commit();
    floorTex.texture.wrapS = floorTex.texture.wrapT = RepeatWrapping;
    floorTex.texture.repeat.set(4, 4);
  }
  const floor = new Mesh(new PlaneGeometry(6, 6), new MeshBasicMaterial({ map: floorTex.texture }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;
  room.add(floor);

  // A round rug and a low table under the lantern.
  const rug = new Mesh(new CylinderGeometry(0.9, 0.9, 0.01, 40), new MeshBasicMaterial({ color: new Color('#3b1d12') }));
  rug.position.set(0, 0.006, -0.4);
  room.add(rug);

  // A moonlit window behind the wall, glimpsed at the edges.
  const winTex = createCanvasTex(256, 256);
  {
    const { ctx } = winTex;
    const g = ctx.createRadialGradient(170, 80, 4, 128, 128, 180);
    g.addColorStop(0, '#d6e3ff');
    g.addColorStop(0.12, '#4b5f8f');
    g.addColorStop(1, '#0b1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const rand = seeded(3);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 256, rand() * 256, 1, 1);
    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(124, 0, 8, 256);
    ctx.fillRect(0, 124, 256, 8);
    winTex.commit();
  }
  const win = new Mesh(new PlaneGeometry(1.1, 1.1), new MeshBasicMaterial({ map: winTex.texture }));
  win.position.set(0.9, 1.7, -2.98);
  room.add(win);

  return room;
}
