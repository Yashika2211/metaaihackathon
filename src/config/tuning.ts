/**
 * Every tunable number in Shadowfolk lives here, so on-headset tuning means
 * editing one file. Distances are metres, times are milliseconds unless noted.
 */

export const LAYOUT = {
  /** Distance from the head to the shadow wall (horizontal). */
  wallDistance: 0.62,
  /** Wall centre height relative to the head. */
  wallDrop: 0.12,
  wallWidth: 0.95,
  wallHeight: 0.62,
  /** Lantern position relative to the head (forward, down). */
  lanternForward: 0.16,
  lanternDrop: 0.3,
  /** Where hands naturally sit: this far from the lantern toward the wall. */
  handFromLantern: 0.2,
  /** Seated head height used before any head pose is known (desktop preview). */
  defaultHeadHeight: 1.2,
};

export const SHADOW = {
  /** Shadow map size. 1024 keeps Quest 2/3 comfortably above 72 fps. */
  mapSize: 1024,
  bias: -0.0006,
  normalBias: 0.004,
  /** PCF blur radius in texels: higher = softer edges. */
  radius: 3.2,
  /** Darkness of the hand shadow on the wall (ShadowMaterial opacity). */
  handOpacity: 0.82,
  /** Hand shadow opacity while a creature is alive (the creature "peeled off"). */
  handOpacityWithCreature: 0.28,
  lightIntensity: 7,
  lightAngle: Math.PI / 3.1,
  lightPenumbra: 0.65,
  /** Scale applied to XR joint radii when building capsules. */
  capsuleRadiusScale: 1.0,
  /** Radius used when a runtime reports no joint radius. */
  fallbackJointRadius: 0.008,
};

export const RECOGNIZER = {
  /** A finger counts as extended below this curl (0 = straight, 1 = fully curled). */
  extendedCurl: 0.3,
  /** A finger counts as curled above this curl. */
  curledCurl: 0.55,
  /** Hysteresis: a candidate pose must score at least this to start its hold. */
  enterScore: 0.68,
  /** Hysteresis: a confirmed pose stays while its score is above this. */
  stayScore: 0.45,
  /** How long a candidate must be held before it is confirmed. */
  holdMs: 300,
  /** How long a confirmed pose survives a low score before it is dropped. */
  releaseMs: 280,
  /** Thumb–finger "touching" distance, as a fraction of hand size. */
  touchRatio: 0.38,
  /** Thumbs hooked (bird) distance, metres. */
  thumbHookDistance: 0.055,
  /** Max wrist separation for two-handed poses, metres. */
  twoHandMaxWristGap: 0.22,
  /** Direction alignment (dot product) needed for "pointing up" / "pointing at the wall". */
  directionDot: 0.55,
  /** Palm facing the wall/viewer: |palmNormal · forward| above this. */
  palmFacingDot: 0.55,
  /** "Level" fingers (dog snout, snail antennae): |direction · up| below this. */
  levelDot: 0.5,
  /** Palm up (pause menu): palmNormal · up above this. */
  palmUpDot: 0.72,
  /** Hold time for the palm-up menu gesture. */
  palmUpHoldMs: 650,
  /** Average adjacent-finger spread angle (radians) that counts as "spread". */
  spreadWide: 0.2,
  /** Spread below this counts as "fingers together". */
  spreadTight: 0.18,
  /** Dog jaw: pinky angle away from ring finger (radians) that counts as open. */
  jawOpenAngle: 0.42,
  jawCloseAngle: 0.24,
  /** Pinch: thumb tip to index tip distance (metres). */
  pinchOn: 0.022,
  pinchOff: 0.038,
};

export const FABLE = {
  /** First hint (faint ghost hand) after this long on a goal. */
  hintSoftMs: 10_000,
  /** Second hint (bright ghost + words + one-handed alternative). */
  hintStrongMs: 20_000,
  /** Time a creature must be alive to complete a goal. */
  goalHoldMs: 1_400,
  /** Narration speed: characters revealed per second. */
  narrationCps: 34,
};

export const AUDIO = {
  master: 0.8,
  ambience: 0.22,
  sfx: 0.7,
};
