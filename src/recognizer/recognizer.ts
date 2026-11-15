import { RECOGNIZER as T } from '../config/tuning';
import { scale, add, type Vec3 } from '../core/vec';
import type { HandsFrame } from '../hands/joints';
import { CREATURES, type CreatureId, type Variant } from './creatures';
import { computeFeatures, type HandFeatures, type WallFrame } from './features';
import { palmUpScore, scoreAll, type RuleScore } from './rules';

export type RecognizerEvent =
  | { type: 'confirm'; creature: CreatureId; variant: Variant }
  | { type: 'release'; creature: CreatureId }
  | { type: 'bark' }
  | { type: 'palmUp'; hand: 'left' | 'right' }
  | { type: 'pinch'; hand: 'left' | 'right'; at: Vec3 }
  | { type: 'pinchEnd'; hand: 'left' | 'right' };

export interface RecognizerState {
  /** Pose currently alive, or null. */
  confirmed: CreatureId | null;
  variant: Variant | null;
  /** Pose being held but not yet confirmed. */
  candidate: CreatureId | null;
  /** 0..1 progress of the confirmation hold. */
  holdProgress: number;
  /** Best score per creature this frame. */
  scores: Record<CreatureId, number>;
  /** Which hand(s) are making the confirmed/candidate pose. */
  hands: 'left' | 'right' | 'both' | null;
  /** World point that steers the creature (centre of the posing hand(s)). */
  anchor: Vec3 | null;
  /** Bird flapping intensity 0..1. */
  flap: number;
  /** Dog jaw openness 0..1. */
  jaw: number;
  left: HandFeatures | null;
  right: HandFeatures | null;
}

interface PerHandMemory {
  jawOpen: boolean;
  lastCurl: number;
  pinching: boolean;
  palmUpSince: number | null;
  palmUpFired: boolean;
}

const freshMemory = (): PerHandMemory => ({
  jawOpen: false,
  lastCurl: -1,
  pinching: false,
  palmUpSince: null,
  palmUpFired: false,
});

/**
 * Stabilised hand-shape recognizer.
 *
 * - A pose becomes a *candidate* when its score passes `enterScore`.
 * - It is *confirmed* after being held for `holdMs` above `stayScore`.
 * - A confirmed pose survives brief dips; it is released only after its score
 *   stays below `stayScore` for `releaseMs`.
 * This hysteresis keeps the output from flickering on noisy tracking.
 */
export class HandShapeRecognizer {
  private confirmed: CreatureId | null = null;
  private variant: Variant | null = null;
  private candidate: CreatureId | null = null;
  private candidateSince = 0;
  private lowSince: number | null = null;
  private lastAutoBark = 0;
  private flap = 0;
  private mem: Record<'left' | 'right', PerHandMemory> = { left: freshMemory(), right: freshMemory() };
  private lastTime: number | null = null;
  /** Creature ids the recognizer is allowed to confirm (null = all). */
  allowed: ReadonlySet<CreatureId> | null = null;

  constructor(public frame: WallFrame = { forward: [0, 0, -1], up: [0, 1, 0] }) {}

  reset(): void {
    this.confirmed = null;
    this.variant = null;
    this.candidate = null;
    this.lowSince = null;
    this.flap = 0;
    this.mem = { left: freshMemory(), right: freshMemory() };
    this.lastTime = null;
  }

  update(hands: HandsFrame): { state: RecognizerState; events: RecognizerEvent[] } {
    const t = hands.time;
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(100, t - this.lastTime));
    this.lastTime = t;
    const events: RecognizerEvent[] = [];

    const left = hands.left ? computeFeatures(hands.left, this.frame) : null;
    const right = hands.right ? computeFeatures(hands.right, this.frame) : null;
    const all = scoreAll(left, right);

    // Best score per creature (max over variants and hands).
    const best: Record<CreatureId, RuleScore | null> = { rabbit: null, bird: null, dog: null, snail: null };
    for (const s of all) {
      if (this.allowed && !this.allowed.has(s.creature)) continue;
      const cur = best[s.creature];
      if (!cur || s.score > cur.score) best[s.creature] = s;
    }
    const scores = Object.fromEntries(CREATURES.map((c) => [c, best[c]?.score ?? 0])) as Record<CreatureId, number>;

    let top: RuleScore | null = null;
    for (const c of CREATURES) {
      const s = best[c];
      if (s && (!top || s.score > top.score)) top = s;
    }

