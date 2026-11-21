import * as THREE from 'three';
import { BLV_PHASE2_CATALOG } from './assets/phase2';
import { mergeParts } from './geometryBuilder';
import type {
  BlvAssetDefinition,
  BlvAssetParams,
  BlvDishAnchor,
  BlvDishRecipe,
} from './types';

export const MAX_DISH_TRIANGLES = 800;

function resolveComponentParams(
  def: BlvAssetDefinition,
  override?: Partial<BlvAssetParams>,
  sizeScale = 1.0,
  seedDelta = 0
): BlvAssetParams {
  return {
    primary: override?.primary ?? def.defaultParams.primary,
    secondary: override?.secondary ?? def.defaultParams.secondary,
    accent: override?.accent ?? def.defaultParams.accent,
    size: (override?.size ?? def.defaultParams.size) * sizeScale,
    seed: (override?.seed ?? def.defaultParams.seed) + seedDelta,
  };
}

/**
 * Fusionne un plat complet (contenant + base optionnelle + protéine optionnelle + garnitures[])
 * en 1 seule BufferGeometry indexée (1 mesh, 1 matériau, 1 draw call).
 * Refuse tout plat dépassant 800 triangles.
 */
export function assemble(
  dish: BlvDishRecipe,
  globalOverride?: Partial<BlvAssetParams>
): THREE.BufferGeometry {
  const contenantDef = BLV_PHASE2_CATALOG[dish.contenant];
  if (!contenantDef || contenantDef.category !== 'contenants') {
    throw new Error(`Contenant inconnu pour le plat "${dish.id}": "${dish.contenant}".`);
  }

  const sizeScale = globalOverride?.size ?? dish.size ?? 1.0;
  const seedDelta =
    (globalOverride?.seed !== undefined ? globalOverride.seed : dish.seed ?? 0) -
    (dish.seed ?? 0);

  const parts: THREE.BufferGeometry[] = [];

  // 1. Contenant
  const contenantParams = resolveComponentParams(
    contenantDef,
    dish.couleurs?.contenant,
    sizeScale,
    seedDelta
  );
  parts.push(contenantDef.build(contenantParams));

  const contenantAnchor: BlvDishAnchor = contenantDef.getAnchors
    ? contenantDef.getAnchors(contenantParams)
    : {
        stackCenter: [0, 0.01 * sizeScale, 0],
        stackRadius: 0.055 * sizeScale,
      };

  let surfaceAnchor: BlvDishAnchor = {
    stackCenter: [...contenantAnchor.stackCenter],
    stackRadius: contenantAnchor.stackRadius,
  };

  // 2. Base optionnelle (empilée sur le contenant)
  let hasBase = false;
  if (dish.base) {
    const baseDef = BLV_PHASE2_CATALOG[dish.base];
    if (!baseDef || baseDef.category !== 'bases') {
      throw new Error(`Base inconnue pour le plat "${dish.id}": "${dish.base}".`);
    }
    hasBase = true;
    const baseParams = resolveComponentParams(
      baseDef,
      dish.couleurs?.base,
      sizeScale,
      seedDelta
    );
    parts.push(baseDef.build(baseParams, surfaceAnchor));

    const localBaseAnchor: BlvDishAnchor = baseDef.getAnchors
      ? baseDef.getAnchors(baseParams)
      : {
          stackCenter: [0, 0.028 * baseParams.size, 0],
          stackRadius: surfaceAnchor.stackRadius * 0.85,
        };

    surfaceAnchor = {
      stackCenter: [
        surfaceAnchor.stackCenter[0] + localBaseAnchor.stackCenter[0],
        surfaceAnchor.stackCenter[1] + localBaseAnchor.stackCenter[1],
        surfaceAnchor.stackCenter[2] + localBaseAnchor.stackCenter[2],
      ],
      stackRadius: Math.min(surfaceAnchor.stackRadius, localBaseAnchor.stackRadius),
    };
  }

  // 3. Protéine optionnelle (empilée sur la base ou directement dans le contenant)
  let hasProtein = false;
  let proteinTopAnchor: BlvDishAnchor | null = null;
  if (dish.proteine) {
    const protDef = BLV_PHASE2_CATALOG[dish.proteine];
    if (!protDef || protDef.category !== 'proteines') {
      throw new Error(`Protéine inconnue pour le plat "${dish.id}": "${dish.proteine}".`);
    }
    hasProtein = true;
    const protParams = resolveComponentParams(
      protDef,
      dish.couleurs?.proteine,
      sizeScale,
      seedDelta
    );
    parts.push(protDef.build(protParams, surfaceAnchor));

    if (protDef.getAnchors) {
      const localProtAnchor = protDef.getAnchors(protParams);
      proteinTopAnchor = {
        stackCenter: [
          surfaceAnchor.stackCenter[0] + localProtAnchor.stackCenter[0],
          surfaceAnchor.stackCenter[1] + localProtAnchor.stackCenter[1],
          surfaceAnchor.stackCenter[2] + localProtAnchor.stackCenter[2],
        ],
        stackRadius: Math.min(surfaceAnchor.stackRadius, localProtAnchor.stackRadius),
      };
    }
  }

  // 4. Garnitures[] (sauce centrée sur la surface, autres garnitures réparties proprement)
  const nonSauceIndices: number[] = [];
  dish.garnitures.forEach((gid, idx) => {
    if (gid !== 'sauce') nonSauceIndices.push(idx);
  });

  dish.garnitures.forEach((garnId, idx) => {
    const garnDef = BLV_PHASE2_CATALOG[garnId];
    if (!garnDef || garnDef.category !== 'garnitures') {
      throw new Error(`Garniture inconnue pour le plat "${dish.id}": "${garnId}".`);
    }
    const garnParams = resolveComponentParams(
      garnDef,
      dish.couleurs?.garnitures?.[idx],
      sizeScale,
      seedDelta + idx * 7
    );

    let garnAnchor: BlvDishAnchor;
    if (garnId === 'sauce') {
      // Sauce drapes directly onto the top of the base (or slight pour over protein)
      const baseTopY = surfaceAnchor.stackCenter[1] - (hasBase ? 0.003 * sizeScale : 0);
      const yPos =
        hasProtein && proteinTopAnchor
          ? surfaceAnchor.stackCenter[1] +
            (proteinTopAnchor.stackCenter[1] - surfaceAnchor.stackCenter[1]) * 0.42
          : baseTopY;
      garnAnchor = {
        stackCenter: [surfaceAnchor.stackCenter[0], yPos, surfaceAnchor.stackCenter[2]],
        stackRadius: surfaceAnchor.stackRadius * 0.92,
      };
    } else {
      const nonSauceRank = nonSauceIndices.indexOf(idx);
      const count = nonSauceIndices.length;
      if (!hasProtein && count === 1) {
        garnAnchor = {
          stackCenter: [
            surfaceAnchor.stackCenter[0],
            surfaceAnchor.stackCenter[1] - (hasBase ? 0.003 * sizeScale : 0),
            surfaceAnchor.stackCenter[2],
          ],
          stackRadius: surfaceAnchor.stackRadius * 0.85,
        };
      } else {
        // Fan around the front perimeter of the dish/base so garnishes remain visible alongside protein
        const spreadAngle =
          count <= 1
            ? 0.55
            : -0.95 + (nonSauceRank / Math.max(1, count - 1)) * 1.9;
        const radialDist =
          surfaceAnchor.stackRadius * (hasProtein ? 0.62 : 0.42);
        const gx = surfaceAnchor.stackCenter[0] + Math.sin(spreadAngle) * radialDist;
        const gz = surfaceAnchor.stackCenter[2] + Math.cos(spreadAngle) * radialDist;
        const gy =
          surfaceAnchor.stackCenter[1] -
          (hasBase ? 0.005 * sizeScale : -0.002 * sizeScale);
        garnAnchor = {
          stackCenter: [gx, gy, gz],
          stackRadius: Math.max(0.032 * sizeScale, surfaceAnchor.stackRadius * 0.65),
        };
      }
    }

    parts.push(garnDef.build(garnParams, garnAnchor));
  });

  const merged = mergeParts(parts);
  const triangles = merged.index
    ? Math.floor(merged.index.count / 3)
    : Math.floor((merged.getAttribute('position')?.count ?? 0) / 3);

  if (triangles > MAX_DISH_TRIANGLES) {
    merged.dispose();
    throw new Error(
      `Plat "${dish.id}" refusé : ${triangles} triangles dépasse le plafond de ${MAX_DISH_TRIANGLES} triangles.`
    );
  }

  return merged;
}

