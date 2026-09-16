# AR Banner — scan the print, watch the film *on* the artwork

A self-contained, app-free augmented-reality banner.

```
        ┌─────────────────────────────┐
        │  printed banner (A4/A3)     │
        │  ┌───────────────┐  █████   │        phone camera
        │  │   artwork     │  █ QR █  │  ──►   scans the QR  ──►  opens https://…
        │  └───────────────┘  █████   │
        └─────────────────────────────┘                    │
                                                          ▼
                                    browser asks for the camera (one tap)
                                                          │
                            artwork is recognised every frame (MindAR + TF.js)
                                                          │
                                 ▼
                          the film is welded onto the printed artwork
                          and plays as you walk around it
```

The whole visitor flow is three steps:

1. **Scan the QR code** on the printed banner - it opens this page. No app to install.
2. **The camera opens by itself** (the browser only asks for permission; tap *Allow*). The page
   shows a "point your camera at the artwork" prompt over the live camera view.
3. **The film plays anchored to the artwork** - tracked in real 3D, so it stays locked to the
   print and moves exactly with the camera and the hand holding it.

The artwork is recognised by **image tracking** (MindAR + TensorFlow.js in the browser), not by
a black-and-white marker. Everything runs on the device: the camera feed is never uploaded,
recorded or stored.

---

## 1. Deploy the website

The site is 100 % static — upload the runtime folders to any HTTPS host:

| Needed in production | Not needed in production (build/banner material) |
| --- | --- |
| `index.html`, `assets/`, `vendor/` | `build/`, `tools/`, `banner/` |

Any of these work in a minute:

* **Netlify Drop** – drag the whole folder onto <https://app.netlify.com/drop>
* **Cloudflare Pages / Vercel / GitHub Pages** – point it at the repo, no build command
* **Your own server** – just serve the folder over HTTPS (`npx serve`, nginx, …)

### Already deployed

| Host | URL | How it updates |
| --- | --- | --- |
| **GitHub Pages** | https://calyxtoxxx.github.io/jayhoonfunmeetbanner/ | automatically, on every push to `main` |
| **Cloudflare Pages** | https://jayhoonfunmeetbanner.pages.dev/ | direct upload — re-run `tools/deploy-cloudflare.ps1` after changes |

Both serve the same folder over HTTPS, so the camera works on either. `banner/qr.png` points at
the URL in step 2 (currently GitHub Pages) — re-run step 2 to switch hosts.

**Cloudflare Pages, the reliable way.** `tools/deploy-cloudflare.ps1` uploads the folder
directly, which bypasses the Git integration:

```powershell
npx wrangler login          # once, interactive
.\tools\deploy-cloudflare.ps1
# or headless: set $env:CLOUDFLARE_API_TOKEN (Pages:Edit) and $env:CLOUDFLARE_ACCOUNT_ID first
```

