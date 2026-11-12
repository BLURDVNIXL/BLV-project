/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Projection géographique : coordonnées GPS réelles (WGS84) -> mètres du monde de jeu.
 * Convention du monde : x vers l'est, z vers le sud (le nord est donc -z), y vers le haut.
 */

/** Échelle de compression des distances entre quartiers (1:4). Les rues et bâtiments gardent leur taille réelle. */
export const WORLD_SCALE = 0.25;

/** Origine du monde (centre de la carte) : latitude / longitude. */
export const ORIGIN = { lat: 5.325, lon: -3.99 } as const;

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

export interface LatLon { lat: number; lon: number }
export interface Vec2 { x: number; z: number }

export function project(lat: number, lon: number): Vec2 {
  return {
    x: (lon - ORIGIN.lon) * M_PER_DEG_LON * WORLD_SCALE,
    z: -(lat - ORIGIN.lat) * M_PER_DEG_LAT * WORLD_SCALE
  };
}

export function unproject(x: number, z: number): LatLon {
  return {
    lat: ORIGIN.lat - z / (M_PER_DEG_LAT * WORLD_SCALE),
    lon: ORIGIN.lon + x / (M_PER_DEG_LON * WORLD_SCALE)
  };
}

/** Distance réelle (m) entre deux points du monde de jeu. */
export function realDistance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z) / WORLD_SCALE;
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): { dist: number; t: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { dist: Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)), t };
}
