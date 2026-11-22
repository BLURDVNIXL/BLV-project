/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Profil du studio d'un PNJ d'intérieur : le quartier du studio dépend de la salle, le corps du rôle (élève → ado),
 * la tenue de travail du rôle (policier, soignant, serveur, personnel d'hôtel) ; le reste (visage, coiffure,
 * vêtements) est tiré de la graine du PNJ : la même salle montre toujours les mêmes personnes.
 * Les uniformes ne sortent jamais pour un PNJ ordinaire.
 */

import type { InteriorId } from '../../world/interiors';
import type { NpcRole } from '../../world/npcAppearance';
import {
  GARMENTS,
  generateContextualNpc,
  type BodyId,
  type CharacterLoadout,
  type DistrictId,
} from './blvCatalog';

/** Quartier du studio (garde-robe, corps, accessoires) selon la salle. Les maisons du joueur : résidentiel. */
const DISTRICT_OF_INTERIOR: Partial<Record<InteriorId, DistrictId>> = {
  marche_adjame: 'MARKET',
  maquis: 'MAQUIS',
  boutique: 'COMMERCIAL',
  superette: 'COMMERCIAL',
  coiffure: 'COMMERCIAL',
  hopital: 'COMMERCIAL',
  mairie: 'COMMERCIAL',
  commissariat: 'COMMERCIAL',
  hotel_ivoire: 'COMMERCIAL',
  aeroport: 'COMMERCIAL',
  palais_culture: 'FESTIVE',
  cathedrale: 'RESIDENTIAL',
  petit_hotel: 'RESIDENTIAL',
  lycee_caiman: 'RESIDENTIAL',
  lycee_alysma: 'RESIDENTIAL',
  lycee_alex: 'RESIDENTIAL',
};

export function studioDistrictOfInterior(id: InteriorId): DistrictId {
  return DISTRICT_OF_INTERIOR[id] ?? 'RESIDENTIAL';
}

export function studioBodyOfRole(role: NpcRole): BodyId | undefined {
  return role === 'eleve' ? 'BODY_TEEN' : undefined;
}

/** Identifiant de base des uniformes du studio (`m_uni_police` → `police`), selon le rôle et la salle. */
export function uniformKindOf(id: InteriorId, role: NpcRole): 'police' | 'doctor' | 'restaurant' | 'hotel' | null {
  if (role === 'policier') return 'police';
  if (role === 'soignant') return 'doctor';
  if (role === 'serveur_maquis') return 'restaurant';
  if ((id === 'hotel_ivoire' || id === 'petit_hotel') && (role === 'agent_mairie' || role === 'vendeur')) return 'hotel';
  return null;
}

/** Un vêtement du studio est-il un uniforme de métier (policier, médecin, hôtel, restaurant, livreur) ? */
export function isUniformGarment(garmentId: string | null): boolean {
  if (!garmentId) return false;
  return GARMENTS.find((g) => g.id === garmentId)?.subcategory === 'Uniformes';
}

function uniformFor(kind: 'police' | 'doctor' | 'restaurant' | 'hotel', bodyId: BodyId) {
  const candidates = [`m_uni_${kind}`, `f_uni_${kind}`]
    .map((id) => GARMENTS.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => !!g && g.compatibleBodies.includes(bodyId));
  // Un corps féminin préfère la coupe féminine, sinon la première coupe compatible.
  return bodyId === 'BODY_FEMALE' ? candidates.find((g) => g.id.startsWith('f_')) ?? candidates[0] : candidates[0];
}

/** Profil déterministe d'un PNJ d'une salle. */
export function interiorNpcLoadout(id: InteriorId, role: NpcRole, seed: number): CharacterLoadout {
  const district = studioDistrictOfInterior(id);
  const body = studioBodyOfRole(role);
  const base = Math.floor(seed) * 7919 + 13;
  const kind = uniformKindOf(id, role);

  // PNJ ordinaire : on retire les tirages qui tombent sur un uniforme.
  let loadout = generateContextualNpc(district, body, base);
  for (let k = 1; isUniformGarment(loadout.fullOutfitId) && k <= 24; k++) {
    loadout = generateContextualNpc(district, body, base + k * 104729);
  }
  if (isUniformGarment(loadout.fullOutfitId)) loadout = { ...loadout, fullOutfitId: null };
  if (!kind) return loadout;

  const uniform = uniformFor(kind, loadout.bodyId);
  if (!uniform) return loadout;
  return {
    ...loadout,
    fullOutfitId: uniform.id,
    topId: null,
    bottomId: null,
    topColor: uniform.defaultPrimaryColor,
    topSecondaryColor: uniform.defaultSecondaryColor,
    topPattern: uniform.defaultPattern,
    headwearId: null,
  };
}

/** Clé de cache d'un modèle (même profil = même modèle). */
export function interiorNpcKey(id: InteriorId, role: NpcRole, seed: number): string {
  return `${id}|${role}|${studioBodyOfRole(role) ?? '-'}|${Math.floor(seed)}`;
}
