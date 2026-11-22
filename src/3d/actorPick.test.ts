import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickStreetModel } from './actorPick';

const FILES = ['a.glb', 'b.glb', 'c.glb', 'd.glb', 'e.glb'];

test('Acteurs : sans acteur actif, la graine donne le modèle de départ (stable)', () => {
  const none = new Map<string, number>();
  assert.equal(pickStreetModel(FILES, 7, none), 'c.glb');
  assert.equal(pickStreetModel(FILES, 7, none), 'c.glb');
  assert.equal(pickStreetModel(FILES, -6.5, none), 'c.glb');
});

test('Acteurs : un modèle déjà affiché est sauté au profit d\'un modèle libre', () => {
  const usage = new Map([['c.glb', 1], ['d.glb', 1]]);
  assert.equal(pickStreetModel(FILES, 7, usage), 'e.glb');
});

test('Acteurs : aucun doublon tant qu\'il reste des modèles libres, quelles que soient les graines', () => {
  for (let run = 0; run < 50; run++) {
    const usage = new Map<string, number>();
    for (let k = 0; k < FILES.length; k++) {
      const f = pickStreetModel(FILES, run * 31 + k * 7, usage);
      assert.equal(usage.get(f) ?? 0, 0, `doublon au tirage ${k} (run ${run})`);
      usage.set(f, 1);
    }
  }
});

test('Acteurs : quand tous sont pris, on choisit le moins utilisé', () => {
  const usage = new Map([['a.glb', 2], ['b.glb', 2], ['c.glb', 1], ['d.glb', 2], ['e.glb', 2]]);
  assert.equal(pickStreetModel(FILES, 0, usage), 'c.glb');
});

test('Acteurs : un seul modèle disponible est toujours renvoyé', () => {
  assert.equal(pickStreetModel(['x.glb'], 123, new Map([['x.glb', 5]])), 'x.glb');
});
