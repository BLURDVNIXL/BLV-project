import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTaxiApproach, pointAlongPath, taxiProgress, taxiRouteTo, TAXI_MIN_PATH } from './taxiApproach';
import { DISTRICTS } from './abidjanGeography';
import { project } from './geo';
import { nearestRoadPoint } from './routing';

const c = (id: string) => {
  const d = DISTRICTS.find((x) => x.id === id)!;
  return project(d.center.lat, d.center.lon);
};

test('Taxi B2 : le trajet finit au point de route le plus proche du joueur', () => {
  for (const id of ['plateau', 'cocody', 'yopougon', 'treichville']) {
    const player = c(id);
    const plan = planTaxiApproach(player);
    assert.ok(plan, `trajet pour ${id}`);
    const stop = nearestRoadPoint(player).at;
    const end = plan!.points[plan!.points.length - 1];
    assert.ok(Math.hypot(end.x - stop.x, end.z - stop.z) < 0.5);
    assert.ok(plan!.length >= TAXI_MIN_PATH, `${plan!.length} u de trajet`);
    assert.ok(plan!.length < 400, `${plan!.length} u de trajet (court : le taxi arrive de près)`);
  }
});

test('Taxi B2 : pointAlongPath suit le tracé, du départ à l’arrêt, avec un cap cohérent', () => {
  const plan = planTaxiApproach(c('plateau'))!;
  const start = pointAlongPath(plan.points, 0);
  assert.ok(Math.hypot(start.x - plan.points[0].x, start.z - plan.points[0].z) < 1e-6);
  const end = pointAlongPath(plan.points, plan.length + 50);
  const last = plan.points[plan.points.length - 1];
  assert.ok(Math.hypot(end.x - last.x, end.z - last.z) < 1e-6);
  // Un point à mi-chemin est à moins de la moitié de la longueur du départ (à vol d'oiseau).
  const mid = pointAlongPath(plan.points, plan.length / 2);
  assert.ok(Math.hypot(mid.x - start.x, mid.z - start.z) <= plan.length / 2 + 1e-6);
  assert.ok(Number.isFinite(mid.heading));
  // Cap : l'avant (sin, cos) pointe vers la suite du tracé.
  const ahead = pointAlongPath(plan.points, plan.length / 2 + 0.5);
  const dx = ahead.x - mid.x;
  const dz = ahead.z - mid.z;
  if (Math.hypot(dx, dz) > 0.1) assert.ok(Math.sin(mid.heading) * dx + Math.cos(mid.heading) * dz > 0);
});

test('Taxi B2 : replanification depuis la position du taxi vers un nouvel arrêt', () => {
  const plan = planTaxiApproach(c('plateau'))!;
  const mid = pointAlongPath(plan.points, plan.length / 2);
  const newStop = nearestRoadPoint(c('treichville')).at;
  const re = taxiRouteTo({ x: mid.x, z: mid.z }, newStop);
  assert.ok(re);
  const end = re!.points[re!.points.length - 1];
  assert.ok(Math.hypot(end.x - newStop.x, end.z - newStop.z) < 0.5);
});

test('Taxi B2 : avance de 0 à 1 en freinant', () => {
  assert.equal(taxiProgress(0, 8), 0);
  assert.equal(taxiProgress(8, 8), 1);
  assert.equal(taxiProgress(100, 8), 1);
  assert.equal(taxiProgress(-3, 8), 0);
  assert.equal(taxiProgress(1, 0), 1);
  assert.ok(taxiProgress(4, 8) > 0.5, 'plus de la moitié du trajet à mi-temps (freinage)');
  assert.ok(taxiProgress(7, 8) < 1);
});
