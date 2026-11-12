/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Géographie d'Abidjan (version SCHÉMATIQUE à raffiner).
 *
 * Fiabilité des données (champ `confidence`) :
 *  - 'sourced'      : coordonnée relevée dans une source publique (Wikipedia, Sygic, TerraLocate…).
 *  - 'approximate'  : positionnement estimé (±300 m réels) à partir de la topologie décrite par les sources.
 * La TOPOLOGIE est fiable (voir sources dans le CONTEXT.md) ; le tracé précis des rives ne l'est pas.
 * Un extrait OpenStreetMap fourni par le créateur permettrait de remplacer ces polygones par les vrais.
 */

import { LatLon, Vec2, project, pointInPolygon, distanceToSegment, WORLD_SCALE } from './geo';

export type Confidence = 'sourced' | 'approximate';
export type SocialClass = 'luxury' | 'middle' | 'popular' | 'informal' | 'industrial' | 'nature';
export type HomeType = 'squat' | 'chambre_cour' | 'studio' | 'deux_pieces' | 'trois_pieces' | 'duplex_mer' | 'villa_ambassade' | 'bunker';

export interface District {
  id: string;
  name: string;
  center: LatLon;
  confidence: Confidence;
  social: SocialClass;
  /** Rayon d'influence en mètres RÉELS. */
  radiusM: number;
  /** Hauteur moyenne des bâtiments (m) et densité du bâti (0..1). */
  heightM: [number, number];
  density: number;
  /** Types de logements que cette commune accueille (parcelles des joueurs). */
  homes: HomeType[];
}

export const DISTRICTS: District[] = [
  { id: 'plateau', name: 'Le Plateau', center: { lat: 5.325, lon: -4.02 }, confidence: 'approximate', social: 'luxury', radiusM: 1500, heightM: [30, 110], density: 0.8, homes: ['bunker'] },
  { id: 'adjame', name: 'Adjamé', center: { lat: 5.356, lon: -4.025 }, confidence: 'approximate', social: 'popular', radiusM: 1800, heightM: [6, 24], density: 0.9, homes: ['chambre_cour', 'studio'] },
  { id: 'attecoube', name: 'Attécoubé', center: { lat: 5.338, lon: -4.048 }, confidence: 'approximate', social: 'informal', radiusM: 1500, heightM: [3, 9], density: 0.9, homes: ['squat', 'chambre_cour'] },
  { id: 'yopougon', name: 'Yopougon', center: { lat: 5.335, lon: -4.075 }, confidence: 'approximate', social: 'middle', radiusM: 3500, heightM: [4, 15], density: 0.7, homes: ['deux_pieces', 'trois_pieces', 'studio', 'chambre_cour'] },
  { id: 'abobo', name: 'Abobo', center: { lat: 5.417, lon: -4.017 }, confidence: 'approximate', social: 'popular', radiusM: 3500, heightM: [4, 14], density: 0.85, homes: ['chambre_cour', 'squat', 'deux_pieces'] },
  { id: 'cocody', name: 'Cocody · Deux-Plateaux', center: { lat: 5.36, lon: -3.995 }, confidence: 'approximate', social: 'luxury', radiusM: 2500, heightM: [5, 30], density: 0.55, homes: ['villa_ambassade', 'studio', 'trois_pieces'] },
  { id: 'riviera', name: 'Cocody · Riviera', center: { lat: 5.345, lon: -3.96 }, confidence: 'approximate', social: 'luxury', radiusM: 2500, heightM: [5, 22], density: 0.5, homes: ['villa_ambassade', 'duplex_mer', 'trois_pieces'] },
  { id: 'treichville', name: 'Treichville', center: { lat: 5.3102, lon: -4.0129 }, confidence: 'sourced', social: 'popular', radiusM: 1500, heightM: [6, 20], density: 0.9, homes: ['chambre_cour', 'studio', 'deux_pieces'] },
  { id: 'marcory', name: 'Marcory · Zone 4', center: { lat: 5.3, lon: -3.983 }, confidence: 'sourced', social: 'middle', radiusM: 2000, heightM: [6, 28], density: 0.7, homes: ['studio', 'deux_pieces', 'trois_pieces', 'duplex_mer'] },
  { id: 'koumassi', name: 'Koumassi', center: { lat: 5.3, lon: -3.95 }, confidence: 'sourced', social: 'popular', radiusM: 2200, heightM: [4, 14], density: 0.85, homes: ['chambre_cour', 'deux_pieces', 'squat'] },
  { id: 'port_bouet', name: 'Port-Bouët', center: { lat: 5.262, lon: -3.945 }, confidence: 'approximate', social: 'middle', radiusM: 2500, heightM: [4, 12], density: 0.6, homes: ['deux_pieces', 'trois_pieces', 'duplex_mer'] },
  { id: 'vridi', name: 'Vridi', center: { lat: 5.25, lon: -3.995 }, confidence: 'approximate', social: 'industrial', radiusM: 1800, heightM: [8, 30], density: 0.4, homes: [] },
  { id: 'banco', name: 'Forêt du Banco', center: { lat: 5.385, lon: -4.05 }, confidence: 'approximate', social: 'nature', radiusM: 2300, heightM: [0, 0], density: 0, homes: [] }
];

