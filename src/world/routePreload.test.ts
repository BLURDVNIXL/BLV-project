import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corridorChunks, readyDistance, CORRIDOR_MARGIN } from './routePreload';
import { CHUNK } from './city';

test('Préchargement : une ligne droite traverse chaque chunk une seule fois, dans l’ordre', () => {
  const pts = [{ x: 10, z: 10 }, { x: 10 + CHUNK * 3, z: 10 }];
  const c = corridorChunks(pts, 0);
  assert.deepEqual(c.map((q) => [q.cx, q.cz]), [[0, 0], [1, 0], [2, 0], [3, 0]]);
  for (let i = 1; i < c.length; i++) assert.ok(c[i].d >= c[i - 1].d);
  assert.equal(c[0].d, 0);
});

test('Préchargement : un virage ne saute aucun chunk et la zone d’arrivée est ajoutée', () => {
  const pts = [{ x: 5, z: 5 }, { x: 5 + CHUNK * 2, z: 5 }, { x: 5 + CHUNK * 2, z: 5 + CHUNK * 2 }];
  const c = corridorChunks(pts, 1);
  const keys = new Set(c.map((q) => `${q.cx},${q.cz}`));
  for (const k of ['0,0', '1,0', '2,0', '2,1', '2,2']) assert.ok(keys.has(k), k);
  assert.equal(keys.size, c.length, 'aucun doublon');
  // zone d'arrivée : 3×3 autour de (2,2), distance = longueur du trajet
  const total = CHUNK * 4;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) assert.ok(keys.has(`${2 + dx},${2 + dz}`));
  assert.equal(c.find((q) => q.cx === 3 && q.cz === 3)!.d, total);
});

test('Préchargement : tracé vide ou un seul point', () => {
  assert.deepEqual(corridorChunks([]), []);
  const one = corridorChunks([{ x: 70, z: 70 }], 0);
  assert.deepEqual(one, [{ cx: 1, cz: 1, d: 0 }]);
});

test('Préchargement : le taxi ne dépasse jamais le premier chunk manquant', () => {
  const pts = [{ x: 10, z: 10 }, { x: 10 + CHUNK * 5, z: 10 }];
  const c = corridorChunks(pts, 0);
  const loaded = new Set(['0,0', '1,0', '2,0']);
  const lim = readyDistance(c, (x, z) => loaded.has(`${x},${z}`));
  const missing = c.find((q) => q.cx === 3)!;
  assert.equal(lim, Math.max(0, missing.d - CORRIDOR_MARGIN));
  assert.equal(readyDistance(c, () => true), Infinity);
  assert.equal(readyDistance(c, () => false), 0);
});
