/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Fournisseur de chunks : la génération (bâtiments + sol) ET la construction de la géométrie (arbres, décor, façades :
 * 100 à 250 ms par chunk en forêt) tournent dans un Web Worker du navigateur, sur l'appareil du joueur, pour ne jamais
 * saccader l'affichage : le fil principal ne fait plus que créer les objets Three.js. Repli synchrone si les Workers
 * sont indisponibles.
 */

import { ChunkData } from './city';
import { generateChunk } from './city';
import { bakeGround } from './terrain';
import { ChunkBuffers, buildChunkBuffers } from './chunkMesh';
import { initSimplifier } from './studioBake';
import type { LodLevel } from './lod';

export const GROUND_SIZE = 192;

/** `ground` est null pour une reconstruction de niveau de détail (le sol du chunk est déjà à l'écran). */
export interface ChunkPayload { data: ChunkData; ground: Uint8Array | null; buffers: ChunkBuffers }

export interface ChunkProvider {
  request(cx: number, cz: number, lod?: LodLevel, withGround?: boolean): Promise<ChunkPayload>;
  dispose(): void;
}

export class SyncChunkProvider implements ChunkProvider {
  constructor(private reserved: string[] = []) {
    void initSimplifier(); // tant qu'il n'est pas prêt, les modèles restent au niveau 0
  }
  request(cx: number, cz: number, lod: LodLevel = 0, withGround = true): Promise<ChunkPayload> {
    const data = generateChunk(cx, cz, { reservedLots: new Set(this.reserved) });
    return Promise.resolve({ data, ground: withGround ? bakeGround(cx, cz, GROUND_SIZE) : null, buffers: buildChunkBuffers(data, lod) });
  }
  dispose(): void {}
}

interface WorkerReply { id: number; payload: ChunkPayload }

export class WorkerChunkProvider implements ChunkProvider {
  private worker: Worker;
  private nextId = 1;
  private waiting = new Map<number, (p: ChunkPayload) => void>();

  constructor(reserved: string[] = []) {
    this.worker = new Worker(new URL('./worldWorker.ts', import.meta.url), { type: 'module' });
    this.worker.postMessage({ type: 'init', reserved });
    this.worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      const cb = this.waiting.get(e.data.id);
      if (cb) { this.waiting.delete(e.data.id); cb(e.data.payload); }
    };
  }

  request(cx: number, cz: number, lod: LodLevel = 0, withGround = true): Promise<ChunkPayload> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.waiting.set(id, resolve);
      this.worker.postMessage({ type: 'chunk', id, cx, cz, lod, withGround });
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.waiting.clear();
  }
}

/** Worker si disponible, sinon calcul synchrone. */
export function createChunkProvider(reserved: string[] = []): ChunkProvider {
  try {
    if (typeof Worker !== 'undefined') return new WorkerChunkProvider(reserved);
  } catch {
    /* repli synchrone */
  }
  return new SyncChunkProvider(reserved);
}
