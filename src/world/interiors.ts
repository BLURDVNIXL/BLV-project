/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Intérieurs « à part » : salles fermées posées dans une zone libre au sud de la carte (hors de la ville),
 * où l'on est téléporté par une porte. Module PUR (données + géométrie, sans Three.js ni physique) → testable.
 * Axes locaux = axes monde (+x est, +z sud). La porte est sur le mur sud (z = +halfD), on entre en regardant le nord.
 */

export type InteriorId = 'hopital';

export interface InteriorBox {
  /** Centre local, demi-largeurs, hauteur. `wall` : mur (fondu côté caméra) ; `prop` : meuble. */
  x: number; z: number; hx: number; hz: number; h: number;
  kind: 'wall' | 'prop';
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
  /** Où le joueur apparaît en entrant (local) et cap (rotY : le joueur regarde (sin, cos)). */
  entry: { x: number; z: number; rotY: number };
  /** Zone d'action « Sortir » (local). */
  exit: { x: number; z: number; radius: number };
  /** Point de réveil à côté du lit n°1 (local) — utilisé par le lot santé. */
  bed: { x: number; z: number; rotY: number };
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
  boxes: [
    // Murs extérieurs (le mur sud est coupé par la porte)
    { x: 0, z: -5.5, hx: 9, hz: W, h: 3.4, kind: 'wall' },
    { x: -9, z: 0, hx: W, hz: 5.5, h: 3.4, kind: 'wall' },
    { x: 9, z: 0, hx: W, hz: 5.5, h: 3.4, kind: 'wall' },
    { x: -5.1, z: 5.5, hx: 3.9, hz: W, h: 3.4, kind: 'wall' },
    { x: 5.1, z: 5.5, hx: 3.9, hz: W, h: 3.4, kind: 'wall' },
    // Cloison basse accueil / chambres (1,2 m, passage de 6 m à l'est)
    { x: -3, z: -1, hx: 6, hz: W, h: 1.2, kind: 'prop' },
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

export const INTERIORS: Record<InteriorId, InteriorDef> = { hopital: HOSPITAL_INTERIOR };

export const interiorToWorld = (def: InteriorDef, lx: number, lz: number): { x: number; z: number } =>
  ({ x: def.origin.x + lx, z: def.origin.z + lz });

/** Vrai si le point local est à l'intérieur de la salle (hors murs). */
export const insideInterior = (def: InteriorDef, lx: number, lz: number): boolean =>
  Math.abs(lx) < def.halfW - 0.3 && Math.abs(lz) < def.halfD - 0.3;

/** Vrai si un point local (cercle de rayon r) touche un des solides de la salle. */
export const hitsInteriorBox = (def: InteriorDef, lx: number, lz: number, r = 0.35): boolean =>
  def.boxes.some((b) => Math.abs(lx - b.x) < b.hx + r && Math.abs(lz - b.z) < b.hz + r);
