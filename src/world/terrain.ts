/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Sol de la ville : couleur de chaque point (eau, tablier, rue, plage, parcelles) cuite en texture par chunk.
 * Fonctions pures (testables sous Node, aucune dépendance au DOM ni à Three.js).
 */

import { Vec2, distanceToSegment } from './geo';
import { District, districtAt, isWater, projected } from './abidjanGeography';
import { ARTERIALS, BRIDGE_GEOMS, BridgeGeom, GRIDS, frameFor } from './roads';
import { CHUNK, insideSpecial } from './city';
import { hash32 } from './rng';

export type RGB = [number, number, number];

const SOCIAL_GROUND: Record<string, RGB> = {
  luxury: [92, 128, 78],
  middle: [128, 134, 86],
  popular: [150, 130, 98],
  informal: [134, 112, 86],
  industrial: [128, 130, 134],
  nature: [58, 100, 58]
};
const SAND: RGB = [226, 210, 160];
const WATER: RGB = [34, 110, 160];
const ASPHALT_ART: RGB = [52, 54, 60];
const ASPHALT_LOC: RGB = [74, 76, 82];
const DECK: RGB = [58, 60, 66];
const PLAZA: RGB = [160, 158, 150];

interface Seg { a: Vec2; b: Vec2; half: number }

/** Contexte préparé pour un chunk : ne garde que les routes et ponts qui le touchent (accélère le tracé). */
export interface TerrainContext {
  x0: number;
  z0: number;
  segs: Seg[];
  bridges: BridgeGeom[];
  uniformDistrict: District | null;
  allDry: boolean;
  allWet: boolean;
  coastNear: boolean;
}

export function prepareTerrain(cx: number, cz: number): TerrainContext {
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const m = 20;
  const segs: Seg[] = [];
  for (const art of ARTERIALS) {
    for (let i = 0; i < art.points.length - 1; i++) {
      const a = art.points[i];
      const b = art.points[i + 1];
      if (Math.max(a.x, b.x) < x0 - m || Math.min(a.x, b.x) > x1 + m || Math.max(a.z, b.z) < z0 - m || Math.min(a.z, b.z) > z1 + m) continue;
      segs.push({ a, b, half: art.width / 2 });
    }
  }
  const bridges = BRIDGE_GEOMS.filter((br) => {
    const r = br.width / 2 + 4;
    return !(Math.max(br.a.x, br.b.x) + r < x0 || Math.min(br.a.x, br.b.x) - r > x1 || Math.max(br.a.z, br.b.z) + r < z0 || Math.min(br.a.z, br.b.z) - r > z1);
  });
  let first: District | null = null;
  let uniform = true;
  let wet = 0;
  let dry = 0;
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
    const p = { x: x0 + (a * CHUNK) / 4, z: z0 + (b * CHUNK) / 4 };
    const d = districtAt(p);
    if (!first) first = d; else if (d.id !== first.id) uniform = false;
    if (isWater(p)) wet++; else dry++;
  }
  const centre = { x: x0 + CHUNK / 2, z: z0 + CHUNK / 2 };
  let coastNear = false;
  const c = projected.coast;
  for (let i = 0; i < c.length - 1; i++) if (distanceToSegment(centre, c[i], c[i + 1]).dist < 60 + CHUNK) coastNear = true;
  return { x0, z0, segs, bridges, uniformDistrict: uniform ? first : null, allDry: wet === 0, allWet: dry === 0, coastNear };
}

const n8 = (x: number, z: number): number => ((hash32(Math.floor(x * 2), Math.floor(z * 2)) & 15) - 8) / 255;

/** Couleur du sol au point p (RGB 0–255). */
export function groundColor(ctx: TerrainContext, p: Vec2): RGB {
  const noise = n8(p.x, p.z);
  const shade = (c: RGB, k = 1): RGB => [Math.max(0, Math.min(255, c[0] * k + noise * 255)), Math.max(0, Math.min(255, c[1] * k + noise * 255)), Math.max(0, Math.min(255, c[2] * k + noise * 255))];

  // 1. Tablier de pont
  for (const br of ctx.bridges) {
    const { dist, t } = distanceToSegment(p, br.a, br.b);
    if (dist < br.width / 2) {
      if (dist > br.width / 2 - 0.6) return shade([225, 225, 225]);                         // ligne de rive
      if (dist < 0.25 && Math.floor(t * 400) % 2 === 0) return shade([232, 200, 70]);       // axe jaune pointillé
      return shade(DECK);
    }
  }
  // 2. Eau
  const wet = ctx.allWet ? true : ctx.allDry ? false : isWater(p);
  if (wet) {
    const wave = Math.sin(p.x * 0.11 + p.z * 0.07) * 0.04 + Math.sin(p.z * 0.19 - p.x * 0.05) * 0.03;
    return shade(WATER, 1 + wave);
  }
  // 3. Repères : esplanade
  if (insideSpecial(p, 2)) return shade(PLAZA);
  // 4. Grands axes
  for (const s of ctx.segs) {
    const { dist } = distanceToSegment(p, s.a, s.b);
    if (dist < s.half) {
      if (dist < 0.25 && (Math.floor((p.x + p.z) / 4) & 1) === 0) return shade([232, 200, 70]);
      if (dist > s.half - 0.5) return shade([215, 215, 215]);
      return shade(ASPHALT_ART);
    }
  }
  // 5. Rues locales (grille de la commune)
  const d = ctx.uniformDistrict ?? districtAt(p);
  const g = GRIDS[d.id];
  if (g && g.style !== 'none') {
    const f = frameFor(d.id);
    const dx = p.x - f.ox;
    const dz = p.z - f.oz;
    const u = dx * f.c + dz * f.s;
    const v = -dx * f.s + dz * f.c;
    const mu = ((u % f.pitch) + f.pitch) % f.pitch;
    const mv = ((v % f.pitch) + f.pitch) % f.pitch;
    const du = Math.min(mu, f.pitch - mu);
    const dv = Math.min(mv, f.pitch - mv);
    if (du < f.street / 2 || dv < f.street / 2) {
      const dc = Math.min(du < f.street / 2 ? du : 99, dv < f.street / 2 ? dv : 99);
      if (dc < 0.2 && (Math.floor((u + v) / 3) & 1) === 0) return shade([200, 200, 195]);
      return shade(ASPHALT_LOC);
    }
  }
  // 6. Plage (près de la côte atlantique)
  if (ctx.coastNear) {
    const c = projected.coast;
    for (let i = 0; i < c.length - 1; i++) if (distanceToSegment(p, c[i], c[i + 1]).dist < 45) return shade(SAND);
  }
  // 7. Sol selon le profil de la commune
  return shade(SOCIAL_GROUND[d.social] ?? SOCIAL_GROUND.middle);
}

/** Texture de sol RGBA (n × n) d'un chunk : la rangée 0 correspond au bord nord (z0). */
export function bakeGround(cx: number, cz: number, n = 128): Uint8Array {
  const ctx = prepareTerrain(cx, cz);
  const out = new Uint8Array(n * n * 4);
  const step = CHUNK / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const col = groundColor(ctx, { x: ctx.x0 + (c + 0.5) * step, z: ctx.z0 + (r + 0.5) * step });
      const o = (r * n + c) * 4;
      out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
    }
  }
  return out;
}
