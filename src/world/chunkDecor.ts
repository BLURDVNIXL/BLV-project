/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Source unique (pure, sans Three.js ni DOM) des décorations de chunk et de leurs solides physiques :
 * - Détails architecturaux au sol (piliers de véranda/porche, murets de clôture, bougainvilliers, bidons, kiosques)
 * - Mobilier de grands axes (lampadaires, abribus SOTRA)
 * - Mobilier de rues locales (poteaux électriques, micro-étals, poubelles, bacs fleuris, voitures garées)
 * - Sous-bois du Banco et plage atlantique (pirogues échouées, parasols)
 * - Éléments purement traversables (touffes d'herbe 3D, flaques d'eau)
 */

import { Building, ChunkData, CHUNK, carSpotForLot, insideSpecial } from './city';
import { isHospitalId } from './hospitals';
import { districtAt, isWater, projected } from './abidjanGeography';
import { ARTERIALS, ARTERIAL_WIDTH, GRIDS, bridgeAt, frameFor, nearestArterial, roadAt } from './roads';
import { distanceToSegment } from './geo';
import { hash32 } from './rng';

export type ChunkSolid =
  | { shape: 'box'; x: number; z: number; hx: number; hz: number; angle: number; h: number }
  | { shape: 'circle'; x: number; z: number; r: number; h: number };

export interface BoxDecor {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  h: number;
  angle: number;
  color: number;
  roofColor?: number;
}

export interface ShrubDecor {
  x: number;
  z: number;
  r: number;
  h: number;
  color: number;
}

export interface LampDecor {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  h: number;
  angle: number;
  color: number;
}

export interface StreetlampDecor {
  poleX: number;
  poleZ: number;
  armX: number;
  armZ: number;
  bulbX: number;
  bulbZ: number;
  angle: number;
}

export interface ShelterDecor {
  x: number;
  z: number;
  backX: number;
  backZ: number;
  post1X: number;
  post1Z: number;
  post2X: number;
  post2Z: number;
  angle: number;
}

export interface PoleDecor {
  x: number;
  z: number;
  bulbX: number;
  bulbZ: number;
  wireMidX?: number;
  wireMidZ?: number;
  wireLen?: number;
  angle: number;
}

export interface StallDecor {
  x: number;
  z: number;
  angle: number;
  tarpColor: number;
}

export interface ParkedCarDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface PirogueDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface ParasolDecor {
  x: number;
  z: number;
  angle: number;
  color: number;
}

export interface GrassDecor {
  x: number;
  z: number;
  scale: number;
  color: number;
}

export interface PuddleDecor {
  x: number;
  z: number;
  rx: number;
  rz: number;
  seed: number;
}

export interface ChunkDecorPlan {
  buildingBoxes: BoxDecor[];
  buildingLamps: LampDecor[];
  buildingShrubs: ShrubDecor[];
  streetlamps: StreetlampDecor[];
  shelters: ShelterDecor[];
  poles: PoleDecor[];
  stalls: StallDecor[];
  bins: Array<{ x: number; z: number; angle: number }>;
  shrubs: ShrubDecor[];
  parkedCars: ParkedCarDecor[];
  pirogues: PirogueDecor[];
  parasols: ParasolDecor[];
  grass: GrassDecor[];
  puddles: PuddleDecor[];
  solids: ChunkSolid[];
}

export const VILLA_WALLED_DISTRICTS = new Set(['cocody', 'riviera', 'grand_bassam']);
export const NEON_DISTRICTS = new Set(['yopougon', 'treichville', 'marcory', 'adjame', 'abobo']);

const HERO_LANDMARKS = new Set([
  'port_collider', 'stade', 'cathedrale', 'hotel_ivoire', 'lycee_caiman', 'lycee_alysma',
  'lycee_alex', 'marche_adjame', 'port', 'maquis', 'mairie',
]);

