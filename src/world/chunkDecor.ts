/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Source unique (pure, sans Three.js ni DOM) des décorations de chunk et de leurs solides physiques :
 * - Détails architecturaux au sol (piliers de véranda/porche, murets de clôture, bougainvilliers, bidons, kiosques)
 * - Espaces vides des rues & parcelles : boutiques, superettes, salons de coiffure, lieux de transfert d'unité,
 *   garbadromes, allocodromes, maquis de quartier, mini terrains de maracana & basket
 * - Mobilier & vie de rue : lampadaires, abribus SOTRA, poteaux & câbles électriques, micro-étals,
 *   bacs à ordures, buissons, vendeuses de galettes & vendeuses de gnonmi, voitures garées
 * - Sous-bois du Banco et plage atlantique (pirogues échouées, parasols)
 * - Éléments purement traversables (touffes d'herbe 3D, flaques d'eau, surfaces de terrains de sport)
 */

import { Building, ChunkData, CHUNK, EmptyLot, carSpotForLot, insideSpecial } from './city';
import { isHospitalId } from './hospitals';
import { isCommissariatId, isMairieId } from './civicSites';
import { districtAt, isWater, projected } from './abidjanGeography';
import { ARTERIALS, ARTERIAL_WIDTH, GRIDS, bridgeAt, frameFor, nearestArterial, roadAt } from './roads';
import { distanceToSegment } from './geo';
import { hash32 } from './rng';

export type ChunkSolid =
  | { shape: 'box'; x: number; z: number; hx: number; hz: number; angle: number; h: number }
  | { shape: 'circle'; x: number; z: number; r: number; h: number };

export interface BoxDecor {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  h: number;
  angle: number;
  color: number;
  roofColor?: number;
}

export interface ShrubDecor {
  x: number;
  z: number;
  r: number;
  h: number;
  color: number;
}

export interface LampDecor {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  h: number;
  angle: number;
  color: number;
}

export type SignKind =
  | 'boutique'
  | 'superette'
  | 'coiffure'
  | 'transfert'
  | 'garbadrome'
  | 'allocodrome'
  | 'maquis';

export interface SignDecor {
  x: number;
  z: number;
  w: number;
  h: number;
  y0: number;
  angle: number;
  kind: SignKind;
}

export type StreetVenueKind =
  | 'boutique'
  | 'superette'
  | 'coiffure'
  | 'transfert'
  | 'garbadrome'
  | 'allocodrome'
  | 'maquis_quartier'
  | 'maracana'
  | 'basket';

export interface StreetVenueDecor {
  kind: StreetVenueKind;
  x: number;
  z: number;
  w: number;
  d: number;
  angle: number;
}

export interface DumpsterDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
  hasCompanionBin: boolean;
}

export interface FoodVendorDecor {
  x: number;
  z: number;
  angle: number;
  kind: 'galettes' | 'gnonmi';
  pagneColor: number;
  blouseColor: number;
  foulardColor: number;
  parasolColor: number;
}

export interface StreetlampDecor {
  poleX: number;
  poleZ: number;
  armX: number;
  armZ: number;
  bulbX: number;
  bulbZ: number;
  angle: number;
}

export interface ShelterDecor {
  x: number;
  z: number;
  backX: number;
  backZ: number;
  post1X: number;
  post1Z: number;
  post2X: number;
  post2Z: number;
  angle: number;
}

export interface PoleDecor {
  x: number;
  z: number;
  bulbX: number;
  bulbZ: number;
  wireMidX?: number;
  wireMidZ?: number;
  wireLen?: number;
  angle: number;
}

export interface StallDecor {
  x: number;
  z: number;
  angle: number;
  tarpColor: number;
}

export interface ParkedCarDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface PirogueDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface ParasolDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface GrassDecor {
  x: number;
  z: number;
  scale: number;
  color: number;
}

export interface PuddleDecor {
  x: number;
  z: number;
  rx: number;
  rz: number;
  seed: number;
}

export interface ChunkDecorPlan {
  buildingBoxes: BoxDecor[];
  facadeBoxes: BoxDecor[];
  buildingLamps: LampDecor[];
  buildingShrubs: ShrubDecor[];
  signs: SignDecor[];
  venues: StreetVenueDecor[];
  streetlamps: StreetlampDecor[];
  shelters: ShelterDecor[];
  poles: PoleDecor[];
  stalls: StallDecor[];
  bins: Array<{ x: number; z: number; angle: number }>;
  dumpsters: DumpsterDecor[];
  foodVendors: FoodVendorDecor[];
  shrubs: ShrubDecor[];
  parkedCars: ParkedCarDecor[];
  pirogues: PirogueDecor[];
  parasols: ParasolDecor[];
  grass: GrassDecor[];
  puddles: PuddleDecor[];
  solids: ChunkSolid[];
}

export const VILLA_WALLED_DISTRICTS = new Set(['cocody', 'riviera', 'grand_bassam']);
export const NEON_DISTRICTS = new Set(['yopougon', 'treichville', 'marcory', 'adjame', 'abobo']);

const HERO_LANDMARKS = new Set([
  'port_collider', 'stade', 'cathedrale', 'hotel_ivoire', 'lycee_caiman', 'lycee_alysma',
  'lycee_alex', 'marche_adjame', 'port', 'maquis', 'mairie',
]);

const AWNING_COLORS = [0xea580c, 0x16a34a, 0x2563eb, 0xd97706, 0xdc2626];
const NEON_SIGN_COLORS = [0xf97316, 0x38bdf8, 0xf43f5e, 0xfacc15, 0x34d399];
const PARASOL_COLORS = [0xef4444, 0x0ea5e9, 0xf59e0b, 0x10b981, 0xf97316];
const BOUGAINVILLEA_COLORS = [0xd946ef, 0xf43f5e, 0xf97316, 0xa855f7];
const BUSH_GREENS = [0x2f6b31, 0x3f7d2b, 0x15803d, 0x357a38];
const PARKED_CAR_COLORS = [0xeab308, 0x2563eb, 0xdc2626, 0xf8fafc, 0x64748b, 0x059669];
const BOUTIQUE_COLORS = [0x0284c7, 0x10b981, 0xf59e0b, 0xea580c, 0x7c3aed, 0xdb2777];
const SALON_COLORS = [0xec4899, 0x06b6d4, 0x8b5cf6, 0x14b8a6, 0xf43f5e];
const PAGNE_COLORS = [0xd97706, 0x16a34a, 0xbe123c, 0x0284c7, 0x7c3aed, 0xea580c];
const BLOUSE_COLORS = [0xf8fafc, 0xfef08a, 0xfde68a, 0xbae6fd, 0xfbcfe8];

const TRANSFERT_THEMES = [
  { body: 0xf97316, trim: 0x18181b, glow: 0xfb923c }, // Orange
  { body: 0xfacc15, trim: 0x1e3a8a, glow: 0xfef08a }, // MoMo
  { body: 0x0ea5e9, trim: 0xf8fafc, glow: 0x38bdf8 }, // Wave
  { body: 0x2563eb, trim: 0xf97316, glow: 0x60a5fa }, // Moov
];

const CREAM_TRIM = 0xe2e8f0;
const TRIM_DARK = 0x334155;
const WOOD_DARK = 0x78350f;
const WOOD_MID = 0x92400e;
const METAL_SLATE = 0x475569;

function localToWorldPt(cx: number, cz: number, angle: number, u: number, v: number): { x: number; z: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: cx + u * c - v * s, z: cz + u * s + v * c };
}

function pushBox(
  plan: ChunkDecorPlan,
  cx: number,
  cz: number,
  angle: number,
  u: number,
  v: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  color: number,
  roofColor?: number,
  solid = false,
  facade = false
): void {
  const p = localToWorldPt(cx, cz, angle, u, v);
  const target = facade ? plan.facadeBoxes : plan.buildingBoxes;
  target.push({ x: p.x, z: p.z, w, d, y0, h, angle, color, roofColor });
  if (solid) {
    plan.solids.push({ shape: 'box', x: p.x, z: p.z, hx: w / 2, hz: d / 2, angle, h: y0 + h });
  }
}

function pushLamp(
  plan: ChunkDecorPlan,
  cx: number,
  cz: number,
  angle: number,
  u: number,
  v: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  color: number
): void {
  const p = localToWorldPt(cx, cz, angle, u, v);
  plan.buildingLamps.push({ x: p.x, z: p.z, w, d, y0, h, angle, color });
}

function pushSign(
  plan: ChunkDecorPlan,
  cx: number,
  cz: number,
  angle: number,
  u: number,
  v: number,
  w: number,
  y0: number,
  h: number,
  kind: SignKind
): void {
  const p = localToWorldPt(cx, cz, angle, u, v);
  plan.signs.push({ x: p.x, z: p.z, w, h, y0, angle, kind });
}

