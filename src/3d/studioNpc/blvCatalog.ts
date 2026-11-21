// BLV : copie du studio PNJ (BLV — Babi Life Vibes Asset Studio), utilisée par studioActorBuilder.ts. Ne pas modifier sans le studio.
export type BodyId =
  | 'BODY_MALE'
  | 'BODY_FEMALE'
  | 'BODY_CHILD'
  | 'BODY_TEEN'
  | 'BODY_ELDERLY'
  | 'BODY_CORPULENT';

export type DistrictId =
  | 'RESIDENTIAL'
  | 'MARKET'
  | 'COMMERCIAL'
  | 'FESTIVE'
  | 'MAQUIS';

export type ClothingCategory = 'male' | 'female' | 'universal';
export type GarmentSlot = 'top' | 'bottom' | 'full_outfit';
export type PatternId =
  | 'solid'
  | 'wax_band'
  | 'stripes'
  | 'geometric'
  | 'denim'
  | 'sport_stripe';

export interface BodySpec {
  id: BodyId;
  fileName: string;
  label: string;
  shortLabel: string;
  description: string;
  heightMeters: number;
  headRadius: number;
  headScaleY: number;
  headScaleX: number;
  neckLength: number;
  torsoHeight: number;
  torsoTopWidth: number;
  torsoWaistWidth: number;
  torsoHipWidth: number;
  torsoDepth: number;
  bellyBulge: number;
  shoulderWidth: number;
  armLength: number;
  armRadius: number;
  legLength: number;
  legRadius: number;
  hipSpread: number;
  footLength: number;
  footHeight: number;
  spineForwardTilt: number; // radians, positive leans forward (elderly)
  isAdultFemale: boolean;
  defaultSkinIndex: number;
  defaultHairId: string;
}

export interface GarmentItem {
  id: string;
  name: string;
  category: ClothingCategory;
  slot: GarmentSlot;
  subcategory: string;
  styleTag: string;
  adultFemaleOnly?: boolean;
  excludeFromStreetNpc?: boolean;
  compatibleBodies: BodyId[];
  districts: DistrictId[];
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  defaultPattern: PatternId;
  silhouette: string;
}

export interface ShoeItem {
  id: string;
  name: string;
  adultFemaleOnly?: boolean;
  compatibleBodies: BodyId[];
  districts: DistrictId[];
  defaultColor: string;
  soleColor: string;
  heelHeight: number;
  silhouette: string;
}

export interface HairItem {
  id: string;
  name: string;
  compatibleBodies: BodyId[];
  styleHint: 'masculine' | 'feminine' | 'unisex';
  silhouette: string;
}

export type AccessorySlot =
  | 'headwear'
  | 'eyewear'
  | 'bag'
  | 'wrist'
  | 'neck'
  | 'ear';

export interface AccessoryItem {
  id: string;
  name: string;
  slot: AccessorySlot;
  compatibleBodies: BodyId[];
  districts: DistrictId[];
  defaultColor: string;
  silhouette: string;
}

export interface SkinTone {
  id: string;
  name: string;
  hex: string;
  shadowHex: string;
}

export interface HairColor {
  id: string;
  name: string;
  hex: string;
}

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
}

export interface CharacterLoadout {
  bodyId: BodyId;
  skinToneId: string;
  hairId: string;
  hairColorId: string;
  topId: string | null;
  bottomId: string | null;
  fullOutfitId: string | null;
  shoeId: string;
  topColor: string;
  topSecondaryColor: string;
  topPattern: PatternId;
  bottomColor: string;
  bottomPattern: PatternId;
  shoeColor: string;
  headwearId: string | null;
  eyewearId: string | null;
  bagId: string | null;
  wristId: string | null;
  neckId: string | null;
  earId: string | null;
  district: DistrictId;
}

export const ALL_BODIES: BodyId[] = [
  'BODY_MALE',
  'BODY_FEMALE',
  'BODY_CHILD',
  'BODY_TEEN',
  'BODY_ELDERLY',
  'BODY_CORPULENT',
];

export const ADULT_BODIES: BodyId[] = [
  'BODY_MALE',
  'BODY_FEMALE',
  'BODY_ELDERLY',
  'BODY_CORPULENT',
];

