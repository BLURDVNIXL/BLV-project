/**
 * BLV — Catalogue des objets (sac, boutiques, menus) et répartition par lieu.
 *
 * Un seul catalogue (id, nom, catégorie, prix de base, effets) ; chaque lieu n'a qu'une liste d'identifiants.
 * Les prix des plats sont ceux du maquis : Akwaba Eats ×1,3, restaurant de l'hôtel Ivoire ×2.
 * Les produits emballés (boutique, supérette) ont leur propre prix, sans coefficient.
 * `model` désigne la forme du STUDIO-OBJECT (shape + libellé du preset) ou la recette d'un plat assemblé.
 * Aucun besoin « soif » dans le jeu : les boissons jouent sur l'énergie, l'envie et la vessie.
 */

export type ItemCategory =
  | 'boisson'
  | 'snack'
  | 'pain'
  | 'fruit'
  | 'conserve'
  | 'laitier'
  | 'hygiene'
  | 'divers'
  | 'plat';

/** Variations (positives ou négatives) appliquées aux besoins quand l'objet est utilisé. */
export interface ItemEffects {
  hunger?: number;
  energy?: number;
  hygiene?: number;
  bladder?: number;
  envy?: number;
}

export type ItemModel =
  | { kind: 'shape'; shape: string; preset: string }
  | { kind: 'dish'; dish: string };

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  /** Prix de base en FCFA (maquis pour les plats, boutique pour les produits emballés). */
  price: number;
  effects: ItemEffects;
  /** Vrai : l'objet est consommé (−1) quand on l'utilise. Faux : parapluie, etc. */
  consumable: boolean;
  model: ItemModel;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  plat: 'Plats',
  boisson: 'Boissons',
  snack: 'Snacks',
  pain: 'Pain & viennoiserie',
  fruit: 'Fruits & légumes',
  conserve: 'Conserves',
  laitier: 'Laitiers',
  hygiene: 'Hygiène',
  divers: 'Divers',
};

/** Ordre d'affichage des catégories dans les menus. */
export const CATEGORY_ORDER: ItemCategory[] = [
  'plat',
  'boisson',
  'snack',
  'pain',
  'fruit',
  'conserve',
  'laitier',
  'hygiene',
  'divers',
];

const DEFAULT_EFFECTS: Record<Exclude<ItemCategory, 'plat' | 'hygiene' | 'divers'>, ItemEffects> = {
  boisson: { energy: 8, envy: 6, bladder: -8 },
  snack: { hunger: 10, envy: 8 },
  pain: { hunger: 18, envy: 4 },
  fruit: { hunger: 10, envy: 5 },
  conserve: { hunger: 25, envy: 3 },
  laitier: { hunger: 12, envy: 6, energy: 3 },
};

const ITEMS: ItemDef[] = [];

/** Produit emballé : forme + libellé de preset du STUDIO-OBJECT. */
function packaged(
  id: string,
  name: string,
  category: ItemCategory,
  icon: string,
  price: number,
  shape: string,
  preset: string,
  effects?: ItemEffects,
  consumable = true
): void {
  const base =
    category === 'plat' || category === 'hygiene' || category === 'divers'
      ? {}
      : DEFAULT_EFFECTS[category];
  ITEMS.push({
    id,
    name,
    category,
    icon,
    price,
    effects: { ...base, ...effects },
    consumable,
    model: { kind: 'shape', shape, preset },
  });
}

