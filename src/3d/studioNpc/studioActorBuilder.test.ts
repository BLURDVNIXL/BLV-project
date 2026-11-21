/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * PNJ du studio : un seul mesh skinné par personnage (pas de dérive du nombre de draw calls), 20 os, animations
 * BLV_Idle / BLV_Walk / BLV_Talk, profil déterministe, corps adapté au rôle.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { INTERIORS } from '../../world/interiors';
import { interiorNpcKey, interiorNpcLoadout, studioDistrictOfInterior } from './interiorLoadout';
import { buildStudioActorTemplate } from './studioActorBuilder';

// Les motifs de tissu dessinent dans un canvas : un faux contexte suffit pour construire le modèle.
const ctx: any = new Proxy({}, {
  get: (_t, k) =>
    k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern' ? () => ({ addColorStop() {} })
    : k === 'measureText' ? () => ({ width: 0 })
    : typeof k === 'string' ? () => {} : undefined,
  set: () => true,
});
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };

test('PNJ du studio : un seul mesh skinné, 20 os, 3 animations', () => {
  for (const id of ['marche_adjame', 'maquis', 'lycee_alex', 'hopital'] as const) {
    for (let seed = 1; seed <= 3; seed++) {
      const t = buildStudioActorTemplate(interiorNpcLoadout(id, 'passant', seed));
      assert.ok(t, `${id}/${seed}`);
      let meshes = 0, bones = 0, skinned = 0;
      t!.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes++;
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
        if ((o as THREE.Bone).isBone) bones++;
      });
      assert.equal(meshes, 1);
      assert.equal(skinned, 1);
      assert.equal(bones, 20);
      assert.deepEqual(t!.animations.map((a) => a.name).sort(), ['BLV_Idle', 'BLV_Talk', 'BLV_Walk']);
      const mesh = t!.scene.getObjectByName('BLV_StudioNpc') as THREE.SkinnedMesh;
      assert.ok(mesh.geometry.getAttribute('color'));
      assert.ok(mesh.geometry.getAttribute('position').count > 500);
    }
  }
});

test('Profils de salle : déterministes, rôle élève = ado, quartier selon la salle', () => {
  const a = interiorNpcLoadout('maquis', 'passant', 5);
  const b = interiorNpcLoadout('maquis', 'passant', 5);
  assert.deepEqual(a, b);
  assert.equal(interiorNpcLoadout('lycee_alex', 'eleve', 9).bodyId, 'BODY_TEEN');
  assert.equal(studioDistrictOfInterior('maquis'), 'MAQUIS');
  assert.equal(studioDistrictOfInterior('marche_adjame'), 'MARKET');
  assert.notEqual(interiorNpcKey('maquis', 'passant', 5), interiorNpcKey('boutique', 'passant', 5));
});

test('Chaque PNJ de chaque salle publique se construit en un seul mesh', () => {
  for (const def of Object.values(INTERIORS)) {
    for (const d of def.npcs ?? []) {
      const t = buildStudioActorTemplate(interiorNpcLoadout(def.id, d.role, d.seed));
      assert.ok(t, `${def.id} seed ${d.seed}`);
    }
  }
});

test('PNJ du studio : les verres de lunettes transparents ne sont pas fusionnés en blocs opaques', () => {
  let tested = 0;
  for (let seed = 1; seed <= 60 && tested < 3; seed++) {
    const l = { ...interiorNpcLoadout('boutique', 'passant', seed) };
    if (!l.eyewearId) continue;
    const t = buildStudioActorTemplate(l);
    assert.ok(t);
    const mesh = t!.scene.getObjectByName('BLV_StudioNpc') as THREE.SkinnedMesh;
    assert.equal((mesh.material as THREE.Material).transparent, false);
    tested++;
  }
  assert.ok(tested > 0, 'aucun profil avec lunettes trouvé');
});