export const BODY_SPECS: Record<BodyId, BodySpec> = {
  BODY_MALE: {
    id: 'BODY_MALE',
    fileName: 'body_male.glb',
    label: 'Homme Adulte',
    shortLabel: 'Homme',
    description: 'Morphologie adulte moyenne, épaules structurées, proportions chibi équilibrées.',
    heightMeters: 1.32,
    headRadius: 0.235,
    headScaleY: 1.04,
    headScaleX: 1.0,
    neckLength: 0.045,
    torsoHeight: 0.36,
    torsoTopWidth: 0.165,
    torsoWaistWidth: 0.135,
    torsoHipWidth: 0.142,
    torsoDepth: 0.105,
    bellyBulge: 0.0,
    shoulderWidth: 0.195,
    armLength: 0.30,
    armRadius: 0.044,
    legLength: 0.36,
    legRadius: 0.056,
    hipSpread: 0.075,
    footLength: 0.135,
    footHeight: 0.055,
    spineForwardTilt: 0.0,
    isAdultFemale: false,
    defaultSkinIndex: 2,
    defaultHairId: 'hair_fade',
  },
  BODY_FEMALE: {
    id: 'BODY_FEMALE',
    fileName: 'body_female.glb',
    label: 'Femme Adulte',
    shortLabel: 'Femme',
    description: 'Silhouette féminine marquée, taille affinée, hanches arrondies, compatible tenues de soirée.',
    heightMeters: 1.28,
    headRadius: 0.228,
    headScaleY: 1.03,
    headScaleX: 0.98,
    neckLength: 0.05,
    torsoHeight: 0.34,
    torsoTopWidth: 0.144,
    torsoWaistWidth: 0.118,
    torsoHipWidth: 0.146,
    torsoDepth: 0.098,
    bellyBulge: 0.0,
    shoulderWidth: 0.168,
    armLength: 0.285,
    armRadius: 0.038,
    legLength: 0.355,
    legRadius: 0.052,
    hipSpread: 0.072,
    footLength: 0.125,
    footHeight: 0.05,
    spineForwardTilt: 0.0,
    isAdultFemale: true,
    defaultSkinIndex: 3,
    defaultHairId: 'hair_braids',
  },
  BODY_CHILD: {
    id: 'BODY_CHILD',
    fileName: 'body_child.glb',
    label: 'Enfant',
    shortLabel: 'Enfant',
    description: 'Gabarit compact, tête chibi encore plus expressive et membres courts.',
    heightMeters: 0.98,
    headRadius: 0.215,
    headScaleY: 1.0,
    headScaleX: 1.03,
    neckLength: 0.03,
    torsoHeight: 0.245,
    torsoTopWidth: 0.125,
    torsoWaistWidth: 0.122,
    torsoHipWidth: 0.128,
    torsoDepth: 0.09,
    bellyBulge: 0.012,
    shoulderWidth: 0.145,
    armLength: 0.205,
    armRadius: 0.036,
    legLength: 0.22,
    legRadius: 0.044,
    hipSpread: 0.06,
    footLength: 0.11,
    footHeight: 0.045,
    spineForwardTilt: 0.0,
    isAdultFemale: false,
    defaultSkinIndex: 1,
    defaultHairId: 'hair_short',
  },
  BODY_TEEN: {
    id: 'BODY_TEEN',
    fileName: 'body_teen.glb',
    label: 'Adolescent',
    shortLabel: 'Ado',
    description: 'Silhouette juvénile plus élancée, épaules fines et membres agiles.',
    heightMeters: 1.18,
    headRadius: 0.218,
    headScaleY: 1.04,
    headScaleX: 0.97,
    neckLength: 0.045,
    torsoHeight: 0.315,
    torsoTopWidth: 0.138,
    torsoWaistWidth: 0.116,
    torsoHipWidth: 0.128,
    torsoDepth: 0.088,
    bellyBulge: 0.0,
    shoulderWidth: 0.165,
    armLength: 0.275,
    armRadius: 0.036,
    legLength: 0.325,
    legRadius: 0.046,
    hipSpread: 0.065,
    footLength: 0.125,
    footHeight: 0.048,
    spineForwardTilt: 0.0,
    isAdultFemale: false,
    defaultSkinIndex: 4,
    defaultHairId: 'hair_afro',
  },
  BODY_ELDERLY: {
    id: 'BODY_ELDERLY',
    fileName: 'body_elderly.glb',
    label: 'Personne Âgée',
    shortLabel: 'Aîné(e)',
    description: 'Posture légèrement voûtée au haut du buste, silhouette apaisée, compatible squelette commun.',
    heightMeters: 1.24,
    headRadius: 0.225,
    headScaleY: 1.02,
    headScaleX: 0.99,
    neckLength: 0.036,
    torsoHeight: 0.33,
    torsoTopWidth: 0.148,
    torsoWaistWidth: 0.142,
    torsoHipWidth: 0.145,
    torsoDepth: 0.105,
    bellyBulge: 0.018,
    shoulderWidth: 0.172,
    armLength: 0.285,
    armRadius: 0.04,
    legLength: 0.325,
    legRadius: 0.05,
    hipSpread: 0.072,
    footLength: 0.13,
    footHeight: 0.052,
    spineForwardTilt: 0.18,
    isAdultFemale: false,
    defaultSkinIndex: 5,
    defaultHairId: 'hair_short',
  },
  BODY_CORPULENT: {
    id: 'BODY_CORPULENT',
    fileName: 'body_corpulent.glb',
    label: 'Adulte Corpulent',
    shortLabel: 'Corpulent',
    description: 'Torse généreux et arrondi, hanches larges et membres pleins en proportions chibi.',
    heightMeters: 1.32,
    headRadius: 0.242,
    headScaleY: 1.0,
    headScaleX: 1.06,
    neckLength: 0.035,
    torsoHeight: 0.37,
    torsoTopWidth: 0.195,
    torsoWaistWidth: 0.225,
    torsoHipWidth: 0.215,
    torsoDepth: 0.155,
    bellyBulge: 0.065,
    shoulderWidth: 0.24,
    armLength: 0.295,
    armRadius: 0.058,
    legLength: 0.34,
    legRadius: 0.07,
    hipSpread: 0.095,
    footLength: 0.14,
    footHeight: 0.058,
    spineForwardTilt: 0.0,
    isAdultFemale: false,
    defaultSkinIndex: 2,
    defaultHairId: 'hair_short',
  },
};

export const SKIN_TONES: SkinTone[] = [
  { id: 'skin_honey', name: 'Miel Doré', hex: '#C68642', shadowHex: '#9E6329' },
  { id: 'skin_caramel', name: 'Caramel Chaud', hex: '#A5693D', shadowHex: '#7D4B28' },
  { id: 'skin_chestnut', name: 'Châtaigne', hex: '#8D5524', shadowHex: '#683D18' },
  { id: 'skin_cocoa', name: 'Cacao Ivoirien', hex: '#6F3E1E', shadowHex: '#4E2912' },
  { id: 'skin_espresso', name: 'Expresso Profond', hex: '#542E18', shadowHex: '#3A1E0E' },
  { id: 'skin_ebony', name: 'Ébène Doux', hex: '#3D2114', shadowHex: '#27130A' },
  { id: 'skin_ochre', name: 'Ocre Ambré', hex: '#B47B4C', shadowHex: '#8A5932' },
  { id: 'skin_sienna', name: 'Terre de Sienne', hex: '#7A4627', shadowHex: '#572F18' },
];

export const HAIR_COLORS: HairColor[] = [
  { id: 'hc_black', name: 'Noir Profond', hex: '#18181C' },
  { id: 'hc_espresso', name: 'Brun Expresso', hex: '#2D1D16' },
  { id: 'hc_auburn', name: 'Acajou Discret', hex: '#5A2B1D' },
  { id: 'hc_honey', name: 'Mèches Miel', hex: '#8B5E2E' },
  { id: 'hc_burgundy', name: 'Bordeaux Urbain', hex: '#5C1E2C' },
  { id: 'hc_silver', name: 'Gris Argenté', hex: '#A3A8B0' },
];

export const FABRIC_SWATCHES: ColorSwatch[] = [
  { id: 'col_white', name: 'Blanc Coton', hex: '#F3F4F6' },
  { id: 'col_charcoal', name: 'Anthracite', hex: '#272932' },
  { id: 'col_lagoon', name: 'Lagune Ébrié', hex: '#0D9488' },
  { id: 'col_cobalt', name: 'Bleu Plateau', hex: '#1D4ED8' },
  { id: 'col_denim', name: 'Denim Brut', hex: '#2C4268' },
  { id: 'col_ochre', name: 'Ocre Soleil', hex: '#D97706' },
  { id: 'col_coral', name: 'Corail Marcory', hex: '#E11D48' },
  { id: 'col_olive', name: 'Vert Kaki', hex: '#4D6B4A' },
  { id: 'col_sand', name: 'Sable Bassam', hex: '#D6C5A9' },
  { id: 'col_plum', name: 'Prune Soirée', hex: '#6D28D9' },
  { id: 'col_terracotta', name: 'Brique Cocody', hex: '#C2410C' },
  { id: 'col_mint', name: 'Menthe Douce', hex: '#34D399' },
];

export const PATTERN_OPTIONS: { id: PatternId; name: string }[] = [
  { id: 'solid', name: 'Uni Mat' },
  { id: 'wax_band', name: 'Bordure Wax' },
  { id: 'stripes', name: 'Rayures Fines' },
  { id: 'geometric', name: 'Motif Géométrique' },
  { id: 'denim', name: 'Trame Denim' },
  { id: 'sport_stripe', name: 'Bande Sport' },
];

