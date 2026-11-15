import { RECOGNIZER as T } from '../config/tuning';
import { distance, ramp } from '../core/vec';
import type { CreatureId, Variant } from './creatures';
import type { HandFeatures } from './features';

/**
 * Threshold rules. Each rule returns a soft score in 0..1 (1 = textbook pose),
 * built from ramps so that the stabilizer can apply hysteresis on a smooth signal.
 */

export const extended = (curl: number): number => ramp(curl, T.extendedCurl + 0.14, T.extendedCurl - 0.06);
export const curled = (curl: number): number => ramp(curl, T.curledCurl - 0.14, T.curledCurl + 0.06);
const touching = (ratio: number): number => ramp(ratio, T.touchRatio + 0.2, T.touchRatio);
const atLeast = (x: number, threshold: number, soft = 0.15): number => ramp(x, threshold - soft, threshold);
const atMost = (x: number, threshold: number, soft = 0.15): number => ramp(x, threshold + soft, threshold);

export interface RuleScore {
  creature: CreatureId;
  variant: Variant;
  score: number;
  hands: 'left' | 'right' | 'both';
}

// --- Rabbit ---------------------------------------------------------------

/** Classic rabbit: two ears up, ring + pinky curled down to the thumb. */
export function rabbitClassic(f: HandFeatures): number {
  return Math.min(
    extended(f.curl.index),
    extended(f.curl.middle),
    curled(f.curl.ring),
    curled(f.curl.pinky),
    touching(Math.min(f.thumbTo.ring, f.thumbTo.middle * 1.3, f.thumbTo.pinky)),
    atLeast(f.pointUp, T.directionDot),
  );
}

/** One-handed alternative: peace sign pointing up (thumb anywhere). */
export function rabbitAlt(f: HandFeatures): number {
  return Math.min(
    extended(f.curl.index),
    extended(f.curl.middle),
    curled(f.curl.ring),
    curled(f.curl.pinky),
    atLeast(f.pointUp, T.directionDot),
  ) * 0.94; // slightly below classic so classic wins the label when both match
}

// --- Snail ----------------------------------------------------------------

/** Classic snail: index + middle antennae pointing at the wall from a fist. */
export function snailClassic(f: HandFeatures): number {
  return Math.min(
    extended(f.curl.index),
    extended(f.curl.middle),
    curled(f.curl.ring),
    curled(f.curl.pinky),
    atLeast(f.pointForward, T.directionDot),
  );
}

/** One-handed alternative: point one finger at the wall. */
export function snailAlt(f: HandFeatures): number {
  return Math.min(
    extended(f.curl.index),
    curled(f.curl.middle),
    curled(f.curl.ring),
    curled(f.curl.pinky),
    atLeast(f.indexForward, T.directionDot + 0.1),
  ) * 0.94;
}

// --- Dog ------------------------------------------------------------------

/** Classic dog: flat hand side-on, fingers together; the pinky is the jaw. */
export function dogClassic(f: HandFeatures): number {
  return Math.min(
    extended(f.curl.index),
    extended(f.curl.middle),
    extended(f.curl.ring),
    atMost(f.curl.pinky, 0.55, 0.15),
    atMost(f.spread, T.spreadTight, 0.1),
    atMost(Math.abs(f.palmFacing), T.palmSideDot),
    atMost(Math.abs(f.palmUp), 0.6),
    atMost(f.pointUp, 0.65),
  );
}

/** One-handed alternative: thumbs-up fist, side-on. */
export function dogAlt(f: HandFeatures): number {
  return Math.min(
    curled(f.curl.index),
    curled(f.curl.middle),
    curled(f.curl.ring),
    curled(f.curl.pinky),
    atLeast(f.thumbUp, 0.6),
    // Thumb tip must be clear of the fingers (not tucked into the fist).
    atLeast(f.thumbTo.middle, 0.75, 0.2),
  ) * 0.94;
}

// --- Bird -----------------------------------------------------------------

const extendedCount = (f: HandFeatures): number =>
  extended(f.curl.index) + extended(f.curl.middle) + extended(f.curl.ring) + extended(f.curl.pinky);

/** Fingers that are "wings": anything not folded into a fist. Flapping keeps them wings. */
const wingCount = (f: HandFeatures): number =>
  4 - curled(f.curl.index) - curled(f.curl.middle) - curled(f.curl.ring) - curled(f.curl.pinky);

/** Classic bird: two hands, thumbs hooked, fingers out as wings. */
export function birdClassic(l: HandFeatures, r: HandFeatures): number {
  const hook = distance(l.thumbTip, r.thumbTip);
  const wristGap = distance(l.wrist, r.wrist);
  return Math.min(
    ramp(wingCount(l), 2.6, 3.4),
    ramp(wingCount(r), 2.6, 3.4),
    ramp(hook, T.thumbHookDistance + 0.035, T.thumbHookDistance),
    ramp(wristGap, T.twoHandMaxWristGap + 0.06, T.twoHandMaxWristGap),
  );
}

/** One-handed alternative: spread open palm facing the wall (or you). */
export function birdAlt(f: HandFeatures): number {
  return Math.min(
    ramp(wingCount(f), 2.8, 3.4),
    atLeast(f.spread, T.spreadWide, 0.07),
    atLeast(Math.abs(f.palmFacing), T.palmFacingDot),
    // Thumb free of the index finger (rules out the OK sign).
    atLeast(f.thumbTo.index, 0.75, 0.2),
  ) * 0.94;
}

// --- Utility gestures (not creatures) --------------------------------------

/** Palm up, fingers mostly open: opens the pause menu after a hold. */
export function palmUpScore(f: HandFeatures): number {
  return Math.min(
    atLeast(f.palmUp, T.palmUpDot, 0.12),
    ramp(extendedCount(f), 2.5, 3.5),
  );
}

/** Score every creature for one frame. */
export function scoreAll(left: HandFeatures | null, right: HandFeatures | null): RuleScore[] {
  const out: RuleScore[] = [];
  for (const f of [left, right]) {
    if (!f) continue;
    const hands = f.handedness;
    out.push({ creature: 'rabbit', variant: 'classic', score: rabbitClassic(f), hands });
    out.push({ creature: 'rabbit', variant: 'oneHanded', score: rabbitAlt(f), hands });
    out.push({ creature: 'snail', variant: 'classic', score: snailClassic(f), hands });
    out.push({ creature: 'snail', variant: 'oneHanded', score: snailAlt(f), hands });
    out.push({ creature: 'dog', variant: 'classic', score: dogClassic(f), hands });
    out.push({ creature: 'dog', variant: 'oneHanded', score: dogAlt(f), hands });
    out.push({ creature: 'bird', variant: 'oneHanded', score: birdAlt(f), hands });
  }
  if (left && right) {
    out.push({ creature: 'bird', variant: 'classic', score: birdClassic(left, right), hands: 'both' });
  }
  return out;
}
