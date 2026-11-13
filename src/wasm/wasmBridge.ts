/**
 * BLV — WebAssembly Core Bridge
 * Loads and executes the compiled binary /blv_core.wasm (validated WebAssembly module).
 */

export interface BLVWasmExports {
  compute_depression_pct: (envy: number) => number;
  compute_work_payout: (base: number, star: number, roll: number, envy: number, bonusPct: number) => number;
  compute_loto_prize: (cost: number, star: number, roll: number, mult: number) => number;
  compute_envy_boost: (baseBoost: number, star: number, roll: number) => number;
  compute_flood_stall: (star: number, roll: number, isLowCar: number) => number;
}

let wasmExports: BLVWasmExports | null = null;
let initPromise: Promise<BLVWasmExports> | null = null;

// Deterministic fallback mirroring exact WASM logic only before async load completes
const syncMirror: BLVWasmExports = {
  compute_depression_pct: (envy) => (envy <= 0 ? 50 : 100),
  compute_work_payout: (base, star, roll, envy, bonusPct) => {
    let amount = Math.trunc((base * (100 + bonusPct)) / 100);
    if (roll < Math.trunc((star * 70) / 100)) {
      amount = Math.trunc((amount * 150) / 100);
    } else if (roll > star + 35) {
      amount = Math.trunc((amount * 60) / 100);
    }
    if (envy <= 0) {
      amount = Math.trunc(amount / 2);
    }
    return amount;
  },
  compute_loto_prize: (cost, star, roll, mult) => (roll > 100 - star ? cost * mult : 0),
  compute_envy_boost: (baseBoost, star, roll) => {
    if (roll < star) return baseBoost + 15;
    if (roll > star + 25) return Math.trunc(baseBoost / 2);
    return baseBoost;
  },
  compute_flood_stall: (star, roll, isLowCar) => (isLowCar === 1 && roll > star + 10 ? 1 : 0),
};

export async function initWasmCore(): Promise<BLVWasmExports> {
  if (wasmExports) return wasmExports;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const res = await fetch('/blv_core.wasm');
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          const { instance } = await WebAssembly.instantiate(bytes);
          wasmExports = instance.exports as unknown as BLVWasmExports;
          return wasmExports;
        }
      } else {
        // Node.js runtime (for unit tests)
        const fs = await import('node:fs');
        const path = await import('node:path');
        const wasmPath = path.resolve(process.cwd(), 'public/blv_core.wasm');
        if (fs.existsSync(wasmPath)) {
          const buf = fs.readFileSync(wasmPath);
          const { instance } = await WebAssembly.instantiate(buf);
          wasmExports = instance.exports as unknown as BLVWasmExports;
          return wasmExports;
        }
      }
    } catch {
      // Fallback to mirror if offline fetch fails before cache warmup
    }
    wasmExports = syncMirror;
    return wasmExports;
  })();

  return initPromise;
}

export function getWasmCore(): BLVWasmExports {
  return wasmExports || syncMirror;
}

export function isWasmLoaded(): boolean {
  return wasmExports !== null && wasmExports !== syncMirror;
}