// ───────────────────────────── Boissons ─────────────────────────────
packaged('eau_50cl', 'Eau minérale 50 cl', 'boisson', '💧', 200, 'bouteille_petite', 'Eau minérale 50 cl', { energy: 3, envy: 2 });
packaged('soda_cola_33', 'Soda cola 33 cl', 'boisson', '🥤', 400, 'bouteille_petite', 'Soda cola 33 cl');
packaged('gnamakoudji_33', 'Gnamakoudji 33 cl', 'boisson', '🧃', 500, 'bouteille_petite', 'Gnamakoudji 33 cl', { energy: 10 });
packaged('eau_1_5l', 'Eau 1,5 L', 'boisson', '💧', 400, 'bouteille_grande', 'Eau 1,5 L', { energy: 4, envy: 2, bladder: -12 });
packaged('soda_orange_1_5l', 'Soda orange 1,5 L', 'boisson', '🥤', 900, 'bouteille_grande', 'Soda orange 1,5 L', { energy: 12, envy: 9, bladder: -14 });
packaged('bissap_1_5l', 'Jus de bissap 1,5 L', 'boisson', '🍹', 1000, 'bouteille_grande', 'Jus bissap 1,5 L', { energy: 10, envy: 10, bladder: -14 });
packaged('canette_cola', 'Cola en canette', 'boisson', '🥫', 500, 'canette', 'Cola rouge');
packaged('canette_agrumes', 'Soda agrumes en canette', 'boisson', '🥫', 500, 'canette', 'Soda agrumes');
packaged('canette_energisant', 'Boisson énergisante', 'boisson', '⚡', 800, 'canette', 'Énergisant', { energy: 20, envy: 4 });
packaged('brique_mangue', 'Jus de mangue (brique)', 'boisson', '🥭', 600, 'brique_boisson', 'Jus de mangue');
packaged('brique_lait_choco', 'Lait chocolaté (brique)', 'boisson', '🥛', 500, 'brique_boisson', 'Lait chocolaté', { hunger: 6, energy: 6, envy: 8 });
packaged('brique_ananas', 'Jus d’ananas (brique)', 'boisson', '🍍', 600, 'brique_boisson', 'Jus d’ananas');
packaged('sachet_eau', 'Eau en sachet', 'boisson', '💧', 100, 'poche_eau', 'Eau pure Abidjan', { energy: 2, envy: 1, bladder: -5 });
packaged('sachet_bissap', 'Bissap en sachet', 'boisson', '🍹', 150, 'poche_eau', 'Sachet bissap', { bladder: -6 });
packaged('sachet_gingembre', 'Jus de gingembre en sachet', 'boisson', '🫚', 150, 'poche_eau', 'Sachet gingembre', { energy: 10, bladder: -6 });
packaged('smoothie_mangue', 'Smoothie mangue', 'boisson', '🥭', 700, 'verre_paille', 'Smoothie mangue', { hunger: 5, envy: 9 });
packaged('cafe_glace', 'Café glacé', 'boisson', '🧋', 600, 'verre_paille', 'Café glacé', { energy: 14 });
packaged('bissap_glace', 'Bissap glacé', 'boisson', '🍹', 400, 'verre_paille', 'Bissap glacé', { envy: 8 });
packaged('cafe_touba', 'Café Touba', 'boisson', '☕', 200, 'tasse', 'Café Touba', { energy: 15, envy: 4 });
packaged('chocolat_chaud', 'Chocolat chaud', 'boisson', '☕', 400, 'tasse', 'Chocolat chaud', { hunger: 4, energy: 8, envy: 8 });
packaged('the_menthe', 'Thé vert à la menthe', 'boisson', '🍵', 300, 'tasse', 'Thé vert menthe', { energy: 10, envy: 5 });

// ───────────────────────────── Snacks ─────────────────────────────
packaged('chips_alloco', 'Chips d’alloco piment', 'snack', '🍟', 300, 'sachet_snack', 'Chips Alloco piment');
packaged('chips_nature', 'Chips nature', 'snack', '🍟', 300, 'sachet_snack', 'Chips nature');
packaged('arachides_grillees', 'Arachides grillées', 'snack', '🥜', 200, 'sachet_snack', 'Arachides grillées', { hunger: 12 });
packaged('cornet_arachides', 'Arachides en cornet', 'snack', '🥜', 200, 'cornet_papier', 'Arachides en cornet', { hunger: 12 });
packaged('beignets_chauds', 'Beignets chauds', 'snack', '🍩', 250, 'cornet_papier', 'Beignets chauds', { hunger: 14, envy: 10 });
packaged('popcorn_sucre', 'Pop-corn sucré', 'snack', '🍿', 250, 'cornet_papier', 'Pop-corn sucré');
packaged('chocolat_noir', 'Chocolat noir', 'snack', '🍫', 500, 'barre_tablette', 'Chocolat noir', { energy: 4, envy: 12 });
packaged('barre_caramel', 'Barre caramel', 'snack', '🍫', 400, 'barre_tablette', 'Barre caramel', { energy: 4, envy: 12 });
packaged('chocolat_blanc', 'Chocolat blanc', 'snack', '🍫', 500, 'barre_tablette', 'Chocolat blanc', { energy: 4, envy: 12 });
packaged('bonbons_fruits', 'Bonbons fruits tropicaux', 'snack', '🍬', 100, 'sachet_bonbons', 'Fruits tropicaux', { hunger: 3, envy: 7 });
packaged('bonbons_menthe', 'Bonbons menthe fraîche', 'snack', '🍬', 100, 'sachet_bonbons', 'Menthe fraîche', { hunger: 3, envy: 7 });
packaged('caramels_lait', 'Caramels au lait', 'snack', '🍬', 100, 'sachet_bonbons', 'Caramels lait', { hunger: 3, envy: 7 });
packaged('sucette_fraise', 'Sucette fraise-vanille', 'snack', '🍭', 50, 'sucette', 'Fraise-vanille', { hunger: 2, envy: 5 });
packaged('sucette_cola', 'Sucette cola-citron', 'snack', '🍭', 50, 'sucette', 'Cola-citron', { hunger: 2, envy: 5 });
packaged('sucette_menthe', 'Sucette menthe-pomme', 'snack', '🍭', 50, 'sucette', 'Menthe-pomme', { hunger: 2, envy: 5 });
packaged('chewing_menthe', 'Chewing-gum menthe glaciale', 'snack', '🫧', 100, 'plaquette_chewing_gum', 'Menthe glaciale', { hunger: 0, envy: 4, hygiene: 3 });
packaged('chewing_fraise', 'Chewing-gum fraise-pastèque', 'snack', '🫧', 100, 'plaquette_chewing_gum', 'Fraise-pastèque', { hunger: 0, envy: 4 });
packaged('chewing_eucalyptus', 'Chewing-gum eucalyptus', 'snack', '🫧', 100, 'plaquette_chewing_gum', 'Eucalyptus', { hunger: 0, envy: 4, hygiene: 3 });
packaged('biscuits_beurre', 'Biscuits au beurre', 'snack', '🍪', 300, 'paquet_biscuits', 'Biscuits beurre', { hunger: 14 });
packaged('biscuits_chocolat', 'Biscuits au chocolat', 'snack', '🍪', 350, 'paquet_biscuits', 'Biscuits chocolat', { hunger: 14, envy: 10 });
packaged('sables_vanille', 'Sablés vanille', 'snack', '🍪', 350, 'paquet_biscuits', 'Sablés vanille', { hunger: 14 });

