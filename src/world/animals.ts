/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Animaux de la ville : espèces, paramètres, zones et budget. Module PUR (données + choix pondéré), sans Three ni physique.
 * Poules, chèvres, chiens et chats sont des personnages du moteur (petit rayon) ; les pigeons sont purement visuels
 * (au sol puis un envol court, sans collision). Aucune violence : un animal touché par un véhicule est seulement renversé.
 */
import type { SocialClass } from './abidjanGeography';

export type AnimalSpecies = 'poule' | 'chevre' | 'chien' | 'chat';

export interface AnimalSpeciesDef {
  id: AnimalSpecies;
  label: string;
  /** Rayon de collision (m) du personnage du moteur. */
  radius: number;
  walkSpeed: number;
  fleeSpeed: number;
  /** Distance (m) à laquelle l'animal fuit le joueur (× un facteur de timidité tiré par individu). */
  fleeDist: number;
  /** Plage du facteur de timidité : < 1 = plus placide (chiens), jusqu'à 1,1 pour les plus craintifs. */
  skittish: readonly [number, number];
  /** Plage d'échelle de taille par individu. */
  scale: readonly [number, number];
  /** Robes / plumages (couleurs d'instance). */
  coats: readonly number[];
  /** S'assoit au repos (chat, chien) ; sinon picore / broute debout. */
  sitter: boolean;
  /** Tête qui picore (poule). */
  pecker: boolean;
}

export const ANIMAL_SPECIES: Record<AnimalSpecies, AnimalSpeciesDef> = {
  poule: {
    id: 'poule', label: 'Poule', radius: 0.2, walkSpeed: 0.9, fleeSpeed: 3.4, fleeDist: 4.2, skittish: [0.85, 1.1], scale: [0.9, 1.15],
    coats: [0xf5f5f4, 0xb45309, 0x7c2d12, 0x1c1917, 0xd6a35c, 0xe7e5e4], sitter: false, pecker: true,
  },
  chevre: {
    id: 'chevre', label: 'Chèvre', radius: 0.35, walkSpeed: 0.8, fleeSpeed: 3.0, fleeDist: 3.6, skittish: [0.8, 1.1], scale: [0.85, 1.15],
    coats: [0xf5f5f4, 0xd6c7a1, 0x7c4a21, 0x292524, 0xa8a29e], sitter: false, pecker: false,
  },
  chien: {
    id: 'chien', label: 'Chien errant', radius: 0.35, walkSpeed: 1.3, fleeSpeed: 3.6, fleeDist: 4.0, skittish: [0.3, 0.8], scale: [0.85, 1.15],
    coats: [0xc79a5b, 0x7c4a21, 0x1c1917, 0xe7d9b8, 0x8a6a3f], sitter: true, pecker: false,
  },
  chat: {
    id: 'chat', label: 'Chat', radius: 0.2, walkSpeed: 0.9, fleeSpeed: 3.2, fleeDist: 5.5, skittish: [0.9, 1.1], scale: [0.9, 1.1],
    coats: [0x6b7280, 0x1c1917, 0xea8a2f, 0xf5f5f4, 0xa8a29e], sitter: true, pecker: false,
  },
};

export const GROUND_SPECIES: readonly AnimalSpecies[] = ['poule', 'chevre', 'chien', 'chat'];

/** Budget d'animaux physiques (personnages du moteur en plus des PNJ) ; réduit sans accélération graphique. */
export const ANIMAL_BUDGET = 14;
export const ANIMAL_BUDGET_LOW = 6;
/** Mêmes principes que les PNJ : réapparition entre 18 et 78 m, retrait au-delà de 115 m, IA allégée au-delà de 40 m. */
export const ANIMAL_SPAWN_MIN = 18;
export const ANIMAL_SPAWN_MAX = 78;
export const ANIMAL_DESPAWN_DIST = 115;
export const ANIMAL_FAR_AI_DIST = 40;
/** Zones d'influence (m) autour du marché d'Adjamé et du maquis. */
export const ANIMAL_MARKET_RADIUS = 130;
export const ANIMAL_MAQUIS_RADIUS = 90;

/** Pigeons (visuels) : places où ils se posent (ids de `SPECIALS`), effectif, distances d'activation et d'envol. */
export const PIGEON_PLACE_IDS: readonly string[] = ['cathedrale', 'mairie'];
export const PIGEON_COUNT = 10;
export const PIGEON_COUNT_LOW = 5;
export const PIGEON_ACTIVE_DIST = 110;
export const PIGEON_FLUSH_DIST = 5.5;
export const PIGEON_COATS: readonly number[] = [0xb8bcc4, 0xe5e7eb, 0x6b7280, 0xf5f5f4];

/** Contexte de choix d'une espèce à un point d'apparition. */
export interface AnimalZoneCtx {
  districtId: string;
  social: SocialClass;
  nearMarket: boolean;
  nearMaquis: boolean;
}

const BASE_WEIGHTS: Record<SocialClass, Record<AnimalSpecies, number>> = {
  popular: { poule: 3, chevre: 2, chien: 2, chat: 1 },
  informal: { poule: 3, chevre: 2, chien: 2, chat: 1 },
  middle: { poule: 1, chevre: 0.6, chien: 2, chat: 1.5 },
  luxury: { poule: 0.1, chevre: 0, chien: 1, chat: 1 },
  industrial: { poule: 0, chevre: 0, chien: 2, chat: 0.5 },
  nature: { poule: 0, chevre: 0.5, chien: 1, chat: 0 },
};

/** Quartiers « de poules et de chèvres » : renforcés. */
const FARM_DISTRICTS: ReadonlySet<string> = new Set(['adjame', 'yopougon', 'abobo']);

export function speciesWeights(ctx: AnimalZoneCtx): Record<AnimalSpecies, number> {
  const w = { ...BASE_WEIGHTS[ctx.social] };
  if (FARM_DISTRICTS.has(ctx.districtId)) {
    w.poule *= 2;
    w.chevre *= 2;
  }
  if (ctx.nearMarket) {
    w.poule *= 2;
    w.chevre *= 2;
    w.chat *= 2;
  }
  if (ctx.nearMaquis) w.chat *= 3;
  return w;
}

/** Tire une espèce selon les poids de la zone (`u` ∈ [0, 1[) ; `null` si aucune n'est permise. */
export function pickSpecies(ctx: AnimalZoneCtx, u: number): AnimalSpecies | null {
  const w = speciesWeights(ctx);
  let total = 0;
  for (const s of GROUND_SPECIES) total += w[s];
  if (total <= 0) return null;
  let r = u * total;
  for (const s of GROUND_SPECIES) {
    r -= w[s];
    if (r < 0) return s;
  }
  return GROUND_SPECIES[GROUND_SPECIES.length - 1];
}
