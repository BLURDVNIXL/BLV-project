/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Profil d'un livreur moto : tenue « Livreur Moto » du studio (casque intégré), visage et corps tirés de la graine.
 */

import { GARMENTS, generateContextualNpc, type CharacterLoadout } from './blvCatalog';

const DELIVERY_OUTFIT_ID = 'u_uni_delivery';

/** Profil déterministe d'un livreur moto (corps compatible avec la tenue, sans autre couvre-chef : le casque est intégré). */
export function deliveryRiderLoadout(seed: number): CharacterLoadout {
  const outfit = GARMENTS.find((g) => g.id === DELIVERY_OUTFIT_ID);
  if (!outfit) throw new Error('Tenue livreur moto absente du studio');
  const base = Math.floor(seed) * 6007 + 31;
  let loadout = generateContextualNpc('COMMERCIAL', undefined, base);
  for (let k = 1; !outfit.compatibleBodies.includes(loadout.bodyId) && k <= 32; k++) {
    loadout = generateContextualNpc('COMMERCIAL', undefined, base + k * 104729);
  }
  if (!outfit.compatibleBodies.includes(loadout.bodyId)) loadout = { ...loadout, bodyId: 'BODY_MALE' };
  return {
    ...loadout,
    fullOutfitId: outfit.id,
    topId: null,
    bottomId: null,
    topColor: outfit.defaultPrimaryColor,
    topSecondaryColor: outfit.defaultSecondaryColor,
    topPattern: outfit.defaultPattern,
    headwearId: null,
  };
}
