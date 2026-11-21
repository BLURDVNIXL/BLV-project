/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * RÉGLAGES DE DISTANCE : distance d'affichage (chunks chargés, plan lointain, brouillard) et distance de simulation
 * (PNJ et animaux : apparition, retrait, IA allégée, population). Module PUR (nombres seulement) : testable sans navigateur.
 *
 * Chaque réglage est « Auto » ou un niveau fixe 0..3. En Auto, un régulateur (`DistanceGovernor`) part du niveau adapté
 * à l'appareil, baisse vite quand la fluidité s'effondre, remonte lentement quand il y a de la marge, et n'oscille pas.
 */

export type DistanceLevel = 0 | 1 | 2 | 3;
export type DistancePref = 'auto' | DistanceLevel;
export type QualityTier = 'high' | 'mobile' | 'low';

export interface DistanceLevels {
  render: DistanceLevel;
  sim: DistanceLevel;
}

export const MAX_DISTANCE_LEVEL: DistanceLevel = 3;
/** Niveau d'origine du jeu sur ordinateur (rayon de 4 chunks, distances des PNJ et animaux inchangées). */
export const REFERENCE_LEVEL: DistanceLevel = 2;

export const DISTANCE_LEVEL_LABELS: Record<'fr' | 'en', readonly string[]> = {
  fr: ['Courte', 'Moyenne', 'Longue', 'Très longue'],
  en: ['Short', 'Medium', 'Long', 'Very long'],
};

export function clampLevel(n: number): DistanceLevel {
  if (!Number.isFinite(n)) return REFERENCE_LEVEL;
  return Math.min(MAX_DISTANCE_LEVEL, Math.max(0, Math.round(n))) as DistanceLevel;
}

/** Lit la valeur stockée (`localStorage`) : tout ce qui n'est pas un niveau 0..3 valide vaut Auto. */
export function parseDistancePref(raw: string | null | undefined): DistancePref {
  if (raw === null || raw === undefined || raw === '' || raw === 'auto') return 'auto';
  if (!/^[0-3]$/.test(raw)) return 'auto';
  return Number(raw) as DistanceLevel;
}

export function serializeDistancePref(pref: DistancePref): string {
  return pref === 'auto' ? 'auto' : String(pref);
}

// ───────────── Distance d'affichage ─────────────

/** Rayon de chargement (en chunks de 64 m) par niveau. Le niveau 2 est le rayon d'origine du jeu sur ordinateur. */
const RENDER_RADII: readonly number[] = [2, 3, 4, 5];
const REFERENCE_RADIUS = RENDER_RADII[REFERENCE_LEVEL];
const REFERENCE_FAR = 720;

export interface RenderDistanceParams {
  /** Rayon de chargement des chunks. */
  radius: number;
  /** Plan lointain de la caméra (m). */
  far: number;
  /** Multiplicateur de densité du brouillard : le bord du monde chargé reste noyé comme au niveau de référence. */
  fogScale: number;
}

export function renderDistanceParams(level: DistanceLevel): RenderDistanceParams {
  const radius = RENDER_RADII[level];
  // Le bord du monde chargé est à (rayon + 0,5) chunks du joueur : plan lointain et brouillard suivent ce bord.
  const ratio = (radius + 0.5) / (REFERENCE_RADIUS + 0.5);
  return { radius, far: Math.round(REFERENCE_FAR * ratio), fogScale: 1 / ratio };
}

// ───────────── Distance de simulation ─────────────

/** Échelle appliquée aux distances de vie des rues (PNJ, animaux) par niveau. Le niveau 2 est l'original. */
const SIM_SCALES: readonly number[] = [0.6, 0.8, 1, 1.25];

export function simDistanceScale(level: DistanceLevel): number {
  return SIM_SCALES[level];
}

// ───────────── Adaptation à l'appareil ─────────────

