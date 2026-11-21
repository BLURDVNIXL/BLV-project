/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Logique pure des actions chronométrées et de la jauge universelle (sans DOM ni Three.js).
 */

export type TimedBodyActionKind =
  | 'eat'
  | 'eat_held'
  | 'drink_held'
  | 'toilet'
  | 'loto'
  | 'yannis_academy'
  | 'shower'
  | 'vieux_sage'
  | 'repair_engine'
  | 'black_market'
  | 'sleep';

export type TimedActionKind = TimedBodyActionKind | 'taxi_wait' | 'taxi_ride';

export interface TimedActionSpec {
  kind: TimedActionKind;
  /** Durée par défaut (secondes), entre 5 et 30 s. */
  durationS: number;
  /** Vrai si le joueur est immobilisé (clavier, joystick, saut bloqués) pendant l'action. */
  blocksMovement: boolean;
  labelFr: string;
  labelEn: string;
}

export const TIMED_ACTION_SPECS: Record<TimedActionKind, TimedActionSpec> = {
  eat: {
    kind: 'eat',
    durationS: 5,
    blocksMovement: true,
    labelFr: 'Repas en cours',
    labelEn: 'Eating',
  },
  eat_held: {
    kind: 'eat_held',
    durationS: 2.2,
    blocksMovement: true,
    labelFr: 'Manger',
    labelEn: 'Eating',
  },
  drink_held: {
    kind: 'drink_held',
    durationS: 1.8,
    blocksMovement: true,
    labelFr: 'Boire',
    labelEn: 'Drinking',
  },
  toilet: {
    kind: 'toilet',
    durationS: 5,
    blocksMovement: true,
    labelFr: 'Toilettes',
    labelEn: 'Restroom',
  },
  loto: {
    kind: 'loto',
    durationS: 5,
    blocksMovement: true,
    labelFr: 'Tirage Loto Akwaba',
    labelEn: 'Loto Akwaba',
  },
  yannis_academy: {
    kind: 'yannis_academy',
    durationS: 5,
    blocksMovement: true,
    labelFr: 'Don à l’Académie',
    labelEn: 'Academy Donation',
  },
  shower: {
    kind: 'shower',
    durationS: 8,
    blocksMovement: true,
    labelFr: 'Douche & soin',
    labelEn: 'Shower & Care',
  },
  repair_engine: {
    kind: 'repair_engine',
    durationS: 8,
    blocksMovement: true,
    labelFr: 'Réparation du moteur',
    labelEn: 'Repairing Engine',
  },
  black_market: {
    kind: 'black_market',
    durationS: 8,
    blocksMovement: true,
    labelFr: 'Marché Noir',
    labelEn: 'Black Market',
  },
  vieux_sage: {
    kind: 'vieux_sage',
    durationS: 10,
    blocksMovement: true,
    labelFr: 'Lavage d’Étoile',
    labelEn: 'Star Cleansing',
  },
  sleep: {
    kind: 'sleep',
    durationS: 20,
    blocksMovement: true,
    labelFr: 'Sommeil réparateur',
    labelEn: 'Sleeping',
  },
  taxi_wait: {
    kind: 'taxi_wait',
    durationS: 15,
    blocksMovement: false,
    labelFr: 'Taxi en approche',
    labelEn: 'Taxi Approaching',
  },
  taxi_ride: {
    kind: 'taxi_ride',
    durationS: 20,
    blocksMovement: true,
    labelFr: 'Trajet en taxi',
    labelEn: 'Taxi Ride',
  },
};

const HOTSPOT_TO_TIMED_ACTION: Partial<Record<string, TimedBodyActionKind>> = {
  eat: 'eat',
  toilet: 'toilet',
  loto: 'loto',
  yannis_academy: 'yannis_academy',
  shower: 'shower',
  vieux_sage: 'vieux_sage',
  black_market: 'black_market',
  sleep: 'sleep',
};

/** Associe un type de hotspot à une action chronométrée (null si instantané). */
export function hotspotTypeToTimedAction(hotspotType: string): TimedBodyActionKind | null {
  return HOTSPOT_TO_TIMED_ACTION[hotspotType] ?? null;
}

/** Renvoie vrai si l'action est une action corporelle avec animation dédiée du personnage. */
export function isTimedBodyAction(kind: TimedActionKind | null | undefined): kind is TimedBodyActionKind {
  return Boolean(kind && kind !== 'taxi_wait' && kind !== 'taxi_ride');
}

/** Durée en secondes (5 à 30 s, 1 à 30 s pour manger / boire depuis la main) pour une action chronométrée. */
export function timedActionDurationS(kind: TimedActionKind, customDurationS?: number): number {
  const raw = customDurationS !== undefined && Number.isFinite(customDurationS)
    ? customDurationS
    : TIMED_ACTION_SPECS[kind].durationS;
  // Manger / boire depuis la main : gestes courts (1 s minimum) ; les autres actions durent 5 s au moins.
  const min = kind === 'eat_held' || kind === 'drink_held' ? 1 : 5;
  return Math.min(30, Math.max(min, raw));
}

/** Indique si le joueur est immobilisé pendant l'action. */
export function timedActionBlocksMovement(kind: TimedActionKind | null | undefined): boolean {
  if (!kind) return false;
  return TIMED_ACTION_SPECS[kind].blocksMovement;
}

/** Progression normalisée [0, 1] d'une action chronométrée. */
export function computeTimedActionProgress(startedAtMs: number, durationMs: number, nowMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 1;
  const elapsed = nowMs - startedAtMs;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return Math.min(1, elapsed / durationMs);
}

/** Indique si le délai de l'action est écoulé. */
export function isTimedActionComplete(startedAtMs: number, durationMs: number, nowMs: number): boolean {
  return computeTimedActionProgress(startedAtMs, durationMs, nowMs) >= 1;
}

/** Empêche de lancer une action en double pendant qu'une autre tourne (sauf taxi_ride qui prend le relais de taxi_wait). */
export function canStartTimedAction(activeKind: TimedActionKind | null, requestedKind: TimedActionKind): boolean {
  if (activeKind === null) return true;
  if (activeKind === 'taxi_wait' && requestedKind === 'taxi_ride') return true;
  return false;
}