// ───────────────────────────── Conserves et laitiers ─────────────────────────────
packaged('lait_concentre', 'Lait concentré sucré', 'conserve', '🥫', 500, 'boite_conserve', 'Lait concentré', { hunger: 18, energy: 6, envy: 5 });
packaged('sardines_huile', 'Sardines à l’huile', 'conserve', '🐟', 600, 'boite_sardines', 'Sardines huile');
packaged('sardines_tomate', 'Sardines à la tomate', 'conserve', '🐟', 600, 'boite_sardines', 'Sardines tomate');
packaged('sardines_piment', 'Sardines pimentées', 'conserve', '🐟', 650, 'boite_sardines', 'Sardines piment');
packaged('yaourt_fraise', 'Yaourt fraise', 'laitier', '🥛', 300, 'pot_yaourt', 'Yaourt fraise');
packaged('yaourt_vanille', 'Yaourt vanille', 'laitier', '🥛', 300, 'pot_yaourt', 'Yaourt vanille');
packaged('yaourt_nature', 'Yaourt nature sucré', 'laitier', '🥛', 300, 'pot_yaourt', 'Yaourt nature sucré');

// ───────────────────────────── Pain ─────────────────────────────
packaged('baguette', 'Baguette', 'pain', '🥖', 150, 'baguette', 'Baguette dorée', { hunger: 20 });
packaged('baguette_cuite', 'Baguette bien cuite', 'pain', '🥖', 150, 'baguette', 'Baguette bien cuite', { hunger: 20 });
packaged('pain_complet', 'Pain complet', 'pain', '🍞', 250, 'baguette', 'Pain complet', { hunger: 20 });
packaged('pain_mie', 'Pain de mie', 'pain', '🍞', 600, 'sachet_pain_mie', 'Pain de mie nature', { hunger: 25 });
packaged('pain_mie_complet', 'Pain de mie complet', 'pain', '🍞', 700, 'sachet_pain_mie', 'Pain de mie complet', { hunger: 25 });
packaged('pain_au_lait', 'Pain au lait', 'pain', '🥐', 150, 'pain_au_lait', 'Pain au lait doré', { hunger: 12, envy: 6 });
packaged('brioche', 'Brioche sucrée', 'pain', '🥐', 200, 'pain_au_lait', 'Brioche sucrée', { hunger: 12, envy: 6 });
packaged('croissant', 'Croissant au beurre', 'pain', '🥐', 250, 'croissant', 'Croissant au beurre', { hunger: 14, envy: 7 });
packaged('croissant_cacao', 'Croissant fourré cacao', 'pain', '🥐', 300, 'croissant', 'Croissant fourré cacao', { hunger: 14, envy: 9 });

