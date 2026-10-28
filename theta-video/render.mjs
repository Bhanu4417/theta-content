// render.mjs — Screenshot frames one by one with system Chromium via puppeteer-core
import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FPS = +(process.argv[2] || 60);
const DURATION = +(process.argv[3] || 16.0);
const FRAMES = Math.round(FPS * DURATION);
const OUT = resolve("frames");
mkdirSync(OUT, { recursive: true });

console.log(`Launching Chromium to render ${FRAMES} frames (${DURATION}s @ ${FPS}fps)...`);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: [
    "--no-sandbox",
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--disable-features=TranslateUI",
    "--disable-extensions",
    "--mute-audio",
  ],
  defaultViewport: { width: 1920, height: 1080 },
});

const page = await browser.newPage();
await page.goto("file://" + resolve("scene.html"), { waitUntil: "networkidle0" });

// Guarantee fonts and measurements are initialized before rendering frame 0
await page.evaluate(async () => {
  if (window.readyPromise) await window.readyPromise;
  await document.fonts.load('46px "Courier Prime"');
  await document.fonts.load('italic 38px "EB Garamond"');
  await document.fonts.ready;
});

const t0 = performance.now();
for (let f = 0; f < FRAMES; f++) {
  await page.evaluate((n) => window.renderAt(n), f);
  const file = resolve(OUT, `f${String(f).padStart(5, "0")}.jpg`);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
    type: "jpeg",
    quality: 98,
  });
  if (f % 60 === 0 || f === FRAMES - 1) {
    const elapsed = (performance.now() - t0) / 1000;
    const fpsSpeed = (f + 1) / (elapsed || 0.001);
    const remaining = (FRAMES - f - 1) / (fpsSpeed || 1);
    console.log(
      `Rendered frame ${f + 1}/${FRAMES} (${(((f + 1) / FRAMES) * 100).toFixed(1)}%) — ${fpsSpeed.toFixed(1)} fps, ~${remaining.toFixed(0)}s remaining`
    );
  }
}

await browser.close();
const totalTime = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`Finished rendering ${FRAMES} frames in ${totalTime}s to ${OUT}`);

if (!existsSync(resolve(OUT, "f00000.jpg"))) {
  throw new Error("No frames were written!");
}
