/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Générateur déterministe de la ville d'Abidjan, par chunks de 64 m.
 * Mêmes entrées => mêmes bâtiments chez tous les joueurs (indispensable au multijoueur).
 *
 * Conventions : x est, z sud. Un angle « physique » a définit les axes e1 = (cos a, sin a), e2 = (-sin a, cos a).
 * Pour un objet Three.js, rotation.y = -a.
 */

import { LatLon, Vec2, project, unproject } from './geo';
import { DISTRICTS, District, HomeType, LANDMARKS, districtAt, districtsForHome, isWater } from './abidjanGeography';
import { GRIDS, Frame, frameFor, isOpenWater, roadAt, bridgeAt } from './roads';
import { hash32, rand01 } from './rng';

export const CHUNK = 64;
const WATER_CELL = 8;

export type BuildingKind = 'tower' | 'block' | 'house' | 'villa' | 'shack' | 'warehouse' | 'special' | 'container';

export interface Building {
  id: string;
  x: number;
  z: number;
  w: number;      // dimension le long de e1
  d: number;      // dimension le long de e2
  h: number;
  angle: number;  // convention physique
  color: number;
  kind: BuildingKind;
  district: string;
  solid: boolean;
  /** Pour les lieux emblématiques (identifiant du repère). */
  landmark?: string;
}

export interface Tree { x: number; z: number; h: number; r: number }

export interface HouseLot {
  id: string;
  district: string;
  x: number;
  z: number;
  /** Direction (unitaire) de la façade, vers la rue la plus proche. */
  front: Vec2;
  /** Angle Three.js (rotation.y) pour orienter une maison dont l'avant est +z local. */
  rotationY: number;
  width: number;
  depth: number;
  /** Distance du centre de la parcelle à la rue (bord du bloc) le long de la façade. */
  toStreet: number;
  homes: HomeType[];
}

export interface WaterRun { x: number; z: number; hx: number; hz: number }

export interface ChunkData {
  cx: number;
  cz: number;
  buildings: Building[];
  trees: Tree[];
  houseLots: HouseLot[];
  water: WaterRun[];
}

export const chunkOf = (v: number): number => Math.floor(v / CHUNK);

const PALETTES = {
  glass: [0x7fb7d4, 0x9ccbe0, 0x6aa6c4, 0xc7e3ee, 0x86c0cf],
  warm: [0xf2d6a2, 0xe9b48c, 0xf6ead0, 0xd9a27a, 0xe8cfa8, 0xf0e0c0, 0xf2c1a0, 0xd6e4c4],
  villa: [0xfff6e6, 0xfbe9cc, 0xf3e1c2, 0xfffaf0, 0xf8dfc0],
  shack: [0xc9764f, 0x9fb0a8, 0xd9a05b, 0x7fb3b8, 0xe08a5a],
  industrial: [0xb7c0c4, 0xcdd3d6, 0xa9b6b8, 0xc2ccd2],
  house: [0xffd9a8, 0xf5c9a8, 0xfdf0d2, 0xcdeacb, 0xf8d4d4, 0xd6dcf5, 0xfff0a8]
};
const pick = (arr: number[], r: number): number => arr[Math.floor(r * arr.length) % arr.length];

// ───────────── Repères emblématiques ─────────────

interface SpecialSpec {
  id: string;
  name: string;
  at: LatLon;
  w: number;
  d: number;
  h: number;
  angleDeg: number;
  color: number;
  /** Place l'objet au centre du bloc de rues qui contient le point (petits bâtiments). */
  snapToBlock: boolean;
  containers?: { cols: number; rows: number; levels: number };
}

