/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TREE_ASSETS } from '../assets3d/builders/trees';
import { CHUNK, generateChunk } from './city';
import { DISTRICTS } from './abidjanGeography';
import { project } from './geo';
import { assembleChunkObjects, buildChunkBuffers, bufferTransferList } from './chunkMesh';
import { getBakedTemplate, initSimplifier } from './studioBake';
import { LOD_HYSTERESIS, LOD_NEAR, LOD_REFINE_LEAD, MAX_MODEL_SCALE, chunkDistance, lodForDistance, type LodLevel } from './lod';
import { SILHOUETTE_TOLERANCE, silhouetteDiff, type GuardMesh } from './lodGuard';

const chunkOfDistrict = (id: string) => {
  const d = DISTRICTS.find((x) => x.id === id)!;
  const c = project(d.center.lat, d.center.lon);
  return generateChunk(Math.floor(c.x / CHUNK), Math.floor(c.z / CHUNK), {});
};

test('lod : le niveau ne dépend que de la distance, croît avec elle, et le premier niveau reste à pleine qualité de près', () => {
  assert.equal(lodForDistance(0, null), 0);
  assert.equal(lodForDistance(LOD_NEAR[0] + LOD_REFINE_LEAD - 0.1, null), 0);
  assert.equal(lodForDistance(LOD_NEAR[0] + LOD_REFINE_LEAD, null), 1);
  let prev = 0;
  for (let d = 0; d < 400; d += 1) {
    const l = lodForDistance(d, null);
    assert.ok(l >= prev, `niveau décroissant à ${d} m`);
    prev = l;
  }
  assert.equal(lodForDistance(400, null), 3);
});

test('lod : hystérésis, un chunk ne bascule pas d\'un niveau à l\'autre autour d\'un seuil', () => {
  const t = LOD_NEAR[0] + LOD_REFINE_LEAD;
  // niveau 0 : ne passe au niveau 1 qu\'après le seuil + marge
  assert.equal(lodForDistance(t + LOD_HYSTERESIS - 0.1, 0), 0);
  assert.equal(lodForDistance(t + LOD_HYSTERESIS, 0), 1);
  // niveau 1 : y reste tant qu\'on n\'est pas repassé sous le seuil
  assert.equal(lodForDistance(t, 1), 1);
  assert.equal(lodForDistance(t - 0.1, 1), 0);
  // marcher autour du seuil ne provoque aucun aller-retour
  let level: LodLevel = 0;
  let changes = 0;
  for (let i = 0; i < 400; i++) {
    const d = t + LOD_HYSTERESIS / 2 + Math.sin(i / 7) * (LOD_HYSTERESIS / 2 - 1);
    const next = lodForDistance(d, level);
    if (next !== level) changes++;
    level = next;
  }
  assert.equal(changes, 0);
});

test('lod : chunkDistance est la distance au rectangle du chunk (0 à l\'intérieur)', () => {
  assert.equal(chunkDistance(10, 10, 0, 0), 0);
  assert.equal(chunkDistance(-10, 10, 0, 0), 10);
  assert.ok(Math.abs(chunkDistance(-3, -4, 0, 0) - 5) < 1e-9);
  assert.equal(chunkDistance(CHUNK + 7, 20, 0, 0), 7);
});

