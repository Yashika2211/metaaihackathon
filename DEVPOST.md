# Devpost submission: Shadowfolk

## Name
Shadowfolk

## Tagline
Make hand shadows in a lantern's glow and watch them come alive: a hands-only mixed-reality fable for Meta Quest.

<!-- 113 characters -->

## Track / Division
- **Track:** Entertainment (immersive storytelling)
- **Division:** New Experience

## Links
- **Play (Quest Browser):** https://yashika2211.github.io/metaaihackathon/
- **Hands-free demo (any browser):** https://yashika2211.github.io/metaaihackathon/?demo=1
- **Code:** https://github.com/Yashika2211/metaaihackathon

## Description

**Inspiration.** Everyone has made a shadow rabbit on a bedroom wall. It's one of the oldest kinds of
storytelling there is: a light, a wall and your hands. Mixed reality finally lets that wall answer back. We
wanted the most direct use of hand tracking we could imagine, one where your hands aren't holding a tool or
pointing a laser. Your hands *are* the characters.

**What it is.** A paper lantern floats in front of you and lights a parchment wall in your real room. Your
real hands cast real-time shadows on it. Make a classic shape (rabbit, bird, dog, snail), hold it for a heartbeat,
and ink blooms out of your shadow as the creature comes alive and acts in the story. In *The Firefly Who Lost
Her Light*, you help Lumi cross a river (bird), dig under a fence (rabbit), scare off an owl (dog, with a bark
you make by snapping your pinky) and fetch her light from a root tunnel (snail). The ending fills your wall with
fireflies. It's seated, everything is within arm's reach, and a complete story takes about four minutes.

**How we built it.** Meta Immersive Web SDK (three.js + ECS) in TypeScript, running as a WebXR
`immersive-ar` session with passthrough, falling back to a cozy virtual room in VR. One spot light inside the
lantern casts every shadow. Each hand is built from invisible instanced capsules that exist only in the shadow
map. Every visual is drawn in code with canvas paths, every sound is synthesized with WebAudio, and the story
is data-driven. No assets, no servers, no third-party services: it loads in seconds from GitHub Pages.

**Challenges.** Shadow puppets are made *in profile*: a dog shadow needs your hand parallel to the wall, not
pointing at it. Our first recognizer had this backwards, and screenshots of the projected shadows showed it.
We rebuilt the rules around how shadows actually form. Robustness was the other big one. Tracking jitters, so
the recognizer uses soft scores, hysteresis, a 300 ms confirmation hold and dropout forgiveness. We test it
against synthetic hands with seeded noise, different hand sizes, left hands and near-miss poses like the OK sign.
Since we couldn't iterate inside a headset all day, we built a synthetic-hand generator, a debug readout and a
full hands-free demo mode, plus Playwright tests in the IWER emulator.

**Accessibility.** Every creature also has a one-handed alternative (peace sign, open spread palm, thumbs-up,
pointing finger). The game teaches it automatically if you're stuck, and the Shadow Journal lists both ways.

**What's next.** More fables (*The Moon Who Fell Into the Well* is teased in the journal), two-player shadow
plays on one wall with shared spaces, and a "make your own creature" mode where you record a shape and the
lantern learns it.

## How hand interactions are implemented
- **Input:** WebXR Hand Input, all 25 joints per hand, read each frame with batched `fillPoses` /
  `fillJointRadii` (falling back to `getJointPose`).
- **Shadows:** joints and bones become invisible instanced spheres/cylinders that write only to the lantern's
  shadow map, so the wall shows the shadow of *your actual hand*, with your real joint radii.
- **Features:** per-finger curl (summed joint bend), finger spread, ring–pinky "jaw" angle, thumb-to-fingertip
  distances normalised by hand size, palm normal, and pointing directions measured against the wall's frame.
  Two-hand features: thumb-tip hook distance and wrist gap.
- **Classification:** tunable soft-threshold rules per creature → hysteresis (enter 0.68, stay 0.45) → 300 ms hold
  to confirm → 280 ms grace before release. Two hooked thumbs (bird) suppress the single-hand readings of each wing.
- **Continuous control:** the creature follows the projected shadow of your hand; finger-wiggle speed drives
  the bird's flapping; the pinky drives the dog's jaw and snapping it shut barks.
- **System gestures:** palm-up hold opens a poke-to-press pause menu; pinching next to the lantern opens the
  Shadow Journal. No controller is ever needed.
- **Teaching:** a glowing "ghost hand" (the projected shadow of a scripted synthetic hand) shows exactly what
  to make, escalating at 10 s and 20 s.

## What excites us about the future of VR
Hands-free-of-controllers mixed reality turns the oldest human interfaces, gestures and play, into first-class
input. Shadowfolk is a tiny proof that a light, a wall and your hands are still enough for magic. We think the
best MR experiences will feel like that: grounded in your room, instantly understood, and personal, because it's
*your* hand on the wall.

## Target launch date
**December 15, 2026**: public web launch (Quest Browser, free) with a second fable, followed by an installable
PWA listing in early 2027.
