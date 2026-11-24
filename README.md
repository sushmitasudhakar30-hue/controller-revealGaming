# Controller Product-Reveal Animation (3D, 360° spin)

A 10-second, 1080×1920 (9:16), 24 fps product-reveal animation of a **generic** white-and-black game
controller on a black glossy floor – real-time 3D (Three.js) with a full 360° rotation, sci-fi HUD
callouts that track the model, blue electric arcs, bloom, chromatic aberration, film grain and a
synthesised sound track. Runs live in the browser and can be rendered to an MP4.

> **Trademark note:** the controller is an original generic design with no logos. Do not add
> PlayStation/Sony (or any other brand's) logos or copy a protected design for published or client work.

---

## 1. Requirements

| Tool | Version | Needed for |
|---|---|---|
| Node.js | 18 or newer | everything |
| VS Code | any | editing / running |
| ffmpeg (on PATH) | any recent | `npm run render` only |
| Python 3 + numpy | 3.9+ | `npm run audio` only (a ready-made `public/audio.wav` is included) |
| Chrome/Edge | any | live preview |

Check: `node -v`, `ffmpeg -version`, `python --version`.

## 2. Run it in VS Code (quick start)

1. **File → Open Folder…** and choose the `controller-reveal` folder.
2. Open the terminal: **Terminal → New Terminal** (Ctrl+`).
3. Install dependencies (once):
   ```bash
   npm install
   ```
4. Start the live preview:
   ```bash
   npm run dev
   ```
   Your browser opens at <http://localhost:5173>. The animation loops; use the slider to scrub, the button to pause.
   Edits to files in `src/` hot-reload instantly.
5. Alternatively press **Ctrl+Shift+B** (runs the "Start dev server" task) or use
   **Run and Debug → "Run in Chrome"** (start `npm run dev` first).

> Tip: a hardware-accelerated GPU makes the preview smooth. The page renders at 1080×1920 internally and is
> scaled to fit your window.

## 3. Render to MP4

```bash
npm run render              # → out/controller-reveal.mp4  (frames in out/frames)
npm run render -- --fps 30  # different frame rate
npm run render -- --no-audio
```
The script starts the dev server, steps through the timeline frame-by-frame in headless Chromium
(so the result is exact and never drops frames), then encodes with ffmpeg (H.264, CRF 17, yuv420p).
Expect ~3–6 minutes on a typical laptop (software or GPU WebGL).

If Playwright says the browser is missing: `npx playwright install chromium`.

Regenerate the sound track (optional): `pip install numpy` then `npm run audio` → `public/audio.wav`.

## 4. Project structure

```
controller-reveal/
├─ index.html            page shell (canvas + player controls)
├─ package.json          scripts: dev, build, preview, render, audio
├─ vite.config.js
├─ public/audio.wav      synthesised sound (hum, boom, whooshes, zaps, blips)
├─ scripts/
│  ├─ render.mjs         frame-by-frame renderer → MP4
│  └─ audio.py           sound synthesis (numpy)
├─ src/
│  ├─ config.js          ← EDIT: HUD label text, spin start/end time
│  ├─ main.js            scene, timeline, effects, compositing, focus camera/frame
│  ├─ app.js             player + Focus / Scroll modes, 3D cards, slider (UI only)
│  └─ style.css
└─ .vscode/              launch / tasks / recommended extensions
```

## 4b. Interactive modes (new)

Switch with the **Reveal | Focus | Free | Scroll** buttons at the top (or open `/#focus`, `/#free`, `/#scroll`).
The MP4 render is unaffected – these modes only exist in the live page.

| Mode | What it does |
|---|---|
| **Reveal** | The original 10 s loop with the pause button and scrub slider. |
| **Focus** | The **focus-frame slider** (bottom) dollies the camera onto each part: dim-outside-frame, corner brackets, scan line, zoom readout. Drag for a continuous glide between parts; it snaps to the nearest part on release. Click a tick, click a card, or use ← → / Esc. |
| **Free** | **Drag to orbit** the controller in any direction (with inertia), **wheel / two-finger pinch to zoom**, and it idles on a slow turntable after 3.5 s. HUD callouts stay glued to the parts and fade when the front turns away. |
| **Scroll** | **Scroll-triggered demo**: 9 screens. Scroll 1 scrubs the reveal, screens 2–7 focus one part each, screen 8 turns scroll into the 360° spin, screen 9 is the outro. The dots on the left jump between screens. |

* **3D cards** (right side, bottom dock on narrow screens): one per HUD callout, built from `LABELS`. They tilt toward the
  pointer with a moving glare and zoom forward on hover; the active card zooms further and sways. The on-canvas label card of the
  focused part also scales up.
* **Line-by-line reveal**: every text line wipes in left→right with a caret, one after another – on the canvas labels (this is
  in the MP4 too) and on the HTML cards / scroll text (re-plays each time a card or screen becomes active).

Tweak points: per-part camera distance and frame size are `D`, `fw`, `fh` (and optional `fp` focus point) in `CALLS` (`src/main.js`);
scroll screen mapping is `scrollMap()` in `src/app.js`; card/text styling is `src/style.css`.
Debug: `FX` is on `window` (`FX.target = 3` jumps the focus), and `?manual` stops the auto loop so you can call `__frame(ms)` yourself.


## 4c. Advanced features (live page only – the MP4 render is unaffected)

| Feature | How to use it |
|---|---|
| **Free orbit** | `Free` mode: drag to rotate, wheel/pinch to zoom, `R` resets the view. |
| **Finishes** | Colour dots (top right): Arctic, Midnight, Crimson, Violet. Re-colours the shell, glow strips, rim lights, floor glow and UI accent. Remembered in `localStorage`. Edit `FINISHES` in `src/main.js` to add your own. |
| **Auto tour** | `Tour` button or `T` (gamepad **Start**): glides through all 6 parts (3.2 s each), then a full 360° spin, then loops. Any manual input stops it. |
| **Live gamepad** | Plug in / pair any controller (Standard Gamepad mapping) and press a button: both thumbsticks move and tilt, face buttons press in and their rings pulse, the D-pad rocks, bumpers and triggers swing. A green *GAMEPAD LIVE* badge appears. |
| **Sound** | `Sound` button or `M`: the soundtrack plays in sync with Reveal (scrubbing re-syncs it); in Focus/Free/Scroll, switching parts plays a synthesised ping. |
| **Snap** | `Snap` button or `S`: saves the current frame (HUD, bloom and all) as a 1080×1920 PNG. |
| **Hotkeys** | `0`–`6` focus part, `T` tour, `M` sound, `S` snap, `R` reset view, `F` fullscreen, arrows/Esc in Focus. |

Code map: orbit/tour/sound/gamepad/hotkeys are in the "ADVANCED FEATURES" block of `src/app.js`; finishes, the gamepad rig
(`RIGS`, `applyPad`) and orbit/zoom camera maths are in `src/main.js`. Debug: `FX.orbit`, `FX.pad`.

## 5. How it works (detailed)

### 5.1 Two layers
1. **WebGL layer (Three.js)** – the 3D controller, studio lighting, floor and reflection.
2. **2D canvas layer** – everything "graphic": lightning, HUD, particles, bloom, aberration, vignette,
   grain, flash and fades. Each frame the WebGL image is drawn into the 2D canvas, then effects are
   composited on top. This mirrors the guide's "render the 3D pass, finish in a compositor" workflow.

`draw(t)` renders **one frame for time `t` (seconds)** and is a pure function of `t`
(randomness is seeded), which is why offline rendering is deterministic.

### 5.2 The controller model (`makeController()`)
Built entirely from code – no external model file:
- **Shell:** the outline is a Bézier `Shape` (mirror-symmetric) turned into a bevelled `ExtrudeGeometry`
  (12 bevel segments gives the rounded, glossy edge). Material: `MeshPhysicalMaterial` with clear-coat.
- **Face plate, touchpad (+ glowing blue strip), 2 thumbsticks** (base, ring, cap, inner ring), **4 face
  buttons** (plain dots – no symbols), **D-pad, centre buttons**.
- **Shoulder bumpers** at the front lip and **triggers** at the rear.
- **Back side:** dark plate with two glowing light bars, so the 360° turn shows detail all the way round.

Glowing parts use `MeshBasicMaterial` with colour values above 1.0 so they bloom.

### 5.3 Lighting and the "dark studio" look
- `scene.environment` is a **PMREM environment built from emissive strips**: two bright white strips behind
  left/right (rim highlights), a top softbox, soft front/rear fill and four blue low strips. Because the
  controller rotates inside a fixed environment, **reflections sweep across the glossy shell** during the spin.
- One soft white key `DirectionalLight` and two blue rim `DirectionalLight`s.
- Tone mapping: ACES filmic; exposure ramps from near-black to normal during the first 1.6 s (the "reveal").

### 5.4 Floor and reflection
A second copy of the controller is placed under the floor with `scale.y = -1` (a mirror). A
semi-transparent black plane at floor height veils it, and a screen-space gradient fades the
reflection with distance. A soft blue additive disc sits on the floor as a glow.

### 5.5 Timeline

| Time (s) | Event |
|---|---|
| 0.0 – 1.6 | Fade up from black; light sweep; chromatic-aberration settles |
| ~1.2 – 2.2 | Electric arcs ramp in; **big zap + flash at 1.55 s** |
| 1.6 – 3.3 | HUD callouts draw in one by one (ring → leader line → label box → text) |
| 0 – 3.6 | Controller hovers and sways ±8° while the camera pushes in |
| **3.6 – 8.6** | **One full 360° rotation** (ease-in-out cubic); HUD fades out as the front turns away |
| 8.6 – 9.4 | Settles facing front; HUD returns |
| 9.4 – 10.0 | Fade to black (loops cleanly) |

Camera: perspective 30° FOV, dolly from z = 30 → 25.8 and a gentle rise, always looking at the controller.

### 5.6 HUD that tracks the 3D model
Each callout has a point in the controller's local space. Every frame `scr(x,y,z)` converts it with
`root.localToWorld()` → `Vector3.project(camera)` → pixels, so rings and leader lines **stay glued to the
sticks, touchpad, buttons, D-pad and grip** while the model moves. `facing()` is the dot product of the
controller's front normal and the direction to the camera; the HUD opacity is
`smoothstep((facing − 0.35) / 0.5)`, so it only shows when the front is visible.

### 5.7 Lightning
Every ~1/14 s a new random set of 4–6 arcs is generated from anchor points on the lower edges (also
projected from 3D, so they ride the model). Each arc is a jittered polyline drawn three times –
wide blue glow, mid cyan, thin white core – with additive blending. A random flicker multiplier and
occasional dropouts keep it alive.

### 5.8 Post effects (in order)
1. Reflection fade → 2. lightning → 3. HUD → 4. dust/glitch particles → 5. **bloom** (half-res copy,
blurred 18 px, added back at 30 %) → 6. **chromatic aberration** (R/B ghosts, stronger at start and
mid-spin) → 7. vignette → 8. film grain → 9. reveal flash → 10. fade in/out.

### 5.9 Sound (`scripts/audio.py`)
Synthesised with numpy: 55 Hz drone with harmonics, sub-boom at the reveal, band-passed-noise whooshes
timed to the camera/spin, short noisy zaps for arcs, rising tone through the spin, and six HUD blips
timed to the callouts. Output: stereo 44.1 kHz WAV, muxed into the MP4 by `render.mjs`.

## 6. Customising

| I want to… | Change |
|---|---|
| Edit the label text | `LABELS` in `src/config.js` (title / subtitle / small meta line) |
| Change when the spin happens | `TIMELINE.spinStart / spinEnd` in `src/config.js` (re-time the audio in `scripts/audio.py` too) |
| Two turns / reverse | in `spinAngle()` (`src/main.js`): `Math.PI*2*…` → `Math.PI*4*…`, or negate it |
| Change colours (cyan → another) | `cy` in `drawHUD`, the `blue` / `blueDim` materials, and the blue env strips |
| Calmer, less lightning | in `draw()`: lower `n` (`4+…`) or multiply the bolt `alpha` |
| Stronger glow | bloom `globalAlpha` (`.30`) and blur radius (`18px`) |
| Move callout labels | `ly` (label y in px) and `side` (−1 left, 1 right) in `CALLS` |
| Landscape 16:9 | change `W,H` to 1920×1080 in `main.js`, `width/height` in `index.html`, the viewport in `render.mjs`, and re-place the labels |
| Use your own product model | load a `.glb` with `GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`) instead of `makeController()`; keep the HUD points in the model's local space |
| Replace the controller colour | `shell` material `color` |

## 7. Troubleshooting

- **Blank / black page:** open the browser console (F12). WebGL must be enabled; try Chrome/Edge.
- **Render is slow:** software WebGL is slow; run on a machine with a GPU, or lower the resolution (`W,H`).
- **`ffmpeg failed`:** install ffmpeg and make sure `ffmpeg -version` works in the same terminal.
- **Playwright browser missing:** `npx playwright install chromium`.
- **No sound in the preview:** the browser preview is silent by design; sound is added when rendering.
- **Port in use:** change `server.port` in `vite.config.js`.

## 8. Learning path (from the original guide)

Week 1 Blender basics → Week 2 product lighting & camera → Week 3 glow/emission/compositing →
Week 4 HUD graphics, tracking, electricity → Week 5 assemble, sound, render. This project is the same
shot built in code; the concepts (emissive materials, rim lighting, eased camera, tracked overlays,
glow, grain) map one-to-one onto Blender + DaVinci Resolve/After Effects.

## 9. Licence / assets
Code is yours to use. Three.js is MIT. The controller, sounds and text are original/generic. Replace the
sample spec text before using it for a real product, and tell clients if footage is synthetic.
# controller-revealGaming
