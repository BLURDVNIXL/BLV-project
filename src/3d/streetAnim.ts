/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Animations légères de vie urbaine autour du joueur :
 * - Oiseaux tropicaux en vol plané / battement d'ailes au-dessus des rues
 * - Papillons colorés qui voltigent près des herbes et buissons en journée
 * - Feux tricolores animés aux carrefours d'artères proches
 */

import * as THREE from 'three';
import { ARTERIALS } from '../world/roads';

interface Bird {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  radius: number;
  speed: number;
  baseY: number;
  phase: number;
}

interface Butterfly {
  group: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  ox: number;
  oz: number;
  phase: number;
}

interface TrafficSignal {
  group: THREE.Group;
  redMat: THREE.MeshBasicMaterial;
  amberMat: THREE.MeshBasicMaterial;
  greenMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  phase: number;
}

const BUTTERFLY_COLORS = [0xfacc15, 0xf97316, 0x38bdf8, 0xf472b6, 0xfef08a];

export class StreetAnimSystem {
  private birds: Bird[] = [];
  private butterflies: Butterfly[] = [];
  private signals: TrafficSignal[] = [];
  private disposables: Array<{ dispose(): void }> = [];

  constructor(private readonly scene: THREE.Scene, lowEnd = false) {
    // 1. Oiseaux en vol dans le ciel proche
    const birdCount = lowEnd ? 3 : 6;
    const bodyGeo = new THREE.BoxGeometry(0.14, 0.12, 0.42);
    const wingGeo = new THREE.BoxGeometry(0.42, 0.04, 0.18);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    this.disposables.push(bodyGeo, wingGeo, birdMat);

    for (let i = 0; i < birdCount; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, birdMat);
      const wingL = new THREE.Mesh(wingGeo, birdMat);
      wingL.position.set(-0.22, 0.02, 0);
      const wingR = new THREE.Mesh(wingGeo, birdMat);
      wingR.position.set(0.22, 0.02, 0);
      group.add(body, wingL, wingR);
      this.scene.add(group);
      this.birds.push({
        group,
        wingL,
        wingR,
        radius: 14 + i * 5.5,
        speed: 0.34 + (i % 3) * 0.08,
        baseY: 11 + (i % 4) * 3.5,
        phase: i * 1.37,
      });
    }

