/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Types purs (sans Three.js ni DOM) pour la bibliothèque de décorations 3D stylisées
 * (9 catégories : arbres, plantes tropicales, fleurs, buissons, mobilier urbain,
 * fontaines/bassins, décorations de jardin, éléments suspendus, rochers & sols).
 */

export type TreeSpecies =
  | 'coconut'
  | 'ornamental_palm'
  | 'mango'
  | 'baobab'
  | 'flamboyant'
  | 'acacia'
  | 'fromager'
  | 'broadleaf_tropical'
  | 'urban_ornamental'
  | 'ficus';

export type TropicalPlantVariant =
  | 'banana'
  | 'papaya'
  | 'aloe'
  | 'broadleaf'
  | 'fern'
  | 'potted_ornamental'
  | 'small_shrub'
  | 'creeper';

export type FlowerVariant =
  | 'rose'
  | 'bougainvillea'
  | 'hibiscus'
  | 'tropical_flower'
  | 'flower_bed'
  | 'small_flowers';

export type BushVariant =
  | 'round_bush'
  | 'wild_bush'
  | 'trimmed_hedge'
  | 'planter_hedge'
  | 'plant_bed'
  | 'tall_grass'
  | 'grove';

export type UrbanFurnitureVariant =
  | 'bench_wood'
  | 'bench_metal'
  | 'bench_concrete'
  | 'bench_backrest'
  | 'picnic_table'
  | 'flower_pot'
  | 'rect_planter'
  | 'bollard'
  | 'reverbere'
  | 'barrier'
  | 'pergola';

export type WaterFeatureVariant =
  | 'tiered_fountain'
  | 'circle_fountain'
  | 'modern_fountain'
  | 'ornamental_basin';

export type GardenDecorVariant =
  | 'statue'
  | 'abstract_sculpture'
  | 'canari_jar'
  | 'terracotta_pots'
  | 'small_fence'
  | 'low_wall'
  | 'garden_border'
  | 'green_pergola';

export type HangingDecorVariant =
  | 'decor_chain'
  | 'barrier_chain'
  | 'fairy_garland'
  | 'bunting_garland'
  | 'hanging_plant'
  | 'lantern'
  | 'wall_relief';

export type GroundRockVariant =
  | 'rock'
  | 'pebbles'
  | 'slabs'
  | 'pavers';

export type DecorCategory =
  | 'tropical_plant'
  | 'flower'
  | 'bush'
  | 'furniture'
  | 'water_feature'
  | 'garden_decor'
  | 'hanging_decor'
  | 'ground_rock';

export type DecorProp =
  | {
      category: 'tropical_plant';
      variant: TropicalPlantVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color?: number;
    }
  | {
      category: 'flower';
      variant: FlowerVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color: number;
    }
  | {
      category: 'bush';
      variant: BushVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color: number;
    }
  | {
      category: 'furniture';
      variant: UrbanFurnitureVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color?: number;
    }
  | {
      category: 'water_feature';
      variant: WaterFeatureVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
    }
  | {
      category: 'garden_decor';
      variant: GardenDecorVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color?: number;
    }
  | {
      category: 'hanging_decor';
      variant: HangingDecorVariant;
      x: number;
      z: number;
      y0: number;
      span: number;
      angle: number;
      scale: number;
      seed: number;
      color?: number;
    }
  | {
      category: 'ground_rock';
      variant: GroundRockVariant;
      x: number;
      z: number;
      angle: number;
      scale: number;
      seed: number;
      color?: number;
    };
