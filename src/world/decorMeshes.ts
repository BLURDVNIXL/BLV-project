/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Constructeurs 3D stylisés low-poly pour les 9 catégories d'assets inspirés d'Abidjan :
 * Arbres (10 espèces + jeunes/adultes), Plantes tropicales (8), Fleurs (6), Buissons & haies (7+),
 * Mobilier urbain (11+), Fontaines & bassins (4), Décorations de jardin (8),
 * Éléments suspendus & guirlandes (7), Rochers & revêtements de sol (4).
 *
 * Tout est fusionné dans les buffers partagés du chunk (`plain`, `trees`, `lamps`, `puddles`)
 * pour conserver ~6 appels de dessin par chunk et l'animation de vent tropical sur les feuillages.
 */

import * as THREE from 'three';
import { DecorProp, TreeSpecies } from './decorTypes';
import { TREE_ASSETS } from '../assets3d/builders/trees';
import type { AssetDefinition } from '../assets3d/types';
import { emitBaked, getBakedTemplate } from './studioBake';

export class Buf {
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

function triNormal(a: number[], b: number[], c: number[]): number[] {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

export function addPrism(
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

export function addHipRoof(
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
  plainBuf.tri(c00, apex, c10, triNormal(c00, apex, c10), roofColor);
  plainBuf.tri(c10, apex, c11, triNormal(c10, apex, c11), shade);
  plainBuf.tri(c11, apex, c01, triNormal(c11, apex, c01), roofColor);
  plainBuf.tri(c01, apex, c00, triNormal(c01, apex, c00), shade);
}

function addBox(
  buf: Buf,
  cx: number,
  cz: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  angle: number,
  color: THREE.Color,
  topColor?: THREE.Color
): void {
  addPrism(buf, cx, cz, w, d, y0, h, angle, color, topColor ?? color, buf, false);
}

function addLocalBox(
  buf: Buf,
  ox: number,
  oz: number,
  angle: number,
  lu: number,
  lv: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  color: THREE.Color,
  topColor?: THREE.Color
): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const wx = ox + lu * c - lv * s;
  const wz = oz + lu * s + lv * c;
  addBox(buf, wx, wz, w, d, y0, h, angle, color, topColor);
}

function addOctCylinder(
  buf: Buf,
  cx: number,
  cz: number,
  rBottom: number,
  rTop: number,
  y0: number,
  h: number,
  segs: number,
  sideColor: THREE.Color,
  capColor: THREE.Color,
  tiltX = 0,
  tiltZ = 0,
  angleOffset = 0,
  capBottom = false
): void {
  const shade = sideColor.clone().multiplyScalar(0.9);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 + angleOffset;
    const a1 = ((i + 1) / segs) * Math.PI * 2 + angleOffset;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const am = (a0 + a1) * 0.5;
    const n = [Math.cos(am), 0.12, Math.sin(am)];
    const b0 = [cx + c0 * rBottom, y0, cz + s0 * rBottom];
    const b1 = [cx + c1 * rBottom, y0, cz + s1 * rBottom];
    const t1 = [cx + tiltX + c1 * rTop, y0 + h, cz + tiltZ + s1 * rTop];
    const t0 = [cx + tiltX + c0 * rTop, y0 + h, cz + tiltZ + s0 * rTop];
    // Ordre CCW vu de l'extérieur (FrontSide) : b1 -> b0 -> t0 -> t1
    buf.quad(b1, b0, t0, t1, n, [0, 0, 1, 0, 1, 1, 0, 1], i % 2 === 0 ? sideColor : shade);
    if (rTop > 0.005) {
      const topCenter = [cx + tiltX, y0 + h, cz + tiltZ];
      buf.tri(topCenter, t1, t0, [0, 1, 0], capColor);
    }
    if (capBottom && rBottom > 0.005) {
      const botCenter = [cx, y0, cz];
      buf.tri(botCenter, b0, b1, [0, -1, 0], shade);
    }
  }
}

function addLowPolyCanopy(
  buf: Buf,
  cx: number,
  cz: number,
  baseY: number,
  midY: number,
  topY: number,
  rx: number,
  rz: number,
  segs: number,
  color: THREE.Color,
  angleOffset = 0
): void {
  const shade = color.clone().multiplyScalar(0.84);
  const bright = color.clone().multiplyScalar(1.1);
  const botCenter = [cx, baseY, cz];
  const topCenter = [cx, topY, cz];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 + angleOffset;
    const a1 = ((i + 1) / segs) * Math.PI * 2 + angleOffset;
    const p0 = [cx + Math.cos(a0) * rx, midY, cz + Math.sin(a0) * rz];
    const p1 = [cx + Math.cos(a1) * rx, midY, cz + Math.sin(a1) * rz];
    const am = (a0 + a1) * 0.5;
    const upN = [Math.cos(am) * 0.58, 0.81, Math.sin(am) * 0.58];
    const dnN = [Math.cos(am) * 0.58, -0.81, Math.sin(am) * 0.58];
    buf.tri(p0, topCenter, p1, upN, i % 2 === 0 ? bright : color);
    buf.tri(p1, botCenter, p0, dnN, shade);
  }
}

function addPalmFrond(
  buf: Buf,
  tx: number,
  ty: number,
  tz: number,
  angle: number,
  len: number,
  width: number,
  archY: number,
  droopY: number,
  color: THREE.Color
): void {
  const fx = Math.cos(angle);
  const fz = Math.sin(angle);
  const px = -fz * width;
  const pz = fx * width;
  const pRoot = [tx, ty, tz];
  const pMid = [tx + fx * len * 0.55, ty + archY, tz + fz * len * 0.55];
  const pMidL = [pMid[0] + px, pMid[1] - 0.08, pMid[2] + pz];
  const pMidR = [pMid[0] - px, pMid[1] - 0.08, pMid[2] - pz];
  const pTip = [tx + fx * len, ty + droopY, tz + fz * len];
  const nL = triNormal(pRoot, pMidL, pMid);
  const nR = triNormal(pRoot, pMid, pMidR);
  const shade = color.clone().multiplyScalar(0.87);
  buf.tri(pRoot, pMidL, pMid, nL, color);
  buf.tri(pRoot, pMid, pMidR, nR, shade);
  buf.tri(pMid, pMidL, pTip, nL, color);
  buf.tri(pMid, pTip, pMidR, nR, shade);
}

function addFlatDiskWater(
  puddles: Buf,
  cx: number,
  cz: number,
  y: number,
  rx: number,
  rz: number,
  segs: number,
  color: THREE.Color
): void {
  const center = [cx, y, cz];
  const up = [0, 1, 0];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * rx, y, cz + Math.sin(a0) * rz];
    const p1 = [cx + Math.cos(a1) * rx, y, cz + Math.sin(a1) * rz];
    puddles.tri(center, p1, p0, up, color);
  }
}

function addCatenaryLine(
  buf: Buf,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  yEnds: number,
  sag: number,
  thickness: number,
  segs: number,
  color: THREE.Color
): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const ang = Math.atan2(dz, dx);
  const segLen = Math.hypot(dx, dz) / segs;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const tm = (t0 + t1) * 0.5;
    const ym = yEnds - Math.sin(tm * Math.PI) * sag;
    const mx = x0 + dx * tm;
    const mz = z0 + dz * tm;
    addBox(buf, mx, mz, segLen * 1.04, thickness, ym - thickness * 0.5, thickness, ang, color);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TREES/ — 10 espèces stylisées (jeunes et adultes, silhouettes distinctes)
// ═══════════════════════════════════════════════════════════════════════════

const URBAN_ORNAMENTAL_DISTRICTS = new Set(['plateau', 'cocody', 'riviera', 'marcory']);

