import assert from 'node:assert/strict';
import test from 'node:test';
import { pickPunchTarget, PUNCH_RANGE } from './punch';

test('coup : le plus proche devant le joueur est touché', () => {
  const i = pickPunchTarget(0, 0, 0, 1, [{ x: 0, z: 1.4 }, { x: 0.2, z: 0.9 }]);
  assert.equal(i, 1);
});
test('coup : hors portée, derrière ou hors cône = raté', () => {
  assert.equal(pickPunchTarget(0, 0, 0, 1, [{ x: 0, z: PUNCH_RANGE + 0.3 }]), -1);
  assert.equal(pickPunchTarget(0, 0, 0, 1, [{ x: 0, z: -1 }]), -1);
  assert.equal(pickPunchTarget(0, 0, 0, 1, [{ x: 1.4, z: 0.1 }]), -1);
});
test('coup : un PNJ collé au joueur est touché', () => {
  assert.equal(pickPunchTarget(0, 0, 0, 1, [{ x: 0.1, z: -0.1 }]), 0);
});
