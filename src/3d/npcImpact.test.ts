import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLEE_MAX_SECONDS, FLEE_MIN_SECONDS, WITNESS_PAUSE_MAX, WITNESS_PAUSE_MIN, WITNESS_RADIUS,
  fleeDuration, unitDir, vehicleSeverity, witnessIndices, witnessPause,
} from './npcImpact';

test('Impact : la gravité d\'un choc de véhicule suit la vitesse (seuils 5 et 12 m/s)', () => {
  assert.equal(vehicleSeverity(0), 1);
  assert.equal(vehicleSeverity(4.99), 1);
  assert.equal(vehicleSeverity(5), 2);
  assert.equal(vehicleSeverity(12), 2);
  assert.equal(vehicleSeverity(12.01), 3);
});

test('Impact : la fuite dure entre 4 et 6 s', () => {
  assert.equal(fleeDuration(0), FLEE_MIN_SECONDS);
  assert.equal(fleeDuration(1), FLEE_MAX_SECONDS);
  assert.equal(fleeDuration(0.5), 5);
  assert.equal(fleeDuration(-2), FLEE_MIN_SECONDS);
  assert.equal(fleeDuration(9), FLEE_MAX_SECONDS);
});

test('Impact : l\'arrêt des témoins dure entre 1,5 et 3 s', () => {
  assert.equal(witnessPause(0), WITNESS_PAUSE_MIN);
  assert.equal(witnessPause(1), WITNESS_PAUSE_MAX);
});

test('Impact : une direction est ramenée à 1, ou au repli si elle est nulle', () => {
  const d = unitDir(3, 4);
  assert.ok(Math.abs(d.x - 0.6) < 1e-9 && Math.abs(d.z - 0.8) < 1e-9);
  assert.deepEqual(unitDir(0, 0, { x: 0, z: 1 }), { x: 0, z: 1 });
  assert.deepEqual(unitDir(0, 0), { x: 1, z: 0 });
});

test('Impact : seuls les voisins à moins de 8 m sont témoins', () => {
  const cands = [{ x: 0, z: 3 }, { x: 8, z: 0 }, { x: 8.01, z: 0 }, { x: 20, z: 20 }, { x: -5, z: -5 }];
  assert.equal(WITNESS_RADIUS, 8);
  assert.deepEqual(witnessIndices(0, 0, cands), [0, 1, 4]);
  assert.deepEqual(witnessIndices(0, 0, [], 8), []);
  assert.deepEqual(witnessIndices(0, 0, cands, 1), []);
});
