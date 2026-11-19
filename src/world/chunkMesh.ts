/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV6:
 * Transforme un chunk généré en objets Three.js stylisés façon Abidjan :
 * sol haute netteté, déco architecturale (balcons, corniches, colonnes, châteaux d'eau, auvents),
 * vraies herbes 3D et 5 variétés de végétation, poteaux & câbles électriques, lampadaires,
 * étals de quartier, voitures garées et flaques d'eau (~5 appels de dessin par chunk).
 */

import * as THREE from 'three';
import { Building, ChunkData, CHUNK } from './city';
import {
  ChunkDecorPlan,
  ChunkSolid,
  DumpsterDecor,
  FoodVendorDecor,
  SignDecor,
  SignKind,
  StreetVenueDecor,
  VILLA_WALLED_DISTRICTS,
  collectChunkDecor,
} from './chunkDecor';
import { isHospitalId } from './hospitals';
import { isCommissariatId, isMairieId, isPetitHotelId } from './civicSites';
import { districtAt, isWater } from './abidjanGeography';
import { roadAt } from './roads';
import { hash32 } from './rng';

export interface ChunkMaterials {
  facade: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  trees: THREE.MeshLambertMaterial;
  lamps: THREE.MeshStandardMaterial;
  puddles: THREE.MeshStandardMaterial;
  signs: THREE.MeshStandardMaterial;
  setNight: (night: boolean) => void;
  setWetness: (wet: boolean) => void;
  /** Temps (secondes) pour le balancement des arbres et herbes dans le vent. */
  setWindTime: (timeSec: number) => void;
  dispose(): void;
}

function makeFacadeTextures(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const W = 256;
  const H = 128;
  const draw = (lit: boolean): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    g.fillStyle = lit ? '#000000' : '#f1f2f4';
    g.fillRect(0, 0, W, H);

    if (!lit) {
      g.fillStyle = '#dde1e6';
      g.fillRect(0, 0, W, 10);
      g.fillRect(0, H - 8, W, 8);
    }

    const pattern = [1, 0, 1, 1, 0, 1, 1, 0];
    const litPalette = ['#fbbf24', '#fde047', '#fef3c7', '#fbbf24', '#7dd3fc', '#f59e0b', '#fef3c7', '#fde047'];
    const cols = 8;
    const colW = W / cols;
    for (let i = 0; i < cols; i++) {
      const x = i * colW + 6;
      const winW = colW - 12;
      if (lit) {
        if (pattern[i]) {
          g.fillStyle = litPalette[i % litPalette.length];
          g.fillRect(x, 22, winW, 68);
        }
      } else {
        g.fillStyle = '#bcc3cc';
        g.fillRect(x - 2, 18, winW + 4, 76);
        g.fillStyle = '#334e68';
        g.fillRect(x, 22, winW, 68);
        g.fillStyle = '#627d98';
        g.fillRect(x + 2, 24, winW - 4, 18);
        g.fillStyle = '#9aa5b1';
        g.fillRect(x - 3, 90, winW + 6, 7);
      }
    }
    return cv;
  };
  const mk = (cv: HTMLCanvasElement): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk(draw(false)), emissive: mk(draw(true)) };
}

const SIGN_SPECS: Array<{ kind: SignKind; label: string; bg: string; fg: string; border: string }> = [
  { kind: 'boutique', label: 'BOUTIQUE', bg: '#0284c7', fg: '#ffffff', border: '#fef08a' },
  { kind: 'superette', label: 'SUPERETTE', bg: '#15803d', fg: '#ffffff', border: '#bbf7d0' },
  { kind: 'coiffure', label: 'SALON COIFFURE', bg: '#1e1b4b', fg: '#f472b6', border: '#38bdf8' },
  { kind: 'transfert', label: 'TRANSFERT · MOMO · OM', bg: '#ea580c', fg: '#ffffff', border: '#fde047' },
  { kind: 'garbadrome', label: 'GARBADROME', bg: '#92400e', fg: '#fef08a', border: '#f97316' },
  { kind: 'allocodrome', label: 'ALLOCODROME', bg: '#c2410c', fg: '#ffffff', border: '#facc15' },
  { kind: 'maquis', label: 'MAQUIS BAR', bg: '#7f1d1d', fg: '#fde047', border: '#fb923c' },
];

const SIGN_INDEX: Record<SignKind, number> = {
  boutique: 0,
  superette: 1,
  coiffure: 2,
  transfert: 3,
  garbadrome: 4,
  allocodrome: 5,
  maquis: 6,
};

function makeSignAtlasTexture(): THREE.CanvasTexture {
  const W = 512;
  const stripH = 64;
  const H = SIGN_SPECS.length * stripH;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  SIGN_SPECS.forEach((s, idx) => {
    const y = idx * stripH;
    g.fillStyle = s.bg;
    g.fillRect(0, y, W, stripH);
    g.strokeStyle = s.border;
    g.lineWidth = 5;
    g.strokeRect(4, y + 4, W - 8, stripH - 8);
    g.fillStyle = s.fg;
    g.font = 'bold 34px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(s.label, W / 2, y + stripH / 2 + 2, W - 28);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createChunkMaterials(night: boolean, wind = false): ChunkMaterials {
  const tex = makeFacadeTextures();
  const signTex = makeSignAtlasTexture();
  const facade = new THREE.MeshStandardMaterial({
    map: tex.map,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.08,
    emissiveMap: tex.emissive,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: night ? 0.95 : 0.0,
  });
  const plain = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.03,
  });
  const trees = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const lamps = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new THREE.Color(0xffd27d),
    emissiveIntensity: night ? 1.15 : 0.0,
  });
  const puddles = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.08,
    metalness: 0.45,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  const signs = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.42,
    metalness: 0.05,
    emissiveMap: signTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: night ? 0.8 : 0.18,
  });

  // Vent tropical : herbes (y < 1.3) et cimes d'arbres oscillent doucement dans le vertex shader.
  const windTime = { value: 0 };
  if (wind) {
    trees.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = windTime;
      shader.vertexShader = `uniform float uWindTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           vec4 wp = modelMatrix * vec4(transformed, 1.0);
           float sway = transformed.y < 1.35
             ? transformed.y * 0.14
             : pow(clamp(transformed.y / 9.0, 0.0, 1.0), 1.6);
           float phase = wp.x * 0.27 + wp.z * 0.21;
           float spd = transformed.y < 1.35 ? 2.2 : 1.25;
           transformed.x += sin(uWindTime * spd + phase) * 0.3 * sway;
           transformed.z += cos(uWindTime * (spd * 0.8) + phase * 1.3) * 0.2 * sway;
         }`
      );
    };
  }

  const setNight = (isNight: boolean) => {
    facade.emissiveIntensity = isNight ? 0.95 : 0.0;
    lamps.emissiveIntensity = isNight ? 1.15 : 0.0;
    signs.emissiveIntensity = isNight ? 0.8 : 0.18;
  };

  const setWetness = (wet: boolean) => {
    facade.roughness = wet ? 0.28 : 0.72;
    facade.metalness = wet ? 0.22 : 0.08;
    plain.roughness = wet ? 0.36 : 0.84;
    plain.metalness = wet ? 0.14 : 0.03;
    puddles.roughness = wet ? 0.04 : 0.1;
    puddles.opacity = wet ? 0.88 : 0.7;
  };

  return {
    facade,
    plain,
    trees,
    lamps,
    puddles,
    signs,
    setNight,
    setWetness,
    setWindTime: (timeSec: number) => {
      windTime.value = timeSec;
    },
    dispose: () => {
      tex.map.dispose();
      tex.emissive.dispose();
      signTex.dispose();
      facade.dispose();
      plain.dispose();
      trees.dispose();
      lamps.dispose();
      puddles.dispose();
      signs.dispose();
    },
  };
}

