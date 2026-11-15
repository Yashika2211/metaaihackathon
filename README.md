# Shadowfolk

**Make hand shadows in a lantern's glow and watch them come alive.**

Shadowfolk is a hands-first, seated, mixed-reality storytelling game for Meta Quest, built for the web with the
Meta Immersive Web SDK. A small paper lantern floats in front of you and throws a warm glow onto a parchment
"shadow wall" about 60 cm away, right in your room (passthrough). Your **real tracked hands** cast shadows on it.
Make a classic hand-shadow shape and the shadow comes alive: a shadow rabbit hops off the wall, a bird takes
flight, a dog barks. Each fable is a short story you solve by making the right creature at the right moment.

▶ **Play:** https://yashika2211.github.io/metaaihackathon/ (open it in the Meta Quest Browser)

- Entertainment track · New Experience
- Hands only, seated, everything within arm's reach
- No downloads, no accounts, no third-party services. Every image and sound is generated in code.

---

## How to play

1. Sit comfortably. Open the link in Quest Browser and press **Light the lantern**.
2. Raise a hand between the lantern and the wall. That shadow is yours.
3. A glowing ghost hand shows you the rabbit. Copy it and hold for a moment: the rabbit comes alive.
4. Listen to the story. When it asks a question ("Who could carry her over the water?"), make that creature.
   Stuck? After 10 seconds a faint ghost hand appears; after 20 seconds a bright one, plus a one-handed alternative.
5. Move your hand to guide the creature along the wall.

**The Firefly Who Lost Her Light** (about 3–5 minutes): help Lumi cross the river (bird), get under the garden
fence (rabbit), scare off the owl (dog, with a bark) and fetch her light from the root tunnel (snail).

### Gestures

| Gesture | What it does |
|---|---|
| Make a creature shape and hold ~0.3 s | The creature comes alive |
| Move the shaping hand | Steer the creature |
| Wave / wiggle fingers (bird) | Flap faster |
| Drop the pinky, then snap it shut (dog) | Bark |
| Turn a palm up and hold ~0.6 s | Pause menu: Resume · Restart fable · Shadow Journal · Recenter |
| Poke a menu button with a fingertip | Choose |
| Pinch next to the lantern | Open / close the Shadow Journal |

Taking the headset off or opening the Quest menu pauses the game automatically.

## The hand shapes

Every creature has a **classic** shadow-puppet shape and a simpler **one-handed alternative** for accessibility.

```
 RABBIT 🐇                         BIRD 🐦                          DOG 🐕                           SNAIL 🐌
   ||   ears: index + middle up     \\\\ //// both hands, palms out    ___                              fist, index + middle
   ||                                 \\  //  thumbs hooked together  |   |====    fingers together     held level as antennae
  (  )  ring + pinky curled            \\//   wave fingers to flap    |___|====    pointing sideways      ==o  ==o
  (__)  down to meet the thumb          ()                            thumb up = ear  pinky drops = jaw       (@)__
```

| Creature | Classic | One-handed alternative |
|---|---|---|
| 🐇 Rabbit | Index + middle up as ears, ring + pinky curled down to the thumb | ✌️ Peace sign, fingers up |
| 🐦 Bird | Two hands, palms out, thumbs hooked; wiggle fingers to flap | 🖐️ One open hand, fingers spread wide, palm to the wall |
| 🐕 Dog | Flat hand facing the wall, fingers together pointing sideways, thumb up; drop and snap the pinky to bark | 👍 Thumbs-up (it barks on its own) |
| 🐌 Snail | Fist with index + middle held level (sideways or at the wall) | 👉 Point one finger, level, at the wall |

The Shadow Journal (pinch the lantern) lists both ways for every creature you have met.

## Run locally

Requires Node 20.19+ / 22.12+ / 24+.

```bash
npm install
npm run dev          # https://localhost:8081 with the IWER XR emulator injected
npm test             # unit tests (recognizer, journal, synthetic hands)
npm run test:e2e     # Playwright smoke test in the emulated XR session
npm run typecheck
npm run build        # static site in dist/
```

To try it on a Quest from your computer, run `npm run dev` and open `https://<your-computer-ip>:8081` in Quest
Browser (accept the local certificate). See [TESTING_ON_QUEST.md](TESTING_ON_QUEST.md).

### Modes and desktop controls

| URL | What you get |
|---|---|
| `/` | The game. On a desktop browser without a headset it runs as a preview with scripted hands. |
| `/?debug=1` | Recognizer readout (curls, spread, palm direction, scores, hold progress, fps) and visible hand casters |
| `/?demo=1` | Plays the whole fable hands-free (~2:15), then shows each one-handed pose. Made for screen recording. |

Desktop keys: `1` rabbit · `2` bird · `3` dog · `4` snail · `5` palm up · `0` relax · `Shift+1…4` one-handed
version · `B` bark · arrow keys move the hands · `P`/`Esc` pause · `J` journal · `R` recenter · `N` skip beat (debug).

## How it works

```
XRHand joints ─▶ recognizer/features ─▶ recognizer/rules ─▶ stabiliser ─▶ events
     │                (curl, spread, jaw,      (soft scores      (hysteresis,     │
     │                 palm frame, thumbs)      per creature)    300 ms hold)     ▼
     └─▶ render/handShadows (invisible capsules) ─▶ lantern SpotLight ─▶ wall   creatures · fable engine · audio
```

- **Shadows:** one `SpotLight` inside the lantern (1024² PCF shadow map). Each hand is two instanced meshes
  (spheres at joints, cylinders along bones) with `colorWrite: false`, so they only exist in the shadow map.
  The shadow lands on a `ShadowMaterial` overlay above the parchment, so it can be faded when a creature
  "peels off".
- **Recognizer:** pure TypeScript, no three.js. Features are measured in a wall frame (toward the wall, world
  up) so recentering never changes what a pose means. Rules return soft 0–1 scores; the stabiliser needs 0.68
  to start a hold, keeps a pose above 0.45, confirms after 300 ms and forgives dropouts up to 280 ms.
- **Art:** every silhouette (creatures, trees, river, fence, owl, oak) is drawn with 2D canvas paths into
  textures; eyes and the snail's shell are cut out so the lantern light shows through, like real puppets.
- **Audio:** WebAudio synthesis only. Creature sounds come from an HRTF panner placed on the wall.
- **Story:** fables are data (`src/fable/fireflyFable.ts`): scene, narration, goal creature, prompt, hint and
  a short scripted `solve` animation. A pausable game clock drives every wait, so pausing freezes the story.

All tunable thresholds live in [`src/config/tuning.ts`](src/config/tuning.ts).

## Project layout

```
src/
  main.ts            boot: picks AR → VR → desktop, creates the IWSDK world
  game/game.ts       orchestrates everything from one ECS system tick
  config/tuning.ts   every threshold and layout constant
  hands/             joint layout, WebXR hand reader, synthetic hands + pose library
  recognizer/        features, rules, stabiliser, creature catalogue
  render/            lantern, parchment, shadow wall, hand casters, stage, cozy VR room
  creatures/         rabbit, bird, dog, snail, ink bloom, creature layer
  scenery/           backdrops, owl, fireflies
  fable/             clock, types, the firefly fable, engine
  ui/                subtitles, ghost hint, palm menu, journal page
  audio/             engine, ambience, sfx
  save/              Shadow Journal (localStorage, guarded)
  debug/             overlay, keyboard, synthetic driver, demo director
tests/               vitest unit tests
e2e/                 Playwright smoke tests (IWER-emulated session)
```

## License

MIT. All art, audio and story are original and generated in code.
