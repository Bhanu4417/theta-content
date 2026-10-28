// verify.mjs — load the scene at key times, assert the picture is sane,
// and drop PNG previews next to the script.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const TIMES = [1.5, 2.5, 5.0, 6.2, 9.0, 11.0, 13.6, 15.0, 18.0, 19.6];
mkdirSync("preview", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--mute-audio"],
  defaultViewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("file://" + resolve("scene.html"), { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  if (window.readyPromise) await window.readyPromise;
  await document.fonts.ready;
});

for (const t of TIMES) {
  await page.evaluate((tt) => window.__render(tt), t);
  await page.screenshot({ path: resolve("preview", `t${String(t).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  const probe = await page.evaluate((tt) => {
    const BOXC = { x: 700, w: 1140 };
    const c = document.getElementById("v");
    const g = c.getContext("2d");
    const px = (x, y) => {
      const d = g.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const near = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
    const out = { t: tt, checks: [] };
    const PAPER = [242, 229, 188], DARK = [11, 10, 9];
    if (tt < 4.5) {
      out.checks.push(["bg dark", near(px(60, 60), DARK, 26)]);
      // some cream text pixels on the quote line
      let cream = 0;
      for (let x = 400; x < 1500; x += 4) {
        const p = px(x, 520);
        if (p[0] > 200 && p[1] > 195 && p[2] > 170) cream++;
      }
      out.checks.push(["quote pixels", cream > 6]);
    } else {
      let paperN = 0;
      for (let x = 60; x < 400; x += 7) for (let y = 540; y < 900; y += 7) if (near(px(x, y), PAPER, 34)) paperN++;
      out.checks.push(["paper", paperN > 1200]);
      if (tt >= 7.5) {
        // box A frame (navy stroke) and a hatched bar pixel in row pi
        let navy = 0;
        for (let x = 700; x <= 1840; x += 2) {
          const p = px(x, 110);
          if (p[2] > p[0] + 20 && p[2] > 80 && p[2] < 160) navy++;
        }
        out.checks.push(["box A top stroke", navy > 300]);
        let ink = 0, red = 0;
        for (let x = 1030; x < 1640; x += 3) {
          const p = px(x, 246);
          if (p[0] < 120 && p[1] < 120) ink++;
          if (p[0] > 120 && p[1] < 90 && p[2] < 90) red++;
        }
        out.checks.push(["theta bar (red hatch)", red > 4]);
        out.checks.push(["row ink under theta bar", ink + red > 2]);
        // opencode bar reaches far right
        let right = 0;
        for (let x = 1030; x < 1660; x += 2) {
          const p = px(x, 496);
          if (p[0] < 200 && p[2] > p[0]) right = x;
        }
        out.checks.push(["opencode bar tail", right > 1580]);
      }
      if (tt >= 12.9) {
        let b6 = 0;
        for (let x = 1030; x < 1500; x += 3) {
          const p = px(x, 590 + 136 + 5 * 50);
          if (p[0] < 170 && p[2] > p[0]) b6++;
        }
        out.checks.push(["box B last row bar", b6 > 3]);
        let six = 0;
        for (let x = 115; x < 430; x += 4) for (let y = 500; y < 615; y += 4) {
          const p = px(x, y);
          if (p[0] < 90 && p[1] < 90) six++;
        }
        out.checks.push(["big 6 ms ink", six > 30]);
        let cap = 0;
        for (let x = 114; x < 560; x += 4) for (let y = 632; y < 672; y += 4) {
          const p = px(x, y);
          if (p[0] < 90 && p[1] < 90) cap++;
        }
        out.checks.push(["theta outperformed caption", cap > 20]);
      }
      if (tt >= 17.8 && tt <= 18.8) {
        let th = 0, soon = 0;
        for (let x = 760; x < 1160; x += 6) for (let y = 150; y < 540; y += 6) {
          const p = px(x, y);
          if (p[0] < 90 && p[1] < 90) th++;
        }
        for (let x = 700; x < 1220; x += 3) for (let y = 690; y < 716; y += 4) {
          const p = px(x, y);
          if (p[0] < 160 && p[1] < 160) soon++;
        }
        out.checks.push(["finale Th mark", th > 300]);
        out.checks.push(["finale launching soon", soon > 8]);
      }
      if (tt >= 10.0 && tt <= 13.0) {
        let cl = 0;
        for (let x = 1030; x < 1400; x += 3) {
          const p = px(x, 396);
          if (p[0] < 200 && p[2] > p[0]) cl++;
        }
        out.checks.push(["claude 600 ms bar", cl > 3]);
      }
    }
    return out;
  }, t);
  console.log(JSON.stringify(probe));
}
await browser.close();
if (errors.length) {
  console.log("PAGE ERRORS:");
  for (const e of errors) console.log("  " + e);
  process.exit(1);
}
console.log("no page errors");