class Buf {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  quad(
    a: number[],
    b: number[],
    c: number[],
    d: number[],
    n: number[],
    uvs: number[],
    color: THREE.Color
  ): void {
    const base = this.pos.length / 3;
    for (const v of [a, b, c, d]) {
      this.pos.push(v[0], v[1], v[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(color.r, color.g, color.b);
    }
    this.uv.push(...uvs);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  tri(a: number[], b: number[], c: number[], n: number[], color: THREE.Color): void {
    const base = this.pos.length / 3;
    for (const v of [a, b, c]) {
      this.pos.push(v[0], v[1], v[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(color.r, color.g, color.b);
      this.uv.push(0, 0);
    }
    this.idx.push(base, base + 1, base + 2);
  }

  geometry(): THREE.BufferGeometry | null {
    if (this.pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    return g;
  }
}

const TILE_W = 14;
const TILE_H = 3.5;
const PLAIN_KINDS = new Set(['shack', 'container', 'warehouse']);
const COASTAL_DISTRICTS = new Set(['plateau', 'cocody', 'riviera', 'port_bouet', 'grand_bassam', 'marcory']);
const SHACK_ROOF_COLORS = [0x9a8f86, 0xa5623f, 0x5b8291, 0x6d7f5a, 0x8b4a32];

function addPrism(
  buf: Buf,
  cx: number,
  cz: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  angle: number,
  wallColor: THREE.Color,
  roofColor: THREE.Color,
  plainBuf: Buf,
  hasWindows: boolean
): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const e1 = [c, 0, s];
  const e2 = [-s, 0, c];
  const faces: Array<{ n: number[]; half: number; len: number }> = [
    { n: e1, half: w / 2, len: d },
    { n: [-e1[0], 0, -e1[2]], half: w / 2, len: d },
    { n: e2, half: d / 2, len: w },
    { n: [-e2[0], 0, -e2[2]], half: d / 2, len: w },
  ];
  for (const f of faces) {
    const t = [f.n[2], 0, -f.n[0]];
    const bx = cx + f.n[0] * f.half;
    const bz = cz + f.n[2] * f.half;
    const v0 = [bx - (t[0] * f.len) / 2, y0, bz - (t[2] * f.len) / 2];
    const v1 = [bx + (t[0] * f.len) / 2, y0, bz + (t[2] * f.len) / 2];
    const v2 = [v1[0], y0 + h, v1[2]];
    const v3 = [v0[0], y0 + h, v0[2]];
    const u1 = hasWindows ? Math.max(1, f.len / TILE_W) : 1;
    const vv = hasWindows ? Math.max(1, h / TILE_H) : 1;
    buf.quad(v0, v1, v2, v3, f.n, [0, 0, u1, 0, u1, vv, 0, vv], wallColor);
  }
  const corner = (sa: number, sb: number): number[] => [
    cx + sa * (w / 2) * e1[0] + sb * (d / 2) * e2[0],
    y0 + h,
    cz + sa * (w / 2) * e1[2] + sb * (d / 2) * e2[2],
  ];
  const up = [0, 1, 0];
  plainBuf.tri(corner(-1, -1), corner(1, 1), corner(1, -1), up, roofColor);
  plainBuf.tri(corner(-1, -1), corner(-1, 1), corner(1, 1), up, roofColor);
}

function addHipRoof(
  plainBuf: Buf,
  cx: number,
  cz: number,
  w: number,
  d: number,
  yBase: number,
  peakH: number,
  angle: number,
  roofColor: THREE.Color
): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const e1 = [c, 0, s];
  const e2 = [-s, 0, c];
  const ow = w * 0.54;
  const od = d * 0.54;
  const pt = (sa: number, sb: number): number[] => [
    cx + sa * ow * e1[0] + sb * od * e2[0],
    yBase,
    cz + sa * ow * e1[2] + sb * od * e2[2],
  ];
  const c00 = pt(-1, -1);
  const c10 = pt(1, -1);
  const c11 = pt(1, 1);
  const c01 = pt(-1, 1);
  const apex = [cx, yBase + peakH, cz];
  const shade = roofColor.clone().multiplyScalar(0.88);
  const triN = (a: number[], b: number[], cc: number[]): number[] => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };
  plainBuf.tri(c00, apex, c10, triN(c00, apex, c10), roofColor);
  plainBuf.tri(c10, apex, c11, triN(c10, apex, c11), shade);
  plainBuf.tri(c11, apex, c01, triN(c11, apex, c01), roofColor);
  plainBuf.tri(c01, apex, c00, triN(c01, apex, c00), shade);
}

function addGableRoof(
  plainBuf: Buf,
  cx: number,
  cz: number,
  w: number,
  d: number,
  yBase: number,
  peakH: number,
  angle: number,
  roofColor: THREE.Color
): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const e1 = [c, 0, s];
  const e2 = [-s, 0, c];
  const hw = w * 0.52;
  const hd = d * 0.52;
  const p = (u: number, v: number, y: number): number[] => [
    cx + u * e1[0] + v * e2[0],
    y,
    cz + u * e1[2] + v * e2[2],
  ];
  const rA = p(-hw, 0, yBase + peakH);
  const rB = p(hw, 0, yBase + peakH);
  const fl = p(-hw, hd, yBase);
  const fr = p(hw, hd, yBase);
  const bl = p(-hw, -hd, yBase);
  const br = p(hw, -hd, yBase);
  const shade = roofColor.clone().multiplyScalar(0.84);

  plainBuf.quad(fl, fr, rB, rA, [e2[0] * 0.5, 0.85, e2[2] * 0.5], [0, 0, 1, 0, 1, 1, 0, 1], roofColor);
  plainBuf.quad(br, bl, rA, rB, [-e2[0] * 0.5, 0.85, -e2[2] * 0.5], [0, 0, 1, 0, 1, 1, 0, 1], shade);
  plainBuf.tri(bl, fl, rA, [-e1[0], 0, -e1[2]], shade);
  plainBuf.tri(fr, br, rB, [e1[0], 0, e1[2]], shade);
}

function addShrubCluster(buf: Buf, x: number, z: number, r: number, h: number, color: THREE.Color): void {
  const shade = color.clone().multiplyScalar(0.84);
  const bright = color.clone().multiplyScalar(1.1);
  const lobes = [
    { lx: x, lz: z, lr: r, lh: h, col: color },
    { lx: x + r * 0.42, lz: z - r * 0.26, lr: r * 0.72, lh: h * 0.82, col: bright },
    { lx: x - r * 0.36, lz: z + r * 0.3, lr: r * 0.68, lh: h * 0.76, col: shade },
  ];
  const N = 6;
  for (const lobe of lobes) {
    const base = 0.04;
    const apex = [lobe.lx, lobe.lh, lobe.lz];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const p0 = [lobe.lx + Math.cos(a0) * lobe.lr, base, lobe.lz + Math.sin(a0) * lobe.lr];
      const p1 = [lobe.lx + Math.cos(a1) * lobe.lr, base, lobe.lz + Math.sin(a1) * lobe.lr];
      const am = (a0 + a1) / 2;
      buf.tri(p0, apex, p1, [Math.cos(am) * 0.7, 0.7, Math.sin(am) * 0.7], i % 2 === 0 ? lobe.col : shade);
    }
  }
}

/** Vraie touffe d'herbe 3D (3 brins croisés, sensible au shader de vent). */
function addGrassTuft(buf: Buf, x: number, z: number, scale: number, col: THREE.Color): void {
  const h = (0.42 + (Math.abs(Math.sin(x * 1.7 + z * 2.3)) * 0.35)) * scale;
  const w = 0.14 * scale;
  const tipCol = col.clone().multiplyScalar(1.18);
  for (let b = 0; b < 3; b++) {
    const ang = b * 1.05 + (x * 0.7 + z * 0.5);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const lean = 0.14 * scale;
    const p0 = [x - ca * w, 0.0, z - sa * w];
    const p1 = [x + ca * w, 0.0, z + sa * w];
    const tip = [x - sa * lean, h * (b === 1 ? 1.15 : 0.92), z + ca * lean];
    buf.tri(p0, p1, tip, [0, 1, 0], b === 1 ? tipCol : col);
  }
}

function addBuilding(
  facade: Buf,
  plain: Buf,
  trees: Buf,
  lamps: Buf,
  b: Building,
  seedIdx: number
): void {
  const color = new THREE.Color(b.color);
  const isPlain = PLAIN_KINDS.has(b.kind);
  const walls = isPlain ? plain : facade;
  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);
  const trimColor = new THREE.Color(0x334155);
  const creamTrim = new THREE.Color(0xe2e8f0);

