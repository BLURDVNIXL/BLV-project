/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Décor statique de la carte actuelle (version compacte 260 × 220 m) enregistré dans le moteur physique.
 * Les coordonnées reprennent exactement celles de ThreeCanvas.tsx. La génération de la grande carte
 * d'Abidjan (étape suivante) remplacera ce module par un chargeur de zones.
 */

import { PhysicsCore, SolidFlag } from './PhysicsCore';

export const WORLD_LIMITS = { halfX: 115, halfZ: 100 } as const;

/** Ponts : centre x, largeur du tablier (le tablier est affleurant au sol : pas de marche). */
export const BRIDGES = [
  { name: 'Pont Alassane Ouattara', x: -25, width: 7 },
  { name: 'Pont Félix Houphouët-Boigny', x: 0, width: 6.5 },
  { name: 'Pont Général de Gaulle', x: 25, width: 6.5 },
  { name: 'Pont Henri Konan Bédié', x: 65, width: 8 }
] as const;

/** Plan d'eau réellement visible : les terres nord et sud couvrent la lagune au-delà de |z| = 10. */
export const LAGOON = { halfX: 140, halfZ: 10 } as const;

export interface PlateauTower { x: number; z: number; w: number; d: number; h: number }
export const PLATEAU_TOWERS: PlateauTower[] = [
  { x: -30, z: -55, w: 10, d: 10, h: 36 },
  { x: -16, z: -62, w: 8, d: 8, h: 28 },
  { x: -38, z: -70, w: 11, d: 11, h: 42 },
  { x: -20, z: -48, w: 8, d: 8, h: 24 }
];

export function registerAbidjanWorld(physics: PhysicsCore, opts: { homeType: string }): void {
  const solid = SolidFlag.SOLID;
  const building = SolidFlag.SOLID | SolidFlag.BUILDING;

  // Limites de la carte (murs invisibles)
  const { halfX, halfZ } = WORLD_LIMITS;
  physics.addBox(0, -halfZ - 1, halfX + 4, 1, 0, 200, solid);
  physics.addBox(0, halfZ + 1, halfX + 4, 1, 0, 200, solid);
  physics.addBox(-halfX - 1, 0, 1, halfZ + 4, 0, 200, solid);
  physics.addBox(halfX + 1, 0, 1, halfZ + 4, 0, 200, solid);

  // Lagune Ébrié : infranchissable, sauf sur les tabliers des ponts
  const edges: number[] = [-LAGOON.halfX];
  [...BRIDGES].sort((a, b) => a.x - b.x).forEach((b) => edges.push(b.x - b.width / 2, b.x + b.width / 2));
  edges.push(LAGOON.halfX);
  for (let i = 0; i < edges.length; i += 2) {
    const x0 = edges[i];
    const x1 = edges[i + 1];
    if (x1 - x0 < 0.1) continue;
    physics.addBox((x0 + x1) / 2, 0, (x1 - x0) / 2, LAGOON.halfZ, 0, 2.5, solid | SolidFlag.WATER);
  }

  // Pylône du pont Alassane Ouattara (au milieu du tablier)
  physics.addCircle(-25, 0, 1.5, 30, building);

  // Tours du Plateau
  PLATEAU_TOWERS.forEach((t) => physics.addBox(t.x, t.z, t.w / 2, t.d / 2, 0, t.h, building));

  // Lycées d'Excellence
  physics.addBox(30, -50, 8, 5, 0, 7, building);   // Lycée Classique (Caïman)
  physics.addBox(55, -52, 7, 4, 0, 6, building);   // Sainte-Marie (Alysma)
  physics.addBox(75, 60, 9, 6, 0, 8, building);    // Lycée d'Excellence (Alex)

  // Port de Treichville : bloc de conteneurs 4 × 3 empilés sur 3 niveaux
  physics.addBox(-44, 50.2, 7.8, 3.1, 0, 5.4, solid | SolidFlag.PROP);

  // Maison du joueur (centre monde : 0, -14) : murs arrière et gauche, mobilier
  const hx = 0;
  const hz = -14;
  physics.addBox(hx, hz - 4.5, 6, 0.15, 0, 3.2, building);
  physics.addBox(hx - 6, hz, 0.15, 4.5, 0, 3.2, building);
  physics.addBox(hx - 4, hz - 3, 1, 0.75, 0, 0.55, solid | SolidFlag.PROP);   // lit
  physics.addBox(hx + 3, hz - 3.5, 0.5, 0.45, 0, 2, solid | SolidFlag.PROP);  // réfrigérateur
  physics.addBox(hx + 4, hz + 2, 0.6, 0.6, 0, 2.2, solid | SolidFlag.PROP);   // douche
  physics.addBox(hx - 4, hz + 2, 0.9, 0.45, 0, 0.75, solid | SolidFlag.PROP); // bureau
  // La piscine des villas (villa_ambassade, duplex_mer) reste franchissable : décor visuel uniquement.
  void opts.homeType;
}

/** Gabarit véhicule selon le type de logement (modèle 3D correspondant dans ThreeCanvas). */
export function playerVehiclePreset(homeType: string): 0 | 3 | 4 {
  if (homeType === 'chambre_cour' || homeType === 'squat') return 0; // Wôrô-wôrô 504
  if (homeType === 'villa_ambassade') return 3;                        // grosse berline / 4x4
  return 4;                                                            // coupé sportif
}