    // 2. Papillons près du sol (en journée hors pluie)
    const bflyCount = lowEnd ? 4 : 10;
    const bWingGeo = new THREE.PlaneGeometry(0.16, 0.14);
    this.disposables.push(bWingGeo);
    for (let i = 0; i < bflyCount; i++) {
      const bMat = new THREE.MeshBasicMaterial({
        color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length],
        side: THREE.DoubleSide,
      });
      this.disposables.push(bMat);
      const group = new THREE.Group();
      const wingL = new THREE.Mesh(bWingGeo, bMat);
      wingL.position.set(-0.07, 0, 0);
      const wingR = new THREE.Mesh(bWingGeo, bMat);
      wingR.position.set(0.07, 0, 0);
      group.add(wingL, wingR);
      this.scene.add(group);
      this.butterflies.push({
        group,
        wingL,
        wingR,
        ox: Math.cos(i * 1.9) * (6 + (i % 4) * 4),
        oz: Math.sin(i * 1.9) * (6 + (i % 4) * 4),
        phase: i * 2.1,
      });
    }

    // 3. Feux tricolores animés aux principaux carrefours d'artères
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 4.4, 6);
    const boxGeo = new THREE.BoxGeometry(0.45, 1.15, 0.38);
    const lensGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    this.disposables.push(poleGeo, boxGeo, lensGeo, poleMat, boxMat);

    // Extraire les noeuds d'intersection uniques des grands axes
    const seen = new Set<string>();
    const junctions: Array<{ x: number; z: number }> = [];
    for (const art of ARTERIALS) {
      for (const p of art.points) {
        const key = `${Math.round(p.x / 12)}:${Math.round(p.z / 12)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        junctions.push({ x: p.x + 8.6, z: p.z + 8.6 });
      }
    }

    const maxSignals = lowEnd ? 6 : Math.min(18, junctions.length);
    for (let i = 0; i < maxSignals; i++) {
      const j = junctions[i];
      const group = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.2;
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 4.15;

      const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const amberMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x052e16 });
      this.disposables.push(redMat, amberMat, greenMat);

      const rLens = new THREE.Mesh(lensGeo, redMat);
      rLens.position.set(0, 4.48, 0.19);
      const aLens = new THREE.Mesh(lensGeo, amberMat);
      aLens.position.set(0, 4.15, 0.19);
      const gLens = new THREE.Mesh(lensGeo, greenMat);
      gLens.position.set(0, 3.82, 0.19);

      const rLensB = new THREE.Mesh(lensGeo, redMat);
      rLensB.position.set(0, 4.48, -0.19);
      const aLensB = new THREE.Mesh(lensGeo, amberMat);
      aLensB.position.set(0, 4.15, -0.19);
      const gLensB = new THREE.Mesh(lensGeo, greenMat);
      gLensB.position.set(0, 3.82, -0.19);

      group.add(pole, box, rLens, aLens, gLens, rLensB, aLensB, gLensB);
      group.position.set(j.x, 0, j.z);
      this.scene.add(group);
      this.signals.push({ group, redMat, amberMat, greenMat, x: j.x, z: j.z, phase: i * 1.7 });
    }
  }

  public update(nowSec: number, focusX: number, focusZ: number, visible: boolean, isRain: boolean, isNight: boolean): void {
    // 1. Oiseaux
    for (const b of this.birds) {
      b.group.visible = visible && !isRain;
      if (!b.group.visible) continue;
      const a = nowSec * b.speed + b.phase;
      const bx = focusX + Math.cos(a) * b.radius;
      const bz = focusZ + Math.sin(a) * b.radius;
      const by = b.baseY + Math.sin(nowSec * 1.1 + b.phase) * 1.8;
      b.group.position.set(bx, by, bz);
      b.group.rotation.y = -a;
      const flap = Math.sin(nowSec * 11.5 + b.phase) * 0.52;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }

    // 2. Papillons (jour sec uniquement)
    const showButterflies = visible && !isRain && !isNight;
    for (const bf of this.butterflies) {
      bf.group.visible = showButterflies;
      if (!showButterflies) continue;
      const x = focusX + bf.ox + Math.sin(nowSec * 0.9 + bf.phase) * 3.2;
      const z = focusZ + bf.oz + Math.cos(nowSec * 0.8 + bf.phase * 1.3) * 3.2;
      const y = 0.75 + Math.abs(Math.sin(nowSec * 2.4 + bf.phase)) * 1.1;
      bf.group.position.set(x, y, z);
      bf.group.rotation.y = Math.atan2(Math.cos(nowSec * 0.9 + bf.phase), -Math.sin(nowSec * 0.8 + bf.phase * 1.3));
      const flap = Math.sin(nowSec * 22 + bf.phase) * 0.85;
      bf.wingL.rotation.y = flap;
      bf.wingR.rotation.y = -flap;
    }

    // 3. Feux tricolores animés (cycle 12s : vert 5s -> orange 2s -> rouge 5s)
    for (const s of this.signals) {
      const near = visible && Math.hypot(s.x - focusX, s.z - focusZ) < 220;
      s.group.visible = near;
      if (!near) continue;
      const cyc = (nowSec + s.phase) % 12;
      const isGreen = cyc < 5;
      const isAmber = cyc >= 5 && cyc < 7;
      const isRed = cyc >= 7;
      s.greenMat.color.setHex(isGreen ? 0x22c55e : 0x052e16);
      s.amberMat.color.setHex(isAmber ? 0xf59e0b : 0x451a03);
      s.redMat.color.setHex(isRed ? 0xef4444 : 0x450a0a);
    }
  }

  public dispose(): void {
    for (const b of this.birds) this.scene.remove(b.group);
    for (const bf of this.butterflies) this.scene.remove(bf.group);
    for (const s of this.signals) this.scene.remove(s.group);
    this.disposables.forEach((d) => d.dispose());
    this.birds = [];
    this.butterflies = [];
    this.signals = [];
  }
}