const landmark = (id: string): LatLon => LANDMARKS.find((l) => l.id === id)!.at;
export const SPECIALS: SpecialSpec[] = [
  { id: 'stade', name: 'Stade Félix Houphouët-Boigny', at: landmark('stade'), w: 90, d: 64, h: 24, angleDeg: 8, color: 0xdedbd2, snapToBlock: false },
  { id: 'cathedrale', name: 'Cathédrale Saint-Paul', at: landmark('cathedrale'), w: 26, d: 44, h: 52, angleDeg: 8, color: 0xd2cbbb, snapToBlock: false },
  { id: 'hotel_ivoire', name: 'Hôtel Ivoire', at: landmark('hotel_ivoire'), w: 46, d: 30, h: 72, angleDeg: -12, color: 0xe5e0d0, snapToBlock: false },
  { id: 'marche_adjame', name: "Marché d'Adjamé", at: landmark('marche_adjame'), w: 80, d: 56, h: 10, angleDeg: 0, color: 0xb85c38, snapToBlock: false },
  { id: 'palais_culture', name: 'Palais de la Culture', at: landmark('palais_sports'), w: 60, d: 40, h: 20, angleDeg: 0, color: 0xd8d4c8, snapToBlock: false },
  { id: 'aeroport', name: 'Aéroport Félix Houphouët-Boigny', at: landmark('airport'), w: 130, d: 44, h: 18, angleDeg: 12, color: 0xc9d1d8, snapToBlock: false },
  { id: 'port', name: "Port Autonome d'Abidjan", at: landmark('port'), w: 70, d: 40, h: 8, angleDeg: 0, color: 0x7a8a99, snapToBlock: false, containers: { cols: 10, rows: 5, levels: 3 } },
  // Lycées d'Excellence (emplacements corrigés Cocody & Grand-Bassam)
  { id: 'lycee_caiman', name: 'Lycée Classique (Caïman)', at: { lat: 5.344, lon: -4.000 }, w: 22, d: 14, h: 8, angleDeg: 0, color: 0xe8c07a, snapToBlock: true },
  { id: 'lycee_alysma', name: 'Sainte-Marie (Alysma)', at: { lat: 5.354, lon: -3.984 }, w: 20, d: 12, h: 8, angleDeg: 0, color: 0xf0a8a0, snapToBlock: true },
  { id: 'lycee_alex', name: "Lycée d'Excellence (Alex · Bassam)", at: { lat: 5.250, lon: -3.904 }, w: 26, d: 16, h: 10, angleDeg: 0, color: 0x9ec8e8, snapToBlock: true }
];

export interface SpecialFootprint { spec: SpecialSpec; x: number; z: number; w: number; d: number; angle: number }

function resolveSpecial(spec: SpecialSpec): SpecialFootprint {
  const p = project(spec.at.lat, spec.at.lon);
  const dist = districtAt(p);
  const g = GRIDS[dist.id];
  const f = frameFor(dist.id);
  const angle = spec.snapToBlock ? Math.atan2(f.s, f.c) : (spec.angleDeg * Math.PI) / 180;
  if (!spec.snapToBlock || !g || g.style === 'none') return { spec, x: p.x, z: p.z, w: spec.w, d: spec.d, angle };
  const dx = p.x - f.ox;
  const dz = p.z - f.oz;
  const u = dx * f.c + dz * f.s;
  const v = -dx * f.s + dz * f.c;
  const i = Math.floor(u / f.pitch);
  const j = Math.floor(v / f.pitch);
  const cu = (i + 0.5) * f.pitch;
  const cv = (j + 0.5) * f.pitch;
  const B = f.pitch - f.street - 4;
  return {
    spec,
    x: f.ox + cu * f.c - cv * f.s,
    z: f.oz + cu * f.s + cv * f.c,
    w: Math.min(spec.w, B),
    d: Math.min(spec.d, B),
    angle
  };
}

export const SPECIAL_FOOTPRINTS: SpecialFootprint[] = SPECIALS.map(resolveSpecial);

const specialRadius = (s: SpecialFootprint): number => Math.hypot(s.w, s.d) / 2;

/** Vrai si le point est sous l'emprise (agrandie de `margin`) d'un repère : pas de rue peinte dessous. */
export function insideSpecial(p: Vec2, margin = 0): SpecialFootprint | null {
  for (const s of SPECIAL_FOOTPRINTS) {
    const dx = p.x - s.x;
    const dz = p.z - s.z;
    const c = Math.cos(s.angle);
    const sn = Math.sin(s.angle);
    const lu = dx * c + dz * sn;
    const lv = -dx * sn + dz * c;
    if (Math.abs(lu) < s.w / 2 + margin && Math.abs(lv) < s.d / 2 + margin) return s;
  }
  return null;
}

