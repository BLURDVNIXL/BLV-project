/**
 * BLV — Santé : maladies, hôpitaux, gravité et durée des séjours.
 *
 * Module PUR (aucun accès au DOM, aucun tirage non déterministe) : les maladies et les durées
 * d'hospitalisation sont dérivées d'un hachage de l'identifiant du joueur et du jour de jeu,
 * ce qui les rend reproductibles et testables.
 *
 * Règles du créateur (14/11/2026) : barre de vie et dégâts ; après chaque mort non définitive on
 * réapparaît à l'hôpital, hospitalisé quelques jours selon la gravité ; maladies attrapées au hasard.
 * La mort DÉFINITIVE reste celle du GDD (faim et énergie à 0 sous le poids des dettes).
 */
import type { DiseaseId, HospitalSeverity, PlayerState, WeatherType } from '../types/game';
import { isWater } from '../world/abidjanGeography';
import { project } from '../world/geo';

export const MAX_HEALTH = 100;

/* ───────────────────────── Maladies ───────────────────────── */

export interface DiseaseInfo {
  id: DiseaseId;
  name: string;
  emoji: string;
  description: string;
  /** Durée naturelle de la maladie, en jours de jeu. */
  days: number;
  /** Points de vie perdus par jour de jeu. */
  dailyDamage: number;
  /** Multiplicateur de la fatigue (énergie qui baisse plus vite). */
  energyFactor: number;
  /** Prix du traitement en pharmacie (FCFA) : guérit tout de suite. */
  treatCost: number;
}

export const DISEASES: Record<DiseaseId, DiseaseInfo> = {
  palu: {
    id: 'palu',
    name: 'Paludisme',
    emoji: '🦟',
    description: 'Fièvre et frissons après les piqûres de moustiques. Plus fréquent à la saison des pluies.',
    days: 5,
    dailyDamage: 6,
    energyFactor: 1.5,
    treatCost: 12000,
  },
  typhoide: {
    id: 'typhoide',
    name: 'Typhoïde',
    emoji: '🤒',
    description: 'Fièvre et ventre en feu : eau ou nourriture douteuse, mauvaise hygiène.',
    days: 6,
    dailyDamage: 5,
    energyFactor: 1.35,
    treatCost: 15000,
  },
  cholera: {
    id: 'cholera',
    name: 'Choléra',
    emoji: '🚰',
    description: 'Très dangereux : il guette après les inondations, quand l’eau est sale.',
    days: 4,
    dailyDamage: 10,
    energyFactor: 1.6,
    treatCost: 25000,
  },
  grippe: {
    id: 'grippe',
    name: 'Grippe',
    emoji: '🤧',
    description: 'Toux et nez bouché, surtout avec l’harmattan. Rien de grave, mais fatigant.',
    days: 3,
    dailyDamage: 2,
    energyFactor: 1.25,
    treatCost: 4000,
  },
  intoxication: {
    id: 'intoxication',
    name: 'Intoxication alimentaire',
    emoji: '🤢',
    description: 'Un garba ou un poulet mal conservé… Le ventre se venge.',
    days: 2,
    dailyDamage: 4,
    energyFactor: 1.2,
    treatCost: 6000,
  },
};

