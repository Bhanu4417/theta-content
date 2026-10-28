/*
 * Shared timing for the bench film. The renderer and the synthesiser must
 * agree on every keystroke, bar landing and scene cut, so all of it lives
 * here. UMD on purpose, like the classic cut.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TL = factory();
})(typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FPS = 30;
  const W = 1920;
  const H = 1080;
  const D = 20.0; // seconds

  // [start, end] per scene. cold -> bench is a vertical push (PUSH seconds),
  // bench -> finale is the classic crossfade over FADE seconds.
  const SCENES = {
    cold:   [0.0, 5.4],
    bench:  [5.4, 14.2],
    finale: [14.2, 20.0],
  };
  const FADE = 0.6;
  const PUSH = 0.9;

  const TYPES = [
    { id: "q",      t0: 0.70, cps: 11.0, text: "there was always more to do!" },
    { id: "b-head", t0: 5.90, cps: 20.0, text: "the launch bench" },
    { id: "a-head", t0: 6.30, cps: 22.0, text: "resuming a chat" },
    { id: "b-cap",  t0: 13.0, cps: 26.0, text: "real pty" },
  ];

  // The two measured tables, in the order they animate.
  // `ms` drives the bar length, `land` is the local bench time the bar
  // finishes growing (the audio marks the same instant).
  const RESUME = [
    { key: "theta",    name: "theta",    ms: 6,    label: "6 ms",     land: 2.05 },
    { key: "pi",       name: "pi",       ms: 467,  label: "467 ms",   land: 2.31 },
    { key: "agy",      name: "agy",      ms: 588,  label: "588 ms",   land: 2.57 },
    { key: "claude",   name: "claude",   ms: 600,  label: "≈ 600 ms", land: 2.83 },
    { key: "codex",    name: "codex",    ms: 1376, label: "1376 ms",  land: 3.09 },
    { key: "opencode", name: "opencode", ms: 2850, label: "2850 ms",  land: 3.35 },
  ];
  const FRESH = [
    { key: "theta",    name: "theta",    ms: 6,    label: "6 ms",             land: 6.20 },
    { key: "agy",      name: "agy",      ms: 588,  label: "588 ms",           land: 6.42 },
    { key: "codex",    name: "codex",    ms: 309,  label: "309 ms",           land: 6.64 },
    { key: "pi",       name: "pi",       ms: 449,  label: "449 ms",           land: 6.86 },
    { key: "claude",   name: "claude",   ms: 251,  label: "251 ms → screen",  land: 7.08 },
    { key: "opencode", name: "opencode", ms: 2920, label: "2920 ms",          land: 7.30 },
  ];

  const HITS = [
    { t: 4.60, kind: "whoosh" },   // the push up into the paper
    // box A bar landings (bench local + 5.4)
    { t: 5.4 + 3.60, kind: "converge" }, // the big 6 ms stamp
    { t: 5.4 + 7.90, kind: "ring" },  // both tables settled
    { t: 14.20, kind: "whoosh" },  // into the finale
    { t: 14.60, kind: "pixel" }, { t: 14.70, kind: "pixel" }, { t: 14.80, kind: "pixel" },
    { t: 14.90, kind: "pixel" }, { t: 15.00, kind: "pixel" }, { t: 15.10, kind: "pixel" },
    { t: 15.20, kind: "pixel" }, { t: 15.30, kind: "pixel" }, { t: 15.40, kind: "pixel" },
    { t: 15.50, kind: "pixel" }, { t: 15.60, kind: "pixel" }, { t: 15.70, kind: "pixel" },
    { t: 15.90, kind: "pixel" }, { t: 16.00, kind: "pixel" },
    { t: 16.30, kind: "ring" },
    { t: 16.50, kind: "final" },
  ];

  function typeById(id) { return TYPES.find((x) => x.id === id); }

  function charsAt(def, t) {
    if (t <= def.t0) return 0;
    return Math.min(def.text.length, Math.floor((t - def.t0) * def.cps));
  }

  function keystrokes() {
    const out = [];
    for (const def of TYPES) {
      const n = def.text.length;
      for (let i = 0; i < n; i++) {
        if (def.text[i] === " ") continue;
        out.push({ t: def.t0 + i / def.cps, id: def.id, ch: def.text[i] });
      }
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  return { FPS, W, H, D, SCENES, FADE, PUSH, TYPES, RESUME, FRESH, HITS, typeById, charsAt, keystrokes };
});