export function pickTreeSpecies(hash: number, districtId: string, h: number): TreeSpecies {
  const m = hash % 12;
  if (districtId === 'banco') {
    if (m < 4) return 'fromager';
    if (m < 7) return 'broadleaf_tropical';
    if (m < 10) return 'mango';
    return 'ficus';
  }
  if (districtId === 'grand_bassam' || districtId === 'port_bouet' || districtId === 'vridi') {
    if (m < 5) return 'coconut';
    if (m < 7) return 'ornamental_palm';
    if (m < 9) return 'broadleaf_tropical';
    if (m === 9) return 'flamboyant';
    return 'acacia';
  }
  if (URBAN_ORNAMENTAL_DISTRICTS.has(districtId)) {
    if (m < 2) return 'ornamental_palm';
    if (m === 2 || m === 3) return 'urban_ornamental';
    if (m === 4 || m === 5) return 'flamboyant';
    if (m === 6) return 'acacia';
    if (m === 7) return 'coconut';
    if (m === 8) return 'broadleaf_tropical';
    if (m === 9) return 'mango';
    if (m === 10 && h >= 4.2) return 'baobab';
    return 'ficus';
  }
  // Quartiers populaires / résidentiels (Abobo, Yopougon, Adjamé, Treichville, Koumassi, Attécoubé)
  if (m < 3) return 'mango';
  if (m === 3 || m === 4) return 'flamboyant';
  if (m === 5) return 'coconut';
  if (m === 6) return 'acacia';
  if (m === 7) return 'broadleaf_tropical';
  if (m === 8 && h >= 4.2) return 'baobab';
  if (m === 9) return 'ornamental_palm';
  if (m === 10) return 'ficus';
  return 'urban_ornamental';
}

/** Espèce du jeu → arbre du studio (les 10 espèces correspondent 1:1). */
const TREE_STUDIO_ASSET_ID: Record<TreeSpecies, string> = {
  coconut: 'tree_cocotier',
  ornamental_palm: 'tree_palmier_decoratif',
  mango: 'tree_manguier',
  baobab: 'tree_baobab',
  flamboyant: 'tree_flamboyant',
  acacia: 'tree_acacia',
  fromager: 'tree_fromager',
  broadleaf_tropical: 'tree_badamier',
  urban_ornamental: 'tree_ornemental_urbain',
  ficus: 'tree_ficus_urbain',
};

interface TreeStudioEntry {
  asset: AssetDefinition;
  adult: string[];
  young: string[];
}

const TREE_STUDIO: Partial<Record<TreeSpecies, TreeStudioEntry>> = {};
for (const sp of Object.keys(TREE_STUDIO_ASSET_ID) as TreeSpecies[]) {
  const asset = TREE_ASSETS.find((a) => a.id === TREE_STUDIO_ASSET_ID[sp]);
  if (!asset) continue;
  const young = asset.variants.filter((v) => v.growthStage === 'Jeune').map((v) => v.id);
  const adult = asset.variants.filter((v) => v.growthStage !== 'Jeune').map((v) => v.id);
  TREE_STUDIO[sp] = { asset, adult: adult.length > 0 ? adult : young, young: young.length > 0 ? young : adult };
}

/** Variante du studio choisie pour une espèce, un âge et un hash (toutes les variantes sont utilisées). */
export function pickStudioTreeVariant(species: TreeSpecies, isYoung: boolean, hash: number): string | null {
  const entry = TREE_STUDIO[species];
  if (!entry) return null;
  const list = isYoung ? entry.young : entry.adult;
  return list[Math.abs(hash) % list.length] ?? null;
}

/**
 * Arbre du chunk : utilise les VRAIS modèles du studio 3D (troncs courbes effilés, houppiers facettés,
 * palmes à folioles…) cuits en couleurs par sommet. Troncs → `plain`, feuillages → `trees` (vent).
 * Repli sur l'ancienne version simplifiée si le modèle du studio ne peut pas être généré.
 */
export function addRichTree(
  plain: Buf,
  trees: Buf,
  x: number,
  z: number,
  h: number,
  hash: number,
  districtId: string
): void {
  const species = pickTreeSpecies(hash, districtId, h);
  const young = h < 5.4;
  const entry = TREE_STUDIO[species];
  const variant = pickStudioTreeVariant(species, young, Math.floor(hash / 3));
  if (entry && variant) {
    try {
      const tpl = getBakedTemplate(entry.asset, variant);
      if (tpl.height > 0.5) {
        const scale = Math.min(1.5, Math.max(0.6, h / tpl.height));
        const rot = ((hash % 12) / 12) * Math.PI * 2;
        const tint = 0.92 + ((hash * 7) % 11) * 0.016;
        const opts = { x, z, scale, rot, tint };
        emitBaked(tpl.plain, plain, opts);
        emitBaked(tpl.trees, trees, opts);
        return;
      }
    } catch {
      // repli ci-dessous
    }
  }
  addLegacyRichTree(plain, trees, x, z, h, hash, districtId);
}

