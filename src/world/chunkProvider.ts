/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Fournisseur de chunks : la génération (bâtiments + sol) ET la construction de la géométrie (arbres, décor, façades :
 * 100 à 250 ms par chunk en forêt) tournent dans un Web Worker du navigateur, sur l'appareil du joueur, pour ne jamais
 * saccader l'affichage (deux Workers sur les appareils à plus de 2 cœurs) : le fil principal ne fait plus que créer les objets Three.js. Repli synchrone si les Workers
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

/**
 * Nombre de Workers de construction : un seul construisait un chunk de forêt dense en ~190 ms, soit 15 s pour remplir
 * le rayon 4 depuis le départ. Deux Workers doublent presque le débit ; un appareil à 2 cœurs ou moins n'en garde qu'un.
 */
export function chunkWorkerCount(hardwareConcurrency?: number): number {
  const cores = Number.isFinite(hardwareConcurrency) && (hardwareConcurrency as number) > 0 ? (hardwareConcurrency as number) : 4;
  return cores <= 2 ? 1 : 2;
}

interface PoolWorker { worker: Worker; busy: number }

export class WorkerChunkProvider implements ChunkProvider {
  private pool: PoolWorker[] = [];
  private nextId = 1;
  private waiting = new Map<number, { resolve: (p: ChunkPayload) => void; w: PoolWorker }>();

  constructor(reserved: string[] = [], count: number = chunkWorkerCount(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined)) {
    for (let i = 0; i < Math.max(1, count); i++) {
      const worker = new Worker(new URL('./worldWorker.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ type: 'init', reserved });
      const w: PoolWorker = { worker, busy: 0 };
      worker.onmessage = (e: MessageEvent<WorkerReply>) => {
        const entry = this.waiting.get(e.data.id);
        if (entry) { this.waiting.delete(e.data.id); w.busy = Math.max(0, w.busy - 1); entry.resolve(e.data.payload); }
      };
      this.pool.push(w);
    }
  }

  request(cx: number, cz: number, lod: LodLevel = 0, withGround = true): Promise<ChunkPayload> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      // Le Worker le moins occupé : les demandes arrivent déjà triées du plus urgent au moins urgent.
      let w = this.pool[0];
      for (const c of this.pool) if (c.busy < w.busy) w = c;
      w.busy++;
      this.waiting.set(id, { resolve, w });
      w.worker.postMessage({ type: 'chunk', id, cx, cz, lod, withGround });
    });
  }

  dispose(): void {
    for (const w of this.pool) w.worker.terminate();
    this.pool = [];
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