export const DISTRICTS: {
  id: DistrictId;
  name: string;
  examples: string;
  description: string;
}[] = [
  {
    id: 'RESIDENTIAL',
    name: 'Quartiers Résidentiels',
    examples: 'Cocody, Riviera, Yopougon',
    description: 'Vêtements quotidiens, tenues décontractées, promenades de quartier.',
  },
  {
    id: 'MARKET',
    name: 'Marchés & Commerces',
    examples: 'Adjamé, Treichville, Abobo',
    description: 'Tenues pratiques et respirantes, sandales, paniers et sacs de courses.',
  },
  {
    id: 'COMMERCIAL',
    name: 'Zones Commerciales',
    examples: 'Plateau, Marcory Bureaux',
    description: 'Chemises, polos, pantalons classiques et tenues professionnelles modernes.',
  },
  {
    id: 'FESTIVE',
    name: 'Zones Festives',
    examples: 'Zone 4, Rue Princesse',
    description: 'Tenues de sortie nocturne, robes courtes ajustées, ensembles élégants.',
  },
  {
    id: 'MAQUIS',
    name: 'Maquis & Détente',
    examples: 'Yopougon, Marcory, Koumassi',
    description: 'T-shirts oversize, chemises ouvertes, tenues conviviales de soirée.',
  },
];

const MALE_COMPATIBLE: BodyId[] = [
  'BODY_MALE',
  'BODY_CHILD',
  'BODY_TEEN',
  'BODY_ELDERLY',
  'BODY_CORPULENT',
];

const FEMALE_AND_NEUTRAL: BodyId[] = [
  'BODY_FEMALE',
  'BODY_CHILD',
  'BODY_TEEN',
  'BODY_ELDERLY',
  'BODY_CORPULENT',
];

