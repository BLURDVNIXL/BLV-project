/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Réseau routier d'Abidjan : grands axes (graphe entre communes et ponts) + grille locale par commune.
 * Les largeurs sont en mètres de jeu RÉELS (les rues ne sont pas compressées par l'échelle 1:4).
 */

import { Vec2, distanceToSegment, project } from './geo';
import { BRIDGES, DISTRICTS, District, districtAt, isWater, projected } from './abidjanGeography';

export type RoadKind = 'none' | 'local' | 'arterial' | 'bridge';

/** Paramètres de la grille de rues d'une commune. */
export interface DistrictGrid {
  angleDeg: number;   // orientation du quadrillage
  pitch: number;      // pas des rues (m)
  street: number;     // largeur des rues locales (m)
  lot: number;        // taille d'un lot (m)
  style: 'tower' | 'block' | 'villa' | 'shack' | 'warehouse' | 'none';
}

export const GRIDS: Record<string, DistrictGrid> = {
  plateau:    { angleDeg: 8,   pitch: 66,  street: 11, lot: 60, style: 'tower' },
  adjame:     { angleDeg: 0,   pitch: 52,  street: 8,  lot: 13, style: 'block' },   // rues rectilignes (sourcé)
  attecoube:  { angleDeg: 20,  pitch: 40,  street: 5,  lot: 8,  style: 'shack' },
  yopougon:   { angleDeg: 10,  pitch: 58,  street: 8,  lot: 14, style: 'block' },
  abobo:      { angleDeg: 5,   pitch: 56,  street: 8,  lot: 13, style: 'block' },
  cocody:     { angleDeg: -12, pitch: 92,  street: 9,  lot: 28, style: 'villa' },
  riviera:    { angleDeg: 25,  pitch: 100, street: 10, lot: 30, style: 'villa' },
  treichville:{ angleDeg: 0,   pitch: 58,  street: 9,  lot: 14, style: 'block' },   // rues rectilignes (sourcé)
  marcory:    { angleDeg: 4,   pitch: 66,  street: 9,  lot: 16, style: 'block' },   // rues rectilignes (sourcé)
  koumassi:   { angleDeg: -3,  pitch: 54,  street: 8,  lot: 12, style: 'block' },   // rues rectilignes (sourcé)
  port_bouet: { angleDeg: 12,  pitch: 72,  street: 9,  lot: 16, style: 'block' },
  vridi:      { angleDeg: 0,   pitch: 110, street: 12, lot: 44, style: 'warehouse' },
  banco:      { angleDeg: 0,   pitch: 1000, street: 0, lot: 0,  style: 'none' }
};

export interface Frame { ox: number; oz: number; c: number; s: number; pitch: number; street: number }

export const frameOf = (d: District): Frame => {
  const g = GRIDS[d.id];
  const o = project(d.center.lat, d.center.lon);
  const a = (g.angleDeg * Math.PI) / 180;
  return { ox: o.x, oz: o.z, c: Math.cos(a), s: Math.sin(a), pitch: g.pitch, street: g.street };
};

const FRAMES: Record<string, Frame> = Object.fromEntries(DISTRICTS.map((d) => [d.id, frameOf(d)]));
export const frameFor = (id: string): Frame => FRAMES[id];

/** Grands axes (nœuds en lat/lon) ; les ponts sont insérés tels quels. */
interface ArterialSpec { id: string; name: string; nodes: Array<[number, number]> }
const bridgeNode = (id: string, end: 'from' | 'to'): [number, number] => {
  const b = BRIDGES.find((x) => x.id === id)!;
  return [b[end].lat, b[end].lon];
};
const center = (id: string): [number, number] => {
  const d = DISTRICTS.find((x) => x.id === id)!;
  return [d.center.lat, d.center.lon];
};

const ARTERIAL_SPECS: ArterialSpec[] = [
  { id: 'yopougon_adjame', name: 'Autoroute de Yopougon', nodes: [center('yopougon'), center('attecoube'), bridgeNode('yopougon', 'from'), bridgeNode('yopougon', 'to'), center('adjame')] },
  { id: 'adjame_abobo', name: 'Autoroute du Nord', nodes: [center('adjame'), [5.385, -4.022], center('abobo')] },
  { id: 'adjame_plateau', name: 'Boulevard Nangui Abrogoua', nodes: [center('adjame'), [5.34, -4.022], center('plateau')] },
  { id: 'plateau_fhb', name: 'Boulevard de la République', nodes: [center('plateau'), bridgeNode('fhb', 'from'), bridgeNode('fhb', 'to'), center('treichville')] },
  { id: 'plateau_degaulle', name: 'Boulevard Carde', nodes: [center('plateau'), bridgeNode('degaulle', 'from'), bridgeNode('degaulle', 'to'), center('treichville')] },
  { id: 'treichville_marcory', name: 'Boulevard de Marseille', nodes: [center('treichville'), [5.305, -3.998], center('marcory')] },
  { id: 'marcory_airport', name: "Boulevard de l'Aéroport", nodes: [center('marcory'), center('koumassi'), center('port_bouet'), [5.2614, -3.9263]] },
  { id: 'treichville_vridi', name: 'Boulevard de Vridi', nodes: [center('treichville'), [5.285, -4.005], center('vridi')] },
  { id: 'plateau_cocody', name: 'Boulevard Latrille', nodes: [center('plateau'), bridgeNode('ado', 'from'), bridgeNode('ado', 'to'), [5.34, -3.984], [5.352, -3.984], center('cocody')] },
  { id: 'cocody_riviera', name: 'Boulevard Mitterrand', nodes: [center('cocody'), center('riviera')] },
  { id: 'riviera_marcory', name: 'Boulevard Valéry Giscard d\'Estaing', nodes: [center('riviera'), bridgeNode('hkb', 'from'), bridgeNode('hkb', 'to'), center('marcory')] },
  { id: 'cocody_adjame', name: 'Boulevard Angoulvant', nodes: [center('cocody'), [5.358, -4.01], center('adjame')] },
  { id: 'adjame_yopougon_n', name: 'Route de Yopougon-Banco', nodes: [center('adjame'), [5.364, -4.028], [5.37, -4.05], center('yopougon')] }
];

export interface Arterial { id: string; name: string; points: Vec2[]; width: number }
export const ARTERIAL_WIDTH = 15;
export const ARTERIALS: Arterial[] = ARTERIAL_SPECS.map((a) => ({
  id: a.id, name: a.name, width: ARTERIAL_WIDTH, points: a.nodes.map(([lat, lon]) => project(lat, lon))
}));

export interface BridgeGeom { id: string; name: string; a: Vec2; b: Vec2; width: number }
export const BRIDGE_GEOMS: BridgeGeom[] = projected.bridges.map(({ b, a, z }) => ({ id: b.id, name: b.name, a, b: z, width: b.widthM }));

/** Pont dont le tablier (plus une marge) contient le point, ou null. */
export function bridgeAt(p: Vec2, margin = 0): BridgeGeom | null {
  for (const br of BRIDGE_GEOMS) {
    const { dist } = distanceToSegment(p, br.a, br.b);
    if (dist < br.width / 2 + margin) return br;
  }
  return null;
}

/** Distance au grand axe le plus proche (m) et largeur de cet axe. */
export function nearestArterial(p: Vec2): { dist: number; arterial: Arterial | null } {
  let best = Infinity;
  let arterial: Arterial | null = null;
  for (const art of ARTERIALS) {
    for (let i = 0; i < art.points.length - 1; i++) {
      const { dist } = distanceToSegment(p, art.points[i], art.points[i + 1]);
      if (dist < best) { best = dist; arterial = art; }
    }
  }
  return { dist: best, arterial };
}

/** Nature de la voie au point donné (hors eau, sauf tablier de pont). */
export function roadAt(p: Vec2, district?: District): RoadKind {
  if (bridgeAt(p)) return 'bridge';
  const { dist, arterial } = nearestArterial(p);
  if (arterial && dist < arterial.width / 2) return 'arterial';
  const d = district ?? districtAt(p);
  const g = GRIDS[d.id];
  if (!g || g.style === 'none') return 'none';
  const f = FRAMES[d.id];
  const dx = p.x - f.ox;
  const dz = p.z - f.oz;
  const u = dx * f.c + dz * f.s;
  const v = -dx * f.s + dz * f.c;
  const mu = ((u % f.pitch) + f.pitch) % f.pitch;
  const mv = ((v % f.pitch) + f.pitch) % f.pitch;
  const du = Math.min(mu, f.pitch - mu);
  const dv = Math.min(mv, f.pitch - mv);
  return du < f.street / 2 || dv < f.street / 2 ? 'local' : 'none';
}

/** Vrai si le point est dans l'eau libre (hors tablier de pont). */
export function isOpenWater(p: Vec2): boolean {
  return isWater(p) && !bridgeAt(p, 1.5);
}