const AWNING_COLORS = [0xea580c, 0x16a34a, 0x2563eb, 0xd97706, 0xdc2626];
const NEON_SIGN_COLORS = [0xf97316, 0x38bdf8, 0xf43f5e, 0xfacc15, 0x34d399];
const PARASOL_COLORS = [0xef4444, 0x0ea5e9, 0xf59e0b, 0x10b981, 0xf97316];
const BOUGAINVILLEA_COLORS = [0xd946ef, 0xf43f5e, 0xf97316, 0xa855f7];
const PARKED_CAR_COLORS = [0xeab308, 0x2563eb, 0xdc2626, 0xf8fafc, 0x64748b, 0x059669];

const CREAM_TRIM = 0xe2e8f0;
const TRIM_DARK = 0x334155;

function overlapsAnyBuilding(buildings: Building[], selfId: string, x: number, z: number, r: number): boolean {
  for (const b of buildings) {
    if (b.id === selfId || !b.solid) continue;
    const dx = x - b.x;
    const dz = z - b.z;
    const maxR = Math.hypot(b.w, b.d) * 0.5 + r;
    if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    if (Math.abs(lx) < b.w * 0.5 + r && Math.abs(lz) < b.d * 0.5 + r) return true;
  }
  return false;
}

/**
 * Calcule de manière déterministe toutes les décorations d'un chunk ainsi que leurs solides physiques.
 * Pur et sans dépendance Three.js / DOM.
 */
