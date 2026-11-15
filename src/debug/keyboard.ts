import type { PoseName } from '../hands/poseLibrary';

export interface KeyboardActions {
  pose(name: PoseName): void;
  steer(dx: number, dy: number): void;
  togglePause(): void;
  journal(): void;
  recenter(): void;
  skip(): void;
}

/**
 * Desktop / debug keyboard. Injects scripted hand poses so the whole fable can
 * be played (and recorded) without a headset.
 *
 *   1 rabbit   2 bird   3 dog   4 snail   5 palm-up (menu)
 *   Shift+1..4 the one-handed alternative of each creature
 *   0 relax hands   B bark (dog jaw)   ←↑→↓ move hands
 *   Esc / P pause   J journal   R recenter   N skip beat (debug)
 */
export function bindKeyboard(actions: KeyboardActions, allowSkip: boolean): () => void {
  let barking = false;
  const classic: Record<string, PoseName> = { '1': 'rabbit', '2': 'birdFlap', '3': 'dog', '4': 'snail', '5': 'palmUp', '0': 'relaxed' };
  const alt: Record<string, PoseName> = { '1': 'rabbitAlt', '2': 'birdAlt', '3': 'dogAlt', '4': 'snailAlt' };
  const steer = { x: 0, y: 0 };

  const onKey = (e: KeyboardEvent) => {
    const digit = e.code.startsWith('Digit') ? e.code.slice(5) : e.key;
    if (e.shiftKey && alt[digit]) {
      actions.pose(alt[digit]);
      return;
    }
    if (classic[digit]) {
      barking = false;
      actions.pose(classic[digit]);
      return;
    }
    switch (e.key) {
      case 'b':
      case 'B':
        barking = !barking;
        actions.pose(barking ? 'dogBark' : 'dog');
        break;
      case 'ArrowLeft':
        steer.x = Math.max(-0.12, steer.x - 0.03);
        actions.steer(steer.x, steer.y);
        break;
      case 'ArrowRight':
        steer.x = Math.min(0.12, steer.x + 0.03);
        actions.steer(steer.x, steer.y);
        break;
      case 'ArrowUp':
        steer.y = Math.min(0.08, steer.y + 0.02);
        actions.steer(steer.x, steer.y);
        break;
      case 'ArrowDown':
        steer.y = Math.max(-0.06, steer.y - 0.02);
        actions.steer(steer.x, steer.y);
        break;
      case 'Escape':
      case 'p':
      case 'P':
        actions.togglePause();
        break;
      case 'j':
      case 'J':
        actions.journal();
        break;
      case 'r':
      case 'R':
        actions.recenter();
        break;
      case 'n':
      case 'N':
        if (allowSkip) actions.skip();
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
