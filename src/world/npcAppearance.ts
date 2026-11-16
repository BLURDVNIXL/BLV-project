/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Pack de composants PNJ : tire une apparence en mélangeant des composants au hasard.
 * Module PUR et déterministe (ni Three.js, ni rendu, ni `Math.random()`) : même graine + même contexte = même PNJ.
 * Le rendu instancié (étape 4) lira ces champs : un id de composant et une couleur par pièce.
 * Personnages entièrement fictifs : aucune ressemblance voulue avec une personne réelle.
 */

import type { SapeOutfitId } from '../types/game';
import { DISTRICTS, type SocialClass } from './abidjanGeography';

// ───────────── Types publics ─────────────

export type AgeGroup = 'enfant' | 'ado' | 'adulte' | 'aine';

export type NpcRole =
  | 'passant'
  | 'vendeur'
  | 'client'
  | 'eleve'
  | 'enseignant'
  | 'soignant'
  | 'agent_mairie'
  | 'serveur_maquis';

export type HairStyleId = 'rase' | 'court' | 'afro' | 'tresses' | 'foulard' | 'casquette' | 'bonnet' | 'chauve';
export type TopId =
  | 'tshirt' | 'polo' | 'chemise' | 'chemise_bazin' | 'boubou_wax' | 'haut_wax' | 'debardeur'
  | 'pull' | 'veste_costume' | 'maillot_foot' | 'blouse' | 'tablier' | 'uniforme_haut';
export type BottomId =
  | 'jean' | 'pantalon_toile' | 'pantalon_costume' | 'short' | 'jupe' | 'pagne_wax'
  | 'pantalon_bazin' | 'jogging' | 'uniforme_bas' | 'pantalon_blanc';
export type ShoeId = 'sandales' | 'baskets' | 'mocassins' | 'tongs' | 'claquettes';
export type AccessoryId = 'lunettes' | 'sac' | 'panier_tete' | 'chapeau' | 'telephone' | 'canne';

/** Pièce de vêtement : id de forme, couleur de base et motif éventuel (id `wax_1`…`wax_6` ou `bazin_riche`, sans texture ici). */
export interface NpcGarment<Id extends string> {
  id: Id;
  hex: number;
  patternId: string | null;
}

export interface NpcAppearance {
  role: NpcRole;
  ageGroup: AgeGroup;
  /** Échelle de taille (1 = taille de base du modèle). */
  heightScale: number;
  /** Corpulence : largeur du torse, des bras et du bassin (0,85 à 1,25). */
  build: { torso: number; arms: number; hips: number };
  /** Rayon de collision du cercle physique (plus petit pour un enfant). */
  collisionRadius: number;
  skinHex: number;
  hair: HairStyleId;
  hairHex: number;
  /** Couleur du foulard / de la casquette / du bonnet, sinon `null`. */
  headwearHex: number | null;
  top: NpcGarment<TopId>;
  bottom: NpcGarment<BottomId>;
  shoes: { id: ShoeId; hex: number };
  /** 0 à 2 accessoires, sans doublon. */
  accessories: AccessoryId[];
  /** Tenue existante la plus proche (`SapeOutfitId`), pour le modèle actuel de `NpcSystem`. */
  legacyOutfit: SapeOutfitId;
}

export interface NpcContext {
  role: NpcRole;
  /** Identifiant de quartier (`DISTRICTS[].id`, ex. `adjame`, `plateau`) ; inconnu ou absent = classe `middle`. */
  districtId?: string;
  /** Âge souhaité ; ignoré s'il est incompatible avec le rôle (un élève n'est jamais adulte). */
  ageGroup?: AgeGroup;
}

// ───────────── Constantes ─────────────

/** Gamme actuelle de `npcSystem.ts` (5 teintes) élargie à 8. */
export const NPC_SKIN_TONES: readonly number[] = [0x4a2c1d, 0x6b422a, 0x3b2316, 0x7c4f33, 0x5c3824, 0x2b170d, 0x8a5a3c, 0x9a6a47];
export const NPC_HAIR_STYLES: readonly HairStyleId[] = ['rase', 'court', 'afro', 'tresses', 'foulard', 'casquette', 'bonnet', 'chauve'];
export const NPC_AGE_GROUPS: readonly AgeGroup[] = ['enfant', 'ado', 'adulte', 'aine'];
export const NPC_ROLES: readonly NpcRole[] = ['passant', 'vendeur', 'client', 'eleve', 'enseignant', 'soignant', 'agent_mairie', 'serveur_maquis'];
export const NPC_ACCESSORIES: readonly AccessoryId[] = ['lunettes', 'sac', 'panier_tete', 'chapeau', 'telephone', 'canne'];
export const WAX_PATTERN_IDS: readonly string[] = ['wax_1', 'wax_2', 'wax_3', 'wax_4', 'wax_5', 'wax_6'];
export const BAZIN_PATTERN_ID = 'bazin_riche';