export const GARMENTS: GarmentItem[] = [
  // ========================
  // A. VÊTEMENTS MASCULINS — HAUTS (10)
  // ========================
  {
    id: 'm_top_tshirt',
    name: 'T-shirt Classique',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Quotidien',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultPrimaryColor: '#F3F4F6',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'solid',
    silhouette: 'tshirt',
  },
  {
    id: 'm_top_oversize',
    name: 'T-shirt Oversize',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Urbain',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['MAQUIS', 'FESTIVE', 'RESIDENTIAL'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'geometric',
    silhouette: 'oversize',
  },
  {
    id: 'm_top_polo',
    name: 'Polo Abidjan',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Soigné',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'RESIDENTIAL', 'MAQUIS'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'polo',
  },
  {
    id: 'm_top_shirt_short',
    name: 'Chemise Manches Courtes',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Bureau / Ville',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'MAQUIS', 'MARKET'],
    defaultPrimaryColor: '#D6C5A9',
    defaultSecondaryColor: '#C2410C',
    defaultPattern: 'wax_band',
    silhouette: 'shirt_short',
  },
  {
    id: 'm_top_shirt_long',
    name: 'Chemise Manches Longues',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Professionnel',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#F3F4F6',
    defaultSecondaryColor: '#1D4ED8',
    defaultPattern: 'stripes',
    silhouette: 'shirt_long',
  },
  {
    id: 'm_top_shirt_open',
    name: 'Chemise Ouverte sur T-shirt',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Sortie / Maquis',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['MAQUIS', 'FESTIVE', 'RESIDENTIAL'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'wax_band',
    silhouette: 'shirt_open',
  },
  {
    id: 'm_top_tank',
    name: 'Débardeur',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Détente / Sport',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'MARKET'],
    defaultPrimaryColor: '#D97706',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'sport_stripe',
    silhouette: 'tank',
  },
  {
    id: 'm_top_sweat',
    name: 'Sweat Urbain',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Soirée fraîche',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#4D6B4A',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'solid',
    silhouette: 'sweat',
  },
  {
    id: 'm_top_jacket_light',
    name: 'Veste Légère',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Moderne',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'solid',
    silhouette: 'jacket',
  },
  {
    id: 'm_top_bomber',
    name: 'Blouson Nocturne',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Festif',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#C2410C',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'solid',
    silhouette: 'bomber',
  },
  {
    id: 'm_top_jacket_denim',
    name: 'Veste en Jean',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Urbain',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['MAQUIS', 'RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#2C4268',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'denim',
    silhouette: 'jacket_denim',
  },
  {
    id: 'm_top_blazer',
    name: 'Veste Blazer',
    category: 'male',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Plateau / Soigné',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#1E293B',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'blazer',
  },

  // ========================
  // A. VÊTEMENTS MASCULINS — BAS (7)
  // ========================
  {
    id: 'm_bot_jeans_classic',
    name: 'Jean Classique',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Polyvalent',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'MARKET', 'COMMERCIAL', 'MAQUIS'],
    defaultPrimaryColor: '#2C4268',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'denim',
    silhouette: 'pants_classic',
  },
  {
    id: 'm_bot_jeans_slim',
    name: 'Jean Ajusté',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Sortie',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['FESTIVE', 'MAQUIS', 'COMMERCIAL'],
    defaultPrimaryColor: '#1E293B',
    defaultSecondaryColor: '#3B82F6',
    defaultPattern: 'denim',
    silhouette: 'pants_slim',
  },
  {
    id: 'm_bot_pants_classic',
    name: 'Pantalon Classique',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Professionnel',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#64748B',
    defaultPattern: 'solid',
    silhouette: 'pants_classic',
  },
  {
    id: 'm_bot_cargo',
    name: 'Pantalon Cargo',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Pratique / Urbain',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['MARKET', 'MAQUIS', 'RESIDENTIAL'],
    defaultPrimaryColor: '#4D6B4A',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'solid',
    silhouette: 'cargo',
  },
  {
    id: 'm_bot_shorts',
    name: 'Short Décontracté',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Chaleur / Quartier',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultPrimaryColor: '#D6C5A9',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'solid',
    silhouette: 'shorts',
  },
  {
    id: 'm_bot_shorts_denim',
    name: 'Short en Jean',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Urbain',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['MAQUIS', 'RESIDENTIAL'],
    defaultPrimaryColor: '#335383',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'denim',
    silhouette: 'shorts',
  },
  {
    id: 'm_bot_sport',
    name: 'Pantalon de Sport',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Sport',
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'MARKET'],
    defaultPrimaryColor: '#1E293B',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'sport_stripe',
    silhouette: 'pants_sport',
  },
  {
    id: 'm_bot_swim_trunks',
    name: 'Short de Bain',
    category: 'male',
    slot: 'bottom',
    subcategory: 'Maillots de Bain',
    styleTag: 'Plage / Piscine',
    excludeFromStreetNpc: true,
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'geometric',
    silhouette: 'swim_trunks',
  },
  {
    id: 'm_swim_trunks_full',
    name: 'Maillot de Bain Plage',
    category: 'male',
    slot: 'full_outfit',
    subcategory: 'Maillots de Bain',
    styleTag: 'Assinie / Bassam',
    excludeFromStreetNpc: true,
    compatibleBodies: MALE_COMPATIBLE,
    districts: ['RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'sport_stripe',
    silhouette: 'swim_male_full',
  },

  // ========================
  // B. VÊTEMENTS FÉMININS — HAUTS (9)
  // ========================
  {
    id: 'f_top_tshirt',
    name: 'T-shirt Classique',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Quotidien',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MARKET'],
    defaultPrimaryColor: '#F3F4F6',
    defaultSecondaryColor: '#E11D48',
    defaultPattern: 'solid',
    silhouette: 'tshirt_fitted',
  },
  {
    id: 'f_top_oversize',
    name: 'T-shirt Oversize',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Tendance',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['MAQUIS', 'RESIDENTIAL'],
    defaultPrimaryColor: '#D97706',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'geometric',
    silhouette: 'oversize',
  },
  {
    id: 'f_top_crop',
    name: 'Crop Top',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Moderne / Sortie',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN'],
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#E11D48',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'crop_top',
  },
  {
    id: 'f_top_tank',
    name: 'Débardeur Féminin',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Soleil / Marché',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultPrimaryColor: '#34D399',
    defaultSecondaryColor: '#1E293B',
    defaultPattern: 'solid',
    silhouette: 'tank_fitted',
  },
  {
    id: 'f_top_blouse',
    name: 'Chemisier Fluide',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Professionnel',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['COMMERCIAL', 'RESIDENTIAL'],
    defaultPrimaryColor: '#F3F4F6',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'wax_band',
    silhouette: 'blouse',
  },
  {
    id: 'f_top_fitted',
    name: 'Top Ajusté',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Soirée / Ville',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN'],
    districts: ['FESTIVE', 'MAQUIS', 'COMMERCIAL'],
    defaultPrimaryColor: '#6D28D9',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'solid',
    silhouette: 'top_fitted',
  },
  {
    id: 'f_top_short',
    name: 'Haut Manches Courtes',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Ville',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['MARKET', 'RESIDENTIAL', 'COMMERCIAL'],
    defaultPrimaryColor: '#C2410C',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'wax_band',
    silhouette: 'shirt_short',
  },
  {
    id: 'f_top_long',
    name: 'Haut Manches Longues',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Élégant',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'stripes',
    silhouette: 'shirt_long',
  },
  {
    id: 'f_top_jacket_light',
    name: 'Veste Légère',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Bureau / Soirée',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'solid',
    silhouette: 'jacket',
  },
  {
    id: 'f_top_jacket_denim',
    name: 'Veste en Jean',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Urbain',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['MAQUIS', 'RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#3B5C8E',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'denim',
    silhouette: 'jacket_denim',
  },
  {
    id: 'f_top_blazer',
    name: 'Veste Blazer Chic',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Bureau / Soirée',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#C2410C',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'blazer',
  },
  {
    id: 'f_top_bomber',
    name: 'Blouson Urbain',
    category: 'female',
    slot: 'top',
    subcategory: 'Hauts',
    styleTag: 'Soirée / Street',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'solid',
    silhouette: 'bomber',
  },

  // ========================
  // B. VÊTEMENTS FÉMININS — BAS (7)
  // ========================
  {
    id: 'f_bot_jeans',
    name: 'Jean Féminin',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Quotidien',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultPrimaryColor: '#2C4268',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'denim',
    silhouette: 'pants_classic',
  },
  {
    id: 'f_bot_pants_slim',
    name: 'Pantalon Ajusté',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Sortie / Bureau',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN'],
    districts: ['COMMERCIAL', 'FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#1E293B',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'solid',
    silhouette: 'pants_slim',
  },
  {
    id: 'f_bot_pants_wide',
    name: 'Pantalon Large',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Chic / Aéré',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['COMMERCIAL', 'RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#D6C5A9',
    defaultSecondaryColor: '#C2410C',
    defaultPattern: 'wax_band',
    silhouette: 'pants_wide',
  },
  {
    id: 'f_bot_shorts',
    name: 'Short Féminin',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Détente',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MAQUIS'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'shorts',
  },
  {
    id: 'f_bot_shorts_denim',
    name: 'Short en Jean',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Urbain',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN', 'BODY_CHILD'],
    districts: ['MAQUIS', 'FESTIVE', 'RESIDENTIAL'],
    defaultPrimaryColor: '#3B5C8E',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'denim',
    silhouette: 'shorts',
  },
  {
    id: 'f_bot_skirt_short',
    name: 'Jupe Courte',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Moderne',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN', 'BODY_CHILD'],
    districts: ['FESTIVE', 'MAQUIS', 'RESIDENTIAL'],
    defaultPrimaryColor: '#E11D48',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'solid',
    silhouette: 'skirt_short',
  },
  {
    id: 'f_bot_skirt_long',
    name: 'Jupe Longue',
    category: 'female',
    slot: 'bottom',
    subcategory: 'Bas',
    styleTag: 'Élégant / Marché',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['MARKET', 'RESIDENTIAL', 'COMMERCIAL'],
    defaultPrimaryColor: '#D97706',
    defaultSecondaryColor: '#1E293B',
    defaultPattern: 'wax_band',
    silhouette: 'skirt_long',
  },

  // ========================
  // B. ROBES ET ENSEMBLES (6)
  // ========================
  {
    id: 'f_dress_daily',
    name: 'Robe Quotidienne',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Quartier',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MARKET'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'wax_band',
    silhouette: 'dress_daily',
  },
  {
    id: 'f_dress_casual',
    name: 'Robe Décontractée',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Détente',
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'MAQUIS'],
    defaultPrimaryColor: '#34D399',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'stripes',
    silhouette: 'dress_casual',
  },
  {
    id: 'f_dress_elegant',
    name: 'Robe Élégante',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Cérémonie / Ville',
    compatibleBodies: ['BODY_FEMALE', 'BODY_ELDERLY', 'BODY_CORPULENT'],
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'wax_band',
    silhouette: 'dress_elegant',
  },
  {
    id: 'f_dress_evening_short',
    name: 'Robe Courte de Soirée',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Soirée Zone 4',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#E11D48',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'solid',
    silhouette: 'dress_mini',
  },
  {
    id: 'f_set_coord',
    name: 'Ensemble Coordonné',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Moderne',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN'],
    districts: ['COMMERCIAL', 'MAQUIS', 'FESTIVE'],
    defaultPrimaryColor: '#C2410C',
    defaultSecondaryColor: '#D6C5A9',
    defaultPattern: 'geometric',
    silhouette: 'set_coord',
  },
  {
    id: 'f_set_skirt_top',
    name: 'Ensemble Jupe et Haut',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Robes & Ensembles',
    styleTag: 'Abidjan Chic',
    compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN', 'BODY_ELDERLY'],
    districts: ['RESIDENTIAL', 'COMMERCIAL', 'FESTIVE'],
    defaultPrimaryColor: '#D97706',
    defaultSecondaryColor: '#1E293B',
    defaultPattern: 'wax_band',
    silhouette: 'set_skirt_top',
  },

  // ========================
  // B. TENUES DE SOIRÉE (4 — exclusivement BODY_FEMALE)
  // ========================
  {
    id: 'f_night_fitted_dress',
    name: 'Robe Courte & Ajustée',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Tenues de Soirée',
    styleTag: 'Nocturne · Adulte F',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'solid',
    silhouette: 'dress_bodycon',
  },
  {
    id: 'f_night_crop_skirt',
    name: 'Crop Top & Jupe de Sortie',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Tenues de Soirée',
    styleTag: 'Nocturne · Adulte F',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#6D28D9',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'night_crop_skirt',
  },
  {
    id: 'f_night_outing_set',
    name: 'Ensemble de Sortie',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Tenues de Soirée',
    styleTag: 'Nocturne · Adulte F',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'geometric',
    silhouette: 'night_set',
  },
  {
    id: 'f_night_light_modern',
    name: 'Tenue Légère Moderne',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Tenues de Soirée',
    styleTag: 'Nocturne · Adulte F',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'MAQUIS'],
    defaultPrimaryColor: '#E11D48',
    defaultSecondaryColor: '#272932',
    defaultPattern: 'solid',
    silhouette: 'night_light',
  },

  // ========================
  // B. MAILLOTS DE BAIN & BIKINIS FÉMININS (4)
  // ========================
  {
    id: 'f_swim_onepiece',
    name: 'Maillot de Bain 1 Pièce',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Maillots de Bain',
    styleTag: 'Plage / Piscine',
    excludeFromStreetNpc: true,
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL', 'FESTIVE'],
    defaultPrimaryColor: '#0D9488',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'swim_onepiece',
  },
  {
    id: 'f_swim_onepiece_sport',
    name: 'Maillot de Bain Sport',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Maillots de Bain',
    styleTag: 'Piscine / Sport',
    excludeFromStreetNpc: true,
    compatibleBodies: FEMALE_AND_NEUTRAL,
    districts: ['RESIDENTIAL'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#34D399',
    defaultPattern: 'sport_stripe',
    silhouette: 'swim_onepiece',
  },
  {
    id: 'f_bikini_classic',
    name: 'Bikini Classique',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Bikinis',
    styleTag: 'Plage · Adulte F',
    adultFemaleOnly: true,
    excludeFromStreetNpc: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'RESIDENTIAL'],
    defaultPrimaryColor: '#E11D48',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'bikini_classic',
  },
  {
    id: 'f_bikini_wax',
    name: 'Bikini Wax Assinie',
    category: 'female',
    slot: 'full_outfit',
    subcategory: 'Bikinis',
    styleTag: 'Assinie · Adulte F',
    adultFemaleOnly: true,
    excludeFromStreetNpc: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'RESIDENTIAL'],
    defaultPrimaryColor: '#D97706',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'wax_band',
    silhouette: 'bikini_bandeau',
  },

  // ========================
  // C. TENUES COMMUNES / UNIVERSELLES (5)
  // ========================
  {
    id: 'u_outfit_sport',
    name: 'Tenue de Sport',
    category: 'universal',
    slot: 'full_outfit',
    subcategory: 'Tenues Communes',
    styleTag: 'Sport',
    compatibleBodies: ALL_BODIES,
    districts: ['RESIDENTIAL'],
    defaultPrimaryColor: '#1D4ED8',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'sport_stripe',
    silhouette: 'u_sport',
  },
  {
    id: 'u_outfit_work',
    name: 'Tenue de Travail',
    category: 'universal',
    slot: 'full_outfit',
    subcategory: 'Tenues Communes',
    styleTag: 'Atelier / Terrain',
    compatibleBodies: ADULT_BODIES,
    districts: ['MARKET', 'COMMERCIAL'],
    defaultPrimaryColor: '#4D6B4A',
    defaultSecondaryColor: '#D97706',
    defaultPattern: 'solid',
    silhouette: 'u_work',
  },
  {
    id: 'u_outfit_casual',
    name: 'Tenue Décontractée',
    category: 'universal',
    slot: 'full_outfit',
    subcategory: 'Tenues Communes',
    styleTag: 'Maison / Promenade',
    compatibleBodies: ALL_BODIES,
    districts: ['RESIDENTIAL', 'MAQUIS'],
    defaultPrimaryColor: '#D6C5A9',
    defaultSecondaryColor: '#0D9488',
    defaultPattern: 'stripes',
    silhouette: 'u_casual',
  },
  {
    id: 'u_outfit_pro',
    name: 'Tenue Professionnelle',
    category: 'universal',
    slot: 'full_outfit',
    subcategory: 'Tenues Communes',
    styleTag: 'Plateau / Bureau',
    compatibleBodies: ADULT_BODIES,
    districts: ['COMMERCIAL'],
    defaultPrimaryColor: '#272932',
    defaultSecondaryColor: '#F3F4F6',
    defaultPattern: 'solid',
    silhouette: 'u_pro',
  },
  {
    id: 'u_outfit_daily',
    name: 'Tenue Quotidienne',
    category: 'universal',
    slot: 'full_outfit',
    subcategory: 'Tenues Communes',
    styleTag: 'Tous quartiers',
    compatibleBodies: ALL_BODIES,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultPrimaryColor: '#C2410C',
    defaultSecondaryColor: '#2C4268',
    defaultPattern: 'wax_band',
    silhouette: 'u_daily',
  },
];

