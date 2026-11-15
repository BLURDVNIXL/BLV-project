/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Intérieurs « à part » : salles fermées posées dans une zone libre au sud de la carte (hors de la ville),
 * où l'on est téléporté par une porte. Module PUR (données + géométrie, sans Three.js ni physique) → testable.
 * Axes locaux = axes monde (+x est, +z sud). La porte est sur le mur sud (z = +halfD), on entre en regardant le nord.
 */

export type InteriorId = 'hopital' | 'maquis' | 'marche_adjame' | 'mairie';

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

export type InteriorActionKind = 'eat' | 'work' | 'yannis_academy';

export interface InteriorActionSpot {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  type: InteriorActionKind;
  color: number;
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
  /** Point de réveil à côté du lit n°1 (local) — propre à l'hôpital pour le lot santé. */
  bed?: { x: number; z: number; rotY: number };
  /** Zones d'action internes éventuelles (manger, travailler…). */
  actions?: InteriorActionSpot[];
}

const W = 0.15; // demi-épaisseur des murs

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
  bed: { x: 6.2, z: -2.5, rotY: Math.PI }
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
};

export const INTERIORS: Record<InteriorId, InteriorDef> = {
  hopital: HOSPITAL_INTERIOR,
  maquis: MAQUIS_INTERIOR,
  marche_adjame: MARCHE_INTERIOR,
  mairie: MAIRIE_INTERIOR,
};

export const interiorToWorld = (def: InteriorDef, lx: number, lz: number): { x: number; z: number } =>
  ({ x: def.origin.x + lx, z: def.origin.z + lz });

/** Vrai si le point local est à l'intérieur de la salle (hors murs). */
export const insideInterior = (def: InteriorDef, lx: number, lz: number): boolean =>
  Math.abs(lx) < def.halfW - 0.3 && Math.abs(lz) < def.halfD - 0.3;

/** Vrai si un point local (cercle de rayon r) touche un des solides de la salle. */
export const hitsInteriorBox = (def: InteriorDef, lx: number, lz: number, r = 0.35): boolean =>
  def.boxes.some((b) => Math.abs(lx - b.x) < b.hx + r && Math.abs(lz - b.z) < b.hz + r);
