/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Intérieurs « à part » : salles fermées posées dans une zone libre au sud de la carte (hors de la ville),
 * où l'on est téléporté par une porte. Module PUR (données + géométrie, sans Three.js ni physique) → testable.
 * Axes locaux = axes monde (+x est, +z sud). La porte est sur le mur sud (z = +halfD), on entre en regardant le nord.
 */

import type { AnimalSpecies } from './animals';
import type { NpcRole } from './npcAppearance';

export type PublicInteriorId =
  | 'hopital'
  | 'maquis'
  | 'marche_adjame'
  | 'mairie'
  | 'lycee_caiman'
  | 'lycee_alysma'
  | 'lycee_alex';

export type HouseInteriorId = 'house_floor_0' | 'house_floor_1';

export type InteriorId = PublicInteriorId | HouseInteriorId;

export type InteriorBoxKind = 'wall' | 'partition' | 'prop';

export interface InteriorBox {
  /** Centre local, demi-largeurs, hauteur. `wall` : mur (fondu côté caméra) ; `partition` : cloison basse ; `prop` : meuble. */
  x: number; z: number; hx: number; hz: number; h: number;
  kind: InteriorBoxKind;
}

export interface InteriorTheme {
  floorColor: number;
  floorGlow?: number;
  runnerColor?: number;
  runnerGlow?: number;
  wallColor: number;
  wallGlow?: number;
  partitionColor?: number;
  ceilingColor?: number;
  ceilingGlow?: number;
}

export type InteriorActionKind = 'eat' | 'work' | 'sleep' | 'shower' | 'toilet' | 'yannis_academy' | 'interior_stairs';

export interface InteriorActionSpot {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  type: InteriorActionKind;
  color: number;
  /** Étage cible pour un escalier (`interior_stairs`). */
  targetFloor?: number;
  /** Position d'arrivée locale sur l'étage cible pour un escalier. */
  arrival?: { x: number; z: number; rotY: number };
}


/**
 * Comportement d'un PNJ d'intérieur : `still` (immobile, simple solide), `talk` (immobile, face à un voisin,
 * gestes plus marqués), `walk` (personnage du pool qui parcourt `points` en boucle, avec détection de blocage).
 */
export type InteriorNpcBehavior =
  | { kind: 'still' }
  | { kind: 'talk' }
  | { kind: 'walk'; points: ReadonlyArray<{ x: number; z: number }> };

export interface InteriorNpcDef {
  role: NpcRole;
  /** Graine d'apparence (fixe : la même salle montre toujours les mêmes personnes). */
  seed: number;
  /** Position de départ (local) ; pour `walk`, c'est le premier point. */
  x: number;
  z: number;
  /** Cap de départ : le PNJ regarde (sin rotY, cos rotY). */
  rotY: number;
  behavior: InteriorNpcBehavior;
}

/** Animal d'une salle (ex. le chat du maquis) : personnage du moteur, rôle et rendu gérés par `AnimalSystem`. */
export interface InteriorAnimalDef {
  species: AnimalSpecies;
  /** Position de départ (local). */
  x: number;
  z: number;
}

export interface InteriorDef {
  id: InteriorId;
  label: string;
  /** Centre de la salle dans le monde. */
  origin: { x: number; z: number };
  halfW: number;
  halfD: number;
  wallH: number;
  /** Largeur de la porte (m), centrée en x = 0 sur le mur sud. */
  doorWidth: number;
  boxes: InteriorBox[];
  /** Palette du sol, des murs et du plafond (aucune couleur codée en dur dans le rig 3D). */
  theme: InteriorTheme;
  /** Où le joueur apparaît en entrant (local) et cap (rotY : le joueur regarde (sin, cos)). */
  entry: { x: number; z: number; rotY: number };
  /** Zone d'action « Sortir » (local). */
  exit: { x: number; z: number; radius: number };
  /** Faux sur un étage supérieur sans porte directe vers la rue (vrai par défaut). */
  hasStreetExit?: boolean;
  /** Étendue Z couverte par le plafond (optionnel, ex. terrasse ouverte au sud). */
  ceilingZMin?: number;
  ceilingZMax?: number;
  /** Point de réveil à côté du lit n°1 (local) — propre à l'hôpital pour le lot santé. */
  bed?: { x: number; z: number; rotY: number };
  /** Zones d'action internes éventuelles (manger, travailler…). */
  actions?: InteriorActionSpot[];
  /** PNJ de la salle (optionnel) : apparences, positions et comportements déclarés ici, animés par `NpcSystem`. */
  npcs?: InteriorNpcDef[];
  /** Animaux de la salle (optionnel), animés par `AnimalSystem` (petit périmètre, timides à courte distance). */
  animals?: InteriorAnimalDef[];
}

