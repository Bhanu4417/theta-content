#!/usr/bin/env node
/*
 * The bench film's soundtrack, synthesised from nothing: a D-minor pad under
 * the cold open, keystroke clicks on every typed character, a whoosh on the
 * push into the paper, plucks on every bar landing, a low stumble where
 * claude fails to log in, a converge under the big 6 ms, and the classic
 * D-major resolve under the mark. Output: out/audio.wav (48 kHz stereo).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./timeline.js";
const TL = globalThis.TL;

const here = dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const D = TL.D;
const N = Math.floor(D * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

const NOTE = (() => {
  const names = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  return (n) => {
    const m = n.match(/^([A-G]#?)(\d)$/);
    return 440 * Math.pow(2, (names[m[1]] + (parseInt(m[2]) - 4) * 12 - 9) / 12);
  };
})();

function rnd(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 14), 1 | a)) >>> 0;
    return t / 4294967296;
  };
}

/* one voice: osc -> one-pole LP -> pan -> exponential env */
function voice({ t0, dur, freq, type = "tri", gain = 0.1, attack = 0.01, release = 0.3,
                 cutoff = 4000, pan = 0, glideTo = null, detune = 0 }) {
  const start = Math.floor(t0 * SR);
  const total = Math.floor((dur + release) * SR);
  const lpK = Math.exp(-2 * Math.PI * cutoff / SR);
  const lfo = detune ? Math.pow(2, detune / 1200) : 1;
  const gl = glideTo ? Math.log(glideTo / freq) : 0;
  let lpL = 0, lpR = 0;
  const glT = 0.5;
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= N) break;
    const t = i / SR;
    let f = freq;
    if (glideTo) f = freq * Math.exp(gl * Math.min(1, t / glT));
    const ph = 2 * Math.PI * f * t;
    const phd = 2 * Math.PI * f * lfo * t;
    let v;
    if (type === "sine") v = Math.sin(ph);
    else if (type === "tri") v = 2 / Math.PI * Math.asin(Math.sin(ph));
    else if (type === "saw") v = 2 * ((f * t) % 1) - 1;
    else if (type === "square") v = Math.sin(ph) >= 0 ? 0.7 : -0.7;
    else v = Math.sin(ph);
    let out = 0;
    if (detune) out = 0.6 * v + 0.4 * (type === "sine" ? Math.sin(phd) : 2 / Math.PI * Math.asin(Math.sin(phd)));
    else out = v;
    lpL = lpK * lpL + (1 - lpK) * out;
    lpR = lpK * lpR + (1 - lpK) * out;
    const gl2 = gain * (pan < 0 ? 1 : 1 - pan);
    const gr2 = gain * (pan > 0 ? 1 : 1 + pan);
    const envA = Math.min(1, t / Math.max(attack, 1e-4));
    const envR = Math.exp(-Math.max(0, t - dur) / (release / 3));
    const env = envA * envR;
    L[idx] += lpL * gl2 * env;
    R[idx] += lpR * gr2 * env;
  }
}
/* short noise burst through LP/HP-ish shaping */
function noise({ t0, dur, gain = 0.1, cutoff = 6000, pan = 0, sweepTo = null, seed = 7 }) {
  const start = Math.floor(t0 * SR);
  const total = Math.floor(dur * SR);
  const r = rnd(seed);
  let lp = 0;
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= N) break;
    const t = i / SR;
    let k2 = Math.exp(-2 * Math.PI * cutoff / SR);
    if (sweepTo) k2 = Math.exp(-2 * Math.PI * lerp(cutoff, sweepTo, t / dur) / SR);
    const w = r() * 2 - 1;
    lp = k2 * lp + (1 - k2) * w;
    const env = Math.exp(-t / (dur / 3.2));
    const gl = gain * (pan < 0 ? 1 : 1 - pan) * env;
    const gr = gain * (pan > 0 ? 1 : 1 + pan) * env;
    L[idx] += lp * gl;
    R[idx] += lp * gr;
  }
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------ the score */
const BEAT = 60 / 92;           // 0.6522

function pad(t0, dur, notes, gain, cutoff = 1500) {
  for (let i = 0; i < notes.length; i++) {
    voice({ t0, dur, freq: NOTE(notes[i]), type: "tri", gain: gain / Math.sqrt(notes.length),
            attack: Math.min(1.2, dur * 0.25), release: 1.6, cutoff, pan: (i - notes.length / 2) * 0.14, detune: 6 });
    voice({ t0, dur, freq: NOTE(notes[i]), type: "sine", gain: gain / notes.length,
            attack: Math.min(1.2, dur * 0.25), release: 1.6, cutoff: cutoff * 1.4, pan: -(i - notes.length / 2) * 0.1 });
  }
}
function bass(t0, dur, note, gain = 0.11) {
  voice({ t0, dur, freq: NOTE(note), type: "sine", gain, attack: 0.02, release: 0.25, cutoff: 500 });
  voice({ t0, dur, freq: NOTE(note) * 2, type: "tri", gain: gain * 0.25, attack: 0.02, release: 0.2, cutoff: 700 });
}
function pluck(t0, note, gain = 0.08, pan = 0) {
  voice({ t0, dur: 0.04, freq: NOTE(note), type: "tri", gain, attack: 0.002, release: 0.28, cutoff: 3400, pan });
  voice({ t0, dur: 0.04, freq: NOTE(note) * 2.001, type: "sine", gain: gain * 0.3, attack: 0.002, release: 0.18, cutoff: 5000, pan: -pan });
}
function arp8(t0, notes, gain, gap) {
  for (let i = 0; i < notes.length; i++) {
    pluck(t0 + i * gap, notes[i], gain, (i % 2 ? 0.3 : -0.3));
  }
}

