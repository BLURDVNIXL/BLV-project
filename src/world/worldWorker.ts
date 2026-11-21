/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Web Worker : génère les chunks de la ville (données + texture de sol) et construit leur géométrie hors du fil
 * principal. Les tableaux typés sont transférés (pas de copie) ; le fil principal n'a plus qu'à créer les objets.
 */

import { generateChunk } from './city';
import { bakeGround } from './terrain';
import { buildChunkBuffers, bufferTransferList } from './chunkMesh';
import { initSimplifier } from './studioBake';
import type { LodLevel } from './lod';

const GROUND_SIZE = 192;
let reserved = new Set<string>();
// Charge le simplificateur une fois ; les demandes de chunk l'attendent (l'ordre des messages est conservé).
const simplifierReady = initSimplifier();

type Msg =
  | { type: 'init'; reserved: string[] }
  | { type: 'chunk'; id: number; cx: number; cz: number; lod?: LodLevel; withGround?: boolean };

self.onmessage = async (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    reserved = new Set(msg.reserved);
    return;
  }
  await simplifierReady;
  const data = generateChunk(msg.cx, msg.cz, { reservedLots: reserved });
  const ground = msg.withGround === false ? null : bakeGround(msg.cx, msg.cz, GROUND_SIZE);
  const buffers = buildChunkBuffers(data, msg.lod ?? 0);
  const transfer = bufferTransferList(buffers);
  if (ground) transfer.push(ground.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage({ id: msg.id, payload: { data, ground, buffers } }, transfer);
};