// ───────────── Génération ─────────────

const rotate = (f: Frame, u: number, v: number): Vec2 => ({ x: f.ox + u * f.c - v * f.s, z: f.oz + u * f.s + v * f.c });

function footprintClear(x: number, z: number, w: number, d: number, angle: number, district: District): boolean {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pts: Vec2[] = [{ x, z }];
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const lu = (a * w) / 2;
    const lv = (b * d) / 2;
    pts.push({ x: x + lu * c - lv * s, z: z + lu * s + lv * c });
  }
  for (const p of pts) {
    if (isWater(p) || bridgeAt(p, 4)) return false;
    if (districtAt(p).id !== district.id) return false;   // jamais à cheval sur deux quadrillages
    if (roadAt(p, district) !== 'none') return false;
  }
  return true;
}

export interface GenerateOptions {
  /** Parcelles dont la maison générique est omise (maison d'un joueur placée par le jeu). */
  reservedLots?: ReadonlySet<string>;
}

const empty = (cx: number, cz: number): ChunkData => ({ cx, cz, buildings: [], trees: [], houseLots: [], water: [] });

export function generateChunk(cx: number, cz: number, opts: GenerateOptions = {}): ChunkData {
  const out = empty(cx, cz);
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const inChunk = (x: number, z: number): boolean => x >= x0 && x < x1 && z >= z0 && z < z1;

  // Communes susceptibles d'intersecter ce chunk (échantillonnage 5 × 5)
  const candidates = new Set<string>();
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) candidates.add(districtAt({ x: x0 + (a * CHUNK) / 4, z: z0 + (b * CHUNK) / 4 }).id);

  for (const dist of DISTRICTS) {
    if (!candidates.has(dist.id)) continue;
    const g = GRIDS[dist.id];
    if (dist.id === 'banco') { generateForest(out, x0, z0, dist); continue; }
    if (!g || g.style === 'none') continue;
    const f = frameFor(dist.id);

    // Étendue locale du chunk -> indices de blocs
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      const dx = px - f.ox;
      const dz = pz - f.oz;
      const u = dx * f.c + dz * f.s;
      const v = -dx * f.s + dz * f.c;
      umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
    }
    const iMin = Math.floor(umin / f.pitch) - 1;
    const iMax = Math.floor(umax / f.pitch) + 1;
    const jMin = Math.floor(vmin / f.pitch) - 1;
    const jMax = Math.floor(vmax / f.pitch) + 1;

    const angle = Math.atan2(f.s, f.c);
    const seed = hash32(dist.id.length, dist.id.charCodeAt(0), dist.id.charCodeAt(dist.id.length - 1));

    for (let i = iMin; i <= iMax; i++) {
      for (let j = jMin; j <= jMax; j++) {
        const bc = rotate(f, (i + 0.5) * f.pitch, (j + 0.5) * f.pitch);
        if (districtAt(bc).id !== dist.id) continue;           // le bloc appartient à une seule commune
        const B = f.pitch - f.street;
        const blockRand = rand01(seed, i, j, 1);
        const residential = dist.homes.length > 0 && g.style !== 'warehouse' && blockRand < 0.34;
        const style = g.style;
        const lot = residential ? 18 : g.lot;
        const nU = Math.max(1, Math.round(B / lot));
        const nV = nU;
        const lu = B / nU;
        const lv = B / nV;
        const baseU = i * f.pitch + f.street / 2;
        const baseV = j * f.pitch + f.street / 2;

        if (style === 'tower' && !residential) {
          const r1 = rand01(seed, i, j, 2);
          const r2 = rand01(seed, i, j, 3);
          const w = B * (0.5 + 0.3 * r1);
          const d = B * (0.5 + 0.3 * r2);
          const p = rotate(f, baseU + B / 2, baseV + B / 2);
          if (inChunk(p.x, p.z) && footprintClear(p.x, p.z, w, d, angle, dist)) {
            const hm = dist.heightM;
            out.buildings.push({
              id: `${dist.id}:${i}:${j}:t`, x: p.x, z: p.z, w, d,
              h: hm[0] + (hm[1] - hm[0]) * Math.pow(rand01(seed, i, j, 4), 1.6),
              angle, color: pick(PALETTES.glass, rand01(seed, i, j, 5)), kind: 'tower', district: dist.id, solid: true
            });
          }
          continue;
        }

        for (let a = 0; a < nU; a++) {
          for (let b = 0; b < nV; b++) {
            const id = `${dist.id}:${i}:${j}:${a}:${b}`;
            const p = rotate(f, baseU + (a + 0.5) * lu, baseV + (b + 0.5) * lv);
            if (!inChunk(p.x, p.z)) continue;
            const r = rand01(seed, i, j, a * 31 + b * 7 + 10);
            const r2 = rand01(seed, i, j, a * 31 + b * 7 + 11);
            const r3 = rand01(seed, i, j, a * 31 + b * 7 + 12);

            if (residential) {
              // Parcelle de maison : façade vers la rue la plus proche
              const dA = [a + 0.5, nU - a - 0.5, b + 0.5, nV - b - 0.5];
              let k = 0;
              for (let q = 1; q < 4; q++) if (dA[q] < dA[k] - 1e-6 || (Math.abs(dA[q] - dA[k]) < 1e-6 && rand01(seed, i, j, a + b * 13 + q) < 0.5)) k = q;
              const fl = [[-1, 0], [1, 0], [0, -1], [0, 1]][k];
              const front = { x: fl[0] * f.c - fl[1] * f.s, z: fl[0] * f.s + fl[1] * f.c };
              if (!footprintClear(p.x, p.z, 13, 11, angle, dist)) continue;
              // Seules les parcelles en bordure de bloc ont une façade sur rue : elles peuvent accueillir un joueur
              if (dA[k] < 1) {
                out.houseLots.push({
                  id, district: dist.id, x: p.x, z: p.z, front, rotationY: Math.atan2(front.x, front.z),
                  width: lu, depth: lv, toStreet: dA[k] * lu, homes: dist.homes
                });
              }
              if (!opts.reservedLots?.has(id)) {
                const shack = style === 'shack';
                out.buildings.push({
                  id: `${id}:h`, x: p.x, z: p.z, w: (shack ? 6 : 9) + 2 * r, d: (shack ? 5 : 7) + 2 * r2, h: shack ? 2.6 + 0.6 * r3 : 3.6 + 0.8 * r3,
                  angle, color: pick(shack ? PALETTES.shack : PALETTES.house, r), kind: shack ? 'shack' : 'house', district: dist.id, solid: true
                });
              }
              if (r2 < 0.5) addTree(out, rotate(f, baseU + (a + 0.5) * lu + (r < 0.5 ? 1 : -1) * (lu / 2 - 2), baseV + (b + 0.5) * lv + (r3 < 0.5 ? 1 : -1) * (lv / 2 - 2)), dist, 5 + 3 * r3);
              continue;
            }

            if (r > dist.density) {                                  // parcelle vide : un arbre parfois
              if (style === 'villa' || style === 'block') if (r2 < 0.5) addTree(out, p, dist, 5 + 4 * r3);
              continue;
            }

            let w: number, d: number, h: number, kind: BuildingKind, color: number, ox = 0, oz = 0;
            const hm = dist.heightM;
            if (style === 'villa') {
              if (r3 > 0.86) { w = lu * 0.6; d = lv * 0.5; h = hm[0] + (hm[1] - hm[0]) * (0.5 + 0.5 * r2); kind = 'block'; color = pick(PALETTES.warm, r2); }
              else { w = lu * (0.38 + 0.2 * r2); d = lv * (0.34 + 0.2 * r3); h = 4 + 4 * r2; kind = 'villa'; color = pick(PALETTES.villa, r); }
              ox = (r2 - 0.5) * (lu - w - 4); oz = (r3 - 0.5) * (lv - d - 4);
              if (r < 0.5) addTree(out, rotate(f, baseU + (a + 0.5) * lu + (lu / 2 - 2.5), baseV + (b + 0.5) * lv + (lv / 2 - 2.5)), dist, 6 + 3 * r2);
            } else if (style === 'shack') {
              w = lu * (0.5 + 0.35 * r2); d = lv * (0.5 + 0.35 * r3); h = 2.4 + 1.1 * r; kind = 'shack'; color = pick(PALETTES.shack, r2);
            } else if (style === 'warehouse') {
              w = lu * (0.6 + 0.25 * r2); d = lv * (0.5 + 0.25 * r3); h = hm[0] + (hm[1] - hm[0]) * r; kind = 'warehouse'; color = pick(PALETTES.industrial, r2);
            } else {
              const gap = 1.2 + r2;
              w = lu - 2 * gap; d = lv - 2 * gap;
              h = hm[0] + (hm[1] - hm[0]) * Math.pow(r3, 1.7);
              kind = 'block'; color = pick(PALETTES.warm, r2);
            }
            const loc = rotate(f, baseU + (a + 0.5) * lu + ox, baseV + (b + 0.5) * lv + oz);
            if (!inChunk(loc.x, loc.z) || !footprintClear(loc.x, loc.z, w, d, angle, dist)) continue;
            out.buildings.push({ id, x: loc.x, z: loc.z, w, d, h, angle, color, kind, district: dist.id, solid: true });
          }
        }
      }
    }
  }

  applySpecials(out, x0, z0, x1, z1);
  buildWater(out, x0, z0);
  return out;
}