function addLegacyRichTree(
  plain: Buf,
  trees: Buf,
  x: number,
  z: number,
  h: number,
  hash: number,
  districtId: string
): void {
  const species = pickTreeSpecies(hash, districtId, h);
  const young = h < 5.4;
  const trunkWarm = new THREE.Color(0x735238);
  const trunkDark = new THREE.Color(0x563d24);
  const barkGrey = new THREE.Color(0x8d7b68);
  const leafFresh = new THREE.Color().setHSL(0.28 + ((hash % 5) - 2) * 0.012, 0.56, 0.34);
  const leafDeep = new THREE.Color().setHSL(0.31 + ((hash % 7) - 3) * 0.008, 0.54, 0.27);
  const rot = ((hash % 12) / 12) * Math.PI * 2;

  if (species === 'coconut') {
    const count = !young && hash % 5 === 0 ? 2 : 1; // double-stipe ou simple
    for (let sIdx = 0; sIdx < count; sIdx++) {
      const sx = x + (count === 2 ? (sIdx === 0 ? -0.32 : 0.32) : 0);
      const sz = z + (count === 2 ? (sIdx === 0 ? -0.18 : 0.18) : 0);
      const th = h * (sIdx === 1 ? 0.64 : 0.78);
      const leanAngle = rot + (sIdx === 1 ? Math.PI * 0.7 : 0);
      const totalLean = (young ? 0.35 : 0.95) + ((hash % 4) * 0.22);
      const segs = 3;
      let curX = sx, curZ = sz, curY = 0;
      const segH = th / segs;
      for (let sg = 0; sg < segs; sg++) {
        const frac = (sg + 1) / segs;
        const stepLean = (totalLean * frac * frac) / segs * 1.4;
        const dx = Math.cos(leanAngle) * stepLean;
        const dz = Math.sin(leanAngle) * stepLean;
        const rB = (young ? 0.16 : 0.23) * (1 - sg * 0.14);
        const rT = (young ? 0.13 : 0.19) * (1 - (sg + 1) * 0.14);
        addOctCylinder(plain, curX, curZ, rB, rT, curY, segH, 6, trunkWarm, trunkDark, dx, dz);
        curX += dx;
        curZ += dz;
        curY += segH;
      }
      // Noix de coco en grappe
      const nutCol = new THREE.Color(0x65a30d);
      for (let n = 0; n < 3; n++) {
        const na = rot + n * 2.1;
        addBox(plain, curX + Math.cos(na) * 0.2, curZ + Math.sin(na) * 0.2, 0.18, 0.18, curY - 0.18, 0.18, na, nutCol);
      }
      const frondLen = (young ? 1.55 : 2.35) + h * 0.08;
      const nFronds = young ? 6 : 7;
      for (let i = 0; i < nFronds; i++) {
        const a = (i / nFronds) * Math.PI * 2 + rot;
        addPalmFrond(trees, curX, curY, curZ, a, frondLen, 0.42, 0.62, -0.48, i % 2 === 0 ? leafFresh : leafDeep);
      }
    }
    return;
  }

  if (species === 'ornamental_palm') {
    const isFan = hash % 2 === 0;
    const th = h * 0.72;
    const rBase = young ? 0.16 : 0.24;
    addOctCylinder(plain, x, z, rBase, rBase * 0.78, 0, th * 0.84, 6, barkGrey, trunkDark);
    // Manchon vert (crownshaft) typique du palmier royal
    addOctCylinder(trees, x, z, rBase * 0.82, rBase * 0.75, th * 0.82, th * 0.18, 6, new THREE.Color(0x3f8f29), leafFresh);
    const topY = th;
    if (isFan) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rot;
        addPalmFrond(trees, x, topY, z, a, young ? 1.3 : 1.85, 0.56, 0.55, 0.15, leafFresh);
      }
    } else {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rot;
        addPalmFrond(trees, x, topY, z, a, young ? 1.5 : 2.2, 0.36, 0.85, -0.22, i % 2 === 0 ? leafFresh : leafDeep);
      }
    }
    return;
  }

  if (species === 'baobab') {
    const bh = Math.max(4.6, h);
    const trunkH = bh * 0.54;
    const rBase = young ? 0.48 : 0.88;
    // Tronc bouteille évasé
    addOctCylinder(plain, x, z, rBase, rBase * 0.76, 0, trunkH * 0.65, 7, barkGrey, barkGrey, 0, 0, rot);
    addOctCylinder(plain, x, z, rBase * 0.76, rBase * 0.54, trunkH * 0.65, trunkH * 0.35, 7, barkGrey, barkGrey, 0, 0, rot);
    // Branches noueuses évasées + houppier tabulaire clairsemé
    const branchCount = 4;
    for (let i = 0; i < branchCount; i++) {
      const a = (i / branchCount) * Math.PI * 2 + rot;
      const dx = Math.cos(a) * (young ? 0.9 : 1.55);
      const dz = Math.sin(a) * (young ? 0.9 : 1.55);
      addOctCylinder(plain, x, z, rBase * 0.24, rBase * 0.12, trunkH * 0.92, bh * 0.24, 5, barkGrey, barkGrey, dx, dz);
      addLowPolyCanopy(trees, x + dx, z + dz, trunkH + bh * 0.15, trunkH + bh * 0.28, trunkH + bh * 0.4, 1.35, 1.25, 6, leafDeep, a);
    }
    addLowPolyCanopy(trees, x, z, trunkH + bh * 0.22, trunkH + bh * 0.34, bh, 1.65, 1.55, 7, leafFresh, rot);
    return;
  }

  if (species === 'flamboyant') {
    const th = h * 0.42;
    addOctCylinder(plain, x, z, 0.22, 0.16, 0, th, 6, trunkDark, trunkDark, 0.08, 0.04);
    const bloomCol = new THREE.Color(hash % 2 === 0 ? 0xef4444 : 0xf97316);
    const r = (young ? 1.55 : 2.35) + h * 0.14;
    // Branches en Y + grande couronne parasol rouge/orangé & verte
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2 + rot;
      const dx = Math.cos(ba) * r * 0.36;
      const dz = Math.sin(ba) * r * 0.36;
      addOctCylinder(plain, x, z, 0.12, 0.08, th * 0.85, h * 0.24, 5, trunkDark, trunkDark, dx, dz);
      addLowPolyCanopy(trees, x + dx, z + dz, th + h * 0.14, th + h * 0.28, th + h * 0.42, r * 0.62, r * 0.58, 6, b % 2 === 0 ? bloomCol : leafFresh, ba);
    }
    addLowPolyCanopy(trees, x, z, th + h * 0.2, th + h * 0.36, h * 0.95, r * 0.85, r * 0.82, 7, bloomCol, rot);
    return;
  }

  if (species === 'acacia') {
    const th = h * 0.58;
    const tiltX = ((hash % 3) - 1) * 0.25;
    addOctCylinder(plain, x, z, 0.2, 0.13, 0, th, 6, trunkWarm, trunkDark, tiltX, 0.1);
    const r1 = (young ? 1.6 : 2.6) + h * 0.12;
    const acaciaGreen = new THREE.Color(0x4d8b31);
    // Couronne tabulaire plate (ou double étage)
    addLowPolyCanopy(trees, x + tiltX, z + 0.1, th * 0.94, th + 0.45, th + 0.88, r1, r1 * 0.92, 7, acaciaGreen, rot);
    if (!young && hash % 2 === 0) {
      addLowPolyCanopy(trees, x + tiltX * 0.5 + 0.8, z - 0.5, th * 0.78, th * 0.88, th * 0.98, r1 * 0.64, r1 * 0.62, 6, leafDeep, rot + 0.5);
    }
    return;
  }

  if (species === 'fromager') {
    // Géant de la forêt du Banco à contreforts racinaires
    const th = h * 0.62;
    const rBase = young ? 0.24 : 0.42;
    addOctCylinder(plain, x, z, rBase, rBase * 0.68, 0, th, 7, barkGrey, trunkDark);
    // 4 contreforts triangulaires à la base
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rot;
      addBox(plain, x + Math.cos(a) * (rBase * 1.1), z + Math.sin(a) * (rBase * 1.1), rBase * 1.35, 0.16, 0, th * 0.28, a, barkGrey);
    }
    const rC = 2.0 + h * 0.15;
    addLowPolyCanopy(trees, x, z, th * 0.86, th + h * 0.16, h * 0.98, rC, rC * 0.95, 7, leafDeep, rot);
    addLowPolyCanopy(trees, x + 0.9, z - 0.7, th * 0.78, th + h * 0.08, th + h * 0.24, rC * 0.64, rC * 0.62, 6, leafFresh, rot + 0.4);
    addLowPolyCanopy(trees, x - 0.8, z + 0.6, th * 0.8, th + h * 0.1, th + h * 0.25, rC * 0.6, rC * 0.58, 6, leafDeep, rot - 0.4);
    return;
  }

  if (species === 'broadleaf_tropical') {
    // Badamier à étages horizontaux
    const th = h * 0.74;
    addOctCylinder(plain, x, z, 0.2, 0.11, 0, th, 6, trunkWarm, trunkDark);
    const badamierLeaf = new THREE.Color(0x3a8d35);
    const tiers = young ? 2 : 3;
    for (let t = 0; t < tiers; t++) {
      const ty = h * (0.42 + t * 0.2);
      const tr = (1.9 - t * 0.42) * (young ? 0.78 : 1.05);
      addLowPolyCanopy(trees, x, z, ty - 0.12, ty + 0.18, ty + 0.48, tr, tr, 6, t % 2 === 0 ? badamierLeaf : leafFresh, rot + t * 0.4);
    }
    return;
  }

  if (species === 'urban_ornamental') {
    // Arbre ornemental taillé avec petite grille/bordure protectrice à la base
    const th = h * 0.5;
    addBox(plain, x, z, 0.85, 0.85, 0, 0.12, rot, new THREE.Color(0x64748b));
    addOctCylinder(plain, x, z, 0.15, 0.12, 0, th, 6, trunkWarm, trunkDark);
    const crownR = young ? 1.15 : 1.65;
    addLowPolyCanopy(trees, x, z, th * 0.88, th + crownR * 0.72, th + crownR * 1.48, crownR, crownR, 7, leafFresh, rot);
    return;
  }

  if (species === 'ficus') {
    const th = h * 0.46;
    addOctCylinder(plain, x, z, 0.26, 0.18, 0, th, 6, barkGrey, trunkDark);
    // Racines aériennes fines
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rot;
      addBox(plain, x + Math.cos(a) * 0.35, z + Math.sin(a) * 0.35, 0.07, 0.07, 0, th * 0.88, a, trunkWarm);
    }
    const r = 1.6 + h * 0.13;
    addLowPolyCanopy(trees, x, z, th * 0.82, th + h * 0.2, h * 0.96, r, r, 7, leafDeep, rot);
    addLowPolyCanopy(trees, x + 0.7, z + 0.5, th * 0.84, th + h * 0.12, th + h * 0.3, r * 0.66, r * 0.66, 6, leafFresh, rot + 0.3);
    return;
  }

  // Manguier dense (dôme symétrique ou couronne asymétrique + petites mangues dorées)
  const th = h * 0.42;
  addOctCylinder(plain, x, z, 0.24, 0.18, 0, th, 6, trunkDark, trunkDark);
  const asymmetric = hash % 2 === 1;
  const rMain = (young ? 1.35 : 1.95) + h * 0.12;
  addLowPolyCanopy(trees, x, z, th * 0.76, th + h * 0.26, h * 0.96, rMain, rMain * 0.96, 7, leafDeep, rot);
  addLowPolyCanopy(
    trees,
    x + (asymmetric ? 0.88 : 0.55),
    z + (asymmetric ? 0.35 : -0.45),
    th * 0.84,
    th + h * 0.18,
    h * 0.84,
    rMain * 0.72,
    rMain * 0.68,
    6,
    leafFresh,
    rot + 0.5
  );
  addLowPolyCanopy(
    trees,
    x - 0.68,
    z + 0.48,
    th * 0.88,
    th + h * 0.14,
    h * 0.78,
    rMain * 0.64,
    rMain * 0.64,
    6,
    leafDeep,
    rot - 0.4
  );
  if (!young && hash % 3 === 0) {
    const mangoGold = new THREE.Color(0xf59e0b);
    for (let m = 0; m < 3; m++) {
      const ma = rot + m * 2.1;
      addBox(trees, x + Math.cos(ma) * (rMain * 0.68), z + Math.sin(ma) * (rMain * 0.68), 0.15, 0.15, th + 0.25, 0.18, ma, mangoGold);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2–9. RENDERING DES 8 AUTRES CATÉGORIES DE DÉCORS
// ═══════════════════════════════════════════════════════════════════════════

export function renderDecorProp(
  plain: Buf,
  trees: Buf,
  lamps: Buf,
  puddles: Buf,
  prop: DecorProp
): void {
  const { x, z, angle, scale, seed } = prop;
  const rot = angle + ((seed % 7) - 3) * 0.08;
  const woodDark = new THREE.Color(0x5b3a21);
  const woodMid = new THREE.Color(0x8b5a2b);
  const metalSlate = new THREE.Color(0x334155);
  const concreteLight = new THREE.Color(0xd6d3d1);
  const concreteMid = new THREE.Color(0xa8a29e);
  const terracotta = new THREE.Color(0xc25e38);
  const terracottaDark = new THREE.Color(0x9a4224);
  const greenLeaf = new THREE.Color(0x3f8f29);
  const greenDeep = new THREE.Color(0x286622);
  const greenBright = new THREE.Color(0x5fb838);
  const bulbGlow = new THREE.Color(0xfef08a);
  const waterCol = new THREE.Color(0x38bdf8);

  switch (prop.category) {
    // ────────── 2. TROPICAL_PLANTS/ ──────────
    case 'tropical_plant': {
      switch (prop.variant) {
        case 'banana': {
          const stem = new THREE.Color(0x557c3a);
          const sh = 2.0 * scale;
          addOctCylinder(plain, x, z, 0.15 * scale, 0.11 * scale, 0, sh, 6, stem, stem);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rot;
            addPalmFrond(trees, x, sh, z, a, 1.55 * scale, 0.36 * scale, 0.55 * scale, -0.18 * scale, i % 2 === 0 ? greenBright : greenLeaf);
          }
          // Régime de bananes dorées suspendu sous le bouquet
          const ba = rot + 0.6;
          addBox(trees, x + Math.cos(ba) * 0.25 * scale, z + Math.sin(ba) * 0.25 * scale, 0.22 * scale, 0.22 * scale, sh - 0.55 * scale, 0.45 * scale, ba, new THREE.Color(0xfacc15));
          return;
        }
        case 'papaya': {
          const trunk = new THREE.Color(0x7c7458);
          const sh = 2.5 * scale;
          addOctCylinder(plain, x, z, 0.12 * scale, 0.09 * scale, 0, sh, 6, trunk, trunk);
          // Grappe de papayes sous la couronne
          const papCol = new THREE.Color(0xf97316);
          for (let f = 0; f < 4; f++) {
            const fa = rot + (f / 4) * Math.PI * 2;
            addBox(plain, x + Math.cos(fa) * 0.16 * scale, z + Math.sin(fa) * 0.16 * scale, 0.14 * scale, 0.14 * scale, sh - 0.34 * scale, 0.22 * scale, fa, papCol);
          }
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + rot;
            addPalmFrond(trees, x, sh, z, a, 1.05 * scale, 0.28 * scale, 0.36 * scale, 0.05 * scale, greenLeaf);
          }
          return;
        }
        case 'aloe': {
          const aloeCol = new THREE.Color(0x4d9957);
          const tipCol = new THREE.Color(0x84cc16);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + rot;
            const ring = i % 2 === 0 ? 0.58 * scale : 0.42 * scale;
            const hBlade = (i % 2 === 0 ? 0.46 : 0.66) * scale;
            const p0 = [x, 0.04, z];
            const p1 = [x + Math.cos(a - 0.25) * 0.14 * scale, 0.04, z + Math.sin(a - 0.25) * 0.14 * scale];
            const p2 = [x + Math.cos(a + 0.25) * 0.14 * scale, 0.04, z + Math.sin(a + 0.25) * 0.14 * scale];
            const tip = [x + Math.cos(a) * ring, hBlade, z + Math.sin(a) * ring];
            trees.tri(p1, tip, p2, [Math.cos(a), 0.7, Math.sin(a)], i % 2 === 0 ? aloeCol : tipCol);
            trees.tri(p0, tip, p1, [0, 1, 0], aloeCol);
          }
          return;
        }
        case 'broadleaf': {
          const isPhilodendron = seed % 2 === 1;
          const leafCount = isPhilodendron ? 6 : 5;
          for (let i = 0; i < leafCount; i++) {
            const a = (i / leafCount) * Math.PI * 2 + rot;
            const lx = x + Math.cos(a) * 0.24 * scale;
            const lz = z + Math.sin(a) * 0.24 * scale;
            addPalmFrond(
              trees,
              lx,
              0.16 * scale,
              lz,
              a,
              (isPhilodendron ? 0.85 : 1.0) * scale,
              (isPhilodendron ? 0.26 : 0.4) * scale,
              0.54 * scale,
              0.2 * scale,
              i % 2 === 0 ? greenLeaf : greenDeep
            );
          }
          return;
        }
        case 'fern': {
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + rot;
            addPalmFrond(trees, x, 0.08, z, a, 0.82 * scale, 0.22 * scale, 0.38 * scale, 0.06 * scale, i % 2 === 0 ? greenBright : greenLeaf);
          }
          return;
        }
        case 'potted_ornamental': {
          addOctCylinder(plain, x, z, 0.22 * scale, 0.3 * scale, 0, 0.48 * scale, 7, terracotta, woodDark);
          addOctCylinder(plain, x, z, 0.32 * scale, 0.32 * scale, 0.44 * scale, 0.08 * scale, 7, terracottaDark, terracotta);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rot;
            addPalmFrond(trees, x, 0.48 * scale, z, a, 0.65 * scale, 0.16 * scale, 0.48 * scale, 0.18 * scale, i % 2 === 0 ? greenBright : greenLeaf);
          }
          return;
        }
        case 'small_shrub': {
          const crotonCol = new THREE.Color(prop.color ?? (seed % 2 === 0 ? 0xd97706 : 0xbe185d));
          addLowPolyCanopy(trees, x, z, 0.04, 0.36 * scale, 0.72 * scale, 0.45 * scale, 0.45 * scale, 6, greenLeaf, rot);
          addLowPolyCanopy(trees, x + 0.14 * scale, z - 0.1 * scale, 0.18 * scale, 0.42 * scale, 0.68 * scale, 0.28 * scale, 0.28 * scale, 5, crotonCol, rot + 0.6);
          return;
        }
        case 'creeper': {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + rot;
            addLowPolyCanopy(trees, x + Math.cos(a) * 0.35 * scale, z + Math.sin(a) * 0.35 * scale, 0.02, 0.1 * scale, 0.18 * scale, 0.34 * scale, 0.28 * scale, 5, i % 2 === 0 ? greenLeaf : greenBright, a);
          }
          return;
        }
      }
    }

    // ────────── 3. FLOWERS/ ──────────
    case 'flower': {
      const fCol = new THREE.Color(prop.color);
      switch (prop.variant) {
        case 'rose': {
          const rosePalette = [prop.color, 0xfb7185, 0xfef08a];
          const rCol = new THREE.Color(rosePalette[seed % 3]);
          addLowPolyCanopy(trees, x, z, 0.06, 0.38 * scale, 0.68 * scale, 0.44 * scale, 0.44 * scale, 6, greenDeep, rot);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rot;
            const r = 0.26 * scale;
            addBox(trees, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.14 * scale, 0.14 * scale, 0.44 * scale, 0.14 * scale, a, rCol);
          }
          return;
        }
        case 'bougainvillea': {
          addLowPolyCanopy(trees, x, z, 0.06, 0.65 * scale, 1.32 * scale, 0.68 * scale, 0.68 * scale, 6, greenDeep, rot);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + rot;
            const r = 0.34 * scale;
            addLowPolyCanopy(trees, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.35 * scale, 0.78 * scale, 1.18 * scale, 0.36 * scale, 0.36 * scale, 5, fCol, a);
          }
          return;
        }
        case 'hibiscus': {
          addLowPolyCanopy(trees, x, z, 0.05, 0.52 * scale, 1.02 * scale, 0.54 * scale, 0.54 * scale, 6, greenLeaf, rot);
          const gold = new THREE.Color(0xfacc15);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + rot;
            const r = 0.36 * scale;
            addBox(trees, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.18 * scale, 0.18 * scale, 0.52 * scale, 0.14 * scale, a, fCol, gold);
          }
          return;
        }
        case 'tropical_flower': {
          // Oiseau de paradis / Balisier heliconia
          const orange = fCol;
          const yellow = new THREE.Color(0xfacc15);
          const crimson = new THREE.Color(0xdc2626);
          const isHeliconia = seed % 2 === 1;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + rot;
            addPalmFrond(trees, x, 0.08, z, a, 0.75 * scale, 0.16 * scale, 0.62 * scale, 0.36 * scale, greenLeaf);
          }
          for (let b = 0; b < 3; b++) {
            const ba = rot + b * 2.1;
            const bx = x + Math.cos(ba) * 0.14 * scale;
            const bz = z + Math.sin(ba) * 0.14 * scale;
            addBox(trees, bx, bz, 0.06 * scale, 0.06 * scale, 0.1, 0.75 * scale, ba, greenDeep);
            addBox(trees, bx, bz, (isHeliconia ? 0.12 : 0.18) * scale, 0.08 * scale, 0.78 * scale, (isHeliconia ? 0.32 : 0.22) * scale, ba, isHeliconia ? crimson : orange, yellow);
          }
          return;
        }
        case 'flower_bed': {
          addBox(plain, x, z, 1.55 * scale, 0.78 * scale, 0, 0.18 * scale, angle, concreteMid, woodDark);
          const cols = [fCol, new THREE.Color(0xfacc15), new THREE.Color(0xf43f5e), new THREE.Color(0xec4899)];
          for (let k = -2; k <= 2; k++) {
            addLocalBox(trees, x, z, angle, k * 0.26 * scale, ((k & 1) === 0 ? 0.1 : -0.1) * scale, 0.24 * scale, 0.28 * scale, 0.18 * scale, 0.24 * scale, greenLeaf);
            addLocalBox(trees, x, z, angle, k * 0.26 * scale, ((k & 1) === 0 ? 0.1 : -0.1) * scale, 0.16 * scale, 0.16 * scale, 0.38 * scale, 0.14 * scale, cols[(seed + k + 4) % cols.length]);
          }
          return;
        }
        case 'small_flowers': {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rot;
            const r = (0.12 + (i % 2) * 0.14) * scale;
            const fx = x + Math.cos(a) * r;
            const fz = z + Math.sin(a) * r;
            addBox(trees, fx, fz, 0.08 * scale, 0.08 * scale, 0, 0.16 * scale, a, greenLeaf);
            addBox(trees, fx, fz, 0.12 * scale, 0.12 * scale, 0.16 * scale, 0.08 * scale, a, fCol);
          }
          return;
        }
      }
    }

    // ────────── 4. BUSHES/ ──────────
    case 'bush': {
      const bCol = new THREE.Color(prop.color);
      switch (prop.variant) {
        case 'round_bush': {
          addLowPolyCanopy(trees, x, z, 0.04, 0.52 * scale, 1.05 * scale, 0.65 * scale, 0.65 * scale, 7, bCol, rot);
          addLowPolyCanopy(trees, x + 0.28 * scale, z - 0.18 * scale, 0.04, 0.42 * scale, 0.85 * scale, 0.46 * scale, 0.46 * scale, 6, bCol.clone().multiplyScalar(1.08), rot + 0.4);
          return;
        }
        case 'wild_bush': {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + rot;
            addLowPolyCanopy(trees, x + Math.cos(a) * 0.25 * scale, z + Math.sin(a) * 0.25 * scale, 0.04, 0.48 * scale, (0.85 + (i % 2) * 0.3) * scale, 0.42 * scale, 0.38 * scale, 5, i % 2 === 0 ? bCol : greenDeep, a);
          }
          return;
        }
        case 'trimmed_hedge': {
          const hKind = seed % 3;
          if (hKind === 1) {
            // Angle 90°
            addLocalBox(trees, x, z, angle, 0, 0, 1.45 * scale, 0.54 * scale, 0.02, 0.92 * scale, bCol, bCol.clone().multiplyScalar(1.1));
            addLocalBox(trees, x, z, angle, -0.45 * scale, 0.45 * scale, 0.54 * scale, 0.9 * scale, 0.02, 0.92 * scale, bCol, bCol.clone().multiplyScalar(1.1));
          } else if (hKind === 2) {
            // Extrémité arrondie
            addBox(trees, x, z, 1.45 * scale, 0.58 * scale, 0.02, 0.92 * scale, angle, bCol, bCol.clone().multiplyScalar(1.1));
            addOctCylinder(trees, x, z, 0.42 * scale, 0.38 * scale, 0.02, 0.92 * scale, 7, bCol, bCol.clone().multiplyScalar(1.1));
          } else {
            addBox(trees, x, z, 1.65 * scale, 0.58 * scale, 0.02, 0.92 * scale, angle, bCol, bCol.clone().multiplyScalar(1.1));
          }
          return;
        }
        case 'planter_hedge': {
          addBox(plain, x, z, 1.72 * scale, 0.66 * scale, 0, 0.36 * scale, angle, seed % 2 === 0 ? woodMid : concreteMid, concreteLight);
          addBox(trees, x, z, 1.56 * scale, 0.52 * scale, 0.36 * scale, 0.72 * scale, angle, bCol, bCol.clone().multiplyScalar(1.1));
          return;
        }
        case 'plant_bed': {
          addLowPolyCanopy(trees, x, z, 0.03, 0.35 * scale, 0.68 * scale, 0.85 * scale, 0.62 * scale, 6, bCol, angle);
          addLowPolyCanopy(trees, x + 0.3 * scale, z, 0.03, 0.44 * scale, 0.82 * scale, 0.48 * scale, 0.42 * scale, 5, greenBright, angle + 0.4);
          return;
        }
        case 'tall_grass': {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rot;
            const ox = x + Math.cos(a) * 0.14 * scale;
            const oz = z + Math.sin(a) * 0.14 * scale;
            const w = 0.09 * scale;
            const h = (0.95 + (i % 3) * 0.24) * scale;
            const lean = 0.22 * scale;
            const ca = Math.cos(a), sa = Math.sin(a);
            trees.tri(
              [ox - sa * w, 0, oz + ca * w],
              [ox + sa * w, 0, oz - ca * w],
              [ox + ca * lean, h, oz + sa * lean],
              [0, 1, 0],
              i % 2 === 0 ? bCol : greenBright
            );
          }
          return;
        }
        case 'grove': {
          addLowPolyCanopy(trees, x, z, 0.04, 0.7 * scale, 1.45 * scale, 0.78 * scale, 0.78 * scale, 6, bCol, rot);
          addLowPolyCanopy(trees, x - 0.55 * scale, z + 0.3 * scale, 0.04, 0.5 * scale, 1.0 * scale, 0.55 * scale, 0.55 * scale, 6, greenDeep, rot + 0.5);
          addLowPolyCanopy(trees, x + 0.5 * scale, z - 0.35 * scale, 0.04, 0.55 * scale, 1.15 * scale, 0.58 * scale, 0.58 * scale, 6, greenBright, rot - 0.5);
          return;
        }
      }
    }

    // ────────── 5. URBAN_FURNITURE/ ──────────
    case 'furniture': {
      switch (prop.variant) {
        case 'bench_wood': {
          // Banc public en bois à lattes + pieds fonte
          for (const side of [-0.62, 0.62]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.1 * scale, 0.46 * scale, 0, 0.44 * scale, metalSlate);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.55 * scale, 0.48 * scale, 0.44 * scale, 0.08 * scale, woodMid);
          return;
        }
        case 'bench_metal': {
          const steel = new THREE.Color(0x475569);
          for (const side of [-0.62, 0.62]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.08 * scale, 0.48 * scale, 0, 0.58 * scale, metalSlate);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.55 * scale, 0.46 * scale, 0.42 * scale, 0.07 * scale, steel);
          addLocalBox(plain, x, z, angle, 0, -0.2 * scale, 1.55 * scale, 0.07 * scale, 0.48 * scale, 0.38 * scale, steel);
          return;
        }
        case 'bench_concrete': {
          const isWoodMix = seed % 2 === 1;
          for (const side of [-0.58, 0.58]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.24 * scale, 0.46 * scale, 0, 0.38 * scale, concreteMid);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.68 * scale, 0.54 * scale, 0.38 * scale, 0.12 * scale, isWoodMix ? woodMid : concreteLight);
          return;
        }
        case 'bench_backrest': {
          const seatCol = new THREE.Color(prop.color ?? 0x92400e);
          const doubleSided = seed % 2 === 1;
          for (const side of [-0.64, 0.64]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.1 * scale, 0.52 * scale, 0, 0.62 * scale, metalSlate);
          }
          addLocalBox(plain, x, z, angle, 0, 0.02 * scale, 1.6 * scale, doubleSided ? 0.62 * scale : 0.48 * scale, 0.42 * scale, 0.07 * scale, seatCol);
          addLocalBox(plain, x, z, angle, 0, doubleSided ? 0 : -0.22 * scale, 1.6 * scale, 0.07 * scale, 0.54 * scale, 0.38 * scale, seatCol);
          return;
        }
        case 'picnic_table': {
          for (const side of [-0.6, 0.6]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.12 * scale, 1.45 * scale, 0, 0.44 * scale, woodDark);
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.12 * scale, 0.78 * scale, 0.44 * scale, 0.32 * scale, woodDark);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.68 * scale, 0.84 * scale, 0.74 * scale, 0.08 * scale, woodMid);
          addLocalBox(plain, x, z, angle, 0, -0.62 * scale, 1.68 * scale, 0.32 * scale, 0.42 * scale, 0.07 * scale, woodMid);
          addLocalBox(plain, x, z, angle, 0, 0.62 * scale, 1.68 * scale, 0.32 * scale, 0.42 * scale, 0.07 * scale, woodMid);
          return;
        }
        case 'flower_pot': {
          addOctCylinder(plain, x, z, 0.26 * scale, 0.34 * scale, 0, 0.44 * scale, 7, terracotta, woodDark);
          addOctCylinder(plain, x, z, 0.36 * scale, 0.36 * scale, 0.4 * scale, 0.08 * scale, 7, terracottaDark, terracotta);
          addLowPolyCanopy(trees, x, z, 0.46 * scale, 0.72 * scale, 0.98 * scale, 0.34 * scale, 0.34 * scale, 6, greenLeaf, rot);
          const fl = new THREE.Color(prop.color ?? 0xec4899);
          addBox(trees, x + 0.1 * scale, z, 0.14 * scale, 0.14 * scale, 0.82 * scale, 0.14 * scale, rot, fl);
          addBox(trees, x - 0.12 * scale, z + 0.1 * scale, 0.12 * scale, 0.12 * scale, 0.76 * scale, 0.12 * scale, rot, new THREE.Color(0xfacc15));
          return;
        }
        case 'rect_planter': {
          addBox(plain, x, z, 1.5 * scale, 0.56 * scale, 0, 0.48 * scale, angle, concreteLight, woodDark);
          addBox(plain, x, z, 1.56 * scale, 0.62 * scale, 0.44 * scale, 0.07 * scale, angle, concreteMid);
          addLocalBox(trees, x, z, angle, -0.35 * scale, 0, 0.52 * scale, 0.42 * scale, 0.48 * scale, 0.42 * scale, greenLeaf);
          addLocalBox(trees, x, z, angle, 0.35 * scale, 0, 0.52 * scale, 0.42 * scale, 0.48 * scale, 0.42 * scale, greenBright);
          const fl = new THREE.Color(prop.color ?? 0xf97316);
          addLocalBox(trees, x, z, angle, 0, 0, 0.46 * scale, 0.38 * scale, 0.52 * scale, 0.38 * scale, fl);
          return;
        }
        case 'bollard': {
          addOctCylinder(plain, x, z, 0.14 * scale, 0.11 * scale, 0, 0.78 * scale, 6, metalSlate, metalSlate);
          addOctCylinder(plain, x, z, 0.13 * scale, 0.13 * scale, 0.58 * scale, 0.09 * scale, 6, new THREE.Color(0xfacc15), metalSlate);
          addOctCylinder(plain, x, z, 0.11 * scale, 0.04 * scale, 0.78 * scale, 0.08 * scale, 6, metalSlate, metalSlate);
          return;
        }
        case 'reverbere': {
          // Réverbère urbain élégant à double crosse et globes lumineux
          addOctCylinder(plain, x, z, 0.22 * scale, 0.14 * scale, 0, 0.9 * scale, 6, metalSlate, metalSlate);
          addOctCylinder(plain, x, z, 0.1 * scale, 0.08 * scale, 0.9 * scale, 3.6 * scale, 6, metalSlate, metalSlate);
          addBox(plain, x, z, 1.15 * scale, 0.1 * scale, 4.45 * scale, 0.1 * scale, angle, metalSlate);
          for (const side of [-0.52, 0.52]) {
            addLocalBox(lamps, x, z, angle, side * scale, 0, 0.28 * scale, 0.28 * scale, 4.55 * scale, 0.32 * scale, bulbGlow);
          }
          return;
        }
        case 'barrier': {
          for (const side of [-0.65, 0.65]) {
            addLocalBox(plain, x, z, angle, side * scale, 0, 0.1 * scale, 0.1 * scale, 0, 0.85 * scale, metalSlate);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.42 * scale, 0.06 * scale, 0.75 * scale, 0.08 * scale, metalSlate);
          addLocalBox(plain, x, z, angle, 0, 0, 1.42 * scale, 0.05 * scale, 0.44 * scale, 0.07 * scale, woodMid);
          return;
        }
        case 'pergola': {
          const pw = 3.0 * scale;
          const pd = 2.6 * scale;
          const ph = 2.55;
          for (const su of [-1, 1]) {
            for (const sv of [-1, 1]) {
              addLocalBox(plain, x, z, angle, su * (pw * 0.46), sv * (pd * 0.46), 0.16, 0.16, 0, ph, woodDark);
            }
          }
          // Poutres latérales + lattes ajourées
          addLocalBox(plain, x, z, angle, -pw * 0.46, 0, 0.16, pd * 1.06, ph, 0.16, woodMid);
          addLocalBox(plain, x, z, angle, pw * 0.46, 0, 0.16, pd * 1.06, ph, 0.16, woodMid);
          for (let r = -2; r <= 2; r++) {
            addLocalBox(plain, x, z, angle, 0, r * (pd * 0.22), pw * 1.08, 0.12, ph + 0.14, 0.1, woodMid);
          }
          return;
        }
      }
    }

    // ────────── 6. WATER_FEATURES/ ──────────
    case 'water_feature': {
      const stoneRim = new THREE.Color(0xe7e5e4);
      const stoneDark = new THREE.Color(0xa8a29e);
      switch (prop.variant) {
        case 'tiered_fountain': {
          addOctCylinder(plain, x, z, 1.55 * scale, 1.48 * scale, 0, 0.42 * scale, 8, stoneRim, stoneDark);
          addFlatDiskWater(puddles, x, z, 0.43 * scale, 1.3 * scale, 1.3 * scale, 8, waterCol);
          addOctCylinder(plain, x, z, 0.28 * scale, 0.22 * scale, 0.4 * scale, 0.72 * scale, 8, stoneDark, stoneRim);
          addOctCylinder(plain, x, z, 0.78 * scale, 0.85 * scale, 1.05 * scale, 0.22 * scale, 8, stoneRim, stoneRim, 0, 0, 0, true);
          addFlatDiskWater(puddles, x, z, 1.28 * scale, 0.72 * scale, 0.72 * scale, 8, waterCol);
          addOctCylinder(plain, x, z, 0.16 * scale, 0.08 * scale, 1.25 * scale, 0.45 * scale, 6, stoneDark, waterCol);
          return;
        }
        case 'circle_fountain': {
          addOctCylinder(plain, x, z, 1.15 * scale, 1.12 * scale, 0, 0.44 * scale, 8, stoneRim, stoneDark);
          addFlatDiskWater(puddles, x, z, 0.45 * scale, 0.96 * scale, 0.96 * scale, 8, waterCol);
          addOctCylinder(plain, x, z, 0.18 * scale, 0.12 * scale, 0.42 * scale, 0.42 * scale, 6, stoneDark, waterCol);
          return;
        }
        case 'modern_fountain': {
          addBox(plain, x, z, 2.2 * scale, 1.3 * scale, 0, 0.34 * scale, angle, metalSlate, stoneDark);
          addFlatDiskWater(puddles, x, z, 0.36 * scale, 0.9 * scale, 0.48 * scale, 6, waterCol);
          addLocalBox(plain, x, z, angle, 0, -0.46 * scale, 1.45 * scale, 0.24 * scale, 0.34 * scale, 1.15 * scale, stoneRim);
          addLocalBox(lamps, x, z, angle, 0, -0.32 * scale, 1.1 * scale, 0.08 * scale, 0.42 * scale, 0.85 * scale, waterCol);
          return;
        }
        case 'ornamental_basin': {
          addBox(plain, x, z, 2.4 * scale, 1.7 * scale, 0, 0.32 * scale, angle, stoneRim, stoneDark);
          addFlatDiskWater(puddles, x, z, 0.33 * scale, 1.02 * scale, 0.68 * scale, 8, waterCol);
          // Nénuphars stylisés sur l'eau
          for (const [lu, lv] of [[-0.45, 0.18], [0.38, -0.15], [0.1, 0.25]]) {
            addLocalBox(trees, x, z, angle, lu * scale, lv * scale, 0.28 * scale, 0.28 * scale, 0.34 * scale, 0.04, greenBright);
          }
          addLocalBox(trees, x, z, angle, 0.38 * scale, -0.15 * scale, 0.1 * scale, 0.1 * scale, 0.38 * scale, 0.08, new THREE.Color(0xf472b6));
          return;
        }
      }
    }

    // ────────── 7. GARDEN_DECORATIONS/ ──────────
    case 'garden_decor': {
      switch (prop.variant) {
        case 'statue': {
          // Socle + totem sculpté / stèle sans texte
          const bronze = new THREE.Color(0x92400e);
          const steleStone = new THREE.Color(0xd6d3d1);
          addBox(plain, x, z, 0.95 * scale, 0.95 * scale, 0, 0.58 * scale, angle, concreteMid, concreteLight);
          addBox(plain, x, z, 0.62 * scale, 0.62 * scale, 0.58 * scale, 0.18 * scale, angle, concreteLight);
          if (seed % 2 === 0) {
            addOctCylinder(plain, x, z, 0.22 * scale, 0.16 * scale, 0.76 * scale, 1.05 * scale, 6, bronze, bronze);
            addBox(plain, x, z, 0.34 * scale, 0.24 * scale, 1.78 * scale, 0.36 * scale, angle, bronze, new THREE.Color(0xd97706));
          } else {
            addBox(plain, x, z, 0.42 * scale, 0.24 * scale, 0.76 * scale, 1.25 * scale, angle, steleStone, bronze);
            addBox(plain, x, z, 0.26 * scale, 0.28 * scale, 1.48 * scale, 0.28 * scale, angle, new THREE.Color(0xd97706));
          }
          return;
        }
        case 'abstract_sculpture': {
          const goldBronze = new THREE.Color(0xd97706);
          addBox(plain, x, z, 1.1 * scale, 0.9 * scale, 0, 0.45 * scale, angle, metalSlate, concreteLight);
          addLocalBox(plain, x, z, angle, -0.22 * scale, 0, 0.16 * scale, 0.16 * scale, 0.45 * scale, 1.25 * scale, goldBronze);
          addLocalBox(plain, x, z, angle, 0.22 * scale, 0, 0.16 * scale, 0.16 * scale, 0.45 * scale, 1.0 * scale, goldBronze);
          addLocalBox(plain, x, z, angle, 0, 0, 0.72 * scale, 0.22 * scale, 1.35 * scale, 0.2 * scale, new THREE.Color(0xf59e0b));
          return;
        }
        case 'canari_jar': {
          // Grande jarre traditionnelle (canari en terre cuite)
          addOctCylinder(plain, x, z, 0.2 * scale, 0.36 * scale, 0, 0.38 * scale, 8, terracottaDark, terracotta);
          addOctCylinder(plain, x, z, 0.36 * scale, 0.22 * scale, 0.38 * scale, 0.36 * scale, 8, terracotta, terracottaDark);
          addOctCylinder(plain, x, z, 0.25 * scale, 0.25 * scale, 0.74 * scale, 0.1 * scale, 8, terracottaDark, woodDark);
          return;
        }
        case 'terracotta_pots': {
          for (const [lu, lv, r, h] of [[-0.22, 0.1, 0.18, 0.36], [0.22, 0.08, 0.14, 0.28], [0.02, -0.2, 0.16, 0.32]]) {
            const c = Math.cos(angle), s = Math.sin(angle);
            const px = x + (lu * c - lv * s) * scale;
            const pz = z + (lu * s + lv * c) * scale;
            addOctCylinder(plain, px, pz, r * 0.75 * scale, r * scale, 0, h * scale, 7, terracotta, woodDark);
          }
          return;
        }
        case 'small_fence': {
          const fencePalette = [0x8b5a2b, 0xca8a04, 0x334155];
          const fenceCol = new THREE.Color(prop.color ?? fencePalette[seed % 3]);
          for (const u of [-0.72, 0, 0.72]) {
            addLocalBox(plain, x, z, angle, u * scale, 0, 0.1 * scale, 0.1 * scale, 0, 0.88 * scale, fenceCol);
          }
          addLocalBox(plain, x, z, angle, 0, 0, 1.56 * scale, 0.06 * scale, 0.68 * scale, 0.08 * scale, fenceCol);
          addLocalBox(plain, x, z, angle, 0, 0, 1.56 * scale, 0.06 * scale, 0.32 * scale, 0.08 * scale, fenceCol);
          return;
        }
        case 'low_wall': {
          const stoneCol = new THREE.Color(prop.color ?? 0xc8a882);
          addBox(plain, x, z, 1.8 * scale, 0.28 * scale, 0, 0.78 * scale, angle, stoneCol, terracottaDark);
          addBox(plain, x, z, 1.88 * scale, 0.34 * scale, 0.78 * scale, 0.1 * scale, angle, terracottaDark);
          return;
        }
        case 'garden_border': {
          const col = new THREE.Color(prop.color ?? 0xa8a29e);
          for (let i = -2; i <= 2; i++) {
            addLocalBox(plain, x, z, angle, i * 0.34 * scale, 0, 0.3 * scale, 0.12 * scale, 0, 0.18 * scale, col);
          }
          return;
        }
        case 'green_pergola': {
          const pw = 3.0 * scale;
          const pd = 2.6 * scale;
          const ph = 2.55;
          for (const su of [-1, 1]) {
            for (const sv of [-1, 1]) {
              addLocalBox(plain, x, z, angle, su * (pw * 0.46), sv * (pd * 0.46), 0.16, 0.16, 0, ph, woodDark);
            }
          }
          addLocalBox(plain, x, z, angle, -pw * 0.46, 0, 0.16, pd * 1.06, ph, 0.16, woodMid);
          addLocalBox(plain, x, z, angle, pw * 0.46, 0, 0.16, pd * 1.06, ph, 0.16, woodMid);
          for (let r = -2; r <= 2; r++) {
            addLocalBox(plain, x, z, angle, 0, r * (pd * 0.22), pw * 1.08, 0.12, ph + 0.14, 0.1, woodMid);
          }
          // Feuillage & bougainvilliers grimpants sur le toit de la pergola
          addLowPolyCanopy(trees, x - 0.55 * scale, z + 0.3 * scale, ph + 0.12, ph + 0.42, ph + 0.68, 1.15 * scale, 1.05 * scale, 6, greenLeaf, angle);
          addLowPolyCanopy(trees, x + 0.55 * scale, z - 0.3 * scale, ph + 0.12, ph + 0.44, ph + 0.72, 1.08 * scale, 1.0 * scale, 6, new THREE.Color(0xd946ef), angle + 0.4);
          return;
        }
      }
    }

    // ────────── 8. HANGING_DECORATIONS/ ──────────
    case 'hanging_decor': {
      const halfSpan = prop.span * 0.5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const x0 = x - c * halfSpan;
      const z0 = z - s * halfSpan;
      const x1 = x + c * halfSpan;
      const z1 = z + s * halfSpan;
      switch (prop.variant) {
        case 'decor_chain': {
          addCatenaryLine(plain, x0, z0, x1, z1, prop.y0, 0.32, 0.06, 5, metalSlate);
          return;
        }
        case 'barrier_chain': {
          addOctCylinder(plain, x0, z0, 0.08, 0.07, 0, 0.92, 6, metalSlate, new THREE.Color(0xfacc15));
          addOctCylinder(plain, x1, z1, 0.08, 0.07, 0, 0.92, 6, metalSlate, new THREE.Color(0xfacc15));
          addCatenaryLine(plain, x0, z0, x1, z1, 0.78, 0.24, 0.05, 5, new THREE.Color(0x94a3b8));
          return;
        }
        case 'fairy_garland': {
          addCatenaryLine(plain, x0, z0, x1, z1, prop.y0, 0.34, 0.03, 6, new THREE.Color(0x1e293b));
          const bulbPalette = [0xfef08a, 0xfb923c, 0x38bdf8, 0xf472b6];
          for (let i = 1; i <= 5; i++) {
            const t = i / 6;
            const bx = x0 + (x1 - x0) * t;
            const bz = z0 + (z1 - z0) * t;
            const by = prop.y0 - Math.sin(t * Math.PI) * 0.34 - 0.1;
            const col = new THREE.Color(bulbPalette[(prop.seed + i) % bulbPalette.length]);
            addBox(lamps, bx, bz, 0.12, 0.12, by, 0.12, angle, col);
          }
          return;
        }
        case 'bunting_garland': {
          addCatenaryLine(plain, x0, z0, x1, z1, prop.y0, 0.36, 0.03, 6, new THREE.Color(0xf8fafc));
          const flagCols = [0xf97316, 0xf8fafc, 0x16a34a, 0xfacc15, 0x0284c7];
          for (let i = 1; i <= 5; i++) {
            const t = i / 6;
            const fx = x0 + (x1 - x0) * t;
            const fz = z0 + (z1 - z0) * t;
            const fy = prop.y0 - Math.sin(t * Math.PI) * 0.36;
            const col = new THREE.Color(flagCols[(prop.seed + i) % flagCols.length]);
            const pA = [fx - c * 0.14, fy, fz - s * 0.14];
            const pB = [fx + c * 0.14, fy, fz + s * 0.14];
            const pC = [fx, fy - 0.24, fz];
            plain.tri(pA, pB, pC, [s, 0, -c], col);
            plain.tri(pB, pA, pC, [-s, 0, c], col);
          }
          return;
        }
        case 'hanging_plant': {
          // Panier suspendu + lianes tombantes
          addBox(plain, x, z, 0.04, 0.04, prop.y0, 0.38, angle, metalSlate);
          addOctCylinder(plain, x, z, 0.16 * scale, 0.22 * scale, prop.y0 - 0.22 * scale, 0.22 * scale, 6, terracotta, woodDark, 0, 0, 0, true);
          addLowPolyCanopy(trees, x, z, prop.y0 - 0.35 * scale, prop.y0 - 0.05 * scale, prop.y0 + 0.18 * scale, 0.34 * scale, 0.34 * scale, 6, greenBright, rot);
          return;
        }
        case 'lantern': {
          addBox(plain, x, z, 0.05, 0.05, prop.y0, 0.24, angle, metalSlate);
          addBox(plain, x, z, 0.24 * scale, 0.24 * scale, prop.y0 - 0.04, 0.06, angle, metalSlate);
          addBox(lamps, x, z, 0.18 * scale, 0.18 * scale, prop.y0 - 0.24 * scale, 0.2 * scale, angle, bulbGlow);
          addBox(plain, x, z, 0.22 * scale, 0.22 * scale, prop.y0 - 0.28 * scale, 0.05, angle, metalSlate);
          return;
        }
        case 'wall_relief': {
          const panelCol = new THREE.Color(prop.color ?? 0xd97706);
          addBox(plain, x, z, 0.9 * scale, 0.08, prop.y0, 0.9 * scale, angle, woodDark);
          addBox(plain, x, z, 0.62 * scale, 0.12, prop.y0 + 0.14 * scale, 0.62 * scale, angle, panelCol);
          addBox(plain, x, z, 0.32 * scale, 0.16, prop.y0 + 0.29 * scale, 0.32 * scale, angle, terracotta);
          return;
        }
      }
    }

    // ────────── 9. ROCKS_AND_GROUND_DECORATIONS/ ──────────
    case 'ground_rock': {
      const rockCol = new THREE.Color(prop.color ?? (seed % 2 === 0 ? 0x78716c : 0xb4693e));
      switch (prop.variant) {
        case 'rock': {
          addLowPolyCanopy(plain, x, z, 0, 0.38 * scale, 0.72 * scale, 0.68 * scale, 0.56 * scale, 6, rockCol, rot);
          addLowPolyCanopy(plain, x + 0.36 * scale, z - 0.22 * scale, 0, 0.26 * scale, 0.48 * scale, 0.42 * scale, 0.38 * scale, 5, rockCol.clone().multiplyScalar(0.86), rot + 0.8);
          return;
        }
        case 'pebbles': {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + rot;
            const r = (0.15 + (i % 3) * 0.14) * scale;
            addBox(plain, x + Math.cos(a) * r, z + Math.sin(a) * r, 0.18 * scale, 0.14 * scale, 0, 0.07 * scale, a, i % 2 === 0 ? rockCol : concreteMid);
          }
          return;
        }
        case 'slabs': {
          for (let k = -1; k <= 1; k++) {
            addLocalBox(plain, x, z, angle, k * 0.52 * scale, ((k & 1) === 0 ? 0.08 : -0.08) * scale, 0.42 * scale, 0.36 * scale, 0.01, 0.035, concreteLight);
          }
          return;
        }
        case 'pavers': {
          const paverA = new THREE.Color(prop.color ?? 0xb8a99a);
          const paverB = paverA.clone().multiplyScalar(0.88);
          for (let iu = -1; iu <= 1; iu++) {
            for (let iv = -1; iv <= 1; iv++) {
              addLocalBox(plain, x, z, angle, iu * 0.44 * scale, iv * 0.44 * scale, 0.4 * scale, 0.4 * scale, 0.01, 0.03, (iu + iv) % 2 === 0 ? paverA : paverB);
            }
          }
          return;
        }
      }
    }
  }
}
