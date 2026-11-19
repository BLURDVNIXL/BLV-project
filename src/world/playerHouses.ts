/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Plans des maisons du joueur par id de destin : façades extérieures fermées (emprise ≤ 13 × 11 m),
 * étages intérieurs hors carte, mobilier et objets signature déclarés UNE SEULE FOIS pour produire
 * à la fois le rendu 3D et les solides physiques. Module PUR (zéro Three.js, zéro PhysicsCore).
 */

import type { CribUpgrades } from '../types/game';
import type { HomeType } from './abidjanGeography';
import type { HouseInteriorId, InteriorBox, InteriorDef } from './interiors';
import {
  HOUSE_FLOOR_ORIGINS,
  HOUSE_REQUIRED_ACTIONS,
  perimeterWithDoor,
  type HouseFacadeBox,
  type HouseFacadeSpec,
  type HouseFloorSpec,
  type HousePropKind,
  type HousePropSpec,
  type HouseSpec,
} from './houseShared';
import { HOUSE_GROUP_A } from './houseGroupA';
import { HOUSE_GROUP_B } from './houseGroupB';
import { HOUSE_GROUP_C } from './houseGroupC';

export {
  HOUSE_FLOOR_ORIGINS,
  HOUSE_REQUIRED_ACTIONS,
  type HouseFacadeBox,
  type HouseFacadeSpec,
  type HouseFloorSpec,
  type HousePropKind,
  type HousePropSpec,
  type HouseSpec,
};

/** Descripteur autonome d'une maison (conservé : utile si les visites sont réintroduites). */
export interface HouseDescriptor {
  destinyId: string;
  homeType: HomeType;
  upgrades: CribUpgrades;
  ownerLabel?: string;
}

export interface FacadeWorldSolid {
  x: number;
  z: number;
  hx: number;
  hz: number;
  angle: number;
  h: number;
  flag: 'building' | 'prop';
}

const WALL_T = 0.15;

