import type * as THREE from 'three';

export type CategoryFolder =
  | 'Trees'
  | 'Tropical_Plants'
  | 'Flowers'
  | 'Bushes'
  | 'Urban_Furniture'
  | 'Water_Features'
  | 'Garden_Decorations'
  | 'Hanging_Decorations'
  | 'Rocks_And_Ground_Decorations';

export interface CategoryMeta {
  folder: CategoryFolder;
  label: string;
  shortDesc: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    folder: 'Trees',
    label: 'Arbres',
    shortDesc: 'Cocotiers, manguiers, baobabs, flamboyants et essences urbaines',
  },
  {
    folder: 'Tropical_Plants',
    label: 'Plantes tropicales',
    shortDesc: 'Bananiers, papayers, aloès, fougères et pots ornementaux',
  },
  {
    folder: 'Flowers',
    label: 'Fleurs',
    shortDesc: 'Bougainvilliers, hibiscus, rosiers et massifs fleuris',
  },
  {
    folder: 'Bushes',
    label: 'Buissons et haies',
    shortDesc: 'Buissons taillés, haies séparatives, bosquets et herbes hautes',
  },
  {
    folder: 'Urban_Furniture',
    label: 'Mobilier urbain',
    shortDesc: 'Bancs, lampadaires, poubelles, bornes, pergolas et abribus',
  },
  {
    folder: 'Water_Features',
    label: 'Fontaines & bassins',
    shortDesc: 'Fontaines circulaires, modernes et bassins ornementaux',
  },
  {
    folder: 'Garden_Decorations',
    label: 'Décorations de jardin',
    shortDesc: 'Statues, jarres, pots en terre cuite, murets et clôtures',
  },
  {
    folder: 'Hanging_Decorations',
    label: 'Éléments suspendus',
    shortDesc: 'Guirlandes lumineuses, suspensions végétales, lanternes et chaînes',
  },
  {
    folder: 'Rocks_And_Ground_Decorations',
    label: 'Rochers & sols',
    shortDesc: 'Rochers décoratifs, galets, dalles et pavés modulaires',
  },
];

export type PivotAlignment = 'bottom-center' | 'top-center' | 'back-center';

export interface AssetVariant {
  id: string;
  label: string;
  swatch?: string;
  growthStage?: 'Jeune' | 'Adulte' | 'En fleurs' | 'Standard';
}

export interface AssetDefinition {
  id: string;
  name: string;
  folder: CategoryFolder;
  fileName: string;
  description: string;
  pivotType: PivotAlignment;
  variants: AssetVariant[];
  build: (variantId?: string) => THREE.Group;
}

export interface AssetMetrics {
  triangles: number;
  vertices: number;
  meshes: number;
  materials: number;
  width: number;
  height: number;
  depth: number;
}
