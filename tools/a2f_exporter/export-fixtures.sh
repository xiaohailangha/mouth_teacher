#!/usr/bin/env bash
set -euo pipefail

sdk=${1:?usage: export-fixtures.sh /path/to/Audio2Face-3D-SDK}
project=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
model="$sdk/_data/generated/audio2face-sdk/samples/data/multi-diffusion/model.json"
binary="$sdk/_build/release/audio2face-sdk/bin/mouth-teacher-a2f-exporter"
fixtures="$project/runtime/public/fixtures/a2f"
test -f "$model"
test -x "$binary"
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
export CUDA_PATH=${CUDA_PATH:-/usr/local/cuda-12.9}
export TENSORRT_ROOT_DIR=${TENSORRT_ROOT_DIR:-/usr}
for id in {01..10}; do
  input="$fixtures/$id.wav"
  output="$fixtures/$id-face.json"
  test -f "$input"
  if [ -s "$output" ] && grep -q '"tongueChannels"' "$output"; then echo "$id: existing face and tongue output; skipped"; continue; fi
  if command -v ffmpeg >/dev/null; then
    ffmpeg -hide_banner -loglevel error -y -i "$input" -ac 1 -ar 16000 -c:a pcm_s16le "$tmp/$id.wav"
  else
    python3 "$project/tools/a2f_exporter/resample_16k.py" "$input" "$tmp/$id.wav"
  fi
  "$sdk/run_sample.sh" "$binary" "$tmp/$id.wav" "$model" "$tmp/$id-face.json"
  mv -- "$tmp/$id-face.json" "$output"
done