test('lod : garde de qualité, aucun gabarit simplifié ne s\'écarte de l\'original au-delà de la tolérance', async () => {
  assert.equal(await initSimplifier(), true);
  const parts = (t: ReturnType<typeof getBakedTemplate>): GuardMesh[] =>
    [t.plain, t.trees, t.lamps, t.puddles].filter((m): m is NonNullable<typeof m> => m !== null);
  let simplified = 0;
  for (const asset of TREE_ASSETS) {
    for (const v of asset.variants) {
      const base = getBakedTemplate(asset, v.id, 0);
      for (const level of [1, 2, 3] as LodLevel[]) {
        const t = getBakedTemplate(asset, v.id, level);
        assert.ok(t.triangles <= base.triangles, `${asset.id}/${v.id} L${level} : plus de triangles que l'original`);
        assert.equal(t.height, base.height);
        assert.equal(t.radius, base.radius);
        const cell = (0.000985 * LOD_NEAR[level - 1]) / MAX_MODEL_SCALE;
        const d = silhouetteDiff(parts(base), parts(t), cell);
        assert.ok(d <= SILHOUETTE_TOLERANCE + 1e-9, `${asset.id}/${v.id} L${level} : silhouette ${(d * 100).toFixed(1)} %`);
        if (t.triangles < base.triangles) simplified++;
      }
    }
  }
  assert.ok(simplified > 20, 'la simplification doit réellement réduire une bonne partie des modèles');
});

test('lod : seuls les modèles du studio changent, bâtiments, collisions et lieux restent identiques à tous les niveaux', async () => {
  await initSimplifier();
  const data = chunkOfDistrict('banco');
  const b0 = buildChunkBuffers(data, 0);
  const b2 = buildChunkBuffers(data, 2);
  assert.equal(b0.lod, 0);
  assert.equal(b2.lod, 2);
  assert.deepEqual(b2.solids, b0.solids);
  assert.deepEqual(b2.venues, b0.venues);
  for (const k of ['facade', 'signs', 'lamps', 'puddles'] as const) {
    assert.deepEqual(b2[k]?.pos, b0[k]?.pos, `${k} : géométrie différente`);
  }
  assert.ok((b2.trees?.idx.length ?? 0) <= (b0.trees?.idx.length ?? 0));
  const tri = (b: typeof b0) => ((b.plain?.idx.length ?? 0) + (b.trees?.idx.length ?? 0)) / 3;
  assert.ok(tri(b2) < tri(b0), 'le niveau 2 doit avoir moins de triangles');
});

test('lod : swapDetail échange la géométrie sans toucher au sol, et libère l\'ancienne', async () => {
  await initSimplifier();
  const data = chunkOfDistrict('banco');
  const mk = () => new THREE.MeshBasicMaterial();
  const mats = { facade: mk(), plain: mk(), trees: mk(), lamps: mk(), puddles: mk(), signs: mk() } as never;
  const objects = assembleChunkObjects(data, buildChunkBuffers(data, 0), new Uint8Array(192 * 192 * 4), 192, mats);
  const ground = objects.group.children[0];
  const before = objects.group.children.slice(1) as THREE.Mesh[];
  let disposed = 0;
  before.forEach((m) => m.geometry.addEventListener('dispose', () => disposed++));
  assert.equal(objects.lod, 0);
  objects.swapDetail(buildChunkBuffers(data, 3), mats);
  assert.equal(objects.lod, 3);
  assert.equal(objects.group.children[0], ground, 'le sol ne doit pas être touché');
  assert.equal(disposed, before.length, 'ancienne géométrie libérée');
  assert.ok(before.every((m) => !objects.group.children.includes(m)));
  // ombres : les arbres cessent de projeter hors de la carte d'ombre, et reprennent
  const casters = () => (objects.group.children.slice(1) as THREE.Mesh[]).filter((m) => m.castShadow).length;
  const on = casters();
  assert.ok(on > 0);
  objects.setShadowCasting(false);
  assert.equal(casters(), 0);
  objects.setShadowCasting(true);
  assert.equal(casters(), on);
  objects.dispose();
});

test('worker : la liste de transfert couvre tous les tableaux (rien n\'est copié)', () => {
  const data = chunkOfDistrict('plateau');
  const b = buildChunkBuffers(data, 0);
  const list = bufferTransferList(b);
  const n = (['facade', 'plain', 'signs', 'trees', 'lamps', 'puddles'] as const).filter((k) => b[k]).length;
  assert.equal(list.length, n * 5);
  assert.equal(new Set(list).size, list.length);
});