export function collectChunkDecor(data: ChunkData): ChunkDecorPlan {
  const x0 = data.cx * CHUNK;
  const z0 = data.cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const inChunk = (x: number, z: number): boolean => x >= x0 && x < x1 && z >= z0 && z < z1;
  const nearBuilding = (x: number, z: number, margin = 1.9): boolean =>
    data.buildings.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) * 0.5 + margin);

  const plan: ChunkDecorPlan = {
    buildingBoxes: [],
    buildingLamps: [],
    buildingShrubs: [],
    streetlamps: [],
    shelters: [],
    poles: [],
    stalls: [],
    bins: [],
    shrubs: [],
    parkedCars: [],
    pirogues: [],
    parasols: [],
    grass: [],
    puddles: [],
    solids: [],
  };

  // 0. Détails architecturaux attachés aux bâtiments (piliers, murets, bougainvilliers, bidons, kiosques)
  data.buildings.forEach((b, seedIdx) => {
    if (b.landmark && (HERO_LANDMARKS.has(b.landmark) || isHospitalId(b.landmark))) return;
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);

    if (b.kind === 'tower' || b.kind === 'warehouse' || b.kind === 'container') return;

    if (b.kind === 'villa' || b.kind === 'house') {
      if (b.kind !== 'villa') return;
      const roofHex = VILLA_WALLED_DISTRICTS.has(b.district) ? 0xb44c2e : 0x8f3a24;
      const vx = b.x - s * (b.d * 0.56);
      const vz = b.z + c * (b.d * 0.56);
      // Auvent de véranda (au-dessus de 2,5 m : visuel uniquement)
      plan.buildingBoxes.push({ x: vx, z: vz, w: b.w * 0.58, d: 1.8, y0: 2.5, h: 0.28, angle: b.angle, color: 0xd97706, roofColor: roofHex });

      // Colonnes de véranda (solides)
      for (const side of [-1, 1]) {
        const px = vx + c * side * (b.w * 0.25);
        const pz = vz + s * side * (b.w * 0.25);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5)) {
          plan.buildingBoxes.push({ x: px, z: pz, w: 0.24, d: 0.24, y0: 0, h: 2.5, angle: b.angle, color: CREAM_TRIM });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 0.12, hz: 0.12, angle: b.angle, h: 2.5 });
        }
      }

      if (VILLA_WALLED_DISTRICTS.has(b.district)) {
        const wallCol = 0xe7dfd1;
        const wallCap = 0x9a442c;
        const backX = b.x + s * (b.d * 0.5 + 1.2);
        const backZ = b.z - c * (b.d * 0.5 + 1.2);
        const bp = { x: backX, z: backZ };
        if (!isWater(bp) && roadAt(bp) === 'none' && !insideSpecial(bp, 2) && !overlapsAnyBuilding(data.buildings, b.id, backX, backZ, 0.2)) {
          plan.buildingBoxes.push({ x: backX, z: backZ, w: b.w + 2.4, d: 0.35, y0: 0, h: 1.35, angle: b.angle, color: wallCol, roofColor: wallCap });
          plan.solids.push({ shape: 'box', x: backX, z: backZ, hx: (b.w + 2.4) / 2, hz: 0.175, angle: b.angle, h: 1.35 });
        }
        for (const side of [-1, 1]) {
          const sx = b.x + c * side * (b.w * 0.5 + 1.1);
          const sz = b.z + s * side * (b.w * 0.5 + 1.1);
          const sp = { x: sx, z: sz };
          if (!isWater(sp) && roadAt(sp) === 'none' && !insideSpecial(sp, 2) && !overlapsAnyBuilding(data.buildings, b.id, sx, sz, 0.2)) {
            plan.buildingBoxes.push({ x: sx, z: sz, w: 0.35, d: b.d + 1.8, y0: 0, h: 1.35, angle: b.angle, color: wallCol, roofColor: wallCap });
            plan.solids.push({ shape: 'box', x: sx, z: sz, hx: 0.175, hz: (b.d + 1.8) / 2, angle: b.angle, h: 1.35 });
          }
          const fx = b.x + c * side * (b.w * 0.45 + 0.8) - s * (b.d * 0.52);
          const fz = b.z + s * side * (b.w * 0.45 + 0.8) + c * (b.d * 0.52);
          const fp = { x: fx, z: fz };
          if (!isWater(fp) && roadAt(fp) === 'none' && !insideSpecial(fp, 2) && !overlapsAnyBuilding(data.buildings, b.id, fx, fz, 0.5)) {
            const flower = BOUGAINVILLEA_COLORS[(seedIdx + (side > 0 ? 1 : 0)) % BOUGAINVILLEA_COLORS.length];
            plan.buildingShrubs.push({ x: fx, z: fz, r: 0.78, h: 1.4, color: flower });
            plan.solids.push({ shape: 'circle', x: fx, z: fz, r: 0.62, h: 1.4 });
          }
        }
      }
      return;
    }

    if (b.kind === 'shack') {
      if (seedIdx % 2 === 0) {
        const px = b.x - s * (b.d * 0.52 + 0.55);
        const pz = b.z + c * (b.d * 0.52 + 0.55);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5)) {
          const postX = px + c * (b.w * 0.22);
          const postZ = pz + s * (b.w * 0.22);
          const canX = px - c * (b.w * 0.22);
          const canZ = pz - s * (b.w * 0.22);
          // Auvent tôle (hauteur 1,95 m) : le poteau et le bidon au sol bloquent
          plan.buildingBoxes.push({ x: postX, z: postZ, w: 0.12, d: 0.12, y0: 0, h: 1.95, angle: b.angle, color: 0x78350f });
          plan.buildingBoxes.push({ x: canX, z: canZ, w: 0.42, d: 0.36, y0: 0, h: 0.52, angle: b.angle, color: 0x2563eb, roofColor: 0x1d4ed8 });
          plan.solids.push({ shape: 'box', x: postX, z: postZ, hx: 0.08, hz: 0.08, angle: b.angle, h: 1.95 });
          plan.solids.push({ shape: 'box', x: canX, z: canZ, hx: 0.21, hz: 0.18, angle: b.angle, h: 0.52 });
        }
      }
      return;
    }

    // Bloc urbain : corniches, balcons (en hauteur, traversables dessous), piliers d'auvent et kiosques au sol
    if (b.h >= 6.5) {
      const balX = b.x - s * (b.d * 0.5 + 0.45);
      const balZ = b.z + c * (b.d * 0.5 + 0.45);
      plan.buildingBoxes.push({ x: b.x, z: b.z, w: b.w * 1.03, d: b.d * 1.03, y0: 3.25, h: 0.24, angle: b.angle, color: CREAM_TRIM });
      plan.buildingBoxes.push({ x: balX, z: balZ, w: b.w * 0.62, d: 0.9, y0: 3.35, h: 0.16, angle: b.angle, color: CREAM_TRIM });
      plan.buildingBoxes.push({ x: balX - s * 0.38, z: balZ + c * 0.38, w: b.w * 0.62, d: 0.08, y0: 3.5, h: 0.68, angle: b.angle, color: TRIM_DARK });
    }

    if (seedIdx % 3 === 1) {
      const tx = b.x + c * (b.w * 0.24);
      const tz = b.z + s * (b.w * 0.24);
      const tankCol = seedIdx % 2 === 0 ? 0x1d4ed8 : 0x1e293b;
      plan.buildingBoxes.push({ x: tx, z: tz, w: 1.35, d: 1.35, y0: b.h + 0.55, h: 1.45, angle: b.angle, color: tankCol });
    }

    const ax = b.x - s * (b.d * 0.5 + 0.72);
    const az = b.z + c * (b.d * 0.5 + 0.72);
    if (seedIdx % 2 === 0) {
      const awnColor = AWNING_COLORS[seedIdx % AWNING_COLORS.length];
      plan.buildingBoxes.push({ x: ax, z: az, w: b.w * 0.78, d: 1.45, y0: 2.8, h: 0.25, angle: b.angle, color: awnColor });
      for (const side of [-1, 1]) {
        const px = ax + c * side * (b.w * 0.34);
        const pz = az + s * side * (b.w * 0.34);
        const pp = { x: px, z: pz };
        if (!isWater(pp) && roadAt(pp) === 'none' && !insideSpecial(pp, 1.5) && !overlapsAnyBuilding(data.buildings, b.id, px, pz, 0.15)) {
          plan.buildingBoxes.push({ x: px, z: pz, w: 0.18, d: 0.18, y0: 0, h: 2.8, angle: b.angle, color: CREAM_TRIM });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 0.10, hz: 0.10, angle: b.angle, h: 2.8 });
        }
      }
    }

    if (NEON_DISTRICTS.has(b.district) && seedIdx % 2 === 0) {
      const neonCol = NEON_SIGN_COLORS[seedIdx % NEON_SIGN_COLORS.length];
      const nx = b.x - s * (b.d * 0.5 + 0.16);
      const nz = b.z + c * (b.d * 0.5 + 0.16);
      plan.buildingLamps.push({ x: nx, z: nz, w: Math.min(4.2, b.w * 0.55), d: 0.18, y0: 3.25, h: 0.45, angle: b.angle, color: neonCol });
    }

    if (NEON_DISTRICTS.has(b.district) && seedIdx % 5 === 1) {
      const kx = b.x - s * (b.d * 0.5 + 1.55) + c * (b.w * 0.22);
      const kz = b.z + c * (b.d * 0.5 + 1.55) + s * (b.w * 0.22);
      const kp = { x: kx, z: kz };
      if (!isWater(kp) && roadAt(kp) === 'none' && !insideSpecial(kp, 2) && !overlapsAnyBuilding(data.buildings, b.id, kx, kz, 0.9)) {
        const tarp = PARASOL_COLORS[seedIdx % PARASOL_COLORS.length];
        plan.buildingBoxes.push({ x: kx, z: kz, w: 1.6, d: 0.9, y0: 0, h: 0.85, angle: b.angle, color: 0x92400e });
        plan.buildingBoxes.push({ x: kx, z: kz, w: 0.1, d: 0.1, y0: 0.85, h: 1.45, angle: b.angle, color: 0x92400e });
        plan.buildingBoxes.push({ x: kx, z: kz, w: 1.9, d: 1.9, y0: 2.25, h: 0.16, angle: b.angle, color: tarp });
        plan.solids.push({ shape: 'box', x: kx, z: kz, hx: 0.8, hz: 0.45, angle: b.angle, h: 0.85 });
        plan.solids.push({ shape: 'circle', x: kx, z: kz, r: 0.1, h: 2.25 });
      }
    }
  });

  // 1. Grands axes : lampadaires & abribus SOTRA
  for (const art of ARTERIALS) {
    const half = art.width / 2;
    for (let i = 0; i < art.points.length - 1; i++) {
      const a = art.points[i];
      const b = art.points[i + 1];
      if (Math.max(a.x, b.x) < x0 - 16 || Math.min(a.x, b.x) > x1 + 16) continue;
      if (Math.max(a.z, b.z) < z0 - 16 || Math.min(a.z, b.z) > z1 + 16) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;
      const roadAngle = Math.atan2(uz, ux);
      const step = 28;
      const nSteps = Math.floor(len / step);

      for (let k = 1; k < nSteps; k++) {
        const distAlong = k * step;
        const side = k % 2 === 0 ? 1 : -1;
        const lx = a.x + ux * distAlong + nx * side * (half + 0.65);
        const lz = a.z + uz * distAlong + nz * side * (half + 0.65);
        if (!inChunk(lx, lz)) continue;
        const lp = { x: lx, z: lz };
        if (isWater(lp) || bridgeAt(lp, 2.5) || insideSpecial(lp, 2) || roadAt(lp) !== 'none') continue;

        plan.streetlamps.push({
          poleX: lx,
          poleZ: lz,
          armX: lx - nx * side * 0.75,
          armZ: lz - nz * side * 0.75,
          bulbX: lx - nx * side * 1.25,
          bulbZ: lz - nz * side * 1.25,
          angle: roadAngle,
        });
        plan.solids.push({ shape: 'box', x: lx, z: lz, hx: 0.12, hz: 0.12, angle: roadAngle, h: 5.4 });

        if (k % 5 === 2) {
          const sx = a.x + ux * distAlong + nx * side * (half + 2.1);
          const sz = a.z + uz * distAlong + nz * side * (half + 2.1);
          const sp = { x: sx, z: sz };
          if (
            inChunk(sx, sz) &&
            !isWater(sp) &&
            !bridgeAt(sp, 4) &&
            roadAt(sp) === 'none' &&
            !insideSpecial(sp, 3) &&
            !nearBuilding(sx, sz, 2.4)
          ) {
            const backX = sx + nx * side * 0.55;
            const backZ = sz + nz * side * 0.55;
            const post1X = sx - ux * 1.55;
            const post1Z = sz - uz * 1.55;
            const post2X = sx + ux * 1.55;
            const post2Z = sz + uz * 1.55;
            plan.shelters.push({ x: sx, z: sz, backX, backZ, post1X, post1Z, post2X, post2Z, angle: roadAngle });
            // Paroi vitrée arrière, banc et 2 poteaux d'extrémité
            plan.solids.push({ shape: 'box', x: backX, z: backZ, hx: 1.7, hz: 0.09, angle: roadAngle, h: 2.35 });
            plan.solids.push({ shape: 'box', x: sx, z: sz, hx: 1.3, hz: 0.23, angle: roadAngle, h: 0.56 });
            plan.solids.push({ shape: 'box', x: post1X, z: post1Z, hx: 0.09, hz: 0.09, angle: roadAngle, h: 2.35 });
            plan.solids.push({ shape: 'box', x: post2X, z: post2Z, hx: 0.09, hz: 0.09, angle: roadAngle, h: 2.35 });
          }
        }
      }
    }
  }

  // 2. Rues locales : poteaux & câbles électriques, micro-étals, poubelles, bacs fleuris, voitures garées, flaques, herbes
  const centre = { x: x0 + CHUNK / 2, z: z0 + CHUNK / 2 };
  const cDist = districtAt(centre);
  const g = GRIDS[cDist.id];
  const grassColor = cDist.id === 'banco' ? 0x2d6a2e : cDist.social === 'luxury' ? 0x4b8f38 : 0x5f8c3a;
  const lotCarSpots = data.houseLots.map((l) => carSpotForLot(l));

  if (g && g.style !== 'none') {
    const f = frameFor(cDist.id);
    const angle = Math.atan2(f.s, f.c);
    const half = f.street / 2;
    const toWorld = (u: number, v: number) => ({
      x: f.ox + u * f.c - v * f.s,
      z: f.oz + u * f.s + v * f.c,
    });

    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      const dx = px - f.ox;
      const dz = pz - f.oz;
      const u = dx * f.c + dz * f.s;
      const v = -dx * f.s + dz * f.c;
      umin = Math.min(umin, u); umax = Math.max(umax, u);
      vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
    }
    const iMin = Math.floor(umin / f.pitch) - 1;
    const iMax = Math.floor(umax / f.pitch) + 1;
    const jMin = Math.floor(vmin / f.pitch) - 1;
    const jMax = Math.floor(vmax / f.pitch) + 1;

    for (let i = iMin; i <= iMax; i++) {
      for (let j = jMin; j <= jMax; j++) {
        const blockHash = hash32(i, j, cDist.id.charCodeAt(0));

        // Poteaux électriques + lampes + câbles le long de l'axe V
        const uPole = i * f.pitch + half + 0.55;
        const vMid = (j + 0.5) * f.pitch;
        const vQuarter1 = (j + 0.25) * f.pitch;
        const vQuarter3 = (j + 0.75) * f.pitch;

        for (const [idxV, vPos] of [vQuarter1, vQuarter3].entries()) {
          const pw = toWorld(uPole, vPos);
          if (
            inChunk(pw.x, pw.z) &&
            districtAt(pw).id === cDist.id &&
            !isWater(pw) &&
            !bridgeAt(pw, 3) &&
            !insideSpecial(pw, 2) &&
            roadAt(pw) === 'none'
          ) {
            const wireMid = idxV === 0 ? toWorld(uPole, vMid) : undefined;
            plan.poles.push({
              x: pw.x,
              z: pw.z,
              bulbX: pw.x - f.c * 0.35,
              bulbZ: pw.z - f.s * 0.35,
              wireMidX: wireMid?.x,
              wireMidZ: wireMid?.z,
              wireLen: wireMid ? f.pitch * 0.5 : undefined,
              angle,
            });
            plan.solids.push({ shape: 'box', x: pw.x, z: pw.z, hx: 0.11, hz: 0.11, angle, h: 5.2 });
          }
        }

        // Touffes d'herbe réelles (traversables, pas de solide)
        for (let gStep = 0; gStep < 6; gStep++) {
          const gv = j * f.pitch + half + 2.4 + (gStep / 6) * (f.pitch - f.street - 4.8);
          const gu = i * f.pitch + (gStep % 2 === 0 ? half + 1.65 : -(half + 1.65));
          const gp = toWorld(gu, gv);
          if (
            inChunk(gp.x, gp.z) &&
            districtAt(gp).id === cDist.id &&
            !isWater(gp) &&
            roadAt(gp) === 'none' &&
            !insideSpecial(gp, 2) &&
            !nearBuilding(gp.x, gp.z, 0.9)
          ) {
            plan.grass.push({ x: gp.x, z: gp.z, scale: 0.85 + (gStep % 3) * 0.25, color: grassColor });
          }
        }

        // Micro-étals / poubelles / bacs fleuris sur le trottoir
        const vSide = j * f.pitch + half + 0.9;
        const stallU = i * f.pitch + f.pitch * 0.36;
        const sp = toWorld(stallU, vSide);
        if (
          inChunk(sp.x, sp.z) &&
          districtAt(sp).id === cDist.id &&
          !isWater(sp) &&
          !bridgeAt(sp, 3) &&
          !insideSpecial(sp, 3) &&
          !nearBuilding(sp.x, sp.z, 1.5) &&
          roadAt(sp) === 'none'
        ) {
          if ((blockHash & 3) === 0) {
            const tarpColor = PARASOL_COLORS[blockHash % PARASOL_COLORS.length];
            plan.stalls.push({ x: sp.x, z: sp.z, angle, tarpColor });
            plan.solids.push({ shape: 'box', x: sp.x, z: sp.z, hx: 0.725, hz: 0.425, angle, h: 0.8 });
            plan.solids.push({ shape: 'circle', x: sp.x, z: sp.z, r: 0.08, h: 2.15 });
          } else if ((blockHash & 3) === 1) {
            plan.bins.push({ x: sp.x, z: sp.z, angle });
            plan.solids.push({ shape: 'box', x: sp.x, z: sp.z, hx: 0.24, hz: 0.24, angle, h: 0.78 });
            const flX = sp.x - f.s * 0.9;
            const flZ = sp.z + f.c * 0.9;
            const fp = { x: flX, z: flZ };
            if (!isWater(fp) && roadAt(fp) === 'none' && !nearBuilding(flX, flZ, 0.8)) {
              const flowerCol = BOUGAINVILLEA_COLORS[blockHash % BOUGAINVILLEA_COLORS.length];
              plan.shrubs.push({ x: flX, z: flZ, r: 0.52, h: 0.95, color: flowerCol });
              plan.solids.push({ shape: 'circle', x: flX, z: flZ, r: 0.48, h: 0.95 });
            }
          }
        }

        // Voiture garée en bord de rue (collée au caniveau pour ne jamais gêner les voies de circulation)
        if ((blockHash % 5) === 0) {
          const curbOffset = f.street >= 7 ? 0.62 : 0.52;
          const carPos = toWorld(i * f.pitch + f.pitch * 0.62, j * f.pitch - (half - curbOffset));
          if (
            inChunk(carPos.x, carPos.z) &&
            districtAt(carPos).id === cDist.id &&
            !isWater(carPos) &&
            !bridgeAt(carPos, 4) &&
            !insideSpecial(carPos, 4) &&
            nearestArterial(carPos).dist > ARTERIAL_WIDTH / 2 + 2.5 &&
            !nearBuilding(carPos.x, carPos.z, 1.4) &&
            !lotCarSpots.some((cs) => Math.hypot(cs.x - carPos.x, cs.z - carPos.z) < 4.5)
          ) {
            const color = PARKED_CAR_COLORS[blockHash % PARKED_CAR_COLORS.length];
            plan.parkedCars.push({ x: carPos.x, z: carPos.z, angle, color });
            plan.solids.push({ shape: 'box', x: carPos.x, z: carPos.z, hx: 1.8, hz: 0.81, angle, h: 1.36 });
          }
        }

        // Flaque d'eau en caniveau (traversable, pas de solide)
        if ((blockHash % 3) === 0) {
          const pud = toWorld(i * f.pitch + f.pitch * 0.45, j * f.pitch + (half - 0.45));
          if (inChunk(pud.x, pud.z) && !isWater(pud) && !bridgeAt(pud, 2)) {
            plan.puddles.push({ x: pud.x, z: pud.z, rx: 1.4, rz: 0.7, seed: blockHash });
          }
        }
      }
    }
  }

  // 3. Touffes d'herbe & sous-bois autour des arbres (et buissons solides du Banco)
  const primaryDistrict = data.buildings[0]?.district ?? cDist.id;
  for (let i = 0; i < data.trees.length; i++) {
    const t = data.trees[i];
    const h = hash32(Math.floor(t.x), Math.floor(t.z), i);
    for (let k = 0; k < 2; k++) {
      const a = ((h + k * 97) % 360) * (Math.PI / 180);
      const r = 1.1 + ((h >> (k * 3)) & 3) * 0.45;
      const gx = t.x + Math.cos(a) * r;
      const gz = t.z + Math.sin(a) * r;
      if (inChunk(gx, gz) && !isWater({ x: gx, z: gz }) && roadAt({ x: gx, z: gz }) === 'none') {
        plan.grass.push({ x: gx, z: gz, scale: 0.9 + (k % 2) * 0.35, color: grassColor });
      }
    }

    if (primaryDistrict === 'banco') {
      const th = Math.abs(Math.floor(t.x * 7 + t.z * 13 + i)) | 0;
      if (th % 2 === 0) {
        const ba = (th % 12) * 0.52;
        const bx = t.x + Math.cos(ba) * 1.4;
        const bz = t.z + Math.sin(ba) * 1.4;
        const bp = { x: bx, z: bz };
        if (inChunk(bx, bz) && !isWater(bp) && !bridgeAt(bp, 2) && roadAt(bp) === 'none') {
          plan.shrubs.push({ x: bx, z: bz, r: 1.1, h: 1.65, color: 0x2f6b31 });
          plan.solids.push({ shape: 'circle', x: bx, z: bz, r: 0.75, h: 1.65 });
        }
      }
    }
  }

  // 4. Plage atlantique (Port-Bouët / Grand-Bassam / Vridi) : pirogues échouées & parasols
  if (cDist.id === 'grand_bassam' || cDist.id === 'port_bouet' || cDist.id === 'vridi') {
    const coast = projected.coast;
    let minChunkCoast = Infinity;
    for (let i = 0; i < coast.length - 1; i++) {
      minChunkCoast = Math.min(minChunkCoast, distanceToSegment(centre, coast[i], coast[i + 1]).dist);
    }
    if (minChunkCoast < 90) {
      for (let slot = 0; slot < 4; slot++) {
        const rx = ((hash32(data.cx, data.cz, slot * 17 + 3) & 255) / 255) * (CHUNK - 10) + 5;
        const rz = ((hash32(data.cx, data.cz, slot * 17 + 9) & 255) / 255) * (CHUNK - 10) + 5;
        const px = x0 + rx;
        const pz = z0 + rz;
        const p = { x: px, z: pz };
        if (isWater(p) || roadAt(p) !== 'none' || insideSpecial(p, 3) || nearBuilding(px, pz, 2.5)) continue;
        let minC = Infinity;
        for (let i = 0; i < coast.length - 1; i++) minC = Math.min(minC, distanceToSegment(p, coast[i], coast[i + 1]).dist);
        if (minC < 14 || minC > 42) continue;

        if (slot === 0) {
          const hullCol = hash32(data.cx, data.cz, 99) % 2 === 0 ? 0x1d4ed8 : 0x7c2d12;
          const pAngle = ((slot + data.cx) % 5) * 0.25;
          plan.pirogues.push({ x: px, z: pz, angle: pAngle, color: hullCol });
          plan.solids.push({ shape: 'box', x: px, z: pz, hx: 2.35, hz: 0.46, angle: pAngle, h: 0.5 });
        } else {
          const parasolCol = PARASOL_COLORS[(slot + Math.abs(data.cx + data.cz)) % PARASOL_COLORS.length];
          const pAngle = slot * 0.4;
          plan.parasols.push({ x: px, z: pz, angle: pAngle, color: parasolCol });
          plan.solids.push({ shape: 'circle', x: px, z: pz, r: 0.12, h: 2.15 });
        }
      }
    }
  }

  return plan;
}

/** Retourne uniquement la liste des solides physiques d'un chunk (décorations de rue, plage, végétation basse, extensions). */
export function chunkDecorSolids(data: ChunkData): ChunkSolid[] {
  return collectChunkDecor(data).solids;
}
