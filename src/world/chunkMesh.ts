/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Transforme un chunk généré en objets Three.js stylisés façon GTA San Andreas Abidjan :
 * sol texturé, façades vitrées/vérandas, toitures en pente/terrasses différenciées par commune,
 * auvents de maquis/boutiques et palmiers/manguiers fusionnés (~4 appels de dessin par chunk).
 */

import * as THREE from 'three';
import { Building, ChunkData, CHUNK } from './city';

export interface ChunkMaterials {
  facade: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  trees: THREE.MeshLambertMaterial;
  setNight: (night: boolean) => void;
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

    // Subtle concrete horizontal sill & vertical pilaster bands
    if (!lit) {
      g.fillStyle = '#dde1e6';
      g.fillRect(0, 0, W, 10);
      g.fillRect(0, H - 8, W, 8);
    }

    const pattern = [1, 0, 1, 1, 0, 1, 1, 0];
    const cols = 8;
    const colW = W / cols;
    for (let i = 0; i < cols; i++) {
      const x = i * colW + 6;
      const winW = colW - 12;
      if (lit) {
        if (pattern[i]) {
          g.fillStyle = i % 3 === 0 ? '#fde047' : '#fbbf24';
          g.fillRect(x, 22, winW, 68);
        }
      } else {
        // Window frame + recessed glass + balcony sill
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

export function createChunkMaterials(night: boolean): ChunkMaterials {
  const tex = makeFacadeTextures();
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
  const trees = new THREE.MeshLambertMaterial({ vertexColors: true });

  const setNight = (isNight: boolean) => {
    facade.emissiveIntensity = isNight ? 0.95 : 0.0;
  };

  return {
    facade,
    plain,
    trees,
    setNight,
    dispose: () => {
      tex.map.dispose();
      tex.emissive.dispose();
      facade.dispose();
      plain.dispose();
      trees.dispose();
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
const AWNING_COLORS = [0xea580c, 0x16a34a, 0x2563eb, 0xd97706, 0xdc2626];

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

function addBuilding(facade: Buf, plain: Buf, b: Building, seedIdx: number): void {
  const color = new THREE.Color(b.color);
  const isPlain = PLAIN_KINDS.has(b.kind);
  const walls = isPlain ? plain : facade;

  if (b.kind === 'tower') {
    // Plateau Skyscraper: wide podium base + tall glass shaft + stepped crown penthouse
    const podiumH = Math.min(8, b.h * 0.22);
    const shaftH = b.h - podiumH;
    const podiumColor = color.clone().multiplyScalar(0.76);
    const trimColor = new THREE.Color(0x334155);
    addPrism(facade, b.x, b.z, b.w, b.d, 0, podiumH, b.angle, podiumColor, trimColor, plain, true);
    addPrism(facade, b.x, b.z, b.w * 0.82, b.d * 0.82, podiumH, shaftH, b.angle, color, trimColor, plain, true);
    // Rooftop mechanical crown / penthouse
    const crownH = Math.min(5.5, b.h * 0.12);
    addPrism(plain, b.x, b.z, b.w * 0.48, b.d * 0.48, b.h, crownH, b.angle, trimColor, new THREE.Color(0x1e293b), plain, false);
    return;
  }

  if (b.kind === 'villa' || b.kind === 'house') {
    const roofHex = b.district === 'cocody' || b.district === 'riviera' || b.district === 'grand_bassam'
      ? 0xb44c2e
      : 0x8f3a24;
    const roofColor = new THREE.Color(roofHex);
    addPrism(facade, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, roofColor, plain, true);
    addHipRoof(plain, b.x, b.z, b.w, b.d, b.h, b.kind === 'villa' ? 2.4 : 1.7, b.angle, roofColor);
    // Front veranda canopy on villas
    if (b.kind === 'villa') {
      const c = Math.cos(b.angle);
      const s = Math.sin(b.angle);
      const vx = b.x - s * (b.d * 0.56);
      const vz = b.z + c * (b.d * 0.56);
      addPrism(plain, vx, vz, b.w * 0.58, 1.8, 2.5, 0.28, b.angle, new THREE.Color(0xd97706), roofColor, plain, false);
    }
    return;
  }

  if (b.kind === 'shack') {
    // Sloped corrugated zinc/terracotta roof instead of flat box
    const zincColor = new THREE.Color(seedIdx % 2 === 0 ? 0x6b7280 : 0x7c4a32);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, zincColor, plain, false);
    addGableRoof(plain, b.x, b.z, b.w, b.d, b.h, 0.75, b.angle, zincColor);
    return;
  }

  if (b.kind === 'warehouse') {
    const steelRoof = new THREE.Color(0x475569);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, steelRoof, plain, false);
    addGableRoof(plain, b.x, b.z, b.w, b.d, b.h, 2.2, b.angle, steelRoof);
    return;
  }

  if (b.kind === 'container') {
    const cTop = color.clone().multiplyScalar(0.84);
    addPrism(plain, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, cTop, plain, false);
    return;
  }

  // Standard urban commercial block (Adjamé / Yopougon / Treichville / Marcory): parapet + colorful shopfront awning
  const parapetColor = color.clone().multiplyScalar(0.6);
  addPrism(walls, b.x, b.z, b.w, b.d, 0, b.h, b.angle, color, parapetColor, plain, true);
  // Parapet collar rim
  addPrism(plain, b.x, b.z, b.w * 1.03, b.d * 1.03, b.h, 0.55, b.angle, parapetColor, parapetColor, plain, false);
  // Colorful street awning on ground floor
  if (seedIdx % 2 === 0) {
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    const ax = b.x - s * (b.d * 0.5 + 0.7);
    const az = b.z + c * (b.d * 0.5 + 0.7);
    const awnColor = new THREE.Color(AWNING_COLORS[seedIdx % AWNING_COLORS.length]);
    addPrism(plain, ax, az, b.w * 0.78, 1.4, 2.8, 0.25, b.angle, awnColor, awnColor, plain, false);
  }
}

function addTree(buf: Buf, x: number, z: number, h: number, hash: number, isPalm: boolean): void {
  const trunk = new THREE.Color(isPalm ? 0x735238 : 0x563d24);
  const crown = new THREE.Color().setHSL(
    (isPalm ? 0.3 : 0.27) + ((hash % 7) - 3) * 0.008,
    isPalm ? 0.55 : 0.48,
    0.29 + ((hash % 5) - 2) * 0.015
  );

  if (isPalm) {
    // Segmented slightly curved coconut palm trunk + 5 radiating palm fronds
    const tw = 0.16;
    const th = h * 0.78;
    const lean = ((hash % 5) - 2) * 0.16;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (const [dx, dz] of dirs) {
      const tx = dz;
      const tz = -dx;
      const bx0 = x + dx * tw;
      const bz0 = z + dz * tw;
      const bx1 = x + lean + dx * (tw * 0.7);
      const bz1 = z + lean * 0.5 + dz * (tw * 0.7);
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
    const txTop = x + lean;
    const tzTop = z + lean * 0.5;
    const frondLen = 1.9 + h * 0.12;
    const frondW = 0.42;
    const N = 5;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + (hash % 6) * 0.4;
      const fx = Math.cos(a);
      const fz = Math.sin(a);
      const px = -fz * frondW;
      const pz = fx * frondW;
      const pTop = [txTop, th, tzTop];
      const pMidL = [txTop + fx * frondLen * 0.55 + px, th + 0.55, tzTop + fz * frondLen * 0.55 + pz];
      const pMidR = [txTop + fx * frondLen * 0.55 - px, th + 0.55, tzTop + fz * frondLen * 0.55 - pz];
      const pTip = [txTop + fx * frondLen, th - 0.35, tzTop + fz * frondLen];
      buf.tri(pTop, pMidL, pTip, [0, 1, 0], crown);
      buf.tri(pTop, pTip, pMidR, [0, 1, 0], crown.clone().multiplyScalar(0.9));
    }
    return;
  }

  // Broad-leaf tropical mango / ceiba tree: 4-face trunk + 2-tier faceted canopy
  const tw = 0.24;
  const th = h * 0.44;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const [dx, dz] of dirs) {
    const tx = dz;
    const tz = -dx;
    const bx = x + dx * tw;
    const bz = z + dz * tw;
    buf.quad(
      [bx - tx * tw, 0, bz - tz * tw],
      [bx + tx * tw, 0, bz + tz * tw],
      [bx + tx * tw, th, bz + tz * tw],
      [bx - tx * tw, th, bz - tz * tw],
      [dx, 0, dz],
      [0, 0, 1, 0, 1, 1, 0, 1],
      trunk
    );
  }
  const tiers = [
    { baseY: th * 0.78, apexY: h * 0.88, r: 1.45 + h * 0.16, col: crown },
    { baseY: th * 1.18, apexY: h, r: (1.45 + h * 0.16) * 0.72, col: crown.clone().multiplyScalar(1.12) },
  ];
  const N = 6;
  for (const tier of tiers) {
    const apex = [x, tier.apexY, z];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * tier.r, tier.baseY, z + Math.sin(a0) * tier.r];
      const p1 = [x + Math.cos(a1) * tier.r, tier.baseY, z + Math.sin(a1) * tier.r];
      const am = (a0 + a1) / 2;
      buf.tri(p0, apex, p1, [Math.cos(am) * 0.7, 0.7, Math.sin(am) * 0.7], tier.col);
    }
  }
}

export interface ChunkObjects {
  group: THREE.Group;
  dispose(): void;
}

/** Construit les objets Three.js d'un chunk (sol + bâtiments + arbres). `ground` : RGBA n × n, rangée 0 = nord. */
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