function addTree(out: ChunkData, p: Vec2, dist: District, h: number): void {
  if (isWater(p) || bridgeAt(p, 3) || roadAt(p, dist) !== 'none') return;
  if (p.x < out.cx * CHUNK || p.x >= (out.cx + 1) * CHUNK || p.z < out.cz * CHUNK || p.z >= (out.cz + 1) * CHUNK) return;
  out.trees.push({ x: p.x, z: p.z, h, r: 0.3 });
}

function generateForest(out: ChunkData, x0: number, z0: number, dist: District): void {
  const step = 7;
  for (let a = 0; a < CHUNK / step; a++) for (let b = 0; b < CHUNK / step; b++) {
    const r = rand01(7, x0 + a, z0 + b, 1);
    if (r > 0.72) continue;
    const p = { x: x0 + (a + rand01(7, x0 + a, z0 + b, 2)) * step, z: z0 + (b + rand01(7, x0 + a, z0 + b, 3)) * step };
    if (districtAt(p).id !== dist.id) continue;
    if (isWater(p) || bridgeAt(p, 6)) continue;
    const k = roadAt(p, dist);
    if (k === 'arterial' || k === 'bridge') continue;
    out.trees.push({ x: p.x, z: p.z, h: 9 + 8 * rand01(7, x0 + a, z0 + b, 4), r: 0.4 });
  }
}

