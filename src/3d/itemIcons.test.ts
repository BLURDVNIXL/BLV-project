import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { ALL_ITEMS } from '../core/items';
import { getItemIconUrl, iconFraming, ICON_FILL, requestItemIcon } from './itemIcons';
import { createHeldObject } from './studioObjects/heldObjects';

test('cadrage d\'icône : la vue contient toute la boîte', () => {
  const box = new THREE.Box3(new THREE.Vector3(-0.1, 0, -0.05), new THREE.Vector3(0.1, 0.2, 0.05));
  const { center, halfView } = iconFraming(box);
  assert.ok(Math.abs(center.y - 0.1) < 1e-9);
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  assert.ok(halfView * ICON_FILL >= radius - 1e-9);
});

test('cadrage d\'icône : une boîte vide ne donne pas une vue nulle', () => {
  const { halfView } = iconFraming(new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()));
  assert.ok(halfView > 0);
});

test('icônes : sans navigateur, aucune capture et l\'emoji reste le secours', () => {
  requestItemIcon('attieke');
  assert.equal(getItemIconUrl('attieke'), null);
});

test('icônes : chaque objet du catalogue a une boîte englobante exploitable (sinon emoji)', () => {
  let withModel = 0;
  for (const item of ALL_ITEMS) {
    const held = createHeldObject(item.id);
    if (!held) continue;
    withModel++;
    const box = new THREE.Box3().setFromObject(held.mesh);
    assert.ok(!box.isEmpty(), `${item.id} : boîte vide`);
    const { halfView } = iconFraming(box);
    assert.ok(Number.isFinite(halfView) && halfView > 0, `${item.id} : cadrage invalide`);
  }
  assert.ok(withModel > 100, `peu d'objets avec modèle : ${withModel}`);
});
