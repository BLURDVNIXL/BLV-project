import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const WASM_SRC_DIR = path.resolve(process.cwd(), 'src/wasm');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(WASM_SRC_DIR, { recursive: true });

// ============================================================================
// 1. ZERO-DEPENDENCY PNG GENERATOR FOR PWA ICONS (192x192, 512x512, 180x180)
// ============================================================================
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderBlvIconPng(size, maskablePadding = 0) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const pad = Math.floor(size * maskablePadding);
  const inner = size - pad * 2;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const ny = (y - pad) / inner;
      const nx = (x - pad) / inner;

      // Sky gradient (midnight slate -> Abidjan sunset orange -> amber)
      const t = Math.max(0, Math.min(1, y / size));
      let r = Math.round(15 + t * 225);
      let g = Math.round(23 + t * 95);
      let b = Math.round(42 - t * 20);
      let a = 255;

      // Rounded corners for non-maskable
      if (maskablePadding === 0) {
        const rad = size * 0.18;
        const dx = Math.max(rad - x, 0, x - (size - 1 - rad));
        const dy = Math.max(rad - y, 0, y - (size - 1 - rad));
        if (dx * dx + dy * dy > rad * rad) {
          a = 0;
        }
      }

      if (a > 0 && nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        // Golden Star at top center (nx=0.5, ny=0.22)
        const sx = nx - 0.5;
        const sy = ny - 0.22;
        const dist = Math.sqrt(sx * sx + sy * sy);
        const angle = Math.atan2(sy, sx);
        const starRad = 0.08 + 0.05 * Math.cos(5 * (angle + Math.PI / 2));
        if (dist < starRad) {
          r = 253; g = 224; b = 71;
        }

        // Plateau Skyline silhouettes
        const inSkyline =
          (nx > 0.16 && nx < 0.27 && ny > 0.42 && ny < 0.74) ||
          (nx > 0.29 && nx < 0.42 && ny > 0.34 && ny < 0.74) ||
          (nx > 0.44 && nx < 0.56 && ny > 0.37 && ny < 0.74) ||
          (nx > 0.58 && nx < 0.70 && ny > 0.39 && ny < 0.74) ||
          (nx > 0.72 && nx < 0.84 && ny > 0.46 && ny < 0.74);

        if (inSkyline) {
          r = 15; g = 23; b = 42;
          // Lit office windows
          const wx = Math.floor((nx * 100) % 4);
          const wy = Math.floor((ny * 100) % 5);
          if (wx === 1 && wy === 1) {
            r = 253; g = 230; b = 138;
          }
        }

        // Lagune Ébrié water band
        if (ny >= 0.74 && ny <= 0.87) {
          r = 3; g = 105; b = 161;
          if (Math.abs(ny - 0.79) < 0.01 && Math.sin(nx * 24) > 0.2) {
            r = 56; g = 189; b = 248;
          }
        }

        // Ivory Coast tricolor bar at bottom (Orange - White - Green)
        if (ny > 0.87 && ny <= 0.94) {
          if (nx < 0.33) { r = 249; g = 115; b = 22; }
          else if (nx < 0.66) { r = 248; g = 250; b = 252; }
          else { r = 22; g = 163; b = 74; }
        }
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), renderBlvIconPng(192, 0));
fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), renderBlvIconPng(512, 0));
fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), renderBlvIconPng(512, 0.14));
fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), renderBlvIconPng(180, 0));

// ============================================================================
// 2. REAL WEBASSEMBLY (.wasm) BINARY BUILDER FOR BLV CORE ENGINE
// ============================================================================
// Encodes genuine WASM bytecode (magic + version + Type + Function + Export + Code)
function uleb128(n) {
  const out = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    out.push(byte);
  } while (n !== 0);
  return out;
}