function applySpecials(out: ChunkData, x0: number, z0: number, x1: number, z1: number): void {
  const near = SPECIAL_FOOTPRINTS.filter((s) => s.x > x0 - 120 && s.x < x1 + 120 && s.z > z0 - 120 && s.z < z1 + 120);
  if (near.length === 0) return;
  const overlaps = (x: number, z: number, r: number): boolean => near.some((s) => Math.hypot(x - s.x, z - s.z) < specialRadius(s) + r + 3);
  out.buildings = out.buildings.filter((b) => !overlaps(b.x, b.z, Math.hypot(b.w, b.d) / 2));
  out.trees = out.trees.filter((t) => !near.some((s) => insideSpecial({ x: t.x, z: t.z }, 4) === s));
  out.houseLots = out.houseLots.filter((l) => !overlaps(l.x, l.z, 8));
  for (const s of near) {
    if (!(s.x >= x0 && s.x < x1 && s.z >= z0 && s.z < z1)) continue;
    if (s.spec.containers) {
      const { cols, rows, levels } = s.spec.containers;
      const palette = [0xc0392b, 0x2c6fbb, 0xe0a030, 0x2e8b57, 0x8e5a9b, 0xd95f0e];
      const c = Math.cos(s.angle);
      const sn = Math.sin(s.angle);
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) for (let l = 0; l < levels; l++) {
        if (rand01(5, a, b, l) < 0.12 && l > 0) continue;
        const lu = (a - (cols - 1) / 2) * 6.6;
        const lv = (b - (rows - 1) / 2) * 3.2;
        out.buildings.push({
          id: `port:${a}:${b}:${l}`, x: s.x + lu * c - lv * sn, z: s.z + lu * sn + lv * c, w: 6.1, d: 2.45, h: 2.6,
          angle: s.angle, color: palette[hash32(a, b, l) % palette.length], kind: 'container', district: 'treichville', solid: false
        });
      }
      out.buildings.push({
        id: 'port:collider', x: s.x, z: s.z, w: cols * 6.6, d: rows * 3.2 + 0.8, h: levels * 2.6,
        angle: s.angle, color: 0, kind: 'special', district: 'treichville', solid: true, landmark: 'port_collider'
      });
      continue;
    }
    out.buildings.push({
      id: `special:${s.spec.id}`, x: s.x, z: s.z, w: s.w, d: s.d, h: s.spec.h, angle: s.angle, color: s.spec.color,
      kind: 'special', district: districtAt({ x: s.x, z: s.z }).id, solid: true, landmark: s.spec.id
    });
  }
}

