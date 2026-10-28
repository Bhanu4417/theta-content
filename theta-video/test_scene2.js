import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import fs from 'node:fs';

const html = `<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<style>
  @font-face {
    font-family: 'Courier Prime';
    src: url('fonts/CourierPrime-Regular.ttf') format('truetype');
  }
  @font-face {
    font-family: 'EB Garamond';
    src: url('fonts/EBGaramond-Italic.ttf') format('truetype');
    font-style: italic;
  }
  html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id='c' width='1920' height='1080'></canvas>
<script>
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

window.renderTestScene2 = (t) => {
  // 1. Vintage blueprint paper background
  ctx.fillStyle = '#DDD7CC';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Halftone dot vignette along borders (reference style)
  for (let x = 30; x < W; x += 30) {
    for (let y = 30; y < H; y += 30) {
      const dx = Math.min(x, W - x);
      const dy = Math.min(y, H - y);
      const edgeDist = Math.min(dx, dy);
      if (edgeDist < 260) {
        const dotR = Math.max(0.5, (1 - edgeDist / 260) * 3.5);
        ctx.fillStyle = 'rgba(70, 60, 50, 0.12)';
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // 2. Top-left header: 'One terminal. Every agent. All at once.'
  ctx.save();
  ctx.font = '26px "Courier Prime", monospace';
  ctx.fillStyle = 'rgba(55, 48, 42, 0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('One terminal. Every agent. All at once.', 120, 130);
  ctx.restore();

  // 3. Bottom-left typography: '2026', 'Parallel Agent Grid'
  ctx.save();
  // Big bold date stamp
  ctx.font = '900 170px "Courier Prime", monospace';
  ctx.fillStyle = '#221E1B';
  ctx.textAlign = 'left';
  ctx.fillText('2026', 120, 930);

  // Headline
  ctx.font = '700 44px "Courier Prime", monospace';
  ctx.fillStyle = '#221E1B';
  ctx.fillText('Parallel Agent Grid', 120, 680);

  // Subtitle
  ctx.font = '24px "Courier Prime", monospace';
  ctx.fillStyle = 'rgba(75, 65, 58, 0.85)';
  ctx.fillText('tiled panes • concurrent sessions • unified harness', 120, 725);
  ctx.restore();

  // 4. Center-right: Terminal Workspace Schematic
  ctx.save();
  const termX = 980, termY = 280, termW = 820, termH = 520;

  // Master frame shadow & background
  ctx.fillStyle = '#E6E1D7';
  ctx.strokeStyle = '#1D2D42';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(termX, termY, termW, termH, 8);
  ctx.fill();
  ctx.stroke();

  // Title bar
  ctx.fillStyle = '#1D2D42';
  ctx.beginPath();
  ctx.roundRect(termX, termY, termW, 36, [8, 8, 0, 0]);
  ctx.fill();

  // Title bar text & dots
  ctx.fillStyle = '#DDD7CC';
  ctx.font = '16px "Courier Prime", monospace';
  ctx.fillText('theta :: multi-agent workspace (3 sessions running)', termX + 50, termY + 24);
  // Three dots
  ctx.fillStyle = '#A3998D';
  for (let d = 0; d < 3; d++) {
    ctx.beginPath();
    ctx.arc(termX + 18 + d * 11, termY + 18, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiled pane division:
  const p1W = Math.round(termW * 0.48);
  const p2W = termW - p1W;
  const p2H = Math.round((termH - 36) / 2);

  ctx.strokeStyle = '#1D2D42';
  ctx.lineWidth = 2;

  // Vertical split line
  ctx.beginPath();
  ctx.moveTo(termX + p1W, termY + 36);
  ctx.lineTo(termX + p1W, termY + termH);
  ctx.stroke();

  // Horizontal split line on right
  ctx.beginPath();
  ctx.moveTo(termX + p1W, termY + 36 + p2H);
  ctx.lineTo(termX + termW, termY + 36 + p2H);
  ctx.stroke();

  // Pane 1: Session 1 — Planner Agent
  ctx.fillStyle = '#1D2D42';
  ctx.font = 'bold 15px "Courier Prime", monospace';
  ctx.fillText('[1] Agent: Architect (Claude)', termX + 16, termY + 62);
  ctx.fillStyle = 'rgba(29, 45, 66, 0.7)';
  ctx.font = '13px "Courier Prime", monospace';
  ctx.fillText('> analyzing workspace diffs...', termX + 16, termY + 95);
  ctx.fillText('> planning task-tree decomposition', termX + 16, termY + 120);
  ctx.fillText('> dispatching subagent #1: engine', termX + 16, termY + 145);
  ctx.fillText('> dispatching subagent #2: tests', termX + 16, termY + 170);
  ctx.fillText('> watching AppEvents on channel', termX + 16, termY + 195);
  // Blinking cursor in pane 1
  if (Math.floor(t * 3) % 2 === 0) {
    ctx.fillRect(termX + 16, termY + 215, 10, 16);
  }

  // Pane 2: Session 2 — Rust Engine
  ctx.fillStyle = '#1D2D42';
  ctx.font = 'bold 15px "Courier Prime", monospace';
  ctx.fillText('[2] Agent: Rust Engine', termX + p1W + 16, termY + 62);
  ctx.fillStyle = 'rgba(29, 45, 66, 0.7)';
  ctx.font = '13px "Courier Prime", monospace';
  ctx.fillText('> cargo build --release', termX + p1W + 16, termY + 95);
  ctx.fillText('  Compiling theta v0.1.0', termX + p1W + 16, termY + 120);
  ctx.fillText('  Finished release [optimized]', termX + p1W + 16, termY + 145);
  if (Math.floor(t * 3.5) % 2 === 0) {
    ctx.fillRect(termX + p1W + 16, termY + 165, 10, 16);
  }

  // Pane 3: Session 3 — Test Harness
  ctx.fillStyle = '#1D2D42';
  ctx.font = 'bold 15px "Courier Prime", monospace';
  ctx.fillText('[3] Agent: Harness & Lint', termX + p1W + 16, termY + 36 + p2H + 26);
  ctx.fillStyle = 'rgba(29, 45, 66, 0.7)';
  ctx.font = '13px "Courier Prime", monospace';
  ctx.fillText('> cargo test (211 passed)', termX + p1W + 16, termY + 36 + p2H + 58);
  ctx.fillText('> clippy: 0 warnings, clean', termX + p1W + 16, termY + 36 + p2H + 82);
  if (Math.floor(t * 4) % 2 === 0) {
    ctx.fillRect(termX + p1W + 16, termY + 36 + p2H + 102, 10, 16);
  }

  // 5. Input Signal Circuit Nodes on the Left
  const nodes = [
    { y: termY + 90, label: 'Session #1 (Architect)' },
    { y: termY + 260, label: 'Session #2 (Engine)' },
    { y: termY + 430, label: 'Session #3 (Harness)' }
  ];

  nodes.forEach((n, idx) => {
    const nodeX = 680;
    // Outer circle
    ctx.strokeStyle = '#1D2D42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nodeX, n.y, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#1D2D42';
    ctx.beginPath();
    ctx.arc(nodeX, n.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.font = 'bold 16px "Courier Prime", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(n.label, nodeX - 25, n.y + 6);

    // Connecting line to terminal frame
    ctx.beginPath();
    ctx.moveTo(nodeX + 16, n.y);
    ctx.lineTo(termX, n.y);
    ctx.stroke();

    // Little crosshair '+' marker (reference style)
    ctx.fillStyle = '#C43D2A';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', nodeX + 80, n.y - 10);

    // Dynamic data pulse travelling along wire
    const pulseT = ((t * 1.5 + idx * 0.33) % 1.0);
    const px = (nodeX + 16) + (termX - (nodeX + 16)) * pulseT;
    ctx.fillStyle = '#C43D2A';
    ctx.beginPath();
    ctx.arc(px, n.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 6. Halftone Circular Hub (matching reference's circular hub!)
  const hubX = 890, hubY = termY + 260;
  ctx.save();
  // Concentric dashed circle
  ctx.strokeStyle = 'rgba(196, 61, 42, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(hubX, hubY, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Halftone dot cluster inside hub
  for (let r = 8; r <= 36; r += 7) {
    const count = Math.round(r * 1.2);
    for (let c = 0; c < count; c++) {
      const ang = (c / count) * Math.PI * 2;
      const hx = hubX + Math.cos(ang) * r;
      const hy = hubY + Math.sin(ang) * r;
      const d = 1 - r / 38;
      ctx.fillStyle = 'rgba(29, 45, 66, ' + (d * 0.7) + ')';
      ctx.beginPath();
      ctx.arc(hx, hy, d * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Glowing red center dot
  ctx.fillStyle = '#E85D3B';
  ctx.shadowColor = 'rgba(232, 93, 59, 0.8)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(hubX, hubY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
};
</script>
</body>
</html>`;

fs.writeFileSync('test_scene2.html', html);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  defaultViewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
await page.goto('file://' + resolve('test_scene2.html'), { waitUntil: 'networkidle0' });
await page.evaluate(async () => {
  await document.fonts.load('46px "Courier Prime"');
  await document.fonts.ready;
  window.renderTestScene2(2.5);
});
await page.screenshot({ path: resolve('verify/test_scene2_render.png') });
await browser.close();
console.log('Scene 2 test frame written to verify/test_scene2_render.png');
