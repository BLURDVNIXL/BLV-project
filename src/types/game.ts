/**
 * BLV
 * Types et interfaces complets de la simulation de vie urbaine à Abidjan
 */

import type { HomeType } from '../world/abidjanGeography';

export type { HomeType };

export type GameScreenState = 'title' | 'roulette' | 'playing' | 'paused' | 'gameover';

export type DestinyRarity = 'commune' | 'rare' | 'epique' | 'legendaire';

export type SapeOutfitId = 'standard' | 'wax_bazin' | 'costume_italien' | 'madrid_25' | 'haillons';

export type VehicleModelType =
  | 'woro_woro'
  | 'gbaka'
  | 'berline_citadine'
  | 'bmw_m_series'
  | 'rolls_royce_phantom'
  | 'supercar_madrid'
  | 'police_plcc';


export interface CribUpgrades {
  splitClim: boolean;
  bafflesMaquis: boolean;
  tv4k: boolean;
  canapeCuir: boolean;
}

export interface Destiny {
  id: string;
  name: string;
  subtitle: string;
  rarity: DestinyRarity;
  startingCash: number;
  startingStar: number; // 1-100
  housing: string;
  homeType: HomeType;
  district: string;
  districtId: string;
  spawnX: number;
  spawnZ: number;
  vehicle: VehicleModelType | null;
  secondaryVehicle?: VehicleModelType;
  perk: string;
  description: string;
  quote: string;
  color: string;
  // Specific Destiny Mechanics flags
  isEasterEgg?: boolean;
  englishLock?: boolean; // Golden Boy: locked in English + 30-day Platinum timer
  koidioBonus?: boolean; // INPolytec student: 50,000 FCFA every 3 in-game days
  mysticBaraka?: boolean; // Poignon: 95/100 star chance + street pickups
  plccTarget?: boolean; // Brouteur: Cybercrime police hunting
  realMadridSuperstar?: boolean; // Yannis Diomandé: fans + football academy
  blackMarketAccess?: boolean; // Djassaman: clandestine shop + permanent 1 star
  shadowBaron?: boolean; // Baron: 3 stars in Plateau + laundering
  rehabJourney?: boolean; // Rescapé: 7-day sobriety redemption trophy
  secretAddressBook?: boolean; // Politicien Déchu: clear roadblocks/wanted stars
  weeklyGuaranteedSalary?: number; // Classe Moyenne d'Angré
}

export interface Needs {
  hunger: number; // 0-100
  energy: number; // 0-100
  hygiene: number; // 0-100
  bladder: number; // 0-100
  envy: number; // 0-100 ("Jauge d'Envie Universelle")
}

export type WeatherType = 'soleil' | 'pluie' | 'inondation' | 'harmattan';


export interface FactionReputation {
  syndicat: number; // Syndicat des Transporteurs (0-100)
  ordre: number; // Ordre Républicain (0-100)
  jetset: number; // Jet-Set du Showbiz (0-100)
}

export type MissionConditionKind =
  | 'visit_district'
  | 'work_shifts'
  | 'eat_meals'
  | 'bank_balance'
  | 'star_threshold'
  | 'crib_upgrade'
  | 'clear_police'
  | 'clean_days'
  | 'academy_level';

export interface MissionStep {
  id: string;
  title: string;
  description: string;
  targetDistrictId: string;
  targetDistrictName: string;
  conditionKind: MissionConditionKind;
  conditionTarget: number;
  rewardCash: number;
  rewardStar: number;
  rewardEnvy: number;
}

export interface DestinyMission {
  id: string;
  destinyId: string;
  title: string;
  summary: string;
  steps: MissionStep[];
  finalTrophy: string;
}

export interface MissionProgress {
  missionId: string;
  stepIndex: number;
  workCount: number;
  eatCount: number;
  completed: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  hungerRestore: number;
  envyRestore: number;
  buffName: string;
  description: string;
  icon: string;
}

/** Un emplacement du sac ou du frigo : un objet du catalogue (src/core/items.ts) et sa quantité. */
export interface InventorySlot {
  itemId: string;
  qty: number;
}

export interface GameEventLog {
  id: string;
  time: string;
  message: string;
  type: 'neutral' | 'success' | 'danger' | 'love' | 'work' | 'star';
}

/** Genre choisi à la création du personnage. */
export type PlayerGender = 'homme' | 'femme';

/** Pseudonyme et genre saisis avant la roulette. Aucune donnée d'état civil. */
export interface PlayerProfile {
  name: string;
  gender: PlayerGender;
}

export interface PlayerState {
  playerId: string;
  /** Pseudonyme choisi par le joueur (facultatif pour les anciennes sauvegardes). */
  playerName?: string;
  gender?: PlayerGender;
  sessionToken?: string;
  destiny: Destiny;
  cash: number;
  bankCash: number;
  debt: number;
  star: number; // 1-100 (Chance / Karma)
  needs: Needs;
  isDepressed: boolean; // True when envy <= 0 -> 50% work efficiency
  policeWanted: number; // 0 - 5 stars
  daysLived: number;
  gameTimeHours: number; // 0 - 23.99
  goldenBoyDaysLeft: number; // 30 days Platinum card timer
  cleanDaysStreak: number; // For Rescapé redemption trophy
  redemptionTrophyUnlocked: boolean;
  yannisAcademyLevel: number; // 0 - 3
  engineStalled: boolean; // Caused by flood water on low cars
  weather: WeatherType;
  factions: FactionReputation;
  sapeOutfit: SapeOutfitId;
  ownedOutfits: SapeOutfitId[];
  cribUpgrades: CribUpgrades;
  homeLotId: string | null;
  activeMission: MissionProgress;
  completedMissions: string[];
  /** Sac : 12 emplacements. Absent des anciennes sauvegardes (= vide). */
  inventory?: InventorySlot[];
  /** Frigo de la maison : 24 emplacements. Absent des anciennes sauvegardes (= vide). */
  fridge?: InventorySlot[];
  /** Objet en main : null (mains vides), 'main' (la main, pour frapper) ou l'id d'un objet du sac. */
  heldItemId?: string | null;
  isDriving: boolean;
  currentVehicleId: string | null;
  isGameOver: boolean;
  gameOverReason: string;
  logs: GameEventLog[];
  language: 'fr' | 'en';
}