If you would rather have Cloudflare build from Git, the settings for this repo are:
framework preset **None**, build command **(empty)**, build output directory **/**,
production branch **main**. The dashboard message *"No deployment available"* means Cloudflare
has a project but has never produced a build — usually because the Cloudflare GitHub App was not
granted access to this repository, the production branch does not match `main`, or a build
command/output directory was set that produces nothing.

Want a custom domain? Cloudflare dashboard → Workers & Pages → `jayhoonfunmeetbanner` →
**Custom domains** (e.g. `banner.jayhoonworlds.com`), then re-run
`node tools/setup-site.js https://banner.jayhoonworlds.com/` and re-print the poster.

> **HTTPS is mandatory.** Browsers only expose the camera in a *secure context*
> (`https://…` or `http://localhost`). On plain `http://192.168.x.x` the page will show a
> friendly warning instead of the camera prompt.

## 2. Point the banner at your URL

```bash
node tools/setup-site.js https://your-site.example/ar/
```

This regenerates `banner/qr.png` / `banner/qr.svg` for that URL and rewrites
`banner/banner.html` from `banner/banner.template.html`.
Run it again any time the URL changes. **No dependencies, no install**: the QR encoder
(`build/vendor/qrcode-generator.js`) and the PNG/SVG writers (`tools/make-qr.js`) are
bundled, so it is plain Node.

## 3. Print the banner

Open `banner/banner.html` in Chrome → **Print → A4 landscape** (A3 works too and makes the
artwork easier to track). Margins: none/`Default`. Enable **Background graphics** so the dark
AR styling prints. Pre-rendered outputs are included:

* `banner/banner.pdf` – print-ready, 1 page, A4 landscape
* `banner/banner.png` – 2246 × 1588 preview/screen version

Then scan the QR with a phone and point the camera at the printed artwork.

---

## Test it on your computer first

```bash
node tools/serve.js                 # → http://localhost:8080   (localhost counts as secure)
node tools/serve.js --port 3000     # different port
node tools/serve.js --https         # self-signed TLS, for testing on a phone over wifi
```

`localhost` is a secure context, so Chrome/Edge on the same computer can use the camera with no certificate at all.
For a **phone on the same wifi**, use `--https` and accept the certificate
warning (iOS requires a trusted certificate for the camera; the self-signed one only produces a
warning you can dismiss — if the camera stays blocked, deploy to a real HTTPS host instead).

---

## `index.html` — the AR page

There is deliberately nothing else: no menu, no settings, no fallback player, no quality switch,
no debug parameters. The page is one file with three screens and one 3D object.

| Piece | What it does |
| --- | --- |
| `#start` | One button. The tap is what the browser needs to open the camera (and to allow sound later). |
| `#scan` | "Point your camera at the artwork" prompt. MindAR shows it while the artwork is not in view and hides it the moment tracking locks. |
| `#error` | A single line of text if the camera cannot be opened. |
| `#arVideo` (`#media`) | The film. It sits off-screen so it can feed the 3D texture without being visible. |
| `<a-scene mindar-image>` | The AR engine; `assets/targets.mind` is the compiled artwork. |
| `#anchor` → `#group` → `#film` | The film plane is a child of the tracked anchor, so it inherits the artwork's pose every frame. |

There is no start screen: a small `boot()` poll waits for MindAR to be configured and calls
`start()` immediately, so the camera opens as soon as the page loads. If a browser blocks that
(some iOS versions want a gesture) the hidden `#retry` button appears; the rest of the time it
never shows.

Sound: playback is asked for unmuted and silently falls back to muted if the autoplay policy
refuses; the first touch anywhere on the page turns the sound on, so no sound button is needed.

Two implementation notes worth keeping:

* **The dark page colour must be set on `<html>`, never on `<body>`.** MindAR draws the camera
  `<video>` at `z-index:-2`, and an in-flow block background on `<body>` paints *above*
  negative-z-index children - the camera feed then looks blank/black until the artwork is found.
* **Camera resolution**: MindAR asks for `{facingMode:'environment'}` with no size, so phones
  hand back a low-res 640x480 stream. The page wraps `navigator.mediaDevices.getUserMedia` and
  injects `width/height/frameRate` ideals (1920x1080 @30fps); the browser falls back to whatever
  the device supports. Lower the numbers in that wrapper if an older phone struggles.

### Tuning the tracking

In the `mindar-image` attribute on `<a-scene>`:

* `missTolerance` (default `6`) - frames the target may be missing before it counts as lost
  (raise it if the film flickers off when the phone shakes).
* `warmupTolerance` (default `4`) - frames needed before the target is reported as found.
* `filterMinCF` / `filterBeta` - the pose filter: jitter versus lag.
* `maxTrack: 1` - simultaneous targets (one target is compiled).

Because the film is a child of the anchor, **its size lives in the markup**: `#film` uses
`width="1" height="0.3558"` - the artwork's aspect (3120 × 1110). If you change the artwork,
update those two numbers (and the glow plane around it, `1.05` × `0.3736`).
`position="0 0 0.004"` lifts the film a hair off the artwork to avoid z-fighting.

---

## Rebuilding the assets

Only needed when the **artwork** or the **film** changes.

### 1. Install the compiler (only if the artwork changes)

```bash
node build/setup-toolchain.mjs --compiler    # mind-ar + @napi-rs/canvas shim, no Python needed
```

`mind-ar` pulls in the native `canvas` package, which normally needs Python + Visual Studio /
Xcode. We do not need it — the installer uses `--ignore-scripts` and shims `canvas` onto the
prebuilt `@napi-rs/canvas`, which is all the offline compiler actually uses.

### 2. Compile the artwork (image target)

```bash
cd build
node compile-target.mjs ../assets/target.png ../assets/targets.mind
```

Use a sharp, high-contrast version of the printed artwork (the shipped image is
3120 × 1110). MindAR extracts FREAK features + descriptors; the resulting `.mind` is the
only file the browser needs (currently ~1 MB). **Recompile whenever the artwork changes** —
the tracker is matching the *printed* pixels.

### 3. Re-encode the film

```bash
# one film file: assets/video.mp4  (faststart = starts playing while still downloading)
ffmpeg -i input.mp4 -vf scale=1920:-2 -c:v libx264 -preset medium -crf 23 \
       -profile:v high -level 4.1 -pix_fmt yuv420p -movflags +faststart \
       -c:a aac -b:a 128k -ac 2 assets/video.mp4
```

Keep H.264 + AAC (`.mp4`); iOS will not play many other combinations in this context.

### 4. Regenerate the QR + banner

```bash
node tools/setup-site.js https://your-site.example/ar/
```

---

## Verification

```bash
node build/verify.mjs                # all suites
node build/verify.mjs --only=banner  # print layout + QR decode
node build/verify.mjs --only=ar      # app boot, camera, film
node build/verify.mjs --only=detect  # REAL image tracking, end to end
node build/verify.mjs --base=https://your-site/ --only=all   # verify a DEPLOYMENT (not localhost)
```

Requirements: Google Chrome (or `CHROME=<path>`) and `ffmpeg` for the detection suite.
No npm packages are needed for verification.

What it actually checks (headless Chrome + DevTools protocol, `build/cdp-check.mjs`):

1. **banner print layout** – A4 landscape, nothing overflows or is clipped, artwork printed
   ≥ 250 mm wide, QR ≥ 45 mm.
2. **printed QR decodes** – the QR is decoded straight out of the rendered `banner.png`
   (and `qr.png`) in the browser with the vendored decoder (`build/vendor/jsqr.js`) and
   asserted to encode exactly the URL in `banner/URL.txt`.
3. **app boot** – libraries load, A-Frame scene initialises, exactly one button exists on the
   page (nothing else), one tap starts the camera (fake camera), `arReady` fires, `.mind` and
   `video.mp4` are fetched, the film is bound as a video texture and the plane matches the
   artwork aspect.
4. **image tracking (end to end)** – the artwork itself is fed in as a fake camera feed;
   the test asserts `targetFound`, the anchor becomes visible, MindAR hides its scanning UI,
   the film plays, the pop-in animation completes, the overlay is upright/unmirrored and
   exactly the artwork's size, and that tracking stays locked for several seconds.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Camera unavailable" / permission prompt never appears | Serve over **HTTPS** (or localhost). In-app browsers (Instagram, Facebook, WeChat, LinkedIn) often block the camera — tell visitors to open in Safari/Chrome ("⋯ → Open in browser"). |
| Start leaves you on the prompt forever | Either the camera is blocked (see above) or the device has no WebGL. The page replaces the prompt with a single line of text after 12 s. |
| Artwork not recognised | Print bigger (A3), avoid glare, use even light, keep the *whole* artwork in frame, don't cover it with your hand, and recompile `targets.mind` if the artwork was edited. Very low-contrast or repetitive images track badly. |
| Film appears but no sound | The browser refused unmuted autoplay, so the page fell back to silent playback (this is the only way to keep it button-free). On most phones the first tap on **Start** is enough for sound. |
| Film stutters on old phones | Re-encode `assets/video.mp4` smaller: `-vf scale=1280:-2 -crf 27`. |
| Tracking drifts/jitters | Raise `filterBeta` (more smoothing), or lower `missTolerance` to lose the target faster. |

## Files

```
index.html                  the AR page (single file: markup + CSS + app logic)
assets/
  target.png                the artwork as printed (source for the tracker + banner)
  targets.mind              compiled image target used by MindAR (~1 MB)
  video.mp4                 the film: 1920x682 H.264/AAC, faststart (9.8 MB)
vendor/
  aframe-v1.5.0.min.js      A-Frame 1.5.0 (MIT)
  mindar-image-aframe.prod.js  MindAR 1.2.5 image tracking + A-Frame glue (MIT, bundles three.js + TensorFlow.js)
banner/
  banner.template.html      printable A4 landscape poster ({{URL}} placeholder)
  banner.html              generated poster for the current URL
  qr.png / qr.svg          generated QR codes
  banner.pdf / banner.png  rendered print-ready PDF + preview
  URL.txt                  the URL the banner currently points at
tools/
  serve.js                 zero-dependency dev server (range requests, optional --https)
  setup-site.js            regenerate QR + banner for a URL (no dependencies)
  make-qr.js               bundled QR encoder + minimal PNG/SVG writer
  deploy-cloudflare.ps1    direct-upload deploy to Cloudflare Pages
build/
  verify.mjs               one-command verification (see above)
  cdp-check.mjs            headless-Chrome/CDP test harness
  checks-*.mjs             the individual test suites (banner, QR, app, tracking)
  compile-target.mjs       artwork → .mind (MindAR offline compiler, run after --compiler)
  setup-toolchain.mjs      optional: installs the image-target compiler
  vendor/qrcode-generator.js  MIT QR encoder used by tools/make-qr.js
  vendor/jsqr.js           Apache-2.0 QR decoder used by the verification suite
```

## Third-party

Vendored for self-hosting and offline reliability: [A-Frame](https://aframe.io) 1.5.0 (MIT),
[MindAR](https://github.com/hiukim/mind-ar-js) 1.2.5 (MIT, bundles three.js – MIT – and
TensorFlow.js – Apache-2.0). Build/verification extras: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
(MIT) for QR encoding and [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0) for decoding it
back as a test. The artwork and film belong to their owner.
