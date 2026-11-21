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
import { ChunkMaterials, ChunkObjects, assembleChunkObjects } from './chunkMesh';
import { ChunkProvider, GROUND_SIZE, ChunkPayload } from './chunkProvider';
import { OCCLUDER_MIN_HEIGHT, occluderOf, type Occluder } from './pedVisibility';
import { SHADOW_CASTER_RANGE, chunkDistance, lodForDistance, type LodLevel } from './lod';
import { CorridorChunk, corridorChunks, readyDistance } from './routePreload';
import type { Vec2 } from './geo';

/** Route de trajet préchargée : jusqu'à cette distance (m) devant le taxi, et cette distance derrière lui avant de libérer. */
const CORRIDOR_AHEAD = 1500;
const CORRIDOR_BEHIND = 128;

interface Loaded { cx: number; cz: number; objects: ChunkObjects; solids: number[]; occluders: Occluder[] }

const key = (cx: number, cz: number): string => `${cx},${cz}`;

export class WorldStreamer {
  private loaded = new Map<string, Loaded>();
  private pending = new Set<string>();
  private arrived: Array<{ cx: number; cz: number; payload: ChunkPayload }> = [];
  /** Reconstructions de niveau de détail demandées au Worker (clé de chunk) et leurs résultats à échanger. */
  private pendingLod = new Set<string>();
  private lodArrived: Array<{ k: string; payload: ChunkPayload }> = [];
  private disposed = false;
  private venuesVersion = 0;
  /** Rayon de chargement (en chunks de 64 m), modifiable en cours de partie (réglage de distance d'affichage). */
  radius: number;
  /** Nombre maximal de chunks déchargés par image. */
  maxUnloadPerUpdate = 6;
  /** Nombre maximal de requêtes simultanées auprès du Worker. */
  maxInFlight = 12;
  /** Nombre maximal de reconstructions de niveau de détail simultanées auprès du Worker. */
  maxLodInFlight = 2;
  /** Budget (ms) de construction de chunks par image en jeu normal ; le nombre de chunks de `update` reste un plafond. */
  applyBudgetMs = 6;
  /** Temps (ms) passé à construire des chunks pendant la dernière image (diagnostic). */
  lastApplyMs = 0;
  /** Construction la plus longue d'un seul chunk (ms), remise à zéro par `takeWorstChunkMs` (diagnostic). */
  private worstChunkMs = 0;
  /** Route d'un trajet à précharger (taxi) : chunks traversés, fenêtre active autour de la progression et clés à garder. */
  private corridor: CorridorChunk[] = [];
  private corridorLength = 0;
  private corridorS = 0;
  private corridorActive: CorridorChunk[] = [];
  private corridorKeep = new Set<string>();
  /** Faux pendant la cinématique du taxi : les reconstructions de niveau de détail laisseraient le Worker aux chunks de la route. */
  lodRefresh = true;

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

  /**
   * Route à précharger (null pour l'arrêter). Les chunks traversés par `points` sont chargés en priorité après ceux
   * qui entourent le joueur, et gardés tant que le trajet n'est pas passé. Chaque appareil précharge sa propre route.
   */
  setCorridor(points: Vec2[] | null): void {
    this.corridor = points && points.length > 0 ? corridorChunks(points) : [];
    this.corridorLength = this.corridor.reduce((m, c) => Math.max(m, c.d), 0);
    this.corridorS = 0;
    this.refreshCorridor();
  }

  /** Progression (m) du trajet : la fenêtre de préchargement glisse avec elle et les chunks dépassés sont libérés. */
  setCorridorProgress(s: number): void {
    if (this.corridor.length === 0) return;
    this.corridorS = Math.max(0, s);
    this.refreshCorridor();
  }

  get hasCorridor(): boolean { return this.corridor.length > 0; }

  /** Distance (m) jusqu'où le trajet peut avancer sans rouler sur un chunk non chargé ; Infinity si tout est prêt. */
  corridorReadyDistance(): number {
    if (this.corridorActive.length === 0) return Infinity;
    return readyDistance(this.corridorActive, (cx, cz) => this.loaded.has(key(cx, cz)));
  }