function pushBush(plan: ChunkDecorPlan, x: number, z: number, r: number, h: number, color: number): void {
  plan.shrubs.push({ x, z, r, h, color });
  plan.solids.push({ shape: 'circle', x, z, r: Math.max(0.32, r * 0.78), h });
}

function overlapsAnyBuilding(buildings: Building[], selfId: string, x: number, z: number, r: number): boolean {
  for (const b of buildings) {
    if (b.id === selfId || !b.solid) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    const maxR = Math.hypot(b.w, b.d) * 0.5 + r;
    if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    if (Math.abs(lx) < b.w * 0.5 + r && Math.abs(lz) < b.d * 0.5 + r) return true;
  }
  return false;
}

function footprintDryAndOffRoad(cx: number, cz: number, w: number, d: number, angle: number): boolean {
  for (const [su, sv] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const p = localToWorldPt(cx, cz, angle, su * w, sv * d);
    if (
      isWater(p) ||
      bridgeAt(p, 2.5) ||
      insideSpecial(p, 2.5) ||
      roadAt(p) !== 'none' ||
      nearestArterial(p).dist <= ARTERIAL_WIDTH / 2 + 2.0
    ) {
      return false;
    }
  }
  return true;
}

// ───────────── Générateurs de commerces & terrains sur parcelles vides ─────────────

function emitBoutique(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(6.4, lot.w * 0.72);
  const d = Math.min(5.0, lot.d * 0.58);
  const h = 3.2;
  const s = lot.seed >>> 0;
  const col = BOUTIQUE_COLORS[s % BOUTIQUE_COLORS.length];
  const awn = AWNING_COLORS[(s >>> 3) % AWNING_COLORS.length];
  const vOff = -lot.d * 0.12;
  // Corps boutique + parapet + façade vitrée avant
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w, d, 0, h, col, CREAM_TRIM, true, false);
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff + d / 2 - 0.04, w * 0.62, 0.12, 0.85, 1.5, col, col, false, true);
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w * 1.04, d * 1.04, h, 0.24, TRIM_DARK, TRIM_DARK, false, false);
  // Auvent + 2 poteaux + enseigne BOUTIQUE
  const vAwn = vOff + d / 2 + 0.65;
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vAwn, w * 0.88, 1.3, 2.42, 0.16, awn, awn, false, false);
  for (const side of [-1, 1]) {
    pushBox(plan, lot.x, lot.z, lot.angle, side * (w * 0.38), vOff + d / 2 + 1.05, 0.14, 0.14, 0, 2.42, CREAM_TRIM, CREAM_TRIM, true, false);
  }
  pushSign(plan, lot.x, lot.z, lot.angle, 0, vOff + d / 2 + 0.18, Math.min(3.4, w * 0.72), 2.66, 0.56, 'boutique');
  pushLamp(plan, lot.x, lot.z, lot.angle, 0, vOff + d / 2 + 0.2, Math.min(3.0, w * 0.64), 0.1, 2.58, 0.08, 0xfef08a);
  // Glacière / comptoir extérieur
  pushBox(plan, lot.x, lot.z, lot.angle, -w * 0.22, vOff + d / 2 + 0.55, 1.35, 0.6, 0, 1.05, 0x0284c7, CREAM_TRIM, true, false);
  // Buisson latéral si la parcelle le permet
  if (lot.w > w + 2.2) {
    const bp = localToWorldPt(lot.x, lot.z, lot.angle, w / 2 + 0.9, vOff);
    if (!isWater(bp) && roadAt(bp) === 'none') {
      pushBush(plan, bp.x, bp.z, 0.65, 1.1, BUSH_GREENS[lot.seed % BUSH_GREENS.length]);
    }
  }
  plan.venues.push({ kind: 'boutique', x: lot.x, z: lot.z, w, d, angle: lot.angle });
}

function emitSuperette(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(9.4, lot.w * 0.82);
  const d = Math.min(6.2, lot.d * 0.64);
  const h = 3.9;
  const accent = [0x16a34a, 0x2563eb, 0xdc2626][lot.seed % 3];
  const vOff = -lot.d * 0.1;
  // Grand bâtiment vitré + bandeau couleur + parapet
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w, d, 0, h, 0xf1f5f9, CREAM_TRIM, true, true);
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w * 1.03, d * 1.03, 3.25, 0.72, accent, TRIM_DARK, false, false);
  // Auvent d'entrée + 2 piliers + enseigne SUPERETTE lumineuse
  const vFront = vOff + d / 2;
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vFront + 0.85, w * 0.78, 1.7, 2.68, 0.18, accent, accent, false, false);
  for (const side of [-1, 1]) {
    pushBox(plan, lot.x, lot.z, lot.angle, side * (w * 0.34), vFront + 1.45, 0.18, 0.18, 0, 2.68, CREAM_TRIM, CREAM_TRIM, true, false);
    const bp = localToWorldPt(lot.x, lot.z, lot.angle, side * 1.5, vFront + 2.05);
    if (!isWater(bp) && roadAt(bp) === 'none') {
      plan.buildingBoxes.push({ x: bp.x, z: bp.z, w: 0.22, d: 0.22, y0: 0, h: 0.85, angle: lot.angle, color: 0xfacc15, roofColor: 0xfacc15 });
      plan.solids.push({ shape: 'circle', x: bp.x, z: bp.z, r: 0.13, h: 0.85 });
    }
  }
  pushSign(plan, lot.x, lot.z, lot.angle, 0, vFront + 0.24, Math.min(4.8, w * 0.7), 3.32, 0.62, 'superette');
  pushLamp(plan, lot.x, lot.z, lot.angle, 0, vFront + 0.22, Math.min(4.8, w * 0.7), 0.1, 3.2, 0.12, 0xfef08a);
  // Frigo boissons extérieur avec vitre avant sur le côté droit
  pushBox(plan, lot.x, lot.z, lot.angle, w * 0.36, vFront + 0.55, 1.15, 0.7, 0, 1.45, 0xdc2626, CREAM_TRIM, true, false);
  pushBox(plan, lot.x, lot.z, lot.angle, w * 0.36, vFront + 0.91, 0.85, 0.05, 0.28, 0.96, 0xbae6fd, 0xbae6fd, false, false);
  plan.venues.push({ kind: 'superette', x: lot.x, z: lot.z, w, d, angle: lot.angle });
}

function emitCoiffure(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(5.6, lot.w * 0.66);
  const d = Math.min(4.5, lot.d * 0.54);
  const h = 3.1;
  const col = SALON_COLORS[lot.seed % SALON_COLORS.length];
  const vOff = -lot.d * 0.12;
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w, d, 0, h, col, TRIM_DARK, true, true);
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vOff, w * 1.03, d * 1.03, h, 0.2, TRIM_DARK, TRIM_DARK, false, false);
  const vFront = vOff + d / 2;
  // Auvent + enseigne COIFFURE
  pushBox(plan, lot.x, lot.z, lot.angle, 0, vFront + 0.55, w * 0.8, 1.1, 2.38, 0.14, TRIM_DARK, TRIM_DARK, false, false);
  pushSign(plan, lot.x, lot.z, lot.angle, 0, vFront + 0.16, Math.min(3.2, w * 0.72), 2.58, 0.54, 'coiffure');
  // Poteau de barbier tricolore (rouge, blanc, bleu) sur le côté droit de la porte
  const poleU = w * 0.36;
  const poleV = vFront + 0.28;
  pushBox(plan, lot.x, lot.z, lot.angle, poleU, poleV, 0.22, 0.22, 0.9, 0.44, 0xef4444, 0xef4444, false, false);
  pushBox(plan, lot.x, lot.z, lot.angle, poleU, poleV, 0.22, 0.22, 1.34, 0.44, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, lot.x, lot.z, lot.angle, poleU, poleV, 0.22, 0.22, 1.78, 0.44, 0x2563eb, TRIM_DARK, false, false);
  const pp = localToWorldPt(lot.x, lot.z, lot.angle, poleU, poleV);
  plan.solids.push({ shape: 'circle', x: pp.x, z: pp.z, r: 0.15, h: 2.22 });
  // Banc d'attente devant le salon
  pushBox(plan, lot.x, lot.z, lot.angle, -w * 0.22, vFront + 0.65, 1.45, 0.44, 0, 0.46, WOOD_DARK, WOOD_DARK, true, false);
  plan.venues.push({ kind: 'coiffure', x: lot.x, z: lot.z, w, d, angle: lot.angle });
}