export const HEIGHT_RANGE: Record<AgeGroup, readonly [number, number]> = {
  enfant: [0.66, 0.74],
  ado: [0.84, 0.96],
  adulte: [0.92, 1.1],
  aine: [0.9, 1.04],
};
export const BUILD_RANGE: readonly [number, number] = [0.85, 1.25];
export const COLLISION_RADIUS: Record<AgeGroup, number> = { enfant: 0.25, ado: 0.3, adulte: 0.35, aine: 0.35 };

const HAIR_COLORS = {
  noir: [0x0b0b0b, 0x16100c, 0x24170f, 0x33221a],
  gris: [0x9ca3af, 0xd1d5db, 0xe5e7eb],
  teinte: [0x78350f, 0x92400e],
};
const HEADWEAR_COLORS = [0xd97706, 0x0e7490, 0xbe123c, 0x15803d, 0x7e22ce, 0xf8fafc, 0x111827, 0x1e3a8a];

// ───────────── PRNG local (mulberry32) ─────────────

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (Math.floor(seed) >>> 0) ^ 0x9e3779b9;
    this.next(); this.next(); // amorçage : graines proches → suites bien séparées
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number { return a + (b - a) * this.next(); }
  int(n: number): number { return Math.min(n - 1, Math.floor(this.next() * n)); }
  pick<T>(list: readonly T[]): T { return list[this.int(list.length)]; }
  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return items[this.int(items.length)];
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}

// ───────────── Composants ─────────────

type Weights = Record<SocialClass, number>;
/** Poids par classe : luxe, moyen, populaire, informel ; industriel suit « populaire », nature suit « moyen ». */
const W = (lux: number, mid: number, pop: number, inf: number): Weights => ({
  luxury: lux, middle: mid, popular: pop, informal: inf, industrial: pop, nature: mid,
});

interface TopDef { id: TopId; weights: Weights; colors: readonly number[]; pattern?: 'wax' | 'bazin'; work?: boolean; noKids?: boolean }
interface BottomDef { id: BottomId; weights: Weights; colors: readonly number[]; pattern?: 'wax' | 'bazin'; work?: boolean; noKids?: boolean }
interface ShoeDef { id: ShoeId; weights: Weights; colors: readonly number[] }

const WAX_COLORS = [0xd97706, 0x0e7490, 0xbe123c, 0x15803d, 0x7e22ce, 0x1d4ed8];

const TOPS: readonly TopDef[] = [
  { id: 'tshirt', weights: W(2, 5, 6, 6), colors: [0x2563eb, 0xdc2626, 0x16a34a, 0xf8fafc, 0x111827, 0xf59e0b, 0x7c3aed] },
  { id: 'polo', weights: W(5, 4, 3, 2), colors: [0x0f766e, 0x1d4ed8, 0xf8fafc, 0x991b1b, 0x374151] },
  { id: 'chemise', weights: W(5, 4, 3, 2), colors: [0xe2e8f0, 0x93c5fd, 0xfef3c7, 0x9ca3af, 0x1e3a8a] },
  { id: 'chemise_bazin', weights: W(3, 4, 4, 2), colors: [0xfef3c7, 0xe2e8f0, 0xbfdbfe, 0xfde68a], pattern: 'bazin' },
  { id: 'boubou_wax', weights: W(2, 4, 6, 3), colors: WAX_COLORS, pattern: 'wax' },
  { id: 'haut_wax', weights: W(3, 5, 6, 3), colors: WAX_COLORS, pattern: 'wax' },
  { id: 'debardeur', weights: W(1, 3, 4, 5), colors: [0xf8fafc, 0x111827, 0xdb2777, 0xeab308] },
  { id: 'pull', weights: W(3, 3, 2, 1), colors: [0x475569, 0x7f1d1d, 0x1e3a8a, 0x14532d], noKids: false },
  { id: 'veste_costume', weights: W(8, 2, 1, 0.2), colors: [0x0f172a, 0x1f2937, 0x374151, 0x1e3a8a], noKids: true },
  { id: 'maillot_foot', weights: W(1, 3, 4, 4), colors: [0xf97316, 0xf8fafc, 0x16a34a, 0xfacc15] },
  { id: 'blouse', weights: W(0, 0, 0, 0), colors: [0xf8fafc], work: true, noKids: true },
  { id: 'tablier', weights: W(0, 0, 0, 0), colors: [0xf59e0b, 0xf8fafc, 0x16a34a, 0xb91c1c], work: true, noKids: true },
  { id: 'uniforme_haut', weights: W(0, 0, 0, 0), colors: [0xe7d9b0, 0xbfdbfe, 0xf8fafc], work: true },
];

