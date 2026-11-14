import * as THREE from 'three';

/**
 * BLV — Ambiance tropicale continue (palette chaude, soleil qui voyage).
 *
 * Remplace le basculement brutal jour / coucher / nuit par une interpolation entre
 * des « images clés » horaires : nuit → aube rosée → matinée dorée → plein jour
 * → heure dorée → coucher → crépuscule → nuit. Le module est pur (aucun accès au DOM,
 * aucun accès à WebGL) : il se teste sous Node.
 *
 * Les moods discrets de `materials.ts` (day / sunset / night) restent la référence pour
 * les interrupteurs binaires (fenêtres allumées, lampadaires).
 */

export interface AmbientSample {
  /** Couleur du zénith (haut du ciel). */
  zenith: THREE.Color;
  /** Couleur de l'horizon = couleur du brouillard (raccord invisible avec le ciel). */
  horizon: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  exposure: number;
  fogDensity: number;
  /** Intensité du halo / disque solaire dans le ciel (0 = invisible). */
  skyGlow: number;
}

interface Key {
  h: number;
  zenith: number;
  horizon: number;
  sun: number;
  sunI: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  exposure: number;
  fogD: number;
  glow: number;
}

const NIGHT: Omit<Key, 'h'> = {
  zenith: 0x050a18,
  horizon: 0x0b152b,
  sun: 0x93c5fd,
  sunI: 0.42,
  hemiSky: 0x1e3a5f,
  hemiGround: 0x0f172a,
  hemiI: 0.48,
  exposure: 0.96,
  fogD: 0.0022,
  glow: 0,
};

export const AMBIENT_KEYS: readonly Key[] = [
  { h: 0, ...NIGHT },
  { h: 5.0, ...NIGHT },
  // Aube : brume rosée, soleil bas à l'est
  {
    h: 6.2,
    zenith: 0x3b3f7a,
    horizon: 0xff9a6a,
    sun: 0xffb070,
    sunI: 0.95,
    hemiSky: 0xffc9a0,
    hemiGround: 0x4a2a1a,
    hemiI: 0.55,
    exposure: 1.0,
    fogD: 0.0026,
    glow: 1.0,
  },
  // Matinée : lumière dorée, horizon laiteux
  {
    h: 7.8,
    zenith: 0x4cb2ea,
    horizon: 0xffdcae,
    sun: 0xffe9c0,
    sunI: 1.5,
    hemiSky: 0xcfeaff,
    hemiGround: 0x7c5338,
    hemiI: 0.75,
    exposure: 1.06,
    fogD: 0.0017,
    glow: 0.6,
  },
  // Plein jour : ciel franc, horizon délavé par la chaleur
  {
    h: 12,
    zenith: 0x2f9fe6,
    horizon: 0xbfe7f7,
    sun: 0xfff6dc,
    sunI: 1.7,
    hemiSky: 0xbae6fd,
    hemiGround: 0x8a5a3a,
    hemiI: 0.8,
    exposure: 1.08,
    fogD: 0.0014,
    glow: 0.35,
  },
  // Heure dorée
  {
    h: 16.3,
    zenith: 0x4f9fdc,
    horizon: 0xffcf8a,
    sun: 0xffd08a,
    sunI: 1.55,
    hemiSky: 0xffe0b0,
    hemiGround: 0x6a3a1e,
    hemiI: 0.74,
    exposure: 1.07,
    fogD: 0.0016,
    glow: 0.8,
  },
  // Coucher de soleil sur la lagune
  {
    h: 18,
    zenith: 0x6a4f9a,
    horizon: 0xf58a4a,
    sun: 0xffa04a,
    sunI: 1.35,
    hemiSky: 0xfdba74,
    hemiGround: 0x451a03,
    hemiI: 0.7,
    exposure: 1.05,
    fogD: 0.0018,
    glow: 1.2,
  },
  // Crépuscule
  {
    h: 19.3,
    zenith: 0x23285a,
    horizon: 0xb84a50,
    sun: 0xff7a50,
    sunI: 0.7,
    hemiSky: 0x7a5a8a,
    hemiGround: 0x1a1530,
    hemiI: 0.55,
    exposure: 1.0,
    fogD: 0.002,
    glow: 0.6,
  },
  { h: 20.6, ...NIGHT },
  { h: 24, ...NIGHT },
];

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Ramène n'importe quelle heure dans [0, 24[. */
export function wrapHours(hours: number): number {
  const h = hours % 24;
  return h < 0 ? h + 24 : h;
}

function mixHex(a: number, b: number, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

/** Ambiance interpolée pour une heure de jeu donnée (0–24). */
export function sampleAmbient(hours: number): AmbientSample {
  const h = wrapHours(hours);
  let i = 0;
  while (i < AMBIENT_KEYS.length - 2 && h >= AMBIENT_KEYS[i + 1].h) i++;
  const a = AMBIENT_KEYS[i];
  const b = AMBIENT_KEYS[i + 1];
  const t = smooth(THREE.MathUtils.clamp((h - a.h) / (b.h - a.h), 0, 1));
  const n = (x: number, y: number) => x + (y - x) * t;

  return {
    zenith: mixHex(a.zenith, b.zenith, t),
    horizon: mixHex(a.horizon, b.horizon, t),
    sunColor: mixHex(a.sun, b.sun, t),
    sunIntensity: n(a.sunI, b.sunI),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: n(a.hemiI, b.hemiI),
    exposure: n(a.exposure, b.exposure),
    fogDensity: n(a.fogD, b.fogD),
    skyGlow: n(a.glow, b.glow),
  };
}

/** Élévation minimale de la lumière : évite des ombres infiniment longues hors de la boîte d'ombre. */
export const MIN_SUN_Y = 0.3;

const MOON_DIR = new THREE.Vector3(-0.3, 0.85, 0.4).normalize();

/**
 * Direction (unitaire, du sol vers l'astre) du soleil ou de la lune.
 * Le soleil se lève à l'est (+x), culmine, se couche à l'ouest (-x) ; la lune prend le relais.
 */
export function sunDirection(hours: number, out = new THREE.Vector3()): THREE.Vector3 {
  const h = wrapHours(hours);
  const t = THREE.MathUtils.clamp((h - 6) / 13, 0, 1);
  const sun = out.set(Math.cos(Math.PI * t), Math.max(MIN_SUN_Y, Math.sin(Math.PI * t)), 0.35).normalize();

  let moonWeight = 0;
  if (h >= 19) moonWeight = smooth(THREE.MathUtils.clamp((h - 19) / 1.5, 0, 1));
  else if (h < 6.2) moonWeight = 1 - smooth(THREE.MathUtils.clamp((h - 5) / 1.2, 0, 1));
  if (moonWeight > 0) sun.lerp(MOON_DIR, moonWeight).normalize();
  return sun;
}

/** Part de « lumière du jour » (0 la nuit, 1 en plein jour) : pilote le scintillement de l'eau. */
export function daylight(hours: number): number {
  const h = wrapHours(hours);
  if (h < 5.5 || h > 20) return 0;
  if (h < 7) return smooth((h - 5.5) / 1.5);
  if (h < 18) return 1;
  return 1 - smooth((h - 18) / 2);
}