// ───────────────────────────── Fruits et légumes (crus, à croquer) ─────────────────────────────
packaged('banane_douce', 'Banane douce', 'fruit', '🍌', 100, 'banane', 'Banane douce mûre');
packaged('orange', 'Orange', 'fruit', '🍊', 100, 'fruit_rond', 'Orange');
packaged('mandarine', 'Mandarine', 'fruit', '🍊', 100, 'fruit_rond', 'Mandarine');
packaged('pomme_rouge', 'Pomme rouge', 'fruit', '🍎', 200, 'fruit_rond', 'Pomme rouge');
packaged('pomme_verte', 'Pomme verte', 'fruit', '🍏', 200, 'fruit_rond', 'Pomme verte');
packaged('poire', 'Poire', 'fruit', '🍐', 200, 'poire', 'Poire Williams jaune');
packaged('mangue_kent', 'Mangue Kent', 'fruit', '🥭', 300, 'mangue', 'Mangue Kent', { hunger: 14, envy: 8 });
packaged('mangue_amelie', 'Mangue Amélie', 'fruit', '🥭', 300, 'mangue', 'Mangue Amélie', { hunger: 14, envy: 8 });
packaged('papaye', 'Papaye', 'fruit', '🍈', 500, 'papaye', 'Papaye Solo mûre', { hunger: 14, envy: 6 });
packaged('ananas', 'Ananas', 'fruit', '🍍', 600, 'ananas', 'Ananas Cayenne', { hunger: 16, envy: 8 });
packaged('pasteque', 'Tranche de pastèque', 'fruit', '🍉', 200, 'tranche_pasteque', 'Pastèque rouge', { hunger: 8, envy: 6, bladder: -6 });
packaged('avocat', 'Avocat', 'fruit', '🥑', 300, 'avocat', 'Avocat beurre lisse', { hunger: 14, energy: 3 });
packaged('noix_coco', 'Noix de coco fraîche', 'fruit', '🥥', 400, 'noix_coco', 'Coco vert frais', { hunger: 8, energy: 6, envy: 6, bladder: -6 });
packaged('raisin_noir', 'Grappe de raisin noir', 'fruit', '🍇', 800, 'grappe_raisin', 'Raisin noir', { hunger: 10, envy: 7 });
packaged('raisin_vert', 'Grappe de raisin vert', 'fruit', '🍇', 800, 'grappe_raisin', 'Raisin vert muscat', { hunger: 10, envy: 7 });
packaged('concombre', 'Concombre', 'fruit', '🥒', 150, 'legume_allonge', 'Concombre', { hunger: 6, envy: 2, bladder: -4 });
packaged('carotte', 'Carotte', 'fruit', '🥕', 100, 'legume_allonge', 'Carotte', { hunger: 7, envy: 2 });

// ───────────────────────────── Hygiène (effet hygiène ou envie) ─────────────────────────────
packaged('savon_creme', 'Savon crème', 'hygiene', '🧼', 300, 'pain_savon', 'Savon crème', { hygiene: 25 });
packaged('savon_noir', 'Savon noir naturel', 'hygiene', '🧼', 400, 'pain_savon', 'Savon noir naturel', { hygiene: 28 });
packaged('savon_bleu', 'Savon fraîcheur bleu', 'hygiene', '🧼', 300, 'pain_savon', 'Savon fraîcheur bleu', { hygiene: 25, envy: 3 });
packaged('gel_douche', 'Gel douche océan', 'hygiene', '🧴', 1000, 'flacon', 'Gel douche océan', { hygiene: 32, envy: 3 });
packaged('shampooing', 'Shampooing karité', 'hygiene', '🧴', 1200, 'flacon', 'Shampooing karité', { hygiene: 25, envy: 4 });
packaged('bain_de_bouche', 'Bain de bouche menthe', 'hygiene', '🧴', 1000, 'flacon', 'Bain de bouche menthe', { hygiene: 12, envy: 3 });
packaged('dentifrice_menthe', 'Dentifrice menthe', 'hygiene', '🪥', 500, 'tube_dentifrice', 'Menthe classique', { hygiene: 15, envy: 2 });
packaged('dentifrice_vert', 'Dentifrice fraîcheur verte', 'hygiene', '🪥', 500, 'tube_dentifrice', 'Fraîcheur verte', { hygiene: 15, envy: 2 });
packaged('brosse_dents', 'Brosse à dents', 'hygiene', '🪥', 300, 'brosse_dents', 'Brosse bleue', { hygiene: 10 });
packaged('deodorant_sport', 'Déodorant sport', 'hygiene', '🧴', 1000, 'deodorant', 'Spray sport', { hygiene: 10, envy: 8 });
packaged('deodorant_fraicheur', 'Déodorant fraîcheur', 'hygiene', '🧴', 1000, 'deodorant', 'Spray fraîcheur', { hygiene: 10, envy: 8 });
packaged('parfum_ambre', 'Parfum ambre doré', 'hygiene', '🧴', 3000, 'flacon_parfum', 'Ambre doré', { hygiene: 5, envy: 15 });
packaged('eau_de_cologne', 'Eau de Cologne', 'hygiene', '🧴', 2000, 'flacon_parfum', 'Eau de rose', { hygiene: 5, envy: 12 });
packaged('brume_corporelle', 'Brume corporelle nuit bleue', 'hygiene', '🧴', 1500, 'flacon_parfum', 'Nuit bleue', { hygiene: 4, envy: 10 });

// ───────────────────────────── Divers ─────────────────────────────
packaged('parapluie_bleu', 'Parapluie bleu-blanc', 'divers', '☂️', 2000, 'parapluie', 'Parapluie Abidjan bleu-blanc', {}, false);
packaged('parapluie_rouge', 'Parapluie rouge-jaune', 'divers', '☂️', 2000, 'parapluie', 'Parapluie rouge-jaune', {}, false);
packaged('parapluie_noir', 'Parapluie noir classique', 'divers', '☂️', 2500, 'parapluie', 'Parapluie noir classique', {}, false);