/**
 * Adapte une recette de plat Phase 3 en BlvAssetDefinition compatible avec
 * l'inspecteur 360°, la validation automatique et l'export TypeScript.
 */
export function dishToAssetDefinition(dish: BlvDishRecipe): BlvAssetDefinition {
  const contenantDef = BLV_PHASE2_CATALOG[dish.contenant];
  const baseDef = dish.base ? BLV_PHASE2_CATALOG[dish.base] : undefined;
  const protDef = dish.proteine ? BLV_PHASE2_CATALOG[dish.proteine] : undefined;
  const firstGarnDef = dish.garnitures[0]
    ? BLV_PHASE2_CATALOG[dish.garnitures[0]]
    : undefined;

  const defaultPrimary =
    dish.couleurs?.proteine?.primary ??
    protDef?.defaultParams.primary ??
    dish.couleurs?.base?.primary ??
    baseDef?.defaultParams.primary ??
    contenantDef.defaultParams.primary;

  const defaultSecondary =
    dish.couleurs?.contenant?.secondary ?? contenantDef.defaultParams.secondary;

  const defaultAccent =
    dish.couleurs?.garnitures?.[0]?.primary ??
    firstGarnDef?.defaultParams.primary ??
    contenantDef.defaultParams.accent;

  const defaultParams: BlvAssetParams = {
    primary: defaultPrimary,
    secondary: defaultSecondary,
    accent: defaultAccent,
    size: dish.size ?? 1.0,
    seed: dish.seed ?? 1001,
  };

  return {
    id: dish.id,
    name: dish.nom,
    phase: 3,
    category: 'plats',
    maxTriangles: MAX_DISH_TRIANGLES,
    defaultParams,
    presets: [
      {
        label: 'Recette standard',
        params: { ...defaultParams },
      },
      {
        label: 'Portion généreuse',
        params: { ...defaultParams, size: 1.12 },
      },
    ],
    hold: contenantDef.hold,
    recipe: dish,
    build: (p) => {
      const hasPrimaryEdit = p.primary.toLowerCase() !== defaultPrimary.toLowerCase();
      const hasSecondaryEdit = p.secondary.toLowerCase() !== defaultSecondary.toLowerCase();
      const hasAccentEdit = p.accent.toLowerCase() !== defaultAccent.toLowerCase();

      if (!hasPrimaryEdit && !hasSecondaryEdit && !hasAccentEdit) {
        return assemble(dish, { size: p.size, seed: p.seed });
      }

      const patchedDish: BlvDishRecipe = {
        ...dish,
        couleurs: {
          ...dish.couleurs,
          ...(hasSecondaryEdit
            ? {
                contenant: {
                  ...dish.couleurs?.contenant,
                  secondary: p.secondary,
                },
              }
            : {}),
          ...(hasPrimaryEdit && dish.proteine
            ? {
                proteine: {
                  ...dish.couleurs?.proteine,
                  primary: p.primary,
                },
              }
            : hasPrimaryEdit && dish.base
              ? {
                  base: {
                    ...dish.couleurs?.base,
                    primary: p.primary,
                  },
                }
              : hasPrimaryEdit
                ? {
                    contenant: {
                      ...dish.couleurs?.contenant,
                      primary: p.primary,
                    },
                  }
                : {}),
          ...(hasAccentEdit && dish.garnitures.length > 0
            ? {
                garnitures: dish.garnitures.map((_, idx) =>
                  idx === 0
                    ? { ...(dish.couleurs?.garnitures?.[0] ?? {}), primary: p.accent }
                    : (dish.couleurs?.garnitures?.[idx] ?? {})
                ),
              }
            : {}),
        },
      };

      return assemble(patchedDish, { size: p.size, seed: p.seed });
    },
  };
}
