/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Variété des piétons de rue : graine du hasard différente à chaque lancement (sinon les mêmes PNJ font les mêmes
 * choix à chaque partie) et caractère de trajet propre à chaque PNJ (certains vont tout droit, d'autres tournent).
 */

/** Graine du hasard des PNJ quand rien n'est précisé (tests, reproductibilité). */
export const DEFAULT_NPC_SEED = 1337;

/** Graine propre à ce lancement du jeu (entier 32 bits non nul). */
export function launchSeed(now: number = Date.now(), rnd: () => number = Math.random): number {
  const mixed = (Math.floor(now) ^ Math.floor(rnd() * 4294967296)) >>> 0;
  return mixed === 0 ? DEFAULT_NPC_SEED : mixed;
}

/** Plage du penchant « tout droit » d'un piéton : de très tournant (0,3) à très rectiligne (0,9). */
export const STRAIGHT_BIAS_MIN = 0.3;
export const STRAIGHT_BIAS_MAX = 0.9;

/** Caractère de trajet d'un PNJ à partir d'un nombre dans [0, 1[. */
export function walkerStraightBias(u: number): number {
  const c = Math.min(0.999999, Math.max(0, u));
  return STRAIGHT_BIAS_MIN + c * (STRAIGHT_BIAS_MAX - STRAIGHT_BIAS_MIN);
}