// ───────────────────────────── Plats et boissons du maquis ─────────────────────────────

/** m = maquis, h = hôtel, mh = les deux, r = vendeuses de rue seulement (hors menus des lieux). */
type DishWhere = 'm' | 'h' | 'mh' | 'r';

/**
 * Effets d'un plat selon son prix de base (échelle maquis 100 à 3 000 F) : un plat cher rassasie et fait plus plaisir.
 * Repères : 100 F → faim +12 ; 1 000 F → +30 ; 2 000 F → +50 ; 3 000 F → +70 (plafonné à 80).
 */
function dishEffects(price: number): ItemEffects {
  return {
    hunger: Math.min(80, Math.round(10 + price / 50)),
    envy: Math.min(60, Math.round(8 + price / 100)),
    bladder: -10,
  };
}

/** [id, nom, prix de base maquis (100 à 3 000 F), lieux, icône, recette du studio (si elle existe, sinon l'id du plat)] */
type DishRow = [string, string, number, DishWhere, string, string?];

const DISH_ROWS: DishRow[] = [
  // Volailles et viandes
  ['poulet_braise_demi', 'Poulet braisé (demi)', 1500, 'm', '🍗'],
  ['poulet_braise_entier', 'Poulet braisé (entier)', 3000, 'm', '🍗'],
  ['poulet_saute', 'Poulet sauté', 1500, 'm', '🍗'],
  ['kedjenou_poulet', 'Kédjénou de poulet', 2000, 'm', '🍲'],
  ['kedjenou_poulet_bicyclette', 'Kédjénou de poulet bicyclette', 2500, 'm', '🍲'],
  ['poulet_braise_kedjenou', 'Poulet braisé au kédjénou', 2000, 'm', '🍲'],
  ['pintade_braisee_kedjenou', 'Pintade braisée au kédjénou', 2500, 'm', '🍲'],
  ['kedjenou_pintade', 'Kédjénou de pintade', 2500, 'm', '🍲'],
  ['lapin_braise_kedjenou', 'Lapin braisé au kédjénou', 2500, 'm', '🍲'],
  ['lapin_braise_demi', 'Lapin braisé (demi)', 2000, 'm', '🍖'],
  ['kedjenou_lapin', 'Kédjénou de lapin', 2500, 'm', '🍲'],
  ['steak_boeuf_grille', 'Steak de bœuf grillé', 2000, 'h', '🥩'],
  ['steak_poivre', 'Steak au poivre', 2500, 'h', '🥩'],
  ['steak_hache', 'Steak de viande hachée', 1500, 'h', '🥩'],
  ['entrecote_boeuf', 'Entrecôte de bœuf', 3000, 'h', '🥩'],
  ['brochette_filet_boeuf', 'Brochette de filet de bœuf', 700, 'm', '🍢'],
  ['filet_soukouya', 'Filet de soukouya', 2000, 'm', '🥩'],
  ['brochette_soukouya', 'Brochette de soukouya', 700, 'm', '🍢'],
  ['cotelette_porc', 'Côtelette de porc', 2000, 'h', '🥩'],
  ['mouton_braise', 'Mouton braisé', 2500, 'm', '🍖'],
  ['kedjenou_mouton', 'Kédjénou de mouton', 2500, 'm', '🍲'],
  ['brochette_mouton', 'Brochette de mouton braisé', 700, 'm', '🍢'],
  ['agouti_braise', 'Agouti braisé', 3000, 'm', '🍖'],
  // Poissons
  ['carpe_braisee_petite', 'Carpe braisée (petite)', 1500, 'm', '🐟'],
  ['carpe_braisee_grande', 'Carpe braisée (grande)', 2500, 'm', '🐟'],
  ['dorade_braisee', 'Dorade braisée', 2500, 'mh', '🐟'],
  ['sole_braisee', 'Sole braisée', 2500, 'mh', '🐟'],
  ['capitaine_braise', 'Capitaine braisé', 3000, 'm', '🐟'],
  ['machoiron_braise_petit', 'Machoiron braisé (petit)', 1500, 'm', '🐟'],
  ['machoiron_braise_grand', 'Machoiron braisé (grand)', 2500, 'm', '🐟'],
  ['poisson_braise', 'Poisson braisé', 1500, 'm', '🐟'],
  ['carpe_grillee', 'Carpe grillée', 1500, 'm', '🐟'],
  ['dorade_grillee', 'Dorade grillée', 2500, 'mh', '🐟'],
  ['sole_grillee', 'Sole grillée', 2500, 'mh', '🐟'],
  ['poisson_grille', 'Poisson grillé', 1500, 'm', '🐟'],
  ['capitaine_saute', 'Capitaine sauté', 3000, 'm', '🐟'],
  ['kedjenou_poisson', 'Kédjénou de poisson', 2000, 'm', '🍲'],
  ['poisson_braise_kedjenou', 'Poisson braisé au kédjénou', 2000, 'm', '🍲'],
  // Crustacés et fruits de mer
  ['crevettes_sautees', 'Crevettes sautées', 2000, 'h', '🦐'],
  ['crevettes_braisees', 'Crevettes braisées', 2000, 'h', '🦐'],
  ['crevettes_brochette', 'Crevettes en brochette', 1500, 'h', '🍢'],
  ['ecrevisses', 'Écrevisses', 2500, 'h', '🦞'],
  ['brochette_ecrevisses', 'Brochette d’écrevisses', 1500, 'h', '🍢'],
  ['gambas', 'Gambas', 3000, 'h', '🦐'],
  ['langouste', 'Langouste', 3000, 'h', '🦞'],
  ['assiette_crevettes', 'Assiette de crevettes', 2500, 'h', '🦐'],
  ['assiette_ecrevisses', 'Assiette d’écrevisses', 2500, 'h', '🦞'],
  ['assiette_gambas', 'Assiette de gambas', 3000, 'h', '🦐'],
  ['assiette_pecheur', 'Assiette du pêcheur', 3000, 'h', '🦞'],
  // Escargots et autres spécialités
  ['escargots_grilles', 'Escargots grillés', 1500, 'm', '🐌'],
  ['brochette_escargots', 'Brochette d’escargots', 700, 'm', '🍢'],
  ['kedjenou_escargots', 'Kédjénou d’escargots', 2000, 'm', '🍲'],
  ['brochette_gesiers', 'Brochette de gésiers de poulet', 400, 'm', '🍢'],
  ['gesiers_sautes', 'Gésiers sautés', 800, 'm', '🍗'],
  ['saucisses_sautees', 'Saucisses sautées', 800, 'm', '🌭'],
  ['merguez_grillees', 'Merguez grillées', 800, 'm', '🌭'],
  // Plats africains et spécialités locales
  ['kedjenou_ecrevisses', 'Kédjénou d’écrevisses', 2500, 'm', '🍲'],
  ['attieke_braise_kedjenou', 'Attiéké braisé au kédjénou', 2000, 'm', '🍲'],
  ['attieke', 'Attiéké', 100, 'm', '🍚'],
  ['attieke_boeuf', 'Attiéké au bœuf', 1500, 'm', '🍚'],
  ['garba_abidjan', 'Garba d’Abidjan', 500, 'm', '🐟'],
  ['riz_sauce_graine', 'Riz sauce graine & mouton', 1500, 'm', '🍲'],
  // Plats européens
  ['spaghettis_bolognaise', 'Spaghettis bolognaise', 1500, 'h', '🍝'],
  // Accompagnements
  ['riz_blanc', 'Riz blanc parfumé', 200, 'm', '🍚'],
  ['riz_exotique', 'Riz exotique', 500, 'h', '🍚'],
  ['riz_exotique_boeuf', 'Riz exotique au bœuf', 1500, 'h', '🍚'],
  ['alloco', 'Alloco (banane plantain)', 300, 'm', '🍌'],
  ['frites', 'Frites', 400, 'm', '🍟'],
  ['patates_douces_frites', 'Patates douces frites', 500, 'h', '🍠'],
  // Barquettes et entrées
  ['accras_poisson', 'Accras de poisson', 300, 'm', '🧆'],
  ['petite_barquette', 'Petite barquette', 800, 'm', '🥡'],
  ['grande_barquette', 'Grande barquette', 1500, 'm', '🥡'],
  ['canapes_froids', 'Canapés froids', 1000, 'h', '🥪'],
  ['canapes_chauds', 'Canapés chauds', 1000, 'h', '🥪'],
  // Traiteur et desserts
  ['gigot_agneau', 'Gigot d’agneau doré', 3000, 'h', '🍖'],
  ['mechoui_farci', 'Méchoui farci', 3000, 'h', '🍖'],
  ['cochon_de_lait', 'Cochon de lait', 3000, 'h', '🐖'],
  ['mini_patisserie', 'Mini-pâtisserie', 1000, 'h', '🧁'],
  // Nourriture de rue (vendeuses). Pas encore de modèle propre : même modèle que l'alloco.
  ['claclo', 'Claclo', 200, 'r', '🍌', 'alloco'],
  ['gboson', 'Gboson', 200, 'r', '🧆', 'alloco'],
  ['galettes', 'Galettes', 100, 'r', '🥞', 'alloco'],
  ['gnonmi', 'Gnonmi', 150, 'r', '🥟', 'alloco'],
];

