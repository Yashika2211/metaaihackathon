# Shadowfolk: Build Plan

Meta VR Start Developer Competition 2026 · Track: Entertainment · Division: New Experience
Hard deadline: submission-ready by **Nov 18, 18:00 IST** (Devpost closes Nov 19, 01:30 IST).

## Milestones

| # | Milestone | Done when |
|---|-----------|-----------|
| M0 | Project skeleton (IWSDK + Vite + TS + Vitest), CI deploy to GitHub Pages | `npm run build` passes, Pages URL serves the page |
| M1 | **Shadow wall + hand shadows** | Lantern spot light, parchment wall, invisible capsule hands cast soft shadows; synthetic hands visible on desktop |
| M2 | **Hand-shape recognizer** | Pure TS features + rules + hysteresis/hold; vitest fixtures for every pose and near-misses |
| M3 | **Shadow creatures** | Rabbit, bird, dog, snail silhouettes; ink-bloom morph; animations; steering by hand |
| M4 | **Fable engine** + "The Firefly Who Lost Her Light" | Data-driven beats, scenery, narration, hint escalation (10 s / 20 s ghost hand), ending |
| M5 | **Onboarding** | Lantern flickers on → own shadow → ghost rabbit → rabbit lives → story; < 30 s to first wow |
| M6 | **Shadow Journal** return loop | localStorage (guarded), pinch-tap lantern opens it, "tonight's fable" teaser |
| M7 | **Procedural audio** | WebAudio drone, crickets, chime, hop/chirp/bark, ending swell, spatialized at the wall |
| M8 | **Pause / resume / comfort** | Palm-up menu (Resume / Restart / Journal / Recenter), auto-pause on visibility loss, recenter |
| M9 | **Debug + demo tooling** | `?debug=1` readout + keys 1–5; `?demo=1` auto-plays the full fable |
| M10 | **Docs + submission** | README, DEVPOST, VIDEO_SCRIPT, TESTING_ON_QUEST; live URL verified |

## Rules checklist (verified at the end)

- [ ] Hands only, end to end (controllers optional)
- [ ] Seated, everything within ~60 cm, no locomotion
- [ ] Cold start to lit lantern in seconds; pause/resume; complete moment < 10 min
- [ ] Fully original: no external services/APIs, all art and audio generated in code

## Architecture (short)

```
src/
  main.ts              boot: World.create, mode detection (AR → VR → desktop)
  config/tuning.ts     every threshold and visual constant in one place
  hands/               joint layout, XR hand source, synthetic hand generator
  recognizer/          features → rules → stabilizer (no three.js imports)
  render/              lantern, parchment wall, hand shadow capsules, fallback room
  creatures/           procedural silhouettes + per-creature behaviour
  scenery/             trees, moon, river, fence, owl, hollow, fireflies
  fable/               beat types, the firefly fable, engine
  ui/                  subtitles, ghost hints, palm menu, journal page
  audio/               WebAudio synth: ambience + sfx
  save/                Shadow Journal persistence
  debug/               overlay, keyboard pose injection, demo autoplay
  game/                orchestrator, onboarding, pause
```
