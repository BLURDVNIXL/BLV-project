/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Chargement par zones : charge autour du joueur les chunks proches (maillages + solides physiques),
 * décharge les lointains. La physique reçoit ses solides à l'arrivée du chunk et les retire au départ.
 */

import * as THREE from 'three';
import { PhysicsCore, SolidFlag } from '../physics/PhysicsCore';
import { CHUNK, ChunkData, chunkOf } from './city';
import { ChunkSolid, StreetVenueDecor } from './chunkDecor';
import { ChunkMaterials, ChunkObjects, buildChunkObjects } from './chunkMesh';
import { ChunkProvider, GROUND_SIZE, ChunkPayload } from './chunkProvider';
import { OCCLUDER_MIN_HEIGHT, occluderOf, type Occluder } from './pedVisibility';

interface Loaded { objects: ChunkObjects; solids: number[]; occluders: Occluder[] }

const key = (cx: number, cz: number): string => `${cx},${cz}`;

export class WorldStreamer {
  private loaded = new Map<string, Loaded>();
  private pending = new Set<string>();
  private arrived: Array<{ cx: number; cz: number; payload: ChunkPayload }> = [];
  private disposed = false;
  private venuesVersion = 0;
  /** Rayon de chargement (en chunks de 64 m), modifiable en cours de partie (réglage de distance d'affichage). */
  radius: number;
  /** Nombre maximal de chunks déchargés par image. */
  maxUnloadPerUpdate = 6;
  /** Nombre maximal de requêtes simultanées auprès du Worker. */
  maxInFlight = 12;
  /** Budget (ms) de construction de chunks par image en jeu normal ; le nombre de chunks de `update` reste un plafond. */
  applyBudgetMs = 6;
  /** Temps (ms) passé à construire des chunks pendant la dernière image (diagnostic). */
  lastApplyMs = 0;
  /** Construction la plus longue d'un seul chunk (ms), remise à zéro par `takeWorstChunkMs` (diagnostic). */
  private worstChunkMs = 0;

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

  /** Nombre de chunks reçus du Worker et pas encore construits (file d'attente). */
  get arrivedCount(): number { return this.arrived.length; }

  /** Renvoie puis remet à zéro le pire temps de construction d'un chunk depuis le dernier appel (ms). */
  takeWorstChunkMs(): number {
    const v = this.worstChunkMs;
    this.worstChunkMs = 0;
    return v;
  }

  getVenuesVersion(): number { return this.venuesVersion; }

  getLoadedVenues(): StreetVenueDecor[] {
    const out: StreetVenueDecor[] = [];
    for (const l of this.loaded.values()) {
      for (const v of l.objects.venues) out.push(v);
    }
    return out;
  }

  /** Remplit `out` avec les emprises de bâtiments hauts des chunks chargés dans `rings` autour du point (visibilité des PNJ). */
  collectOccluders(px: number, pz: number, rings: number, out: Occluder[]): Occluder[] {
    out.length = 0;
    const ccx = chunkOf(px);
    const ccz = chunkOf(pz);
    for (let dx = -rings; dx <= rings; dx++) {
      for (let dz = -rings; dz <= rings; dz++) {
        const l = this.loaded.get(key(ccx + dx, ccz + dz));
        if (l) for (const o of l.occluders) out.push(o);
      }
    }
    return out;
  }

  /** Vrai si tous les chunks dans le rayon donné (en chunks) autour du point sont chargés. */
  isReady(px: number, pz: number, rings: number): boolean {
    const ccx = chunkOf(px);
    const ccz = chunkOf(pz);
    for (let dx = -rings; dx <= rings; dx++) for (let dz = -rings; dz <= rings; dz++) if (!this.loaded.has(key(ccx + dx, ccz + dz))) return false;
    return true;
  }

  private registerSolids(data: ChunkData, decorSolids: ChunkSolid[]): number[] {
    const ids: number[] = [];
    const add = (id: number): void => { if (id >= 0) ids.push(id); };
    for (const b of data.buildings) {
      if (!b.solid) continue;
      add(this.physics.addBox(b.x, b.z, b.w / 2, b.d / 2, b.angle, b.h, SolidFlag.BUILDING));
    }
    for (const t of data.trees) add(this.physics.addCircle(t.x, t.z, t.r, t.h, SolidFlag.PROP));
    for (const s of decorSolids) {
      if (s.shape === 'box') add(this.physics.addBox(s.x, s.z, s.hx, s.hz, s.angle, s.h, SolidFlag.PROP));
      else add(this.physics.addCircle(s.x, s.z, s.r, s.h, SolidFlag.PROP));
    }
    for (const w of data.water) add(this.physics.addBox(w.x, w.z, w.hx, w.hz, 0, 3, SolidFlag.WATER));
    return ids;
  }

  private apply(cx: number, cz: number, payload: ChunkPayload): void {
    const k = key(cx, cz);
    if (this.loaded.has(k) || this.disposed) return;
    const t0 = performance.now();
    const objects = buildChunkObjects(payload.data, payload.ground, GROUND_SIZE, this.mats);
    this.scene.add(objects.group);
    const occluders = payload.data.buildings.filter((b) => b.solid && b.h >= OCCLUDER_MIN_HEIGHT).map(occluderOf);
    this.loaded.set(k, { objects, solids: this.registerSolids(payload.data, objects.solids), occluders });
    if (objects.venues.length > 0) this.venuesVersion++;
    const cost = performance.now() - t0;
    this.lastApplyMs += cost;
    if (cost > this.worstChunkMs) this.worstChunkMs = cost;
  }

  private unload(k: string): void {
    const l = this.loaded.get(k);
    if (!l) return;
    this.scene.remove(l.objects.group);
    l.objects.dispose();
    for (const id of l.solids) this.physics.removeSolid(id);
    if (l.objects.venues.length > 0) this.venuesVersion++;
    this.loaded.delete(k);
  }

  /** À appeler à chaque image : demande, applique (budget limité) et décharge. */
  update(px: number, pz: number, maxApply = 2): void {
    if (this.disposed) return;
    const ccx = chunkOf(px);
    const ccz = chunkOf(pz);
    const R = this.radius;

    // Applique les chunks arrivés (s'ils sont encore utiles), en s'arrêtant dès que le budget de temps est dépensé.
    // Au moins un chunk est toujours appliqué (pas de famine), et le chargement initial (maxApply >= 8) a un budget triplé.
    this.lastApplyMs = 0;
    const budget = maxApply >= 8 ? this.applyBudgetMs * 3 : this.applyBudgetMs;
    const tStart = performance.now();
    let applied = 0;
    while (this.arrived.length > 0 && applied < maxApply) {
      if (applied > 0 && performance.now() - tStart >= budget) break;
      const a = this.arrived.shift()!;
      if (Math.max(Math.abs(a.cx - ccx), Math.abs(a.cz - ccz)) <= R + 1) { this.apply(a.cx, a.cz, a.payload); applied++; }
    }

    // Décharge les lointains (au plus `maxUnloadPerUpdate` par image : réduire le rayon ne doit pas libérer des dizaines de chunks d'un coup)
    let unloaded = 0;
    for (const k of Array.from(this.loaded.keys())) {
      if (unloaded >= this.maxUnloadPerUpdate) break;
      const [x, z] = k.split(',').map(Number);
      if (Math.max(Math.abs(x - ccx), Math.abs(z - ccz)) > R + 1) { this.unload(k); unloaded++; }
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
