import { BASES_ASSETS } from './bases';
import { CONTENANTS_ASSETS } from './contenants';
import { GARNITURES_ASSETS } from './garnitures';
import { PROTEINES_ASSETS } from './proteines';
import type { BlvAssetDefinition } from '../../types';

export const PHASE2_ASSETS: BlvAssetDefinition[] = [
  ...CONTENANTS_ASSETS,
  ...BASES_ASSETS,
  ...PROTEINES_ASSETS,
  ...GARNITURES_ASSETS,
];

export const BLV_PHASE2_CATALOG: Record<string, BlvAssetDefinition> = Object.fromEntries(
  PHASE2_ASSETS.map((asset) => [asset.id, asset])
);
