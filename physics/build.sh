#!/usr/bin/env bash
# Compile le cœur physique en WebAssembly (nécessite clang >= 14 et lld).
set -euo pipefail
cd "$(dirname "$0")"
clang++ --target=wasm32 -std=c++17 -O3 -nostdlib -ffreestanding -fno-exceptions -fno-rtti \
  -fno-threadsafe-statics -mbulk-memory -Wall -Wno-misleading-indentation \
  -fuse-ld=lld -Wl,--no-entry -Wl,--strip-all -Wl,-z,stack-size=65536 -Wl,--initial-memory=8388608 \
  -o ../public/physics.wasm physics.cpp
ls -la ../public/physics.wasm
