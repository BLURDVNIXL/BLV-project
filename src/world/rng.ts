/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Aléa déterministe : la ville est la même chez tous les joueurs (aucun téléchargement de carte).
 */

/** Hachage entier 32 bits de plusieurs coordonnées (type murmur3 simplifié). */
export function hash32(...vals: number[]): number {
  let h = 0x9e3779b1;
  for (const v of vals) {
    let k = (v | 0) >>> 0;
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Nombre pseudo-aléatoire ∈ [0, 1) dérivé des coordonnées. */
export const rand01 = (...vals: number[]): number => hash32(...vals) / 4294967296;

/** Générateur séquentiel mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Identifiant numérique stable d'une chaîne. */
export function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
