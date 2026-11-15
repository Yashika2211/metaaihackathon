# Progress

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 Skeleton + Pages deploy | ✅ | IWSDK 1.1 + Vite + TS + Vitest; Actions workflow deploys `dist/` |
| M1 Shadow wall + hand shadows | ✅ | Lantern spot light (1024² PCF, radius 3.2), parchment wall, invisible instanced capsule hands |
| M2 Recognizer | ✅ | Features → soft rules → stabiliser (enter 0.68 / stay 0.45 / 300 ms hold / 280 ms release); 70+ unit tests |
| M3 Shadow creatures | ✅ | Rabbit (hops, digs), bird (flaps, carries), dog (jaw, bark), snail (crawls); ink bloom; hand steering |
| M4 Fable engine + firefly fable | ✅ | Data-driven beats, 4 puzzles, hints at 10 s / 20 s with ghost hand, firefly-swarm ending |
| M5 Onboarding | ✅ | Lantern → own shadow → ghost rabbit → rabbit lives, ~5–8 s to the first creature |
| M6 Shadow Journal | ✅ | Guarded localStorage; pinch the lantern; tonight's fable teaser rotates daily |
| M7 Procedural audio | ✅ | Drone, wind, crickets, chime, hop/chirp/bark/slurp, owl, ending swell; HRTF panner on the wall |
| M8 Pause / comfort | ✅ | Palm-up menu (Resume / Restart / Journal / Recenter), auto-pause on session blur / tab hide |
| M9 Debug + demo | ✅ | `?debug=1` readout + keys; `?demo=1` plays the whole fable (~2:15) then the one-handed poses |
| M10 Docs + submission | ✅ | README, DEVPOST, VIDEO_SCRIPT, TESTING_ON_QUEST |

## Verification log

- `npm run typecheck` — 0 errors
- `npm test` — all unit tests pass (synthetic hands, rules incl. noise/sizes/left hand/near-misses, stabiliser, journal)
- `npm run test:e2e` — Playwright: page loads, enters the **IWER-emulated** immersive session, onboarding starts, demo reaches the story, pause/resume works, no console errors
- `npm run build` — OK
- Headless screenshots reviewed for every scene: forest, river, fence, oak, roots, meadow ending, journal page, pause menu

## Not verifiable here (needs a real Quest)

- Real hand-tracking feel and recogniser thresholds on a real hand
- Frame rate on device (budget: 1 shadow-casting light, ~15 draw calls on the wall)
- Passthrough look of the parchment wall in a real room

See `TESTING_ON_QUEST.md` for the on-device checklist.
