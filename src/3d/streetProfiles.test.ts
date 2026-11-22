/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Le livreur moto ne doit jamais être choisi comme piéton de rue.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GARMENTS } from './studioNpc/blvCatalog';
import { isStreetActorProfile } from './streetProfiles';

test('Profils de rue : le livreur moto est écarté, les autres tenues restent', () => {
  const moto = GARMENTS.find((g) => g.isMotoRider)!;
  assert.equal(isStreetActorProfile({ loadout: { fullOutfitId: moto.id } }), false);
  assert.equal(isStreetActorProfile({ loadout: { fullOutfitId: 'u_outfit_daily' } }), true);
  assert.equal(isStreetActorProfile({ loadout: { fullOutfitId: 'm_uni_police' } }), true);
  assert.equal(isStreetActorProfile({ loadout: { fullOutfitId: null } }), true);
  assert.equal(isStreetActorProfile({}), true);
});