  if (b.kind === 'tower') {
    const podiumH = Math.min(8, b.h * 0.22);
    const hasUpperTier = b.h > 38;
    const upperH = hasUpperTier ? b.h * 0.26 : 0;
    const shaftH = b.h - podiumH - upperH;
    const podiumColor = color.clone().multiplyScalar(0.76);
    const acColor = new THREE.Color(0x94a3b8);
    addPrism(facade, b.x, b.z, b.w, b.d, 0, podiumH, b.angle, podiumColor, trimColor, plain, true);
    addPrism(facade, b.x, b.z, b.w * 0.82, b.d * 0.82, podiumH, shaftH, b.angle, color, trimColor, plain, true);
    // Corniche de transition + pilastres verticaux architecturaux
    addPrism(plain, b.x, b.z, b.w * 0.86, b.d * 0.86, podiumH - 0.35, 0.55, b.angle, creamTrim, trimColor, plain, false);
    if (hasUpperTier) {
      addPrism(
        facade,
        b.x,
        b.z,
        b.w * 0.66,
        b.d * 0.66,
        podiumH + shaftH,
        upperH,
        b.angle,
        color.clone().multiplyScalar(1.06),
        trimColor,
        plain,
        true
      );
      addPrism(plain, b.x, b.z, b.w * 0.7, b.d * 0.7, podiumH + shaftH - 0.3, 0.48, b.angle, creamTrim, trimColor, plain, false);
    }
    const topW = hasUpperTier ? b.w * 0.66 : b.w * 0.82;
    const crownH = Math.min(5.5, b.h * 0.12);
    addPrism(plain, b.x, b.z, b.w * 0.44, b.d * 0.44, b.h, crownH, b.angle, trimColor, new THREE.Color(0x1e293b), plain, false);
    // Blocs clim + panneaux solaires sur le toit
    const acX = b.x + c * (topW * 0.28);
    const acZ = b.z + s * (topW * 0.28);
    addPrism(plain, acX, acZ, 2.2, 1.6, b.h, 1.3, b.angle, acColor, trimColor, plain, false);
    const solX = b.x - c * (topW * 0.26);
    const solZ = b.z - s * (topW * 0.26);
    addPrism(plain, solX, solZ, 2.6, 1.8, b.h + 0.1, 0.25, b.angle, new THREE.Color(0x1d4ed8), new THREE.Color(0x1e3a8a), plain, false);

    const crownGlow = new THREE.Color(seedIdx % 2 === 0 ? 0xfbbf24 : 0x38bdf8);
    addPrism(lamps, b.x, b.z, b.w * 0.46, b.d * 0.46, b.h + crownH - 0.55, 0.38, b.angle, crownGlow, crownGlow, lamps, false);
    if (b.h > 38) {
      addPrism(plain, b.x, b.z, 0.28, 0.28, b.h + crownH, 7.5, b.angle, trimColor, trimColor, plain, false);
      const beacon = new THREE.Color(0xef4444);
      addPrism(lamps, b.x, b.z, 0.46, 0.46, b.h + crownH + 7.5, 0.46, b.angle, beacon, beacon, lamps, false);
    }
    return;
  }

  if (b.kind === 'villa' || b.kind === 'house') {
    const roofHex = VILLA_WALLED_DISTRICTS.has(b.district) ? 0xb44c2e : 0x8f3a24;
    const roofColor = new THREE.Color(roofHex);
    addPrism(facade, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, roofColor, plain, true);
    addHipRoof(plain, b.x, b.z, b.w, b.d, b.h, b.kind === 'villa' ? 2.4 : 1.7, b.angle, roofColor);
    // Corniche de rive sous toiture (piliers, murets & bougainvilliers gérés par collectChunkDecor)
    addPrism(plain, b.x, b.z, b.w * 1.03, b.d * 1.03, b.h - 0.22, 0.24, b.angle, creamTrim, roofColor, plain, false);
    return;
  }

