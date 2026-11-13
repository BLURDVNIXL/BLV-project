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

const SKIN_TONES = [0x4a2c1d, 0x6b422a, 0x3b2316, 0x7c4f33, 0x5c3824];
const OUTFITS: SapeOutfitId[] = ['standard', 'wax_bazin', 'costume_italien', 'madrid_25'];

export class NpcSystem {
  private npcs: PedestrianNpc[] = [];
  private group = new THREE.Group();
  private seed = 1337;

  constructor(scene: THREE.Scene, count = 14) {
    scene.add(this.group);
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
  }

  private nextRand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private findDrySpotNear(px: number, pz: number, minR: number, maxR: number): { x: number; z: number } | null {
    for (let attempt = 0; attempt < 16; attempt++) {
      const a = this.nextRand() * Math.PI * 2;
      const r = minR + this.nextRand() * (maxR - minR);
      const x = px + Math.cos(a) * r;
      const z = pz + Math.sin(a) * r;
      if (!isWater({ x, z }) && !bridgeAt({ x, z }, 4)) {
        return { x, z };
      }
    }
    return null;
  }

  update(dt: number, playerX: number, playerZ: number, isSuperstar: boolean): void {
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
        if (isWater({ x: nx, z: nz })) {
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
  }
}