/** Rives schématiques (longitude, latitude), de l'ouest vers l'est. */
const NORTH_SHORE: Array<[number, number]> = [
  [-4.09, 5.3235], [-4.055, 5.323], [-4.04, 5.32], [-4.03, 5.318], [-4.02, 5.3184], [-4.005, 5.3175],
  [-3.99, 5.322], [-3.975, 5.324], [-3.95, 5.32], [-3.92, 5.315], [-3.89, 5.312]
];
/** Rive nord de la presqu'île de Petit-Bassam (Treichville, Marcory, Koumassi, Port-Bouët). */
const SOUTH_SHORE: Array<[number, number]> = [
  [-4.035, 5.3105], [-4.02, 5.312], [-4.0, 5.3125], [-3.985, 5.3075], [-3.95, 5.306], [-3.92, 5.303], [-3.89, 5.301]
];
/** Côte atlantique (plage de Port-Bouët / Vridi). */
const OCEAN_COAST: Array<[number, number]> = [
  [-4.035, 5.26], [-4.0, 5.243], [-3.96, 5.238], [-3.92, 5.233], [-3.89, 5.23]
];

export const MAP_BOUNDS = { west: -4.09, east: -3.89, north: 5.43, south: 5.22 } as const;

const toPoly = (pts: Array<[number, number]>): Vec2[] => pts.map(([lon, lat]) => project(lat, lon));

/**
 * Lagune principale : rive nord (O→E), bord est de la lagune, rive nord de Petit-Bassam (E→O),
 * puis contournement par l'ouest de la presqu'île (eau libre de la lagune / cordon littoral).
 */
const MAIN_WATER: Vec2[] = [
  ...toPoly(NORTH_SHORE),
  project(SOUTH_SHORE[SOUTH_SHORE.length - 1][1], MAP_BOUNDS.east),
  ...toPoly([...SOUTH_SHORE].reverse()),
  project(MAP_BOUNDS.south, SOUTH_SHORE[0][0]),
  project(MAP_BOUNDS.south, MAP_BOUNDS.west)
];
/** Océan Atlantique, au sud de la côte de Port-Bouët / Vridi. */
const OCEAN_WATER: Vec2[] = [
  ...toPoly(OCEAN_COAST),
  project(MAP_BOUNDS.south, MAP_BOUNDS.east),
  project(MAP_BOUNDS.south, OCEAN_COAST[0][0])
];

export interface Bay { id: string; name: string; confidence: Confidence; points: Array<{ lat: number; lon: number; halfWidthM: number }> }
export const BAYS: Bay[] = [
  { id: 'banco', name: 'Baie du Banco', confidence: 'approximate', points: [
    { lat: 5.32, lon: -4.04, halfWidthM: 600 }, { lat: 5.345, lon: -4.0355, halfWidthM: 450 }, { lat: 5.358, lon: -4.031, halfWidthM: 220 }
  ] },
  { id: 'cocody', name: 'Baie de Cocody', confidence: 'approximate', points: [
    { lat: 5.3175, lon: -4.0, halfWidthM: 650 }, { lat: 5.33, lon: -3.997, halfWidthM: 380 }, { lat: 5.352, lon: -3.99, halfWidthM: 200 }
  ] }
];

export const ISLANDS = [
  { id: 'boulay', name: 'Île Boulay', center: { lat: 5.3135, lon: -4.065 }, radiusM: 450, confidence: 'approximate' as Confidence }
];

export interface Bridge {
  id: string;
  name: string;
  from: LatLon;
  to: LatLon;
  widthM: number;
  confidence: Confidence;
  /** Source : « sourced » pour la liaison entre communes, tracé précis approximatif. */
  links: string;
}
export const BRIDGES: Bridge[] = [
  { id: 'fhb', name: 'Pont Félix Houphouët-Boigny', from: { lat: 5.3215, lon: -4.016 }, to: { lat: 5.3085, lon: -4.016 }, widthM: 26, confidence: 'approximate', links: 'Plateau ↔ Treichville (1957)' },
  { id: 'degaulle', name: 'Pont Charles de Gaulle', from: { lat: 5.3215, lon: -4.0285 }, to: { lat: 5.3085, lon: -4.0285 }, widthM: 26, confidence: 'approximate', links: 'Plateau ↔ Treichville (1967)' },
  { id: 'hkb', name: 'Pont Henri Konan Bédié', from: { lat: 5.3285, lon: -3.9835 }, to: { lat: 5.3015, lon: -3.9835 }, widthM: 30, confidence: 'approximate', links: 'Cocody (Riviera Golf) ↔ Marcory (2014)' },
  { id: 'ado', name: 'Pont Alassane Ouattara', from: { lat: 5.329, lon: -4.0075 }, to: { lat: 5.329, lon: -3.9895 }, widthM: 28, confidence: 'approximate', links: 'Plateau ↔ Cocody, baie de Cocody (2023)' },
  { id: 'yopougon', name: 'Pont de Yopougon', from: { lat: 5.342, lon: -4.0465 }, to: { lat: 5.342, lon: -4.0245 }, widthM: 24, confidence: 'approximate', links: 'Yopougon/Attécoubé ↔ Plateau/Adjamé, baie du Banco' }
];

