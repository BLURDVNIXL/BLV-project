/**
 * BLV — Coup de poing : choix de la cible et constantes de réglage (pur, testable sans navigateur).
 * Le coup touche le PNJ le plus proche dans un cône devant le joueur, à l'impact (bras tendu).
 */

/** Portée du coup (m), du centre du joueur au centre du PNJ. */
export const PUNCH_RANGE = 1.5;
/** Demi-angle du cône devant le joueur (rad) : ±60°. */
export const PUNCH_CONE_HALF_ANGLE = Math.PI / 3;
/** Délai entre le début du geste et l'impact (s) : bras tendu au milieu des 0,4 s d'animation. */
export const PUNCH_IMPACT_DELAY = 0.18;
/** Durée pendant laquelle le PNJ touché est au sol (s). */
export const HIT_STUN_SECONDS = 1.6;
/** Poussée au moment de l'impact : durée (s) et vitesse (m/s). */
export const HIT_PUSH_SECONDS = 0.18;
export const HIT_PUSH_SPEED = 4.5;

export interface PunchCandidate {
  x: number;
  z: number;
}

/**
 * Index du candidat touché, ou -1. `dirX/dirZ` : direction du regard du joueur (vecteur unitaire).
 * Le plus proche dans la portée et le cône gagne ; un PNJ collé au joueur est toujours touché.
 */
export function pickPunchTarget(
  px: number,
  pz: number,
  dirX: number,
  dirZ: number,
  candidates: readonly PunchCandidate[],
): number {
  const cosMin = Math.cos(PUNCH_CONE_HALF_ANGLE);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const dx = candidates[i].x - px;
    const dz = candidates[i].z - pz;
    const d = Math.hypot(dx, dz);
    if (d > PUNCH_RANGE) continue;
    if (d > 0.35 && (dx * dirX + dz * dirZ) / d < cosMin) continue;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