/** Transforme un point local de la parcelle en coordonnées monde (rotation.y = φ, avant +z). */
export function houseToWorld(cx: number, cz: number, rotationY: number, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

/** Convertit un meuble déclaré une seule fois en solide d'intérieur (ou null s'il est walkable). */
export function propToInteriorBox(p: HousePropSpec): InteriorBox | null {
  if (p.walkable) return null;
  return { x: p.x, z: p.z, hx: p.hx, hz: p.hz, h: (p.y ?? 0) + p.h, kind: 'prop' };
}

/** Produit les solides des améliorations actives de l'étage courant (utilisé lors d'un achat en direct). */
export function getHouseUpgradeBoxes(floor: HouseFloorSpec, upgrades: CribUpgrades): InteriorBox[] {
  const boxes: InteriorBox[] = [];
  for (const p of floor.props) {
    if (!p.upgradeKey || !upgrades[p.upgradeKey]) continue;
    const b = propToInteriorBox(p);
    if (b) boxes.push(b);
  }
  return boxes;
}

/** Construit l'InteriorDef complet d'un étage de maison pour un jeu d'améliorations donné. */
export function buildHouseFloorDef(spec: HouseSpec, floorIndex: number, upgrades: CribUpgrades): InteriorDef {
  const floor = spec.floors[floorIndex] ?? spec.floors[0];
  const origin = HOUSE_FLOOR_ORIGINS[floorIndex] ?? HOUSE_FLOOR_ORIGINS[0];
  const id: HouseInteriorId = floorIndex === 0 ? 'house_floor_0' : 'house_floor_1';

  const propBoxes: InteriorBox[] = [];
  for (const p of floor.props) {
    if (p.upgradeKey && !upgrades[p.upgradeKey]) continue;
    const b = propToInteriorBox(p);
    if (b) propBoxes.push(b);
  }

  return {
    id,
    label: floor.label,
    origin,
    halfW: floor.halfW,
    halfD: floor.halfD,
    wallH: floor.wallH,
    doorWidth: floor.doorWidth,
    theme: floor.theme,
    boxes: [...floor.structure, ...propBoxes],
    entry: floor.entry,
    exit: floor.exit,
    bed: floor.bed,
    actions: floor.actions,
    hasStreetExit: floor.hasStreetExit,
    ceilingZMin: floor.ceilingZMin,
    ceilingZMax: floor.ceilingZMax,
  };
}

/** Renvoie les solides monde à enregistrer dans PhysicsCore pour la façade extérieure d'une maison. */
export function facadeWorldSolids(spec: HouseSpec, cx: number, cz: number, rotationY: number): FacadeWorldSolid[] {
  const out: FacadeWorldSolid[] = [];
  for (const v of spec.facade.volumes) {
    if (v.kind === 'decor') continue;
    const w = houseToWorld(cx, cz, rotationY, v.x, v.z);
    out.push({
      x: w.x,
      z: w.z,
      hx: v.hx,
      hz: v.hz,
      angle: -rotationY,
      h: (v.y ?? 0) + v.h,
      flag: v.kind,
    });
  }
  return out;
}

// ───────────── Maison pilote 1 : Le Poignon (`poignon`, squat, Adjamé, 1 étage) ─────────────

const POIGNON_HOUSE: HouseSpec = {
  destinyId: 'poignon',
  name: 'Abri du Poignon (Adjamé)',
  homeType: 'squat',
  facade: {
    signText: 'CHEZ LE POIGNON',
    signBg: '#44403c',
    signFg: '#fef3c7',
    signY: 2.44,
    signZ: 1.78,
    doorZ: 3.1,
    doorRadius: 2.6,
    doorColor: 0x10b981,
    porchZ: 5.2,
    volumes: [
      // Corps principal fermé en tôle et planches
      { x: 0, z: -0.6, hx: 3.1, hz: 2.3, h: 2.7, kind: 'building', color: 0x78716c, roughness: 0.88 },
      // Appentis latéral de stockage (tôle rouillée)
      { x: -3.75, z: -1.1, hx: 0.65, hz: 1.4, h: 2.1, kind: 'building', color: 0x9a3412, roughness: 0.85 },
      // Bâche & toiture ondulée débordante (y >= 1,5 m)
      { x: -0.2, z: -0.4, hx: 3.8, hz: 2.8, h: 0.16, y: 2.72, kind: 'decor', color: 0x57534e, roughness: 0.78 },
      { x: 0, z: 1.98, hx: 1.35, hz: 0.34, h: 0.07, y: 2.06, kind: 'decor', color: 0x15803d, roughness: 0.72 },
      // Porte en bois fermée collée en façade (≤ 0,25 m)
      { x: 0, z: 1.73, hx: 0.68, hz: 0.06, h: 2.05, kind: 'decor', color: 0x78350f, roughness: 0.75 },
      // Clôture basse de récup à l'avant (passage central de 3,4 m libre)
      { x: -3.1, z: 3.2, hx: 1.4, hz: 0.14, h: 1.25, kind: 'prop', color: 0x713f12, roughness: 0.86 },
      { x: 3.1, z: 3.2, hx: 1.4, hz: 0.14, h: 1.25, kind: 'prop', color: 0x713f12, roughness: 0.86 },
      { x: -4.4, z: 1.5, hx: 0.14, hz: 1.7, h: 1.25, kind: 'prop', color: 0x57534e, roughness: 0.88 },
      { x: 4.4, z: 1.5, hx: 0.14, hz: 1.7, h: 1.25, kind: 'prop', color: 0x57534e, roughness: 0.88 },
      // Caisses d'Adjamé & bidons bleus dans la courette
      { x: -2.2, z: 2.35, hx: 0.55, hz: 0.45, h: 0.85, kind: 'prop', color: 0xb45309, roughness: 0.8 },
      { x: 2.2, z: 2.35, hx: 0.5, hz: 0.45, h: 0.9, kind: 'prop', color: 0x0284c7, roughness: 0.55 },
      // Paillasson / planche seuil < 0,35 m
      { x: 0, z: 2.25, hx: 1.0, hz: 0.55, h: 0.06, kind: 'decor', color: 0x92400e, roughness: 0.9 },
    ],
  },
  floors: [
    {
      label: 'Abri du Poignon — Hangar Adjamé',
      halfW: 3.0,
      halfD: 2.5,
      wallH: 2.8,
      doorWidth: 1.8,
      hasStreetExit: true,
      theme: {
        floorColor: 0x57534e,
        floorGlow: 0.12,
        runnerColor: 0x92400e,
        runnerGlow: 0.14,
        wallColor: 0x78716c,
        wallGlow: 0.22,
        partitionColor: 0x713f12,
        ceilingColor: 0x44403c,
        ceilingGlow: 0.16,
      },
      structure: perimeterWithDoor(3.0, 2.5, 2.8, 1.8),
      entry: { x: 0, z: 0.85, rotY: Math.PI },
      exit: { x: 0, z: 1.85, radius: 1.25 },
      bed: { x: -1.45, z: -0.25, rotY: -Math.PI / 2 },
      actions: [
        { ...HOUSE_REQUIRED_ACTIONS.sleep, x: -1.45, z: -0.25, radius: 1.4 },
        { ...HOUSE_REQUIRED_ACTIONS.eat, x: 1.15, z: -1.05, radius: 1.4 },
        { ...HOUSE_REQUIRED_ACTIONS.shower, x: 1.05, z: 0.85, radius: 1.4 },
      ],
      props: [
        // Palette + matelas carton + couverture Baraka (h = 0,40 m → solide)
        {
          id: 'poignon_bed',
          kind: 'bed',
          x: -2.0,
          z: -1.55,
          hx: 0.78,
          hz: 0.62,
          h: 0.4,
          facing: 'S',
          primaryColor: 0x92400e,
          secondaryColor: 0xd6d3d1,
          accentColor: 0x10b981,
        },
        // Bidons d'eau & réserve Baraka
        {
          id: 'poignon_barrels',
          kind: 'barrel',
          x: -0.55,
          z: -1.98,
          hx: 0.45,
          hz: 0.28,
          h: 0.9,
          primaryColor: 0xfacc15,
          secondaryColor: 0x0284c7,
          accentColor: 0x1e293b,
        },
        // Réchaud charbon & marmite
        {
          id: 'poignon_stove',
          kind: 'stove',
          x: 0.55,
          z: -1.98,
          hx: 0.45,
          hz: 0.28,
          h: 0.75,
          primaryColor: 0x292524,
          secondaryColor: 0x94a3b8,
          accentColor: 0xf97316,
        },
        // Glacière & caisse provisions
        {
          id: 'poignon_fridge',
          kind: 'fridge',
          x: 2.2,
          z: -1.75,
          hx: 0.5,
          hz: 0.45,
          h: 1.15,
          facing: 'S',
          primaryColor: 0x0ea5e9,
          secondaryColor: 0xf8fafc,
          accentColor: 0x78350f,
        },
        // Coin douche : fût bleu + paravent tôle + seau
        {
          id: 'poignon_shower',
          kind: 'shower',
          x: 2.15,
          z: 1.25,
          hx: 0.55,
          hz: 0.55,
          h: 1.85,
          facing: 'W',
          primaryColor: 0x64748b,
          secondaryColor: 0x0284c7,
          accentColor: 0x38bdf8,
        },
        // Bureau caisse en bois + vieux PC portable + lampe tempête
        {
          id: 'poignon_pc',
          kind: 'desk_pc',
          x: -2.15,
          z: 1.2,
          hx: 0.55,
          hz: 0.45,
          h: 0.92,
          facing: 'E',
          primaryColor: 0xa16207,
          secondaryColor: 0x1e293b,
          accentColor: 0xf59e0b,
        },
        // Caisses du marché d'Adjamé + sacoche Baraka
        {
          id: 'poignon_crates',
          kind: 'crates',
          x: -2.35,
          z: 0.05,
          hx: 0.4,
          hz: 0.4,
          h: 0.76,
          primaryColor: 0xb45309,
          secondaryColor: 0x10b981,
          accentColor: 0xfef08a,
        },
        // Carton / natte centrale au sol (walkable < 0,35 m)
        {
          id: 'poignon_cardboard_rug',
          kind: 'tarp',
          x: 0,
          z: -0.25,
          hx: 1.0,
          hz: 0.65,
          h: 0.04,
          y: 0.1,
          primaryColor: 0xa16207,
          secondaryColor: 0xd97706,
          walkable: true,
          walkableReason: 'carton / natte plate au sol < 0,35 m',
        },
        // Améliorations du logement
        {
          id: 'poignon_upg_sofa',
          kind: 'sofa',
          x: 2.25,
          z: -0.3,
          hx: 0.45,
          hz: 0.72,
          h: 0.78,
          facing: 'W',
          primaryColor: 0x451a03,
          secondaryColor: 0x78350f,
          upgradeKey: 'canapeCuir',
        },
        {
          id: 'poignon_upg_baffle_l',
          kind: 'speaker',
          x: -1.3,
          z: 2.05,
          hx: 0.25,
          hz: 0.25,
          h: 1.15,
          primaryColor: 0x09090b,
          accentColor: 0xf97316,
          upgradeKey: 'bafflesMaquis',
        },
        {
          id: 'poignon_upg_baffle_r',
          kind: 'speaker',
          x: 1.25,
          z: 2.05,
          hx: 0.25,
          hz: 0.25,
          h: 1.15,
          primaryColor: 0x09090b,
          accentColor: 0xf97316,
          upgradeKey: 'bafflesMaquis',
        },
        {
          id: 'poignon_upg_tv',
          kind: 'tv_screen',
          x: 0,
          z: -2.26,
          hx: 0.85,
          hz: 0.08,
          h: 0.9,
          y: 1.15,
          primaryColor: 0x0f172a,
          accentColor: 0x22c55e,
          walkable: true,
          walkableReason: 'écran mural plat ≤ 0,25 m d’épaisseur',
          upgradeKey: 'tv4k',
        },
        {
          id: 'poignon_upg_clim',
          kind: 'ac_split',
          x: 1.35,
          z: -2.22,
          hx: 0.65,
          hz: 0.16,
          h: 0.34,
          y: 2.1,
          primaryColor: 0xf8fafc,
          accentColor: 0x38bdf8,
          walkable: true,
          walkableReason: 'climatiseur mural suspendu ≥ 1,5 m',
          upgradeKey: 'splitClim',
        },
      ],
    },
  ],
};

// ───────────── Maison pilote 2 : The Golden Boy (`golden_boy`, duplex_mer, Grand-Bassam, 2 étages) ─────────────

const GOLDEN_BOY_HOUSE: HouseSpec = {
  destinyId: 'golden_boy',
  name: 'Duplex Mer du Golden Boy (Bassam)',
  homeType: 'duplex_mer',
  facade: {
    signText: 'BASSAM VIP DUPLEX',
    signBg: '#0f172a',
    signFg: '#f59e0b',
    signY: 2.98,
    signZ: 1.76,
    doorZ: 2.9,
    doorRadius: 2.8,
    doorColor: 0xf59e0b,
    porchZ: 5.2,
    volumes: [
      // RDC cube blanc moderne
      { x: -0.2, z: -0.7, hx: 3.3, hz: 2.4, h: 3.4, kind: 'building', color: 0xf8fafc, roughness: 0.35 },
      // Étage R+1 (même emprise horizontale sur l'arrière, plus terrasse porte-à-faux en décor y >= 1,5 m)
      { x: -0.2, z: -0.7, hx: 3.3, hz: 2.4, h: 2.9, y: 3.4, kind: 'building', color: 0xe2e8f0, roughness: 0.32 },
      // Terrasse haute vitrée en porte-à-faux au-dessus de l'entrée (y >= 1,5 m → décor aérien)
      { x: -0.2, z: 2.0, hx: 3.3, hz: 0.5, h: 0.22, y: 3.4, kind: 'decor', color: 0xf8fafc, roughness: 0.3 },
      { x: -0.2, z: 2.45, hx: 3.3, hz: 0.06, h: 0.95, y: 3.62, kind: 'decor', color: 0x38bdf8, opacity: 0.45, roughness: 0.1 },
      // Vitrages panoramiques sur façade (collés ≤ 0,25 m)
      { x: -2.0, z: 1.73, hx: 0.95, hz: 0.06, h: 2.1, y: 0.8, kind: 'decor', color: 0x38bdf8, emissive: 0x0284c7, glow: 0.25, roughness: 0.12 },
      { x: 1.7, z: 1.73, hx: 0.95, hz: 0.06, h: 2.1, y: 0.8, kind: 'decor', color: 0x38bdf8, emissive: 0x0284c7, glow: 0.25, roughness: 0.12 },
      { x: -0.2, z: 1.73, hx: 2.6, hz: 0.06, h: 1.7, y: 4.1, kind: 'decor', color: 0x7dd3fc, emissive: 0x0284c7, glow: 0.2, roughness: 0.1 },
      // Grande porte pivot acajou & or (fermée)
      { x: 0, z: 1.74, hx: 0.85, hz: 0.06, h: 2.55, kind: 'decor', color: 0x451a03, roughness: 0.35 },
      // Piscine à débordement côté est (margelle haute 0,42 m → solide prop, pas de traversée)
      { x: 4.25, z: -0.4, hx: 0.72, hz: 2.1, h: 0.42, kind: 'prop', color: 0xf1f5f9, roughness: 0.4 },
      { x: 4.25, z: -0.4, hx: 0.56, hz: 1.9, h: 0.06, y: 0.39, kind: 'decor', color: 0x06b6d4, emissive: 0x0891b2, glow: 0.35, roughness: 0.12 },
      // Murs d'enceinte modernes + portail ouvert au centre (passage 2,8 m)
      { x: 0, z: -4.2, hx: 5.1, hz: 0.14, h: 1.6, kind: 'prop', color: 0xf8fafc, roughness: 0.45 },
      { x: -5.1, z: -0.35, hx: 0.14, hz: 3.85, h: 1.6, kind: 'prop', color: 0xf8fafc, roughness: 0.45 },
      { x: 5.1, z: -0.35, hx: 0.14, hz: 3.85, h: 1.6, kind: 'prop', color: 0xf8fafc, roughness: 0.45 },
      { x: -3.4, z: 3.5, hx: 1.7, hz: 0.14, h: 1.6, kind: 'prop', color: 0xf8fafc, roughness: 0.45 },
      { x: 3.4, z: 3.5, hx: 1.7, hz: 0.14, h: 1.6, kind: 'prop', color: 0xf8fafc, roughness: 0.45 },
      // Piliers dorés encadrant l'allée d'entrée
      { x: -1.65, z: 3.5, hx: 0.22, hz: 0.22, h: 2.15, kind: 'prop', color: 0xf59e0b, metalness: 0.35, roughness: 0.28 },
      { x: 1.65, z: 3.5, hx: 0.22, hz: 0.22, h: 2.15, kind: 'prop', color: 0xf59e0b, metalness: 0.35, roughness: 0.28 },
      // Tapis pierre claire sur allée (< 0,35 m)
      { x: 0, z: 2.6, hx: 1.2, hz: 0.85, h: 0.06, kind: 'decor', color: 0xe2e8f0, roughness: 0.5 },
    ],
  },
  floors: [
    // Étage 0 : RDC Lounge, Bar Marbre, Cuisine, Spa Douche & Escalier montant
    {
      label: 'Duplex Mer — Rez-de-chaussée',
      halfW: 5.5,
      halfD: 4.5,
      wallH: 3.4,
      doorWidth: 2.2,
      hasStreetExit: true,
      theme: {
        floorColor: 0x1e293b,
        floorGlow: 0.18,
        runnerColor: 0x92400e,
        runnerGlow: 0.18,
        wallColor: 0xf8fafc,
        wallGlow: 0.28,
        partitionColor: 0xcbd5e1,
        ceilingColor: 0xffffff,
        ceilingGlow: 0.25,
      },
      structure: [
        ...perimeterWithDoor(5.5, 4.5, 3.4, 2.2),
        // Cloison marbre entre cuisine nord-ouest et salon sud-ouest (grand passage 5,6 m à l'est)
        { x: -2.8, z: -1.2, hx: 2.55, hz: 0.14, h: 1.15, kind: 'partition' },
      ],
      entry: { x: 0, z: 2.3, rotY: Math.PI },
      exit: { x: 0, z: 3.7, radius: 1.4 },
      actions: [
        { ...HOUSE_REQUIRED_ACTIONS.eat, x: -2.4, z: -2.4, radius: 1.6 },
        { ...HOUSE_REQUIRED_ACTIONS.shower, x: 3.45, z: -2.2, radius: 1.5 },
        {
          id: 'stairs_to_1',
          label: '🪜 Monter à l’étage (Suite & Terrasse)',
          x: 2.85,
          z: 1.3,
          radius: 1.5,
          type: 'interior_stairs',
          color: 0xf59e0b,
          targetFloor: 1,
          arrival: { x: 2.85, z: 2.35, rotY: Math.PI },
        },
      ],
      props: [
        // Double frigo inox américain
        {
          id: 'gb_fridge',
          kind: 'fridge',
          x: -4.65,
          z: -3.7,
          hx: 0.55,
          hz: 0.45,
          h: 2.1,
          facing: 'S',
          primaryColor: 0xcbd5e1,
          secondaryColor: 0x0f172a,
          accentColor: 0x38bdf8,
        },
        // Îlot cuisine marbre blanc & or
        {
          id: 'gb_kitchen',
          kind: 'kitchen_counter',
          x: -2.4,
          z: -3.7,
          hx: 1.4,
          hz: 0.5,
          h: 0.98,
          facing: 'S',
          primaryColor: 0xf8fafc,
          secondaryColor: 0x1e293b,
          accentColor: 0xf59e0b,
        },
        // Cave à champagne & trophées Manhattan
        {
          id: 'gb_wine_rack',
          kind: 'shelf',
          x: 0,
          z: -4.05,
          hx: 0.85,
          hz: 0.3,
          h: 2.15,
          primaryColor: 0x78350f,
          secondaryColor: 0xf59e0b,
          accentColor: 0x10b981,
        },
        // Meuble vasque marbre & miroir
        {
          id: 'gb_vanity',
          kind: 'toilet_unit',
          x: 2.55,
          z: -3.95,
          hx: 0.75,
          hz: 0.35,
          h: 0.92,
          facing: 'S',
          primaryColor: 0xf1f5f9,
          secondaryColor: 0x38bdf8,
          accentColor: 0xf59e0b,
        },
        // Cabine douche spa italienne vitrée
        {
          id: 'gb_shower',
          kind: 'shower',
          x: 4.35,
          z: -3.45,
          hx: 0.85,
          hz: 0.75,
          h: 2.35,
          facing: 'W',
          primaryColor: 0x0f172a,
          secondaryColor: 0x7dd3fc,
          accentColor: 0xf59e0b,
        },
        // Table basse travertin lounge
        {
          id: 'gb_lounge_table',
          kind: 'coffee_table',
          x: -3.55,
          z: 1.35,
          hx: 0.5,
          hz: 0.85,
          h: 0.45,
          primaryColor: 0xe7e5e4,
          secondaryColor: 0x78350f,
          accentColor: 0xf59e0b,
        },
        // Bar lounge VIP sud-ouest
        {
          id: 'gb_bar',
          kind: 'bar',
          x: -3.2,
          z: 3.85,
          hx: 1.1,
          hz: 0.4,
          h: 1.05,
          facing: 'N',
          primaryColor: 0x0f172a,
          secondaryColor: 0xf59e0b,
          accentColor: 0x38bdf8,
        },
        // Tapis velours salon (< 0,35 m)
        {
          id: 'gb_rug_0',
          kind: 'carpet',
          x: -3.1,
          z: 1.35,
          hx: 1.5,
          hz: 1.4,
          h: 0.03,
          y: 0.1,
          primaryColor: 0x1e3a8a,
          secondaryColor: 0xf59e0b,
          walkable: true,
          walkableReason: 'tapis salon velours < 0,35 m',
        },
        // Escalier design chêne & verre montant à l'étage
        {
          id: 'gb_stairs_up',
          kind: 'stairs_up',
          x: 4.35,
          z: 1.25,
          hx: 0.8,
          hz: 1.65,
          h: 2.95,
          facing: 'N',
          primaryColor: 0x92400e,
          secondaryColor: 0xe2e8f0,
          accentColor: 0xf59e0b,
        },
        // Améliorations au RDC
        {
          id: 'gb_upg_sofa',
          kind: 'sofa',
          x: -2.05,
          z: 1.35,
          hx: 0.5,
          hz: 1.35,
          h: 0.84,
          facing: 'W',
          primaryColor: 0x451a03,
          secondaryColor: 0xf59e0b,
          upgradeKey: 'canapeCuir',
        },
        {
          id: 'gb_upg_baffle',
          kind: 'speaker',
          x: -4.95,
          z: 3.85,
          hx: 0.35,
          hz: 0.35,
          h: 1.35,
          primaryColor: 0x09090b,
          accentColor: 0xf59e0b,
          upgradeKey: 'bafflesMaquis',
        },
        {
          id: 'gb_upg_tv',
          kind: 'tv_screen',
          x: -5.28,
          z: 1.35,
          hx: 0.08,
          hz: 1.05,
          h: 1.05,
          y: 1.15,
          facing: 'E',
          primaryColor: 0x0f172a,
          accentColor: 0x22c55e,
          walkable: true,
          walkableReason: 'TV murale 4K ≤ 0,25 m d’épaisseur',
          upgradeKey: 'tv4k',
        },
        {
          id: 'gb_upg_clim_rdc',
          kind: 'ac_split',
          x: 0,
          z: -4.28,
          hx: 0.85,
          hz: 0.16,
          h: 0.35,
          y: 2.65,
          primaryColor: 0xf8fafc,
          accentColor: 0x38bdf8,
          walkable: true,
          walkableReason: 'climatiseur mural suspendu ≥ 1,5 m',
          upgradeKey: 'splitClim',
        },
      ],
    },
    // Étage 1 : R+1 Master Suite & Grande Terrasse Bassam
    {
      label: 'Duplex Mer — Suite & Terrasse Étage',
      halfW: 5.5,
      halfD: 4.5,
      wallH: 3.2,
      doorWidth: 2.2,
      hasStreetExit: false,
      ceilingZMin: -4.5,
      ceilingZMax: 0.1,
      theme: {
        floorColor: 0xe7e5e4,
        floorGlow: 0.2,
        runnerColor: 0x0f766e,
        runnerGlow: 0.18,
        wallColor: 0xf8fafc,
        wallGlow: 0.3,
        partitionColor: 0x38bdf8,
        ceilingColor: 0xffffff,
        ceilingGlow: 0.25,
      },
      structure: [
        // Murs de la suite (moitié nord)
        { x: 0, z: -4.5, hx: 5.5, hz: WALL_T, h: 3.2, kind: 'wall' },
        { x: -5.5, z: -2.2, hx: WALL_T, hz: 2.3, h: 3.2, kind: 'wall' },
        { x: 5.5, z: -2.2, hx: WALL_T, hz: 2.3, h: 3.2, kind: 'wall' },
        // Cloison vitrée suite / terrasse avec large passage central 2,7 m
        { x: -3.35, z: 0.1, hx: 2.0, hz: 0.14, h: 2.3, kind: 'partition' },
        { x: 3.35, z: 0.1, hx: 2.0, hz: 0.14, h: 2.3, kind: 'partition' },
        // Rambardes de la grande terrasse panoramique (solides !)
        { x: -5.5, z: 2.3, hx: WALL_T, hz: 2.2, h: 1.1, kind: 'partition' },
        { x: 5.5, z: 2.3, hx: WALL_T, hz: 2.2, h: 1.1, kind: 'partition' },
        { x: 0, z: 4.5, hx: 5.5, hz: WALL_T, h: 1.1, kind: 'partition' },
      ],
      entry: { x: 2.85, z: 2.35, rotY: Math.PI },
      exit: { x: 2.85, z: 2.35, radius: 1.2 },
      bed: { x: -1.35, z: -2.45, rotY: -Math.PI / 2 },
      actions: [
        { ...HOUSE_REQUIRED_ACTIONS.sleep, x: -1.35, z: -2.45, radius: 1.5 },
        {
          id: 'stairs_to_0',
          label: '🪜 Descendre au rez-de-chaussée',
          x: 2.85,
          z: 2.35,
          radius: 1.5,
          type: 'interior_stairs',
          color: 0xf59e0b,
          targetFloor: 0,
          arrival: { x: 2.85, z: 1.3, rotY: Math.PI },
        },
      ],
      props: [
        // Lit King Size de la Master Suite
        {
          id: 'gb_master_bed',
          kind: 'bed',
          x: -3.2,
          z: -3.05,
          hx: 1.15,
          hz: 1.0,
          h: 0.65,
          facing: 'S',
          primaryColor: 0x0f172a,
          secondaryColor: 0xf8fafc,
          accentColor: 0xf59e0b,
        },
        // Dressing sneakers & montres suisses
        {
          id: 'gb_wardrobe',
          kind: 'wardrobe',
          x: -0.6,
          z: -4.0,
          hx: 1.05,
          hz: 0.35,
          h: 2.2,
          primaryColor: 0x451a03,
          secondaryColor: 0xf59e0b,
          accentColor: 0x38bdf8,
        },
        // Bureau PC panoramique multi-écrans
        {
          id: 'gb_pc',
          kind: 'desk_pc',
          x: 3.2,
          z: -3.45,
          hx: 1.1,
          hz: 0.5,
          h: 0.92,
          facing: 'S',
          primaryColor: 0x0f172a,
          secondaryColor: 0xf8fafc,
          accentColor: 0x0ea5e9,
        },
        // Coffre Platinum & trophée AISA
        {
          id: 'gb_safe',
          kind: 'safe',
          x: 4.85,
          z: -3.7,
          hx: 0.45,
          hz: 0.45,
          h: 1.45,
          primaryColor: 0x334155,
          secondaryColor: 0xf59e0b,
          accentColor: 0x22c55e,
        },
        // Caillebotis teck de la terrasse (< 0,35 m)
        {
          id: 'gb_terrace_deck',
          kind: 'tarp',
          x: 0,
          z: 2.3,
          hx: 5.2,
          hz: 2.0,
          h: 0.03,
          y: 0.1,
          primaryColor: 0x92400e,
          secondaryColor: 0x78350f,
          walkable: true,
          walkableReason: 'caillebotis teck terrasse < 0,35 m',
        },
        // Transat mer sur la terrasse
        {
          id: 'gb_lounger_w',
          kind: 'lounger',
          x: -3.85,
          z: 2.55,
          hx: 0.65,
          hz: 1.15,
          h: 0.52,
          primaryColor: 0xf8fafc,
          secondaryColor: 0x0ea5e9,
          accentColor: 0x92400e,
        },
        // Table cocktail terrasse
        {
          id: 'gb_terrace_table',
          kind: 'coffee_table',
          x: -1.65,
          z: 2.75,
          hx: 0.65,
          hz: 0.65,
          h: 0.52,
          primaryColor: 0x78350f,
          secondaryColor: 0x38bdf8,
          accentColor: 0xf59e0b,
        },
        // Palmier en bac terrasse
        {
          id: 'gb_terrace_plant',
          kind: 'plant',
          x: 1.1,
          z: 3.75,
          hx: 0.45,
          hz: 0.45,
          h: 1.35,
          primaryColor: 0xe2e8f0,
          secondaryColor: 0x15803d,
        },
        // Trémie & escalier descendant au RDC
        {
          id: 'gb_stairs_down',
          kind: 'stairs_down',
          x: 4.35,
          z: 2.35,
          hx: 0.8,
          hz: 1.45,
          h: 1.25,
          facing: 'N',
          primaryColor: 0x92400e,
          secondaryColor: 0xe2e8f0,
          accentColor: 0xf59e0b,
        },
        // Climatisation split suite parentale
        {
          id: 'gb_upg_clim_r1',
          kind: 'ac_split',
          x: -3.2,
          z: -4.28,
          hx: 0.8,
          hz: 0.16,
          h: 0.34,
          y: 2.45,
          primaryColor: 0xf8fafc,
          accentColor: 0x38bdf8,
          walkable: true,
          walkableReason: 'climatiseur mural suspendu ≥ 1,5 m',
          upgradeKey: 'splitClim',
        },
      ],
    },
  ],
};

/** Registre des maisons conçues par id de destin (`null` réservé à un futur destin sans logement). */
export const HOUSE_SPECS: Record<string, HouseSpec | null> = {
  poignon: POIGNON_HOUSE,
  golden_boy: GOLDEN_BOY_HOUSE,
  ...HOUSE_GROUP_A,
  ...HOUSE_GROUP_B,
  ...HOUSE_GROUP_C,
};

/**
 * Retourne le plan de maison dédié au destin demandé (19/19 destins couverts),
 * avec repli de secours sur gabarit proche si un futur destin inconnu est fourni.
 */
export function resolveHouseSpec(destinyId: string, homeType: HomeType = 'studio'): HouseSpec {
  const exact = HOUSE_SPECS[destinyId];
  if (exact) return exact;
  if (homeType === 'duplex_mer' || homeType === 'villa_ambassade') return GOLDEN_BOY_HOUSE;
  return POIGNON_HOUSE;
}