export const SHOES: ShoeItem[] = [
  {
    id: 'shoe_baskets',
    name: 'Baskets Classiques',
    compatibleBodies: ALL_BODIES,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultColor: '#F3F4F6',
    soleColor: '#D1D5DB',
    heelHeight: 0.0,
    silhouette: 'baskets',
  },
  {
    id: 'shoe_sneakers',
    name: 'Sneakers Modernes',
    compatibleBodies: ALL_BODIES,
    districts: ['FESTIVE', 'MAQUIS', 'RESIDENTIAL', 'COMMERCIAL'],
    defaultColor: '#272932',
    soleColor: '#0D9488',
    heelHeight: 0.0,
    silhouette: 'sneakers',
  },
  {
    id: 'shoe_sandals',
    name: 'Sandales',
    compatibleBodies: ALL_BODIES,
    districts: ['MARKET', 'RESIDENTIAL', 'MAQUIS'],
    defaultColor: '#8D5524',
    soleColor: '#3D2114',
    heelHeight: 0.0,
    silhouette: 'sandals',
  },
  {
    id: 'shoe_slides',
    name: 'Claquettes',
    compatibleBodies: ALL_BODIES,
    districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'],
    defaultColor: '#0D9488',
    soleColor: '#1E293B',
    heelHeight: 0.0,
    silhouette: 'slides',
  },
  {
    id: 'shoe_dress',
    name: 'Chaussures Habillées',
    compatibleBodies: ADULT_BODIES,
    districts: ['COMMERCIAL', 'FESTIVE'],
    defaultColor: '#1E1B18',
    soleColor: '#111111',
    heelHeight: 0.008,
    silhouette: 'dress',
  },
  {
    id: 'shoe_heels',
    name: 'Talons',
    adultFemaleOnly: true,
    compatibleBodies: ['BODY_FEMALE'],
    districts: ['FESTIVE', 'COMMERCIAL'],
    defaultColor: '#E11D48',
    soleColor: '#18181B',
    heelHeight: 0.032,
    silhouette: 'heels',
  },
  {
    id: 'shoe_work',
    name: 'Chaussures de Travail',
    compatibleBodies: ADULT_BODIES,
    districts: ['MARKET', 'COMMERCIAL'],
    defaultColor: '#784421',
    soleColor: '#1F2937',
    heelHeight: 0.0,
    silhouette: 'work',
  },
];

