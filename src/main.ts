import { createSystem, SessionMode, World } from '@iwsdk/core';
import { Game, type GameMode } from './game/game';

/**
 * Shadowfolk boot.
 * 1. Detect the best session: passthrough AR → cozy VR → desktop preview.
 * 2. Create the IWSDK world (renderer alpha depends on the mode, so this must come first).
 * 3. Hand the world to the Game, which drives everything from one ECS system.
 */

const params = new URLSearchParams(location.search);
const flags = {
  debug: params.has('debug'),
  demo: params.has('demo'),
};

async function detectMode(): Promise<GameMode> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return 'desktop';
  try {
    if (await xr.isSessionSupported('immersive-ar')) return 'ar';
    if (await xr.isSessionSupported('immersive-vr')) return 'vr';
  } catch {
    /* fall through */
  }
  return 'desktop';
}

async function boot(): Promise<void> {
  const status = document.getElementById('status')!;
  const start = document.getElementById('start') as HTMLButtonElement;
  const mode = await detectMode();

  const world = await World.create(document.getElementById('scene-container') as HTMLDivElement, {
    xr: {
      sessionMode: mode === 'ar' ? SessionMode.ImmersiveAR : SessionMode.ImmersiveVR,
      offer: 'none',
      features: { handTracking: { required: false }, layers: false },
    },
    render: {
      fov: 60,
      near: 0.01,
      far: 40,
      camera: { position: [0, 1.1, 0.08], lookAt: [0, 1.1, -0.62] },
    },
    input: { canvasPointerEvents: false },
    features: {
      locomotion: false,
      grabbing: false,
      physics: false,
      sceneUnderstanding: false,
      environmentRaycast: false,
      spatialUI: false,
    },
  });

  const game = new Game(world, mode, flags);
  // Exposed for the smoke test and on-device debugging.
  (window as unknown as { shadowfolk: unknown }).shadowfolk = { game, world };
  world.registerSystem(
    class GameSystem extends createSystem({}) {
      update(delta: number, time: number): void {
        game.tick(delta * 1000, time * 1000);
      }
    },
  );

  const label =
    mode === 'ar' ? 'Light the lantern' : mode === 'vr' ? 'Light the lantern (VR)' : 'Light the lantern (preview)';
  start.textContent = label;
  start.disabled = false;
  status.textContent =
    mode === 'desktop'
      ? 'No headset found: playing as a desktop preview. Keys 1–5 make shapes.'
      : 'Best with hand tracking on. Sit comfortably, hands in front of you.';

  start.addEventListener('click', () => {
    start.disabled = true;
    game.start();
  });

  if (flags.demo) {
    // Demo mode auto-starts so it can be screen-recorded without clicks.
    start.disabled = true;
    game.start();
  }
}

boot().catch((err) => {
  console.error(err);
  const status = document.getElementById('status');
  if (status) status.textContent = 'Something went wrong waking the lantern. Please reload.';
});
