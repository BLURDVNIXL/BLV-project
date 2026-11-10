/**
 * GTA Abidjan - Map & City Layout (Plateau, Treichville, Cocody, Yopougon & Lagune Ébrié)
 */

import { DistrictInfo, DistrictId } from './types';

export const DISTRICTS: Record<DistrictId, DistrictInfo> = {
  plateau: {
    id: 'plateau',
    name: 'Le Plateau (Centre des Affaires)',
    description: 'Le Manhattan ivoirien: tours bancaires, ministères, grands boulevards modernes.',
    color: '#3b82f6',
    center: [0, 90],
    bounds: { minX: -60, maxX: 60, minZ: 40, maxZ: 150 },
  },
  lagune: {
    id: 'lagune',
    name: 'Lagune Ébrié & Pont HKB',
    description: 'Vaste nappe d\'eau scintillante traversée par le Pont HKB et les navettes lagunaires.',
    color: '#06b6d4',
    center: [40, 5],
    bounds: { minX: -150, maxX: 150, minZ: -30, maxZ: 40 },
  },
  treichville: {
    id: 'treichville',
    name: 'Treichville (Port & Grands Marchés)',
    description: 'Quartier commerçant légendaire: Avenue 16, marché de pagnes, grues portuaires et maquis.',
    color: '#f97316',
    center: [0, -75],
    bounds: { minX: -60, maxX: 60, minZ: -140, maxZ: -30 },
  },
  cocody: {
    id: 'cocody',
    name: 'Cocody (Ambassades & Villas)',
    description: 'Quartier huppé: avenues bordées de palmiers royaux, résidences chics et Hôtel Ivoire.',
    color: '#10b981',
    center: [110, 85],
    bounds: { minX: 60, maxX: 160, minZ: 40, maxZ: 150 },
  },
  yopougon: {
    id: 'yopougon',
    name: 'Yopougon ("Yop City - Siporex")',
    description: 'Le poumon populaire et festif: Rue Princesse, maquis géants, gbakas et ambiance 100% Babi.',
    color: '#a855f7',
    center: [-110, 85],
    bounds: { minX: -160, maxX: -60, minZ: 40, maxZ: 150 },
  },
};

export interface BuildingData {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  district: DistrictId;
  type: 'skyscraper' | 'colonial' | 'villa' | 'market_stall' | 'container' | 'maquis';
  name?: string;
  roofColor?: string;
  facadeColor?: string;
}

export interface RoadSegment {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
  lanes: number;
  isBridge?: boolean;
  name: string;
}

export interface LandmarkData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: 'bridge_pylon' | 'market_dome' | 'monument' | 'port_crane' | 'hotel_ivoire';
}

/**
 * Generate all road segments for Abidjan
 */