const BOTTOMS: readonly BottomDef[] = [
  { id: 'jean', weights: W(3, 6, 5, 4), colors: [0x1e3a8a, 0x1e293b, 0x334155, 0x0f172a] },
  { id: 'pantalon_toile', weights: W(5, 4, 3, 2), colors: [0xd6c7a1, 0x6b7280, 0x1f2937, 0x78716c] },
  { id: 'pantalon_costume', weights: W(8, 2, 1, 0.2), colors: [0x0f172a, 0x1f2937, 0x374151], noKids: true },
  { id: 'short', weights: W(1, 3, 4, 5), colors: [0x1e293b, 0xd6c7a1, 0x1e3a8a, 0x15803d] },
  { id: 'jupe', weights: W(3, 4, 4, 3), colors: [0x111827, 0xbe123c, 0x1d4ed8, 0x7c3aed] },
  { id: 'pagne_wax', weights: W(1, 3, 6, 4), colors: WAX_COLORS, pattern: 'wax' },
  { id: 'pantalon_bazin', weights: W(2, 3, 4, 2), colors: [0xfef3c7, 0xe2e8f0, 0xbfdbfe], pattern: 'bazin' },
  { id: 'jogging', weights: W(1, 3, 4, 5), colors: [0x111827, 0x475569, 0x1e3a8a] },
  { id: 'uniforme_bas', weights: W(0, 0, 0, 0), colors: [0x1e3a8a, 0x44403c, 0x1f2937], work: true },
  { id: 'pantalon_blanc', weights: W(0, 0, 0, 0), colors: [0xf8fafc], work: true, noKids: true },
];

const SHOES: readonly ShoeDef[] = [
  { id: 'sandales', weights: W(2, 4, 5, 4), colors: [0x78350f, 0x111827, 0xd6c7a1] },
  { id: 'baskets', weights: W(4, 6, 5, 4), colors: [0xf8fafc, 0x111827, 0xdc2626, 0x2563eb] },
  { id: 'mocassins', weights: W(7, 3, 1, 0.3), colors: [0x111827, 0x451a03, 0x78350f] },
  { id: 'tongs', weights: W(0.5, 2, 4, 6), colors: [0x2563eb, 0xf59e0b, 0x16a34a, 0x111827] },
  { id: 'claquettes', weights: W(1, 3, 4, 3), colors: [0x111827, 0xf8fafc, 0x7c3aed] },
];

/** Coiffures : poids [luxe, moyen, populaire, informel]. */
const HAIR_WEIGHTS: Record<HairStyleId, Weights> = {
  rase: W(4, 4, 4, 4),
  court: W(6, 5, 4, 4),
  afro: W(3, 4, 4, 3),
  tresses: W(3, 4, 5, 4),
  foulard: W(2, 3, 5, 4),
  casquette: W(1, 3, 4, 5),
  bonnet: W(0.5, 1, 1.5, 2),
  chauve: W(1.5, 1.5, 1.5, 1.5),
};

// ───────────── Contraintes par rôle ─────────────

interface RoleRule {
  ages: readonly AgeGroup[];
  /** Pondération d'âge par défaut. */
  ageWeights: Record<AgeGroup, number>;
  top?: readonly TopId[];
  bottom?: readonly BottomId[];
  shoes?: readonly ShoeId[];
  /** Coiffures interdites (tenue incompatible). */
  noHair?: readonly HairStyleId[];
  accessories: readonly AccessoryId[];
}

