/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Types & Définitions de Données Maîtresses
 */

export type DestinyRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'easter_egg';

export interface DestinyClass {
  id: string;
  name: string;
  englishName?: string;
  rarity: DestinyRarity;
  commune: string;
  tagline: string;
  description: string;
  englishDescription?: string;
  startingCash: number;
  homeType: 'squat' | 'chambre_cour' | 'studio' | 'deux_pieces' | 'trois_pieces' | 'duplex_mer' | 'villa_ambassade' | 'bunker';
  homeLabel: string;
  vehicles: string[];
  luckStat: number; // 1-100 ("L'Étoile" ou "La Baraka")
  perks: string[];
  icon: string;
  badge?: string;
  // Specific Easter Eggs Flags
  isEnglishLocked?: boolean; // Golden Boy Easter egg
  isYannisDiomande?: boolean; // Real Madrid Superstar
  isPoignon?: boolean; // Ultimate Baraka 95/100
  isINPHB?: boolean; // Gets "Koidio" scholarship
  isBrouteur?: boolean; // PLCC police heat
  isDjassaman?: boolean; // Black market access
  isBaron?: boolean; // 3 stars police permanent
}

export type SchoolBadgeId = 'caiman' | 'alysma' | 'alex';

export interface SchoolBadge {
  id: SchoolBadgeId;
  name: string;
  institution: string;
  commune: string;
  icon: string;
  color: string;
  description: string;
  history: string;
  perks: string[];
}

export interface CharacterProfile {
  firstName: string;
  lastName: string;
  nickname: string;
  gender: 'm' | 'f';
  skinTone: string;
  hairStyle: 'court' | 'afro' | 'tresses' | 'rase' | 'degrade';
  outfitColor: string;
  outfitStyle: 'streetwear' | 'wax_traditionnel' | 'costume_cadre' | 'sport_madrid' | 'choco_chic';
  traits: string[];
  dream: string;
}

export interface PlayerState {
  character: CharacterProfile;
  destiny: DestinyClass;
  cash: number; // in FCFA
  bankBalance: number;
  unlimitedCashUntilDay?: number; // for Golden Boy 30 days
  luckStar: number; // 1-100 ("L'Étoile")
  policeHeat: number; // 0 to 5 stars
  criminalRecord: number; // points de casier
  currentCommune: string;
  currentLocationName: string;
  dayCount: number;
  inGameMinute: number; // 0 to 1439
  weather: 'sunny' | 'rain_tropical' | 'flood_inondation' | 'harmattan';
  badges: SchoolBadgeId[];
  degrees: string[];
  relationshipStatus: 'celibataire' | 'en_drague' | 'en_couple' | 'fiance' | 'marie';
  partnerName?: string;
  partnerAffinity: number; // 0-100%
  // Needs (0-100)
  needs: {
    faim: number;
    energie: number;
    hygiene: number;
    vessie: number;
    social: number;
    loisirs: number;
  };
  // The Universal Craving Gauge (0-100)
  envieJauge: number;
  envieBuff?: {
    name: string;
    expiresAtMin: number;
  };
  isEnglishLocked: boolean;
  selectedRadioId: string;
  isRadioPlaying: boolean;
  radioVolume: number;
  tontineJoined: boolean;
  tontineBalance: number;
}

export interface RadioStation {
  id: string;
  name: string;
  frequency: string;
  tagline: string;
  genre: string;
  streamUrl: string;
  logo: string;
  isLive: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  faimGain: number;
  envieGain: number;
  description: string;
  icon: string;
  communeFavorite: string;
}