  if (b.kind === 'shack') {
    const zincColor = new THREE.Color(SHACK_ROOF_COLORS[seedIdx % SHACK_ROOF_COLORS.length]);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, zincColor, plain, false);
    addGableRoof(plain, b.x, b.z, b.w, b.d, b.h, 0.75, b.angle, zincColor);
    if (seedIdx % 2 === 0) {
      const px = b.x - s * (b.d * 0.52 + 0.55);
      const pz = b.z + c * (b.d * 0.52 + 0.55);
      if (!isWater({ x: px, z: pz }) && roadAt({ x: px, z: pz }) === 'none') {
        addPrism(plain, px, pz, b.w * 0.55, 1.05, 1.95, 0.16, b.angle, zincColor, zincColor, plain, false);
      }
    }
    return;
  }

  if (b.kind === 'warehouse') {
    const steelRoof = new THREE.Color(0x5f8a96);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, steelRoof, plain, false);
    addGableRoof(plain, b.x, b.z, b.w, b.d, b.h, 2.2, b.angle, steelRoof);
    return;
  }

  if (b.kind === 'container') {
    const cTop = color.clone().multiplyScalar(0.84);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, cTop, plain, false);
    return;
  }

  // Bloc urbain : corps principal et parapet (corniches, balcons, piliers, néons & kiosques gérés par collectChunkDecor)
  const parapetColor = color.clone().multiplyScalar(0.6);
  addPrism(walls, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, parapetColor, plain, true);
  addPrism(plain, b.x, b.z, b.w * 1.04, b.d * 1.04, b.h, 0.55, b.angle, parapetColor, parapetColor, plain, false);
}

function addTree(buf: Buf, x: number, z: number, h: number, hash: number, districtId: string): void {
  const isCoastal = COASTAL_DISTRICTS.has(districtId);
  const isBanco = districtId === 'banco';
  const kindPick = hash % 10;

  // Choix botanique : palmier, flamboyant fleuri, bananier ou manguier/fromager
  if (isCoastal && kindPick < 5) {
    const trunk = new THREE.Color(0x735238);
    const crown = new THREE.Color().setHSL(0.3 + ((hash % 7) - 3) * 0.008, 0.58, 0.3 + ((hash % 5) - 2) * 0.015);
    const tw = 0.16;
    const th = h * 0.78;
    const lean = ((hash % 5) - 2) * 0.18;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const tx = dz, tz = -dx;
      const bx0 = x + dx * tw, bz0 = z + dz * tw;
      const bx1 = x + lean + dx * (tw * 0.7), bz1 = z + lean * 0.5 + dz * (tw * 0.7);
      buf.quad(
        [bx0 - tx * tw, 0, bz0 - tz * tw],
        [bx0 + tx * tw, 0, bz0 + tz * tw],
        [bx1 + tx * tw * 0.7, th, bz1 + tz * tw * 0.7],
        [bx1 - tx * tw * 0.7, th, bz1 - tz * tw * 0.7],
        [dx, 0, dz],
        [0, 0, 1, 0, 1, 1, 0, 1],
        trunk
      );
    }
    const txTop = x + lean, tzTop = z + lean * 0.5;
    const frondLen = 2.0 + h * 0.13;
    const frondW = 0.44;
    const N = 6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (hash % 6) * 0.4;
      const fx = Math.cos(a), fz = Math.sin(a);
      const px = -fz * frondW, pz = fx * frondW;
      const pTop = [txTop, th, tzTop];
      const pMidL = [txTop + fx * frondLen * 0.55 + px, th + 0.58, tzTop + fz * frondLen * 0.55 + pz];
      const pMidR = [txTop + fx * frondLen * 0.55 - px, th + 0.58, tzTop + fz * frondLen * 0.55 - pz];
      const pTip = [txTop + fx * frondLen, th - 0.38, tzTop + fz * frondLen];
      buf.tri(pTop, pMidL, pTip, [0, 1, 0], crown);
      buf.tri(pTop, pTip, pMidR, [0, 1, 0], crown.clone().multiplyScalar(0.88));
    }
    return;
  }

  // Bananier tropical (feuilles larges en éventail autour des cours / quartiers)
  if (!isBanco && kindPick === 5 && h < 8.5) {
    const stemCol = new THREE.Color(0x557c3a);
    const leafCol = new THREE.Color(0x4d9c34);
    const sh = Math.min(2.8, h * 0.48);
    const tw = 0.14;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const tx = dz, tz = -dx;
      const bx = x + dx * tw, bz = z + dz * tw;
      buf.quad(
        [bx - tx * tw, 0, bz - tz * tw],
        [bx + tx * tw, 0, bz + tz * tw],
        [bx + tx * tw * 0.8, sh, bz + tz * tw * 0.8],
        [bx - tx * tw * 0.8, sh, bz - tz * tw * 0.8],
        [dx, 0, dz],
        [0, 0, 1, 0, 1, 1, 0, 1],
        stemCol
      );
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (hash % 5) * 0.3;
      const fx = Math.cos(a), fz = Math.sin(a);
      const px = -fz * 0.38, pz = fx * 0.38;
      const len = 1.9;
      buf.tri([x, sh, z], [x + fx * len * 0.6 + px, sh + 0.65, z + fz * len * 0.6 + pz], [x + fx * len, sh - 0.15, z + fz * len], [0, 1, 0], leafCol);
      buf.tri([x, sh, z], [x + fx * len, sh - 0.15, z + fz * len], [x + fx * len * 0.6 - px, sh + 0.65, z + fz * len * 0.6 - pz], [0, 1, 0], leafCol.clone().multiplyScalar(0.9));
    }
    return;
  }

  // Tronc commun pour Flamboyant ou Manguier/Fromager
  const trunk = new THREE.Color(0x563d24);
  const tw = isBanco ? 0.28 : 0.22;
  const th = h * 0.45;
  for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const tx = dz, tz = -dx;
    const bx = x + dx * tw, bz = z + dz * tw;
    buf.quad(
      [bx - tx * tw, 0, bz - tz * tw],
      [bx + tx * tw, 0, bz + tz * tw],
      [bx + tx * tw * 0.78, th, bz + tz * tw * 0.78],
      [bx - tx * tw * 0.78, th, bz - tz * tw * 0.78],
      [dx, 0, dz],
      [0, 0, 1, 0, 1, 1, 0, 1],
      trunk
    );
  }

  // Flamboyant en fleurs (couronne large et plate + fleurs rouge-orangé)
  if (!isBanco && kindPick === 6) {
    const foliage = new THREE.Color(0x3f7d2b);
    const bloom = new THREE.Color(hash % 2 === 0 ? 0xef4444 : 0xf97316);
    const r = 1.9 + h * 0.18;
    const N = 7;
    const apex = [x, h * 0.76, z];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, th * 0.92, z + Math.sin(a0) * r];
      const p1 = [x + Math.cos(a1) * r, th * 0.92, z + Math.sin(a1) * r];
      const am = (a0 + a1) / 2;
      buf.tri(p0, apex, p1, [Math.cos(am) * 0.5, 0.85, Math.sin(am) * 0.5], i % 2 === 0 ? bloom : foliage);
    }
    return;
  }

  // Manguier / Fromager multi-lobes (houppier organique en plusieurs grappes)
  const crown = new THREE.Color().setHSL(0.27 + ((hash % 7) - 3) * 0.01, 0.5, 0.28 + ((hash % 5) - 2) * 0.015);
  const lobes = [
    { ox: 0, oz: 0, baseY: th * 0.78, apexY: h * 0.96, r: 1.4 + h * 0.16, col: crown },
    { ox: 0.75, oz: 0.45, baseY: th * 0.85, apexY: h * 0.82, r: 1.05 + h * 0.1, col: crown.clone().multiplyScalar(1.1) },
    { ox: -0.7, oz: -0.45, baseY: th * 0.88, apexY: h * 0.8, r: 1.0 + h * 0.1, col: crown.clone().multiplyScalar(0.92) },
  ];
  const N = 6;
  for (const lobe of lobes) {
    const cx = x + lobe.ox, cz = z + lobe.oz;
    const apex = [cx, lobe.apexY, cz];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * lobe.r, lobe.baseY, cz + Math.sin(a0) * lobe.r];
      const p1 = [cx + Math.cos(a1) * lobe.r, lobe.baseY, cz + Math.sin(a1) * lobe.r];
      const am = (a0 + a1) / 2;
      buf.tri(p0, apex, p1, [Math.cos(am) * 0.7, 0.7, Math.sin(am) * 0.7], lobe.col);
    }
  }
}