const W = 0.15; // demi-épaisseur des murs

const still = (role: NpcRole, seed: number, x: number, z: number, rotY: number): InteriorNpcDef =>
  ({ role, seed, x, z, rotY, behavior: { kind: 'still' } });
const talk = (role: NpcRole, seed: number, x: number, z: number, rotY: number): InteriorNpcDef =>
  ({ role, seed, x, z, rotY, behavior: { kind: 'talk' } });
const walk = (role: NpcRole, seed: number, pts: ReadonlyArray<readonly [number, number]>): InteriorNpcDef => {
  const points = pts.map(([x, z]) => ({ x, z }));
  return { role, seed, x: points[0].x, z: points[0].z, rotY: 0, behavior: { kind: 'walk', points } };
};
const H = Math.PI / 2;

/** Hôpital : accueil au sud (près de la porte), chambres au nord derrière une cloison, passage à l'est. */
export const HOSPITAL_INTERIOR: InteriorDef = {
  id: 'hopital',
  label: 'Hôpital',
  origin: { x: 2860, z: 2960 },
  halfW: 9,
  halfD: 5.5,
  wallH: 3.4,
  doorWidth: 2.4,
  theme: {
    floorColor: 0xe8edf0,
    floorGlow: 0.18,
    runnerColor: 0x4cc9a8,
    runnerGlow: 0.25,
    wallColor: 0xf4f7f6,
    wallGlow: 0.3,
    partitionColor: 0xe0f2f1,
    ceilingColor: 0xffffff,
    ceilingGlow: 0.25,
  },
  boxes: [
    // Murs extérieurs (le mur sud est coupé par la porte)
    { x: 0, z: -5.5, hx: 9, hz: W, h: 3.4, kind: 'wall' },
    { x: -9, z: 0, hx: W, hz: 5.5, h: 3.4, kind: 'wall' },
    { x: 9, z: 0, hx: W, hz: 5.5, h: 3.4, kind: 'wall' },
    { x: -5.1, z: 5.5, hx: 3.9, hz: W, h: 3.4, kind: 'wall' },
    { x: 5.1, z: 5.5, hx: 3.9, hz: W, h: 3.4, kind: 'wall' },
    // Cloison basse accueil / chambres (1,2 m, passage de 6 m à l'est)
    { x: -3, z: -1, hx: 6, hz: W, h: 1.2, kind: 'partition' },
    // Meubles
    { x: -4, z: 2.8, hx: 1.6, hz: 0.5, h: 1.1, kind: 'prop' },   // comptoir d'accueil
    { x: 5, z: 3.7, hx: 1.5, hz: 0.4, h: 0.5, kind: 'prop' },    // banc de la salle d'attente
    { x: -6.5, z: -3.9, hx: 1, hz: 0.75, h: 0.6, kind: 'prop' }, // lit 3
    { x: -2.5, z: -3.9, hx: 1, hz: 0.75, h: 0.6, kind: 'prop' }, // lit 2
    { x: 6.2, z: -3.9, hx: 1, hz: 0.75, h: 0.6, kind: 'prop' }   // lit 1 (le tien)
  ],
  entry: { x: 0, z: 2.2, rotY: Math.PI },
  exit: { x: 0, z: 4.3, radius: 1.6 },
  bed: { x: 6.2, z: -2.5, rotY: Math.PI },
  npcs: [
    still('soignant', 1101, -4, 1.6, 0),
    walk('soignant', 1102, [[4.2, -2.2], [4.2, 1.4], [7.8, 1.4], [7.8, -2.2]]),
    still('soignant', 1103, -4.5, -2.2, -2.3),
    walk('passant', 1104, [[-2, 0.6], [1.5, 0.6]]),
    still('passant', 1105, 6.8, 2, 0),
    still('passant', 1106, -0.5, -2.8, 0),
    talk('passant', 1107, -8, 0.4, H),
    talk('passant', 1108, -7.1, 0.4, -H),
  ],
};

