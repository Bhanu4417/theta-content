#!/usr/bin/env bash
# bench — the launch bench film, in the classic cut's look.
# Frames + synthesised audio -> out/theta-bench.mp4
# Usage: ./make.sh [fps] [duration]
set -euo pipefail
cd "$(dirname "$0")"

FPS="${1:-30}"
DURATION="${2:-20.0}"

mkdir -p frames out
rm -f frames/*.jpg

echo "▶ audio..."
node audio.mjs

echo "▶ frames..."
node render.mjs "$FPS" "$DURATION"

echo "▶ mux..."
ffmpeg -y -v error -framerate "$FPS" -i frames/f%05d.jpg -i ../out/bench.wav \
  -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart \
  out/theta-bench.mp4

echo "done: out/theta-bench.mp4"