export const HAIRSTYLES: HairItem[] = [
  { id: 'hair_short', name: 'Cheveux Courts', compatibleBodies: ALL_BODIES, styleHint: 'unisex', silhouette: 'short' },
  { id: 'hair_fade', name: 'Dégradé Masculin', compatibleBodies: ALL_BODIES, styleHint: 'masculine', silhouette: 'fade' },
  { id: 'hair_afro', name: 'Coupe Afro', compatibleBodies: ALL_BODIES, styleHint: 'unisex', silhouette: 'afro' },
  { id: 'hair_curly', name: 'Cheveux Bouclés', compatibleBodies: ALL_BODIES, styleHint: 'unisex', silhouette: 'curly' },
  { id: 'hair_long', name: 'Cheveux Longs', compatibleBodies: ALL_BODIES, styleHint: 'feminine', silhouette: 'long' },
  { id: 'hair_braids', name: 'Tresses', compatibleBodies: ALL_BODIES, styleHint: 'feminine', silhouette: 'braids' },
  { id: 'hair_cornrows', name: 'Nattes', compatibleBodies: ALL_BODIES, styleHint: 'unisex', silhouette: 'cornrows' },
  { id: 'hair_bun', name: 'Chignon', compatibleBodies: ALL_BODIES, styleHint: 'feminine', silhouette: 'bun' },
  { id: 'hair_tied', name: 'Coiffure Attachée', compatibleBodies: ALL_BODIES, styleHint: 'unisex', silhouette: 'tied' },
];

export const ACCESSORIES: AccessoryItem[] = [
  { id: 'acc_cap', name: 'Casquette', slot: 'headwear', compatibleBodies: ALL_BODIES, districts: ['RESIDENTIAL', 'MARKET', 'MAQUIS'], defaultColor: '#1D4ED8', silhouette: 'cap' },
  { id: 'acc_beanie', name: 'Bonnet', slot: 'headwear', compatibleBodies: ALL_BODIES, districts: ['RESIDENTIAL', 'MAQUIS'], defaultColor: '#272932', silhouette: 'beanie' },
  { id: 'acc_hat', name: 'Chapeau', slot: 'headwear', compatibleBodies: ADULT_BODIES, districts: ['MARKET', 'RESIDENTIAL', 'FESTIVE'], defaultColor: '#D6C5A9', silhouette: 'hat' },
  { id: 'acc_glasses', name: 'Lunettes', slot: 'eyewear', compatibleBodies: ALL_BODIES, districts: ['COMMERCIAL', 'RESIDENTIAL'], defaultColor: '#272932', silhouette: 'glasses' },
  { id: 'acc_sunglasses', name: 'Lunettes de Soleil', slot: 'eyewear', compatibleBodies: ALL_BODIES, districts: ['FESTIVE', 'MAQUIS', 'COMMERCIAL'], defaultColor: '#111827', silhouette: 'sunglasses' },
  { id: 'acc_backpack', name: 'Sac à Dos', slot: 'bag', compatibleBodies: ALL_BODIES, districts: ['RESIDENTIAL', 'COMMERCIAL', 'MARKET'], defaultColor: '#0D9488', silhouette: 'backpack' },
  { id: 'acc_handbag', name: 'Sac à Main', slot: 'bag', compatibleBodies: ['BODY_FEMALE', 'BODY_ELDERLY', 'BODY_TEEN'], districts: ['FESTIVE', 'COMMERCIAL', 'RESIDENTIAL'], defaultColor: '#E11D48', silhouette: 'handbag' },
  { id: 'acc_shopping_bag', name: 'Sac de Courses', slot: 'bag', compatibleBodies: ALL_BODIES, districts: ['MARKET', 'RESIDENTIAL'], defaultColor: '#D97706', silhouette: 'shopping_bag' },
  { id: 'acc_basket', name: 'Panier de Marché', slot: 'bag', compatibleBodies: ADULT_BODIES, districts: ['MARKET'], defaultColor: '#C68642', silhouette: 'basket' },
  { id: 'acc_watch', name: 'Montre', slot: 'wrist', compatibleBodies: ADULT_BODIES.concat('BODY_TEEN'), districts: ['COMMERCIAL', 'FESTIVE', 'MAQUIS'], defaultColor: '#D97706', silhouette: 'watch' },
  { id: 'acc_bracelet', name: 'Bracelet', slot: 'wrist', compatibleBodies: ALL_BODIES, districts: ['MAQUIS', 'FESTIVE', 'RESIDENTIAL'], defaultColor: '#0D9488', silhouette: 'bracelet' },
  { id: 'acc_necklace', name: 'Collier', slot: 'neck', compatibleBodies: ADULT_BODIES.concat('BODY_TEEN'), districts: ['FESTIVE', 'MAQUIS', 'COMMERCIAL'], defaultColor: '#F59E0B', silhouette: 'necklace' },
  { id: 'acc_earrings', name: "Boucles d'Oreilles", slot: 'ear', compatibleBodies: ['BODY_FEMALE', 'BODY_TEEN', 'BODY_ELDERLY'], districts: ['FESTIVE', 'COMMERCIAL', 'RESIDENTIAL'], defaultColor: '#F59E0B', silhouette: 'earrings' },
];

export interface DeliverableEntry {
  path: string;
  folder: string;
  fileName: string;
  kind: 'glb' | 'png' | 'pdf' | 'txt';
  description: string;
}