/** Hachage déterministe (FNV-1a) d'un texte → nombre dans [0, 1[. */
export function hash01(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

export interface DiseaseContext {
  playerId: string;
  day: number;
  weather: WeatherType;
  hygiene: number;
  hunger: number;
  /** Maladies déjà actives (on n'en cumule pas plus de deux, ni deux fois la même). */
  active: DiseaseId[];
}

/**
 * Tirage quotidien d'une maladie. Retourne la maladie attrapée ce jour-là, ou null.
 * Risque de base 5 % par jour ; la pluie, l'inondation, la saleté et la faim l'augmentent.
 */
export function rollDailyDisease(ctx: DiseaseContext): DiseaseId | null {
  if (ctx.active.length >= 2) return null;

  let chance = 0.05;
  if (ctx.weather === 'pluie') chance *= 1.8;
  if (ctx.weather === 'inondation') chance *= 2.6;
  if (ctx.weather === 'harmattan') chance *= 1.5;
  if (ctx.hygiene < 35) chance *= 1.7;
  if (ctx.hunger < 25) chance *= 1.3;

  const roll = hash01(`${ctx.playerId}|maladie|${ctx.day}`);
  if (roll >= chance) return null;

  // Quelle maladie ? Poids selon la météo et l'hygiène.
  const weights: Array<[DiseaseId, number]> = [
    ['palu', ctx.weather === 'pluie' || ctx.weather === 'inondation' ? 4 : 1.5],
    ['typhoide', ctx.hygiene < 35 ? 3 : 1],
    ['cholera', ctx.weather === 'inondation' ? 4 : 0.2],
    ['grippe', ctx.weather === 'harmattan' ? 5 : 1],
    ['intoxication', ctx.hunger < 25 ? 3 : 1],
  ];
  const candidates = weights.filter(([id]) => !ctx.active.includes(id));
  const total = candidates.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;

  let pick = hash01(`${ctx.playerId}|type|${ctx.day}`) * total;
  for (const [id, w] of candidates) {
    pick -= w;
    if (pick < 0) return id;
  }
  return candidates[candidates.length - 1][0];
}

/* ───────────────────────── Dégâts et gravité ───────────────────────── */

/** Gravité d'un coup unique qui fait tomber la vie à 0. */
export function severityForHit(amount: number): HospitalSeverity {
  if (amount >= 60) return 'grave';
  if (amount >= 30) return 'moyen';
  return 'leger';
}

export const SEVERITY_LABEL: Record<HospitalSeverity, string> = {
  leger: 'léger',
  moyen: 'sérieux',
  grave: 'grave',
};

/** Durée d'hospitalisation en jours : léger 1–2, moyen 3–4, grave 5–7 (déterministe). */
export function stayDays(severity: HospitalSeverity, playerId: string, day: number): number {
  const r = hash01(`${playerId}|sejour|${day}`);
  if (severity === 'leger') return 1 + Math.floor(r * 2);
  if (severity === 'moyen') return 3 + Math.floor(r * 2);
  return 5 + Math.floor(r * 3);
}

/** Facture de base (FCFA) selon la gravité ; chaque jour d'hospitalisation en plus est facturé. */
export function hospitalBill(severity: HospitalSeverity, days: number): number {
  const base = severity === 'leger' ? 8000 : severity === 'moyen' ? 20000 : 45000;
  const perDay = severity === 'leger' ? 4000 : severity === 'moyen' ? 8000 : 12000;
  return base + perDay * days;
}

/** Perte de vie par heure de jeu quand le corps manque de tout. */
export const STARVATION_DAMAGE_PER_HOUR = 1.5;
export const EXHAUSTION_DAMAGE_PER_HOUR = 1.0;
/** Récupération naturelle (points par heure de jeu) si on mange et dort assez et qu'on n'est pas malade. */
export const REGEN_PER_HOUR = 2.4;

/** Dégâts d'un choc de véhicule à la vitesse donnée (m/s) : rien sous 6 m/s, jusqu'à 80 au-delà de 40 m/s. */
export function crashDamage(speedMps: number): number {
  if (speedMps < 6) return 0;
  return Math.min(80, Math.round((speedMps - 5) * 2.3));
}

/** Dégâts d'un piéton renversé par un véhicule (vitesse d'approche en m/s) : 8 + 4,5 par m/s, plafonné à 75. */
export function pedestrianHitDamage(approachSpeedMps: number): number {
  if (approachSpeedMps <= 0) return 0;
  return Math.min(75, Math.round(8 + approachSpeedMps * 4.5));
}

/** Dégâts d'une chute (vitesse verticale en m/s, vers le bas) : rien sous 11 m/s. */
export function fallDamage(downSpeedMps: number): number {
  if (downSpeedMps < 11) return 0;
  return Math.min(70, Math.round((downSpeedMps - 10) * 6));
}

/* ───────────────────────── Hôpitaux ───────────────────────── */

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/** Positions approximatives (cohérentes avec les quartiers de la carte). */
export const HOSPITALS: Hospital[] = [
  { id: 'chu_cocody', name: 'CHU de Cocody', lat: 5.3405, lon: -3.9855 },
  { id: 'chu_treichville', name: 'CHU de Treichville', lat: 5.2935, lon: -4.0115 },
  { id: 'chu_yopougon', name: 'CHU de Yopougon', lat: 5.333, lon: -4.069 },
  { id: 'hg_abobo', name: 'Hôpital Général d’Abobo', lat: 5.4175, lon: -4.0165 },
];

export interface SpawnPoint {
  hospital: Hospital;
  x: number;
  z: number;
}

/** Point de réveil sûr : jamais dans l'eau (on s'écarte par cercles de plus en plus larges). */
function safeSpawn(x: number, z: number): { x: number; z: number } {
  if (!isWater({ x, z })) return { x, z };
  for (const r of [15, 30, 60, 100, 160]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      if (!isWater({ x: px, z: pz })) return { x: px, z: pz };
    }
  }
  return { x, z };
}

/** Hôpital le plus proche de la position du joueur (mètres du monde). */
export function nearestHospital(x: number, z: number): SpawnPoint {
  let best: Hospital = HOSPITALS[0];
  let bestD = Infinity;
  for (const h of HOSPITALS) {
    const p = project(h.lat, h.lon);
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  const p = project(best.lat, best.lon);
  const s = safeSpawn(p.x, p.z);
  return { hospital: best, x: s.x, z: s.z };
}

/* ───────────────────────── Sauvegardes anciennes ───────────────────────── */

/**
 * Les parties enregistrées avant l'arrivée de la santé n'ont pas ces champs : on les complète
 * (vie pleine, aucune maladie). Sans effet sur un état déjà complet (même objet renvoyé).
 */
export function ensureHealth(state: PlayerState): PlayerState {
  if (
    typeof state.health === 'number' &&
    Array.isArray(state.diseases) &&
    typeof state.hospitalizations === 'number' &&
    state.hospitalVisit !== undefined
  ) {
    return state;
  }
  return {
    ...state,
    health: typeof state.health === 'number' ? state.health : MAX_HEALTH,
    diseases: Array.isArray(state.diseases) ? state.diseases : [],
    hospitalizations: typeof state.hospitalizations === 'number' ? state.hospitalizations : 0,
    hospitalVisit: state.hospitalVisit ?? null,
  };
}
