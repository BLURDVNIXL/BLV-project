/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Profil du studio d'un PNJ d'intérieur : le quartier du studio dépend de la salle, le corps du rôle (élève → ado),
 * le reste (visage, coiffure, vêtements) est tiré de la graine du PNJ : la même salle montre toujours les mêmes personnes.
 */

import type { InteriorId } from '../../world/interiors';
import type { NpcRole } from '../../world/npcAppearance';
import { generateContextualNpc, type BodyId, type CharacterLoadout, type DistrictId } from './blvCatalog';

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

/** Profil déterministe d'un PNJ d'une salle. */
export function interiorNpcLoadout(id: InteriorId, role: NpcRole, seed: number): CharacterLoadout {
  return generateContextualNpc(studioDistrictOfInterior(id), studioBodyOfRole(role), Math.floor(seed) * 7919 + 13);
}

/** Clé de cache d'un modèle (même profil = même modèle). */
export function interiorNpcKey(id: InteriorId, role: NpcRole, seed: number): string {
  return `${id}|${studioBodyOfRole(role) ?? '-'}|${Math.floor(seed)}`;
}