export function generateRoadNetwork(): RoadSegment[] {
  const roads: RoadSegment[] = [];

  // 1. Pont Henri Konan Bédié (HKB): connecting Treichville/Marcory to Riviera/Cocody
  roads.push({
    id: 'road_pont_hkb',
    startX: 85,
    startZ: -45,
    endX: 85,
    endZ: 65,
    width: 14,
    lanes: 4,
    isBridge: true,
    name: 'Pont Henri Konan Bédié (HKB)',
  });

  // 2. Pont Félix Houphouët-Boigny & Pont Général de Gaulle: Treichville to Le Plateau
  roads.push({
    id: 'road_pont_houphouet',
    startX: -2,
    startZ: -35,
    endX: -2,
    endZ: 45,
    width: 12,
    lanes: 4,
    isBridge: true,
    name: 'Pont Félix Houphouët-Boigny',
  });

  // 3. Boulevard de la République (Plateau Main Avenue)
  roads.push({
    id: 'road_blvd_republique',
    startX: -2,
    startZ: 45,
    endX: -2,
    endZ: 140,
    width: 14,
    lanes: 4,
    name: 'Boulevard de la République (Plateau)',
  });

  // 4. Boulevard Carde & Avenue Delafosse (Cross streets in Plateau)
  roads.push({
    id: 'road_plateau_cross_1',
    startX: -50,
    startZ: 80,
    endX: 50,
    endZ: 80,
    width: 10,
    lanes: 2,
    name: 'Boulevard Carde',
  });
  roads.push({
    id: 'road_plateau_cross_2',
    startX: -50,
    startZ: 115,
    endX: 50,
    endZ: 115,
    width: 10,
    lanes: 2,
    name: 'Avenue Delafosse',
  });

  // 5. Treichville: Boulevard du Port & Avenue 16
  roads.push({
    id: 'road_treichville_main',
    startX: -2,
    startZ: -35,
    endX: -2,
    endZ: -125,
    width: 12,
    lanes: 4,
    name: 'Avenue de la Reine Pokou',
  });
  roads.push({
    id: 'road_treichville_cross_1',
    startX: -50,
    startZ: -70,
    endX: 50,
    endZ: -70,
    width: 10,
    lanes: 2,
    name: 'Avenue 16 (Marché de Treichville)',
  });
  roads.push({
    id: 'road_treichville_port',
    startX: -50,
    startZ: -110,
    endX: 50,
    endZ: -110,
    width: 12,
    lanes: 2,
    name: 'Boulevard du Port Autonome',
  });

  // 6. Autoroute du Nord / Connection to Yopougon
  roads.push({
    id: 'road_autoroute_yopougon',
    startX: -50,
    startZ: 80,
    endX: -130,
    endZ: 80,
    width: 14,
    lanes: 4,
    name: 'Voie Express Yopougon (Siporex)',
  });
  roads.push({
    id: 'road_yopougon_princesse',
    startX: -110,
    startZ: 50,
    endX: -110,
    endZ: 135,
    width: 10,
    lanes: 2,
    name: 'Rue Princesse (Yopougon)',
  });

  // 7. Boulevard Mitterrand / Connection to Cocody
  roads.push({
    id: 'road_blvd_mitterrand',
    startX: 50,
    startZ: 80,
    endX: 135,
    endZ: 80,
    width: 14,
    lanes: 4,
    name: 'Boulevard François Mitterrand (Cocody)',
  });
  roads.push({
    id: 'road_cocody_ambassades',
    startX: 110,
    startZ: 50,
    endX: 110,
    endZ: 135,
    width: 10,
    lanes: 2,
    name: 'Avenue des Ambassades',
  });

  return roads;
}

/**
 * Generate all city buildings and landmarks
 */