    // --- Stabiliser -----------------------------------------------------------
    if (this.confirmed) {
      if (scores[this.confirmed] >= T.stayScore) {
        this.lowSince = null;
      } else {
        this.lowSince ??= t;
        if (t - this.lowSince >= T.releaseMs) {
          events.push({ type: 'release', creature: this.confirmed });
          this.confirmed = null;
          this.variant = null;
          this.candidate = null;
          this.lowSince = null;
        }
      }
    }
    if (!this.confirmed) {
      if (this.candidate && scores[this.candidate] >= T.stayScore && (!top || top.creature === this.candidate || top.score < T.enterScore)) {
        if (t - this.candidateSince >= T.holdMs) {
          this.confirmed = this.candidate;
          this.variant = best[this.candidate]!.variant;
          this.lastAutoBark = t;
          events.push({ type: 'confirm', creature: this.confirmed, variant: this.variant });
        }
      } else if (top && top.score >= T.enterScore) {
        this.candidate = top.creature;
        this.candidateSince = t;
      } else {
        this.candidate = null;
      }
    }

    const active = this.confirmed ?? this.candidate;
    const activeScore = active ? best[active] : null;
    const holdProgress = this.confirmed ? 1 : this.candidate ? Math.min(1, (t - this.candidateSince) / T.holdMs) : 0;

    // --- Anchor (steering point) ------------------------------------------------
    let anchor: Vec3 | null = null;
    const handsUsed = activeScore?.hands ?? null;
    if (handsUsed === 'both' && left && right) anchor = scale(add(left.thumbTip, right.thumbTip), 0.5);
    else if (handsUsed === 'left' && left) anchor = left.center;
    else if (handsUsed === 'right' && right) anchor = right.center;
    else if (right) anchor = right.center;
    else if (left) anchor = left.center;

    // --- Actions: flap, jaw/bark --------------------------------------------------
    let curlChange = 0;
    for (const f of [left, right]) {
      if (!f) continue;
      const m = this.mem[f.handedness];
      const mean = (f.curl.index + f.curl.middle + f.curl.ring + f.curl.pinky) / 4;
      if (m.lastCurl >= 0 && dt > 0) curlChange = Math.max(curlChange, Math.abs(mean - m.lastCurl) / (dt / 1000));
      m.lastCurl = mean;
    }
    const flapTarget = Math.min(1, curlChange / 2.5);
    this.flap += (flapTarget - this.flap) * Math.min(1, dt / 180);

    let jaw = 0;
    if (this.confirmed === 'dog' && handsUsed && handsUsed !== 'both') {
      const f = handsUsed === 'left' ? left : right;
      if (f && this.variant === 'classic') {
        jaw = Math.min(1, Math.max(0, (f.jawAngle - T.jawCloseAngle) / (T.jawOpenAngle - T.jawCloseAngle)));
        const m = this.mem[f.handedness];
        if (!m.jawOpen && f.jawAngle > T.jawOpenAngle) m.jawOpen = true;
        else if (m.jawOpen && f.jawAngle < T.jawCloseAngle) {
          m.jawOpen = false;
          events.push({ type: 'bark' });
        }
      } else if (this.variant === 'oneHanded' && t - this.lastAutoBark > 1500) {
        this.lastAutoBark = t;
        events.push({ type: 'bark' });
      }
    }

    // --- Utility gestures: palm up (menu) and pinch -------------------------------
    for (const f of [left, right]) {
      if (!f) continue;
      const m = this.mem[f.handedness];
      if (palmUpScore(f) > 0.8) {
        m.palmUpSince ??= t;
        if (!m.palmUpFired && t - m.palmUpSince >= T.palmUpHoldMs) {
          m.palmUpFired = true;
          events.push({ type: 'palmUp', hand: f.handedness });
        }
      } else {
        m.palmUpSince = null;
        m.palmUpFired = false;
      }
      if (!m.pinching && f.pinchDistance < T.pinchOn) {
        m.pinching = true;
        events.push({ type: 'pinch', hand: f.handedness, at: scale(add(f.thumbTip, f.indexTip), 0.5) });
      } else if (m.pinching && f.pinchDistance > T.pinchOff) {
        m.pinching = false;
        events.push({ type: 'pinchEnd', hand: f.handedness });
      }
    }
    if (!left) this.mem.left = { ...freshMemory(), lastCurl: -1 };
    if (!right) this.mem.right = { ...freshMemory(), lastCurl: -1 };

    return {
      state: {
        confirmed: this.confirmed,
        variant: this.variant,
        candidate: this.candidate,
        holdProgress,
        scores,
        hands: handsUsed,
        anchor,
        flap: this.flap,
        jaw,
        left,
        right,
      },
      events,
    };
  }
}
