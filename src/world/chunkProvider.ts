/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Fournisseur de chunks : la génération (bâtiments + sol, 10–25 ms par chunk) tourne dans un Web Worker
 * pour ne jamais saccader l'affichage. Repli synchrone si les Workers sont indisponibles.
 */

import { ChunkData } from './city';
import { generateChunk } from './city';
import { bakeGround } from './terrain';

export const GROUND_SIZE = 96;

export interface ChunkPayload { data: ChunkData; ground: Uint8Array }

export interface ChunkProvider {
  request(cx: number, cz: number): Promise<ChunkPayload>;
  dispose(): void;
}

export class SyncChunkProvider implements ChunkProvider {
  constructor(private reserved: string[] = []) {}
  request(cx: number, cz: number): Promise<ChunkPayload> {
    return Promise.resolve({ data: generateChunk(cx, cz, { reservedLots: new Set(this.reserved) }), ground: bakeGround(cx, cz, GROUND_SIZE) });
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

  request(cx: number, cz: number): Promise<ChunkPayload> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.waiting.set(id, resolve);
      this.worker.postMessage({ type: 'chunk', id, cx, cz });
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