function emitTransfertKiosk(plan: ChunkDecorPlan, cx: number, cz: number, angle: number, seed: number, withLotDecor = false): void {
  const s = seed >>> 0;
  const th = TRANSFERT_THEMES[s % TRANSFERT_THEMES.length];
  // Cabine kiosque transfert d'unité + comptoir client + toit débordant + enseigne
  pushBox(plan, cx, cz, angle, 0, 0, 2.4, 1.7, 0, 2.38, th.body, th.trim, true, false);
  pushBox(plan, cx, cz, angle, 0, 0.86, 2.0, 0.2, 1.05, 0.72, 0x1e293b, 0x1e293b, false, false);
  pushBox(plan, cx, cz, angle, 0, 1.02, 2.15, 0.42, 0.94, 0.12, th.trim, th.trim, true, false);
  pushBox(plan, cx, cz, angle, 0, 0.15, 2.9, 2.35, 2.38, 0.18, th.trim, th.body, false, false);
  pushSign(plan, cx, cz, angle, 0, 1.35, 2.3, 2.42, 0.44, 'transfert');
  pushLamp(plan, cx, cz, angle, 0, 1.32, 2.2, 0.08, 2.32, 0.08, th.glow);
  // Tabouret d'attente sur le côté
  const sp = localToWorldPt(cx, cz, angle, 1.55, 0.55);
  if (!isWater(sp) && roadAt(sp) === 'none') {
    plan.buildingBoxes.push({ x: sp.x, z: sp.z, w: 0.38, d: 0.38, y0: 0, h: 0.46, angle, color: th.body, roofColor: th.trim });
    plan.solids.push({ shape: 'circle', x: sp.x, z: sp.z, r: 0.24, h: 0.46 });
  }
  if (withLotDecor) {
    for (const side of [-1, 1]) {
      const bp = localToWorldPt(cx, cz, angle, side * 2.2, -0.4);
      if (!isWater(bp) && roadAt(bp) === 'none') {
        pushBush(plan, bp.x, bp.z, 0.65, 1.15, BUSH_GREENS[(s + (side > 0 ? 1 : 0)) & 3]);
      }
    }
  }
  plan.venues.push({ kind: 'transfert', x: cx, z: cz, w: 2.6, d: 2.1, angle });
}

function emitGarbadrome(plan: ChunkDecorPlan, cx: number, cz: number, lotW: number, lotD: number, angle: number, seed: number): void {
  const s = seed >>> 0;
  const w = Math.min(7.8, lotW * 0.78);
  const d = Math.min(5.8, lotD * 0.66);
  const roofCol = SHACK_ROOF_COLORS_LOCAL[s % SHACK_ROOF_COLORS_LOCAL.length];
  // Toit tôle ouvert sur 4 poteaux
  pushBox(plan, cx, cz, angle, 0, 0, w, d, 2.55, 0.16, roofCol, roofCol, false, false);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pushBox(plan, cx, cz, angle, sx * (w / 2 - 0.22), sz * (d / 2 - 0.22), 0.16, 0.16, 0, 2.55, WOOD_DARK, WOOD_DARK, true, false);
    }
  }
  pushSign(plan, cx, cz, angle, 0, d / 2 + 0.04, Math.min(3.8, w * 0.62), 2.58, 0.52, 'garbadrome');
  // Comptoir + marmite fumante sur braises
  pushBox(plan, cx, cz, angle, -w * 0.16, -d * 0.26, 2.4, 0.85, 0, 0.86, WOOD_MID, 0xe2e8f0, true, false);
  pushBox(plan, cx, cz, angle, w * 0.24, -d * 0.26, 0.76, 0.76, 0, 0.76, TRIM_DARK, 0x1e293b, true, false);
  pushLamp(plan, cx, cz, angle, w * 0.24, -d * 0.26, 0.42, 0.42, 0.52, 0.14, 0xf97316);
  // 2 longues tables en bois avec bancs intégrés
  for (const side of [-1, 1]) {
    const tu = side * (w * 0.22);
    const tv = d * 0.14;
    pushBox(plan, cx, cz, angle, tu, tv, 1.9, 0.76, 0, 0.74, WOOD_DARK, WOOD_MID, true, false);
    pushBox(plan, cx, cz, angle, tu, tv + 0.56, 1.75, 0.3, 0, 0.44, WOOD_MID, WOOD_MID, false, false);
  }
  plan.venues.push({ kind: 'garbadrome', x: cx, z: cz, w, d, angle });
}

function emitAllocodrome(plan: ChunkDecorPlan, cx: number, cz: number, lotW: number, lotD: number, angle: number, seed: number): void {
  const s = seed >>> 0;
  const w = Math.min(8.2, lotW * 0.8);
  const d = Math.min(6.0, lotD * 0.68);
  const tarpCol = AWNING_COLORS[s % AWNING_COLORS.length];
  // Bâche colorée sur 4 poteaux + guirlande lumineuse
  pushBox(plan, cx, cz, angle, 0, 0, w, d, 2.55, 0.18, tarpCol, tarpCol, false, false);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pushBox(plan, cx, cz, angle, sx * (w / 2 - 0.22), sz * (d / 2 - 0.22), 0.16, 0.16, 0, 2.55, WOOD_DARK, WOOD_DARK, true, false);
    }
  }
  pushSign(plan, cx, cz, angle, 0, d / 2 + 0.04, Math.min(4.0, w * 0.64), 2.58, 0.54, 'allocodrome');
  pushLamp(plan, cx, cz, angle, 0, d / 2 - 0.08, w * 0.72, 0.08, 2.48, 0.08, 0xfef08a);
  // Brasero + étal d'alloco et poisson braisé
  pushBox(plan, cx, cz, angle, -w * 0.18, -d * 0.26, 2.1, 0.82, 0, 0.86, WOOD_MID, 0xf59e0b, true, false);
  pushBox(plan, cx, cz, angle, w * 0.22, -d * 0.26, 1.15, 0.62, 0, 0.8, TRIM_DARK, 0x1e293b, true, false);
  pushLamp(plan, cx, cz, angle, w * 0.22, -d * 0.26, 0.86, 0.42, 0.74, 0.1, 0xf97316);
  // Tables plastiques colorées + tabourets
  const tCols = [0x2563eb, 0xdc2626, 0x16a34a];
  const nTables = w >= 6.8 ? 3 : 2;
  for (let i = 0; i < nTables; i++) {
    const tu = nTables === 2 ? (i === 0 ? -1.45 : 1.45) : (i - 1) * 2.1;
    const tv = d * 0.16;
    const tc = tCols[(seed + i) % tCols.length];
    pushBox(plan, cx, cz, angle, tu, tv, 0.92, 0.92, 0, 0.74, tc, tc, true, false);
    pushBox(plan, cx, cz, angle, tu, tv + 0.66, 0.36, 0.36, 0, 0.45, tc, tc, false, false);
  }
  plan.venues.push({ kind: 'allocodrome', x: cx, z: cz, w, d, angle });
}

function emitMaquisQuartier(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(9.2, lot.w * 0.84);
  const d = Math.min(6.8, lot.d * 0.72);
  const wallCol = [0xb45309, 0x991b1b, 0x1e40af, 0x065f46][lot.seed % 4];
  // Bar arrière + terrasse paillote ouverte devant
  const barD = 2.2;
  const barV = -d / 2 + barD / 2;
  pushBox(plan, lot.x, lot.z, lot.angle, 0, barV, w * 0.82, barD, 0, 2.85, wallCol, 0x78350f, true, false);
  const patioD = d - barD;
  const patioV = barV + barD / 2 + patioD / 2;
  pushBox(plan, lot.x, lot.z, lot.angle, 0, patioV, w * 0.92, patioD, 2.65, 0.22, 0x92400e, 0x78350f, false, false);
  for (const side of [-1, 1]) {
    pushBox(plan, lot.x, lot.z, lot.angle, side * (w * 0.42), patioV + patioD / 2 - 0.25, 0.18, 0.18, 0, 2.65, WOOD_DARK, WOOD_DARK, true, false);
    // 2 grosses baffles de maquis devant le comptoir
    pushBox(plan, lot.x, lot.z, lot.angle, side * (w * 0.3), barV + barD / 2 + 0.32, 0.72, 0.56, 0, 1.48, 0x18181b, 0x334155, true, false);
  }
  pushSign(plan, lot.x, lot.z, lot.angle, 0, patioV + patioD / 2 + 0.04, Math.min(4.2, w * 0.62), 2.72, 0.56, 'maquis');
  pushLamp(plan, lot.x, lot.z, lot.angle, 0, patioV + patioD / 2 - 0.06, w * 0.78, 0.1, 2.55, 0.1, 0xf97316);
  // 2 tables hautes + tabourets + brasero
  for (const side of [-1, 1]) {
    const tp = localToWorldPt(lot.x, lot.z, lot.angle, side * (w * 0.22), patioV + 0.2);
    plan.buildingBoxes.push({ x: tp.x, z: tp.z, w: 0.95, d: 0.95, y0: 0, h: 0.78, angle: lot.angle, color: 0x0284c7, roofColor: 0xe2e8f0 });
    plan.solids.push({ shape: 'circle', x: tp.x, z: tp.z, r: 0.52, h: 0.78 });
  }
  pushBox(plan, lot.x, lot.z, lot.angle, w * 0.36, patioV - patioD * 0.2, 0.85, 0.5, 0, 0.8, TRIM_DARK, 0x1e293b, true, false);
  pushLamp(plan, lot.x, lot.z, lot.angle, w * 0.36, patioV - patioD * 0.2, 0.65, 0.35, 0.75, 0.1, 0xf97316);
  plan.venues.push({ kind: 'maquis_quartier', x: lot.x, z: lot.z, w, d, angle: lot.angle });
}

