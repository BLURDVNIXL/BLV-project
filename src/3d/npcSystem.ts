/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Gestionnaire léger de piétons ivoiriens (PNJ d'ambiance) :
 * maintient ~14 citoyens vivants autour du joueur sur les trottoirs/rues secs,
 * sans jamais apparaître dans la lagune Ébrié ni l'océan Atlantique.
 */

import * as THREE from 'three';
import { SapeOutfitId } from '../types/game';
import { districtAt, isWater } from '../world/abidjanGeography';
import { SPECIAL_FOOTPRINTS } from '../world/city';
import { bridgeAt } from '../world/roads';
import { CharacterRig, createCharacterModel } from './models';

interface PedestrianNpc {
  rig: CharacterRig;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  speed: number;
  phase: number;
  isFan: boolean;
}

interface MarketVendorNpc {
  rig: CharacterRig;
  phase: number;
  baseRotY: number;
}

interface MarketShopperNpc {
  rig: CharacterRig;
  lx: number;
  lz: number;
  targetLx: number;
  targetLz: number;
  speed: number;
  phase: number;
}

const SKIN_TONES = [0x4a2c1d, 0x6b422a, 0x3b2316, 0x7c4f33, 0x5c3824];
const OUTFITS: SapeOutfitId[] = ['standard', 'wax_bazin', 'costume_italien', 'madrid_25'];
const MARKET_OUTFITS: SapeOutfitId[] = ['wax_bazin', 'standard', 'wax_bazin', 'madrid_25'];

export class NpcSystem {
  private npcs: PedestrianNpc[] = [];
  private group = new THREE.Group();
  private marketGroup = new THREE.Group();
  private marketVendors: MarketVendorNpc[] = [];
  private marketShoppers: MarketShopperNpc[] = [];
  private marketCenter: { x: number; z: number; hallHalfW: number; hallHalfD: number } | null = null;
  private seed = 1337;

  constructor(scene: THREE.Scene, count = 14) {
    scene.add(this.group);
    scene.add(this.marketGroup);
    this.marketGroup.visible = false;

    for (let i = 0; i < count; i++) {
      const rig = createCharacterModel(
        SKIN_TONES[i % SKIN_TONES.length],
        OUTFITS[i % OUTFITS.length],
        i % 3 === 0
      );
      rig.group.visible = false;
      this.group.add(rig.group);
      this.npcs.push({
        rig,
        x: 0,
        z: 0,
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
      this.marketGroup.position.set(fp.x, 0, fp.z);
      this.marketGroup.rotation.y = -fp.angle;

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
        const rig = createCharacterModel(
          SKIN_TONES[(i + 1) % SKIN_TONES.length],
          MARKET_OUTFITS[i % MARKET_OUTFITS.length],
          i % 4 === 0
        );
        rig.group.position.set(vx, 0, vz);
        rig.group.rotation.y = rotY;
        this.marketGroup.add(rig.group);
        this.marketVendors.push({ rig, phase: i * 0.9, baseRotY: rotY });
      }

      // Clients qui déambulent dans les larges allées du marché ouvert
      const shopperCount = count <= 8 ? 5 : 10;
      for (let i = 0; i < shopperCount; i++) {
        const rig = createCharacterModel(
          SKIN_TONES[(i + 2) % SKIN_TONES.length],
          OUTFITS[(i + 1) % OUTFITS.length],
          i % 3 === 1
        );
        const start = this.pickOpenMarketPoint(fp.d / 2);
        const goal = this.pickOpenMarketPoint(fp.d / 2);
        rig.group.position.set(start.lx, 0, start.lz);
        this.marketGroup.add(rig.group);
        this.marketShoppers.push({
          rig,
          lx: start.lx,
          lz: start.lz,
          targetLx: goal.lx,
          targetLz: goal.lz,
          speed: 1.5 + (i % 4) * 0.3,
          phase: i * 1.3,
        });
      }
    }
  }

  private nextRand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
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

  update(dt: number, playerX: number, playerZ: number, isSuperstar: boolean): void {
    // Foule du Grand Marché Ouvert d'Adjamé : active uniquement à proximité du marché
    if (this.marketCenter) {
      const nearMarket = Math.hypot(playerX - this.marketCenter.x, playerZ - this.marketCenter.z) < 135;
      this.marketGroup.visible = nearMarket;
      if (nearMarket) {
        for (const v of this.marketVendors) {
          v.phase += dt * 2.2;
          v.rig.group.rotation.y = v.baseRotY + Math.sin(v.phase * 0.7) * 0.22;
          v.rig.animateGait(v.phase, 0.08, dt);
        }
        for (const s of this.marketShoppers) {
          const dx = s.targetLx - s.lx;
          const dz = s.targetLz - s.lz;
          const d = Math.hypot(dx, dz);
          if (d < 0.8) {
            const next = this.pickOpenMarketPoint(this.marketCenter.hallHalfD);
            s.targetLx = next.lx;
            s.targetLz = next.lz;
            s.rig.animateGait(s.phase, 0, dt);
          } else {
            const step = Math.min(d, s.speed * dt);
            s.lx += (dx / d) * step;
            s.lz += (dz / d) * step;
            s.rig.group.position.set(s.lx, 0, s.lz);
            s.rig.group.rotation.y = Math.atan2(dx, dz);
            s.phase += step * 2.8;
            s.rig.animateGait(s.phase, 0.8, dt);
          }
        }
      }
    }

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const dist = Math.hypot(npc.x - playerX, npc.z - playerZ);

      if (!npc.rig.group.visible || dist > 115) {
        const spot = this.findDrySpotNear(playerX, playerZ, 18, 78);
        if (!spot) {
          npc.rig.group.visible = false;
          continue;
        }
        npc.x = spot.x;
        npc.z = spot.z;
        const dName = districtAt(spot).id;
        if (dName === 'plateau' || dName === 'cocody' || dName === 'riviera') {
          npc.rig.applyOutfit(i % 2 === 0 ? 'costume_italien' : 'standard');
        } else if (dName === 'adjame' || dName === 'treichville' || dName === 'abobo') {
          npc.rig.applyOutfit(i % 2 === 0 ? 'wax_bazin' : 'standard');
        } else {
          npc.rig.applyOutfit(OUTFITS[i % OUTFITS.length]);
        }
        const nextGoal = this.findDrySpotNear(npc.x, npc.z, 10, 28) ?? spot;
        npc.targetX = nextGoal.x;
        npc.targetZ = nextGoal.z;
        npc.rig.group.position.set(npc.x, 0, npc.z);
        npc.rig.group.visible = true;
      }

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
        npc.rig.animateGait(npc.phase, 0, dt);
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
        npc.rig.group.position.set(npc.x, 0, npc.z);
        npc.rig.group.rotation.y = Math.atan2(dx, dz);
        npc.phase += step * 2.8;
        npc.rig.animateGait(npc.phase, 0.85, dt);
      }
    }
  }

  dispose(): void {
    this.group.clear();
    this.marketGroup.clear();
  }
}
