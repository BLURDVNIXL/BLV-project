/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Quels profils de `public/npcs/profiles.json` peuvent servir d'acteur de rue. Le livreur moto du studio est écarté :
 * c'est un personnage assis sur sa moto (la moto fait partie du GLB), il apparaîtrait sur la route au milieu des piétons.
 */

import { GARMENTS } from './studioNpc/blvCatalog';

export interface StreetProfileLike {
  loadout?: { fullOutfitId?: string | null } | null;
}

/** Vrai si ce profil peut marcher dans la rue comme un piéton. */
export function isStreetActorProfile(entry: StreetProfileLike): boolean {
  const id = entry.loadout?.fullOutfitId;
  if (!id) return true;
  return !GARMENTS.find((g) => g.id === id)?.isMotoRider;
}
