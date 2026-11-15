import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_COLLIDERS, houseToWorld } from './playerHouse';
import { HOUSE_DOOR_WIDTH, HOUSE_SHELL_WALLS, insideHouse, segmentCrossesRect, worldToHouse } from './houseShell';

test('worldToHouse est l’inverse de houseToWorld, pour toute rotation', () => {
  for (const rot of [0, 0.7, -2.3, Math.PI]) {
    const w = houseToWorld(120, -45, rot, 3.2, -1.4);
    const l = worldToHouse(120, -45, rot, w.x, w.z);
    assert.ok(Math.abs(l.x - 3.2) < 1e-9 && Math.abs(l.z + 1.4) < 1e-9, `rotation ${rot}`);
  }
});

test('la façade laisse une porte de la bonne largeur, centrée', () => {
  const front = HOUSE_SHELL_WALLS.filter((w) => w.nz === 1);
  assert.equal(front.length, 2);
  const gapLeft = Math.min(...front.map((w) => Math.abs(w.x) - w.hx));
  assert.ok(Math.abs(gapLeft * 2 - HOUSE_DOOR_WIDTH) < 1e-9);
  assert.ok(HOUSE_DOOR_WIDTH >= 1.8, 'porte trop étroite pour passer');
});

test('on peut aller du perron (z = 5,2) jusqu’au centre de la pièce, puis atteindre le lit', () => {
  const step = 0.2, r = 0.35;
  const blocked = (x: number, z: number) =>
    HOUSE_COLLIDERS.some((b) => Math.abs(x - b.x) < b.hx + r && Math.abs(z - b.z) < b.hz + r);
  const key = (i: number, j: number) => `${i},${j}`;
  const start = [0, Math.round(5.2 / step)];
  assert.ok(!blocked(0, 5.2), 'le perron est bloqué');
  const seen = new Set([key(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [i, j] = queue.shift()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      const x = ni * step, z = nj * step;
      if (Math.abs(x) > 8 || z > 7 || z < -6 || seen.has(key(ni, nj)) || blocked(x, z)) continue;
      seen.add(key(ni, nj));
      queue.push([ni, nj]);
    }
  }
  assert.ok(seen.has(key(0, 0)), 'le centre de la pièce est inaccessible depuis la porte');
  assert.ok(seen.has(key(Math.round(-4 / step), Math.round(-1.6 / step))), 'le lit est inaccessible');
});

test('on ne peut PAS traverser un mur', () => {
  const r = 0.35;
  const blocked = (x: number, z: number) =>
    HOUSE_COLLIDERS.some((b) => Math.abs(x - b.x) < b.hx + r && Math.abs(z - b.z) < b.hz + r);
  assert.ok(blocked(-4, 4.5), 'pan de façade gauche');
  assert.ok(blocked(4, 4.5), 'pan de façade droit');
  assert.ok(blocked(0, -4.5), 'mur du fond');
  assert.ok(blocked(-6, 0) && blocked(6, 0), 'murs latéraux');
});

test('insideHouse : dedans / dehors', () => {
  assert.equal(insideHouse(0, 0), true);
  assert.equal(insideHouse(0, 5.2), false);   // perron
  assert.equal(insideHouse(7, 0), false);
  assert.equal(insideHouse(0, -5), false);
});

test('segmentCrossesRect : traverse / évite un rectangle', () => {
  assert.equal(segmentCrossesRect(-10, 0, 10, 0, 6, 4), true);
  assert.equal(segmentCrossesRect(0, 8, 0, 20, 6, 4), false);
  assert.equal(segmentCrossesRect(0, 0, 0, 20, 6, 4), true);
  assert.equal(segmentCrossesRect(-10, 6, 10, 6, 6, 4), false);
});