export function getDeliverablesManifest(): DeliverableEntry[] {
  const entries: DeliverableEntry[] = [];

  for (const id of ALL_BODIES) {
    const spec = BODY_SPECS[id];
    entries.push({
      path: `/BLV_Character_Assets/Bodies/${spec.fileName}`,
      folder: 'Bodies',
      fileName: spec.fileName,
      kind: 'glb',
      description: `${spec.label} — Squelette commun & maillage chibi low-poly (${spec.heightMeters}m)`,
    });
  }

  for (const g of GARMENTS) {
    const subFolder =
      g.category === 'male'
        ? 'Clothing/Male'
        : g.category === 'female'
          ? 'Clothing/Female'
          : 'Clothing/Universal';
    entries.push({
      path: `/BLV_Character_Assets/${subFolder}/${g.id}.glb`,
      folder: subFolder,
      fileName: `${g.id}.glb`,
      kind: 'glb',
      description: `${g.name} (${g.subcategory})`,
    });
  }

  entries.push(
    {
      path: '/BLV_Character_Assets/Hair/hairstyles.glb',
      folder: 'Hair',
      fileName: 'hairstyles.glb',
      kind: 'glb',
      description: `Pack complet des ${HAIRSTYLES.length} coiffures modulaires`,
    },
    {
      path: '/BLV_Character_Assets/Accessories/accessories.glb',
      folder: 'Accessories',
      fileName: 'accessories.glb',
      kind: 'glb',
      description: `Pack complet des ${ACCESSORIES.length} accessoires urbains`,
    },
    {
      path: '/BLV_Character_Assets/Shoes/shoes.glb',
      folder: 'Shoes',
      fileName: 'shoes.glb',
      kind: 'glb',
      description: `Pack complet des ${SHOES.length} modèles de chaussures`,
    },
    {
      path: '/BLV_Character_Assets/Textures/character_atlas.png',
      folder: 'Textures',
      fileName: 'character_atlas.png',
      kind: 'png',
      description: 'Atlas 512×512 : carnations ivoiriennes, yeux, visages, cheveux',
    },
    {
      path: '/BLV_Character_Assets/Textures/clothing_atlas.png',
      folder: 'Textures',
      fileName: 'clothing_atlas.png',
      kind: 'png',
      description: 'Atlas 512×512 : trames textiles, denim, rayures, bordures wax',
    },
    {
      path: '/BLV_Character_Assets/Textures/color_masks.png',
      folder: 'Textures',
      fileName: 'color_masks.png',
      kind: 'png',
      description: 'Masques RGB 512×512 pour coloration dynamique et GPU instancing',
    },
    {
      path: '/BLV_Character_Assets/Documentation/asset_catalog.pdf',
      folder: 'Documentation',
      fileName: 'asset_catalog.pdf',
      kind: 'pdf',
      description: 'Catalogue visuel & fiches techniques BLV',
    },
    {
      path: '/BLV_Character_Assets/Documentation/compatibility_notes.txt',
      folder: 'Documentation',
      fileName: 'compatibility_notes.txt',
      kind: 'txt',
      description: 'Règles de squelette, compatibilités morphologiques et budgets',
    }
  );

  return entries;
}

export function isGarmentCompatible(garment: GarmentItem, bodyId: BodyId): boolean {
  if (garment.adultFemaleOnly && bodyId !== 'BODY_FEMALE') return false;
  return garment.compatibleBodies.includes(bodyId);
}

export function isShoeCompatible(shoe: ShoeItem, bodyId: BodyId): boolean {
  if (shoe.adultFemaleOnly && bodyId !== 'BODY_FEMALE') return false;
  return shoe.compatibleBodies.includes(bodyId);
}

export function isAccessoryCompatible(acc: AccessoryItem, bodyId: BodyId): boolean {
  return acc.compatibleBodies.includes(bodyId);
}

export function createDefaultLoadout(bodyId: BodyId = 'BODY_MALE'): CharacterLoadout {
  const spec = BODY_SPECS[bodyId];
  const skin = SKIN_TONES[spec.defaultSkinIndex] ?? SKIN_TONES[2];

  if (bodyId === 'BODY_FEMALE') {
    const top = GARMENTS.find((g) => g.id === 'f_top_blouse')!;
    const bot = GARMENTS.find((g) => g.id === 'f_bot_skirt_short')!;
    const shoe = SHOES.find((s) => s.id === 'shoe_sneakers')!;
    return {
      bodyId,
      skinToneId: skin.id,
      hairId: spec.defaultHairId,
      hairColorId: 'hc_black',
      topId: top.id,
      bottomId: bot.id,
      fullOutfitId: null,
      shoeId: shoe.id,
      topColor: '#F3F4F6',
      topSecondaryColor: '#0D9488',
      topPattern: 'wax_band',
      bottomColor: '#0D9488',
      bottomPattern: 'solid',
      shoeColor: '#F3F4F6',
      headwearId: null,
      eyewearId: null,
      bagId: 'acc_handbag',
      wristId: 'acc_bracelet',
      neckId: 'acc_necklace',
      earId: 'acc_earrings',
      district: 'RESIDENTIAL',
    };
  }

  const top = GARMENTS.find((g) => g.id === 'm_top_polo')!;
  const bot = GARMENTS.find((g) => g.id === 'm_bot_jeans_classic')!;
  const shoe = SHOES.find((s) => s.id === 'shoe_baskets')!;
  return {
    bodyId,
    skinToneId: skin.id,
    hairId: spec.defaultHairId,
    hairColorId: bodyId === 'BODY_ELDERLY' ? 'hc_silver' : 'hc_black',
    topId: top.id,
    bottomId: bot.id,
    fullOutfitId: null,
    shoeId: shoe.id,
    topColor: top.defaultPrimaryColor,
    topSecondaryColor: top.defaultSecondaryColor,
    topPattern: top.defaultPattern,
    bottomColor: bot.defaultPrimaryColor,
    bottomPattern: bot.defaultPattern,
    shoeColor: shoe.defaultColor,
    headwearId: null,
    eyewearId: bodyId === 'BODY_ELDERLY' ? 'acc_glasses' : null,
    bagId: bodyId === 'BODY_CHILD' || bodyId === 'BODY_TEEN' ? 'acc_backpack' : null,
    wristId: bodyId === 'BODY_MALE' ? 'acc_watch' : null,
    neckId: null,
    earId: null,
    district: 'RESIDENTIAL',
  };
}

/**
 * Ensures any loadout remains 100% compatible after switching BodyId.
 */
export function sanitizeLoadoutForBody(
  loadout: CharacterLoadout,
  nextBodyId: BodyId
): CharacterLoadout {
  const next: CharacterLoadout = { ...loadout, bodyId: nextBodyId };
  const bodyIsFemale = nextBodyId === 'BODY_FEMALE';

  if (next.fullOutfitId) {
    const outfit = GARMENTS.find((g) => g.id === next.fullOutfitId);
    if (!outfit || !isGarmentCompatible(outfit, nextBodyId)) {
      next.fullOutfitId = null;
    }
  }

  if (!next.fullOutfitId) {
    const currentTop = GARMENTS.find((g) => g.id === next.topId);
    if (!currentTop || !isGarmentCompatible(currentTop, nextBodyId)) {
      const fallbackTop =
        GARMENTS.find(
          (g) =>
            g.slot === 'top' &&
            g.category === (bodyIsFemale ? 'female' : 'male') &&
            isGarmentCompatible(g, nextBodyId)
        ) ?? GARMENTS.find((g) => g.slot === 'top' && isGarmentCompatible(g, nextBodyId));
      next.topId = fallbackTop ? fallbackTop.id : null;
    }

    const currentBot = GARMENTS.find((g) => g.id === next.bottomId);
    if (!currentBot || !isGarmentCompatible(currentBot, nextBodyId)) {
      const fallbackBot =
        GARMENTS.find(
          (g) =>
            g.slot === 'bottom' &&
            g.category === (bodyIsFemale ? 'female' : 'male') &&
            isGarmentCompatible(g, nextBodyId)
        ) ?? GARMENTS.find((g) => g.slot === 'bottom' && isGarmentCompatible(g, nextBodyId));
      next.bottomId = fallbackBot ? fallbackBot.id : null;
    }
  }

  const currentShoe = SHOES.find((s) => s.id === next.shoeId);
  if (!currentShoe || !isShoeCompatible(currentShoe, nextBodyId)) {
    next.shoeId = 'shoe_baskets';
  }

  const checkAcc = (id: string | null): string | null => {
    if (!id) return null;
    const item = ACCESSORIES.find((a) => a.id === id);
    return item && isAccessoryCompatible(item, nextBodyId) ? id : null;
  };

  next.headwearId = checkAcc(next.headwearId);
  next.eyewearId = checkAcc(next.eyewearId);
  next.bagId = checkAcc(next.bagId);
  next.wristId = checkAcc(next.wristId);
  next.neckId = checkAcc(next.neckId);
  next.earId = checkAcc(next.earId);

  if (nextBodyId === 'BODY_ELDERLY' && next.hairColorId === 'hc_black') {
    next.hairColorId = 'hc_silver';
  }

  return next;
}