function emitMaracanaCourt(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(15.6, lot.w - 1.4);
  const d = Math.min(10.6, lot.d - 1.4);
  const cx = lot.x;
  const cz = lot.z;
  const a = lot.angle;

  // Pelouse synthétique + lignes blanches (traversables)
  pushBox(plan, cx, cz, a, 0, 0, w, d, 0.015, 0.03, 0x16a34a, 0x16a34a, false, false);
  // Lignes extérieures + ligne médiane + cercle central stylisé
  pushBox(plan, cx, cz, a, 0, d / 2 - 0.35, w - 0.6, 0.1, 0.048, 0.01, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, 0, -d / 2 + 0.35, w - 0.6, 0.1, 0.048, 0.01, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, -w / 2 + 0.35, 0, 0.1, d - 0.6, 0.048, 0.01, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, w / 2 - 0.35, 0, 0.1, d - 0.6, 0.048, 0.01, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, 0, 0, 0.1, d - 0.6, 0.048, 0.01, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, 0, 0, 1.8, 1.8, 0.046, 0.01, 0x15803d, 0x15803d, false, false);

  // 2 cages de maracana (poteaux + transversale + fond de filet)
  const goalW = Math.min(2.6, d * 0.28);
  for (const side of [-1, 1]) {
    const gx = side * (w / 2 - 0.55);
    pushBox(plan, cx, cz, a, gx, -goalW / 2, 0.1, 0.1, 0, 1.65, 0xf8fafc, 0xf8fafc, true, false);
    pushBox(plan, cx, cz, a, gx, goalW / 2, 0.1, 0.1, 0, 1.65, 0xf8fafc, 0xf8fafc, true, false);
    pushBox(plan, cx, cz, a, gx, 0, 0.1, goalW + 0.1, 1.58, 0.1, 0xf8fafc, 0xf8fafc, false, false);
    pushBox(plan, cx, cz, a, gx + side * 0.26, 0, 0.08, goalW, 0, 1.55, 0x94a3b8, 0x94a3b8, false, false);
  }

  // Murets/grillages périmétriques solides avec grande entrée ouverte (3,4 m) côté rue (+e2)
  const fenceH = 1.1;
  pushBox(plan, cx, cz, a, 0, -d / 2, w, 0.2, 0, fenceH, 0xe2e8f0, METAL_SLATE, true, false);
  pushBox(plan, cx, cz, a, -w / 2, 0, 0.2, d, 0, fenceH, 0xe2e8f0, METAL_SLATE, true, false);
  pushBox(plan, cx, cz, a, w / 2, 0, 0.2, d, 0, fenceH, 0xe2e8f0, METAL_SLATE, true, false);
  const gateHalf = 1.7;
  const segW = (w - gateHalf * 2) / 2;
  if (segW > 0.4) {
    pushBox(plan, cx, cz, a, -(gateHalf + segW / 2), d / 2, segW, 0.2, 0, fenceH, 0xe2e8f0, METAL_SLATE, true, false);
    pushBox(plan, cx, cz, a, gateHalf + segW / 2, d / 2, segW, 0.2, 0, fenceH, 0xe2e8f0, METAL_SLATE, true, false);
  }

  // 4 fanions de corner posés au sommet du muret périmétrique (au-dessus des solides, 0 obstacle au sol)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pushBox(plan, cx, cz, a, sx * (w / 2 - 0.06), sz * (d / 2 - 0.06), 0.06, 0.06, fenceH, 0.55, 0xf8fafc, 0xf8fafc, false, false);
      pushBox(plan, cx, cz, a, sx * (w / 2 - 0.2), sz * (d / 2 - 0.06), 0.22, 0.04, fenceH + 0.38, 0.16, 0xf97316, 0xf97316, false, false);
    }
  }

  // 2 mâts d'éclairage nocturne
  for (const side of [-1, 1]) {
    const lu = side * (w / 2 - 0.35);
    const lv = -d / 2 + 0.35;
    pushBox(plan, cx, cz, a, lu, lv, 0.18, 0.18, 0, 4.5, METAL_SLATE, METAL_SLATE, true, false);
    pushLamp(plan, cx, cz, a, lu, lv + 0.25, 0.42, 0.24, 4.35, 0.18, 0xfef08a);
  }
  plan.venues.push({ kind: 'maracana', x: cx, z: cz, w, d, angle: a });
}

function emitBasketballCourt(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const w = Math.min(14.8, lot.w - 1.4);
  const d = Math.min(10.0, lot.d - 1.4);
  const cx = lot.x;
  const cz = lot.z;
  const a = lot.angle;

  // Revêtement bitume peint terracotta + raquettes bleues + lignes blanches (traversables)
  pushBox(plan, cx, cz, a, 0, 0, w, d, 0.015, 0.03, 0xb45309, 0xb45309, false, false);
  const keyW = Math.min(2.4, w * 0.2);
  const keyD = Math.min(3.2, d * 0.38);
  pushBox(plan, cx, cz, a, -w / 2 + keyW / 2 + 0.45, 0, keyW, keyD, 0.046, 0.008, 0x1d4ed8, 0x1d4ed8, false, false);
  pushBox(plan, cx, cz, a, w / 2 - keyW / 2 - 0.45, 0, keyW, keyD, 0.046, 0.008, 0x1d4ed8, 0x1d4ed8, false, false);
  pushBox(plan, cx, cz, a, 0, 0, 1.8, 1.8, 0.046, 0.008, 0x1d4ed8, 0x1d4ed8, false, false);
  // Lignes blanches du terrain
  pushBox(plan, cx, cz, a, 0, d / 2 - 0.35, w - 0.6, 0.1, 0.056, 0.008, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, 0, -d / 2 + 0.35, w - 0.6, 0.1, 0.056, 0.008, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, -w / 2 + 0.35, 0, 0.1, d - 0.6, 0.056, 0.008, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, w / 2 - 0.35, 0, 0.1, d - 0.6, 0.056, 0.008, 0xf8fafc, 0xf8fafc, false, false);
  pushBox(plan, cx, cz, a, 0, 0, 0.1, d - 0.6, 0.056, 0.008, 0xf8fafc, 0xf8fafc, false, false);

  // 2 paniers de basket (poteau + bras + panneau blanc + arceau orange)
  for (const side of [-1, 1]) {
    const px = side * (w / 2 - 0.45);
    pushBox(plan, cx, cz, a, px, 0, 0.18, 0.18, 0, 3.2, TRIM_DARK, TRIM_DARK, true, false);
    pushBox(plan, cx, cz, a, px - side * 0.45, 0, 0.9, 0.14, 3.05, 0.14, TRIM_DARK, TRIM_DARK, false, false);
    pushBox(plan, cx, cz, a, px - side * 0.85, 0, 0.08, 1.5, 2.7, 1.0, 0xf8fafc, 0xf8fafc, false, false);
    pushBox(plan, cx, cz, a, px - side * 0.9, 0, 0.04, 0.56, 2.86, 0.44, 0xef4444, 0xef4444, false, false);
    pushBox(plan, cx, cz, a, px - side * 1.15, 0, 0.48, 0.48, 2.82, 0.07, 0xf97316, 0xf97316, false, false);
    // Filet blanc suspendu sous l'arceau (y >= 2.52m, au-dessus du joueur)
    pushBox(plan, cx, cz, a, px - side * 1.15, 0, 0.34, 0.34, 2.54, 0.28, 0xf8fafc, 0xe2e8f0, false, false);
  }

  // Banc des joueurs + bordure basse avec large entrée de 4 m côté rue (+e2) + 2 projecteurs
  pushBox(plan, cx, cz, a, 0, -d / 2 + 0.55, 2.6, 0.44, 0, 0.46, 0x2563eb, 0x2563eb, true, false);
  pushBox(plan, cx, cz, a, 0, -d / 2, w, 0.22, 0, 0.46, CREAM_TRIM, METAL_SLATE, true, false);
  pushBox(plan, cx, cz, a, -w / 2, 0, 0.22, d, 0, 0.46, CREAM_TRIM, METAL_SLATE, true, false);
  pushBox(plan, cx, cz, a, w / 2, 0, 0.22, d, 0, 0.46, CREAM_TRIM, METAL_SLATE, true, false);
  const gateHalf = 2.0;
  const segW = (w - gateHalf * 2) / 2;
  if (segW > 0.4) {
    pushBox(plan, cx, cz, a, -(gateHalf + segW / 2), d / 2, segW, 0.22, 0, 0.46, CREAM_TRIM, METAL_SLATE, true, false);
    pushBox(plan, cx, cz, a, gateHalf + segW / 2, d / 2, segW, 0.22, 0, 0.46, CREAM_TRIM, METAL_SLATE, true, false);
  }
  for (const side of [-1, 1]) {
    const lu = side * (w / 2 - 0.35);
    const lv = -d / 2 + 0.35;
    pushBox(plan, cx, cz, a, lu, lv, 0.16, 0.16, 0, 4.5, METAL_SLATE, METAL_SLATE, true, false);
    pushLamp(plan, cx, cz, a, lu, lv + 0.25, 0.4, 0.22, 4.35, 0.16, 0xfef08a);
  }
  plan.venues.push({ kind: 'basket', x: cx, z: cz, w, d, angle: a });
}