const ALL_AGES: readonly AgeGroup[] = NPC_AGE_GROUPS;

export const ROLE_RULES: Record<NpcRole, RoleRule> = {
  passant: { ages: ALL_AGES, ageWeights: { enfant: 12, ado: 15, adulte: 58, aine: 15 }, accessories: ['lunettes', 'sac', 'panier_tete', 'chapeau', 'telephone', 'canne'] },
  vendeur: { ages: ['adulte', 'aine'], ageWeights: { enfant: 0, ado: 0, adulte: 80, aine: 20 }, top: ['tablier'], bottom: ['jean', 'pantalon_toile', 'jupe', 'pagne_wax', 'short'], shoes: ['sandales', 'tongs', 'baskets', 'claquettes'], accessories: ['panier_tete', 'telephone', 'lunettes'] },
  client: { ages: ['ado', 'adulte', 'aine'], ageWeights: { enfant: 0, ado: 12, adulte: 68, aine: 20 }, accessories: ['lunettes', 'sac', 'panier_tete', 'chapeau', 'telephone', 'canne'] },
  eleve: { ages: ['enfant', 'ado'], ageWeights: { enfant: 50, ado: 50, adulte: 0, aine: 0 }, top: ['uniforme_haut'], bottom: ['uniforme_bas'], shoes: ['baskets', 'sandales'], noHair: ['bonnet', 'chauve'], accessories: ['sac'] },
  enseignant: { ages: ['adulte', 'aine'], ageWeights: { enfant: 0, ado: 0, adulte: 80, aine: 20 }, top: ['chemise', 'polo', 'chemise_bazin'], bottom: ['pantalon_toile', 'jupe', 'pantalon_bazin'], shoes: ['mocassins', 'baskets', 'sandales'], noHair: ['bonnet', 'casquette'], accessories: ['lunettes', 'sac'] },
  soignant: { ages: ['adulte'], ageWeights: { enfant: 0, ado: 0, adulte: 100, aine: 0 }, top: ['blouse'], bottom: ['pantalon_blanc'], shoes: ['baskets', 'mocassins'], noHair: ['bonnet'], accessories: ['lunettes', 'telephone'] },
  agent_mairie: { ages: ['adulte', 'aine'], ageWeights: { enfant: 0, ado: 0, adulte: 85, aine: 15 }, top: ['veste_costume'], bottom: ['pantalon_costume'], shoes: ['mocassins'], noHair: ['bonnet', 'casquette'], accessories: ['lunettes', 'sac'] },
  serveur_maquis: { ages: ['adulte'], ageWeights: { enfant: 0, ado: 0, adulte: 100, aine: 0 }, top: ['tablier'], bottom: ['jean', 'pantalon_toile'], shoes: ['baskets'], accessories: ['telephone'] },
};

// ───────────── Génération ─────────────

/** Classe sociale d'un quartier (`DISTRICTS[].id`) ; `middle` si inconnu. */
export function socialOf(districtId?: string): SocialClass {
  return DISTRICTS.find((d) => d.id === districtId)?.social ?? 'middle';
}

function pickGarment<Def extends { id: string; weights: Weights; colors: readonly number[]; pattern?: 'wax' | 'bazin'; work?: boolean; noKids?: boolean }>(
  rng: Rng, defs: readonly Def[], allowed: readonly string[] | undefined, social: SocialClass, age: AgeGroup
): { def: Def; hex: number; patternId: string | null } {
  const isKid = age === 'enfant' || age === 'ado';
  let pool = allowed ? defs.filter((d) => allowed.includes(d.id)) : defs.filter((d) => !d.work);
  const noKid = pool.filter((d) => !(isKid && d.noKids && !allowed));
  if (noKid.length > 0) pool = noKid;
  // Pièce imposée par le rôle : poids égaux (les poids « travail » sont nuls)
  const def = rng.weighted(pool, (d) => (allowed ? 1 : d.weights[social]));
  const hex = rng.pick(def.colors);
  const patternId = def.pattern === 'wax' ? rng.pick(WAX_PATTERN_IDS) : def.pattern === 'bazin' ? BAZIN_PATTERN_ID : null;
  return { def, hex, patternId };
}

