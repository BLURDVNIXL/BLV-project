import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NPC_SEED, STRAIGHT_BIAS_MAX, STRAIGHT_BIAS_MIN, launchSeed, walkerStraightBias } from './npcWander';
import { DISTRICTS } from '../world/abidjanGeography';
import { nodeNeighbors, nodeValid, pickNextNode, sameNode, type SwNode } from '../world/sidewalks';

test('Trajets : la graine change d\'un lancement à l\'autre', () => {
  assert.notEqual(launchSeed(1_000, () => 0.25), launchSeed(2_000, () => 0.25));
  assert.notEqual(launchSeed(1_000, () => 0.25), launchSeed(1_000, () => 0.75));
});

test('Trajets : la graine est un entier 32 bits non nul, même quand le mélange donne 0', () => {
  const s = launchSeed(123456789, () => 0.5);
  assert.ok(Number.isInteger(s) && s > 0 && s < 2 ** 32);
  assert.equal(launchSeed(5, () => 5 / 4294967296), DEFAULT_NPC_SEED);
});

test('Trajets : le caractère reste dans la plage et croît avec le tirage', () => {
  assert.equal(walkerStraightBias(0), STRAIGHT_BIAS_MIN);
  assert.ok(walkerStraightBias(1) <= STRAIGHT_BIAS_MAX);
  assert.ok(walkerStraightBias(1) > walkerStraightBias(0.5));
  assert.equal(walkerStraightBias(-3), STRAIGHT_BIAS_MIN);
});

/** Premier carrefour réel où un piéton arrivant de `prev` a au moins 2 sorties (hors retour). */
function findJunction(): { cur: SwNode; prev: SwNode } {
  for (let d = 0; d < DISTRICTS.length; d++) {
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) for (let c = 0; c < 4; c++) {
      const cur: SwNode = { d, i, j, c };
      if (!nodeValid(cur)) continue;
      const nb = nodeNeighbors(cur);
      for (const prev of nb) {
        if (nb.filter((n) => !sameNode(n, prev)).length >= 2) return { cur, prev };
      }
    }
  }
  throw new Error('aucun carrefour trouvé');
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('Trajets : un penchant de 1 va toujours tout droit, un penchant de 0 varie', () => {
  const { cur, prev } = findJunction();
  const rand = lcg(42);
  const always = new Set<number>();
  const never = new Set<number>();
  for (let k = 0; k < 300; k++) {
    const a = pickNextNode(cur, prev, rand, 1)!;
    always.add(a.d * 1e9 + a.i * 1e6 + a.j * 1e3 + a.c);
    const b = pickNextNode(cur, prev, rand, 0)!;
    never.add(b.d * 1e9 + b.i * 1e6 + b.j * 1e3 + b.c);
  }
  assert.equal(always.size, 1);
  assert.ok(never.size >= 2);
});

test('Trajets : sans penchant précisé, le comportement d\'avant (60 %) est conservé', () => {
  const { cur, prev } = findJunction();
  const a = pickNextNode(cur, prev, lcg(7));
  const b = pickNextNode(cur, prev, lcg(7), 0.6);
  assert.ok(a && b && sameNode(a, b));
});