  // Bâtiments (on omet 'port_collider' et les repères gérés par des modèles héros 3D dédiés)
  const HERO_LANDMARKS = new Set(['port_collider', 'stade', 'cathedrale', 'hotel_ivoire', 'lycee_alex', 'marche_adjame', 'port']);
  const facade = new Buf();
  const plain = new Buf();
  data.buildings.forEach((b, i) => {
    if (b.landmark && HERO_LANDMARKS.has(b.landmark)) return;
    addBuilding(facade, plain, b, i);
  });
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

  // Arbres (palmiers sur la côte / Cocody / Plateau, manguiers ailleurs)
  const tb = new Buf();
  const primaryDistrict = data.buildings[0]?.district ?? 'banco';
  const coastalHint = COASTAL_DISTRICTS.has(primaryDistrict);
  data.trees.forEach((t, i) => {
    const h = Math.abs(Math.floor(t.x * 7 + t.z * 13 + i)) | 0;
    const isPalm = coastalHint && h % 3 !== 0;
    addTree(tb, t.x, t.z, t.h, h, isPalm);
  });
  const tg = tb.geometry();
  if (tg) {
    const m = new THREE.Mesh(tg, mats.trees);
    m.castShadow = true;
    group.add(m);
    disposables.push(tg);
  }

  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}
