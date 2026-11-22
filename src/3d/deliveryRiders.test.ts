/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Livreurs moto : choix du clip et cadence selon la vitesse, construction, roues qui tournent seulement quand la moto roule.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GARMENTS } from './studioNpc/blvCatalog';
import { deliveryRiderLoadout } from './studioNpc/deliveryRiderLoadout';
import { createDeliveryRider, riderClipFor, riderClipTimeScale } from './deliveryRiders';

const ctx: any = new Proxy({}, {
  get: (_t, k) =>
    k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop() {} })
    : k === 'measureText' ? () => ({ width: 0 })
    : typeof k === 'string' ? () => {} : undefined,
  set: () => true,
});
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };

test('Livreur : cadence des clips selon la vitesse', () => {
  assert.equal(riderClipTimeScale(0, 3.2), 0);
  assert.equal(riderClipTimeScale(0.2, 3.2), 0);
  assert.equal(riderClipTimeScale(-6.4, 3.2), 2);
  assert.equal(riderClipTimeScale(100, 3.2), 3);
  assert.equal(riderClipTimeScale(0.5, 6.1), 0.3);
  assert.equal(riderClipFor(3), 'walk');
  assert.equal(riderClipFor(12), 'run');
  assert.equal(riderClipFor(-12), 'run');
});

test('Livreur : profil déterministe, corps compatible avec la tenue', () => {
  const outfit = GARMENTS.find((g) => g.isMotoRider)!;
  for (let seed = 1; seed <= 40; seed++) {
    const a = deliveryRiderLoadout(seed);
    assert.deepEqual(a, deliveryRiderLoadout(seed));
    assert.equal(a.fullOutfitId, outfit.id);
    assert.ok(outfit.compatibleBodies.includes(a.bodyId), `${seed} ${a.bodyId}`);
    assert.equal(a.headwearId, null);
  }
});

test('Livreur : 4 meshes ; les roues tournent seulement quand la moto roule', () => {
  const r = createDeliveryRider(2);
  assert.ok(r);
  let meshes = 0;
  r!.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  assert.equal(meshes, 4);
  r!.group.visible = true;
  const wheel = r!.group.getObjectByName('Moto_Wheel_Front')!;
  r!.update(0.016, 0);
  const rest = wheel.quaternion.clone();
  r!.update(0.2, 0);
  assert.ok(wheel.quaternion.equals(rest), 'figé à l\'arrêt');
  r!.update(0.1, 12);
  r!.update(0.1, 12);
  assert.ok(!wheel.quaternion.equals(rest), 'la roue tourne en roulant');
  // passage Walk → Run → arrêt sans erreur
  for (const v of [2, 4, 8, 14, 5, 0]) r!.update(0.05, v);
  // caché : aucune mise à jour
  r!.group.visible = false;
  const before = wheel.quaternion.clone();
  r!.update(0.5, 14);
  assert.ok(wheel.quaternion.equals(before));
  r!.dispose();
});

test('Livreur : plusieurs graines se construisent', () => {
  for (let seed = 1; seed <= 6; seed++) assert.ok(createDeliveryRider(seed), `graine ${seed}`);
});
