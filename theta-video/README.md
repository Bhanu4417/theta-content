# theta-video

The Theta launch film, generated entirely as code — no editor, no generative
model. Every frame is a pure function of the frame index drawn on a 1920×1080
canvas; headless Chromium screenshots them one by one and FFmpeg stitches the
MP4. Sound is synthesized later and muxed the same way.

## Part 1 — the title card (`out/part1.mp4`, 9.5 s)

Written to match the reference film's opening, measured from it frame by frame:

- background `#040404` flat, with the reference's faint warm lift to `#090708`
  at center; per-pixel grain of ±1/255.
- ink `#F2EADF`, no glow anywhere.
- **Patrick Hand**, glyphs drawn with a 1.2× horizontal stretch — the shape
  match (per-glyph free-scale IoU over 18 handwriting fonts) ranked it first
  and the reference's glyph aspects measure 1.2× Patrick's natural width. The
  reference's line writes over ~3.0 s for 21 glyphs ≈ 140 ms/glyph; the smaller
  attribution line writes at ~60 ms/glyph.
- the headline writes itself on **one line**, left to right, glyph by glyph,
  each glyph popping in whole in a single frame (no fade, no pen cursor), a
  210 ms beat at each period — all measured from the reference.
- the **boiling line**: the ink wobbles ±1 px, redrawn at 10 Hz — the reference
  shows the same hand-drawn redrawing (its band ink oscillates on a ~0.25 s
  cycle while writing and holding).
- one line — "One terminal. Every agent. All at once." — centered at the
  reference's cap height and band position (ours y492–544, reference y491–548),
  with "~ built for flow ~" writing beneath, centered, ≈32 px cap (reference
  y604–642).
- both lines hold at full brightness, then the card dips to black over the
  last 0.5 s so part 2 can cut in.

## Build

```sh
./make.sh            # render 285 frames + mux out/part1.mp4 (30 fps, 9.5 s)
./make.sh 60 7.0     # any frame rate / duration; timeline is in seconds
```

## Files

- `scene.html` — the film: `window.renderAt(frame)` draws frame `frame`.
- `render.mjs` — puppeteer-core driving `/usr/bin/chromium`, one PNG per frame.
- `make.sh` — render + FFmpeg mux.
- `fonts/` — local fonts, loaded via @font-face (no network at render time).

## Later parts

Scenes should extend `scene.html` as additional pure draw functions selected on
`frame`, with their timings declared in seconds alongside the title card's.
Sound effects get synthesized to a WAV and muxed with `-i` in `make.sh`.