/** Maquis Le Temple : salle chaleureuse avec bar au nord, tables conviviales, coin DJ et zone d'action repas. */
export const MAQUIS_INTERIOR: InteriorDef = {
  id: 'maquis',
  label: 'Maquis Le Temple',
  origin: { x: 2800, z: 2960 },
  halfW: 9,
  halfD: 6,
  wallH: 3.6,
  doorWidth: 2.4,
  theme: {
    floorColor: 0x3f2e26,
    floorGlow: 0.22,
    runnerColor: 0xd97706,
    runnerGlow: 0.28,
    wallColor: 0x7c2d12,
    wallGlow: 0.34,
    partitionColor: 0xb45309,
    ceilingColor: 0x292524,
    ceilingGlow: 0.22,
  },
  boxes: [
    // Murs extérieurs (le mur sud est coupé par la porte)
    { x: 0, z: -6, hx: 9, hz: W, h: 3.6, kind: 'wall' },
    { x: -9, z: 0, hx: W, hz: 6, h: 3.6, kind: 'wall' },
    { x: 9, z: 0, hx: W, hz: 6, h: 3.6, kind: 'wall' },
    { x: -5.1, z: 6, hx: 3.9, hz: W, h: 3.6, kind: 'wall' },
    { x: 5.1, z: 6, hx: 3.9, hz: W, h: 3.6, kind: 'wall' },
    // Garde-corps bois séparant le coin salon ouest (laisse un large couloir central et côté mur)
    { x: -4.2, z: -0.8, hx: 2.4, hz: W, h: 1.1, kind: 'partition' },
    // Comptoir-bar au nord
    { x: 0, z: -4.2, hx: 3.4, hz: 0.7, h: 1.15, kind: 'prop' },
    // 4 tables conviviales avec tabourets
    { x: -5.5, z: 2.4, hx: 1.1, hz: 0.9, h: 0.8, kind: 'prop' },
    { x: 5.5, z: 2.4, hx: 1.1, hz: 0.9, h: 0.8, kind: 'prop' },
    { x: -5.6, z: -3.4, hx: 1.1, hz: 0.9, h: 0.8, kind: 'prop' },
    { x: 5.6, z: -2.6, hx: 1.1, hz: 0.9, h: 0.8, kind: 'prop' },
    // Enceintes DJ aux coins nord
    { x: -8.1, z: -5.1, hx: 0.5, hz: 0.5, h: 1.9, kind: 'prop' },
    { x: 8.1, z: -5.1, hx: 0.5, hz: 0.5, h: 1.9, kind: 'prop' },
  ],
  entry: { x: 0, z: 2.2, rotY: Math.PI },
  exit: { x: 0, z: 4.7, radius: 1.6 },
  actions: [
    {
      id: 'eat_maquis',
      label: '🍗 Manger — Alloco & Poisson Braisé (3 000 F)',
      x: 0,
      z: -2.4,
      radius: 2.1,
      type: 'eat',
      color: 0xf97316,
    },
  ],
  npcs: [
    still('serveur_maquis', 2101, 0, -5.4, 0),
    walk('serveur_maquis', 2102, [[-3, 0.6], [3, 0.6]]),
    still('client', 2103, -3.7, 2.4, -H),
    still('client', 2104, -5.5, 0.7, 0),
    still('client', 2105, 3.7, 2.4, H),
    still('client', 2106, 5.5, 0.7, 0),
    talk('client', 2107, 7.6, -0.6, -H),
    talk('client', 2108, 6.4, -0.6, H),
    walk('client', 2109, [[-7.8, -0.2], [-7.8, 3.8]]),
  ],
  animals: [{ species: 'chat', x: -3, z: 3.8 }],
};

