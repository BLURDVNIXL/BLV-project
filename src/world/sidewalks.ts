/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Réseau de trottoirs piétons, CALCULÉ à partir de la grille des rues locales de chaque commune (`roads.ts`) :
 * rien n'est stocké. Chaque carrefour (i, j) a 4 nœuds « coins » posés sur le trottoir (à `street/2 + SW_OFFSET`
 * de l'axe des deux rues). Chaque nœud a au plus 4 voisins :
 *   - 2 le long du trottoir, vers le carrefour voisin (même côté de la rue) ;
 *   - 2 par un passage piétons, de l'autre côté de la rue.
 * Un nœud ou une arête n'existe que si le point est dans la commune, hors eau, hors grand axe / pont et hors repère.
 * Les grands axes (`ARTERIALS`) et les ponts ne sont pas traversés : un trottoir qui y mène est une impasse.
 * Module PUR (pas de THREE), déterministe : mêmes entrées, mêmes nœuds.
 */

import { DISTRICTS, districtAt, isWater } from './abidjanGeography';
import { insideSpecial } from './city';
import { Vec2 } from './geo';
import { GRIDS, frameFor, roadAt } from './roads';

/** Distance (m) entre le bord de la chaussée et la ligne de marche (milieu du trottoir de 1,2 m, cf. `terrain.ts`). */
export const SW_OFFSET = 0.85;

export interface SwNode {
  /** Indice du district dans `DISTRICTS`. */
  d: number;
  /** Carrefour (colonne, ligne) dans le repère de la grille du district. */
  i: number;
  j: number;
  /** Coin du carrefour : bit 0 = côté +u, bit 1 = côté +v. */
  c: number;
}

const I_BITS = 512;
const I_OFF = 256;

export function nodeKey(n: SwNode): number {
  return (((n.d * I_BITS + (n.i + I_OFF)) * I_BITS + (n.j + I_OFF)) * 4) + n.c;
}

export function nodeFromKey(key: number): SwNode {
  const c = key % 4;
  let r = (key - c) / 4;
  const jj = r % I_BITS;
  r = (r - jj) / I_BITS;
  const ii = r % I_BITS;
  const d = (r - ii) / I_BITS;
  return { d, i: ii - I_OFF, j: jj - I_OFF, c };
}

export function sameNode(a: SwNode, b: SwNode): boolean {
  return a.d === b.d && a.i === b.i && a.j === b.j && a.c === b.c;
}

/** Position monde du nœud. */
export function nodePos(n: SwNode, out: Vec2 = { x: 0, z: 0 }): Vec2 {
  const f = frameFor(DISTRICTS[n.d].id);
  const a = f.street / 2 + SW_OFFSET;
  const u = n.i * f.pitch + ((n.c & 1) ? a : -a);
  const v = n.j * f.pitch + ((n.c & 2) ? a : -a);
  out.x = f.ox + u * f.c - v * f.s;
  out.z = f.oz + u * f.s + v * f.c;
  return out;
}

const scratch: Vec2 = { x: 0, z: 0 };

function sampleFree(d: number, x: number, z: number): boolean {
  scratch.x = x;
  scratch.z = z;
  if (isWater(scratch)) return false;
  if (insideSpecial(scratch, 0.5)) return false;
  return roadAt(scratch, DISTRICTS[d]) === 'none';
}

const validCache = new Map<number, boolean>();
const neighborCache = new Map<number, SwNode[]>();
const CACHE_MAX = 40000;

function trim(): void {
  if (validCache.size > CACHE_MAX) validCache.clear();
  if (neighborCache.size > CACHE_MAX) neighborCache.clear();
}

/** Le nœud est un vrai trottoir : bonne commune, grille de rues présente, hors eau / axe / repère. */
export function nodeValid(n: SwNode): boolean {
  if (n.d < 0 || n.d >= DISTRICTS.length) return false;
  if (n.i < -I_OFF || n.i >= I_OFF || n.j < -I_OFF || n.j >= I_OFF) return false;
  const k = nodeKey(n);
  const hit = validCache.get(k);
  if (hit !== undefined) return hit;
  const g = GRIDS[DISTRICTS[n.d].id];
  let ok = !!g && g.style !== 'none' && g.street > 0;
  if (ok) {
    const p = nodePos(n);
    ok = districtAt(p).id === DISTRICTS[n.d].id && sampleFree(n.d, p.x, p.z);
  }
  trim();
  validCache.set(k, ok);
  return ok;
}

function alongEdgeFree(a: SwNode, b: SwNode): boolean {
  const pa = nodePos(a);
  const pb = nodePos(b, { x: 0, z: 0 });
  for (const t of [0.25, 0.5, 0.75]) {
    if (!sampleFree(a.d, pa.x + (pb.x - pa.x) * t, pa.z + (pb.z - pa.z) * t)) return false;
  }
  return true;
}

function crossingFree(a: SwNode, b: SwNode): boolean {
  const pa = nodePos(a);
  const pb = nodePos(b, { x: 0, z: 0 });
  scratch.x = (pa.x + pb.x) / 2;
  scratch.z = (pa.z + pb.z) / 2;
  if (isWater(scratch)) return false;
  return roadAt(scratch, DISTRICTS[a.d]) === 'local';
}

