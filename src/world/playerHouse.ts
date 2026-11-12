/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Colliders de la maison du joueur (modèle « maison de poupée » de 12 × 9 m : murs arrière et gauche,
 * façade ouverte vers la rue) posée sur une parcelle, avec une rotation quelconque.
 */

import { PhysicsCore, SolidFlag } from '../physics/PhysicsCore';

interface LocalBox { x: number; z: number; hx: number; hz: number; h: number; flags: number }

/** Coordonnées locales (le +z local est la façade, voir city.ts → HouseLot.rotationY). */
export const HOUSE_COLLIDERS: LocalBox[] = [
  { x: 0, z: -4.5, hx: 6, hz: 0.15, h: 3.2, flags: SolidFlag.BUILDING },   // mur arrière
  { x: -6, z: 0, hx: 0.15, hz: 4.5, h: 3.2, flags: SolidFlag.BUILDING },   // mur gauche
  { x: -4, z: -3, hx: 1, hz: 0.75, h: 0.55, flags: SolidFlag.PROP },       // lit
  { x: 3, z: -3.5, hx: 0.5, hz: 0.45, h: 2, flags: SolidFlag.PROP },       // réfrigérateur
  { x: 4, z: 2, hx: 0.6, hz: 0.6, h: 2.2, flags: SolidFlag.PROP },         // douche
  { x: -4, z: 2, hx: 0.9, hz: 0.45, h: 0.75, flags: SolidFlag.PROP }       // bureau
];

/** Position monde d'un point local de la maison (rotation Three.js rotation.y = φ). */
export function houseToWorld(cx: number, cz: number, rotationY: number, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

export function registerPlayerHouse(physics: PhysicsCore, cx: number, cz: number, rotationY: number): number[] {
  const ids: number[] = [];
  for (const b of HOUSE_COLLIDERS) {
    const p = houseToWorld(cx, cz, rotationY, b.x, b.z);
    const id = physics.addBox(p.x, p.z, b.hx, b.hz, -rotationY, b.h, b.flags);
    if (id >= 0) ids.push(id);
  }
  return ids;
}