/* cold open: air under the quote */
pad(0.2, 5.2, ["D3", "F3", "A3", "E4"], 0.05, 1100);

/* the bench: paper, warmer, one chord per beat of the tables */
pad(5.4, 1.8, ["F2", "A3", "C4", "E4"], 0.085);
pad(7.2, 1.8, ["C2", "G3", "C4", "E4"], 0.085);
pad(9.0, 1.8, ["D2", "A3", "D4", "F4"], 0.085);
pad(10.8, 1.8, ["A#1", "F3", "A3", "D4"], 0.08);
pad(12.6, 1.6, ["F2", "A3", "C4", "E4"], 0.07);
arp8(6.2, ["F4", "A4", "C5", "E5", "C5", "A4"], 0.034, BEAT / 2);
arp8(11.6, ["D4", "F4", "A4", "C5", "A4", "F4"], 0.03, BEAT / 2);

/* finale: Gm question, then the D-major resolve */
pad(14.2, 1.7, ["G1", "G3", "A#3", "D4"], 0.085);
bass(14.2, 1.7, "G1", 0.1);
pad(16.3, 3.2, ["D2", "D3", "A3", "D4", "F#4", "A4"], 0.12, 2600);
bass(16.3, 3.0, "D2", 0.12);
voice({ t0: 16.3, dur: 3.0, freq: NOTE("D5"), type: "sine", gain: 0.03, attack: 1.2, release: 1.4, cutoff: 5000 });
voice({ t0: 16.3, dur: 3.0, freq: NOTE("A5"), type: "sine", gain: 0.018, attack: 1.6, release: 1.4, cutoff: 6000, pan: 0.3 });
for (let i = 0; i < 5; i++) pluck(17.6 + i * BEAT, ["A4", "D5", "F#5", "A5", "D6"][i], 0.045, i % 2 ? 0.35 : -0.35);

/* ------------------------------------------------------------- the SFX */
function rndSeed(t) { return rnd((t * 1000) | 0)(); }
for (const k of TL.keystrokes()) {
  const g = k.id === "q" ? 0.055 : 0.036;
  noise({ t0: k.t, dur: 0.012, gain: g, cutoff: 5200, seed: (k.t * 7919) | 0, pan: (rndSeed(k.t) - 0.5) * 0.5 });
  voice({ t0: k.t, dur: 0.006, freq: 2100 + rndSeed(k.t) * 700, type: "sine", gain: g * 0.5, attack: 0.001, release: 0.012, cutoff: 6000 });
}
/* bars: while a bar grows you hear an accelerating ratchet (pitch rising
 * with the fill); when it lands, a low thock plus a note pitched by how
 * fast the harness was — theta bright and high, opencode low and slow. */
const RATCHET = (function () {
  const rows = [];
  for (const tab of [TL.RESUME, TL.FRESH]) {
    const byMs = [...tab].sort((a, b) => a.ms - b.ms);
    for (const r of tab) rows.push({ land: 5.4 + r.land, ms: r.ms, pan: 0, rank: byMs.indexOf(r) / Math.max(1, byMs.length - 1) });
  }
  return rows;
})();
const SCALE6 = ["D5", "A4", "F4", "C4", "A3", "F3"]; // fast -> slow
function tick(t0, freq, gain, pan) {
  noise({ t0, dur: 0.012, gain, cutoff: 4200 + freq, seed: (t0 * 7919 + freq) | 0, pan });
  voice({ t0, dur: 0.008, freq, type: "sine", gain: gain * 0.9, attack: 0.001, release: 0.014, cutoff: 7000, pan });
}
function thock(t0, gain, pan) {
  voice({ t0, dur: 0.07, freq: 165, type: "sine", gain, attack: 0.002, release: 0.09, cutoff: 420, pan });
  noise({ t0, dur: 0.03, gain: gain * 0.7, cutoff: 1300, seed: (t0 * 104729) | 0, pan });
}
for (const r of RATCHET) {
  const GROW = 0.75, t0 = r.land;
  // ratchet: ticks get quicker and higher as the bar fills
  let tt = GROW, i = 0;
  while (tt > 0.03 && i < 48) {
    const u = 1 - tt / GROW;              // 0..1 across the growth
    tick(t0 - tt, 950 + 1500 * u * u, 0.016 + 0.013 * u, r.pan);
    tt -= 0.105 - 0.062 * u;              // accelerating
    i++;
  }
  // landing: thock + snap + the harness's note (bright for fast)
  thock(t0, 0.085, r.pan);
  pluck(t0, SCALE6[Math.min(5, Math.round(r.rank * 5))], 0.075, r.pan);
}

