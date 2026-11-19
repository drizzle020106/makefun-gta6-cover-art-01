# Vice Cover Studio — Make GTA 6 Cover Art

[![Make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/drizzle020106/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/drizzle020106/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn your photo and a caption into poster-style cover art — a multi-panel
layout, a Vice City sunset / neon colour grade, and bold display lettering —
and export it as a PNG ready to post.

## What it does

- **Multi-panel covers** — pick a layout (Hero + two, Four panels, Hero + strip) and the panels adapt to the export size.
- **Any photo** — upload your own photos (read locally in your browser, never sent anywhere) or use the two built-in sample photos. One photo can fill several panels, or each panel can have its own.
- **Crop and position per panel** — drag the photo inside the preview, scroll to zoom, or use the zoom and position sliders.
- **Colour grade** — Sunset (warm orange and magenta), Neon nights (cyan and pink) or Dusk (deep purple), applied per panel.
- **Bold caption lettering** — editable caption and tagline, set in Anton (SIL Open Font License, shipped under `app/fonts/`) with a sunset gradient fill and a hard outline.
- **One-click PNG export** — 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## Try it

Serve `app/` with any static server, for example:

```sh
node serve.ts
```

then open <http://localhost:8080>. Everything runs offline in the browser; the app makes no network requests.

## How the cover is made

`app/src/cover.js` draws the cover on a canvas: each panel draws its photo
cover-fit with the panel's zoom and offset, applies a canvas filter plus a
warm or neon gradient wash and a vignette, then the caption is drawn with a
gradient fill, dark outline and drop shadow over a scrim at the foot of the
cover. `app/src/main.js` wires the editor (photos, layout, caption, panel
controls, drag/zoom, export); `app/src/shots.js` provides the deterministic
`?shot=` scenes used for the screenshots.

## Screenshots

`1-cover.jpg` is an exported 1920 × 1080 cover, `2-editor.jpg` shows the
editor with a photo loaded, `3-cover.jpg` and `4-cover.jpg` are exported
covers in the other post sizes (1080 × 1080 and 1080 × 1350).

## License

MIT — see [LICENSE](LICENSE). The Anton font is licensed under the SIL Open
Font License 1.1 (see `app/fonts/OFL.txt`). No game artwork, logo or font is
used; all code and art in this repository is original.