export interface TierLevels {
  /** Niveaux de départ du mode Auto. */
  base: DistanceLevels;
  /** Niveaux au-delà desquels le mode Auto ne remonte pas (les niveaux supérieurs restent possibles à la main). */
  ceiling: DistanceLevels;
  /** Niveaux en dessous desquels le mode Auto ne descend pas. */
  floor: DistanceLevels;
  /** Niveaux maximaux autorisés à la main. */
  cap: DistanceLevels;
}

export function tierLevels(tier: QualityTier): TierLevels {
  switch (tier) {
    case 'high':
      return { base: { render: 2, sim: 2 }, ceiling: { render: 2, sim: 2 }, floor: { render: 1, sim: 0 }, cap: { render: 3, sim: 3 } };
    case 'mobile':
      return { base: { render: 1, sim: 1 }, ceiling: { render: 2, sim: 2 }, floor: { render: 1, sim: 0 }, cap: { render: 3, sim: 3 } };
    case 'low':
      // Rendu logiciel : pas de régulateur (la cadence est déjà bridée), niveaux modestes et plafonnés.
      return { base: { render: 1, sim: 1 }, ceiling: { render: 1, sim: 1 }, floor: { render: 1, sim: 0 }, cap: { render: 1, sim: 1 } };
  }
}

/** Niveaux effectifs pour des préférences données ; `auto` donne le niveau courant du régulateur (ou la base). */
export function resolveLevels(
  render: DistancePref,
  sim: DistancePref,
  tier: QualityTier,
  autoLevels: DistanceLevels = tierLevels(tier).base
): DistanceLevels {
  const t = tierLevels(tier);
  return {
    render: render === 'auto' ? autoLevels.render : (Math.min(render, t.cap.render) as DistanceLevel),
    sim: sim === 'auto' ? autoLevels.sim : (Math.min(sim, t.cap.sim) as DistanceLevel),
  };
}

// ───────────── Régulateur du mode Auto ─────────────

export interface GovernorConfig {
  start: DistanceLevels;
  floor: DistanceLevels;
  ceiling: DistanceLevels;
}

/** Fenêtre de mesure (ms) et nombre minimal d'images pour qu'elle compte. */
const WINDOW_MS = 4000;
const MIN_SAMPLES = 30;
/** 90 % des images plus rapides que ce seuil = fluide (≈ 60 Hz avec de la marge). */
const GOOD_P90_MS = 19;
/** Au-dessus : la cadence est tombée sous ≈ 36 images/s pour une image sur dix. */
const BAD_P90_MS = 28;
/** Au-dessus : effondrement, une seule fenêtre suffit pour baisser. */
const SEVERE_P90_MS = 45;
/** Fenêtres lentes consécutives avant de baisser. */
const BAD_WINDOWS_TO_DOWNGRADE = 2;
/** Fenêtres fluides consécutives avant de remonter (6 × 4 s = 24 s). */
const GOOD_WINDOWS_TO_UPGRADE = 6;
/** Pause avant la première remontée possible après une baisse, doublée à chaque baisse (plafonnée). */
const INITIAL_UPGRADE_LOCK_MS = 60_000;
const MAX_UPGRADE_LOCK_MS = 300_000;
/** Une baisse dans ce délai après une remontée prouve que le niveau remonté est trop lourd : on le plafonne. */
const REGRET_MS = 45_000;
/** Un intervalle plus long est une pause (onglet masqué, chargement) et non une mesure. */
const MAX_VALID_FRAME_MS = 250;

export class DistanceGovernor {
  private render: DistanceLevel;
  private sim: DistanceLevel;
  private readonly floor: DistanceLevels;
  private readonly ceiling: DistanceLevels;

  private samples: number[] = [];
  private windowStartMs = -1;
  private skipWindows = 1;
  private badWindows = 0;
  private goodWindows = 0;
  private lockUntilMs = 0;
  private lockMs = INITIAL_UPGRADE_LOCK_MS;
  private lastUpgrade: { dim: 'render' | 'sim'; atMs: number } | null = null;