const SHACK_ROOF_COLORS_LOCAL = [0x9a8f86, 0xa5623f, 0x5b8291, 0x6d7f5a, 0x8b4a32];

function emitVendorPairOnLot(plan: ChunkDecorPlan, lot: EmptyLot): void {
  const s1 = localToWorldPt(lot.x, lot.z, lot.angle, -lot.w * 0.2, lot.d * 0.15);
  const s2 = localToWorldPt(lot.x, lot.z, lot.angle, lot.w * 0.2, lot.d * 0.15);
  emitFoodVendor(plan, s1.x, s1.z, lot.angle, 'galettes', lot.seed);
  emitFoodVendor(plan, s2.x, s2.z, lot.angle, 'gnonmi', lot.seed + 7);
  // Bac à ordures & buissons d'ombrage à l'arrière
  const dp = localToWorldPt(lot.x, lot.z, lot.angle, lot.w * 0.28, -lot.d * 0.25);
  emitDumpster(plan, dp.x, dp.z, lot.angle, lot.seed);
  for (const uOff of [-lot.w * 0.26, 0]) {
    const bp = localToWorldPt(lot.x, lot.z, lot.angle, uOff, -lot.d * 0.24);
    pushBush(plan, bp.x, bp.z, 0.85, 1.35, BUSH_GREENS[(lot.seed + Math.round(uOff)) & 3]);
  }
}

function emitFoodVendor(
  plan: ChunkDecorPlan,
  x: number,
  z: number,
  angle: number,
  kind: 'galettes' | 'gnonmi',
  seed: number
): void {
  const s = seed >>> 0;
  const pagneColor = PAGNE_COLORS[s % PAGNE_COLORS.length];
  const blouseColor = BLOUSE_COLORS[(s >>> 2) % BLOUSE_COLORS.length];
  const foulardColor = PAGNE_COLORS[(s + 3) % PAGNE_COLORS.length];
  const parasolColor = PARASOL_COLORS[(s >>> 1) % PARASOL_COLORS.length];
  plan.foodVendors.push({ x, z, angle, kind, pagneColor, blouseColor, foulardColor, parasolColor });

  // Étal / fourneau côté rue (+e2) et vendeuse derrière (-e2)
  const tablePos = localToWorldPt(x, z, angle, 0, 0.34);
  if (kind === 'galettes') {
    plan.solids.push({ shape: 'box', x: tablePos.x, z: tablePos.z, hx: 0.54, hz: 0.34, angle, h: 1.08 });
  } else {
    plan.solids.push({ shape: 'box', x: tablePos.x, z: tablePos.z, hx: 0.72, hz: 0.4, angle, h: 0.78 });
  }
  const womanPos = localToWorldPt(x, z, angle, 0, -0.44);
  plan.solids.push({ shape: 'circle', x: womanPos.x, z: womanPos.z, r: 0.34, h: 1.78 });
}

function emitDumpster(plan: ChunkDecorPlan, x: number, z: number, angle: number, seed: number): void {
  const s = seed >>> 0;
  const color = s % 2 === 0 ? 0x15803d : 0x475569;
  const hasCompanionBin = (s & 1) === 0;
  plan.dumpsters.push({ x, z, angle, color, hasCompanionBin });
  plan.solids.push({ shape: 'box', x, z, hx: 0.725, hz: 0.45, angle, h: 1.14 });
  if (hasCompanionBin) {
    const bp = localToWorldPt(x, z, angle, 1.08, 0);
    if (!isWater(bp) && roadAt(bp) === 'none') {
      plan.solids.push({ shape: 'box', x: bp.x, z: bp.z, hx: 0.26, hz: 0.26, angle, h: 0.84 });
    }
  }
}

/**
 * Calcule de manière déterministe toutes les décorations d'un chunk ainsi que leurs solides physiques.
 * Pur et sans dépendance Three.js / DOM.
 */
