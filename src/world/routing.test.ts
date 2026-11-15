import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRoute, distanceToRouteEnd } from './routing';
import { DISTRICTS } from './abidjanGeography';
import { project } from './geo';
import { BRIDGE_GEOMS } from './roads';

const c = (id: string) => {
  const d = DISTRICTS.find((x) => x.id === id)!;
  return project(d.center.lat, d.center.lon);
};

test('Plateau → Treichville passe par un pont', () => {
  const r = findRoute(c('plateau'), c('treichville'));
  assert.ok(r);
  const crosses = BRIDGE_GEOMS.some((b) => r!.points.some((p) => Math.hypot(p.x - b.a.x, p.z - b.a.z) < 2));
  assert.ok(crosses, 'le chemin doit emprunter un pont');
  assert.ok(r!.distanceM > 500);
});

test('Yopougon → Cocody : chemin continu, du départ à l’arrivée', () => {
  const from = c('yopougon');
  const to = c('cocody');
  const r = findRoute(from, to)!;
  assert.ok(r);
  assert.deepEqual(r.points[0], from);
  assert.deepEqual(r.points[r.points.length - 1], to);
  assert.ok(r.via.length >= 1);
});

test('toutes les communes sont reliées entre elles', () => {
  for (const a of DISTRICTS) for (const b of DISTRICTS) {
    if (a.id === b.id) continue;
    assert.ok(findRoute(project(a.center.lat, a.center.lon), project(b.center.lat, b.center.lon)), `${a.id} → ${b.id}`);
  }
});

test('même point : pas d’itinéraire', () => {
  assert.equal(findRoute(c('plateau'), c('plateau')), null);
});

test('deux points proches sur le même axe : trajet court', () => {
  const a = c('cocody');
  const r = findRoute(a, { x: a.x + 30, z: a.z + 10 })!;
  assert.ok(r && r.distanceM < 400);
  assert.ok(distanceToRouteEnd(a, r) > 0);
});
