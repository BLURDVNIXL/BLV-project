/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Coque fermée de la maison du joueur : 4 murs, une porte en façade, un toit. Module PUR (aucune dépendance
 * Three.js ni physique) : la même géométrie sert au rendu, aux collisions et aux tests.
 * Repère local : +z = façade (côté rue), x vers la droite quand on regarde la façade depuis la rue.
 */

export const HOUSE_W = 12;
export const HOUSE_D = 9;
export const HOUSE_WALL_H = 3.2;
/** Demi-épaisseur des murs. */
export const HOUSE_WALL_T = 0.15;
/** Largeur de la porte de façade (m). */
export const HOUSE_DOOR_WIDTH = 2.2;

export interface ShellWall {
  x: number; z: number; hx: number; hz: number;
  /** Normale sortante du mur. */
  nx: number; nz: number;
}

const FRONT_PAN = (HOUSE_W / 2 - HOUSE_DOOR_WIDTH / 2) / 2; // demi-longueur de chaque pan de façade
const FRONT_PAN_X = HOUSE_DOOR_WIDTH / 2 + FRONT_PAN;       // centre de chaque pan

/** Les 5 pans de mur (la façade est coupée par la porte). */
export const HOUSE_SHELL_WALLS: ShellWall[] = [
  { x: 0, z: -HOUSE_D / 2, hx: HOUSE_W / 2, hz: HOUSE_WALL_T, nx: 0, nz: -1 },
  { x: -HOUSE_W / 2, z: 0, hx: HOUSE_WALL_T, hz: HOUSE_D / 2, nx: -1, nz: 0 },
  { x: HOUSE_W / 2, z: 0, hx: HOUSE_WALL_T, hz: HOUSE_D / 2, nx: 1, nz: 0 },
  { x: -FRONT_PAN_X, z: HOUSE_D / 2, hx: FRONT_PAN, hz: HOUSE_WALL_T, nx: 0, nz: 1 },
  { x: FRONT_PAN_X, z: HOUSE_D / 2, hx: FRONT_PAN, hz: HOUSE_WALL_T, nx: 0, nz: 1 },
];

/** Passe un point monde en repère local de la maison (inverse de `houseToWorld`). */
export function worldToHouse(cx: number, cz: number, rotationY: number, wx: number, wz: number): { x: number; z: number } {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  const dx = wx - cx;
  const dz = wz - cz;
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/** Vrai si le point local est dans la maison (entre les murs, porte comprise). */
export function insideHouse(lx: number, lz: number): boolean {
  return Math.abs(lx) < HOUSE_W / 2 - 0.2 && lz > -HOUSE_D / 2 + 0.2 && lz < HOUSE_D / 2 - 0.2;
}

/** Vrai si le segment (a → b) traverse le rectangle |x| < hx, |z| < hz (méthode des « slabs »). */
export function segmentCrossesRect(ax: number, az: number, bx: number, bz: number, hx: number, hz: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q, h] of [[dx, ax, hx], [dz, az, hz]] as const) {
    if (Math.abs(p) < 1e-9) {
      if (Math.abs(q) > h) return false;
      continue;
    }
    let u0 = (-h - q) / p;
    let u1 = (h - q) / p;
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0);
    t1 = Math.min(t1, u1);
    if (t0 > t1) return false;
  }
  return true;
}
