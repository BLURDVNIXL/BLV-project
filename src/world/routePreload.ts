/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Préchargement de la route d'un trajet (taxi) : liste ordonnée des chunks que le trajet traverse, avec la distance
 * (m le long du trajet) à laquelle chacun devient nécessaire. Module pur (sans Three.js), testé dans routePreload.test.ts.
 *
 * Le taxi roule bien plus vite que le monde ne se construit (jusqu'à plusieurs centaines de m/s en cinématique) :
 * on charge donc la route pendant l'attente, et la cinématique ne dépasse jamais ce qui est chargé.
 */

import { CHUNK } from './city';
import type { Vec2 } from './geo';

export interface CorridorChunk {
  cx: number;
  cz: number;
  /** Distance (m) le long du trajet à partir de laquelle ce chunk doit être chargé. */
  d: number;
}

/** Pas d'échantillonnage du tracé (m) : inférieur à un chunk, pour ne sauter aucun chunk traversé. */
export const CORRIDOR_STEP = 16;
/** Rayon (en chunks) de la zone d'arrivée chargée autour de la destination. */
export const CORRIDOR_DEST_RINGS = 1;
/** Distance de sécurité (m) : le taxi s'arrête avant de rouler sur un chunk non chargé. */
export const CORRIDOR_MARGIN = CHUNK;

const chunkIdx = (v: number): number => Math.floor(v / CHUNK);

/**
 * Chunks traversés par `points` (échantillonnés tous les `step` m), triés par distance croissante,
 * plus la zone d'arrivée (distance = longueur du trajet). Chaque chunk n'apparaît qu'une fois, à sa première distance.
 */
export function corridorChunks(points: Vec2[], destRings: number = CORRIDOR_DEST_RINGS, step: number = CORRIDOR_STEP): CorridorChunk[] {
  const out: CorridorChunk[] = [];
  if (points.length === 0) return out;
  const seen = new Set<string>();
  const add = (cx: number, cz: number, d: number): void => {
    const k = `${cx},${cz}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ cx, cz, d });
  };
  let travelled = 0;
  add(chunkIdx(points[0].x), chunkIdx(points[0].z), 0);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 1e-6) continue;
    const n = Math.max(1, Math.ceil(seg / step));
    for (let j = 1; j <= n; j++) {
      const t = j / n;
      add(chunkIdx(a.x + (b.x - a.x) * t), chunkIdx(a.z + (b.z - a.z) * t), travelled + seg * t);
    }
    travelled += seg;
  }
  const last = points[points.length - 1];
  const lcx = chunkIdx(last.x);
  const lcz = chunkIdx(last.z);
  for (let dx = -destRings; dx <= destRings; dx++) for (let dz = -destRings; dz <= destRings; dz++) add(lcx + dx, lcz + dz, travelled);
  return out;
}

/**
 * Distance maximale (m) jusqu'où le taxi peut rouler : juste avant le premier chunk nécessaire non chargé.
 * `Infinity` si tout est chargé (rien ne le retient). `isLoaded(cx, cz)` dit si un chunk est déjà à l'écran.
 */
export function readyDistance(
  chunks: readonly CorridorChunk[],
  isLoaded: (cx: number, cz: number) => boolean,
  margin: number = CORRIDOR_MARGIN
): number {
  let limit = Infinity;
  for (const c of chunks) if (c.d - margin < limit && !isLoaded(c.cx, c.cz)) limit = c.d - margin;
  return Math.max(0, limit);
}
