import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIMED_ACTION_SPECS,
  canStartTimedAction,
  computeTimedActionProgress,
  hotspotTypeToTimedAction,
  isTimedActionComplete,
  isTimedBodyAction,
  timedActionBlocksMovement,
  timedActionDurationS,
  type TimedActionKind,
} from './timedActions';

test('toutes les actions chronométrées durent entre 5 et 30 s', () => {
  const kinds = Object.keys(TIMED_ACTION_SPECS) as TimedActionKind[];
  for (const kind of kinds) {
    const s = timedActionDurationS(kind);
    assert.ok(s >= 5 && s <= 30, `${kind} hors plage 5-30 s (${s})`);
  }
  assert.equal(timedActionDurationS('eat'), 5);
  assert.equal(timedActionDurationS('toilet'), 5);
  assert.equal(timedActionDurationS('loto'), 5);
  assert.equal(timedActionDurationS('yannis_academy'), 5);
  assert.equal(timedActionDurationS('shower'), 8);
  assert.equal(timedActionDurationS('repair_engine'), 8);
  assert.equal(timedActionDurationS('black_market'), 8);
  assert.equal(timedActionDurationS('vieux_sage'), 10);
  assert.equal(timedActionDurationS('sleep'), 20);
  assert.equal(timedActionDurationS('taxi_wait', 14), 14);
  assert.equal(timedActionDurationS('taxi_ride', 27), 27);
  // Bornage même en cas de valeur extrême
  assert.equal(timedActionDurationS('taxi_wait', 2), 5);
  assert.equal(timedActionDurationS('taxi_ride', 99), 30);
});

test('règles d’immobilisation : attente taxi libre, autres actions bloquent le mouvement', () => {
  assert.equal(timedActionBlocksMovement(null), false);
  assert.equal(timedActionBlocksMovement('taxi_wait'), false);
  assert.equal(timedActionBlocksMovement('taxi_ride'), true);
  assert.equal(timedActionBlocksMovement('eat'), true);
  assert.equal(timedActionBlocksMovement('sleep'), true);
  assert.equal(timedActionBlocksMovement('shower'), true);
  assert.equal(timedActionBlocksMovement('repair_engine'), true);
});

test('mapping hotspot -> action chronométrée (entrées/sorties/banque restent instantanés)', () => {
  assert.equal(hotspotTypeToTimedAction('eat'), 'eat');
  assert.equal(hotspotTypeToTimedAction('sleep'), 'sleep');
  assert.equal(hotspotTypeToTimedAction('shower'), 'shower');
  assert.equal(hotspotTypeToTimedAction('toilet'), 'toilet');
  assert.equal(hotspotTypeToTimedAction('loto'), 'loto');
  assert.equal(hotspotTypeToTimedAction('vieux_sage'), 'vieux_sage');
  assert.equal(hotspotTypeToTimedAction('black_market'), 'black_market');
  assert.equal(hotspotTypeToTimedAction('yannis_academy'), 'yannis_academy');
  assert.equal(hotspotTypeToTimedAction('interior_door'), null);
  assert.equal(hotspotTypeToTimedAction('interior_exit'), null);
  assert.equal(hotspotTypeToTimedAction('interior_stairs'), null);
  assert.equal(hotspotTypeToTimedAction('bank'), null);
  assert.equal(hotspotTypeToTimedAction('work'), null);
});

test('progression [0..1], fin d’action, corps animé et verrouillage de concurrence', () => {
  assert.equal(computeTimedActionProgress(1000, 5000, 900), 0);
  assert.equal(computeTimedActionProgress(1000, 5000, 3500), 0.5);
  assert.equal(computeTimedActionProgress(1000, 5000, 7000), 1);
  assert.equal(isTimedActionComplete(1000, 5000, 5999), false);
  assert.equal(isTimedActionComplete(1000, 5000, 6000), true);

  assert.equal(isTimedBodyAction('eat'), true);
  assert.equal(isTimedBodyAction('repair_engine'), true);
  assert.equal(isTimedBodyAction('taxi_wait'), false);
  assert.equal(isTimedBodyAction('taxi_ride'), false);

  assert.equal(canStartTimedAction(null, 'eat'), true);
  assert.equal(canStartTimedAction('eat', 'sleep'), false);
  assert.equal(canStartTimedAction('taxi_wait', 'eat'), false);
  assert.equal(canStartTimedAction('taxi_wait', 'taxi_ride'), true);
});
