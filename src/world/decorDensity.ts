/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Réglages de densité des décors de rue. UN SEUL endroit à modifier après un test sur téléphone :
 * - ça rame : baisse `streetTrees.chanceBySocial`, `streetTrees.maxPerChunk`, `infill.cellStep` (valeur plus grande = moins dense)
 *   ou mets `extraSlots.chance` / `houseFront.chance` plus bas ;
 * - c'est trop vide : fais l'inverse.
 * Tout est déterministe (hash), donc deux joueurs voient exactement la même rue.
 */

export const DECOR_DENSITY = {
  /** Arbres plantés le long des trottoirs des rues locales (les grands axes gardent leurs lampadaires, sans arbres). */
  streetTrees: {
    enabled: true,
    /** Distance entre deux emplacements candidats le long d'un trottoir (m). */
    spacingM: 15,
    /** Décalage du tronc depuis le bord de la rue vers l'intérieur du bloc (m). */
    sidewalkOffsetM: 1.5,
    /** Probabilité qu'un emplacement candidat reçoive un arbre, selon le type de quartier. */
    chanceBySocial: { luxury: 0.9, middle: 0.75, popular: 0.55, informal: 0.35 },
    /** Hauteur d'arbre tirée entre ces deux bornes (m) : détermine jeune / adulte et l'échelle. */
    minHeight: 5,
    maxHeight: 9,
    /** Distance minimale entre deux arbres (m). */
    minGapM: 6,
    /** Plafond d'arbres de rue ajoutés par chunk (garde-fou de performance). */
    maxPerChunk: 16,
  },
  /** Remplissage organique des espaces vides inter-bâtiments, îlots verts et abords. */
  infill: {
    /** Pas de la grille d'échantillonnage (m) : plus petit = plus dense (avant : 9). */
    cellStep: 7,
    /** Part des cellules volontairement laissées vides (0 à 1) pour que ça respire. */
    skipChance: 0.12,
    /** Distances minimales aux autres décors (m) : props, solides, buissons. */
    gapProps: 2.4,
    gapSolids: 2.1,
    gapShrubs: 1.9,
  },
  /** Emplacements supplémentaires de verdure/mobilier sur les trottoirs de chaque bloc. */
  extraSlots: {
    /** Positions le long du trottoir (fraction de la longueur de rue). */
    fractions: [0.13, 0.9],
    /** Probabilité d'occuper un emplacement libre. */
    chance: 0.7,
  },
  /** Décors devant les maisons (de part et d'autre de l'entrée, côté rue). */
  houseFront: {
    /** Probabilité par côté de l'entrée. */
    chance: 0.75,
    /** Écart latéral par rapport à l'axe de la parcelle, en fraction de la largeur de parcelle. */
    lateralFraction: 0.3,
  },
} as const;

/**
 * Fractions de la longueur de rue déjà occupées par les micro-étals, kiosques, poteaux, bancs, voitures, etc.,
 * pour chacun des 4 côtés d'un bloc (dans l'ordre : bord nord, bord sud, bord ouest, bord est).
 * Les arbres de rue évitent ces zones pour ne pas supprimer les vendeuses et le mobilier existants.
 */
export const RESERVED_SIDEWALK_FRACTIONS: readonly (readonly number[])[] = [
  [0.36],
  [0.54, 0.62, 0.72],
  [0.25, 0.62, 0.75],
  [],
];
export const RESERVED_SIDEWALK_HALF_WIDTH_M = 3;
