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

// ── Catégories 2 à 9 ─────────────────────────────────────────────────────────────────────────
import { listStudioPropModels, pickStudioPropVariant, renderDecorProp } from './decorMeshes';
import type { DecorProp } from './decorTypes';

const PROP_VARIANTS: Record<string, string[]> = {
  tropical_plant: ['banana', 'papaya', 'aloe', 'broadleaf', 'fern', 'potted_ornamental', 'small_shrub', 'creeper'],
  flower: ['rose', 'bougainvillea', 'hibiscus', 'tropical_flower', 'flower_bed', 'small_flowers'],
  bush: ['round_bush', 'wild_bush', 'trimmed_hedge', 'planter_hedge', 'plant_bed', 'tall_grass', 'grove'],
  furniture: ['bench_wood', 'bench_metal', 'bench_concrete', 'bench_backrest', 'picnic_table', 'flower_pot', 'rect_planter', 'bollard', 'reverbere', 'barrier', 'pergola'],
  water_feature: ['tiered_fountain', 'circle_fountain', 'modern_fountain', 'ornamental_basin'],
  garden_decor: ['statue', 'abstract_sculpture', 'canari_jar', 'terracotta_pots', 'small_fence', 'low_wall', 'garden_border', 'green_pergola'],
  hanging_decor: ['decor_chain', 'barrier_chain', 'fairy_garland', 'bunting_garland', 'hanging_plant', 'lantern', 'wall_relief'],
  ground_rock: ['rock', 'pebbles', 'slabs', 'pavers'],
};

function makeProp(category: string, variant: string, seed: number): DecorProp {
  const base = { category, variant, x: 50, z: -20, angle: 0.7, scale: 1, seed, color: 0xffffff, y0: 3, span: 5 };
  return base as unknown as DecorProp;
}

test('studio 3D : chaque variante de décor du jeu (catégories 2 à 9) est servie par un modèle du studio, sans repli', () => {
  for (const [category, variants] of Object.entries(PROP_VARIANTS)) {
    for (const variant of variants) {
      for (let seed = 0; seed < 6; seed++) {
        const pick = pickStudioPropVariant({ category, variant, seed } as Pick<DecorProp, 'category' | 'variant' | 'seed'>);
        assert.ok(pick, `${category}:${variant} (seed ${seed}) sans modèle du studio`);
        const tpl = getBakedTemplate(pick.asset, pick.variantId);
        assert.ok(tpl.triangles > 0, `${pick.asset.id}/${pick.variantId} vide`);
        assert.ok(tpl.height > 0.05, `${pick.asset.id}/${pick.variantId} hauteur ${tpl.height}`);
        for (const m of [tpl.plain, tpl.trees, tpl.lamps, tpl.puddles]) {
          if (!m) continue;
          for (let i = 0; i < m.pos.length; i++) assert.ok(Number.isFinite(m.pos[i]), `${pick.asset.id}/${pick.variantId} NaN`);
          for (let i = 0; i < m.col.length; i++) assert.ok(Number.isFinite(m.col[i]), `${pick.asset.id}/${pick.variantId} couleur NaN`);
          for (let i = 0; i < m.idx.length; i++) assert.ok(m.idx[i] < m.pos.length / 3, `${pick.asset.id}/${pick.variantId} index hors limite`);
        }
      }
    }
  }
});

test('studio 3D : tous les modèles du studio hors abribus sont atteignables (58 modèles, toutes variantes)', () => {
  const models = listStudioPropModels();
  const assets = new Set(models.map((m) => m.asset.id));
  assert.equal(assets.size, 58, `modèles atteignables : ${assets.size}/58 (hors les 10 arbres et l'abribus)`);
  assert.ok(!assets.has('uf_abribus'));
  // Toutes les variantes de chaque modèle sont réellement tirées par les graines
  const drawn = new Set<string>();
  for (const [category, variants] of Object.entries(PROP_VARIANTS)) {
    for (const variant of variants) {
      for (let seed = 0; seed < 60; seed++) {
        const pick = pickStudioPropVariant({ category, variant, seed } as Pick<DecorProp, 'category' | 'variant' | 'seed'>)!;
        drawn.add(`${pick.asset.id}:${pick.variantId}`);
      }
    }
  }
  assert.equal(drawn.size, models.length, `variantes tirées : ${drawn.size}/${models.length}`);
});

test('studio 3D : renderDecorProp écrit les bons buffers (lumières, eau, feuillage) et reste fini pour tous les décors', () => {
  let lampsSeen = false, waterSeen = false, foliageSeen = false;
  for (const [category, variants] of Object.entries(PROP_VARIANTS)) {
    for (const variant of variants) {
      for (let seed = 0; seed < 4; seed++) {
        const plain = new Buf(), trees = new Buf(), lamps = new Buf(), puddles = new Buf();
        renderDecorProp(plain, trees, lamps, puddles, makeProp(category, variant, seed));
        const total = plain.pos.length + trees.pos.length + lamps.pos.length + puddles.pos.length;
        assert.ok(total > 0, `${category}:${variant} rien dessiné`);
        for (const b of [plain, trees, lamps, puddles]) {
          for (const v of b.pos) assert.ok(Number.isFinite(v), `${category}:${variant} NaN`);
          for (const v of b.nor) assert.ok(Number.isFinite(v), `${category}:${variant} normale NaN`);
          assert.equal(b.col.length, b.pos.length);
          assert.equal(b.uv.length / 2, b.pos.length / 3);
        }
        if (lamps.pos.length > 0) lampsSeen = true;
        if (puddles.pos.length > 0 && category === 'water_feature') waterSeen = true;
        if (trees.pos.length > 0) foliageSeen = true;
      }
    }
  }
  assert.ok(lampsSeen && waterSeen && foliageSeen, 'lampes / eau / feuillage non routés');
});

test('studio 3D : guirlandes et chaînes sont répétées sur toute la portée, accrochées à y0', () => {
  for (const variant of ['fairy_garland', 'bunting_garland', 'decor_chain']) {
    const prop = { ...makeProp('hanging_decor', variant, 1), angle: 0, x: 10, z: 5, span: 8, y0: 3.2 } as DecorProp;
    const plain = new Buf(), trees = new Buf(), lamps = new Buf(), puddles = new Buf();
    renderDecorProp(plain, trees, lamps, puddles, prop);
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of [plain, trees, lamps, puddles]) {
      for (let i = 0; i < b.pos.length; i += 3) {
        minX = Math.min(minX, b.pos[i]);
        maxX = Math.max(maxX, b.pos[i]);
        maxY = Math.max(maxY, b.pos[i + 1]);
      }
    }
    assert.ok(maxX - minX > 7 && maxX - minX < 9, `${variant} : largeur ${(maxX - minX).toFixed(2)} pour une portée de 8 m`);
    assert.ok(Math.abs(maxY - 3.2) < 0.35, `${variant} : accroché à y=${maxY.toFixed(2)} au lieu de 3.2`);
  }
});
