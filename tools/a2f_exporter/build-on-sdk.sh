#!/usr/bin/env bash
set -euo pipefail

sdk=${1:?usage: build-on-sdk.sh /path/to/Audio2Face-3D-SDK}
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
samples="$sdk/audio2face-sdk/source/samples"
name=mouth-teacher-a2f-exporter
test -d "$samples"
test -d "$sdk/_build/release"
if [ ! -e "$samples/$name" ]; then ln -s "$here" "$samples/$name"; fi
if ! grep -Fxq "add_subdirectory($name)" "$samples/CMakeLists.txt"; then
  printf '\nadd_subdirectory(%s)\n' "$name" >> "$samples/CMakeLists.txt"
fi
export CUDA_PATH=${CUDA_PATH:-/usr/local/cuda-12.9}
export TENSORRT_ROOT_DIR=${TENSORRT_ROOT_DIR:-/usr}
"$sdk/_deps/build-deps/cmake/bin/cmake" --build "$sdk/_build/release" --target "$name" --parallel 4
printf 'Built: %s/_build/release/audio2face-sdk/bin/%s\n' "$sdk" "$name"
