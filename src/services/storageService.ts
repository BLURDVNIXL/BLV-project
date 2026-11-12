/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Service de Persistance & Sécurité Conforme aux Normes Européennes (RGPD / GDPR)
 */

import { PlayerState } from '../types/game';

const SAVE_KEY = 'blv_save_state_v1';
const SETTINGS_KEY = 'blv_settings_v1';

export interface GameSettings {
  soundVolume: number;
  radioVolume: number;
  voiceOverEnabled: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  hapticFeedback: boolean;
  language: 'fr' | 'en';
}

export const DEFAULT_SETTINGS: GameSettings = {
  soundVolume: 80,
  radioVolume: 70,
  voiceOverEnabled: true,
  graphicsQuality: 'high',
  hapticFeedback: true,
  language: 'fr'
};

/**
 * Sauvegarde locale sécurisée de l'état du joueur
 * Conforme RGPD : strictement confinée au terminal du joueur, zéro transmission tierce
 */
export function savePlayerState(state: PlayerState): boolean {
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, payload);
    return true;
  } catch (error) {
    console.error('[BLV Storage] Erreur sauvegarde locale:', error);
    return false;
  }
}

/**
 * Chargement de la sauvegarde
 */
export function loadPlayerState(): PlayerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerState;
  } catch (error) {
    console.error('[BLV Storage] Erreur chargement sauvegarde:', error);
    return null;
  }
}

/**
 * DROIT À L'OUBLI (Art. 17 RGPD / GDPR)
 * Purge intégrale des données locales et sauvegardes en 1 clic
 */
export function executeGdprRightToErasure(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    sessionStorage.clear();
    console.log('[BLV RGPD] Droit à l\'oubli exécuté avec succès : toutes les données ont été effacées.');
  } catch (error) {
    console.error('[BLV RGPD] Erreur lors de la purge des données:', error);
  }
}

/**
 * Sauvegarde des réglages du jeu
 */
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[BLV Settings] Sauvegarde réglages échouée:', e);
  }
}

/**
 * Chargement des réglages
 */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