/** Voisins valides du nœud (0 à 4), mis en cache. */
export function nodeNeighbors(n: SwNode): SwNode[] {
  const k = nodeKey(n);
  const hit = neighborCache.get(k);
  if (hit) return hit;
  const out: SwNode[] = [];
  if (nodeValid(n)) {
    const sx = (n.c & 1) ? 1 : -1;
    const sy = (n.c & 2) ? 1 : -1;
    // Le long de la rue (axe u) puis (axe v), vers le carrefour voisin, même côté
    const alongU: SwNode = { d: n.d, i: n.i + sx, j: n.j, c: n.c ^ 1 };
    const alongV: SwNode = { d: n.d, i: n.i, j: n.j + sy, c: n.c ^ 2 };
    // Passages piétons : de l'autre côté de la rue, au même carrefour
    const crossU: SwNode = { d: n.d, i: n.i, j: n.j, c: n.c ^ 1 };
    const crossV: SwNode = { d: n.d, i: n.i, j: n.j, c: n.c ^ 2 };
    if (nodeValid(alongU) && alongEdgeFree(n, alongU)) out.push(alongU);
    if (nodeValid(alongV) && alongEdgeFree(n, alongV)) out.push(alongV);
    if (nodeValid(crossU) && crossingFree(n, crossU)) out.push(crossU);
    if (nodeValid(crossV) && crossingFree(n, crossV)) out.push(crossV);
  }
  trim();
  neighborCache.set(k, out);
  return out;
}

/** Indices (i, j) du carrefour le plus proche d'un point, dans le repère de la grille du district. */
function lattice(d: number, x: number, z: number): { i: number; j: number; c: number } {
  const f = frameFor(DISTRICTS[d].id);
  const dx = x - f.ox;
  const dz = z - f.oz;
  const u = dx * f.c + dz * f.s;
  const v = -dx * f.s + dz * f.c;
  const i = Math.round(u / f.pitch);
  const j = Math.round(v / f.pitch);
  return { i, j, c: (u - i * f.pitch >= 0 ? 1 : 0) | (v - j * f.pitch >= 0 ? 2 : 0) };
}

/** Nœud valide le plus proche du point, parmi les coins des carrefours voisins ; `null` si aucun à moins de `maxDist`. */
export function nearestNode(x: number, z: number, maxDist = 40): SwNode | null {
  scratch.x = x;
  scratch.z = z;
  const di = DISTRICTS.indexOf(districtAt(scratch));
  if (di < 0) return null;
  const { i, j } = lattice(di, x, z);
  let best: SwNode | null = null;
  let bestD = maxDist;
  const p: Vec2 = { x: 0, z: 0 };
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      for (let c = 0; c < 4; c++) {
        const n: SwNode = { d: di, i: i + a, j: j + b, c };
        if (!nodeValid(n)) continue;
        nodePos(n, p);
        const dist = Math.hypot(p.x - x, p.z - z);
        if (dist < bestD) { bestD = dist; best = n; }
      }
    }
  }
  return best;
}

/**
 * Nœud valide au hasard dans l'anneau [rMin, rMax] autour de (px, pz). `accept` filtre (ex. « invisible pour la caméra »).
 * `rand` : générateur [0,1) du demandeur (le résultat reste déterministe pour une suite de tirages donnée).
 */
export function randomNodeInRing(
  px: number, pz: number, rMin: number, rMax: number, rand: () => number,
  accept?: (n: SwNode, x: number, z: number) => boolean, tries = 24,
): SwNode | null {
  const p: Vec2 = { x: 0, z: 0 };
  for (let t = 0; t < tries; t++) {
    const ang = rand() * Math.PI * 2;
    const r = rMin + rand() * (rMax - rMin);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;
    p.x = x;
    p.z = z;
    const di = DISTRICTS.indexOf(districtAt(p));
    if (di < 0) continue;
    const { i, j } = lattice(di, x, z);
    const n: SwNode = { d: di, i, j, c: Math.floor(rand() * 4) };
    if (!nodeValid(n)) continue;
    nodePos(n, p);
    const dist = Math.hypot(p.x - px, p.z - pz);
    if (dist < rMin || dist > rMax) continue;
    if (accept && !accept(n, p.x, p.z)) continue;
    return n;
  }
  return null;
}

/**
 * Prochain nœud d'une marche : continue tout droit si possible (un piéton ne revient pas sur ses pas), sinon
 * tourne ; fait demi-tour seulement dans une impasse. `null` si le nœud n'a aucun voisin.
 */
export function pickNextNode(cur: SwNode, prev: SwNode | null, rand: () => number): SwNode | null {
  const nb = nodeNeighbors(cur);
  if (nb.length === 0) return null;
  const forward = prev ? nb.filter((n) => !sameNode(n, prev)) : nb;
  if (forward.length === 0) return prev;
  if (prev && forward.length > 1) {
    // Préfère l'arête de même axe que celle d'où l'on vient (tout droit), 60 % du temps
    const pp = nodePos(prev);
    const pc = nodePos(cur);
    const dxIn = pc.x - pp.x;
    const dzIn = pc.z - pp.z;
    const lIn = Math.hypot(dxIn, dzIn) || 1;
    let best = forward[0];
    let bestDot = -2;
    for (const n of forward) {
      const q = nodePos(n);
      const l = Math.hypot(q.x - pc.x, q.z - pc.z) || 1;
      const dot = ((q.x - pc.x) * dxIn + (q.z - pc.z) * dzIn) / (l * lIn);
      if (dot > bestDot) { bestDot = dot; best = n; }
    }
    if (rand() < 0.6) return best;
  }
  return forward[Math.floor(rand() * forward.length)];
}

/** Vide les caches (tests). */
export function resetSidewalkCaches(): void {
  validCache.clear();
  neighborCache.clear();
}