function addBeachedPirogue(plain: Buf, x: number, z: number, angle: number, hullCol: THREE.Color): void {
  const trim = new THREE.Color(0xd97706);
  const accent = new THREE.Color(0xfef08a);
  const bench = new THREE.Color(0x92400e);
  addPrism(plain, x, z, 3.6, 0.92, 0.04, 0.42, angle, hullCol, hullCol, plain, false);
  addPrism(plain, x, z, 3.5, 0.94, 0.34, 0.08, angle, accent, trim, plain, false);
  const c = Math.cos(angle), s = Math.sin(angle);
  addPrism(plain, x + c * 2.1, z + s * 2.1, 0.9, 0.54, 0.1, 0.4, angle, trim, trim, plain, false);
  addPrism(plain, x - c * 2.1, z - s * 2.1, 0.9, 0.54, 0.1, 0.36, angle, trim, trim, plain, false);
  for (const bx of [-0.75, 0.75]) {
    addPrism(plain, x + c * bx, z + s * bx, 0.34, 0.86, 0.42, 0.07, angle, bench, bench, plain, false);
  }
  // Pagaie posée sur les bancs
  addPrism(plain, x + c * 0.25, z + s * 0.25, 1.55, 0.1, 0.49, 0.05, angle + 0.14, trim, trim, plain, false);
  addPrism(plain, x - c * 0.6, z - s * 0.6, 0.42, 0.2, 0.49, 0.04, angle + 0.14, accent, accent, plain, false);
}

/** Voiture garée compacte style chibi (pare-chocs, calandre, rétros, jantes et feux). */
function addParkedCar(plain: Buf, lamps: Buf, x: number, z: number, angle: number, bodyCol: THREE.Color): void {
  const c = Math.cos(angle), s = Math.sin(angle);
  const pt = (lu: number, lv: number): [number, number] => [x + c * lu - s * lv, z + s * lu + c * lv];
  const glass = new THREE.Color(0x0f172a);
  const bumper = new THREE.Color(0x1e293b);
  const chrome = new THREE.Color(0xe2e8f0);
  const tire = new THREE.Color(0x18181b);
  const head = new THREE.Color(0xfef08a);
  const tail = new THREE.Color(0xef4444);
  const plate = new THREE.Color(0xf8fafc);

  // Coque principale + pare-chocs avant/arrière (dans l'emprise 3.6 × 1.62)
  addPrism(plain, x, z, 3.54, 1.6, 0.24, 0.62, angle, bodyCol, bodyCol, plain, false);
  addPrism(plain, ...pt(1.74, 0), 0.14, 1.58, 0.22, 0.18, angle, bumper, bumper, plain, false);
  addPrism(plain, ...pt(-1.74, 0), 0.14, 1.58, 0.22, 0.18, angle, bumper, bumper, plain, false);

  // Cabine vitrée + pavillon peint + montant B
  addPrism(plain, ...pt(-0.15, 0), 1.88, 1.42, 0.86, 0.46, angle, glass, bodyCol, plain, false);
  addPrism(plain, ...pt(-0.18, 0), 1.24, 1.4, 1.31, 0.06, angle, bodyCol, bodyCol, plain, false);
  addPrism(plain, ...pt(-0.15, 0), 0.1, 1.46, 0.86, 0.46, angle, bumper, bumper, plain, false);

  // Calandre chromée + plaques + poignées + rétroviseurs
  addPrism(plain, ...pt(1.79, 0), 0.06, 0.68, 0.46, 0.22, angle, chrome, chrome, plain, false);
  addPrism(plain, ...pt(1.81, 0), 0.04, 0.4, 0.28, 0.11, angle, plate, plate, plain, false);
  for (const side of [-1, 1]) {
    addPrism(plain, ...pt(0.48, side * 0.85), 0.12, 0.14, 0.84, 0.1, angle, bumper, bumper, plain, false);
    addPrism(plain, ...pt(0.05, side * 0.81), 0.18, 0.04, 0.66, 0.05, angle, chrome, chrome, plain, false);
  }

  // 4 roues avec jantes alliage
  for (const sx of [-1.08, 1.08]) {
    for (const sz of [-0.74, 0.74]) {
      const [wx, wz] = pt(sx, sz);
      addPrism(plain, wx, wz, 0.52, 0.2, 0, 0.46, angle, tire, tire, plain, false);
      const [rx, rz] = pt(sx, sz + Math.sign(sz) * 0.02);
      addPrism(plain, rx, rz, 0.26, 0.18, 0.12, 0.22, angle, chrome, chrome, plain, false);
    }
  }
  // Feux avant/arrière séparés gauche & droite
  for (const side of [-0.55, 0.55]) {
    addPrism(lamps, ...pt(1.79, side), 0.07, 0.28, 0.48, 0.14, angle, head, head, lamps, false);
    addPrism(lamps, ...pt(-1.79, side), 0.07, 0.28, 0.5, 0.14, angle, tail, tail, lamps, false);
  }
}

/** Flaque d'eau miroitante posée dans un caniveau / bord de rue. */
function addPuddle(puddles: Buf, x: number, z: number, rx: number, rz: number, seed: number): void {
  const col = new THREE.Color(0x3b6e8c);
  const pts: number[][] = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const jit = 0.78 + ((hash32(Math.floor(x), Math.floor(z), seed + i) & 31) / 120);
    pts.push([x + Math.cos(a) * rx * jit, 0.025, z + Math.sin(a) * rz * jit]);
  }
  const center = [x, 0.025, z];
  const up = [0, 1, 0];
  for (let i = 0; i < N; i++) {
    puddles.tri(center, pts[(i + 1) % N], pts[i], up, col);
  }
}

