# Decisions

A running log of design and engineering choices, newest at the bottom.

1. **Repo.** Hosted at `Yashika2211/metaaihackathon` (the existing repo), served by GitHub Pages at
   `https://yashika2211.github.io/metaaihackathon/`. Vite `base: './'` so the build works under any sub-path.
2. **Scaffold.** Generated with `@iwsdk/create@1.1.0` (`--target ar --language ts`). Kept the runtime
   (`@iwsdk/core`, super-three 0.185) and the dev plugin (IWER emulator). Dropped the sample robot/panel scene,
   the editor-agent guidance folders and `@meta-quest/metavr` (it collects usage data; the rules ask for no
   third-party services).
3. **World options in code, not scene JSON.** Everything in Shadowfolk is procedural, so there is no authored
   scene. `World.create` gets its options from `src/main.ts` directly.
4. **Session mode.** Probe `navigator.xr.isSessionSupported('immersive-ar')` first. If AR is available we use
   passthrough; otherwise `immersive-vr` with a dim, cozy procedural room. With no WebXR at all the page still
   runs as a desktop preview with synthetic hands (for judging, demo and recording).
5. **Shadows via ShadowMaterial overlay.** The wall is an unlit parchment plane plus a `ShadowMaterial` plane
   on top. That lets us fade the hand shadow independently (when a creature "peels off") and keeps lighting
   cost at one spot light with a 1024² map.
6. **Hands are invisible shadow casters.** Instanced spheres + cylinders per hand with `colorWrite: false`, so
   they write into the shadow map but never into the eye buffers. 2 draw calls per hand per pass.
7. **Silhouettes are canvas-drawn.** Creatures and scenery are drawn with 2D canvas paths (with `blur` for soft
   puppet-theatre edges) into `CanvasTexture`s on planes. Cheap, fully procedural, few draw calls.
8. **Recognizer works in a "wall frame".** Features are computed against a forward (toward the wall) and up
   vector so the same pose reads the same after recenter. The recognizer never imports three.js.
9. **Accessibility alternatives** are separate, more forgiving one-handed poses that map to the same creature
   (peace sign up → rabbit, spread palm → bird, thumbs-up → dog, point at wall → snail).
10. **Four puzzle beats instead of three.** The brief asked for three; a fourth short snail beat lets every
    creature appear once in the fable and keeps the run at ~4 minutes.
11. **Profile poses for dog and snail.** Real shadow puppets are made with the hand parallel to the wall. The
    first rules wanted the dog "side-on" with fingers pointing at the wall, whose shadow is foreshortened into
    a blob. Screenshots of the projected shadows made this obvious; the dog is now a flat hand facing the wall
    with fingers pointing sideways, and the snail's antennae just need to be level.
12. **Two-handed bird wins.** Each wing hand of the bird also looks like a dog. Hooked thumbs are unmistakable,
    so the bird score multiplicatively suppresses all single-hand scores.
13. **Spread thresholds from noise.** Seeded 3 mm joint noise moves the measured finger spread of a relaxed hand
    up to ~0.19 rad, so the one-handed bird needs ≥ 0.27 rad (a deliberately spread hand measures 0.35+).
14. **No CDN input models.** IWSDK's input layer downloads controller/hand GLBs from a public CDN. The player's
    real hands are visible in passthrough and the shadows are the hand visuals, so
    `XRInputVisualAdapter.createVisual` is replaced with a no-op. An e2e test asserts zero third-party requests.
15. **Audio and autoplay.** Audio starts on the "Light the lantern" gesture. `?demo=1` auto-starts for recording,
    so its audio unlocks on the first click or key press.
16. **Recenter on XR frames.** `window.requestAnimationFrame` is paused during immersive sessions, so the
    session-start recenter counts XR ticks instead.
17. **Palm-up only opens the menu when no creature is bound**, so a flapping bird or a dog that tilts doesn't
    accidentally pause the story.
18. **Fixed foveation 0.6** to keep fill-rate low on Quest; the wall sits near the centre of view.