export function generateCityBuildings(): BuildingData[] {
  const buildings: BuildingData[] = [];

  // ================= PLATEAU SKYSCRAPERS =================
  const plateauSkyscrapers = [
    { name: 'Tour Postel 2001', x: -22, z: 65, w: 14, d: 14, h: 58, color: '#1e293b' },
    { name: 'Tour CCIA', x: 20, z: 65, w: 15, d: 15, h: 52, color: '#0f172a' },
    { name: 'Banque Centrale (BCEAO)', x: -25, z: 98, w: 18, d: 16, h: 46, color: '#334155' },
    { name: 'Immeuble CAISTAB', x: 22, z: 98, w: 16, d: 16, h: 48, color: '#1e3a8a' },
    { name: 'Tour Alpha 2000', x: -20, z: 130, w: 14, d: 14, h: 42, color: '#38bdf8' },
    { name: 'Centre des Affaires Babi', x: 20, z: 130, w: 15, d: 15, h: 44, color: '#64748b' },
    { name: 'Palais de Justice', x: -40, z: 80, w: 14, d: 20, h: 22, color: '#f1f5f9' },
    { name: 'Hôtel Pullman Babi', x: 40, z: 80, w: 16, d: 14, h: 36, color: '#cbd5e1' },
    { name: 'Tour Saint-Paul', x: -40, z: 115, w: 12, d: 12, h: 38, color: '#475569' },
    { name: 'Bourse Régionale (BRVM)', x: 40, z: 115, w: 14, d: 14, h: 32, color: '#0284c7' },
  ];

  plateauSkyscrapers.forEach((b, idx) => {
    buildings.push({
      id: `plat_bldg_${idx}`,
      x: b.x,
      z: b.z,
      width: b.w,
      depth: b.d,
      height: b.h,
      district: 'plateau',
      type: 'skyscraper',
      name: b.name,
      facadeColor: b.color,
    });
  });

  // ================= TREICHVILLE (Markets & Port) =================
  for (let i = -2; i <= 2; i++) {
    for (let j = 0; j < 2; j++) {
      if (i === 0) continue; // Leave main avenue clear
      buildings.push({
        id: `treich_shop_${i}_${j}`,
        x: i * 18,
        z: -65 - j * 20,
        width: 11,
        depth: 12,
        height: 7 + (Math.abs(i + j) % 3) * 2,
        district: 'treichville',
        type: 'colonial',
        name: `Magasin de Tissus & Quincaillerie ${i}`,
        facadeColor: i % 2 === 0 ? '#fed7aa' : '#fecdd3',
        roofColor: '#dc2626',
      });
    }
  }

  // Treichville Port Containers along south lagoon
  const containerColors = ['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea'];
  for (let c = 0; c < 12; c++) {
    const cx = -35 + (c % 6) * 14;
    const cz = -125 - Math.floor(c / 6) * 12;
    buildings.push({
      id: `port_container_${c}`,
      x: cx,
      z: cz,
      width: 10,
      depth: 6,
      height: 6,
      district: 'treichville',
      type: 'container',
      facadeColor: containerColors[c % containerColors.length],
    });
  }

  // ================= COCODY (Villas & Palm Groves) =================
  const cocodyVillas = [
    { name: 'Résidence de l\'Ambassadeur', x: 88, z: 65, w: 16, d: 14, h: 10, color: '#f8fafc' },
    { name: 'Villa Moderne Les Deux Plateaux', x: 130, z: 65, w: 15, d: 13, h: 9, color: '#fffbeb' },
    { name: 'Hôtel Ivoire Tower (Cocody)', x: 110, z: 120, w: 18, d: 18, h: 48, color: '#f1f5f9' },
    { name: 'Villa des Palmiers', x: 88, z: 100, w: 14, d: 14, h: 9, color: '#f0fdf4' },
    { name: 'Résidence Riviera Golf', x: 132, z: 100, w: 15, d: 14, h: 10, color: '#fef2f2' },
  ];

  cocodyVillas.forEach((v, idx) => {
    buildings.push({
      id: `cocody_villa_${idx}`,
      x: v.x,
      z: v.z,
      width: v.w,
      depth: v.d,
      height: v.h,
      district: 'cocody',
      type: 'villa',
      name: v.name,
      facadeColor: v.color,
      roofColor: '#b45309',
    });
  });

  // ================= YOPOUGON (Maquis & Siporex) =================
  const yopougonSpots = [
    { name: 'Grand Maquis Le Baron (Rue Princesse)', x: -90, z: 65, w: 16, d: 14, h: 8, color: '#fbbf24' },
    { name: 'Gare de Gbaka Siporex', x: -130, z: 65, w: 18, d: 14, h: 7, color: '#4ade80' },
    { name: 'Maquis La Cour des Grands', x: -90, z: 100, w: 15, d: 13, h: 8, color: '#f87171' },
    { name: 'Complexe Festif Yop City', x: -130, z: 100, w: 16, d: 15, h: 9, color: '#60a5fa' },
    { name: 'Carrefour Bel Air Kiosks', x: -110, z: 125, w: 14, d: 12, h: 6, color: '#fde047' },
  ];

  yopougonSpots.forEach((y, idx) => {
    buildings.push({
      id: `yop_spot_${idx}`,
      x: y.x,
      z: y.z,
      width: y.w,
      depth: y.d,
      height: y.h,
      district: 'yopougon',
      type: 'maquis',
      name: y.name,
      facadeColor: y.color,
      roofColor: '#78350f',
    });
  });

  return buildings;
}

/**
 * Generate key city landmarks (HKB bridge pylons, port cranes, market awnings)
 */
export function generateLandmarks(): LandmarkData[] {
  return [
    {
      id: 'hkb_pylon_north',
      name: 'Pylône Nord Pont HKB',
      x: 85,
      y: 0,
      z: 25,
      type: 'bridge_pylon',
    },
    {
      id: 'hkb_pylon_south',
      name: 'Pylône Sud Pont HKB',
      x: 85,
      y: 0,
      z: -10,
      type: 'bridge_pylon',
    },
    {
      id: 'port_crane_1',
      name: 'Grue Portuaire Treichville 1',
      x: -45,
      y: 0,
      z: -135,
      type: 'port_crane',
    },
    {
      id: 'port_crane_2',
      name: 'Grue Portuaire Treichville 2',
      x: 35,
      y: 0,
      z: -135,
      type: 'port_crane',
    },
    {
      id: 'treichville_market_dome',
      name: 'Dôme Marché de Treichville',
      x: 0,
      y: 0,
      z: -70,
      type: 'market_dome',
    },
  ];
}