const DISH_WHERE = new Map<string, DishWhere>();
for (const [id, name, price, where, icon, recipe] of DISH_ROWS) {
  DISH_WHERE.set(id, where);
  ITEMS.push({
    id,
    name,
    category: 'plat',
    icon,
    price,
    effects: dishEffects(price),
    consumable: true,
    model: { kind: 'dish', dish: recipe ?? id },
  });
}

// Boissons propres au maquis (mêmes formes que les boissons emballées)
ITEMS.push(
  {
    id: 'bissap_50cl',
    name: 'Bissap 50 cl',
    category: 'boisson',
    icon: '🍹',
    price: 300,
    effects: { energy: 8, envy: 8, bladder: -9 },
    consumable: true,
    model: { kind: 'shape', shape: 'verre_paille', preset: 'Bissap glacé' },
  },
  {
    id: 'bissap_1_5l_maquis',
    name: 'Bissap 1,5 L',
    category: 'boisson',
    icon: '🍹',
    price: 1000,
    effects: { energy: 10, envy: 10, bladder: -14 },
    consumable: true,
    model: { kind: 'shape', shape: 'bouteille_grande', preset: 'Jus bissap 1,5 L' },
  }
);

export const ALL_ITEMS: readonly ItemDef[] = ITEMS;

const ITEM_BY_ID = new Map<string, ItemDef>(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef | undefined {
  return ITEM_BY_ID.get(id);
}

// ───────────────────────────── Lieux ─────────────────────────────

export type PlaceMenuId = 'maquis' | 'hotel_ivoire' | 'akwaba' | 'boutique' | 'superette' | 'garbadrome' | 'vendeuse';

export interface PlaceMenu {
  id: PlaceMenuId;
  label: string;
  /** Coefficient appliqué au prix de base (×1 maquis, ×1,3 Akwaba Eats, ×2 hôtel Ivoire). */
  coef: number;
  /** Identifiants d'objets vendus ici, sans doublon. */
  itemIds: string[];
}

const MAQUIS_DRINKS = ['bissap_50cl', 'bissap_1_5l_maquis', 'eau_50cl', 'soda_cola_33', 'gnamakoudji_33', 'canette_cola', 'canette_agrumes', 'brique_mangue', 'brique_ananas', 'sachet_gingembre'];
const HOTEL_DRINKS = ['eau_50cl', 'soda_cola_33', 'canette_cola', 'canette_agrumes', 'brique_mangue', 'brique_ananas', 'bissap_50cl', 'cafe_glace', 'cafe_touba', 'smoothie_mangue'];

const MAQUIS_IDS = [...DISH_ROWS.filter((r) => r[3] === 'm' || r[3] === 'mh').map((r) => r[0]), ...MAQUIS_DRINKS];
const HOTEL_IDS = [...DISH_ROWS.filter((r) => r[3] === 'h' || r[3] === 'mh').map((r) => r[0]), ...HOTEL_DRINKS];

const boutiqueCats: ItemCategory[] = ['boisson', 'snack', 'pain', 'fruit'];
const superetteCats: ItemCategory[] = ['boisson', 'snack', 'pain', 'fruit', 'conserve', 'laitier', 'hygiene', 'divers'];

/** Produits emballés d'un rayon (hors boissons du maquis, qui ne sont pas des produits de rayon). */
const packagedIds = (cats: ItemCategory[]) =>
  ITEMS.filter((i) => cats.includes(i.category) && i.model.kind === 'shape' && !i.id.endsWith('_maquis') && i.id !== 'bissap_50cl').map(
    (i) => i.id
  );

/** Produits des vendeuses de galettes (chacune en vend 1 à 4) et des vendeuses de gnonmi (1 ou 2). */
export const STREET_VENDOR_ITEMS = ['alloco', 'claclo', 'gboson', 'galettes'] as const;
export const GNONMI_VENDOR_ITEMS = ['gnonmi', 'gboson'] as const;
/** Les repères des vendeuses de gnonmi commencent par ce préfixe. */
export const GNONMI_KEY_PREFIX = 'vendeuse_gnonmi_';
export const GARBA_ID = 'garba_abidjan';
const GARBADROME_IDS = [GARBA_ID, 'attieke', 'poisson_braise', 'carpe_grillee', 'poisson_grille', 'alloco', ...MAQUIS_DRINKS];

/** Réductions possibles : le garbadrome sur le garba seulement, la vendeuse sur tout ce qu'elle vend. */
export const GARBADROME_DISCOUNTS: readonly number[] = [50, 75];
export const VENDOR_DISCOUNTS: readonly number[] = [25, 50, 75];

export const PLACE_MENUS: Record<PlaceMenuId, PlaceMenu> = {
  maquis: { id: 'maquis', label: 'Maquis', coef: 1, itemIds: MAQUIS_IDS },
  hotel_ivoire: { id: 'hotel_ivoire', label: 'Restaurant de l’hôtel Ivoire', coef: 2, itemIds: HOTEL_IDS },
  akwaba: { id: 'akwaba', label: 'Akwaba Eats', coef: 1.3, itemIds: MAQUIS_IDS },
  boutique: { id: 'boutique', label: 'Boutique', coef: 1, itemIds: packagedIds(boutiqueCats) },
  superette: { id: 'superette', label: 'Supérette', coef: 1, itemIds: packagedIds(superetteCats) },
  garbadrome: { id: 'garbadrome', label: 'Garbadrome', coef: 1, itemIds: GARBADROME_IDS },
  vendeuse: { id: 'vendeuse', label: 'Vendeuse de rue', coef: 1, itemIds: [...STREET_VENDOR_ITEMS, 'gnonmi'] },
};

/** Repères « eat » du monde → menu à ouvrir. `home_fridge` ouvre le frigo, pas un menu d'achat. */
export const HOTSPOT_PLACE: Record<string, PlaceMenuId | 'fridge'> = {
  eat_maquis: 'maquis',
  hotel_ivoire_eat: 'hotel_ivoire',
  boutique_eat: 'boutique',
  superette_eat: 'superette',
  home_fridge: 'fridge',
  local_garba: 'garbadrome',
};

/**
 * Lieu et clé d'un repère « eat ». Les garbadromes et les vendeuses de rue sont générés par le monde :
 * leur identifiant de repère (`garbadrome_…`, `vendeuse_…`) sert de clé stable pour tirer stock et réduction.
 */
export function placeForHotspot(hotspotId: string): { placeId: PlaceMenuId | 'fridge'; key?: string } {
  if (hotspotId.startsWith('vendeuse_')) return { placeId: 'vendeuse', key: hotspotId };
  if (hotspotId.startsWith('garbadrome_') || hotspotId === 'local_garba') return { placeId: 'garbadrome', key: hotspotId };
  return { placeId: HOTSPOT_PLACE[hotspotId] ?? 'maquis' };
}

/** Hachage FNV-1a 32 bits : même résultat côté jeu et côté serveur. */
function keyHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

export interface VendorOffer {
  itemIds: string[];
  discount: number;
}

/** Stock (1 à 4 produits, surtout 1 ou 2) et réduction d'une vendeuse, fixés une fois pour toutes par sa clé. */
export function vendorOffer(key: string): VendorOffer {
  const h = keyHash(key);
  const roll = h % 100;
  const gnonmi = key.startsWith(GNONMI_KEY_PREFIX);
  const count = gnonmi ? (roll < 60 ? 1 : 2) : roll < 40 ? 1 : roll < 75 ? 2 : roll < 90 ? 3 : 4;
  const pool: string[] = gnonmi ? [...GNONMI_VENDOR_ITEMS] : [...STREET_VENDOR_ITEMS];
  let g = keyHash(`${key}#stock`);
  const itemIds: string[] = [];
  while (itemIds.length < count) {
    const idx = g % pool.length;
    itemIds.push(pool.splice(idx, 1)[0]);
    g = keyHash(`${key}#${itemIds.length}`);
  }
  const order: readonly string[] = gnonmi ? GNONMI_VENDOR_ITEMS : STREET_VENDOR_ITEMS;
  itemIds.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { itemIds, discount: VENDOR_DISCOUNTS[(h >>> 8) % VENDOR_DISCOUNTS.length] };
}

/** Réduction (%) d'un garbadrome sur le garba, fixée une fois pour toutes par sa clé. */
export function garbadromeDiscount(key: string): number {
  return GARBADROME_DISCOUNTS[(keyHash(key) >>> 8) % GARBADROME_DISCOUNTS.length];
}

/** Objets réellement vendus ici : pour une vendeuse, seulement son stock (rien sans clé). */
export function placeItemIds(placeId: PlaceMenuId, key?: string): string[] {
  if (placeId === 'vendeuse') return key ? vendorOffer(key).itemIds : [];
  return PLACE_MENUS[placeId]?.itemIds ?? [];
}

/** Réduction (%) appliquée à cet objet dans ce lieu ; 0 sans clé ou hors lieux à réduction. */
export function placeDiscount(itemId: string, placeId: PlaceMenuId, key?: string): number {
  if (!key) return 0;
  if (placeId === 'vendeuse') return vendorOffer(key).discount;
  if (placeId === 'garbadrome' && itemId === GARBA_ID) return garbadromeDiscount(key);
  return 0;
}

/**
 * Prix d'un objet dans un lieu, arrondi aux 50 F (aux 25 F au garbadrome et chez les vendeuses), minimum 50 F.
 * 0 si l'objet n'y est pas vendu. `key` : clé du garbadrome ou de la vendeuse (réduction et stock).
 */
export function placePrice(itemId: string, placeId: PlaceMenuId, key?: string): number {
  const item = ITEM_BY_ID.get(itemId);
  const place = PLACE_MENUS[placeId];
  if (!item || !place || !placeItemIds(placeId, key).includes(itemId)) return 0;
  const raw = item.price * place.coef * (1 - placeDiscount(itemId, placeId, key) / 100);
  const step = placeId === 'vendeuse' || placeId === 'garbadrome' ? 25 : 50;
  return Math.max(50, Math.round(raw / step) * step);
}
