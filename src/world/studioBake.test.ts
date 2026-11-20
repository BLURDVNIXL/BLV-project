/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TREE_ASSETS } from '../assets3d/builders/trees';
import { getBakedTemplate } from './studioBake';
import { Buf, addRichTree, pickStudioTreeVariant, pickTreeSpecies } from './decorMeshes';
import type { TreeSpecies } from './decorTypes';

test('studio 3D : les 10 arbres et leurs 29 variantes sont cuits sans NaN, pied posé à y=0, tronc + feuillage', () => {
  let variants = 0;
  for (const asset of TREE_ASSETS) {
    for (const v of asset.variants) {
      variants++;
      const tpl = getBakedTemplate(asset, v.id);
      assert.ok(tpl.height > 2, `${asset.id}/${v.id} : hauteur ${tpl.height}`);
      assert.ok(tpl.plain && tpl.plain.idx.length > 0, `${asset.id}/${v.id} : pas de tronc`);
      assert.ok(tpl.trees && tpl.trees.idx.length > 0, `${asset.id}/${v.id} : pas de feuillage`);
      let minY = Infinity;
      for (const m of [tpl.plain!, tpl.trees!]) {
        for (let i = 0; i < m.pos.length; i++) assert.ok(Number.isFinite(m.pos[i]), `${asset.id}/${v.id} : NaN position`);
        for (let i = 0; i < m.nor.length; i++) assert.ok(Number.isFinite(m.nor[i]), `${asset.id}/${v.id} : NaN normale`);
        for (let i = 1; i < m.pos.length; i += 3) minY = Math.min(minY, m.pos[i]);
        for (let i = 0; i < m.idx.length; i++) assert.ok(m.idx[i] < m.pos.length / 3, `${asset.id}/${v.id} : index hors limite`);
      }
      assert.ok(Math.abs(minY) < 1e-4, `${asset.id}/${v.id} : base à y=${minY}`);
    }
  }
  assert.equal(TREE_ASSETS.length, 10);
  assert.equal(variants, 29);
});

test('studio 3D : toutes les variantes (jeunes et adultes) sont réellement choisies par addRichTree', () => {
  const species: TreeSpecies[] = ['coconut', 'ornamental_palm', 'mango', 'baobab', 'flamboyant', 'acacia', 'fromager', 'broadleaf_tropical', 'urban_ornamental', 'ficus'];
  const used = new Set<string>();
  for (const sp of species) {
    for (const young of [false, true]) {
      for (let h = 0; h < 12; h++) {
        const v = pickStudioTreeVariant(sp, young, h);
        assert.ok(v, `${sp} : aucune variante`);
        used.add(`${sp}:${v}`);
      }
    }
  }
  assert.equal(used.size, 29, `variantes utilisées : ${used.size}/29`);

  // Un arbre complet est bien écrit dans les deux buffers, centré sur (x, z)
  const plain = new Buf();
  const trees = new Buf();
  let hash = 0;
  while (pickTreeSpecies(hash, 'cocody', 7) !== 'baobab' && hash < 500) hash++;
  addRichTree(plain, trees, 100, -40, 7, hash, 'cocody');
  assert.ok(plain.pos.length > 0 && trees.pos.length > 0);
  let sx = 0, sz = 0, n = 0;
  for (let i = 0; i < plain.pos.length; i += 3) {
    if (plain.pos[i + 1] < 0.3) { sx += plain.pos[i]; sz += plain.pos[i + 2]; n++; }
  }
  assert.ok(Math.abs(sx / n - 100) < 0.6 && Math.abs(sz / n + 40) < 0.6, 'pied du tronc non centré sur (x, z)');
});
