/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Commandes « maintenues » de la manette (CONTEXT.md §4) : Shift / □ = sprint,
 * Espace / ◯ = frein à main (en voiture), Espace / tap □ = saut (à pied).
 * Passées par référence (pas de re-rendu React à 60 images/s).
 */

export interface HeldControls {
  sprint: boolean;
  handbrake: boolean;
  /** Compteur incrémenté à chaque demande de saut (détection de front montant). */
  jumpCount: number;
}

export const createHeldControls = (): HeldControls => ({ sprint: false, handbrake: false, jumpCount: 0 });


/** Calcule l'accélération envoyée au moteur physique : positif = marche avant (+Z local), 0 si calé. */
export const computeVehicleAccel = (fwd: number, engineStalled: boolean): number => (engineStalled ? 0 : fwd);