function addSignBoard(plain: Buf, signs: Buf, s: SignDecor): void {
  const frameCol = new THREE.Color(0x1e293b);
  addPrism(plain, s.x, s.z, s.w + 0.08, 0.1, s.y0 - 0.03, s.h + 0.06, s.angle, frameCol, frameCol, plain, false);

  const c = Math.cos(s.angle);
  const sn = Math.sin(s.angle);
  const nx = -sn;
  const nz = c;
  const frontX = s.x + nx * 0.06;
  const frontZ = s.z + nz * 0.06;
  const hw = s.w / 2;
  const v0 = [frontX - c * hw, s.y0, frontZ - sn * hw];
  const v1 = [frontX + c * hw, s.y0, frontZ + sn * hw];
  const v2 = [v1[0], s.y0 + s.h, v1[2]];
  const v3 = [v0[0], s.y0 + s.h, v0[2]];
  const N = SIGN_SPECS.length;
  const idx = SIGN_INDEX[s.kind];
  const pad = 0.04 / N;
  const vTop = 1 - idx / N - pad;
  const vBot = 1 - (idx + 1) / N + pad;
  const white = new THREE.Color(0xffffff);
  signs.quad(v0, v1, v2, v3, [nx, 0, nz], [0.01, vBot, 0.99, vBot, 0.99, vTop, 0.01, vTop], white);
}

function addDumpster(plain: Buf, d: DumpsterDecor): void {
  const body = new THREE.Color(d.color);
  const lid = new THREE.Color(0x1e293b);
  const rim = new THREE.Color(0x94a3b8);
  const wheel = new THREE.Color(0x0f172a);
  const c = Math.cos(d.angle);
  const s = Math.sin(d.angle);
  addPrism(plain, d.x, d.z, 1.42, 0.88, 0.12, 0.9, d.angle, body, rim, plain, false);
  // Nervures latérales + poignées de manutention + couvercle bombé
  for (const rx of [-0.42, 0, 0.42]) {
    addPrism(plain, d.x + c * rx, d.z + s * rx, 0.08, 0.92, 0.2, 0.74, d.angle, rim, rim, plain, false);
  }
  for (const sx of [-0.74, 0.74]) {
    addPrism(plain, d.x + c * sx, d.z + s * sx, 0.08, 0.28, 0.68, 0.08, d.angle, wheel, wheel, plain, false);
  }
  addPrism(plain, d.x, d.z, 1.48, 0.94, 1.02, 0.1, d.angle, lid, lid, plain, false);
  addPrism(plain, d.x, d.z, 1.28, 0.74, 1.12, 0.06, d.angle, lid, rim, plain, false);
  for (const sx of [-0.52, 0.52]) {
    for (const sz of [-0.32, 0.32]) {
      addPrism(plain, d.x + c * sx - s * sz, d.z + s * sx + c * sz, 0.12, 0.12, 0, 0.12, d.angle, wheel, wheel, plain, false);
    }
  }
  if (d.hasCompanionBin) {
    const bx = d.x + c * 1.08;
    const bz = d.z + s * 1.08;
    addPrism(plain, bx, bz, 0.5, 0.5, 0, 0.78, d.angle, new THREE.Color(0x16a34a), lid, plain, false);
    addPrism(plain, bx, bz, 0.52, 0.52, 0.58, 0.07, d.angle, new THREE.Color(0xfacc15), new THREE.Color(0xfacc15), plain, false);
    addPrism(plain, bx, bz, 0.54, 0.54, 0.78, 0.07, d.angle, lid, lid, plain, false);
  }
}

function addFoodVendor(plain: Buf, lamps: Buf, v: FoodVendorDecor): void {
  const c = Math.cos(v.angle);
  const s = Math.sin(v.angle);
  const pt = (lu: number, lv: number): [number, number] => [v.x + lu * c - lv * s, v.z + lu * s + lv * c];
  const wood = new THREE.Color(0x78350f);
  const parasol = new THREE.Color(v.parasolColor);
  const skin = new THREE.Color(0x5c3824);
  const pagne = new THREE.Color(v.pagneColor);
  const blouse = new THREE.Color(v.blouseColor);
  const foulard = new THREE.Color(v.foulardColor);

  // Parasol commun au-dessus du stand
  const [px, pz] = pt(-0.35, -0.05);
  addPrism(plain, px, pz, 0.08, 0.08, 0, 2.1, v.angle, wood, wood, plain, false);
  addHipRoof(plain, px, pz, 2.0, 2.0, 2.08, 0.42, v.angle, parasol);

  if (v.kind === 'galettes') {
    // Table + vitrine à galettes + bocaux de piment rouge + galettes dorées visibles à l'intérieur
    const [tx, tz] = pt(0, 0.34);
    addPrism(plain, tx, tz, 1.05, 0.65, 0, 0.74, v.angle, wood, new THREE.Color(0x92400e), plain, false);
    addPrism(plain, tx, tz, 0.84, 0.5, 0.74, 0.32, v.angle, new THREE.Color(0xdbeafe), new THREE.Color(0xe2e8f0), plain, false);
    addPrism(plain, tx, tz, 0.88, 0.54, 1.04, 0.04, v.angle, new THREE.Color(0x92400e), new THREE.Color(0x92400e), plain, false);
    const galCol = new THREE.Color(0xd97706);
    const galTop = new THREE.Color(0xf59e0b);
    for (const gx of [-0.22, 0.0, 0.22]) {
      const [gpx, gpz] = pt(gx, 0.34);
      addPrism(plain, gpx, gpz, 0.18, 0.18, 0.75, 0.18, v.angle, galCol, galTop, plain, false);
    }
    const [pxJar, pzJar] = pt(0.45, 0.48);
    addPrism(plain, pxJar, pzJar, 0.1, 0.1, 0.74, 0.16, v.angle, new THREE.Color(0xdc2626), new THREE.Color(0xfef08a), plain, false);
  } else {
    // Vendeuse de gnonmi : fourneau charbon incandescent + moule à gnonmi + boules dorées + cuvette + bouteille d'huile
    const [fx, fz] = pt(-0.28, 0.34);
    const iron = new THREE.Color(0x334155);
    addPrism(plain, fx, fz, 0.52, 0.52, 0, 0.54, v.angle, iron, new THREE.Color(0x1e293b), plain, false);
    addPrism(lamps, fx, fz, 0.34, 0.34, 0.44, 0.1, v.angle, new THREE.Color(0xf97316), new THREE.Color(0xfbbf24), lamps, false);
    addPrism(plain, fx, fz, 0.58, 0.58, 0.54, 0.08, v.angle, new THREE.Color(0x1e293b), iron, plain, false);
    for (const side of [-0.32, 0.32]) {
      const [hx, hz] = pt(-0.28 + side, 0.34);
      addPrism(plain, hx, hz, 0.08, 0.14, 0.56, 0.06, v.angle, iron, iron, plain, false);
    }
    const gnonCol = new THREE.Color(0xfbbf24);
    for (const [ox, oz] of [[-0.14, -0.14], [0.14, -0.14], [0, 0], [-0.14, 0.14], [0.14, 0.14]]) {
      const [bx, bz] = pt(-0.28 + ox, 0.34 + oz);
      addPrism(plain, bx, bz, 0.11, 0.11, 0.62, 0.09, v.angle, gnonCol, gnonCol, plain, false);
    }
    const [cx, cz] = pt(0.36, 0.34);
    addPrism(plain, cx, cz, 0.58, 0.52, 0, 0.66, v.angle, wood, wood, plain, false);
    addPrism(plain, cx, cz, 0.42, 0.42, 0.66, 0.14, v.angle, new THREE.Color(0x0ea5e9), new THREE.Color(0xf59e0b), plain, false);
    const [bxOil, bzOil] = pt(0.58, 0.18);
    addPrism(plain, bxOil, bzOil, 0.1, 0.1, 0.66, 0.22, v.angle, new THREE.Color(0xfacc15), new THREE.Color(0xdc2626), plain, false);
  }

  // Vendeuse chibi stylisée assise/debout derrière son étal, face à la rue (+e2)
  const [wx, wz] = pt(0, -0.44);
  addPrism(plain, wx, wz, 0.34, 0.34, 0, 0.36, v.angle, wood, wood, plain, false);
  addPrism(plain, wx, wz, 0.42, 0.34, 0.36, 0.68, v.angle, pagne, pagne, plain, false);
  addPrism(plain, wx, wz, 0.43, 0.35, 0.44, 0.08, v.angle, foulard, foulard, plain, false);
  addPrism(plain, wx, wz, 0.4, 0.26, 1.04, 0.42, v.angle, blouse, blouse, plain, false);
  addPrism(plain, wx, wz, 0.16, 0.16, 1.44, 0.05, v.angle, new THREE.Color(0xfbbf24), new THREE.Color(0xfbbf24), plain, false);
  for (const side of [-1, 1]) {
    const [ax, az] = pt(side * 0.22, -0.28);
    addPrism(plain, ax, az, 0.1, 0.3, 1.12, 0.12, v.angle, skin, skin, plain, false);
  }
  addPrism(plain, wx, wz, 0.22, 0.22, 1.48, 0.24, v.angle, skin, skin, plain, false);
  addPrism(plain, wx, wz, 0.26, 0.28, 1.7, 0.16, v.angle, foulard, foulard, plain, false);
  const [kx, kz] = pt(0.06, -0.42);
  addPrism(plain, kx, kz, 0.12, 0.12, 1.84, 0.1, v.angle, foulard, foulard, plain, false);
}

