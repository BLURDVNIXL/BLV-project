/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Choix du modèle d'un acteur de rue : on évite les doublons dans le quartier. La graine du PNJ donne le point de
 * départ (le même PNJ retombe sur le même modèle quand rien n'a changé) ; on prend ensuite, à partir de là, le
 * premier modèle le moins utilisé parmi les acteurs actifs.
 */

/**
 * @param files modèles possibles (déjà filtrés par quartier et moment), non vide
 * @param seed identité stable du PNJ
 * @param usage nombre d'acteurs de rue actifs par fichier (absent = 0)
 */
export function pickStreetModel(files: readonly string[], seed: number, usage: ReadonlyMap<string, number>): string {
  const n = files.length;
  const start = Math.abs(Math.floor(seed)) % n;
  let best = files[start];
  let bestUse = usage.get(best) ?? 0;
  for (let i = 1; i < n && bestUse > 0; i++) {
    const f = files[(start + i) % n];
    const u = usage.get(f) ?? 0;
    if (u < bestUse) { best = f; bestUse = u; }
  }
  return best;
}
