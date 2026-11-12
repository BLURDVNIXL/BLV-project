/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Web Worker : génère les chunks de la ville (données + texture de sol) hors du fil principal.
 */

import { generateChunk } from './city';
import { bakeGround } from './terrain';

const GROUND_SIZE = 96;
let reserved = new Set<string>();

self.onmessage = (e: MessageEvent<{ type: 'init'; reserved: string[] } | { type: 'chunk'; id: number; cx: number; cz: number }>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    reserved = new Set(msg.reserved);
    return;
  }
  const data = generateChunk(msg.cx, msg.cz, { reservedLots: reserved });
  const ground = bakeGround(msg.cx, msg.cz, GROUND_SIZE);
  (self as unknown as Worker).postMessage({ id: msg.id, payload: { data, ground } }, [ground.buffer]);
};
