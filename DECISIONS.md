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