function renderDecorPlan(
  facade: Buf,
  plain: Buf,
  trees: Buf,
  lamps: Buf,
  puddles: Buf,
  signs: Buf,
  plan: ChunkDecorPlan
): void {
  const poleMatCol = new THREE.Color(0x475569);
  const woodPoleCol = new THREE.Color(0x6b4423);
  const wireCol = new THREE.Color(0x1e293b);
  const bulbCol = new THREE.Color(0xfef08a);
  const shelterBlue = new THREE.Color(0x1d4ed8);
  const shelterBench = new THREE.Color(0xf97316);
  const shelterGlass = new THREE.Color(0x93c5fd);
  const binGreen = new THREE.Color(0x15803d);

  for (const bx of plan.facadeBoxes) {
    const col = new THREE.Color(bx.color);
    const rCol = bx.roofColor !== undefined ? new THREE.Color(bx.roofColor) : col;
    addPrism(facade, bx.x, bx.z, bx.w, bx.d, bx.y0, bx.h, bx.angle, col, rCol, plain, true);
  }
  for (const bx of plan.buildingBoxes) {
    const col = new THREE.Color(bx.color);
    const rCol = bx.roofColor !== undefined ? new THREE.Color(bx.roofColor) : col;
    addPrism(plain, bx.x, bx.z, bx.w, bx.d, bx.y0, bx.h, bx.angle, col, rCol, plain, false);
  }
  for (const lp of plan.buildingLamps) {
    const col = new THREE.Color(lp.color);
    addPrism(lamps, lp.x, lp.z, lp.w, lp.d, lp.y0, lp.h, lp.angle, col, col, lamps, false);
  }
  for (const sg of plan.signs) {
    addSignBoard(plain, signs, sg);
  }
  for (const sh of plan.buildingShrubs) {
    addShrubCluster(trees, sh.x, sh.z, sh.r, sh.h, new THREE.Color(sh.color));
  }

  for (const sl of plan.streetlamps) {
    addPrism(plain, sl.poleX, sl.poleZ, 0.22, 0.22, 0, 5.4, sl.angle, poleMatCol, poleMatCol, plain, false);
    addPrism(plain, sl.armX, sl.armZ, 0.2, 1.5, 5.25, 0.16, sl.angle, poleMatCol, poleMatCol, plain, false);
    addPrism(lamps, sl.bulbX, sl.bulbZ, 0.38, 0.56, 5.1, 0.18, sl.angle, bulbCol, bulbCol, lamps, false);
  }

  for (const s of plan.shelters) {
    addPrism(plain, s.x, s.z, 3.6, 1.35, 2.35, 0.18, s.angle, shelterBlue, shelterBlue, plain, false);
    addPrism(plain, s.backX, s.backZ, 3.4, 0.14, 0, 2.35, s.angle, shelterGlass, poleMatCol, plain, false);
    addPrism(plain, s.backX, s.backZ, 1.4, 0.18, 1.65, 0.42, s.angle, shelterBench, shelterBench, plain, false);
    addPrism(lamps, s.x, s.z, 2.2, 0.24, 2.28, 0.08, s.angle, bulbCol, bulbCol, lamps, false);
    addPrism(plain, s.x, s.z, 2.6, 0.45, 0.42, 0.14, s.angle, shelterBench, shelterBench, plain, false);
    addPrism(plain, s.post1X, s.post1Z, 0.14, 0.14, 0, 2.35, s.angle, poleMatCol, poleMatCol, plain, false);
    addPrism(plain, s.post2X, s.post2Z, 0.14, 0.14, 0, 2.35, s.angle, poleMatCol, poleMatCol, plain, false);
  }

  for (const p of plan.poles) {
    addPrism(plain, p.x, p.z, 0.2, 0.2, 0, 5.2, p.angle, woodPoleCol, woodPoleCol, plain, false);
    addPrism(plain, p.x, p.z, 0.85, 0.14, 4.9, 0.12, p.angle, poleMatCol, poleMatCol, plain, false);
    addPrism(lamps, p.bulbX, p.bulbZ, 0.3, 0.35, 4.72, 0.14, p.angle, bulbCol, bulbCol, lamps, false);
    if (p.wireMidX !== undefined && p.wireMidZ !== undefined && p.wireLen !== undefined) {
      addPrism(plain, p.wireMidX, p.wireMidZ, 0.05, p.wireLen, 4.98, 0.04, p.angle, wireCol, wireCol, plain, false);
    }
  }

  const produceRed = new THREE.Color(0xef4444);
  const produceGold = new THREE.Color(0xfacc15);
  const produceGreen = new THREE.Color(0x22c55e);
  for (const st of plan.stalls) {
    const tarp = new THREE.Color(st.tarpColor);
    const sc = Math.cos(st.angle), ss = Math.sin(st.angle);
    addPrism(plain, st.x, st.z, 1.45, 0.85, 0, 0.8, st.angle, woodPoleCol, woodPoleCol, plain, false);
    addPrism(plain, st.x, st.z, 0.1, 0.1, 0.8, 1.35, st.angle, woodPoleCol, woodPoleCol, plain, false);
    // Paniers/tas de fruits et tissus colorés posés sur l'étal + petite ampoule sous le parasol
    addPrism(plain, st.x - sc * 0.42, st.z - ss * 0.42, 0.36, 0.36, 0.8, 0.2, st.angle, produceRed, produceGold, plain, false);
    addPrism(plain, st.x + sc * 0.42, st.z + ss * 0.42, 0.34, 0.34, 0.8, 0.18, st.angle, produceGreen, produceGold, plain, false);
    addPrism(lamps, st.x, st.z, 0.14, 0.14, 1.98, 0.12, st.angle, bulbCol, bulbCol, lamps, false);
    addHipRoof(plain, st.x, st.z, 2.0, 2.0, 2.1, 0.45, st.angle, tarp);
  }

  const binBand = new THREE.Color(0xfacc15);
  for (const b of plan.bins) {
    addPrism(plain, b.x, b.z, 0.48, 0.48, 0, 0.78, b.angle, binGreen, poleMatCol, plain, false);
    addPrism(plain, b.x, b.z, 0.5, 0.5, 0.56, 0.08, b.angle, binBand, binBand, plain, false);
    addPrism(plain, b.x, b.z, 0.52, 0.52, 0.78, 0.07, b.angle, wireCol, wireCol, plain, false);
  }

  for (const d of plan.dumpsters) {
    addDumpster(plain, d);
  }

  for (const fv of plan.foodVendors) {
    addFoodVendor(plain, lamps, fv);
  }

  for (const sh of plan.shrubs) {
    addShrubCluster(trees, sh.x, sh.z, sh.r, sh.h, new THREE.Color(sh.color));
  }

  for (const car of plan.parkedCars) {
    addParkedCar(plain, lamps, car.x, car.z, car.angle, new THREE.Color(car.color));
  }

  for (const pir of plan.pirogues) {
    addBeachedPirogue(plain, pir.x, pir.z, pir.angle, new THREE.Color(pir.color));
  }

  for (const par of plan.parasols) {
    const parasolCol = new THREE.Color(par.color);
    addPrism(plain, par.x, par.z, 0.14, 0.14, 0, 2.15, 0, woodPoleCol, woodPoleCol, plain, false);
    addHipRoof(plain, par.x, par.z, 2.6, 2.6, 2.1, 0.55, par.angle, parasolCol);
  }

  for (const g of plan.grass) {
    addGrassTuft(trees, g.x, g.z, g.scale, new THREE.Color(g.color));
  }

  for (const pud of plan.puddles) {
    addPuddle(puddles, pud.x, pud.z, pud.rx, pud.rz, pud.seed);
  }
}

