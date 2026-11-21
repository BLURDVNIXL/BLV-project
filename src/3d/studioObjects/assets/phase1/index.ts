import { BOISSONS_ASSETS } from './boissons';
import { FRUITS_LEGUMES_ASSETS } from './fruitsLegumes';
import { HYGIENE_DIVERS_ASSETS } from './hygieneDivers';
import { PAIN_ASSETS } from './pain';
import { SNACKS_ASSETS } from './snacks';
import type { BlvAssetDefinition } from '../../types';

export const PHASE1_ASSETS: BlvAssetDefinition[] = [
  ...BOISSONS_ASSETS,
  ...SNACKS_ASSETS,
  ...PAIN_ASSETS,
  ...FRUITS_LEGUMES_ASSETS,
  ...HYGIENE_DIVERS_ASSETS,
];

export const BLV_PHASE1_CATALOG: Record<string, BlvAssetDefinition> = Object.fromEntries(
  PHASE1_ASSETS.map((asset) => [asset.id, asset])
);