export function collectChunkDecor(data: ChunkData): ChunkDecorPlan {
  const x0 = data.cx * CHUNK;
  const z0 = data.cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const inChunk = (x: number, z: number): boolean => x >= x0 && x < x1 && z >= z0 && z < z1;
  const nearBuilding = (x: number, z: number, margin = 1.9): boolean =>
    data.buildings.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) * 0.5 + margin);
  const nearEmptyLot = (x: number, z: number, margin = 1.5): boolean =>
    data.emptyLots.some((l) => Math.hypot(l.x - x, l.z - z) < Math.hypot(l.w, l.d) * 0.5 + margin);
  const nearHouseLot = (x: number, z: number, margin = 7.5): boolean =>
    data.houseLots.some((l) => Math.hypot(l.x - x, l.z - z) < margin);
  const nearTree = (x: number, z: number, margin = 1.4): boolean =>
    data.trees.some((t) => Math.hypot(t.x - x, t.z - z) < margin);

  const plan: ChunkDecorPlan = {
    buildingBoxes: [],
    facadeBoxes: [],
    buildingLamps: [],
    buildingShrubs: [],
    signs: [],
    venues: [],
    streetlamps: [],
    shelters: [],
    poles: [],
    stalls: [],
    bins: [],
    dumpsters: [],
    foodVendors: [],
    shrubs: [],
    parkedCars: [],
    pirogues: [],
    parasols: [],
    grass: [],
    puddles: [],
    solids: [],
  };

  // 0. Détails architecturaux attachés aux bâtiments (piliers, murets, bougainvilliers, bidons, kiosques)
  data.buildings.forEach((b, seedIdx) => {
    if (b.landmark && (HERO_LANDMARKS.has(b.landmark) || isHospitalId(b.landmark) || isMairieId(b.landmark) || isCommissariatId(b.landmark))) return;
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);

    if (b.kind === 'tower' || b.kind === 'warehouse' || b.kind === 'container') return;

    if (b.kind === 'villa' || b.kind === 'house') {
      if (b.kind !== 'villa') return;
      const roofHex = VILLA_WALLED_DISTRICTS.has(b.district) ? 0xb44c2e : 0x8f3a24;
      const vx = b.x - s * (b.d * 0.56);
      const vz = b.z + c * (b.d * 0.56);
      plan.buildingBoxes.push({ x: vx, z: vz, w: b.w * 0.58, d: 1.8, y0: 2.5, h: 0.28, angle: b.angle, color: 0xd97706, roofColor: roofHex });

      for (const side of [-1, 1]) {
        const px = vx + c * side * (b.w * 0.25);
        const pz = vz + s * side * (b.w * 0.25);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5)) {
          plan.buildingBoxes.push({ x: px, z: pz, w: 0.24, d: 0.24, y0: 0, h: 2.5, angle: b.angle, color: CREAM_TRIM });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 0.12, hz: 0.12, angle: b.angle, h: 2.5 });
        }
      }

      if (VILLA_WALLED_DISTRICTS.has(b.district)) {
        const wallCol = 0xe7dfd1;
        const wallCap = 0x9a442c;
        const backX = b.x + s * (b.d * 0.5 + 1.2);
        const backZ = b.z - c * (b.d * 0.5 + 1.2);
        const bp = { x: backX, z: backZ };
        if (!isWater(bp) && roadAt(bp) === 'none' && !insideSpecial(bp, 2) && !overlapsAnyBuilding(data.buildings, b.id, backX, backZ, 0.2)) {
          plan.buildingBoxes.push({ x: backX, z: backZ, w: b.w + 2.4, d: 0.35, y0: 0, h: 1.35, angle: b.angle, color: wallCol, roofColor: wallCap });
          plan.solids.push({ shape: 'box', x: backX, z: backZ, hx: (b.w + 2.4) / 2, hz: 0.175, angle: b.angle, h: 1.35 });
        }
        for (const side of [-1, 1]) {
          const sx = b.x + c * side * (b.w * 0.5 + 1.1);
          const sz = b.z + s * side * (b.w * 0.5 + 1.1);
          const sp = { x: sx, z: sz };
          if (!isWater(sp) && roadAt(sp) === 'none' && !insideSpecial(sp, 2) && !overlapsAnyBuilding(data.buildings, b.id, sx, sz, 0.2)) {
            plan.buildingBoxes.push({ x: sx, z: sz, w: 0.35, d: b.d + 1.8, y0: 0, h: 1.35, angle: b.angle, color: wallCol, roofColor: wallCap });
            plan.solids.push({ shape: 'box', x: sx, z: sz, hx: 0.175, hz: (b.d + 1.8) / 2, angle: b.angle, h: 1.35 });
          }
          const fx = b.x + c * side * (b.w * 0.45 + 0.8) - s * (b.d * 0.52);
          const fz = b.z + s * side * (b.w * 0.45 + 0.8) + c * (b.d * 0.52);
          const fp = { x: fx, z: fz };
          if (!isWater(fp) && roadAt(fp) === 'none' && !insideSpecial(fp, 2) && !overlapsAnyBuilding(data.buildings, b.id, fx, fz, 0.5)) {
            const flower = BOUGAINVILLEA_COLORS[(seedIdx + (side > 0 ? 1 : 0)) % BOUGAINVILLEA_COLORS.length];
            plan.buildingShrubs.push({ x: fx, z: fz, r: 0.78, h: 1.4, color: flower });
            plan.solids.push({ shape: 'circle', x: fx, z: fz, r: 0.62, h: 1.4 });
          }
        }
      }
      return;
    }

    if (b.kind === 'shack') {
      if (seedIdx % 2 === 0) {
        const px = b.x - s * (b.d * 0.52 + 0.55);
        const pz = b.z + c * (b.d * 0.52 + 0.55);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5)) {
          const postX = px + c * (b.w * 0.22);
          const postZ = pz + s * (b.w * 0.22);
          const canX = px - c * (b.w * 0.22);
          const canZ = pz - s * (b.w * 0.22);
          plan.buildingBoxes.push({ x: postX, z: postZ, w: 0.12, d: 0.12, y0: 0, h: 1.95, angle: b.angle, color: WOOD_DARK });
          plan.buildingBoxes.push({ x: canX, z: canZ, w: 0.42, d: 0.36, y0: 0, h: 0.52, angle: b.angle, color: 0x2563eb, roofColor: 0x1d4ed8 });
          plan.solids.push({ shape: 'box', x: postX, z: postZ, hx: 0.08, hz: 0.08, angle: b.angle, h: 1.95 });
          plan.solids.push({ shape: 'box', x: canX, z: canZ, hx: 0.21, hz: 0.18, angle: b.angle, h: 0.52 });
        }
      }
      return;
    }

    if (b.h >= 6.5) {
      const balX = b.x - s * (b.d * 0.5 + 0.45);
      const balZ = b.z + c * (b.d * 0.5 + 0.45);
      plan.buildingBoxes.push({ x: b.x, z: b.z, w: b.w * 1.03, d: b.d * 1.03, y0: 3.25, h: 0.24, angle: b.angle, color: CREAM_TRIM });
      plan.buildingBoxes.push({ x: balX, z: balZ, w: b.w * 0.62, d: 0.9, y0: 3.35, h: 0.16, angle: b.angle, color: CREAM_TRIM });
      plan.buildingBoxes.push({ x: balX - s * 0.38, z: balZ + c * 0.38, w: b.w * 0.62, d: 0.08, y0: 3.5, h: 0.68, angle: b.angle, color: TRIM_DARK });
    }

    if (seedIdx % 3 === 1) {
      const tx = b.x + c * (b.w * 0.24);
      const tz = b.z + s * (b.w * 0.24);
      const tankCol = seedIdx % 2 === 0 ? 0x1d4ed8 : 0x1e293b;
      plan.buildingBoxes.push({ x: tx, z: tz, w: 1.35, d: 1.35, y0: b.h + 0.55, h: 1.45, angle: b.angle, color: tankCol });
    }

    const ax = b.x - s * (b.d * 0.5 + 0.72);
    const az = b.z + c * (b.d * 0.5 + 0.72);
    if (seedIdx % 2 === 0) {
      const awnColor = AWNING_COLORS[seedIdx % AWNING_COLORS.length];
      plan.buildingBoxes.push({ x: ax, z: az, w: b.w * 0.78, d: 1.45, y0: 2.8, h: 0.25, angle: b.angle, color: awnColor });
      for (const side of [-1, 1]) {
        const px = ax + c * side * (b.w * 0.34);
        const pz = az + s * side * (b.w * 0.34);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5) && !overlapsAnyBuilding(data.buildings, b.id, px, pz, 0.15)) {
          plan.buildingBoxes.push({ x: px, z: pz, w: 0.18, d: 0.18, y0: 0, h: 2.8, angle: b.angle, color: CREAM_TRIM });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 0.1, hz: 0.1, angle: b.angle, h: 2.8 });
        }
      }
    }

    if (NEON_DISTRICTS.has(b.district) && seedIdx % 2 === 0) {
      const neonCol = NEON_SIGN_COLORS[seedIdx % NEON_SIGN_COLORS.length];
      const nx = b.x - s * (b.d * 0.5 + 0.16);
      const nz = b.z + c * (b.d * 0.5 + 0.16);
      plan.buildingLamps.push({ x: nx, z: nz, w: Math.min(4.2, b.w * 0.55), d: 0.18, y0: 3.25, h: 0.45, angle: b.angle, color: neonCol });
    }

    if (NEON_DISTRICTS.has(b.district) && seedIdx % 5 === 1) {
      const kx = b.x - s * (b.d * 0.5 + 1.55) + c * (b.w * 0.22);
      const kz = b.z + c * (b.d * 0.5 + 1.55) + s * (b.w * 0.22);
      const kp = { x: kx, z: kz };
      if (!isWater(kp) && roadAt(kp) === 'none' && !insideSpecial(kp, 2) && !overlapsAnyBuilding(data.buildings, b.id, kx, kz, 0.9)) {
        const tarp = PARASOL_COLORS[seedIdx % PARASOL_COLORS.length];
        plan.buildingBoxes.push({ x: kx, z: kz, w: 1.6, d: 0.9, y0: 0, h: 0.85, angle: b.angle, color: WOOD_MID });
        plan.buildingBoxes.push({ x: kx, z: kz, w: 0.1, d: 0.1, y0: 0.85, h: 1.45, angle: b.angle, color: WOOD_MID });
        plan.buildingBoxes.push({ x: kx, z: kz, w: 1.9, d: 1.9, y0: 2.25, h: 0.16, angle: b.angle, color: tarp });
        plan.solids.push({ shape: 'box', x: kx, z: kz, hx: 0.8, hz: 0.45, angle: b.angle, h: 0.85 });
        plan.solids.push({ shape: 'circle', x: kx, z: kz, r: 0.1, h: 2.25 });
      }
    }
  });

  // 0b. Parcelles vides en bord de rue : commerces, superettes, salons, kiosques, restauration, maracana, basket
  for (const lot of data.emptyLots) {
    if (nearHouseLot(lot.x, lot.z, 8.5)) continue;
    const h = lot.seed >>> 0;
    const canSports = lot.w >= 10.2 && lot.d >= 10.2;
    const mod = h % 12;
    if (canSports && mod === 0) {
      emitMaracanaCourt(plan, lot);
    } else if (canSports && mod === 1) {
      emitBasketballCourt(plan, lot);
    } else if (lot.w >= 8.8 && mod === 2) {
      emitSuperette(plan, lot);
    } else {
      switch (h % 9) {
        case 0:
        case 1:
          emitBoutique(plan, lot);
          break;
        case 2:
          emitCoiffure(plan, lot);
          break;
        case 3:
          emitTransfertKiosk(plan, lot.x, lot.z, lot.angle, lot.seed, true);
          break;
        case 4:
          emitGarbadrome(plan, lot.x, lot.z, lot.w, lot.d, lot.angle, lot.seed);
          break;
        case 5:
          emitAllocodrome(plan, lot.x, lot.z, lot.w, lot.d, lot.angle, lot.seed);
          break;
        case 6:
          emitMaquisQuartier(plan, lot);
          break;
        case 7:
          if (lot.w >= 8.4) emitSuperette(plan, lot);
          else emitBoutique(plan, lot);
          break;
        default:
          emitVendorPairOnLot(plan, lot);
          break;
      }
    }
  }

  // 1. Grands axes : lampadaires & abribus SOTRA
  for (const art of ARTERIALS) {
    const half = art.width / 2;
    for (let i = 0; i < art.points.length - 1; i++) {
      const a = art.points[i];
      const b = art.points[i + 1];
      if (Math.max(a.x, b.x) < x0 - 16 || Math.min(a.x, b.x) > x1 + 16) continue;
      if (Math.max(a.z, b.z) < z0 - 16 || Math.min(a.z, b.z) > z1 + 16) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;
      const roadAngle = Math.atan2(uz, ux);
      const step = 28;
      const nSteps = Math.floor(len / step);

      for (let k = 1; k < nSteps; k++) {
        const distAlong = k * step;
        const side = k % 2 === 0 ? 1 : -1;
        const lx = a.x + ux * distAlong + nx * side * (half + 0.65);
        const lz = a.z + uz * distAlong + nz * side * (half + 0.65);
        if (!inChunk(lx, lz)) continue;
        const lp = { x: lx, z: lz };
        if (isWater(lp) || bridgeAt(lp, 2.5) || insideSpecial(lp, 2) || roadAt(lp) !== 'none') continue;

        plan.streetlamps.push({
          poleX: lx,
          poleZ: lz,
          armX: lx - nx * side * 0.75,
          armZ: lz - nz * side * 0.75,
          bulbX: lx - nx * side * 1.25,
          bulbZ: lz - nz * side * 1.25,
          angle: roadAngle,
        });
        plan.solids.push({ shape: 'box', x: lx, z: lz, hx: 0.12, hz: 0.12, angle: roadAngle, h: 5.4 });

        if (k % 5 === 2) {
          const sx = a.x + ux * distAlong + nx * side * (half + 2.1);
          const sz = a.z + uz * distAlong + nz * side * (half + 2.1);
          const sp = { x: sx, z: sz };
          if (
            inChunk(sx, sz) &&
            !isWater(sp) &&
            !bridgeAt(sp, 4) &&
            roadAt(sp) === 'none' &&
            !insideSpecial(sp, 3) &&
            !nearBuilding(sx, sz, 2.4) &&
            !nearEmptyLot(sx, sz, 2.0)
          ) {
            const backX = sx + nx * side * 0.55;
            const backZ = sz + nz * side * 0.55;
            const post1X = sx - ux * 1.55;
            const post1Z = sz - uz * 1.55;
            const post2X = sx + ux * 1.55;
            const post2Z = sz + uz * 1.55;
            plan.shelters.push({ x: sx, z: sz, backX, backZ, post1X, post1Z, post2X, post2Z, angle: roadAngle });
            plan.solids.push({ shape: 'box', x: backX, z: backZ, hx: 1.7, hz: 0.09, angle: roadAngle, h: 2.35 });
            plan.solids.push({ shape: 'box', x: sx, z: sz, hx: 1.3, hz: 0.23, angle: roadAngle, h: 0.56 });
            plan.solids.push({ shape: 'box', x: post1X, z: post1Z, hx: 0.09, hz: 0.09, angle: roadAngle, h: 2.35 });
            plan.solids.push({ shape: 'box', x: post2X, z: post2Z, hx: 0.09, hz: 0.09, angle: roadAngle, h: 2.35 });
          }
        }
      }
    }
  }

  // 2. Rues locales : poteaux & câbles, micro-étals, bacs à ordures, buissons, vendeuses, kiosques transfert, voitures garées
  const centre = { x: x0 + CHUNK / 2, z: z0 + CHUNK / 2 };
  const cDist = districtAt(centre);
  const g = GRIDS[cDist.id];
  const grassColor = cDist.id === 'banco' ? 0x2d6a2e : cDist.social === 'luxury' ? 0x4b8f38 : 0x5f8c3a;
  const lotCarSpots = data.houseLots.map((l) => carSpotForLot(l));

  if (g && g.style !== 'none') {
    const f = frameFor(cDist.id);
    const angle = Math.atan2(f.s, f.c);
    const half = f.street / 2;
    const toWorld = (u: number, v: number) => ({
      x: f.ox + u * f.c - v * f.s,
      z: f.oz + u * f.s + v * f.c,
    });

    const sidewalkSpotFree = (x: number, z: number, facingAngle: number, fw: number, fd: number, clearM: number): boolean => {
      if (!inChunk(x, z)) return false;
      if (districtAt({ x, z }).id !== cDist.id) return false;
      if (!footprintDryAndOffRoad(x, z, fw, fd, facingAngle)) return false;
      if (nearBuilding(x, z, clearM) || nearEmptyLot(x, z, clearM * 0.5 + 1.0)) return false;
      if (nearHouseLot(x, z, 8.0) || nearTree(x, z, 1.4)) return false;
      if (lotCarSpots.some((cs) => Math.hypot(cs.x - x, cs.z - z) < 4.5)) return false;
      return true;
    };

    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      const dx = px - f.ox;
      const dz = pz - f.oz;
      const u = dx * f.c + dz * f.s;
      const v = -dx * f.s + dz * f.c;
      umin = Math.min(umin, u); umax = Math.max(umax, u);
      vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
    }
    const iMin = Math.floor(umin / f.pitch) - 1;
    const iMax = Math.floor(umax / f.pitch) + 1;
    const jMin = Math.floor(vmin / f.pitch) - 1;
    const jMax = Math.floor(vmax / f.pitch) + 1;

    for (let i = iMin; i <= iMax; i++) {
      for (let j = jMin; j <= jMax; j++) {
        const blockHash = hash32(i, j, cDist.id.charCodeAt(0));

        // Poteaux électriques + lampes + câbles le long de l'axe V
        const uPole = i * f.pitch + half + 0.55;
        const vMid = (j + 0.5) * f.pitch;
        const vQuarter1 = (j + 0.25) * f.pitch;
        const vQuarter3 = (j + 0.75) * f.pitch;

        for (const [idxV, vPos] of [vQuarter1, vQuarter3].entries()) {
          const pw = toWorld(uPole, vPos);
          if (
            inChunk(pw.x, pw.z) &&
            districtAt(pw).id === cDist.id &&
            !isWater(pw) &&
            !bridgeAt(pw, 3) &&
            !insideSpecial(pw, 2) &&
            roadAt(pw) === 'none'
          ) {
            const wireMid = idxV === 0 ? toWorld(uPole, vMid) : undefined;
            plan.poles.push({
              x: pw.x,
              z: pw.z,
              bulbX: pw.x - f.c * 0.35,
              bulbZ: pw.z - f.s * 0.35,
              wireMidX: wireMid?.x,
              wireMidZ: wireMid?.z,
              wireLen: wireMid ? f.pitch * 0.5 : undefined,
              angle,
            });
            plan.solids.push({ shape: 'box', x: pw.x, z: pw.z, hx: 0.11, hz: 0.11, angle, h: 5.2 });
          }
        }

        // Touffes d'herbe réelles (traversables, pas de solide)
        for (let gStep = 0; gStep < 6; gStep++) {
          const gv = j * f.pitch + half + 2.4 + (gStep / 6) * (f.pitch - f.street - 4.8);
          const gu = i * f.pitch + (gStep % 2 === 0 ? half + 1.65 : -(half + 1.65));
          const gp = toWorld(gu, gv);
          if (
            inChunk(gp.x, gp.z) &&
            districtAt(gp).id === cDist.id &&
            !isWater(gp) &&
            roadAt(gp) === 'none' &&
            !insideSpecial(gp, 2) &&
            !nearBuilding(gp.x, gp.z, 0.9) &&
            !nearEmptyLot(gp.x, gp.z, 0.5)
          ) {
            plan.grass.push({ x: gp.x, z: gp.z, scale: 0.85 + (gStep % 3) * 0.25, color: grassColor });
          }
        }

        // Emplacement 1 : micro-étal, poubelle, bac à ordures, ou vendeuse de galettes
        const vSide = j * f.pitch + half + 0.9;
        const sp = toWorld(i * f.pitch + f.pitch * 0.36, vSide);
        const h1 = blockHash & 3;
        if (sidewalkSpotFree(sp.x, sp.z, angle + Math.PI, 1.5, 0.9, 1.5)) {
          if (h1 === 0) {
            const tarpColor = PARASOL_COLORS[blockHash % PARASOL_COLORS.length];
            plan.stalls.push({ x: sp.x, z: sp.z, angle, tarpColor });
            plan.solids.push({ shape: 'box', x: sp.x, z: sp.z, hx: 0.725, hz: 0.425, angle, h: 0.8 });
            plan.solids.push({ shape: 'circle', x: sp.x, z: sp.z, r: 0.08, h: 2.15 });
          } else if (h1 === 1) {
            plan.bins.push({ x: sp.x, z: sp.z, angle });
            plan.solids.push({ shape: 'box', x: sp.x, z: sp.z, hx: 0.24, hz: 0.24, angle, h: 0.78 });
            const flX = sp.x - f.s * 0.9;
            const flZ = sp.z + f.c * 0.9;
            const fp = { x: flX, z: flZ };
            if (!isWater(fp) && roadAt(fp) === 'none' && !nearBuilding(flX, flZ, 0.8) && !nearEmptyLot(flX, flZ, 0.5)) {
              const flowerCol = BOUGAINVILLEA_COLORS[blockHash % BOUGAINVILLEA_COLORS.length];
              plan.shrubs.push({ x: flX, z: flZ, r: 0.52, h: 0.95, color: flowerCol });
              plan.solids.push({ shape: 'circle', x: flX, z: flZ, r: 0.48, h: 0.95 });
            }
          } else if (h1 === 2) {
            emitFoodVendor(plan, sp.x, sp.z, angle + Math.PI, 'galettes', blockHash);
          } else {
            emitDumpster(plan, sp.x, sp.z, angle, blockHash);
          }
        }

        // Emplacement 2 (trottoir perpendiculaire opposé) : vendeuse de gnonmi, buisson ou kiosque transfert
        const uSide = i * f.pitch + half + 1.05;
        const sp2 = toWorld(uSide, j * f.pitch + f.pitch * 0.62);
        const h2 = (blockHash >>> 4) & 3;
        if (h2 === 0 && sidewalkSpotFree(sp2.x, sp2.z, angle + Math.PI / 2, 1.5, 1.1, 1.5)) {
          emitFoodVendor(plan, sp2.x, sp2.z, angle + Math.PI / 2, 'gnonmi', blockHash >>> 2);
        } else if (h2 === 1 && sidewalkSpotFree(sp2.x, sp2.z, angle + Math.PI / 2, 1.4, 1.4, 1.4)) {
          const bushCol = (blockHash & 8) ? BOUGAINVILLEA_COLORS[blockHash % BOUGAINVILLEA_COLORS.length] : BUSH_GREENS[blockHash % BUSH_GREENS.length];
          pushBush(plan, sp2.x, sp2.z, 0.72, 1.25, bushCol);
        } else if (h2 === 2) {
          const kPos = toWorld(i * f.pitch + half + 1.55, j * f.pitch + f.pitch * 0.64);
          if (sidewalkSpotFree(kPos.x, kPos.z, angle + Math.PI / 2, 2.6, 2.2, 2.6)) {
            emitTransfertKiosk(plan, kPos.x, kPos.z, angle + Math.PI / 2, blockHash >>> 3, false);
          }
        } else if (h2 === 3 && sidewalkSpotFree(sp2.x, sp2.z, angle + Math.PI / 2, 1.5, 0.95, 1.6)) {
          emitDumpster(plan, sp2.x, sp2.z, angle + Math.PI / 2, blockHash >>> 1);
        }

        // Emplacement 3 (second bord de bloc le long de U) : buisson de coin ou vendeuse de galettes/gnonmi
        const sp3 = toWorld(i * f.pitch + f.pitch * 0.72, j * f.pitch - (half + 0.95));
        const h3 = (blockHash >>> 8) & 3;
        if (h3 === 0 && sidewalkSpotFree(sp3.x, sp3.z, angle, 1.4, 1.0, 1.5)) {
          emitFoodVendor(plan, sp3.x, sp3.z, angle, (blockHash & 16) ? 'gnonmi' : 'galettes', blockHash >>> 5);
        } else if (h3 === 1 && sidewalkSpotFree(sp3.x, sp3.z, angle, 1.2, 1.2, 1.2)) {
          pushBush(plan, sp3.x, sp3.z, 0.68, 1.15, BUSH_GREENS[(blockHash + 1) % BUSH_GREENS.length]);
        }

        // Voiture garée en bord de rue (collée au caniveau pour ne jamais gêner les voies de circulation)
        if ((blockHash % 5) === 0) {
          const curbOffset = f.street >= 7 ? 0.62 : 0.52;
          const carPos = toWorld(i * f.pitch + f.pitch * 0.62, j * f.pitch - (half - curbOffset));
          if (
            inChunk(carPos.x, carPos.z) &&
            districtAt(carPos).id === cDist.id &&
            !isWater(carPos) &&
            !bridgeAt(carPos, 4) &&
            !insideSpecial(carPos, 4) &&
            nearestArterial(carPos).dist > ARTERIAL_WIDTH / 2 + 2.5 &&
            !nearBuilding(carPos.x, carPos.z, 1.4) &&
            !lotCarSpots.some((cs) => Math.hypot(cs.x - carPos.x, cs.z - carPos.z) < 4.5)
          ) {
            const color = PARKED_CAR_COLORS[blockHash % PARKED_CAR_COLORS.length];
            plan.parkedCars.push({ x: carPos.x, z: carPos.z, angle, color });
            plan.solids.push({ shape: 'box', x: carPos.x, z: carPos.z, hx: 1.8, hz: 0.81, angle, h: 1.36 });
          }
        }

        // Flaque d'eau en caniveau (traversable, pas de solide)
        if ((blockHash % 3) === 0) {
          const pud = toWorld(i * f.pitch + f.pitch * 0.45, j * f.pitch + (half - 0.45));
          if (inChunk(pud.x, pud.z) && !isWater(pud) && !bridgeAt(pud, 2)) {
            plan.puddles.push({ x: pud.x, z: pud.z, rx: 1.4, rz: 0.7, seed: blockHash });
          }
        }
      }
    }
  }

  // 3. Touffes d'herbe & sous-bois autour des arbres (et buissons solides du Banco)
  const primaryDistrict = data.buildings[0]?.district ?? cDist.id;
  for (let i = 0; i < data.trees.length; i++) {
    const t = data.trees[i];
    const h = hash32(Math.floor(t.x), Math.floor(t.z), i);
    for (let k = 0; k < 2; k++) {
      const a = ((h + k * 97) % 360) * (Math.PI / 180);
      const r = 1.1 + ((h >> (k * 3)) & 3) * 0.45;
      const gx = t.x + Math.cos(a) * r;
      const gz = t.z + Math.sin(a) * r;
      if (inChunk(gx, gz) && !isWater({ x: gx, z: gz }) && roadAt({ x: gx, z: gz }) === 'none') {
        plan.grass.push({ x: gx, z: gz, scale: 0.9 + (k % 2) * 0.35, color: grassColor });
      }
    }

    if (primaryDistrict === 'banco') {
      const th = Math.abs(Math.floor(t.x * 7 + t.z * 13 + i)) | 0;
      if (th % 2 === 0) {
        const ba = (th % 12) * 0.52;
        const bx = t.x + Math.cos(ba) * 1.4;
        const bz = t.z + Math.sin(ba) * 1.4;
        const bp = { x: bx, z: bz };
        if (inChunk(bx, bz) && !isWater(bp) && !bridgeAt(bp, 2) && roadAt(bp) === 'none') {
          plan.shrubs.push({ x: bx, z: bz, r: 1.1, h: 1.65, color: 0x2f6b31 });
          plan.solids.push({ shape: 'circle', x: bx, z: bz, r: 0.75, h: 1.65 });
        }
      }
    }
  }

  // 4. Plage atlantique (Port-Bouët / Grand-Bassam / Vridi) : pirogues échouées & parasols
  if (cDist.id === 'grand_bassam' || cDist.id === 'port_bouet' || cDist.id === 'vridi') {
    const coast = projected.coast;
    let minChunkCoast = Infinity;
    for (let i = 0; i < coast.length - 1; i++) {
      minChunkCoast = Math.min(minChunkCoast, distanceToSegment(centre, coast[i], coast[i + 1]).dist);
    }
    if (minChunkCoast < 90) {
      for (let slot = 0; slot < 4; slot++) {
        const rx = ((hash32(data.cx, data.cz, slot * 17 + 3) & 255) / 255) * (CHUNK - 10) + 5;
        const rz = ((hash32(data.cx, data.cz, slot * 17 + 9) & 255) / 255) * (CHUNK - 10) + 5;
        const px = x0 + rx;
        const pz = z0 + rz;
        const p = { x: px, z: pz };
        if (isWater(p) || roadAt(p) !== 'none' || insideSpecial(p, 3) || nearBuilding(px, pz, 2.5)) continue;
        let minC = Infinity;
        for (let i = 0; i < coast.length - 1; i++) minC = Math.min(minC, distanceToSegment(p, coast[i], coast[i + 1]).dist);
        if (minC < 14 || minC > 42) continue;

        if (slot === 0) {
          const hullCol = hash32(data.cx, data.cz, 99) % 2 === 0 ? 0x1d4ed8 : 0x7c2d12;
          const pAngle = ((slot + data.cx) % 5) * 0.25;
          plan.pirogues.push({ x: px, z: pz, angle: pAngle, color: hullCol });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 2.35, hz: 0.46, angle: pAngle, h: 0.5 });
        } else {
          const parasolCol = PARASOL_COLORS[(slot + Math.abs(data.cx + data.cz)) % PARASOL_COLORS.length];
          const pAngle = slot * 0.4;
          plan.parasols.push({ x: px, z: pz, angle: pAngle, color: parasolCol });
          plan.solids.push({ shape: 'circle', x: px, z: pz, r: 0.12, h: 2.15 });
        }
      }
    }
  }

  return plan;
}

/** Retourne uniquement la liste des solides physiques d'un chunk (décorations de rue, commerces, terrains, végétation). */
export function chunkDecorSolids(data: ChunkData): ChunkSolid[] {
  return collectChunkDecor(data).solids;
}