  private refreshCorridor(): void {
    const s = this.corridorS;
    // La zone d'arrivée (distance = longueur du trajet) est toujours demandée : elle doit être prête avant la fin.
    this.corridorActive = this.corridor.filter(
      (c) => c.d >= s - CORRIDOR_BEHIND && (c.d <= s + CORRIDOR_AHEAD || c.d >= this.corridorLength)
    );
    this.corridorKeep = new Set(this.corridorActive.map((c) => key(c.cx, c.cz)));
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
    if (!payload.ground) return; // un chunk neuf arrive toujours avec son sol
    const objects = assembleChunkObjects(payload.data, payload.buffers, payload.ground, GROUND_SIZE, this.mats);
    this.scene.add(objects.group);
    const occluders = payload.data.buildings.filter((b) => b.solid && b.h >= OCCLUDER_MIN_HEIGHT).map(occluderOf);
    this.loaded.set(k, { cx, cz, objects, solids: this.registerSolids(payload.data, objects.solids), occluders });
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

  /** Échange la géométrie d'un chunk contre celle du niveau de détail reconstruit par le Worker (instantané). */
  private applyLod(k: string, payload: ChunkPayload): void {
    const l = this.loaded.get(k);
    if (!l || this.disposed) return;
    const t0 = performance.now();
    l.objects.swapDetail(payload.buffers, this.mats);
    this.lastApplyMs += performance.now() - t0;
  }

  /**
   * Niveaux de détail et ombres, sur CET appareil et autour de CE joueur (chaque client calcule les siens).
   * Le niveau ne dépend que de la distance du chunk : tourner la tête ne change rien. Un chunk qui s'éloigne ou se
   * rapproche d'un seuil est reconstruit en arrière-plan ; l'ancienne géométrie reste affichée jusqu'à l'échange.
   */
  private updateDetail(px: number, pz: number): void {
    if (!this.lodRefresh) return;
    const wanted: Array<{ k: string; cx: number; cz: number; lod: LodLevel; finer: boolean; dist: number }> = [];
    for (const [k, l] of this.loaded) {
      const dist = chunkDistance(px, pz, l.cx, l.cz);
      l.objects.setShadowCasting(dist <= SHADOW_CASTER_RANGE);
      if (this.pendingLod.has(k)) continue;
      const want = lodForDistance(dist, l.objects.lod);
      if (want !== l.objects.lod) wanted.push({ k, cx: l.cx, cz: l.cz, lod: want, finer: want < l.objects.lod, dist });
    }
    if (wanted.length === 0) return;
    // Les chunks qui se rapprochent d'abord (ils doivent redevenir fins avant d'être vus de près), puis les plus proches.
    wanted.sort((a, b) => (a.finer === b.finer ? a.dist - b.dist : a.finer ? -1 : 1));
    for (const w of wanted) {
      if (this.pendingLod.size >= this.maxLodInFlight) break;
      this.pendingLod.add(w.k);
      this.provider.request(w.cx, w.cz, w.lod, false).then((payload) => {
        this.pendingLod.delete(w.k);
        if (!this.disposed) this.lodArrived.push({ k: w.k, payload });
      });
    }
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
      if (Math.max(Math.abs(a.cx - ccx), Math.abs(a.cz - ccz)) <= R + 1 || this.corridorKeep.has(key(a.cx, a.cz))) { this.apply(a.cx, a.cz, a.payload); applied++; }
    }

    // Échanges de niveau de détail (très peu coûteux : la géométrie est déjà construite par le Worker)
    for (let n = 0; n < 2 && this.lodArrived.length > 0; n++) {
      const a = this.lodArrived.shift()!;
      this.applyLod(a.k, a.payload);
    }

    // Décharge les lointains (au plus `maxUnloadPerUpdate` par image : réduire le rayon ne doit pas libérer des dizaines de chunks d'un coup)
    let unloaded = 0;
    for (const k of Array.from(this.loaded.keys())) {
      if (unloaded >= this.maxUnloadPerUpdate) break;
      if (this.corridorKeep.has(k)) continue;
      const [x, z] = k.split(',').map(Number);
      if (Math.max(Math.abs(x - ccx), Math.abs(z - ccz)) > R + 1) { this.unload(k); unloaded++; }
    }

    this.updateDetail(px, pz);

    // Demande les plus proches d'abord
    if (this.pending.size >= this.maxInFlight) return;
    // Priorité : les chunks tout proches (≤ 2 anneaux), puis la route du trajet (de la plus proche à la plus lointaine), puis le reste du rayon.
    const wantedMap = new Map<string, { cx: number; cz: number; p: number }>();
    const want = (cx: number, cz: number, p: number): void => {
      const k = key(cx, cz);
      if (this.loaded.has(k) || this.pending.has(k)) return;
      const prev = wantedMap.get(k);
      if (!prev || p < prev.p) wantedMap.set(k, { cx, cz, p });
    };
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) want(ccx + dx, ccz + dz, dx * dx + dz * dz);
    for (const c of this.corridorActive) want(c.cx, c.cz, 8.5 + Math.max(0, c.d - this.corridorS) / (CHUNK * 100));
    const wanted = Array.from(wantedMap.values()).sort((a, b) => a.p - b.p);
    for (const w of wanted) {
      if (this.pending.size >= this.maxInFlight) break;
      const k = key(w.cx, w.cz);
      this.pending.add(k);
      this.provider.request(w.cx, w.cz, lodForDistance(chunkDistance(px, pz, w.cx, w.cz), null), true).then((payload) => {
        this.pending.delete(k);
        if (!this.disposed) this.arrived.push({ cx: w.cx, cz: w.cz, payload });
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const k of Array.from(this.loaded.keys())) this.unload(k);
    this.arrived = [];
    this.lodArrived = [];
    this.pendingLod.clear();
    this.provider.dispose();
  }
}

export { CHUNK };