let PIX_I = 0;
// The Th forming out of pixels gets its own voice: one breathy swell rising
// under the whole assembly, and a tick per pixel that climbs in pitch as the
// mark fills in — the sound of a picture being pushed onto paper.
const PIXES = TL.HITS.filter((h) => h.kind === "pixel");
const PIX_N = Math.max(1, PIXES.length);
if (PIXES.length) {
  noise({
    t0: PIXES[0].t - 0.35,
    dur: PIXES[PIXES.length - 1].t - PIXES[0].t + 0.8,
    gain: 0.03, cutoff: 480, sweepTo: 3600, seed: 57,
  });
}
for (const h of TL.HITS) {
  switch (h.kind) {
    case "whoosh":
      noise({ t0: h.t - 0.18, dur: 0.55, gain: 0.085, cutoff: 260, sweepTo: 3200, seed: 41 });
      break;
    case "converge":
      voice({ t0: h.t, dur: 1.1, freq: NOTE("D3"), type: "saw", gain: 0.075, attack: 0.5, release: 0.6, cutoff: 260, detune: 8 });
      voice({ t0: h.t, dur: 1.1, freq: NOTE("D4"), type: "tri", gain: 0.06, attack: 0.5, release: 0.6, cutoff: 500 });
      voice({ t0: h.t + 0.35, dur: 0.8, freq: NOTE("A3"), type: "tri", gain: 0.05, attack: 0.3, release: 0.5, cutoff: 700 });
      break;
    case "pixel": {
      // one tick per rect of the mark, rising through the formation, gently
      // ping-ponging in stereo, with a soft bell every fourth pixel
      const i = PIX_I++, u = i / Math.max(1, PIX_N - 1);
      const pan = (i % 2 ? 0.28 : -0.28);
      noise({ t0: h.t, dur: 0.02, gain: 0.042, cutoff: 2400 + 2200 * u, seed: (i * 7823 + 11) | 0, pan });
      voice({ t0: h.t, dur: 0.05, freq: 330 * Math.pow(2, u * 0.85), type: "sine", gain: 0.05, attack: 0.002, release: 0.09, cutoff: 5200, pan });
      if (i % 4 === 3) pluck(h.t + 0.02, ["D5", "F5", "A5", "D6"][(i / 4) | 0] || "D6", 0.05, pan * 0.6);
      break;
    }
    case "ring":
      voice({ t0: h.t, dur: 1.6, freq: NOTE("D2"), type: "sine", gain: 0.13, attack: 0.01, release: 1.2, cutoff: 400 });
      noise({ t0: h.t, dur: 1.3, gain: 0.045, cutoff: 900, sweepTo: 5200, seed: 91 });
      break;
    case "final":
      noise({ t0: h.t, dur: 0.8, gain: 0.05, cutoff: 400, sweepTo: 6000, seed: 13 });
      break;
  }
}

/* --------------------------------------------------- reverb, fade, write */
const FB1 = 0.19 * SR, FB2 = 0.287 * SR;
const d1L = new Float32Array(FB1 | 0), d1R = new Float32Array(FB2 | 0);
const d2L = new Float32Array(FB2 | 0), d2R = new Float32Array(FB1 | 0);
let i1 = 0, i2 = 0;
const rvK = Math.exp(-2 * Math.PI * 4200 / SR);
let rv1L = 0, rv1R = 0, rv2L = 0, rv2R = 0;
for (let i = 0; i < N; i++) {
  const dl1 = d1L[i1], dr2 = d2R[i2];
  const inL = L[i], inR = R[i];
  rv1L = rvK * rv1L + (1 - rvK) * dl1;
  rv2R = rvK * rv2R + (1 - rvK) * dr2;
  const wL = inL + 0.24 * rv1L;
  const wR = inR + 0.24 * rv2R;
  d1L[i1] = (inR * 0.5 + dl1 * 0.42);
  d2R[i2] = (inL * 0.5 + dr2 * 0.42);
  i1 = (i1 + 1) % d1L.length;
  i2 = (i2 + 1) % d2R.length;
  L[i] = wL; R[i] = wR;
}
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.4);
  const fadeOut = t > 18.2 ? Math.max(0, 1 - (t - 18.2) / 1.8) : 1;
  L[i] = Math.tanh(L[i] * 1.15) * fadeIn * fadeOut;
  R[i] = Math.tanh(R[i] * 1.15) * fadeIn * fadeOut;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0 ? 0.91 / peak : 1;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * norm * 32767))), i * 4);
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * norm * 32767))), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVE", 8);
hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
const outDir = join(here, "..", "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "bench.wav"), Buffer.concat([hdr, pcm]));
console.log("bench.wav:", D + "s", "peak", peak.toFixed(3), "size", ((44 + pcm.length) / 1e6).toFixed(1) + "MB");