function seededNext(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function generateContextualNpc(
  district: DistrictId,
  bodyOverride?: BodyId,
  seed = Date.now()
): CharacterLoadout {
  const rand = seededNext(seed);

  const districtBodies: Record<DistrictId, BodyId[]> = {
    RESIDENTIAL: ALL_BODIES,
    MARKET: ['BODY_FEMALE', 'BODY_MALE', 'BODY_ELDERLY', 'BODY_CORPULENT', 'BODY_TEEN'],
    COMMERCIAL: ['BODY_MALE', 'BODY_FEMALE', 'BODY_CORPULENT', 'BODY_ELDERLY'],
    FESTIVE: ['BODY_FEMALE', 'BODY_MALE', 'BODY_TEEN'],
    MAQUIS: ['BODY_MALE', 'BODY_FEMALE', 'BODY_CORPULENT', 'BODY_TEEN'],
  };

  const bodyId = bodyOverride ?? pick(districtBodies[district], rand);
  const skin = pick(SKIN_TONES, rand);

  const hairPool = HAIRSTYLES.filter((h) => {
    if (bodyId === 'BODY_FEMALE') return h.styleHint !== 'masculine';
    if (bodyId === 'BODY_MALE' || bodyId === 'BODY_CORPULENT') return h.styleHint !== 'feminine';
    return true;
  });
  const hair = pick(hairPool, rand);
  const hairColor =
    bodyId === 'BODY_ELDERLY'
      ? pick(HAIR_COLORS.filter((c) => c.id === 'hc_silver' || c.id === 'hc_black'), rand)
      : pick(HAIR_COLORS.filter((c) => c.id !== 'hc_silver'), rand);

  const compatibleFull = GARMENTS.filter(
    (g) =>
      !g.excludeFromStreetNpc &&
      g.slot === 'full_outfit' &&
      isGarmentCompatible(g, bodyId) &&
      g.districts.includes(district)
  );
  const useFullOutfit =
    compatibleFull.length > 0 &&
    (district === 'FESTIVE' && bodyId === 'BODY_FEMALE' ? rand() < 0.72 : rand() < 0.38);

  let topId: string | null = null;
  let bottomId: string | null = null;
  let fullOutfitId: string | null = null;
  let topColor = pick(FABRIC_SWATCHES, rand).hex;
  let topSecondaryColor = pick(FABRIC_SWATCHES, rand).hex;
  let topPattern: PatternId = pick(PATTERN_OPTIONS, rand).id;
  let bottomColor = pick(FABRIC_SWATCHES.slice(0, 6), rand).hex;
  let bottomPattern: PatternId = 'solid';

  if (useFullOutfit) {
    const full = pick(compatibleFull, rand);
    fullOutfitId = full.id;
    topColor = full.defaultPrimaryColor;
    topSecondaryColor = full.defaultSecondaryColor;
    topPattern = full.defaultPattern;
  } else {
    const tops = GARMENTS.filter(
      (g) =>
        !g.excludeFromStreetNpc &&
        g.slot === 'top' &&
        isGarmentCompatible(g, bodyId) &&
        (g.districts.includes(district) || rand() < 0.25)
    );
    const chosenTop = pick(
      tops.length
        ? tops
        : GARMENTS.filter((g) => !g.excludeFromStreetNpc && g.slot === 'top' && isGarmentCompatible(g, bodyId)),
      rand
    );
    topId = chosenTop.id;
    topColor = rand() < 0.5 ? chosenTop.defaultPrimaryColor : pick(FABRIC_SWATCHES, rand).hex;
    topSecondaryColor = chosenTop.defaultSecondaryColor;
    topPattern = chosenTop.defaultPattern;

    const bots = GARMENTS.filter(
      (g) =>
        !g.excludeFromStreetNpc &&
        g.slot === 'bottom' &&
        isGarmentCompatible(g, bodyId) &&
        (g.districts.includes(district) || rand() < 0.25)
    );
    const chosenBot = pick(
      bots.length
        ? bots
        : GARMENTS.filter((g) => !g.excludeFromStreetNpc && g.slot === 'bottom' && isGarmentCompatible(g, bodyId)),
      rand
    );
    bottomId = chosenBot.id;
    bottomColor = chosenBot.defaultPrimaryColor;
    bottomPattern = chosenBot.defaultPattern;
  }

  const shoePool = SHOES.filter((s) => isShoeCompatible(s, bodyId) && s.districts.includes(district));
  const shoe = pick(shoePool.length ? shoePool : SHOES.filter((s) => isShoeCompatible(s, bodyId)), rand);

  const pickAcc = (slot: AccessorySlot, prob: number): string | null => {
    if (rand() > prob) return null;
    const pool = ACCESSORIES.filter(
      (a) => a.slot === slot && isAccessoryCompatible(a, bodyId) && a.districts.includes(district)
    );
    return pool.length ? pick(pool, rand).id : null;
  };

  return sanitizeLoadoutForBody(
    {
      bodyId,
      skinToneId: skin.id,
      hairId: hair.id,
      hairColorId: hairColor.id,
      topId,
      bottomId,
      fullOutfitId,
      shoeId: shoe.id,
      topColor,
      topSecondaryColor,
      topPattern,
      bottomColor,
      bottomPattern,
      shoeColor: shoe.defaultColor,
      headwearId: pickAcc('headwear', district === 'MARKET' ? 0.45 : 0.2),
      eyewearId: pickAcc('eyewear', district === 'FESTIVE' || district === 'COMMERCIAL' ? 0.35 : 0.15),
      bagId: pickAcc('bag', district === 'MARKET' ? 0.65 : 0.3),
      wristId: pickAcc('wrist', 0.4),
      neckId: pickAcc('neck', district === 'FESTIVE' ? 0.5 : 0.2),
      earId: pickAcc('ear', bodyId === 'BODY_FEMALE' ? 0.55 : 0.1),
      district,
    },
    bodyId
  );
}
