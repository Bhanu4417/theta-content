#!/bin/bash
# theta-video — The Launch Film, generated entirely in code
# Usage: ./make.sh [fps] [duration]
# Default: 60 fps, 16.0 seconds
set -e
cd "$(dirname "$0")"

FPS="${1:-60}"
DURATION="${2:-16.0}"

echo "=========================================================="
echo "Theta Launch Film — \"The Art of Working in Parallel\""
echo "Target: 1920x1080 @ ${FPS}fps (${DURATION}s)"
echo "=========================================================="

mkdir -p frames out

echo ""
echo "▶ Step 1/3: Synthesizing Code-Generated Audio Track..."
node audio.mjs "$DURATION"

echo ""
echo "▶ Step 2/3: Rendering Frames via Headless Chromium..."
rm -f frames/*.jpg frames/*.png
node render.mjs "$FPS" "$DURATION"

echo ""
echo "▶ Step 3/3: Muxing High-Fidelity MP4 with FFmpeg..."
ffmpeg -y -v error -framerate "$FPS" -i frames/f%05d.jpg -i out/film.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -preset medium \
  -c:a aac -b:a 192k -shortest \
  -movflags +faststart out/theta_launch.mp4

# Also copy to out/part1.mp4 for convenience
cp out/theta_launch.mp4 out/part1.mp4

echo ""
echo "=========================================================="
echo "✓ Successfully created out/theta_launch.mp4"
ls -lh out/theta_launch.mp4
echo "=========================================================="
