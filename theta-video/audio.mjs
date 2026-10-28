// audio.mjs — Programmatic Sound Synthesis for Theta Launch Film (16.0s master)
// - Sample-accurate typewriter keystroke clicks synchronized to character timestamps
// - Warm CRT / analog tape room tone
// - Harmonic shimmer bell for subtitle reveal
// - Cinematic sub-bass swells and mechanical relay snaps
// - Technical data pulses and teletype rhythm for Scene 2 & Scene 3
// - Rich synthesizer pad chord and terminal installation keystrokes for Outro

import fs from "node:fs";
import path from "node:path";

const RATE = 48000;
const DURATION = +(process.argv[2] || 16.0);
const TOTAL_SAMPLES = Math.round(DURATION * RATE);

// Load all click samples into memory
const SFX_DIR = path.resolve("audio_sfx");
const clickFiles = fs.readdirSync(SFX_DIR).filter(f => f.endsWith(".wav")).sort();
const clicks = clickFiles.map(file => {
  const buf = fs.readFileSync(path.join(SFX_DIR, file));
  const headerLen = 44;
  const numSamples = (buf.length - headerLen) / 4; // stereo 16-bit
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    left[i] = buf.readInt16LE(headerLen + i * 4) / 32768.0;
    right[i] = buf.readInt16LE(headerLen + i * 4 + 2) / 32768.0;
  }
  return { left, right, len: numSamples };
});

// Shared timeline matching scene.html exactly
const TITLE = "One terminal. Every agent. All at once.";
const T0 = 0.25;

function hash(n) {
  let x = (n | 0) * 2654435761;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
}

let curT = T0;
const charTimestamps = [];
for (let i = 0; i < TITLE.length; i++) {
  charTimestamps.push(+curT.toFixed(3));
  const ch = TITLE[i];
  const jitter = (hash(i * 37 + 101) - 0.5) * 0.014;
  let dt = 0.064 + jitter;
  if (ch === " ") dt = 0.075 + jitter;
  if (ch === ".") {
    if (i < TITLE.length - 1) dt = 0.170;
    else dt = 0.140;
  }
  curT += dt;
}

// Master audio buffers (Float32)
const outL = new Float32Array(TOTAL_SAMPLES);
const outR = new Float32Array(TOTAL_SAMPLES);

// 1. Warm analog room tone & subtle tape noise floor
let lastPink = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / RATE;
  const white = Math.random() * 2 - 1;
  lastPink = (lastPink * 0.95) + (white * 0.05);
  const hiss = lastPink * 0.0030;

  // 55Hz subtle warm foundation hum
  const drone = Math.sin(2 * Math.PI * 55 * t) * 0.0042;

  const fadeIn = Math.min(1.0, t / 0.25);
  const fadeOut = (t > DURATION - 0.6) ? Math.max(0, (DURATION - t) / 0.6) : 1.0;

  outL[i] += (hiss + drone) * fadeIn * fadeOut;
  outR[i] += (hiss * 0.9 + drone) * fadeIn * fadeOut;
}

// Helper: Mix a click sound at a specific timestamp
function playClick(tSec, vol = 1.0, pan = 0.0, clickIdx = 0) {
  const startSample = Math.round(tSec * RATE);
  const click = clicks[clickIdx % clicks.length];
  const panL = Math.cos((pan + 0.5) * Math.PI / 2);
  const panR = Math.sin((pan + 0.5) * Math.PI / 2);

  for (let s = 0; s < click.len && (startSample + s) < TOTAL_SAMPLES; s++) {
    outL[startSample + s] += click.left[s] * vol * panL;
    outR[startSample + s] += click.right[s] * vol * panR;
  }
}

// 2. Mix in keystrokes for Scene 1 typing
charTimestamps.forEach((t, idx) => {
  const ch = TITLE[idx];
  let clickIdx = idx % clicks.length;
  if (ch === ".") clickIdx = 0; // firm solid strike for periods
  if (ch === " ") clickIdx = (clickIdx + 3) % clicks.length;

  const vol = (ch === ".") ? 1.45 : (ch === " " ? 1.15 : 1.35);
  const pan = (idx / TITLE.length - 0.5) * 0.35;
  playClick(t, vol, pan, clickIdx);
});

