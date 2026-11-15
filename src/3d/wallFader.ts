/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Fondu des murs et du toit d'un bâtiment fermé, pour que la caméra ne soit jamais masquée par la maison.
 * Quelques matériaux par bâtiment, aucun coût par image tant que rien ne change.
 */
import * as THREE from 'three';

export interface FadeWall {
  mats: THREE.Material[];
  /** Centre et normale SORTANTE du mur (repère local du bâtiment). */
  lx: number;
  lz: number;
  nx: number;
  nz: number;
  /**
   * `shell` : mur, effacé quand la caméra est de son côté extérieur (joueur dedans), ou en entier quand il cache le joueur (joueur dehors).
   * `roof` : toit, invisible quand le joueur est dedans, transparent quand il cache le joueur.
   */
  mode: 'shell' | 'roof';
}

const FADED = 0.1;

export class WallFader {
  constructor(public walls: FadeWall[]) {}

  /**
   * Positions en repère local. `inside` : le joueur est dans le bâtiment. `occluding` : le joueur est dehors mais le
   * bâtiment se trouve entre lui et la caméra.
   */
  update(camLx: number, camLz: number, inside: boolean, dt: number, occluding = false): void {
    const k = 1 - Math.exp(-9 * dt);
    for (const w of this.walls) {
      let target = 1;
      if (w.mode === 'roof') {
        target = inside ? 0 : occluding ? FADED : 1;
      } else if (inside) {
        const side = (camLx - w.lx) * w.nx + (camLz - w.lz) * w.nz;
        if (side > 0.1) target = FADED;
      } else if (occluding) {
        target = FADED;
      }
      for (const m of w.mats) {
        const mm = m as THREE.MeshStandardMaterial;
        mm.opacity += (target - mm.opacity) * k;
        if (Math.abs(target - mm.opacity) < 0.01) mm.opacity = target;
        const transparent = mm.opacity < 0.995;
        if (mm.transparent !== transparent) {
          mm.transparent = transparent;
          mm.needsUpdate = true;
        }
        mm.depthWrite = mm.opacity > 0.5;
        if (w.mode === 'roof') mm.visible = mm.opacity > 0.02;
      }
    }
  }
}
