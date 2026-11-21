/**
 * BLV — Copie du STUDIO-OBJECT (formes emballées, composants de plats, assemblage).
 * Ne pas modifier ici : régénérer depuis le studio. Le validateur et l’interface restent dans le studio.
 */
import type * as THREE from 'three';

export type BlvAssetCategory =
  | 'boissons'
  | 'snacks'
  | 'pain'
  | 'fruits_legumes'
  | 'hygiene_divers'
  | 'contenants'
  | 'bases'
  | 'proteines'
  | 'garnitures'
  | 'plats';

export const CATEGORY_LABELS: Record<BlvAssetCategory, string> = {
  boissons: 'Boissons',
  snacks: 'Snacks',
  pain: 'Pain & Viennoiserie',
  fruits_legumes: 'Fruits & Légumes',
  hygiene_divers: 'Hygiène & Divers',
  contenants: 'Contenants',
  bases: 'Bases',
  proteines: 'Protéines',
  garnitures: 'Garnitures',
  plats: 'Plats complets',
};

export interface BlvAssetParams {
  primary: string;
  secondary: string;
  accent: string;
  size: number;
  seed: number;
}

export interface BlvHoldTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface BlvDishAnchor {
  stackCenter: [number, number, number];
  stackRadius: number;
}

export interface BlvDishColorOverrides {
  contenant?: Partial<BlvAssetParams>;
  base?: Partial<BlvAssetParams>;
  proteine?: Partial<BlvAssetParams>;
  garnitures?: Array<Partial<BlvAssetParams>>;
}

export interface BlvDishRecipe {
  id: string;
  nom: string;
  contenant: string;
  base?: string | null;
  proteine?: string | null;
  garnitures: string[];
  couleurs?: BlvDishColorOverrides;
  size?: number;
  seed?: number;
}

export interface BlvAssetPreset {
  label: string;
  params: Partial<BlvAssetParams>;
}

export interface BlvAssetDefinition {
  id: string;
  name: string;
  phase?: 1 | 2 | 3;
  category: BlvAssetCategory;
  maxTriangles: number;
  defaultParams: BlvAssetParams;
  presets: BlvAssetPreset[];
  hold: BlvHoldTransform;
  getAnchors?: (params: BlvAssetParams) => BlvDishAnchor;
  build: (params: BlvAssetParams, anchor?: BlvDishAnchor) => THREE.BufferGeometry;
  recipe?: BlvDishRecipe;
}

export interface BlvValidationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface BlvValidationReport {
  assetId: string;
  passed: boolean;
  triangles: number;
  maxTriangles: number;
  vertices: number;
  maxVertices: number;
  meshCount: number;
  childCount: number;
  materialCount: number;
  drawCalls: number;
  hasTextures: boolean;
  hasUvs: boolean;
  hasTransparency: boolean;
  hasEmissive: boolean;
  groupCount: number;
  attributes: string[];
  deterministic: boolean;
  checks: BlvValidationCheck[];
}
