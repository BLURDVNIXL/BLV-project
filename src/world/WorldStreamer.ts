/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Chargement par zones : charge autour du joueur les chunks proches (maillages + solides physiques),
 * décharge les lointains. La physique reçoit ses solides à l'arrivée du chunk et les retire au départ.
 */

import * as THREE from 'three';
import { PhysicsCore, SolidFlag } from '../physics/PhysicsCore';
import { CHUNK, ChunkData, chunkOf } from './city';
import { ChunkMaterials, ChunkObjects, buildChunkObjects } from './chunkMesh';
import { ChunkProvider, GROUND_SIZE, ChunkPayload } from './chunkProvider';

interface Loaded { objects: ChunkObjects; solids: number[] }

const key = (cx: number, cz: number): string => `${cx},${cz}`;

export class WorldStreamer {
  private loaded = new Map<string, Loaded>();
  private pending = new Set<string>();
  private arrived: Array<{ cx: number; cz: number; payload: ChunkPayload }> = [];
  private disposed = false;
  /** Rayon de chargement (en chunks de 64 m). */
  radius: number;
  /** Nombre maximal de requêtes simultanées auprès du Worker. */
  maxInFlight = 6;

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsCore,
    private provider: ChunkProvider,
    private mats: ChunkMaterials,
    radius = 4
  ) {
    this.radius = radius;
  }

  get loadedCount(): number { return this.loaded.size; }

  /** Vrai si tous les chunks dans le rayon donné (en chunks) autour du point sont chargés. */
  isReady(px: number, pz: number, rings: number): boolean {
    const ccx = chunkOf(px);
    const ccz = chunkOf(pz);
    for (let dx = -rings; dx <= rings; dx++) for (let dz = -rings; dz <= rings; dz++) if (!this.loaded.has(key(ccx + dx, ccz + dz))) return false;
    return true;
  }

  private registerSolids(data: ChunkData): number[] {
    const ids: number[] = [];
    const add = (id: number): void => { if (id >= 0) ids.push(id); };
    for (const b of data.buildings) {
      if (!b.solid) continue;
      add(this.physics.addBox(b.x, b.z, b.w / 2, b.d / 2, b.angle, b.h, SolidFlag.BUILDING));
    }
    for (const t of data.trees) add(this.physics.addCircle(t.x, t.z, t.r, t.h, SolidFlag.PROP));
    for (const w of data.water) add(this.physics.addBox(w.x, w.z, w.hx, w.hz, 0, 3, SolidFlag.WATER));
    return ids;
  }

  private apply(cx: number, cz: number, payload: ChunkPayload): void {
    const k = key(cx, cz);
    if (this.loaded.has(k) || this.disposed) return;
    const objects = buildChunkObjects(payload.data, payload.ground, GROUND_SIZE, this.mats);
    this.scene.add(objects.group);
    this.loaded.set(k, { objects, solids: this.registerSolids(payload.data) });
  }

  private unload(k: string): void {
    const l = this.loaded.get(k);
    if (!l) return;
    this.scene.remove(l.objects.group);
    l.objects.dispose();
    for (const id of l.solids) this.physics.removeSolid(id);
    this.loaded.delete(k);
  }

  /** À appeler à chaque image : demande, applique (budget limité) et décharge. */
  update(px: number, pz: number, maxApply = 2): void {
    if (this.disposed) return;
    const ccx = chunkOf(px);
    const ccz = chunkOf(pz);
    const R = this.radius;

    // Applique les chunks arrivés (s'ils sont encore utiles)
    let applied = 0;
    while (this.arrived.length > 0 && applied < maxApply) {
      const a = this.arrived.shift()!;
      if (Math.max(Math.abs(a.cx - ccx), Math.abs(a.cz - ccz)) <= R + 1) { this.apply(a.cx, a.cz, a.payload); applied++; }
    }

    // Décharge les lointains
    for (const k of Array.from(this.loaded.keys())) {
      const [x, z] = k.split(',').map(Number);
      if (Math.max(Math.abs(x - ccx), Math.abs(z - ccz)) > R + 1) this.unload(k);
    }

    // Demande les plus proches d'abord
    if (this.pending.size >= this.maxInFlight) return;
    const wanted: Array<{ cx: number; cz: number; d: number }> = [];
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      const cx = ccx + dx;
      const cz = ccz + dz;
      const k = key(cx, cz);
      if (this.loaded.has(k) || this.pending.has(k)) continue;
      wanted.push({ cx, cz, d: dx * dx + dz * dz });
    }
    wanted.sort((a, b) => a.d - b.d);
    for (const w of wanted) {
      if (this.pending.size >= this.maxInFlight) break;
      const k = key(w.cx, w.cz);
      this.pending.add(k);
      this.provider.request(w.cx, w.cz).then((payload) => {
        this.pending.delete(k);
        if (!this.disposed) this.arrived.push({ cx: w.cx, cz: w.cz, payload });
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const k of Array.from(this.loaded.keys())) this.unload(k);
    this.arrived = [];
    this.provider.dispose();
  }
}

export { CHUNK };
