/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * BUDGETS DE LA VIE DES RUES : un seul endroit pour régler le nombre de PNJ et d'animaux, les distances d'affichage,
 * la fréquence d'IA et les capacités des `InstancedMesh`. Module PUR (nombres seulement).
 *
 * Le coût réel est le rendu : chaque personnage actif = ~30 meshes ; les animaux = 1 `InstancedMesh` par espèce.
 * À régler d'après le compteur `?blvdebug=1` (appels de dessin, triangles, PNJ et animaux actifs) mesuré sur téléphone.
 * Valeurs d'origine conservées (aucun retour chiffré du créateur au moment de la centralisation).
 */

// ───────────── PNJ (`NpcSystem`) ─────────────

/** PNJ mobiles actifs au plus (piétons + clients du marché), personnages du moteur physique (max 128 au total). */
export const NPC_POOL_SIZE = 44;
/** Idem sans accélération graphique (rendu logiciel). */
export const NPC_POOL_SIZE_LOW = 16;
/**
 * Capacité de la foule instanciée : PNJ mobiles + vendeurs du marché + PNJ immobiles d'une salle (≤ 14), avec de la marge.
 * (Un `NpcCrowd` coûte de la mémoire proportionnelle à cette capacité ; l'abaisser si le budget mémoire presse.)
 */
export const NPC_CROWD_CAPACITY = 80;
/** Au-delà de cette distance (m) au joueur, un piéton est retiré. */
export const NPC_DESPAWN_DIST = 72;
/** Foule du marché : visible en deçà de cette distance (m). */
export const NPC_MARKET_DIST = 135;
/** Zone de réapparition (m) autour du joueur, de préférence hors du champ de la caméra. */
export const NPC_SPAWN_MIN = 10;
export const NPC_SPAWN_MAX = 48;
/** Au-delà (m), l'IA ne tourne qu'une image sur deux (la physique avance à chaque image). */
export const NPC_FAR_AI_DIST = 40;

// ───────────── Animaux (`AnimalSystem`) ─────────────

/** Animaux physiques (poules, chèvres, chiens, chats) : personnages du moteur EN PLUS des PNJ. Capacité de chaque `InstancedMesh`. */
export const ANIMAL_BUDGET = 14;
export const ANIMAL_BUDGET_LOW = 6;
/** Pigeons visuels (sans collision). */
export const PIGEON_COUNT = 14;
export const PIGEON_COUNT_LOW = 6;
/** Mêmes principes que les PNJ : réapparition 18–78 m, retrait au-delà de 115 m, IA allégée au-delà de 40 m. */
export const ANIMAL_SPAWN_MIN = 10;
export const ANIMAL_SPAWN_MAX = 46;
export const ANIMAL_DESPAWN_DIST = 75;
export const ANIMAL_FAR_AI_DIST = 40;
/** Pigeons : une place est peuplée quand le joueur est à moins de cette distance (m) ; envol sous 5,5 m. */
export const PIGEON_ACTIVE_DIST = 110;
export const PIGEON_FLUSH_DIST = 5.5;
