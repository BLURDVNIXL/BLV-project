/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Logique pure d'adaptation de la rotation de la caméra (camYaw)
 * au mouvement du joueur à pied et en véhicule.
 */

export const MANUAL_CAM_COOLDOWN_S = 1.35;

export interface AdaptCameraYawParams {
  /** Angle azimutal courant de la caméra (rad). */
  camYaw: number;
  /** Pas de temps en secondes. */
  dt: number;
  /** Vrai si le joueur conduit un véhicule. */
  driving: boolean;
  /** Cap du joueur (playerRotY) ou du véhicule (vs.heading) en radians : +sin(h) sur X, +cos(h) sur Z. */
  heading: number;
  /** Vitesse linéaire : à pied = amplitude >= 0 ; en véhicule = vitesse avant signée (m/s). */
  speed: number;
  /** Vrai si le joueur est sonné/au sol. */
  knocked: boolean;
  /** Vrai tant que l'utilisateur oriente manuellement la caméra à la souris / au doigt. */
  isDragging: boolean;
  /** Temps restant (s) avant que le suivi automatique ne reprenne après un geste manuel. */
  manualCooldownS: number;
  /** Vrai à l'intérieur d'un bâtiment (suivi un peu plus doux). */
  indoor: boolean;
  /** Sensibilité du suivi automatique (0 = désactivée, 1 = normale, jusqu'à 2.5). */
  autoSensitivity?: number;
}

/** Ramène un angle dans l'intervalle (-π, π]. */
export function normalizeAngle(angle: number): number {
  let a = (angle + Math.PI) % (2 * Math.PI);
  if (a <= 0) a += 2 * Math.PI;
  return a - Math.PI;
}

/** Met à jour le délai de grâce après une rotation manuelle de la caméra. */
export function stepManualCamCooldown(cooldownS: number, isDragging: boolean, dt: number): number {
  if (isDragging) return MANUAL_CAM_COOLDOWN_S;
  if (dt <= 0) return Math.max(0, cooldownS);
  return Math.max(0, cooldownS - dt);
}

/**
 * Calcule le nouvel angle `camYaw` pour que la caméra s'oriente progressivement
 * derrière le sens de déplacement du joueur ou du véhicule.
 */
export function adaptCameraYaw(p: AdaptCameraYawParams): number {
  if (p.dt <= 0 || p.isDragging || p.manualCooldownS > 0 || p.knocked) {
    return p.camYaw;
  }
  if (!Number.isFinite(p.camYaw) || !Number.isFinite(p.heading) || !Number.isFinite(p.speed)) {
    return p.camYaw;
  }
  const autoSens = p.autoSensitivity === undefined
    ? 1
    : Number.isFinite(p.autoSensitivity)
      ? Math.max(0, Math.min(2.5, p.autoSensitivity))
      : 1;
  if (autoSens <= 0) {
    return p.camYaw;
  }

  // Dans le repère du jeu, le joueur/véhicule regarde vers (+sin(heading), +cos(heading))
  // et la caméra est placée à (+sin(camYaw), +cos(camYaw)) depuis le joueur.
  // Être derrière lui correspond donc à targetYaw = heading + PI.
  const targetYaw = p.heading + Math.PI;
  const diff = normalizeAngle(targetYaw - p.camYaw);
  if (Math.abs(diff) < 1e-4) return p.camYaw;

  if (p.driving) {
    // En voiture : alignement franc en marche avant ; immobile ou marche arrière courte -> on ne retourne pas la vue.
    if (p.speed <= 0.35) return p.camYaw;
    const speedFactor = Math.min(1, Math.max(0.35, p.speed / 5.5));
    const k = 3.8 * speedFactor * autoSens;
    return p.camYaw + diff * (1 - Math.exp(-k * p.dt));
  }

  // À pied : on n'oriente pas si le joueur est presque arrêté (ex. bloqué contre un mur).
  if (p.speed <= 0.35) return p.camYaw;

  // Si le joueur marche droit vers la caméra (ex. touche S / Reculer), on évite un retournement à 180°
  // qui ferait repartir le mouvement caméra-relatif dans le sens opposé.
  const cosDiff = Math.cos(diff);
  if (cosDiff <= -0.55) return p.camYaw;

  const dirWeight = Math.min(1, Math.max(0, (cosDiff + 0.55) / 0.55));
  const speedWeight = Math.min(1, p.speed / 4.5);
  const baseRate = p.indoor ? 1.4 : 1.95;
  const k = baseRate * dirWeight * speedWeight * autoSens;
  if (k <= 0) return p.camYaw;

  const rawStep = diff * (1 - Math.exp(-k * p.dt));
  const maxStep = (p.indoor ? 1.5 : 2.0) * autoSens * p.dt;
  const clampedStep = Math.max(-maxStep, Math.min(maxStep, rawStep));
  return p.camYaw + clampedStep;
}
