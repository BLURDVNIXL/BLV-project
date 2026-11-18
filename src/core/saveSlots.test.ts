import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_DESTINIES } from './destinies';
import { createInitialPlayerState } from './simulation';
import { findHouseLot } from '../world/city';
import {
  cleanPosition,
  makeSlot,
  mergeSlotPair,
  mostRecentPlayable,
  pickSlotForNewGame,
  type SaveSlot,
  type SlotList,
} from './saveSlots';

test('cleanPosition accepte les coordonnées valides du monde et rejette les valeurs invalides ou intérieures', () => {
  assert.deepEqual(cleanPosition({ x: -812.5, z: 45.2, rotY: 1.5 }), { x: -812.5, z: 45.2, rotY: 1.5 });
  assert.deepEqual(cleanPosition({ x: 100, z: -200, rotY: Number.NaN }), { x: 100, z: -200, rotY: 0 });
  assert.equal(cleanPosition(undefined), undefined);
  assert.equal(cleanPosition({ x: Number.NaN, z: 0, rotY: 0 }), undefined);
  assert.equal(cleanPosition({ x: 4000, z: 0, rotY: 0 }), undefined);
  assert.equal(cleanPosition({ x: 2860, z: 2960, rotY: 0 }), undefined);
  assert.equal(cleanPosition({ x: 2860, z: 2860, rotY: 0 }), undefined);
  // Grand-Bassam reste bien accepté
  assert.deepEqual(cleanPosition({ x: 2438, z: 2018, rotY: 0 }), { x: 2438, z: 2018, rotY: 0 });
});

test('mergeSlotPair garde le plus récent et préserve une position valide du même destin si le plus récent n en a pas', () => {
  const st = createInitialPlayerState(ALL_DESTINIES[0], 'p1');
  const olderWithPos: SaveSlot = { ...makeSlot(st, 'Aya', { x: -720, z: 120, rotY: 0.4 }), savedAt: 1000 };
  const newerNoPos: SaveSlot = { ...makeSlot(st, 'Aya'), savedAt: 2000 };

  const merged = mergeSlotPair(newerNoPos, olderWithPos);
  assert.ok(merged);
  assert.equal(merged.savedAt, 2000);
  assert.deepEqual(merged.position, { x: -720, z: 120, rotY: 0.4 });

  const newerWithPos: SaveSlot = { ...makeSlot(st, 'Aya', { x: 300, z: -40, rotY: 2.1 }), savedAt: 3000 };
  const merged2 = mergeSlotPair(olderWithPos, newerWithPos);
  assert.deepEqual(merged2?.position, { x: 300, z: -40, rotY: 2.1 });
});

test('pickSlotForNewGame et mostRecentPlayable sélectionnent les bons emplacements', () => {
  const st = createInitialPlayerState(ALL_DESTINIES[0], 'p1');
  const slots: SlotList = [
    { ...makeSlot(st, 'S1'), savedAt: 500 },
    null,
    { ...makeSlot({ ...st, isGameOver: true }, 'S3'), savedAt: 900 },
    { ...makeSlot(st, 'S4'), savedAt: 700 },
    null,
  ];
  assert.deepEqual(pickSlotForNewGame(slots), { slot: 2, replaces: false });
  assert.equal(mostRecentPlayable(slots)?.slot, 4);
});

test('findHouseLot avec preferredLotId retrouve exactement la même parcelle même si playerId change', () => {
  const d = ALL_DESTINIES.find((x) => x.districtId === 'plateau') ?? ALL_DESTINIES[0];
  const original = findHouseLot(d.homeType, 12345, new Set(), d.districtId);
  assert.ok(original);
  const relocatedWithSameLotId = findHouseLot(d.homeType, 9999999, new Set(), d.districtId, original.id);
  assert.ok(relocatedWithSameLotId);
  assert.equal(relocatedWithSameLotId.id, original.id);
  assert.equal(relocatedWithSameLotId.x, original.x);
  assert.equal(relocatedWithSameLotId.z, original.z);
});
