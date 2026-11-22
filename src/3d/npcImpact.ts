/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Impact subi par un PNJ (coup du joueur ou véhicule) : gravité, fuite, voisins témoins, événement « incident ».
 * Module PUR (testable sans navigateur) ; `npcSystem.ts` l'applique aux personnages du moteur.
 */

export type ImpactSource = 'player' | 'vehicle';

/** 1 = léger (coup de poing, choc lent), 2 = sérieux, 3 = violent. */
export type ImpactSeverity = 1 | 2 | 3;

/** Ce qu'un incident raconte ; la police (patch 10) et les autres systèmes pourront l'écouter. */
export interface NpcIncident {
  source: ImpactSource;
  /** Position MONDE de la victime. */
  x: number;
  z: number;
  severity: ImpactSeverity;
  /** Temps de simulation des PNJ (s). */
  time: number;
}

/** Durée de la fuite après la chute (s). */
export const FLEE_MIN_SECONDS = 4;
export const FLEE_MAX_SECONDS = 6;
/** Vitesse de course d'un PNJ qui s'enfuit (m/s). */
export const FLEE_SPEED = 4.2;
/** Rayon (m) dans lequel les voisins s'arrêtent pour regarder. */
export const WITNESS_RADIUS = 8;
/** Durée de l'arrêt des témoins (s). */
export const WITNESS_PAUSE_MIN = 1.5;
export const WITNESS_PAUSE_MAX = 3;

/** Gravité d'un choc de véhicule d'après la vitesse (m/s) à laquelle le PNJ est projeté. */
export function vehicleSeverity(speed: number): ImpactSeverity {
  if (speed < 5) return 1;
  if (speed <= 12) return 2;
  return 3;
}

/** Durée de fuite à partir d'un tirage dans [0, 1]. */
export function fleeDuration(u: number): number {
  const c = Math.min(1, Math.max(0, u));
  return FLEE_MIN_SECONDS + c * (FLEE_MAX_SECONDS - FLEE_MIN_SECONDS);
}

/** Durée de l'arrêt d'un témoin à partir d'un tirage dans [0, 1]. */
export function witnessPause(u: number): number {
  const c = Math.min(1, Math.max(0, u));
  return WITNESS_PAUSE_MIN + c * (WITNESS_PAUSE_MAX - WITNESS_PAUSE_MIN);
}

/** Direction unitaire de (x, z) ; `fallback` si le vecteur est nul. */
export function unitDir(x: number, z: number, fallback: { x: number; z: number } = { x: 1, z: 0 }): { x: number; z: number } {
  const l = Math.hypot(x, z);
  return l < 1e-6 ? { x: fallback.x, z: fallback.z } : { x: x / l, z: z / l };
}

export interface Positioned {
  x: number;
  z: number;
}

/** Indices des candidats à moins de `radius` de (x, z). */
export function witnessIndices(x: number, z: number, candidates: readonly Positioned[], radius: number = WITNESS_RADIUS): number[] {
  const out: number[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (Math.hypot(candidates[i].x - x, candidates[i].z - z) <= radius) out.push(i);
  }
  return out;
}