// 3. Subtitle entrance shimmer (at t = 3.13s)
const shimmerStart = Math.round(3.13 * RATE);
const shimmerDur = Math.round(1.4 * RATE);
for (let s = 0; s < shimmerDur && (shimmerStart + s) < TOTAL_SAMPLES; s++) {
  const t = s / RATE;
  const env = Math.exp(-t * 3.0) * Math.sin(Math.min(1.0, t * 16) * Math.PI / 2);
  const tone1 = Math.sin(2 * Math.PI * 880 * t) * 0.016;
  const tone2 = Math.sin(2 * Math.PI * 1320 * t) * 0.011;
  const tone3 = Math.sin(2 * Math.PI * 1760 * t) * 0.007;
  const sig = (tone1 + tone2 + tone3) * env;
  outL[shimmerStart + s] += sig * 0.85;
  outR[shimmerStart + s] += sig * 1.15;
}

// 4. Transition 1 Swell: Dark Void -> Vintage Blueprint (t = 4.10s to 4.75s)
const swellStart = Math.round(4.10 * RATE);
const swellDur = Math.round(0.65 * RATE);
for (let s = 0; s < swellDur && (swellStart + s) < TOTAL_SAMPLES; s++) {
  const t = s / swellDur; // 0 to 1
  const freq = 40 + t * t * 90; // 40Hz to 130Hz sweep
  const amp = Math.pow(t, 2.2) * 0.40;
  const sub = Math.sin(2 * Math.PI * freq * (s / RATE)) * amp;
  const whoosh = (Math.random() * 2 - 1) * 0.048 * Math.pow(t, 2.0);
  outL[swellStart + s] += (sub + whoosh);
  outR[swellStart + s] += (sub + whoosh);
}

// Relay snap at aperture climax (t = 4.70s)
playClick(4.70, 1.8, 0.0, 0);

// 5. Scene 2 (4.70s - 9.20s): Rhythmic data pulses and parallel pane typing
for (let pTime = 5.0; pTime < 9.1; pTime += 0.38) {
  const pStart = Math.round(pTime * RATE);
  const pDur = Math.round(0.03 * RATE);
  for (let s = 0; s < pDur && (pStart + s) < TOTAL_SAMPLES; s++) {
    const t = s / RATE;
    const env = Math.exp(-t * 130);
    const blip = Math.sin(2 * Math.PI * 1800 * t) * env * 0.018;
    outL[pStart + s] += blip * 0.9;
    outR[pStart + s] += blip * 1.1;
  }
}

// Background parallel agent typing (quieter)
for (let kTime = 5.2; kTime < 9.0; kTime += 0.19) {
  playClick(kTime, 0.32, (Math.random() - 0.5) * 0.6, Math.round(kTime * 11));
}

// 6. Transition 2 (at t = 9.00s to 9.45s): Technical Laser Scan Sweep
const scanStart = Math.round(9.00 * RATE);
const scanDur = Math.round(0.45 * RATE);
for (let s = 0; s < scanDur && (scanStart + s) < TOTAL_SAMPLES; s++) {
  const t = s / scanDur; // 0 to 1
  const freq = 600 + t * t * 1800; // 600Hz to 2400Hz laser sweep
  const env = Math.sin(t * Math.PI) * 0.024;
  const sig = Math.sin(2 * Math.PI * freq * (s / RATE)) * env;
  // Panning from left to right as the laser line sweeps across the screen
  const pan = t - 0.5;
  const panL = Math.cos((pan + 0.5) * Math.PI / 2);
  const panR = Math.sin((pan + 0.5) * Math.PI / 2);
  outL[scanStart + s] += sig * panL;
  outR[scanStart + s] += sig * panR;
}
playClick(9.00, 1.3, -0.4, 4);
playClick(9.45, 1.4, 0.4, 0);

