# Testing Shadowfolk on a Meta Quest

## 1. Set up the headset
1. **Enable hand tracking:** Settings → Movement tracking → Hand and body tracking → turn on **Hand tracking**
   (and "Auto switch from controllers to hands").
2. Put the controllers down, sit in a chair, and face a clear wall or open space.
3. Make sure there's some light in the room (hand tracking needs it), but not direct sunlight.

## 2. Open the game
1. Open **Meta Quest Browser**.
2. Go to **https://yashika2211.github.io/metaaihackathon/**
3. Pinch **Light the lantern**. Allow the immersive session (and hand tracking) if asked.
   - Quest 3 / 3S: you get passthrough (mixed reality).
   - If AR isn't available you get a dim cozy room (VR fallback). The game plays the same.

For local builds: run `npm run dev` on your computer, then open `https://<computer-ip>:8081` on the Quest
(same Wi-Fi) and accept the self-signed certificate warning. Add `?debug=1` to see the recognizer readout in
the browser window (take the headset off or look at the 2D view).

## 3. What to check

### Cold start and onboarding (target: first creature in under 30 s)
- [ ] Lantern appears at chest height in front of you and flickers on within a couple of seconds
- [ ] The parchment wall is straight ahead at about arm's length, slightly below eye level
- [ ] Your hand shadow appears on the wall and follows your real hand with no visible lag
- [ ] The ghost rabbit outline appears where your shadow should go
- [ ] Making the rabbit makes the shadow rabbit bloom out of ink and hop

### Each creature (classic, then one-handed)
- [ ] Rabbit: two fingers up, ring + pinky to thumb → rabbit. Peace sign → rabbit
- [ ] Bird: both hands palms out, thumbs hooked → bird; wiggling fingers makes it flap faster. One spread palm → bird
- [ ] Dog: flat hand facing the wall, fingers sideways, thumb up → dog; drop the pinky and snap it → bark. Thumbs-up → dog that barks by itself
- [ ] Snail: fist with two fingers held level → snail. One finger pointing at the wall → snail
- [ ] Moving your hand steers the creature along the wall
- [ ] Relaxed hands, fists, a single raised finger and an OK sign do **not** make creatures
- [ ] Nothing flickers: a held pose stays alive; a creature fades only after you relax

### Story, hints, journal
- [ ] All four beats can be completed; the ending fills the wall with fireflies (~4 minutes total)
- [ ] Waiting 10 s shows a faint ghost hand; 20 s shows a bright one plus the one-handed tip
- [ ] Pinching right next to the lantern opens the Shadow Journal; pinching again closes it
- [ ] Reload the page: the journal still remembers creatures and nights

### Pause, resume, comfort
- [ ] Turning a palm up for ~0.6 s (with no creature active) opens the menu
- [ ] Poking **Resume / Restart fable / Shadow Journal / Recenter** with a fingertip works
- [ ] Pressing the Meta button (system menu) pauses; coming back shows "Welcome back" and Resume continues
- [ ] Recenter puts the lantern and wall back in front of you
- [ ] Everything is reachable without leaning or standing
- [ ] Frame rate feels smooth (no judder when moving your head)

### Audio
- [ ] Night ambience (drone, crickets) starts with the lantern
- [ ] Chime on every creature; hop / chirp / bark / slurp voices; bark sounds come from the wall
- [ ] Ending swell

## 4. If recognition feels off: what to tune

Every threshold is in **`src/config/tuning.ts`** (`RECOGNIZER` block). Open `?debug=1` to see the live values
(curls, spread, jaw, palm→wall, scores and hold progress) while you make each shape.

| Symptom | Look at in `?debug=1` | Tune in `RECOGNIZER` |
|---|---|---|
| Poses take too long / feel sluggish | hold bar fills slowly | lower `holdMs` (300) |
| Creatures blink out when tracking wobbles | score dips briefly | raise `releaseMs` (280) or lower `stayScore` (0.45) |
| Things trigger by accident | a creature score > 0.68 on a relaxed hand | raise `enterScore` (0.68) |
| Extended fingers not counted as extended | `I`/`M` curl > 0.3 when straight | raise `extendedCurl` (0.3) |
| Curled fingers not counted as curled | `R`/`P` curl < 0.55 when curled | lower `curledCurl` (0.55) |
| Rabbit: thumb-touch not detected | — | raise `touchRatio` (0.38) (or use the peace-sign alternative) |
| Bird (two hands) not detected | thumbs touching but bird score low | raise `thumbHookDistance` (0.055 m) / `twoHandMaxWristGap` (0.22 m) |
| One-handed bird not detected | `spread` < 0.27 with fingers spread | lower `spreadWide` (0.27) |
| Dog not detected | `spread` > 0.18 with fingers together, or palm→wall < 0.55 | raise `spreadTight` (0.18), lower `palmFacingDot` (0.55) |
| Dog won't bark | `jaw` doesn't pass 0.42 when pinky drops | lower `jawOpenAngle` (0.42) / raise `jawCloseAngle` (0.24) |
| Snail reads as rabbit (or vice versa) | `point↑` between 0.5 and 0.55 | adjust `levelDot` (0.5) and `directionDot` (0.55) |
| Menu opens by accident | `palm↑` > 0.72 in normal play | raise `palmUpDot` (0.72) or `palmUpHoldMs` (650) |
| Lantern pinch hard to hit | — | raise `LANTERN_TAP` in `src/game/game.ts` (0.09 m) |

Layout (in `LAYOUT`): `wallDistance`, `wallDrop`, `lanternForward`, `lanternDrop`, `handFromLantern`.
Shadow look (in `SHADOW`): `mapSize` (1024), `radius` (softness), `handOpacity`, `lightIntensity`.

After changing thresholds, run `npm test`: the unit tests check every pose, noisy variants and near-misses,
so you'll see immediately if a change makes one creature steal another's pose.