export interface Landmark { id: string; name: string; at: LatLon; confidence: Confidence; kind: 'airport' | 'port' | 'stadium' | 'worship' | 'market' | 'tower' | 'university' | 'hotel' }
export const LANDMARKS: Landmark[] = [
  { id: 'airport', name: 'Aéroport Félix Houphouët-Boigny', at: { lat: 5.2614, lon: -3.9263 }, confidence: 'approximate', kind: 'airport' },
  { id: 'port', name: 'Port Autonome d\'Abidjan', at: { lat: 5.3075, lon: -4.0145 }, confidence: 'approximate', kind: 'port' },
  { id: 'stade', name: 'Stade Félix Houphouët-Boigny', at: { lat: 5.3275, lon: -4.0155 }, confidence: 'approximate', kind: 'stadium' },
  { id: 'cathedrale', name: 'Cathédrale Saint-Paul', at: { lat: 5.3255, lon: -4.0215 }, confidence: 'approximate', kind: 'worship' },
  { id: 'marche_adjame', name: "Marché d'Adjamé", at: { lat: 5.3535, lon: -4.0225 }, confidence: 'approximate', kind: 'market' },
  { id: 'palais_sports', name: 'Palais de la Culture', at: { lat: 5.3105, lon: -4.0045 }, confidence: 'approximate', kind: 'worship' },
  { id: 'hotel_ivoire', name: 'Hôtel Ivoire', at: { lat: 5.3395, lon: -4.0 }, confidence: 'approximate', kind: 'hotel' }
];

// ───────────── Requêtes géométriques (communes à tous les clients : carte identique pour tous) ─────────────

const mainWater = MAIN_WATER;
const oceanWater = OCEAN_WATER;
const bayPolylines = BAYS.map((b) => ({
  id: b.id,
  pts: b.points.map((p) => ({ ...project(p.lat, p.lon), r: p.halfWidthM * WORLD_SCALE }))
}));
const islandPts = ISLANDS.map((i) => ({ ...project(i.center.lat, i.center.lon), r: i.radiusM * WORLD_SCALE }));

export const isOutsideMap = (p: Vec2): boolean => {
  const a = project(MAP_BOUNDS.north, MAP_BOUNDS.west);
  const b = project(MAP_BOUNDS.south, MAP_BOUNDS.east);
  return p.x < a.x || p.x > b.x || p.z < a.z || p.z > b.z;
};

function inBay(p: Vec2): boolean {
  for (const bay of bayPolylines) {
    for (let i = 0; i < bay.pts.length - 1; i++) {
      const a = bay.pts[i];
      const b = bay.pts[i + 1];
      const { dist, t } = distanceToSegment(p, a, b);
      if (dist < a.r + (b.r - a.r) * t) return true;
    }
  }
  return false;
}

/** Vrai si le point est dans l'eau (lagune, baies, océan), île Boulay exclue. */
export function isWater(p: Vec2): boolean {
  for (const isl of islandPts) if (Math.hypot(p.x - isl.x, p.z - isl.z) < isl.r) return false;
  return pointInPolygon(p, mainWater) || pointInPolygon(p, oceanWater) || inBay(p);
}

const projectedDistricts = DISTRICTS.map((d) => ({ d, c: project(d.center.lat, d.center.lon) }));

/** Commune la plus proche pondérée par son rayon d'influence. */
export function districtAt(p: Vec2): District {
  let best = projectedDistricts[0];
  let bestScore = Infinity;
  for (const pd of projectedDistricts) {
    const score = Math.hypot(p.x - pd.c.x, p.z - pd.c.z) / (pd.d.radiusM * WORLD_SCALE);
    if (score < bestScore) { bestScore = score; best = pd; }
  }
  return best.d;
}

/** Communes pouvant accueillir un type de logement. */
export function districtsForHome(home: HomeType): District[] {
  return DISTRICTS.filter((d) => d.homes.includes(home));
}

/** Géométrie projetée (mètres de jeu) pour le rendu / la génération. */
export const projected = {
  mainWater,
  oceanWater,
  bays: bayPolylines,
  islands: islandPts,
  northShore: toPoly(NORTH_SHORE),
  southShore: toPoly(SOUTH_SHORE),
  coast: toPoly(OCEAN_COAST),
  bridges: BRIDGES.map((b) => ({ b, a: project(b.from.lat, b.from.lon), z: project(b.to.lat, b.to.lon) })),
  districts: projectedDistricts,
  landmarks: LANDMARKS.map((l) => ({ l, p: project(l.at.lat, l.at.lon) })),
  bounds: { nw: project(MAP_BOUNDS.north, MAP_BOUNDS.west), se: project(MAP_BOUNDS.south, MAP_BOUNDS.east) }
};