/** Grande Halle du Marché d'Adjamé : allées spacieuses, 6 îlots d'étals colorés et comptoir de commerce au nord. */
export const MARCHE_INTERIOR: InteriorDef = {
  id: 'marche_adjame',
  label: "Marché d'Adjamé",
  origin: { x: 2740, z: 2960 },
  halfW: 13,
  halfD: 9,
  wallH: 4.4,
  doorWidth: 2.8,
  theme: {
    floorColor: 0xd6d3d1,
    floorGlow: 0.2,
    runnerColor: 0xea580c,
    runnerGlow: 0.22,
    wallColor: 0xfef3c7,
    wallGlow: 0.28,
    partitionColor: 0xb45309,
    ceilingColor: 0xfffbeb,
    ceilingGlow: 0.28,
  },
  boxes: [
    // Murs extérieurs (mur sud coupé par la porte de 2,8 m centrée en x = 0)
    { x: 0, z: -9, hx: 13, hz: W, h: 4.4, kind: 'wall' },
    { x: -13, z: 0, hx: W, hz: 9, h: 4.4, kind: 'wall' },
    { x: 13, z: 0, hx: W, hz: 9, h: 4.4, kind: 'wall' },
    { x: -7.2, z: 9, hx: 5.8, hz: W, h: 4.4, kind: 'wall' },
    { x: 7.2, z: 9, hx: 5.8, hz: W, h: 4.4, kind: 'wall' },
    // Garde-corps bois encadrant l'allée centrale
    { x: -5.2, z: -1.4, hx: W, hz: 2.4, h: 1.05, kind: 'partition' },
    { x: 5.2, z: -1.4, hx: W, hz: 2.4, h: 1.05, kind: 'partition' },
    // Comptoir central des grossistes (commerce) au nord
    { x: 0, z: -6.4, hx: 3.6, hz: 0.8, h: 1.15, kind: 'prop' },
    // 6 rangées d'étals (ailes ouest et est, larges allées tout autour)
    { x: -8.6, z: 3.0, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    { x: -8.6, z: -1.4, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    { x: -8.6, z: -5.6, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    { x: 8.6, z: 3.0, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    { x: 8.6, z: -1.4, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    { x: 8.6, z: -5.6, hx: 1.8, hz: 1.0, h: 0.9, kind: 'prop' },
    // Caisses posées devant chaque étal (alignées sur buildMarcheFurniture : étal ± 0,9 en x, + 1,2 en z)
    { x: -7.7, z: 4.2, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
    { x: -7.7, z: -0.2, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
    { x: -7.7, z: -4.4, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
    { x: 7.7, z: 4.2, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
    { x: 7.7, z: -0.2, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
    { x: 7.7, z: -4.4, hx: 0.375, hz: 0.325, h: 0.46, kind: 'prop' },
  ],
  entry: { x: 0, z: 5.2, rotY: Math.PI },
  exit: { x: 0, z: 7.5, radius: 1.7 },
  actions: [
    {
      id: 'work_adjame_hall',
      label: '💼 Travailler — Halle d’Adjamé (Commerce)',
      x: 0,
      z: -4.4,
      radius: 2.2,
      type: 'work',
      color: 0x10b981,
    },
  ],
  npcs: [
    // Vendeurs derrière leur étal (côté mur), patron derrière le comptoir nord
    still('vendeur', 3101, -11, 3, H),
    still('vendeur', 3102, -11, -1.4, H),
    still('vendeur', 3103, -11, -5.6, H),
    still('vendeur', 3104, 11, 3, -H),
    still('vendeur', 3105, 11, -1.4, -H),
    still('vendeur', 3106, 11, -5.6, -H),
    still('vendeur', 3107, 0, -7.8, 0),
    // Clients qui flânent dans les allées libres
    walk('client', 3108, [[-3, -3.2], [-3, 4.5]]),
    walk('client', 3109, [[3, 4.5], [3, -3.2]]),
    walk('client', 3110, [[-6.1, -4.2], [-6.1, 3.6]]),
    walk('client', 3111, [[6.1, 3.6], [6.1, -4.2]]),
    walk('client', 3112, [[-1.5, 1.5], [1.5, 1.5]]),
    talk('client', 3113, -1.8, 3, H),
    talk('client', 3114, -0.8, 3, -H),
  ],
};

/** Mairie du Plateau : hall d'apparat solennel visitable (guichet état civil, bancs d'attente et tribune). */
export const MAIRIE_INTERIOR: InteriorDef = {
  id: 'mairie',
  label: 'Mairie du Plateau',
  origin: { x: 2680, z: 2960 },
  halfW: 10,
  halfD: 7,
  wallH: 4.2,
  doorWidth: 2.6,
  theme: {
    floorColor: 0xe2e8f0,
    floorGlow: 0.2,
    runnerColor: 0x0f766e,
    runnerGlow: 0.22,
    wallColor: 0xf8fafc,
    wallGlow: 0.3,
    partitionColor: 0x0f766e,
    ceilingColor: 0xffffff,
    ceilingGlow: 0.28,
  },
  boxes: [
    // Murs extérieurs (mur sud coupé par la porte de 2,6 m centrée en x = 0)
    { x: 0, z: -7, hx: 10, hz: W, h: 4.2, kind: 'wall' },
    { x: -10, z: 0, hx: W, hz: 7, h: 4.2, kind: 'wall' },
    { x: 10, z: 0, hx: W, hz: 7, h: 4.2, kind: 'wall' },
    { x: -5.65, z: 7, hx: 4.35, hz: W, h: 4.2, kind: 'wall' },
    { x: 5.65, z: 7, hx: 4.35, hz: W, h: 4.2, kind: 'wall' },
    // Cloisons basses solennelles séparant la salle d'honneur au nord (large allée centrale libre)
    { x: -6.2, z: -1.6, hx: 2.6, hz: W, h: 1.05, kind: 'partition' },
    { x: 6.2, z: -1.6, hx: 2.6, hz: W, h: 1.05, kind: 'partition' },
    // Tribune / bureau d'honneur du maire au nord
    { x: 0, z: -5.0, hx: 3.4, hz: 0.9, h: 1.1, kind: 'prop' },
    // Guichet état civil à l'ouest
    { x: -6.8, z: 2.2, hx: 1.6, hz: 0.7, h: 1.1, kind: 'prop' },
    // Bancs d'attente à l'est
    { x: 6.6, z: 1.4, hx: 1.5, hz: 0.5, h: 0.5, kind: 'prop' },
    { x: 6.6, z: 3.4, hx: 1.5, hz: 0.5, h: 0.5, kind: 'prop' },
    // Colonnes d'honneur encadrant la tribune nord
    { x: -4.8, z: -5.4, hx: 0.5, hz: 0.5, h: 3.0, kind: 'prop' },
    { x: 4.8, z: -5.4, hx: 0.5, hz: 0.5, h: 3.0, kind: 'prop' },
  ],
  entry: { x: 0, z: 3.2, rotY: Math.PI },
  exit: { x: 0, z: 5.7, radius: 1.6 },
  npcs: [
    still('agent_mairie', 4101, -2, -6.4, 0),
    still('agent_mairie', 4102, 2, -6.4, 0),
    walk('agent_mairie', 4103, [[-2.5, -3], [2.5, -3]]),
    still('client', 4104, 0, -2.8, Math.PI),
    still('client', 4105, 0.4, -1.2, Math.PI),
    walk('client', 4106, [[-8, 0.2], [8, 0.2]]),
    talk('client', 4107, -6.8, -3.6, H),
    talk('client', 4108, -5.8, -3.6, -H),
  ],
};

/** Lycée Classique (Cocody) : grande salle d'étude classique, pupitres bois et bureau magistral. */
export const LYCEE_CAIMAN_INTERIOR: InteriorDef = {
  id: 'lycee_caiman',
  label: 'Lycée Classique',
  origin: { x: 2620, z: 2960 },
  halfW: 10,
  halfD: 7,
  wallH: 4.0,
  doorWidth: 2.4,
  theme: {
    floorColor: 0xe7e0d0,
    floorGlow: 0.18,
    runnerColor: 0xb45309,
    runnerGlow: 0.2,
    wallColor: 0xfdf6e3,
    wallGlow: 0.28,
    partitionColor: 0x92400e,
    ceilingColor: 0xfffbeb,
    ceilingGlow: 0.25,
  },
  boxes: [
    { x: 0, z: -7, hx: 10, hz: W, h: 4.0, kind: 'wall' },
    { x: -10, z: 0, hx: W, hz: 7, h: 4.0, kind: 'wall' },
    { x: 10, z: 0, hx: W, hz: 7, h: 4.0, kind: 'wall' },
    { x: -5.6, z: 7, hx: 4.4, hz: W, h: 4.0, kind: 'wall' },
    { x: 5.6, z: 7, hx: 4.4, hz: W, h: 4.0, kind: 'wall' },
    // Cloisons basses encadrant l'entrée
    { x: -6.4, z: 3.4, hx: 2.2, hz: W, h: 1.0, kind: 'partition' },
    { x: 6.4, z: 3.4, hx: 2.2, hz: W, h: 1.0, kind: 'partition' },
    // Bureau du professeur au nord
    { x: 0, z: -4.6, hx: 2.8, hz: 0.75, h: 1.05, kind: 'prop' },
    // 6 rangées de pupitres (ailes ouest et est, allée centrale dégagée)
    { x: -4.6, z: -2.2, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    { x: -4.6, z: -0.2, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    { x: -4.6, z: 1.8, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    { x: 4.6, z: -2.2, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    { x: 4.6, z: -0.2, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    { x: 4.6, z: 1.8, hx: 1.5, hz: 0.6, h: 0.8, kind: 'prop' },
    // Armoires à livres au fond
    { x: -8.6, z: -4.8, hx: 0.7, hz: 1.2, h: 2.2, kind: 'prop' },
    { x: 8.6, z: -4.8, hx: 0.7, hz: 1.2, h: 2.2, kind: 'prop' },
  ],
  entry: { x: 0, z: 3.4, rotY: Math.PI },
  exit: { x: 0, z: 5.7, radius: 1.6 },
  npcs: [
    walk('enseignant', 5101, [[-1.2, -2.6], [1.2, -2.6]]),
    still('eleve', 5102, -2.5, -0.2, -H),
    still('eleve', 5103, 2.5, -0.2, H),
    still('eleve', 5104, -2.5, 1.8, -H),
    still('eleve', 5105, 2.5, 1.8, H),
    talk('eleve', 5106, -7.8, -1, H),
    talk('eleve', 5107, -6.9, -1, -H),
    walk('eleve', 5108, [[7.8, -3], [7.8, 2.5]]),
  ],
};

/** Lycée Sainte-Marie (Cocody) : amphithéâtre littéraire, grandes tables de séminaire et bibliothèque. */
export const LYCEE_ALYSMA_INTERIOR: InteriorDef = {
  id: 'lycee_alysma',
  label: 'Lycée Sainte-Marie',
  origin: { x: 2560, z: 2960 },
  halfW: 10,
  halfD: 7,
  wallH: 4.0,
  doorWidth: 2.4,
  theme: {
    floorColor: 0xf1e8ec,
    floorGlow: 0.18,
    runnerColor: 0xbe123c,
    runnerGlow: 0.2,
    wallColor: 0xfff1f2,
    wallGlow: 0.28,
    partitionColor: 0x9f1239,
    ceilingColor: 0xffffff,
    ceilingGlow: 0.25,
  },
  boxes: [
    { x: 0, z: -7, hx: 10, hz: W, h: 4.0, kind: 'wall' },
    { x: -10, z: 0, hx: W, hz: 7, h: 4.0, kind: 'wall' },
    { x: 10, z: 0, hx: W, hz: 7, h: 4.0, kind: 'wall' },
    { x: -5.6, z: 7, hx: 4.4, hz: W, h: 4.0, kind: 'wall' },
    { x: 5.6, z: 7, hx: 4.4, hz: W, h: 4.0, kind: 'wall' },
    { x: -6.4, z: 1.8, hx: 2.2, hz: W, h: 1.0, kind: 'partition' },
    { x: 6.4, z: 1.8, hx: 2.2, hz: W, h: 1.0, kind: 'partition' },
    // Chaire du professeur au nord
    { x: 0, z: -4.8, hx: 2.8, hz: 0.75, h: 1.05, kind: 'prop' },
    // Deux longues tables de séminaire (ouest et est)
    { x: -5.2, z: -1.4, hx: 1.4, hz: 2.3, h: 0.8, kind: 'prop' },
    { x: 5.2, z: -1.4, hx: 1.4, hz: 2.3, h: 0.8, kind: 'prop' },
    // Bibliothèques et bancs d'étude
    { x: -8.6, z: -4.8, hx: 0.7, hz: 1.4, h: 2.3, kind: 'prop' },
    { x: 8.6, z: -4.8, hx: 0.7, hz: 1.4, h: 2.3, kind: 'prop' },
    { x: -6.2, z: 4.0, hx: 1.5, hz: 0.5, h: 0.5, kind: 'prop' },
    { x: 6.2, z: 4.0, hx: 1.5, hz: 0.5, h: 0.5, kind: 'prop' },
    // Pilastres ivoire du mur nord (alignés sur buildLyceeAlysmaFurniture : x ± 3,6, z = −halfD + 0,22)
    { x: -3.6, z: -6.78, hx: 0.225, hz: 0.15, h: 3.45, kind: 'prop' },
    { x: 3.6, z: -6.78, hx: 0.225, hz: 0.15, h: 3.45, kind: 'prop' },
  ],
  entry: { x: 0, z: 3.4, rotY: Math.PI },
  exit: { x: 0, z: 5.7, radius: 1.6 },
  npcs: [
    walk('enseignant', 6101, [[-1.2, -2.8], [1.2, -2.8]]),
    still('eleve', 6102, -2.8, -0.4, -H),
    still('eleve', 6103, 2.8, -0.4, H),
    still('eleve', 6104, -2.8, -2.6, -H),
    still('eleve', 6105, 2.8, -2.6, H),
    talk('eleve', 6106, -8, -1.2, H),
    talk('eleve', 6107, -7.1, -1.2, -H),
    walk('eleve', 6108, [[8, -2.5], [8, 0.6]]),
  ],
};

/** Lycée d'Excellence de Bassam : campus sciences & numérique, écrans bleus et îlots de labo. */
export const LYCEE_ALEX_INTERIOR: InteriorDef = {
  id: 'lycee_alex',
  label: "Lycée d'Excellence de Bassam",
  origin: { x: 2500, z: 2960 },
  halfW: 11,
  halfD: 8,
  wallH: 4.4,
  doorWidth: 2.6,
  theme: {
    floorColor: 0xdbeafe,
    floorGlow: 0.2,
    runnerColor: 0x0284c7,
    runnerGlow: 0.24,
    wallColor: 0xf0f9ff,
    wallGlow: 0.3,
    partitionColor: 0x0369a1,
    ceilingColor: 0xffffff,
    ceilingGlow: 0.28,
  },
  boxes: [
    { x: 0, z: -8, hx: 11, hz: W, h: 4.4, kind: 'wall' },
    { x: -11, z: 0, hx: W, hz: 8, h: 4.4, kind: 'wall' },
    { x: 11, z: 0, hx: W, hz: 8, h: 4.4, kind: 'wall' },
    { x: -6.15, z: 8, hx: 4.85, hz: W, h: 4.4, kind: 'wall' },
    { x: 6.15, z: 8, hx: 4.85, hz: W, h: 4.4, kind: 'wall' },
    { x: -6.8, z: 3.6, hx: 2.4, hz: W, h: 1.05, kind: 'partition' },
    { x: 6.8, z: 3.6, hx: 2.4, hz: W, h: 1.05, kind: 'partition' },
    // Estrade numérique au nord
    { x: 0, z: -5.6, hx: 3.2, hz: 0.85, h: 1.1, kind: 'prop' },
    // 4 paillasses / stations informatiques
    { x: -5.8, z: -2.0, hx: 2.0, hz: 0.9, h: 0.9, kind: 'prop' },
    { x: 5.8, z: -2.0, hx: 2.0, hz: 0.9, h: 0.9, kind: 'prop' },
    { x: -5.8, z: 1.0, hx: 2.0, hz: 0.9, h: 0.9, kind: 'prop' },
    { x: 5.8, z: 1.0, hx: 2.0, hz: 0.9, h: 0.9, kind: 'prop' },
    // Bornes serveurs / robotique aux coins nord
    { x: -9.2, z: -5.6, hx: 0.7, hz: 0.7, h: 2.4, kind: 'prop' },
    { x: 9.2, z: -5.6, hx: 0.7, hz: 0.7, h: 2.4, kind: 'prop' },
  ],
  entry: { x: 0, z: 4.0, rotY: Math.PI },
  exit: { x: 0, z: 6.6, radius: 1.6 },
  npcs: [
    walk('enseignant', 7101, [[-1.5, -3.4], [1.5, -3.4]]),
    still('eleve', 7102, -2.5, -2, -H),
    still('eleve', 7103, 2.5, -2, H),
    still('eleve', 7104, -2.5, 1, -H),
    still('eleve', 7105, 2.5, 1, H),
    talk('eleve', 7106, -9.5, 0.6, H),
    talk('eleve', 7107, -8.6, 0.6, -H),
    walk('eleve', 7108, [[9, -3.8], [9, 2]]),
  ],
};

export const INTERIORS: Record<PublicInteriorId, InteriorDef> = {
  hopital: HOSPITAL_INTERIOR,
  maquis: MAQUIS_INTERIOR,
  marche_adjame: MARCHE_INTERIOR,
  mairie: MAIRIE_INTERIOR,
  lycee_caiman: LYCEE_CAIMAN_INTERIOR,
  lycee_alysma: LYCEE_ALYSMA_INTERIOR,
  lycee_alex: LYCEE_ALEX_INTERIOR,
};

export const interiorToWorld = (def: InteriorDef, lx: number, lz: number): { x: number; z: number } =>
  ({ x: def.origin.x + lx, z: def.origin.z + lz });

/** Vrai si le point local est à l'intérieur de la salle (hors murs). */
export const insideInterior = (def: InteriorDef, lx: number, lz: number): boolean =>
  Math.abs(lx) < def.halfW - 0.3 && Math.abs(lz) < def.halfD - 0.3;

/** Vrai si un point local (cercle de rayon r) touche un des solides de la salle. */
export const hitsInteriorBox = (def: InteriorDef, lx: number, lz: number, r = 0.35): boolean =>
  def.boxes.some((b) => Math.abs(lx - b.x) < b.hx + r && Math.abs(lz - b.z) < b.hz + r);
