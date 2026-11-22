import * as THREE from 'three';
import { MOON_DIR, moonWeight, wrapHours } from './ambiance';

/**
 * BLV — Soleil et lune du ciel (textures en atlas 4 × 2, 8 cases chacun).
 * Module PUR (aucun accès au DOM ni à WebGL) : testable sous Node.
 *
 * - Soleil : 8 images, de la plus sombre (lever / coucher) à la plus éclatante (midi), choisies selon l'heure.
 * - Lune : 8 phases (nouvelle lune, croissant, premier quartier, gibbeuse, pleine, gibbeuse, dernier quartier, croissant),
 *   choisies selon la nuit en cours ; un cycle complet dure LUNAR_CYCLE_DAYS jours de jeu.
 */

export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 2;
export const ATLAS_CELLS = ATLAS_COLS * ATLAS_ROWS;
export const LUNAR_CYCLE_DAYS = 30;
/** Hauteur minimale du soleil dessiné : il touche presque l'horizon (la lumière, elle, garde MIN_SUN_Y). */
export const SUN_SPRITE_MIN_Y = 0.05;

export interface AtlasPick {
  /** Case de départ (0 à 7). */
  a: number;
  /** Case suivante (0 à 7). */
  b: number;
  /** Fondu de a vers b, entre 0 et 1. */
  mix: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Position (0 à 7) dans la planche du soleil : 0 = lever, 4,5 = midi (le plus éclatant), 7 = coucher. */
export function sunFramePosition(hours: number): number {
  const h = wrapHours(hours);
  if (h <= 6) return 0;
  if (h <= 12.5) return (4.5 * (h - 6)) / 6.5;
  if (h <= 18.5) return 4.5 + (2.5 * (h - 12.5)) / 6;
  return 7;
}

export function sunPick(hours: number): AtlasPick {
  const pos = Math.min(ATLAS_CELLS - 1, Math.max(0, sunFramePosition(hours)));
  const a = Math.min(ATLAS_CELLS - 2, Math.floor(pos));
  return { a, b: a + 1, mix: pos - a };
}

/** Numéro de la nuit en cours : après minuit, c'est encore la nuit qui a commencé la veille. */
export function nightIndex(hours: number, dayIndex: number): number {
  const day = Math.max(0, Math.floor(Number.isFinite(dayIndex) ? dayIndex : 0));
  return wrapHours(hours) >= 12 ? day : Math.max(0, day - 1);
}

/** Phase de la lune pour une nuit donnée : image fixe, avec un court fondu vers la suivante en fin de phase. */
export function moonPick(night: number): AtlasPick {
  const cycle = ((night % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const pos = (cycle / LUNAR_CYCLE_DAYS) * ATLAS_CELLS;
  const a = Math.floor(pos) % ATLAS_CELLS;
  const frac = pos - Math.floor(pos);
  return { a, b: (a + 1) % ATLAS_CELLS, mix: smooth(Math.min(1, Math.max(0, (frac - 0.78) / 0.22))) };
}

/** Direction du soleil dessiné : sa vraie trajectoire, jusqu'à l'horizon (la lumière directionnelle reste plus haute). */
export function sunSpriteDirection(hours: number, out = new THREE.Vector3()): THREE.Vector3 {
  const h = wrapHours(hours);
  const t = THREE.MathUtils.clamp((h - 6) / 13, 0, 1);
  return out.set(Math.cos(Math.PI * t), Math.max(SUN_SPRITE_MIN_Y, Math.sin(Math.PI * t)), 0.35).normalize();
}

export function moonSpriteDirection(out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(MOON_DIR);
}

/** Force des rayons de soleil simulés selon la hauteur du soleil (0 = horizon, 1 = zénith) : plus marqués quand il est bas. */
export function sunRaysStrength(sunY: number): number {
  const low = 1 - Math.min(1, Math.max(0, sunY));
  return Math.min(0.45, 0.07 + 0.38 * Math.pow(low, 1.5));
}

export interface CelestialState {
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  /** Part « lune » du ciel (0 le jour, 1 la nuit). */
  moonMix: number;
  sunAlpha: number;
  moonAlpha: number;
  sun: AtlasPick;
  moon: AtlasPick;
}

/**
 * État complet du ciel pour une heure et un jour de jeu.
 * `visibility` (0 à 1) : voile de la météo (pluie, harmattan) qui atténue le soleil et la lune.
 */
export function celestialState(hours: number, dayIndex: number, visibility = 1): CelestialState {
  const v = THREE.MathUtils.clamp(visibility, 0, 1);
  const mw = moonWeight(hours);
  return {
    sunDir: sunSpriteDirection(hours),
    moonDir: moonSpriteDirection(),
    moonMix: mw,
    sunAlpha: (1 - mw) * v,
    moonAlpha: mw * v,
    sun: sunPick(hours),
    moon: moonPick(nightIndex(hours, dayIndex)),
  };
}