function buildWater(out: ChunkData, x0: number, z0: number): void {
  const n = CHUNK / WATER_CELL;
  for (let b = 0; b < n; b++) {
    let runStart = -1;
    for (let a = 0; a <= n; a++) {
      const wet = a < n && isOpenWater({ x: x0 + (a + 0.5) * WATER_CELL, z: z0 + (b + 0.5) * WATER_CELL });
      if (wet && runStart < 0) runStart = a;
      if (!wet && runStart >= 0) {
        const len = (a - runStart) * WATER_CELL;
        out.water.push({ x: x0 + runStart * WATER_CELL + len / 2, z: z0 + (b + 0.5) * WATER_CELL, hx: len / 2, hz: WATER_CELL / 2 });
        runStart = -1;
      }
    }
  }
}

// ───────────── Parcelles de maisons (multijoueur) ─────────────

/**
 * Choisit de façon déterministe une parcelle pour un logement donné.
 * En production, le serveur tient le registre des parcelles occupées ; ici la graine joue ce rôle.
 */
export function findHouseLot(
  home: HomeType,
  seed: number,
  taken: ReadonlySet<string> = new Set(),
  preferredDistrict?: string
): HouseLot | null {
  const allForHome = districtsForHome(home);
  const preferred = preferredDistrict ? DISTRICTS.find((d) => d.id === preferredDistrict && d.homes.length > 0) : undefined;
  const districts = preferred
    ? [preferred, ...allForHome.filter((d) => d.id !== preferred.id)]
    : allForHome;
  if (districts.length === 0) return null;
  const start = preferred ? 0 : hash32(seed, 1) % districts.length;
  for (let k = 0; k < districts.length; k++) {
    const dist = districts[(start + k) % districts.length];
    const c = project(dist.center.lat, dist.center.lon);
    const ccx = chunkOf(c.x);
    const ccz = chunkOf(c.z);
    const found: HouseLot[] = [];
    const foundAnyHome: HouseLot[] = [];
    for (let ring = 0; ring <= 8 && found.length < 40; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        for (const l of generateChunk(ccx + dx, ccz + dz).houseLots) {
          if (l.district !== dist.id || taken.has(l.id)) continue;
          if (l.homes.includes(home)) found.push(l);
          else if (preferred && dist.id === preferred.id) foundAnyHome.push(l);
        }
      }
    }
    const pool = found.length > 0 ? found : foundAnyHome;
    if (pool.length === 0) continue;
    pool.sort((a, b) => (a.id < b.id ? -1 : 1));
    return pool[hash32(seed, 2) % pool.length];
  }
  return null;
}

/** Position et cap de la voiture garée sur la rue, devant la façade de la parcelle. */
export function carSpotForLot(lot: HouseLot): { x: number; z: number; heading: number } {
  const g = GRIDS[lot.district];
  const street = g ? g.street : 8;
  const dist = lot.toStreet + street / 2;
  // Cap : le long de la rue (perpendiculaire à la façade), vers l'est/le sud selon le signe
  return {
    x: lot.x + lot.front.x * dist,
    z: lot.z + lot.front.z * dist,
    heading: Math.atan2(-lot.front.z, lot.front.x)
  };
}

export { unproject };
