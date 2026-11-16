/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Gestionnaire léger de piétons ivoiriens (PNJ d'ambiance) :
 * maintient ~14 citoyens vivants autour du joueur sur les trottoirs/rues secs,
 * sans jamais apparaître dans la lagune Ébrié ni l'océan Atlantique.
 * Rendu : tous les PNJ (piétons + foule du marché) passent par une seule `NpcCrowd` (rendu instancié,
 * `npcInstances.ts`) ; ce module ne garde que la logique de déplacement. Les PNJ restent non physiques.
 */

import * as THREE from 'three';
import { districtAt, isWater } from '../world/abidjanGeography';
import { SPECIAL_FOOTPRINTS } from '../world/city';
import { generateAppearance } from '../world/npcAppearance';
import { bridgeAt } from '../world/roads';
import { NpcCrowd, type NpcHandle } from './npcInstances';

interface PedestrianNpc {
  handle: NpcHandle | null;
  x: number;
  z: number;
  cap: number;
  targetX: number;
  targetZ: number;
  speed: number;
  phase: number;
  isFan: boolean;
}

interface MarketVendorNpc {
  handle: NpcHandle | null;
  seed: number;
  lx: number;
  lz: number;
  phase: number;
  baseRotY: number;
}

interface MarketShopperNpc {
  handle: NpcHandle | null;
  seed: number;
  lx: number;
  lz: number;
  cap: number;
  targetLx: number;
  targetLz: number;
  speed: number;
  phase: number;
}

/** Capacité de la foule : les piétons (14) + le marché (≤ 20) ; le reste sert à l'étape 5 (60 à 80 PNJ). */
const CROWD_CAPACITY = 80;

export class NpcSystem {
  private readonly crowd = new NpcCrowd(CROWD_CAPACITY);
  private npcs: PedestrianNpc[] = [];
  private marketVendors: MarketVendorNpc[] = [];
  private marketShoppers: MarketShopperNpc[] = [];
  private marketActive = false;
  /** Rotation du repère du marché (la foule du marché est calculée en coordonnées locales). */
  private marketRot = 0;
  private marketCenter: { x: number; z: number; hallHalfW: number; hallHalfD: number } | null = null;
  private seed = 1337;
  private time = 0;

  constructor(scene: THREE.Scene, count = 14) {
    scene.add(this.crowd.group);

    for (let i = 0; i < count; i++) {
      this.npcs.push({
        handle: null,
        x: 0,
        z: 0,
        cap: 0,
        targetX: 0,
        targetZ: 0,
        speed: 2.3 + (i % 3) * 0.55,
        phase: i * 1.1,
        isFan: i % 4 === 0,
      });
    }

    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
    if (fp) {
      this.marketCenter = { x: fp.x, z: fp.z, hallHalfW: fp.w / 2, hallHalfD: fp.d / 2 };
      this.marketRot = -fp.angle;

      // Marchands postés derrière les étals du grand marché ouvert d'Adjamé
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
      const maxVendors = count <= 8 ? 6 : vendorSpots.length;
      for (let i = 0; i < maxVendors; i++) {
        const [vx, vz, rotY] = vendorSpots[i];
        this.marketVendors.push({ handle: null, seed: 7001 + i * 31, lx: vx, lz: vz, phase: i * 0.9, baseRotY: rotY });
      }

      // Clients qui déambulent dans les larges allées du marché ouvert
      const shopperCount = count <= 8 ? 5 : 10;
      for (let i = 0; i < shopperCount; i++) {
        const start = this.pickOpenMarketPoint(fp.d / 2);
        const goal = this.pickOpenMarketPoint(fp.d / 2);
        this.marketShoppers.push({
          handle: null,
          seed: 8001 + i * 37,
          lx: start.lx,
          lz: start.lz,
          cap: 0,
          targetLx: goal.lx,
          targetLz: goal.lz,
          speed: 1.5 + (i % 4) * 0.3,
          phase: i * 1.3,
        });
      }
    }
  }

  /** PNJ réservés dans la foule (piétons + marché). */
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

  private pickOpenMarketPoint(hallHalfD: number): { lx: number; lz: number } {
    // Allées piétonnes dégagées : parvis avant (z = hallHalfD+3 .. +17) ou allée centrale (|x| <= 5)
    if (this.nextRand() < 0.72) {
      return {
        lx: (this.nextRand() * 2 - 1) * 28,
        lz: hallHalfD + 2.8 + this.nextRand() * 14,
      };
    }
    return {
      lx: (this.nextRand() < 0.5 ? -1 : 1) * (20.5 + this.nextRand() * 8),
      lz: (this.nextRand() * 2 - 1) * 9,
    };
  }

  private insideHall(x: number, z: number): boolean {
    if (!this.marketCenter) return false;
    return (
      Math.abs(x - this.marketCenter.x) < this.marketCenter.hallHalfW + 1.2 &&
      Math.abs(z - this.marketCenter.z) < this.marketCenter.hallHalfD + 1.2
    );
  }

  private findDrySpotNear(px: number, pz: number, minR: number, maxR: number): { x: number; z: number } | null {
    for (let attempt = 0; attempt < 16; attempt++) {
      const a = this.nextRand() * Math.PI * 2;
      const r = minR + this.nextRand() * (maxR - minR);
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      if (!isWater({ x, z }) && !bridgeAt({ x, z }, 4) && !this.insideHall(x, z)) {
        return { x, z };
      }
    }
    return null;
  }

  /** Pose un PNJ du marché : coordonnées locales → monde (rotation Y du repère du marché, même formule que `localToWorld`). */
  private poseMarket(h: NpcHandle, lx: number, lz: number, localCap: number, phase: number, amp: number): void {
    const c = this.marketCenter;
    if (!c) return;
    const cos = Math.cos(this.marketRot);
    const sin = Math.sin(this.marketRot);
    this.crowd.setPose(h, c.x + lx * cos + lz * sin, c.z - lx * sin + lz * cos, localCap + this.marketRot, phase, amp);
  }

  private enterMarket(): void {
    for (const v of this.marketVendors) {
      v.handle = this.crowd.acquire(generateAppearance(v.seed, { role: 'vendeur', districtId: 'adjame' }));
      if (v.handle) this.poseMarket(v.handle, v.lx, v.lz, v.baseRotY, v.phase, 0.08);
    }
    for (const s of this.marketShoppers) {
      s.handle = this.crowd.acquire(generateAppearance(s.seed, { role: 'client', districtId: 'adjame' }));
      if (s.handle) this.poseMarket(s.handle, s.lx, s.lz, s.cap, s.phase, 0);
    }
  }

  private leaveMarket(): void {
    for (const v of this.marketVendors) { this.crowd.release(v.handle); v.handle = null; }
    for (const s of this.marketShoppers) { this.crowd.release(s.handle); s.handle = null; }
  }

  update(dt: number, playerX: number, playerZ: number, isSuperstar: boolean): void {
    this.time += dt;

    // Foule du Grand Marché Ouvert d'Adjamé : active uniquement à proximité du marché
    if (this.marketCenter) {
      const nearMarket = Math.hypot(playerX - this.marketCenter.x, playerZ - this.marketCenter.z) < 135;
      if (nearMarket !== this.marketActive) {
        this.marketActive = nearMarket;
        if (nearMarket) this.enterMarket();
        else this.leaveMarket();
      }
      if (nearMarket) {
        for (const v of this.marketVendors) {
          if (!v.handle) continue;
          v.phase += dt * 2.2;
          this.poseMarket(v.handle, v.lx, v.lz, v.baseRotY + Math.sin(v.phase * 0.7) * 0.22, v.phase, 0.08);
        }
        for (const s of this.marketShoppers) {
          const dx = s.targetLx - s.lx;
          const dz = s.targetLz - s.lz;
          const d = Math.hypot(dx, dz);
          if (d < 0.8) {
            const next = this.pickOpenMarketPoint(this.marketCenter.hallHalfD);
            s.targetLx = next.lx;
            s.targetLz = next.lz;
            if (s.handle) this.poseMarket(s.handle, s.lx, s.lz, s.cap, s.phase, 0);
          } else {
            const step = Math.min(d, s.speed * dt);
            s.lx += (dx / d) * step;
            s.lz += (dz / d) * step;
            s.cap = Math.atan2(dx, dz);
            s.phase += step * 2.8;
            if (s.handle) this.poseMarket(s.handle, s.lx, s.lz, s.cap, s.phase, 0.8);
          }
        }
      }
    }

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const dist = Math.hypot(npc.x - playerX, npc.z - playerZ);

      if (!npc.handle || dist > 115) {
        this.crowd.release(npc.handle);
        npc.handle = null;
        const spot = this.findDrySpotNear(playerX, playerZ, 18, 78);
        if (!spot) continue;
        // Nouvelle apparence à chaque réapparition (rôle « passant », quartier du point d'apparition)
        const handle = this.crowd.acquire(generateAppearance(this.nextSeed(), { role: 'passant', districtId: districtAt(spot).id }));
        if (!handle) continue;
        npc.handle = handle;
        npc.x = spot.x;
        npc.z = spot.z;
        const nextGoal = this.findDrySpotNear(npc.x, npc.z, 10, 28) ?? spot;
        npc.targetX = nextGoal.x;
        npc.targetZ = nextGoal.z;
        this.crowd.setPose(handle, npc.x, npc.z, npc.cap, npc.phase, 0);
      }
      const handle = npc.handle;
      if (!handle) continue;

      let tx = npc.targetX;
      let tz = npc.targetZ;
      if (isSuperstar && npc.isFan && dist < 42 && dist > 3.6) {
        tx = playerX;
        tz = playerZ;
      }

      const dx = tx - npc.x;
      const dz = tz - npc.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.2) {
        const nextGoal = this.findDrySpotNear(npc.x, npc.z, 12, 30);
        if (nextGoal) {
          npc.targetX = nextGoal.x;
          npc.targetZ = nextGoal.z;
        }
        this.crowd.setPose(handle, npc.x, npc.z, npc.cap, npc.phase, 0);
      } else {
        const step = Math.min(d, npc.speed * dt);
        const nx = npc.x + (dx / d) * step;
        const nz = npc.z + (dz / d) * step;
        if (isWater({ x: nx, z: nz }) || this.insideHall(nx, nz)) {
          const safe = this.findDrySpotNear(npc.x, npc.z, 8, 22);
          if (safe) {
            npc.targetX = safe.x;
            npc.targetZ = safe.z;
          }
          continue;
        }
        npc.x = nx;
        npc.z = nz;
        npc.cap = Math.atan2(dx, dz);
        npc.phase += step * 2.8;
        this.crowd.setPose(handle, npc.x, npc.z, npc.cap, npc.phase, 0.85);
      }
    }

    this.crowd.commit(this.time);
  }

  dispose(): void {
    this.crowd.dispose();
  }
}
