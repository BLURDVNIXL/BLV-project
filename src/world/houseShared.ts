/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Types et constantes partagés des plans de maisons par destin (module PUR).
 */
import type { CribUpgrades } from '../types/game';
import type { HomeType } from './abidjanGeography';
import type { InteriorActionSpot, InteriorBox, InteriorTheme } from './interiors';

/** Origines fixes hors carte pour les étages des maisons (rangée z = 2860, espacement 60 m, dans ±3072). */
export const HOUSE_FLOOR_ORIGINS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 2860, z: 2860 },
  { x: 2800, z: 2860 },
];

/** Les 3 points d'action obligatoires de toute maison (ids, types et libellés conservés). */
export const HOUSE_REQUIRED_ACTIONS = {
  sleep: { id: 'home_bed', type: 'sleep' as const, label: '🛏️ Dormir au lit (Énergie +85%)', color: 0x6366f1 },
  eat: { id: 'home_fridge', type: 'eat' as const, label: '🧊 Réfrigérateur & Garba maison', color: 0xf97316 },
  shower: { id: 'home_shower', type: 'shower' as const, label: '🚿 Douche & Hygiène', color: 0x06b6d4 },
};

export type HousePropKind =
  | 'bed'
  | 'fridge'
  | 'shower'
  | 'desk_pc'
  | 'sofa'
  | 'table'
  | 'bar'
  | 'kitchen_counter'
  | 'shelf'
  | 'wardrobe'
  | 'toilet_unit'
  | 'crates'
  | 'barrel'
  | 'stove'
  | 'carpet'
  | 'tarp'
  | 'tools'
  | 'mannequin'
  | 'trophy'
  | 'safe'
  | 'plant'
  | 'fan'
  | 'rack_clothes'
  | 'gym_bench'
  | 'stairs_up'
  | 'stairs_down'
  | 'lounger'
  | 'coffee_table'
  | 'ac_split'
  | 'speaker'
  | 'tv_screen';

export interface HousePropSpec {
  id: string;
  kind: HousePropKind;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Hauteur de l'objet (m). */
  h: number;
  /** Élévation de la base (m) ; 0 par défaut (posée sur le sol). */
  y?: number;
  /** Orientation visuelle interne (N/S/E/W) tout en gardant (hx, hz) alignés sur les axes de la salle. */
  facing?: 'N' | 'S' | 'E' | 'W';
  primaryColor: number;
  secondaryColor?: number;
  accentColor?: number;
  /**
   * Vrai uniquement si traversable avec une justification explicite :
   * tapis/caillebotis (< 0,35 m), décor mural fin (≤ 0,25 m) ou suspendu (y ≥ 1,5 m).
   */
  walkable?: true;
  walkableReason?: string;
  /** Si renseigné, l'objet et son solide ne sont actifs que lorsque cette amélioration est achetée. */
  upgradeKey?: keyof CribUpgrades;
}

export interface HouseFloorSpec {
  label: string;
  halfW: number;
  halfD: number;
  wallH: number;
  doorWidth: number;
  theme: InteriorTheme;
  /** Cloisons ou pans de murs personnalisés. */
  structure: InteriorBox[];
  props: HousePropSpec[];
  entry: { x: number; z: number; rotY: number };
  exit: { x: number; z: number; radius: number };
  bed?: { x: number; z: number; rotY: number };
  actions: InteriorActionSpot[];
  hasStreetExit: boolean;
  ceilingZMin?: number;
  ceilingZMax?: number;
}

export interface HouseFacadeBox {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  y?: number;
  /**
   * `building` = corps fermé opaque (SolidFlag.BUILDING, tire la caméra) ;
   * `prop` = clôture, pilier, bassin, réserve (SolidFlag.PROP) ;
   * `decor` = seuil < 0,35 m, ouvrant plat ≤ 0,25 m collé au mur, ou toit/auvent y ≥ 1,5 m.
   */
  kind: 'building' | 'prop' | 'decor';
  color: number;
  emissive?: number;
  glow?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
}

export interface HouseFacadeSpec {
  signText: string;
  signBg: string;
  signFg: string;
  signY: number;
  signZ: number;
  doorZ: number;
  doorRadius: number;
  doorColor: number;
  porchZ: number;
  volumes: HouseFacadeBox[];
}

export interface HouseSpec {
  destinyId: string;
  name: string;
  homeType: HomeType;
  facade: HouseFacadeSpec;
  floors: HouseFloorSpec[];
}

export const WALL_T = 0.15;

/** Construit les 5 pans de murs périmétriques avec porte centrée au sud (z = +halfD). */
export function perimeterWithDoor(halfW: number, halfD: number, wallH: number, doorWidth: number): InteriorBox[] {
  const panW = (halfW * 2 - doorWidth) / 4;
  const panX = doorWidth / 2 + panW;
  return [
    { x: 0, z: -halfD, hx: halfW, hz: WALL_T, h: wallH, kind: 'wall' },
    { x: -halfW, z: 0, hx: WALL_T, hz: halfD, h: wallH, kind: 'wall' },
    { x: halfW, z: 0, hx: WALL_T, hz: halfD, h: wallH, kind: 'wall' },
    { x: -panX, z: halfD, hx: panW, hz: WALL_T, h: wallH, kind: 'wall' },
    { x: panX, z: halfD, hx: panW, hz: WALL_T, h: wallH, kind: 'wall' },
  ];
}