function sleb128(n) {
  const out = [];
  let more = true;
  while (more) {
    let byte = n & 0x7f;
    n >>= 7;
    if ((n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    out.push(byte);
  }
  return out;
}

function section(id, payload) {
  return [id, ...uleb128(payload.length), ...payload];
}

function strBytes(s) {
  const b = Buffer.from(s, 'utf8');
  return [...uleb128(b.length), ...b];
}

// Types:
// 0: (i32) -> i32
// 1: (i32, i32, i32, i32, i32) -> i32
// 2: (i32, i32, i32, i32) -> i32
// 3: (i32, i32, i32) -> i32
const I32 = 0x7f;
const typeSection = section(1, [
  4, // 4 types
  0x60, 1, I32, 1, I32,
  0x60, 5, I32, I32, I32, I32, I32, 1, I32,
  0x60, 4, I32, I32, I32, I32, 1, I32,
  0x60, 3, I32, I32, I32, 1, I32,
]);

// Functions mapped to types:
// fn0: compute_depression_pct(envy: i32) -> i32 (returns 50 if envy <= 0 else 100)
// fn1: compute_work_payout(base: i32, star: i32, roll: i32, envy: i32, bonus_pct: i32) -> i32
// fn2: compute_loto_prize(cost: i32, star: i32, roll: i32, mult: i32) -> i32
// fn3: compute_envy_boost(base_boost: i32, star: i32, roll: i32) -> i32
// fn4: compute_flood_stall(star: i32, roll: i32, is_low_car: i32) -> i32
const funcSection = section(3, [
  5, // 5 functions
  0, // fn0 -> type 0
  1, // fn1 -> type 1
  2, // fn2 -> type 2
  3, // fn3 -> type 3
  3, // fn4 -> type 3
]);

const exportSection = section(7, [
  5,
  ...strBytes('compute_depression_pct'), 0x00, 0,
  ...strBytes('compute_work_payout'), 0x00, 1,
  ...strBytes('compute_loto_prize'), 0x00, 2,
  ...strBytes('compute_envy_boost'), 0x00, 3,
  ...strBytes('compute_flood_stall'), 0x00, 4,
]);

// Opcodes
const LOCAL_GET = 0x20;
const LOCAL_SET = 0x21;
const I32_CONST = 0x41;
const I32_LE_S = 0x4c;
const I32_LT_S = 0x48;
const I32_GT_S = 0x4a;
const I32_ADD = 0x6a;
const I32_SUB = 0x6b;
const I32_MUL = 0x6c;
const I32_DIV_S = 0x6d;
const IF = 0x04;
const ELSE = 0x05;
const END = 0x0b;

// fn0: (envy) -> 50 if envy <= 0 else 100
const body0 = [
  0, // 0 locals
  LOCAL_GET, 0,
  I32_CONST, ...sleb128(0),
  I32_LE_S,
  IF, I32,
    I32_CONST, ...sleb128(50),
  ELSE,
    I32_CONST, ...sleb128(100),
  END,
  END,
];

// fn1: (base, star, roll, envy, bonus_pct) -> payout
// local 5 = amount
// amount = base * (100 + bonus_pct) / 100
// if roll < (star * 70 / 100) -> amount = amount * 150 / 100
// else if roll > (star + 35) -> amount = amount * 60 / 100
// if envy <= 0 -> amount = amount / 2
const body1 = [
  1, 1, I32, // 1 i32 local (index 5)
  LOCAL_GET, 0,
  I32_CONST, ...sleb128(100),
  LOCAL_GET, 4,
  I32_ADD,
  I32_MUL,
  I32_CONST, ...sleb128(100),
  I32_DIV_S,
  LOCAL_SET, 5,

  // Luck roll check
  LOCAL_GET, 2, // roll
  LOCAL_GET, 1, // star
  I32_CONST, ...sleb128(70),
  I32_MUL,
  I32_CONST, ...sleb128(100),
  I32_DIV_S,
  I32_LT_S,
  IF, 0x40,
    LOCAL_GET, 5,
    I32_CONST, ...sleb128(150),
    I32_MUL,
    I32_CONST, ...sleb128(100),
    I32_DIV_S,
    LOCAL_SET, 5,
  ELSE,
    LOCAL_GET, 2,
    LOCAL_GET, 1,
    I32_CONST, ...sleb128(35),
    I32_ADD,
    I32_GT_S,
    IF, 0x40,
      LOCAL_GET, 5,
      I32_CONST, ...sleb128(60),
      I32_MUL,
      I32_CONST, ...sleb128(100),
      I32_DIV_S,
      LOCAL_SET, 5,
    END,
  END,

  // Depression penalty: if envy <= 0, divide by 2
  LOCAL_GET, 3,
  I32_CONST, ...sleb128(0),
  I32_LE_S,
  IF, 0x40,
    LOCAL_GET, 5,
    I32_CONST, ...sleb128(2),
    I32_DIV_S,
    LOCAL_SET, 5,
  END,

  LOCAL_GET, 5,
  END,
];

// fn2: (cost, star, roll, mult) -> if roll > (100 - star) then cost * mult else 0
const body2 = [
  0,
  LOCAL_GET, 2, // roll
  I32_CONST, ...sleb128(100),
  LOCAL_GET, 1, // star
  I32_SUB,
  I32_GT_S,
  IF, I32,
    LOCAL_GET, 0,
    LOCAL_GET, 3,
    I32_MUL,
  ELSE,
    I32_CONST, ...sleb128(0),
  END,
  END,
];

// fn3: (base_boost, star, roll) -> if roll < star then base_boost + 15 else if roll > star + 25 then base_boost / 2 else base_boost
const body3 = [
  0,
  LOCAL_GET, 2, // roll
  LOCAL_GET, 1, // star
  I32_LT_S,
  IF, I32,
    LOCAL_GET, 0,
    I32_CONST, ...sleb128(15),
    I32_ADD,
  ELSE,
    LOCAL_GET, 2,
    LOCAL_GET, 1,
    I32_CONST, ...sleb128(25),
    I32_ADD,
    I32_GT_S,
    IF, I32,
      LOCAL_GET, 0,
      I32_CONST, ...sleb128(2),
      I32_DIV_S,
    ELSE,
      LOCAL_GET, 0,
    END,
  END,
  END,
];

// fn4: compute_flood_stall(star, roll, is_low_car) -> 1 if (is_low_car == 1 && roll > star + 10) else 0
const body4 = [
  0,
  LOCAL_GET, 2,
  I32_CONST, ...sleb128(1),
  0x46, // i32.eq
  IF, I32,
    LOCAL_GET, 1,
    LOCAL_GET, 0,
    I32_CONST, ...sleb128(10),
    I32_ADD,
    I32_GT_S,
    IF, I32,
      I32_CONST, ...sleb128(1),
    ELSE,
      I32_CONST, ...sleb128(0),
    END,
  ELSE,
    I32_CONST, ...sleb128(0),
  END,
  END,
];

const bodies = [body0, body1, body2, body3, body4].map(b => [...uleb128(b.length), ...b]);
const codeSection = section(10, [bodies.length, ...bodies.flat()]);

const wasmBytes = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, // \0asm
  0x01, 0x00, 0x00, 0x00, // version 1
  ...typeSection,
  ...funcSection,
  ...exportSection,
  ...codeSection,
]);

if (!WebAssembly.validate(wasmBytes)) {
  throw new Error('Generated WASM module failed WebAssembly.validate!');
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'blv_core.wasm'), wasmBytes);
fs.writeFileSync(path.join(WASM_SRC_DIR, 'blv_core.wasm'), wasmBytes);

console.log('✅ Generated valid PNG PWA icons and validated blv_core.wasm (' + wasmBytes.length + ' bytes)');
