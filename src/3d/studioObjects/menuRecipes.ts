/**
 * BLV — Recettes des plats du menu (assemblage de composants du STUDIO-OBJECT).
 * Les 10 recettes d'exemple du studio (assets/phase3) ont priorité ; celles-ci couvrent le reste du menu.
 * Un plat = contenant + base + protéine + garnitures (≤ 1 garniture : plafond de 800 triangles).
 */

import type { BlvDishRecipe } from './types';

type Row = [id: string, contenant: string, base: string | null, proteine: string | null, garniture?: string];

const ROWS: Row[] = [
  // Volailles et viandes
  ['poulet_braise_demi', 'assiette', 'attieke', 'demi_poulet', 'oignons_tomates'],
  ['poulet_braise_entier', 'planche', 'alloco', 'poulet_entier', 'oignons_tomates'],
  ['poulet_saute', 'assiette', 'riz_blanc', 'poulet_morceaux', 'oignons_tomates'],
  ['kedjenou_poulet_bicyclette', 'pot_kedjenou', null, 'poulet_entier'],
  ['poulet_braise_kedjenou', 'pot_kedjenou', null, 'demi_poulet'],
  ['pintade_braisee_kedjenou', 'pot_kedjenou', null, 'pintade'],
  ['kedjenou_pintade', 'pot_kedjenou', null, 'pintade'],
  ['lapin_braise_kedjenou', 'pot_kedjenou', null, 'lapin_agouti'],
  ['lapin_braise_demi', 'assiette', 'attieke', 'lapin_agouti', 'oignons_tomates'],
  ['kedjenou_lapin', 'pot_kedjenou', null, 'lapin_agouti'],
  ['steak_boeuf_grille', 'assiette', 'frites', 'steak_entrecote'],
  ['steak_poivre', 'assiette', 'frites', 'steak_entrecote', 'sauce'],
  ['steak_hache', 'assiette', 'riz_blanc', 'steak_entrecote'],
  ['entrecote_boeuf', 'assiette', 'frites', 'steak_entrecote'],
  ['brochette_filet_boeuf', 'cornet_plat', null, 'brochette'],
  ['filet_soukouya', 'assiette', 'attieke', 'steak_entrecote', 'oignons_tomates'],
  ['brochette_soukouya', 'cornet_plat', null, 'brochette'],
  ['cotelette_porc', 'assiette', 'frites', 'cotelette'],
  ['mouton_braise', 'planche', 'attieke', 'mouton_braise', 'oignons_tomates'],
  ['kedjenou_mouton', 'pot_kedjenou', null, 'mouton_braise'],
  ['brochette_mouton', 'cornet_plat', null, 'brochette'],
  ['agouti_braise', 'planche', 'alloco', 'lapin_agouti', 'piment'],
  // Poissons
  ['carpe_braisee_petite', 'assiette', 'alloco', 'poisson_ovale', 'piment'],
  ['carpe_braisee_grande', 'planche', 'alloco', 'poisson_ovale', 'piment'],
  ['dorade_braisee', 'planche', 'alloco', 'poisson_ovale', 'oignons_tomates'],
  ['sole_braisee', 'planche', 'attieke', 'poisson_plat', 'salade_citron'],
  ['capitaine_braise', 'planche', 'alloco', 'poisson_allonge', 'piment'],
  ['machoiron_braise_petit', 'assiette', 'attieke', 'poisson_allonge', 'piment'],
  ['machoiron_braise_grand', 'planche', 'attieke', 'poisson_allonge', 'piment'],
  ['poisson_braise', 'planche', 'alloco', 'poisson_ovale', 'piment'],
  ['carpe_grillee', 'assiette', 'attieke', 'poisson_ovale', 'salade_citron'],
  ['dorade_grillee', 'planche', 'attieke', 'poisson_ovale', 'salade_citron'],
  ['sole_grillee', 'planche', 'riz_blanc', 'poisson_plat', 'salade_citron'],
  ['poisson_grille', 'assiette', 'attieke', 'poisson_ovale', 'salade_citron'],
  ['capitaine_saute', 'assiette', 'riz_blanc', 'poisson_allonge', 'oignons_tomates'],
  ['kedjenou_poisson', 'pot_kedjenou', null, 'poisson_ovale'],
  ['poisson_braise_kedjenou', 'pot_kedjenou', null, 'poisson_ovale'],
  // Crustacés et fruits de mer
  ['crevettes_sautees', 'assiette', 'riz_blanc', 'crevettes_gambas', 'persil'],
  ['crevettes_braisees', 'assiette', 'attieke', 'crevettes_gambas', 'salade_citron'],
  ['crevettes_brochette', 'cornet_plat', null, 'brochette'],
  ['ecrevisses', 'assiette', null, 'crevettes_gambas', 'piment'],
  ['brochette_ecrevisses', 'cornet_plat', null, 'brochette'],
  ['gambas', 'assiette', 'riz_blanc', 'crevettes_gambas', 'persil'],
  ['langouste', 'planche', null, 'langouste', 'salade_citron'],
  ['assiette_crevettes', 'assiette', 'riz_exotique', 'crevettes_gambas'],
  ['assiette_ecrevisses', 'assiette', 'riz_blanc', 'crevettes_gambas', 'piment'],
  ['assiette_gambas', 'assiette', 'riz_exotique', 'crevettes_gambas', 'persil'],
  ['assiette_pecheur', 'planche', 'riz_blanc', 'langouste', 'salade_citron'],
  // Escargots et autres spécialités
  ['escargots_grilles', 'assiette', 'alloco', 'escargots', 'piment'],
  ['brochette_escargots', 'cornet_plat', null, 'brochette'],
  ['kedjenou_escargots', 'pot_kedjenou', null, 'escargots'],
  ['brochette_gesiers', 'cornet_plat', null, 'gesiers'],
  ['gesiers_sautes', 'assiette', 'frites', 'gesiers', 'oignons_tomates'],
  ['saucisses_sautees', 'assiette', 'frites', 'merguez_saucisse', 'oignons_tomates'],
  ['merguez_grillees', 'assiette', 'frites', 'merguez_saucisse'],
  // Plats africains
  ['kedjenou_ecrevisses', 'pot_kedjenou', null, 'crevettes_gambas'],
  ['attieke_braise_kedjenou', 'pot_kedjenou', 'attieke', 'demi_poulet'],
  ['attieke', 'assiette', 'attieke', null, 'oignons_tomates'],
  ['attieke_boeuf', 'assiette', 'attieke', 'steak_entrecote', 'sauce'],
  // Accompagnements
  ['riz_blanc', 'bol', 'riz_blanc', null],
  ['riz_exotique', 'bol', 'riz_exotique', null],
  ['riz_exotique_boeuf', 'assiette', 'riz_exotique', 'steak_entrecote'],
  ['alloco', 'cornet_plat', 'alloco', null],
  ['frites', 'cornet_plat', 'frites', null],
  ['patates_douces_frites', 'cornet_plat', 'patate_douce_frite', null],
  // Barquettes et entrées
  ['accras_poisson', 'cornet_plat', null, 'accras'],
  ['petite_barquette', 'barquette', 'alloco', 'accras'],
  ['grande_barquette', 'barquette', 'riz_exotique', 'poulet_morceaux'],
  ['canapes_froids', 'planche', null, 'canapes'],
  ['canapes_chauds', 'planche', null, 'canapes'],
  // Traiteur
  ['gigot_agneau', 'planche', null, 'gigot'],
  ['mechoui_farci', 'planche', null, 'mechoui'],
  ['cochon_de_lait', 'planche', null, 'cochon_de_lait'],
  ['mini_patisserie', 'planche', null, 'mini_patisserie'],
];

/** Variantes de couleur des composants partagés (canapés chauds : toasts dorés et garniture rouge). */
const PROTEIN_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  canapes_chauds: { primary: '#D9A441', secondary: '#F2C14E', accent: '#B8321F' },
};

export const MENU_RECIPES: Record<string, BlvDishRecipe> = Object.fromEntries(
  ROWS.map(([id, contenant, base, proteine, garniture], i) => [
    id,
    {
      id,
      nom: id,
      contenant,
      base,
      proteine,
      garnitures: garniture ? [garniture] : [],
      ...(PROTEIN_COLORS[id] ? { couleurs: { proteine: PROTEIN_COLORS[id] } } : {}),
      size: 1.0,
      seed: 2000 + i,
    } satisfies BlvDishRecipe,
  ])
);
