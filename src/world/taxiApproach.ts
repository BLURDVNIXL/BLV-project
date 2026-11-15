/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Arrivée du taxi (étape B2) : trajet d'un woro-woro qui apparaît à environ 120 m sur le grand axe
 * le plus proche du joueur, roule sur le réseau des grands axes et s'arrête au point de route le plus proche de lui.
 * Module pur (sans Three.js), testé dans taxiApproach.test.ts.
 */

import { Vec2 } from './geo';
import { findRoute, nearestRoadPoint } from './routing';

/** Distance de départ du taxi (unités du monde de jeu, 1 unité = 1 m sur les rues). */
export const TAXI_SPAWN_DISTANCE = 120;
/** Le taxi n'apparaît jamais plus près que cela du point d'arrêt (sinon on ne le verrait pas arriver). */
export const TAXI_MIN_PATH = 50;

export interface TaxiPath {
  /** Points du trajet, du départ du taxi à son arrêt. */
  points: Vec2[];
  /** Longueur du trajet. */
  length: number;
  /** Point d'arrêt : le point des grands axes le plus proche du joueur. */
  stop: Vec2;
}

export function pathLength(points: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return total;
}

/** Trajet sur les grands axes d'un point de route `from` jusqu'à `stop` ; null s'il n'y a pas de chemin. */
export function taxiRouteTo(from: Vec2, stop: Vec2): TaxiPath | null {
  const route = findRoute(from, stop);
  if (!route || route.points.length < 2) return null;
  return { points: route.points, length: pathLength(route.points), stop: { x: stop.x, z: stop.z } };
}

/**
 * Choisit le départ du taxi : parmi 12 directions autour du point d'arrêt, le point de route dont le trajet
 * jusqu'à l'arrêt est le plus proche de `spawnDistance` (au moins TAXI_MIN_PATH). Null si aucun chemin n'existe.
 */
export function planTaxiApproach(player: Vec2, spawnDistance: number = TAXI_SPAWN_DISTANCE): TaxiPath | null {
  const stop = nearestRoadPoint(player).at;
  let best: TaxiPath | null = null;
  let bestScore = Infinity;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const cand = nearestRoadPoint({ x: stop.x + Math.sin(a) * spawnDistance, z: stop.z + Math.cos(a) * spawnDistance }).at;
    const path = taxiRouteTo(cand, stop);
    if (!path || path.length < TAXI_MIN_PATH) continue;
    const score = Math.abs(path.length - spawnDistance);
    if (score < bestScore) {
      best = path;
      bestScore = score;
    }
  }
  return best;
}

/** Position et cap (même convention que les véhicules : avant = (sin cap, cos cap)) à la distance `s` du départ. */
export function pointAlongPath(points: Vec2[], s: number): { x: number; z: number; heading: number } {
  if (points.length === 0) return { x: 0, z: 0, heading: 0 };
  let remaining = Math.max(0, s);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 1e-6) continue;
    if (remaining <= seg || i === points.length - 1) {
      const t = Math.min(1, remaining / seg);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    remaining -= seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, z: last.z, heading: 0 };
}

/** Avance du taxi : de 0 à 1 selon le temps, freinage progressif à l'approche de l'arrêt. */
export function taxiProgress(elapsedS: number, arriveInS: number): number {
  if (!(arriveInS > 0)) return 1;
  const p = Math.min(1, Math.max(0, elapsedS / arriveInS));
  return p * (2 - p);
}

/** Durée de la cinématique du trajet (étape B3) : 15 s jusqu'à 1 km, 30 s à partir de 10 km, linéaire entre les deux. */
export const TAXI_RIDE_MIN_S = 15;
export const TAXI_RIDE_MAX_S = 30;
export function taxiRideSeconds(distanceM: number): number {
  const d = Number.isFinite(distanceM) ? distanceM : 10000;
  const k = Math.min(1, Math.max(0, (d - 1000) / 9000));
  return Math.round((TAXI_RIDE_MIN_S + k * (TAXI_RIDE_MAX_S - TAXI_RIDE_MIN_S)) * 10) / 10;
}

/** Avance de la cinématique : démarrage et arrêt progressifs (0 → 1). */
export function taxiRideProgress(elapsedS: number, totalS: number): number {
  if (!(totalS > 0)) return 1;
  const p = Math.min(1, Math.max(0, elapsedS / totalS));
  return p * p * (3 - 2 * p);
}