  constructor(cfg: GovernorConfig) {
    this.floor = { ...cfg.floor };
    this.ceiling = { ...cfg.ceiling };
    this.render = clampLevel(Math.min(this.ceiling.render, Math.max(this.floor.render, cfg.start.render)));
    this.sim = clampLevel(Math.min(this.ceiling.sim, Math.max(this.floor.sim, cfg.start.sim)));
  }

  get levels(): DistanceLevels {
    return { render: this.render, sim: this.sim };
  }

  /** Oublie la fenêtre en cours (changement de scène, intérieur, chargement). */
  resetWindow(): void {
    this.samples.length = 0;
    this.windowStartMs = -1;
  }

  /**
   * Fournit la durée d'une image. Renvoie les nouveaux niveaux quand ils changent, sinon `null`.
   * `nowMs` : horloge monotone (ms).
   */
  push(nowMs: number, frameMs: number): DistanceLevels | null {
    if (!(frameMs > 0) || frameMs > MAX_VALID_FRAME_MS) {
      this.resetWindow();
      return null;
    }
    if (this.windowStartMs < 0) this.windowStartMs = nowMs;
    this.samples.push(frameMs);
    if (nowMs - this.windowStartMs < WINDOW_MS || this.samples.length < MIN_SAMPLES) return null;

    const sorted = this.samples.slice().sort((a, b) => a - b);
    const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
    this.resetWindow();

    // Fenêtre qui suit un changement de niveau : chargement des chunks en cours, mesure faussée.
    if (this.skipWindows > 0) {
      this.skipWindows--;
      return null;
    }

    if (p90 > BAD_P90_MS) {
      this.goodWindows = 0;
      this.badWindows++;
      if (p90 > SEVERE_P90_MS || this.badWindows >= BAD_WINDOWS_TO_DOWNGRADE) return this.downgrade(nowMs);
      return null;
    }
    this.badWindows = 0;
    if (p90 < GOOD_P90_MS) {
      this.goodWindows++;
      if (this.goodWindows >= GOOD_WINDOWS_TO_UPGRADE && nowMs >= this.lockUntilMs) return this.upgrade(nowMs);
    } else {
      this.goodWindows = 0;
    }
    return null;
  }

  private downgrade(nowMs: number): DistanceLevels | null {
    this.badWindows = 0;
    this.goodWindows = 0;
    let dim: 'render' | 'sim';
    if (this.lastUpgrade && nowMs - this.lastUpgrade.atMs < REGRET_MS && this[this.lastUpgrade.dim] > this.floor[this.lastUpgrade.dim]) {
      // Remontée aussitôt regrettée : on l'annule et ce niveau, trop lourd pour l'appareil, n'est plus retenté.
      dim = this.lastUpgrade.dim;
      this.ceiling[dim] = (this[dim] - 1) as DistanceLevel;
    } else {
      // Le niveau le plus haut baisse d'abord ; à égalité, la distance d'affichage.
      const canRender = this.render > this.floor.render;
      const canSim = this.sim > this.floor.sim;
      if (!canRender && !canSim) return null;
      dim = canRender && (this.render >= this.sim || !canSim) ? 'render' : 'sim';
    }
    this[dim] = (this[dim] - 1) as DistanceLevel;
    this.lastUpgrade = null;
    this.skipWindows = 1;
    this.lockUntilMs = nowMs + this.lockMs;
    this.lockMs = Math.min(this.lockMs * 2, MAX_UPGRADE_LOCK_MS);
    return this.levels;
  }

  private upgrade(nowMs: number): DistanceLevels | null {
    this.goodWindows = 0;
    const canRender = this.render < this.ceiling.render;
    const canSim = this.sim < this.ceiling.sim;
    if (!canRender && !canSim) return null;
    // Le niveau le plus bas remonte d'abord ; à égalité, la simulation.
    const dim: 'render' | 'sim' = canSim && (this.sim < this.render || !canRender) ? 'sim' : 'render';
    this[dim] = (this[dim] + 1) as DistanceLevel;
    this.lastUpgrade = { dim, atMs: nowMs };
    this.skipWindows = 1;
    return this.levels;
  }
}
