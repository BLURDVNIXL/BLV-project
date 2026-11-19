/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * « Le joueur ne voit jamais un PNJ apparaître ou disparaître » : un point est INVISIBLE s'il est hors du cône de
 * la caméra (avec une marge, car la caméra à l'épaule tourne vite) ou caché derrière un bâtiment haut.
 * Module PUR (pas de THREE) : vue + emprises de bâtiments en coordonnées monde (plan x, z).
 */

/** Caméra projetée sur le plan : position, cap (l'avant est (−sin yaw, −cos yaw)) et demi-angle de champ horizontal. */
export interface ViewState {
  x: number;
  z: number;
  yaw: number;
  /** Demi-angle horizontal du champ (rad). */
  halfFov: number;
}

/** Emprise d'un bâtiment (boîte orientée, axes e1 = (cos a, sin a), e2 = (−sin a, cos a), convention du moteur physique). */
export interface Occluder {
  x: number;
  z: number;
  hx: number;
  hz: number;
  cos: number;
  sin: number;
  h: number;
}

/** Hauteur minimale (m) d'un bâtiment pour cacher un piéton à la caméra. */
export const OCCLUDER_MIN_HEIGHT = 5;
/** En deçà de cette distance (m) de la caméra, un point est toujours considéré visible. */
export const ALWAYS_VISIBLE_DIST = 3;

/** Demi-angle horizontal (rad) à partir du champ vertical (deg) et du rapport d'aspect. */
export function horizontalHalfFov(vFovDeg: number, aspect: number): number {
  const v = (vFovDeg * Math.PI) / 180;
  return Math.atan(Math.tan(v / 2) * Math.max(aspect, 0.5));
}

/** Angle (rad, ≥ 0) entre l'axe de la caméra et la direction du point. */
export function angleFromView(view: ViewState, x: number, z: number): number {
  const dx = x - view.x;
  const dz = z - view.z;
  const fx = -Math.sin(view.yaw);
  const fz = -Math.cos(view.yaw);
  const dot = dx * fx + dz * fz;
  const cross = dx * fz - dz * fx;
  return Math.abs(Math.atan2(cross, dot));
}

/** Le point est dans le cône de la caméra élargi de `margin` rad. */
export function inViewCone(view: ViewState, x: number, z: number, margin: number): boolean {
  if (Math.hypot(x - view.x, z - view.z) < ALWAYS_VISIBLE_DIST) return true;
  return angleFromView(view, x, z) <= view.halfFov + margin;
}

/** Le segment [A, B] traverse la boîte (test par « slabs » dans le repère de la boîte). */
export function segmentHitsOccluder(ax: number, az: number, bx: number, bz: number, o: Occluder): boolean {
  const rax = ax - o.x;
  const raz = az - o.z;
  const rbx = bx - o.x;
  const rbz = bz - o.z;
  // Repère local : e1 = (cos, sin), e2 = (−sin, cos)
  const lax = rax * o.cos + raz * o.sin;
  const laz = -rax * o.sin + raz * o.cos;
  const lbx = rbx * o.cos + rbz * o.sin;
  const lbz = -rbx * o.sin + rbz * o.cos;
  let t0 = 0;
  let t1 = 1;
  const dx = lbx - lax;
  const dz = lbz - laz;
  const axes: Array<[number, number, number]> = [[lax, dx, o.hx], [laz, dz, o.hz]];
  for (const [p, d, h] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < -h || p > h) return false;
    } else {
      let ta = (-h - p) / d;
      let tb = (h - p) / d;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
  }
  return true;
}

/** Un bâtiment haut se trouve entre la caméra et le point. */
export function isOccluded(view: ViewState, x: number, z: number, occluders: Iterable<Occluder>): boolean {
  for (const o of occluders) {
    if (o.h < OCCLUDER_MIN_HEIGHT) continue;
    // Une boîte qui contient la caméra ne la cache pas (caméra collée à une façade)
    const rx = view.x - o.x;
    const rz = view.z - o.z;
    if (Math.abs(rx * o.cos + rz * o.sin) < o.hx && Math.abs(-rx * o.sin + rz * o.cos) < o.hz) continue;
    if (segmentHitsOccluder(view.x, view.z, x, z, o)) return true;
  }
  return false;
}

/**
 * Le point est invisible : hors du cône (avec `margin`) OU caché par un bâtiment.
 * C'est le seul droit d'apparaître ou de disparaître d'un PNJ.
 */
export function isHiddenFromView(view: ViewState, x: number, z: number, margin: number, occluders: Iterable<Occluder>): boolean {
  if (Math.hypot(x - view.x, z - view.z) < ALWAYS_VISIBLE_DIST) return false;
  if (!inViewCone(view, x, z, margin)) return true;
  return isOccluded(view, x, z, occluders);
}

/** Boîte d'occlusion d'un bâtiment (`angle` : convention physique). */
export function occluderOf(b: { x: number; z: number; w: number; d: number; h: number; angle: number }): Occluder {
  return { x: b.x, z: b.z, hx: b.w / 2, hz: b.d / 2, cos: Math.cos(b.angle), sin: Math.sin(b.angle), h: b.h };
}
