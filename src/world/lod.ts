/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * NIVEAUX DE DÉTAIL (LOD) PAR DISTANCE. Module pur (que des nombres) : testable sans navigateur.
 *
 * Principe : un chunk éloigné est reconstruit avec des modèles simplifiés dont l'erreur géométrique reste sous
 * ~0,5 pixel à l'écran. Le critère ne dépend QUE de la distance au joueur (jamais de la direction du regard) :
 * tourner la tête ne change rien, donc rien ne peut « se flouter ». Seul le déplacement du joueur déclenche une
 * reconstruction, faite dans le Worker ; l'ancienne géométrie reste affichée jusqu'à l'échange (un seul coup de
 * pointeau côté GPU, sans image intermédiaire). Chaque joueur calcule ses niveaux sur SON appareil, autour de SA caméra.
 *
 * Taille d'un pixel à la distance D (m), écran 1080 p, champ vertical 56° : 2·D·tan(28°)/1080 ≈ 0,000985·D.
 * On tolère 0,0005·D d'erreur (≈ 0,5 px à 1080 p, ≈ 0,7 px à 1440 p, ≈ 1 px à 4K).
 */

export type LodLevel = 0 | 1 | 2 | 3;
export const MAX_LOD: LodLevel = 3;

/** Erreur géométrique tolérée par mètre de distance (m d'erreur par m de distance). */
export const LOD_ERROR_PER_METER = 0.0005;

/**
 * LOD_NEAR[i] = distance minimale (m) à laquelle le niveau i+1 peut être affiché ; l'erreur du niveau i+1 est calibrée
 * à cette distance, donc plus petite encore en pixels au-delà.
 */
export const LOD_NEAR: readonly [number, number, number] = [48, 112, 208];

/** Un niveau plus fin est redemandé quand le chunk arrive à NEAR + LEAD (le temps que le Worker le reconstruise). */
export const LOD_REFINE_LEAD = 24;
/** Marge d'hystérésis : un niveau plus grossier n'est choisi qu'à NEAR + LEAD + HYST (pas d'aller-retour). */
export const LOD_HYSTERESIS = 16;

/** Échelle maximale appliquée à un modèle du studio dans le jeu (decorMeshes : 0,6 à 1,5). */
export const MAX_MODEL_SCALE = 1.5;

/** Erreur (m) tolérée dans le monde pour un niveau, calibrée à sa distance NEAR. */
export function lodErrorMeters(level: LodLevel): number {
  return level === 0 ? 0 : LOD_ERROR_PER_METER * LOD_NEAR[level - 1];
}

/** Erreur (m) à passer au simplificateur, dans le repère du modèle (avant mise à l'échelle ≤ MAX_MODEL_SCALE). */
export function lodModelError(level: LodLevel): number {
  return lodErrorMeters(level) / MAX_MODEL_SCALE;
}

/** Distance (m) du point (px, pz) au rectangle du chunk (cx, cz) : borne basse de la distance de tout objet du chunk. */
export function chunkDistance(px: number, pz: number, cx: number, cz: number, size = 64): number {
  const x0 = cx * size;
  const z0 = cz * size;
  const dx = Math.max(x0 - px, 0, px - (x0 + size));
  const dz = Math.max(z0 - pz, 0, pz - (z0 + size));
  return Math.hypot(dx, dz);
}

/**
 * Niveau voulu pour un chunk à la distance `dist`. `current` = niveau actuel (null au premier chargement) :
 * il sert à l'hystérésis, pour qu'un chunk ne bascule pas d'un niveau à l'autre en marchant autour d'un seuil.
 */
export function lodForDistance(dist: number, current: LodLevel | null): LodLevel {
  let level = 0;
  for (let i = 0; i < LOD_NEAR.length; i++) {
    const t = LOD_NEAR[i] + LOD_REFINE_LEAD;
    const need = current !== null && current <= i ? t + LOD_HYSTERESIS : t;
    if (dist >= need) level = i + 1;
    else break;
  }
  return level as LodLevel;
}

/**
 * Portée (m) au-delà de laquelle un chunk ne peut plus projeter d'ombre dans la carte d'ombre (boîte de 240 m
 * centrée sur le joueur, étirée le long de la direction du soleil, plus une marge). Aucun effet visible : Three.js
 * n'y dessinerait déjà rien, on lui évite seulement de tester ces chunks.
 */
export const SHADOW_CASTER_RANGE = 280;