export interface ChunkObjects {
  group: THREE.Group;
  solids: ChunkSolid[];
  venues: StreetVenueDecor[];
  dispose(): void;
}

/** Construit les objets Three.js d'un chunk (sol + architecture + végétation + mobilier de rue). */
export function buildChunkObjects(
  data: ChunkData,
  ground: Uint8Array,
  groundSize: number,
  mats: ChunkMaterials
): ChunkObjects {
  const group = new THREE.Group();
  const disposables: Array<{ dispose(): void }> = [];

  // Sol
  const x0 = data.cx * CHUNK;
  const z0 = data.cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute([x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0], 3));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  gg.setIndex([0, 1, 2, 0, 2, 3]);

  const tex = new THREE.DataTexture(ground, groundSize, groundSize, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const gmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94, metalness: 0 });
  const gmesh = new THREE.Mesh(gg, gmat);
  gmesh.receiveShadow = true;
  group.add(gmesh);
  disposables.push(gg, tex, gmat);

  const HERO_LANDMARKS = new Set([
    'port_collider', 'stade', 'cathedrale', 'hotel_ivoire', 'lycee_caiman', 'lycee_alysma',
    'lycee_alex', 'marche_adjame', 'port', 'maquis', 'mairie', 'palais_culture', 'aeroport',
  ]);
  const facade = new Buf();
  const plain = new Buf();
  const tb = new Buf();
  const lamps = new Buf();
  const puddles = new Buf();
  const signs = new Buf();

  data.buildings.forEach((b, i) => {
    if (b.landmark && (HERO_LANDMARKS.has(b.landmark) || isHospitalId(b.landmark) || isMairieId(b.landmark) || isCommissariatId(b.landmark) || isPetitHotelId(b.landmark))) return;
    addBuilding(facade, plain, tb, lamps, b, i);
  });

  const decorPlan = collectChunkDecor(data);
  renderDecorPlan(facade, plain, tb, lamps, puddles, signs, decorPlan);

  const fg = facade.geometry();
  if (fg) {
    const m = new THREE.Mesh(fg, mats.facade);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    disposables.push(fg);
  }

  const pg = plain.geometry();
  if (pg) {
    const m = new THREE.Mesh(pg, mats.plain);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    disposables.push(pg);
  }

  const sg = signs.geometry();
  if (sg) {
    const m = new THREE.Mesh(sg, mats.signs);
    group.add(m);
    disposables.push(sg);
  }

  const primaryDistrict = data.buildings[0]?.district ?? districtAt({ x: x0 + CHUNK / 2, z: z0 + CHUNK / 2 }).id;
  data.trees.forEach((t, i) => {
    const h = Math.abs(Math.floor(t.x * 7 + t.z * 13 + i)) | 0;
    addTree(tb, t.x, t.z, t.h, h, primaryDistrict);
  });
  const tg = tb.geometry();
  if (tg) {
    const m = new THREE.Mesh(tg, mats.trees);
    m.castShadow = true;
    group.add(m);
    disposables.push(tg);
  }

  const lg = lamps.geometry();
  if (lg) {
    const m = new THREE.Mesh(lg, mats.lamps);
    group.add(m);
    disposables.push(lg);
  }

  const wpg = puddles.geometry();
  if (wpg) {
    const m = new THREE.Mesh(wpg, mats.puddles);
    group.add(m);
    disposables.push(wpg);
  }

  return { group, solids: decorPlan.solids, venues: decorPlan.venues, dispose: () => disposables.forEach((d) => d.dispose()) };
}