function legacyOutfitOf(top: TopId): SapeOutfitId {
  if (top === 'veste_costume') return 'costume_italien';
  if (top === 'boubou_wax' || top === 'haut_wax' || top === 'chemise_bazin') return 'wax_bazin';
  if (top === 'maillot_foot') return 'madrid_25';
  return 'standard';
}

/** Tire une apparence : même `seed` et même `ctx` = même résultat, toujours. */
export function generateAppearance(seed: number, ctx: NpcContext): NpcAppearance {
  const rng = new Rng(seed);
  const rule = ROLE_RULES[ctx.role];
  const social = socialOf(ctx.districtId);

  // Âge : celui demandé s'il convient au rôle, sinon tirage pondéré parmi les âges du rôle
  const ageGroup: AgeGroup = ctx.ageGroup && rule.ages.includes(ctx.ageGroup)
    ? ctx.ageGroup
    : rng.weighted(rule.ages, (a) => rule.ageWeights[a]);

  const [h0, h1] = HEIGHT_RANGE[ageGroup];
  const heightScale = rng.range(h0, h1);
  const [b0, b1] = BUILD_RANGE;
  const build = { torso: rng.range(b0, b1), arms: rng.range(b0, b1), hips: rng.range(b0, b1) };

  const skinHex = rng.pick(NPC_SKIN_TONES);

  // Coiffure et couleur
  const hairPool = NPC_HAIR_STYLES.filter((s) => !rule.noHair?.includes(s) && !(ageGroup === 'enfant' && s === 'chauve'));
  const hair = rng.weighted(hairPool, (s) => {
    let w = HAIR_WEIGHTS[s][social];
    if (ageGroup === 'aine') w *= s === 'chauve' ? 3 : s === 'tresses' ? 0.2 : s === 'afro' ? 0.5 : 1;
    if (ageGroup === 'enfant' && (s === 'casquette' || s === 'bonnet')) w *= 0.3;
    return w;
  });
  const grey = ageGroup === 'aine' ? 0.7 : 0;
  const hairHex = rng.next() < grey ? rng.pick(HAIR_COLORS.gris) : rng.next() < 0.06 ? rng.pick(HAIR_COLORS.teinte) : rng.pick(HAIR_COLORS.noir);
  const covered = hair === 'foulard' || hair === 'casquette' || hair === 'bonnet';
  const headwearHex = covered ? rng.pick(HEADWEAR_COLORS) : null;

  // Vêtements
  const topPick = pickGarment(rng, TOPS, rule.top, social, ageGroup);
  const bottomPick = pickGarment(rng, BOTTOMS, rule.bottom, social, ageGroup);
  const shoePool = rule.shoes ? SHOES.filter((s) => rule.shoes?.includes(s.id)) : SHOES;
  const shoeDef = rng.weighted(shoePool, (s) => (rule.shoes ? 1 : s.weights[social]));
  const shoes = { id: shoeDef.id, hex: rng.pick(shoeDef.colors) };

  // Accessoires : 0 à 2, sans doublon, compatibles avec l'âge et la coiffure
  const count = rng.weighted([0, 1, 2], (n) => (n === 0 ? 45 : n === 1 ? 40 : 15));
  const pool = rule.accessories.filter((a) => {
    if (a === 'canne') return ageGroup === 'aine';
    if (ageGroup === 'enfant' && (a === 'telephone' || a === 'chapeau' || a === 'panier_tete')) return false;
    if ((a === 'chapeau' || a === 'panier_tete') && covered) return false;
    if (a === 'panier_tete' && ageGroup === 'ado') return false;
    return true;
  });
  const accessories: AccessoryId[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const left = pool.filter((a) => !accessories.includes(a));
    if (left.length === 0) break;
    // La canne reste rare même chez les aînés
    accessories.push(rng.weighted(left, (a) => (a === 'canne' ? 0.5 : 1)));
  }

  return {
    role: ctx.role,
    ageGroup,
    heightScale,
    build,
    collisionRadius: COLLISION_RADIUS[ageGroup],
    skinHex,
    hair,
    hairHex,
    headwearHex,
    top: { id: topPick.def.id as TopId, hex: topPick.hex, patternId: topPick.patternId },
    bottom: { id: bottomPick.def.id as BottomId, hex: bottomPick.hex, patternId: bottomPick.patternId },
    shoes,
    accessories,
    legacyOutfit: legacyOutfitOf(topPick.def.id as TopId),
  };
}
