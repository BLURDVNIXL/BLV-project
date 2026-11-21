import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkWorkerCount } from './chunkProvider';

test('Workers : un seul sur 2 cœurs ou moins, deux au-delà, deux si le nombre de cœurs est inconnu', () => {
  assert.equal(chunkWorkerCount(1), 1);
  assert.equal(chunkWorkerCount(2), 1);
  assert.equal(chunkWorkerCount(4), 2);
  assert.equal(chunkWorkerCount(16), 2);
  assert.equal(chunkWorkerCount(undefined), 2);
  assert.equal(chunkWorkerCount(0), 2);
  assert.equal(chunkWorkerCount(NaN), 2);
});
