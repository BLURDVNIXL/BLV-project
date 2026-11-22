import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Buf } from './decorMeshes';
import { addLightPool } from './chunkMesh';

test('flaque de lumière : carré posé au sol, centré, avec dégradé (uv) et teinte atténuée', () => {
  const b = new Buf();
  addLightPool(b, 10, -4, 3, new THREE.Color(1, 0.5, 0.25), 0.5);
  assert.equal(b.pos.length / 3, 4);
  assert.equal(b.idx.length, 6);
  const xs = b.pos.filter((_, i) => i % 3 === 0);
  const ys = b.pos.filter((_, i) => i % 3 === 1);
  const zs = b.pos.filter((_, i) => i % 3 === 2);
  assert.deepEqual([Math.min(...xs), Math.max(...xs)], [7, 13]);
  assert.deepEqual([Math.min(...zs), Math.max(...zs)], [-7, -1]);
  assert.ok(ys.every((y) => y > 0 && y < 0.1), 'juste au-dessus du sol');
  assert.deepEqual(b.uv, [0, 0, 0, 1, 1, 1, 1, 0]);
  assert.ok(Math.abs(b.col[0] - 0.5) < 1e-6 && Math.abs(b.col[1] - 0.25) < 1e-6 && Math.abs(b.col[2] - 0.125) < 1e-6);
});

test('flaques : plusieurs sources dans le même buffer, 4 sommets chacune', () => {
  const b = new Buf();
  for (let i = 0; i < 5; i++) addLightPool(b, i * 10, 0, 2, new THREE.Color(0xffc46b), 0.8);
  assert.equal(b.pos.length / 3, 20);
  assert.equal(b.toData()?.idx.length, 30);
});

test('chunks réels : les lampadaires et les braseros produisent des flaques de lumière, en sommets valides', async () => {
  const { CHUNK, generateChunk } = await import('./city');
  const { DISTRICTS } = await import('./abidjanGeography');
  const { project } = await import('./geo');
  const { buildChunkBuffers } = await import('./chunkMesh');
  let withPools = 0;
  for (const id of ['plateau', 'cocody', 'yopougon', 'adjame', 'treichville']) {
    const d = DISTRICTS.find((x) => x.id === id);
    if (!d) continue;
    const c = project(d.center.lat, d.center.lon);
    const b = buildChunkBuffers(generateChunk(Math.floor(c.x / CHUNK), Math.floor(c.z / CHUNK), {}), 0);
    if (!b.pools) continue;
    withPools++;
    assert.equal(b.pools.pos.length / 3 % 4, 0, 'quatre sommets par flaque');
    assert.ok(b.pools.pos.every(Number.isFinite));
    assert.ok(b.pools.pos.length / 3 <= 4 * 400, 'nombre de flaques raisonnable par chunk');
  }
  assert.ok(withPools > 0, 'au moins un quartier a des flaques de lumière');
});
