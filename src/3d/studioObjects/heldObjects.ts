/**
 * BLV — Objets tenus en main : construit la géométrie d'un objet du catalogue (src/core/items.ts)
 * à partir du STUDIO-OBJECT. 1 objet = 1 Mesh = 1 matériau partagé (couleurs de sommets) = 1 draw call.
 * Seul l'objet en main existe en 3D ; la géométrie est mise en cache par objet.
 */

import * as THREE from 'three';
import { getItem, ItemCategory } from '../../core/items';
import { assemble } from './assemble';
import { BLV_PHASE1_CATALOG } from './assets/phase1';
import { BLV_PHASE2_CATALOG } from './assets/phase2';
import { PHASE3_RECIPES } from './assets/phase3';
import { MENU_RECIPES } from './menuRecipes';
import type { BlvHoldTransform } from './types';

export interface HeldObject {
  mesh: THREE.Mesh;
  hold: BlvHoldTransform;
}

/**
 * Calibration de départ par catégorie, à régler en jeu (le personnage est un chibi) : échelle de l'objet tenu.
 * Les plats gardent leur taille réelle (assiette ≈ 23 cm) : la réduction globale de 0,7 les rendait trop petits.
 * L'ajustement fin se fait par contenant (CONTAINER_SCALE).
 */
export const HOLD_SCALE: Record<ItemCategory, number> = {
  plat: 1,
  boisson: 1,
  snack: 1,
  pain: 1,
  fruit: 1,
  conserve: 1,
  laitier: 1,
  hygiene: 1,
  divers: 1,
};

/**
 * Multiplicateur d'échelle d'un plat selon son contenant, en plus de HOLD_SCALE.plat.
 * Les contenants étroits (pot de kédjénou, cornet, bol) paraissent petits à côté d'une assiette : on les agrandit un peu.
 * Valeurs de départ à régler en jeu, un contenant à la fois.
 */
export const CONTAINER_SCALE: Record<string, number> = {
  assiette: 1,
  planche: 1,
  barquette: 1.1,
  bol: 1.15,
  cornet_plat: 1.2,
  pot_kedjenou: 1.25,
};

let sharedMaterial: THREE.MeshStandardMaterial | null = null;
function material(): THREE.MeshStandardMaterial {
  sharedMaterial ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  return sharedMaterial;
}

interface Built {
  geometry: THREE.BufferGeometry;
  hold: BlvHoldTransform;
}
const cache = new Map<string, Built>();

function buildFor(itemId: string): Built | null {
  const item = getItem(itemId);
  if (!item) return null;
  const model = item.model;
  let built: Built | null = null;
  let containerK = 1;
  if (model.kind === 'shape') {
    const asset = BLV_PHASE1_CATALOG[model.shape];
    if (!asset) return null;
    const preset = asset.presets.find((p) => p.label === model.preset);
    const params = { ...asset.defaultParams, ...(preset?.params ?? {}) };
    built = { geometry: asset.build(params), hold: asset.hold };
  } else {
    const recipe = PHASE3_RECIPES.find((r) => r.id === model.dish) ?? MENU_RECIPES[model.dish];
    const contenant = recipe ? BLV_PHASE2_CATALOG[recipe.contenant] : undefined;
    if (!recipe || !contenant) return null;
    built = { geometry: assemble(recipe), hold: contenant.hold };
    containerK = CONTAINER_SCALE[recipe.contenant] ?? 1;
  }
  const k = (HOLD_SCALE[item.category] ?? 1) * containerK;
  return { geometry: built.geometry, hold: { ...built.hold, scale: built.hold.scale * k } };
}

/** Crée le mesh de l'objet `itemId`, ou null si l'objet est inconnu ou sans modèle. */
export function createHeldObject(itemId: string): HeldObject | null {
  let built = cache.get(itemId);
  if (!built) {
    const b = buildFor(itemId);
    if (!b) return null;
    cache.set(itemId, b);
    built = b;
  }
  const mesh = new THREE.Mesh(built.geometry, material());
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.name = `held_${itemId}`;
  return { mesh, hold: built.hold };
}
