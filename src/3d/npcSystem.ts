/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Gestionnaire de piétons ivoiriens (PNJ d'ambiance) PHYSIQUES en extérieur.
 *  - Un pool de personnages du moteur (`createCharacter`), créés une fois et réutilisés
 *    (`setCharacterEnabled`, `placeCharacter`) : les PNJ sont bloqués par les murs, les étals, les autres
 *    PNJ et le joueur, et renversés par les véhicules (`stun`).
 *  - Les PNJ marchent avec `characterInput` et on lit `readCharacter` pour poser leur instance
 *    (rendu instancié, `npcInstances.ts`). Aucun trajet précalculé.
 *  - Les vendeurs du marché, immobiles, sont de simples cercles statiques (`addCircle`, `PROP`).
 *  - Dans un intérieur (`setIndoor(true)`), les PNJ de la rue sont désactivés ; ceux de la salle (déclarés dans
 *    `InteriorDef.npcs`) prennent leur place : marcheurs = personnages du pool, immobiles = cercles solides.
 *    À la sortie la salle est vidée et la rue est replacée.
 * Les PNJ sont locaux : rien n'est transmis au serveur. Aucune conséquence de jeu (police, score).
 */

import * as THREE from 'three';
import { createCharacterState, SolidFlag, type CharacterState, type PhysicsCore } from '../physics/PhysicsCore';
import { districtAt, isWater } from '../world/abidjanGeography';
import { SPECIAL_FOOTPRINTS } from '../world/city';
import { localToWorld } from '../world/exteriorSolids';
import { interiorToWorld, type InteriorDef } from '../world/interiors';
import { generateAppearance, type NpcRole } from '../world/npcAppearance';
import {
  NPC_CROWD_CAPACITY, NPC_DESPAWN_DIST, NPC_FAR_AI_DIST, NPC_MARKET_DIST, NPC_POOL_SIZE, NPC_SPAWN_MAX, NPC_SPAWN_MIN,
} from '../world/budgets';
import { bridgeAt } from '../world/roads';
import { NpcCrowd, type NpcHandle } from './npcInstances';

/** Budgets (nombre, distances, fréquence d'IA, capacité) : tous réglés dans `src/world/budgets.ts`. */
const CROWD_CAPACITY = NPC_CROWD_CAPACITY;
const DESPAWN_DIST = NPC_DESPAWN_DIST;
const MARKET_DIST = NPC_MARKET_DIST;
const SPAWN_MIN = NPC_SPAWN_MIN;
const SPAWN_MAX = NPC_SPAWN_MAX;
const FAR_AI_DIST = NPC_FAR_AI_DIST;
const YIELD_DIST = 2.5;
const YIELD_STOP_DIST = 1.6;
const FAN_STOP_DIST = 3.6;
/** Blocage : en `STUCK_WINDOW` s, moins de `STUCK_MIN_MOVE` m alors qu'il veut avancer. */
const STUCK_WINDOW = 1.0;
const STUCK_MIN_MOVE = 0.15;
const SPAWNS_PER_FRAME = 6;
const FALL_TILT = 1.35;
/** Demi-angle du champ de vue évité à la réapparition. */
const VIEW_COS = Math.cos(THREE.MathUtils.degToRad(40));
const VENDOR_RADIUS = 0.35;
const VENDOR_HEIGHT = 1.8;

type NpcState = 'walk' | 'wait' | 'yield' | 'down';

interface MobileNpc {
  /** Client du marché (apparaît avec le marché) ou piéton (apparaît autour du joueur). */
  readonly shopper: boolean;
  /** Graine d'apparence fixe pour les clients ; 0 pour les piétons (nouvelle apparence à chaque apparition). */
  readonly seed: number;
  readonly baseSpeed: number;
  readonly isFan: boolean;
  handle: NpcHandle | null;
  charId: number;
  charRadius: number;
  state: NpcState;
  x: number;
  z: number;
  cap: number;
  phase: number;
  tilt: number;
  targetX: number;
  targetZ: number;
  waitT: number;
  yieldT: number;
  aiAccum: number;
  stuckT: number;
  anchorX: number;
  anchorZ: number;
  sideT: number;
  sideX: number;
  sideZ: number;
  /** Trajet en boucle (coordonnées MONDE) d'un PNJ d'intérieur ; `null` en extérieur. */
  route: Array<{ x: number; z: number }> | null;
  routeIdx: number;
}

interface MarketVendorNpc {
  handle: NpcHandle | null;
  seed: number;
  /** Position MONDE. */
  wx: number;
  wz: number;
  phase: number;
  /** Cap MONDE de base. */
  baseCap: number;
  solidId: number;
}

/** PNJ immobile d'une salle (`still` / `talk`) : instance + cercle solide, aucun personnage du pool. */
interface InteriorStaticNpc {
  handle: NpcHandle;
  wx: number;
  wz: number;
  baseCap: number;
  phase: number;
  /** Amplitude du balancement du cap (gestes de la discussion). */
  sway: number;
  solidId: number;
}

/** Différence d'angle ramenée dans [−π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class NpcSystem {
  private readonly crowd = new NpcCrowd(CROWD_CAPACITY);
  private readonly mobile: MobileNpc[] = [];
  private readonly vendors: MarketVendorNpc[] = [];
  /** PNJ de la salle occupée : marcheurs (pris dans le pool) et immobiles (cercles solides). */
  private readonly interiorMobile: MobileNpc[] = [];
  private readonly interiorStatics: InteriorStaticNpc[] = [];
  private core: PhysicsCore | null = null;
  private marketActive = false;
  private indoor = false;
  /** Rotation du repère du marché (même formule que `localToWorld`). */
  private marketRot = 0;
  private marketCenter: { x: number; z: number; hallHalfW: number; hallHalfD: number } | null = null;
  private seed = 1337;
  private time = 0;
  private frame = 0;
  private readonly scratch: CharacterState = createCharacterState();
  /** Point réutilisé pour `isWater` / `bridgeAt` (évite une allocation par test). */
  private readonly pt = { x: 0, z: 0 };

  constructor(scene: THREE.Scene, poolSize = NPC_POOL_SIZE) {
    scene.add(this.crowd.group);

    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
    let shopperCount = 0;
    if (fp) {
      this.marketCenter = { x: fp.x, z: fp.z, hallHalfW: fp.w / 2, hallHalfD: fp.d / 2 };
      this.marketRot = -fp.angle;
      shopperCount = Math.min(10, Math.floor(poolSize / 3));

      // Marchands postés derrière les étals du grand marché ouvert d'Adjamé (repère local → monde, une seule fois)
      const vendorSpots: Array<[number, number, number]> = [
        [-26, fp.d / 2 + 5.2, 0],
        [-18, fp.d / 2 + 5.2, 0],
        [-10.5, fp.d / 2 + 5.2, 0],
        [10.5, fp.d / 2 + 5.2, 0],
        [18, fp.d / 2 + 5.2, 0],
        [26, fp.d / 2 + 5.2, 0],
        [-18, fp.d / 2 + 11.2, 0],
        [18, fp.d / 2 + 11.2, 0],
        [-(fp.w / 2 + 7.4), -4.2, Math.PI / 2],
        [fp.w / 2 + 7.4, 3.8, -Math.PI / 2],
      ];
      const maxVendors = poolSize <= 12 ? 6 : vendorSpots.length;
      for (let i = 0; i < maxVendors; i++) {
        const [vx, vz, rotY] = vendorSpots[i];
        const w = localToWorld(fp.x, fp.z, this.marketRot, vx, vz);
        this.vendors.push({
          handle: null,
          seed: 7001 + i * 31,
          wx: w.x,
          wz: w.z,
          phase: i * 0.9,
          baseCap: rotY + this.marketRot,
          solidId: -1,
        });
      }
    }

    const walkerCount = poolSize - shopperCount;
    for (let i = 0; i < poolSize; i++) {
      const shopper = i >= walkerCount;
      const k = shopper ? i - walkerCount : i;
      this.mobile.push({
        shopper,
        seed: shopper ? 8001 + k * 37 : 0,
        baseSpeed: shopper ? 1.5 + (k % 4) * 0.3 : 2.3 + (k % 3) * 0.55,
        isFan: !shopper && k % 4 === 0,
        handle: null,
        charId: -1,
        charRadius: 0.35,
        state: 'walk',
        x: 0, z: 0, cap: 0, phase: i * 1.1, tilt: 0,
        targetX: 0, targetZ: 0,
        waitT: 0, yieldT: 0, aiAccum: 0,
        stuckT: 0, anchorX: 0, anchorZ: 0,
        sideT: 0, sideX: 0, sideZ: 0,
        route: null, routeIdx: 0,
      });
    }
  }

  /**
   * Branche le moteur physique et crée le pool de personnages (désactivés). À appeler APRÈS `reset()` du moteur
   * (qui efface les personnages) et une seule fois.
   */
  setPhysics(core: PhysicsCore): void {
    if (this.core === core) return;
    this.core = core;
    for (const n of this.mobile) {
      const id = core.createCharacter(0, 0, 0.35);
      if (id < 0) continue;
      core.setCharacterEnabled(id, false);
      n.charId = id;
      n.charRadius = 0.35;
    }
  }

  /** PNJ réservés dans la foule (mobiles actifs + vendeurs). */
  get activeCount(): number { return this.crowd.activeCount; }
  /** `InstancedMesh` dessinés par la foule à la dernière image. */
  get drawnMeshCount(): number { return this.crowd.drawnMeshCount; }

  private nextRand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private nextSeed(): number {
    return Math.floor(this.nextRand() * 4294967296);
  }

  /** Point d'une zone libre du marché, en coordonnées MONDE (entre les rangées d'étals, allée centrale, côtés). */
  private pickOpenMarketPoint(): { x: number; z: number } {
    const c = this.marketCenter;
    if (!c) return { x: 0, z: 0 };
    const hd = c.hallHalfD;
    let lx: number;
    let lz: number;
    const u = this.nextRand();
    if (u < 0.3) {
      // Allée centrale (|x| < 8,5 m libre)
      lx = (this.nextRand() * 2 - 1) * 7;
      lz = hd + 2.8 + this.nextRand() * 14.7;
    } else if (u < 0.78) {
      // Bandes libres entre les rangées d'étals (tables à d/2+6,8 et d/2+12,8)
      const b = this.nextRand();
      lz = b < 0.25 ? hd + 2.8 + this.nextRand() * 1.7 : b < 0.65 ? hd + 8.4 + this.nextRand() * 2.0 : hd + 14.3 + this.nextRand() * 3.2;
      lx = (this.nextRand() * 2 - 1) * 28;
    } else {
      // Côtés de la halle, de part et d'autre des étals perpendiculaires
      const sign = this.nextRand() < 0.5 ? -1 : 1;
      lx = sign * (this.nextRand() < 0.5 ? c.hallHalfW + 2 + this.nextRand() * 2.2 : c.hallHalfW + 8.8 + this.nextRand() * 2.2);
      lz = (this.nextRand() * 2 - 1) * 8;
    }
    return localToWorld(c.x, c.z, this.marketRot, lx, lz);
  }

  /** Le corps de la halle a son solide (`WorldStreamer`) : ce test ne sert plus qu'à ne pas choisir un but dedans. */
  private insideHall(x: number, z: number): boolean {
    if (!this.marketCenter) return false;
    return (
      Math.abs(x - this.marketCenter.x) < this.marketCenter.hallHalfW + 1.2 &&
      Math.abs(z - this.marketCenter.z) < this.marketCenter.hallHalfD + 1.2
    );
  }

  private isWaterAt(x: number, z: number): boolean {
    this.pt.x = x;
    this.pt.z = z;
    return isWater(this.pt);
  }

  private isDry(x: number, z: number): boolean {
    this.pt.x = x;
    this.pt.z = z;
    return !isWater(this.pt) && !bridgeAt(this.pt, 4);
  }

  private findDrySpotNear(px: number, pz: number, minR: number, maxR: number): { x: number; z: number } | null {
    for (let attempt = 0; attempt < 16; attempt++) {
      const a = this.nextRand() * Math.PI * 2;
      const r = minR + this.nextRand() * (maxR - minR);
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      if (this.isDry(x, z) && !this.insideHall(x, z)) return { x, z };
    }
    return null;
  }

  /** Point d'apparition à 18–78 m du joueur, de préférence hors du champ de la caméra. */
  private findSpawnSpot(px: number, pz: number, camYaw: number): { x: number; z: number } | null {
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    for (let attempt = 0; attempt < 20; attempt++) {
      const a = this.nextRand() * Math.PI * 2;
      const r = SPAWN_MIN + this.nextRand() * (SPAWN_MAX - SPAWN_MIN);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Les 14 premiers essais refusent le cône de vue ; les suivants l'acceptent (mieux vaut un PNJ visible que pas de PNJ)
      if (attempt < 14 && ca * fx + sa * fz > VIEW_COS) continue;
      const x = px + ca * r;
      const z = pz + sa * r;
      if (this.isDry(x, z) && !this.insideHall(x, z)) return { x, z };
    }
    return null;
  }

  // ───────────── Pool ─────────────

  /** Réserve la place dans la foule et active le personnage du moteur. `false` si impossible (rien n'est modifié). */
  private activate(n: MobileNpc, seed: number, role: NpcRole, districtId: string | undefined, x: number, z: number): boolean {
    const core = this.core;
    if (!core || n.charId < 0) return false;
    const appearance = generateAppearance(seed, { role, districtId });
    const handle = this.crowd.acquire(appearance);
    if (!handle) return false;

    // Rayon différent (enfant) : on recrée le personnage plutôt que d'en garder deux par PNJ
    const r = appearance.collisionRadius;
    if (Math.abs(r - n.charRadius) > 0.04) {
      core.destroyCharacter(n.charId);
      const id = core.createCharacter(x, z, r);
      if (id < 0) {
        this.crowd.release(handle);
        n.charId = -1;
        return false;
      }
      n.charId = id;
      n.charRadius = r;
    }
    core.placeCharacter(n.charId, x, z);
    core.faceCharacter(n.charId, 0, false);
    core.characterInput(n.charId, 0, 0, 0);
    core.setCharacterEnabled(n.charId, true);

    n.handle = handle;
    n.x = x;
    n.z = z;
    n.state = 'walk';
    n.tilt = 0;
    n.waitT = 0;
    n.yieldT = 0;
    n.aiAccum = 0;
    n.sideT = 0;
    n.stuckT = 0;
    n.anchorX = x;
    n.anchorZ = z;
    this.pickGoal(n, x, z);
    n.cap = Math.atan2(n.targetX - x, n.targetZ - z);
    this.crowd.setPose(handle, x, z, n.cap, n.phase, 0);
    return true;
  }

  private deactivate(n: MobileNpc): void {
    this.crowd.release(n.handle);
    n.handle = null;
    if (this.core && n.charId >= 0) {
      this.core.characterInput(n.charId, 0, 0, 0);
      this.core.setCharacterEnabled(n.charId, false);
    }
  }

  private pickGoal(n: MobileNpc, x: number, z: number): void {
    if (n.route) {
      // Intérieur : point suivant du trajet en boucle
      n.routeIdx = (n.routeIdx + 1) % n.route.length;
      n.targetX = n.route[n.routeIdx].x;
      n.targetZ = n.route[n.routeIdx].z;
      return;
    }
    if (n.shopper) {
      const g = this.pickOpenMarketPoint();
      n.targetX = g.x;
      n.targetZ = g.z;
      return;
    }
    const g = this.findDrySpotNear(x, z, 12, 30);
    if (g) {
      n.targetX = g.x;
      n.targetZ = g.z;
    }
  }

  private resetStuck(n: MobileNpc, st: CharacterState): void {
    n.stuckT = 0;
    n.anchorX = st.x;
    n.anchorZ = st.z;
  }

  // ───────────── Intérieurs ─────────────

  /** Entrée / sortie d'un intérieur : tout est désactivé dedans ; à la sortie, les PNJ réapparaissent autour du joueur. */
  setIndoor(indoor: boolean): void {
    if (indoor === this.indoor) return;
    this.indoor = indoor;
    if (!indoor) {
      this.clearInterior(); // PNJ de la salle retirés ; ceux de la rue réapparaissent via `update`
      return;
    }
    for (const n of this.mobile) if (n.handle) this.deactivate(n);
    this.leaveMarket();
    this.marketActive = false;
    this.crowd.commit(this.time); // plus aucun PNJ réservé : les instances disparaissent de l'écran
  }

  // ───────────── PNJ d'intérieur ─────────────

  /**
   * Peuple la salle `def` (appelé APRÈS `setIndoor(true)` et l'enregistrement des solides de la salle).
   * Marcheurs : personnages du pool, trajet en boucle en coordonnées MONDE ; immobiles : cercles solides.
   * Si le pool est plus petit que prévu (appareil sans GPU), les marcheurs en trop sont omis.
   */
  enterInterior(def: InteriorDef): void {
    this.clearInterior();
    const core = this.core;
    const list = def.npcs;
    if (!core || !list) return;
    const free = this.mobile.filter((n) => n.charId >= 0 && !n.handle);
    let used = 0;
    for (const d of list) {
      const w = interiorToWorld(def, d.x, d.z);
      if (d.behavior.kind === 'walk') {
        const n = free[used];
        if (!n) continue;
        n.route = d.behavior.points.map((p) => interiorToWorld(def, p.x, p.z));
        n.routeIdx = 0;
        if (!this.activate(n, d.seed, d.role, undefined, w.x, w.z)) {
          n.route = null;
          continue;
        }
        used++;
        this.interiorMobile.push(n);
      } else {
        const handle = this.crowd.acquire(generateAppearance(d.seed, { role: d.role }));
        if (!handle) continue;
        const phase = d.seed * 0.37;
        this.crowd.setPose(handle, w.x, w.z, d.rotY, phase, 0.08);
        this.interiorStatics.push({
          handle, wx: w.x, wz: w.z, baseCap: d.rotY, phase,
          sway: d.behavior.kind === 'talk' ? 0.3 : 0.15,
          solidId: core.addCircle(w.x, w.z, VENDOR_RADIUS, VENDOR_HEIGHT, SolidFlag.PROP),
        });
      }
    }
  }

  /** Retire les PNJ de la salle : instances rendues, personnages remis au repos dans le pool, solides supprimés. */
  private clearInterior(): void {
    for (const n of this.interiorMobile) {
      this.deactivate(n);
      n.route = null;
      n.routeIdx = 0;
    }
    this.interiorMobile.length = 0;
    for (const s of this.interiorStatics) {
      this.crowd.release(s.handle);
      if (this.core && s.solidId >= 0) this.core.removeSolid(s.solidId);
    }
    this.interiorStatics.length = 0;
  }

  /** Animation des PNJ de la salle occupée (la ville reste figée) ; le joueur est en coordonnées MONDE. */
  updateIndoor(dt: number, playerX: number, playerZ: number): void {
    if (!this.indoor) return;
    this.time += dt;
    this.frame++;
    for (let k = 0; k < this.interiorMobile.length; k++) {
      this.stepMobile(this.interiorMobile[k], k, dt, playerX, playerZ, false, false);
    }
    for (const s of this.interiorStatics) {
      s.phase += dt * 2.2;
      this.crowd.setPose(s.handle, s.wx, s.wz, s.baseCap + Math.sin(s.phase * 0.7) * s.sway, s.phase, 0.08);
    }
    this.crowd.commit(this.time);
  }

  // ───────────── Marché : vendeurs statiques ─────────────

  private enterMarket(): void {
    const core = this.core;
    for (const v of this.vendors) {
      v.handle = this.crowd.acquire(generateAppearance(v.seed, { role: 'vendeur', districtId: 'adjame' }));
      if (v.handle) this.crowd.setPose(v.handle, v.wx, v.wz, v.baseCap, v.phase, 0.08);
      if (core && v.solidId < 0) v.solidId = core.addCircle(v.wx, v.wz, VENDOR_RADIUS, VENDOR_HEIGHT, SolidFlag.PROP);
    }
  }

  private leaveMarket(): void {
    for (const v of this.vendors) {
      this.crowd.release(v.handle);
      v.handle = null;
      if (this.core && v.solidId >= 0) this.core.removeSolid(v.solidId);
      v.solidId = -1;
    }
  }

  // ───────────── IA d'un PNJ ─────────────

  /** Décide et envoie `characterInput` (jamais pendant l'étourdissement : l'appelant ne l'appelle pas alors). */
  private think(n: MobileNpc, st: CharacterState, dtAi: number, px: number, pz: number, superstar: boolean): void {
    const core = this.core;
    if (!core) return;
    const id = n.charId;
    const vx = px - st.x;
    const vz = pz - st.z;
    const dP = Math.hypot(vx, vz);
    const fan = superstar && n.isFan && dP < 42;

    // Fan : s'arrête à ~3,6 m, ne pousse jamais le joueur
    if (fan && dP <= FAN_STOP_DIST) {
      core.characterInput(id, 0, 0, 0);
      n.state = 'wait';
      n.waitT = 0.3;
      this.resetStuck(n, st);
      return;
    }

    if (n.state === 'wait' && !fan) {
      core.characterInput(id, 0, 0, 0);
      this.resetStuck(n, st);
      n.waitT -= dtAi;
      if (n.waitT > 0) return;
      this.pickGoal(n, st.x, st.z);
      n.state = 'walk';
    }

    // Petit pas de côté après un blocage
    if (n.sideT > 0) {
      n.sideT -= dtAi;
      core.characterInput(id, n.sideX, n.sideZ, n.baseSpeed * 0.8);
      return;
    }

    let tx = n.targetX;
    let tz = n.targetZ;
    if (fan) {
      tx = px;
      tz = pz;
    }
    const gx0 = tx - st.x;
    const gz0 = tz - st.z;
    const d = Math.hypot(gx0, gz0);
    if (!fan && d < (n.route ? 0.4 : 1.2)) {
      n.state = 'wait';
      n.waitT = 0.4 + this.nextRand() * 2.2;
      core.characterInput(id, 0, 0, 0);
      this.resetStuck(n, st);
      return;
    }
    const gx = gx0 / d;
    const gz = gz0 / d;
    let dirX = gx;
    let dirZ = gz;
    let spd = n.baseSpeed;
    let wantsToMove = true;
    n.state = 'walk';

    // Évitement du joueur : il cède (s'arrête s'il est devant, sinon s'écarte), il ne pousse jamais
    if (!fan && dP < YIELD_DIST) {
      const ahead = (gx * vx + gz * vz) / Math.max(dP, 0.01);
      if (ahead > 0.35) {
        n.state = 'yield';
        n.yieldT += dtAi;
        if (dP < YIELD_STOP_DIST) {
          dirX = 0;
          dirZ = 0;
          spd = 0;
          wantsToMove = false;
        } else {
          let sx = -gz;
          let sz = gx;
          if (sx * vx + sz * vz > 0) { sx = -sx; sz = -sz; } // côté opposé au joueur
          const mx = gx * 0.35 + sx * 0.9;
          const mz = gz * 0.35 + sz * 0.9;
          const l = Math.hypot(mx, mz);
          dirX = mx / l;
          dirZ = mz / l;
          spd *= 0.7;
        }
        if (n.yieldT > 4) {
          this.pickGoal(n, st.x, st.z); // le joueur reste planté devant : on change de chemin
          n.yieldT = 0;
        }
      } else {
        n.yieldT = 0;
      }
    } else {
      n.yieldT = 0;
    }

    core.characterInput(id, dirX, dirZ, spd);

    // Détection de blocage : veut avancer mais se déplace de moins de 0,15 m en ~1 s
    if (!wantsToMove) {
      this.resetStuck(n, st);
      return;
    }
    n.stuckT += dtAi;
    if (n.stuckT >= STUCK_WINDOW) {
      if (Math.hypot(st.x - n.anchorX, st.z - n.anchorZ) < STUCK_MIN_MOVE) {
        this.pickGoal(n, st.x, st.z);
        const sgn = this.nextRand() < 0.5 ? -1 : 1;
        n.sideX = -gz * sgn;
        n.sideZ = gx * sgn;
        n.sideT = 0.6;
      }
      this.resetStuck(n, st);
    }
  }

  /** Un pas de simulation d'un PNJ mobile actif : lecture du moteur, IA, pose instanciée. `outdoor` : garde-fou eau. */
  private stepMobile(n: MobileNpc, i: number, dt: number, playerX: number, playerZ: number, isSuperstar: boolean, outdoor: boolean): void {
    const core = this.core;
    const handle = n.handle;
    if (!core || !handle) return;
    core.readCharacter(n.charId, this.scratch);
    const st = this.scratch;
    n.x = st.x;
    n.z = st.z;

    // Garde-fou eau : un PNJ poussé dans l'eau est retiré et réapparaît ailleurs
    if (outdoor && (this.frame + i) % 15 === 0 && this.isWaterAt(st.x, st.z)) {
      this.deactivate(n);
      return;
    }

    const dist = Math.hypot(st.x - playerX, st.z - playerZ);
    n.aiAccum += dt;
    const knocked = st.stun > 0;
    if (knocked) {
      // Renversé par un véhicule : aucun `characterInput` tant que `stun > 0`
      n.state = 'down';
    } else {
      if (n.state === 'down') {
        n.state = 'walk';
        this.resetStuck(n, st);
      }
      if (dist < FAR_AI_DIST || ((this.frame + i) & 1) === 0) {
        this.think(n, st, n.aiAccum, playerX, playerZ, isSuperstar);
        n.aiAccum = 0;
      }
    }

    const moving = !knocked && st.speed > 0.35;
    if (moving) n.phase += st.speed * dt * 2.8;
    if (!knocked && st.speed > 0.4) n.cap += angleDiff(st.heading, n.cap) * Math.min(1, 12 * dt);
    n.tilt += ((knocked ? FALL_TILT : 0) - n.tilt) * Math.min(1, 8 * dt);
    this.crowd.setPose(handle, st.x, st.z, n.cap, n.phase, moving ? 0.85 : 0, n.tilt);
  }

  // ───────────── Mise à jour ─────────────

  /**
   * `camYaw` : cap de la caméra (l'avant est (−sin, −cos)) pour apparaître hors champ ;
   * `worldReady` : les solides des chunks autour du joueur sont chargés (sinon on n'apparaît pas encore).
   */
  update(dt: number, playerX: number, playerZ: number, isSuperstar: boolean, camYaw = 0, worldReady = true): void {
    if (this.indoor) return; // dans une salle, c'est `updateIndoor` qui anime
    this.time += dt;
    this.frame++;
    const core = this.core;

    // Foule du Grand Marché Ouvert d'Adjamé : vendeurs statiques et clients actifs à proximité seulement
    if (this.marketCenter) {
      const nearMarket = Math.hypot(playerX - this.marketCenter.x, playerZ - this.marketCenter.z) < MARKET_DIST;
      if (nearMarket !== this.marketActive) {
        this.marketActive = nearMarket;
        if (nearMarket) this.enterMarket();
        else this.leaveMarket();
      }
      if (nearMarket) {
        for (const v of this.vendors) {
          if (!v.handle) continue;
          v.phase += dt * 2.2;
          this.crowd.setPose(v.handle, v.wx, v.wz, v.baseCap + Math.sin(v.phase * 0.7) * 0.22, v.phase, 0.08);
        }
      }
    }

    if (core) {
      let spawnsLeft = SPAWNS_PER_FRAME;
      for (let i = 0; i < this.mobile.length; i++) {
        const n = this.mobile[i];
        if (n.charId < 0) continue;

        // Retrait : clients quand le marché est loin, piétons au-delà de 115 m
        if (n.handle) {
          if (n.shopper ? !this.marketActive : Math.hypot(n.x - playerX, n.z - playerZ) > DESPAWN_DIST) this.deactivate(n);
        }

        // Apparition
        if (!n.handle) {
          if (spawnsLeft <= 0 || !worldReady) continue;
          if (n.shopper) {
            if (!this.marketActive) continue;
            const s = this.pickOpenMarketPoint();
            if (this.activate(n, n.seed, 'client', 'adjame', s.x, s.z)) spawnsLeft--;
          } else {
            const spot = this.findSpawnSpot(playerX, playerZ, camYaw);
            if (spot && this.activate(n, this.nextSeed(), 'passant', districtAt(spot).id, spot.x, spot.z)) spawnsLeft--;
          }
          continue;
        }
        this.stepMobile(n, i, dt, playerX, playerZ, isSuperstar, true);
      }
    }

    this.crowd.commit(this.time);
  }

  dispose(): void {
    const core = this.core;
    if (core) {
      for (const n of this.mobile) if (n.charId >= 0) core.destroyCharacter(n.charId);
      for (const v of this.vendors) if (v.solidId >= 0) core.removeSolid(v.solidId);
      for (const st of this.interiorStatics) if (st.solidId >= 0) core.removeSolid(st.solidId);
    }
    this.core = null;
    this.crowd.dispose();
  }
}
