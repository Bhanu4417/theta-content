# bench — "there was always more to do!"

The launch-bench film, cut in the classic look (cream halftone paper, ink
diagram, film grain) with the benchmark numbers measured on this machine.

- **0.0 – 5.4 s** — cold open on black: *"there was always more to do!"*
  typed in with the bouncing strike, then the whole frame rises away.
- **5.4 – 14.2 s** — the paper bench: two measurement tables (A *resuming a
  chat*, B *starting fresh*), hatched bars growing per harness with an
  accelerating ratchet under each one, and theta's **6 ms** stamped big on the
  left. claude shows **≈ 600 ms** — its window paints at ~251 ms fresh, so a
  resumed chat is estimated in line with the pack.
- **14.2 – 20.0 s** — the classic outro: the pixel **Th** assembling on paper,
  *"The harness that lets you work more."*, *"Launching soon."*, fade out.

Icons are kept simple: the θ pixel mark, π, a four-point spark (agy), and the
real logos for codex / claude / opencode.

## Build

```sh
./make.sh          # 30 fps, 20 s → out/theta-bench.mp4
./make.sh 60 20.0  # any fps/duration
```

Pipeline: `audio.mjs` synthesises the score (pad, keystroke clicks, a ratchet
+ thock per bar, whoosh on the push, D-major resolve under the mark) →
`render.mjs` screenshots frames with system Chromium → ffmpeg muxes.
`verify.mjs` loads key times and pixel-probes the canvas.

All timing (typed strings, bar landings, sound hits) lives in `timeline.js` —
the renderer and the synthesiser both read it, so they never drift apart.

Output: `out/theta-bench.mp4` (1920×1080, 30 fps, 20 s, AAC audio).
