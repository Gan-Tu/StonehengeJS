# StonehengeJS

An interactive Three.js interpretation of Stonehenge on Salisbury Plain, originally created by Gan Tu, Michael Gibbes, and Noah Jacobs for CS184.

The scene includes an approximate present-day ruin layout and a reconstructed circle, weathered sarsen and bluestone materials, a photographic HDR sky, grassy terrain and earthworks, three lighting settings, and Rapier rigid-body physics.

## Run locally

Requires Node.js 20.10 or later.

```sh
npm install
npm run dev
```

Open the address printed by Vite. `npm run build` creates a standalone site in `dist/`; `npm run preview` serves that build locally. Deploy **the contents of `dist/`**, not the source directory. Relative asset paths support hosting under a subdirectory, including GitHub Pages. Scene assets are bundled locally; optional Google Fonts have system fallbacks.

Pushes to `master` run the physics tests, build both versions, and deploy `dist/` to [GitHub Pages](https://gan-tu.github.io/StonehengeJS/) through `.github/workflows/pages.yml`.

## Original app

Choose **Original app** in the new app's header to open the original CS184 scene, including its original textures, physics, particles, audio, and controls. **Back to new app** returns to the new experience in the same tab.

The original app and its assets are preserved under `public/original/` from commit `853f0dc`. They are copied unchanged into production builds, apart from the return navigation and omission of an unused SEA3D plugin whose parent loader was disabled in the original HTML. Its original desktop-oriented layout and behavior are preserved.

## Explore and experiment

- **Explore:** drag to orbit, scroll/pinch to zoom, right-drag or two-finger drag to pan.
- **Launch:** click/tap a stone to throw a heavy sphere; dragging continues to orbit. Impact power controls launch speed and projectile mass.
- **Shockwave:** apply outward and upward impulses to the stones. Try it in **¼× slow motion**.
- **Pause** freezes physics and dust while allowing camera movement. Space toggles pause when the canvas is focused.
- **Restore the stones** (R) rebuilds the selected layout without reloading. Home resets the view. Escape leaves Launch mode.
- Stone fractures and impact audio can be toggled independently. Sound starts only after the user enables it.

Physics runs at 120 Hz with bounded catch-up, continuous collision detection, sleeping bodies, surface friction, and volumetric fragment masses. Fragments inherit their parent's linear and angular motion. Active projectiles and debris are capped at 24 and 180 respectively; old projectiles expire after 25 simulation seconds. Bodies leaving the local terrain are removed. Restore releases the old physics world and mesh geometry.

This is a visual interpretation, **not an archaeological survey or a structural engineering simulation**. Overall dimensions follow [English Heritage's scale guide](https://www.english-heritage.org.uk/siteassets/home/learn/teaching-resources/small-scale-stonehenge_stonehenge-teachers-kit_ks3.pdf); individual ruin placements, surface shapes, and fracture thresholds are approximate. The complete-circle setting is a reconstruction.

## Validation

```sh
npm test
npm run build
```

The physics tests cover resting stability in both layouts, high-speed collision detection, impact fractures, mass conservation, rotated and central-hit fractures, full-circle shockwave stress, fixed-step consistency, and reset/projectile cleanup. Test the rendered scene in a WebGL2 browser; mobile uses a smaller grass instance budget and disables screen-space ambient occlusion. The local dev server exposes read-only `window.stonehenge.stats()` and `positions()` for interaction checks; production builds do not.

## Asset credits

- Stone surface: [Lichen Rock](https://polyhaven.com/a/lichen_rock), Poly Haven, [CC0](https://polyhaven.com/license). Color is desaturated and exposure-adjusted at render time to approximate pale sarsen stone. Normal and roughness maps are included.
- Sky: [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), Poly Haven, CC0.
- Ground diffuse and normal maps: the original project's `grasslight-big` textures from the Three.js examples, derived from [Dark Grass](https://opengameart.org/content/dark-grass) by qubodup (Copyright 2009 Blender Foundation, 2009 Lamoot, 2010 qubodup), under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Retiled and color-adjusted in the material.
- Three.js (MIT), Rapier (Apache-2.0), and Vite (MIT) retain their package licenses.

[Original CS184 project](https://gibbes.github.io/finalproj-cs184/)