// 7. Scene 3: The Seam (9.20s - 13.50s)
// High-speed bidirectional event stream pings
for (let eTime = 9.4; eTime < 13.3; eTime += 0.22) {
  const eStart = Math.round(eTime * RATE);
  const eDur = Math.round(0.025 * RATE);
  const isForward = Math.round(eTime * 10) % 2 === 0;
  const freq = isForward ? 2200 : 1400;
  const pan = isForward ? -0.3 : 0.3;

  for (let s = 0; s < eDur && (eStart + s) < TOTAL_SAMPLES; s++) {
    const t = s / RATE;
    const env = Math.exp(-t * 140);
    const ping = Math.sin(2 * Math.PI * freq * t) * env * 0.016;
    outL[eStart + s] += ping * (1 - pan);
    outR[eStart + s] += ping * (1 + pan);
  }
}

// 8. Transition 3 Swell: Climax impact (at t = 13.50s)
const dropStart = Math.round(13.50 * RATE);
const dropDur = Math.round(1.8 * RATE);
for (let s = 0; s < dropDur && (dropStart + s) < TOTAL_SAMPLES; s++) {
  const t = s / RATE;
  const env = Math.exp(-t * 2.5);
  // Deep 45Hz sub bass boom
  const sub = Math.sin(2 * Math.PI * 45 * t) * env * 0.35;
  outL[dropStart + s] += sub;
  outR[dropStart + s] += sub;
}
playClick(13.50, 1.6, 0.0, 0);

// 9. Scene 4: Climax Synthesizer Chord (Warm C minor 9 chord from 13.5s to 16.0s)
const chordFrequencies = [130.81, 196.00, 293.66, 311.13, 466.16]; // C3, G3, D4, Eb4, Bb4
for (let s = 0; s < Math.round(2.5 * RATE) && (dropStart + s) < TOTAL_SAMPLES; s++) {
  const t = s / RATE;
  const env = Math.min(1.0, t / 0.4) * Math.max(0, 1.0 - (t / 2.5));
  let chordSample = 0;
  for (let f = 0; f < chordFrequencies.length; f++) {
    chordSample += Math.sin(2 * Math.PI * chordFrequencies[f] * t) * (0.008 / chordFrequencies.length);
  }
  outL[dropStart + s] += chordSample * env;
  outR[dropStart + s] += chordSample * env;
}

// Scene 4 Terminal typing: "$ cargo install theta-terminal" (at t = 14.2s to 15.2s)
const installCmd = "cargo install theta-terminal";
let cmdT = 14.15;
for (let c = 0; c < installCmd.length; c++) {
  playClick(cmdT, 0.75, (c / installCmd.length - 0.5) * 0.25, c);
  cmdT += 0.045 + (hash(c * 17) - 0.5) * 0.01;
}

// Final solid carriage return latch at 15.4s
playClick(15.40, 1.5, 0.0, 0);

// Write 48kHz Stereo 16-bit WAV file
const outDir = path.resolve("out");
fs.mkdirSync(outDir, { recursive: true });
const wavPath = path.join(outDir, "film.wav");

const numChannels = 2;
const bytesPerSample = 2;
const blockAlign = numChannels * bytesPerSample;
const byteRate = RATE * blockAlign;
const dataSize = TOTAL_SAMPLES * blockAlign;
const wavBuf = Buffer.alloc(44 + dataSize);

// RIFF header
wavBuf.write("RIFF", 0);
wavBuf.writeUInt32LE(36 + dataSize, 4);
wavBuf.write("WAVE", 8);
wavBuf.write("fmt ", 12);
wavBuf.writeUInt32LE(16, 16);
wavBuf.writeUInt16LE(1, 20); // PCM
wavBuf.writeUInt16LE(numChannels, 22);
wavBuf.writeUInt32LE(RATE, 24);
wavBuf.writeUInt32LE(byteRate, 28);
wavBuf.writeUInt16LE(blockAlign, 32);
wavBuf.writeUInt16LE(16, 34); // 16-bit
wavBuf.write("data", 36);
wavBuf.writeUInt32LE(dataSize, 40);

// Clamp and write PCM samples with soft limiting
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const l = Math.max(-0.98, Math.min(0.98, Math.tanh(outL[i])));
  const r = Math.max(-0.98, Math.min(0.98, Math.tanh(outR[i])));
  wavBuf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  wavBuf.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
}

fs.writeFileSync(wavPath, wavBuf);
console.log(`[audio.mjs] Synthesized ${DURATION.toFixed(1)}s audio -> ${wavPath} (${wavBuf.length} bytes)`);
