import { PlayerGender, PlayerProfile } from '../types/game';

/** Clé locale du pseudonyme et du genre (préfixe `blv_` : effacée par le bouton « Droit à l'oubli »). */
export const PROFILE_KEY = 'blv_profile';
export const NAME_MIN = 2;
export const NAME_MAX = 18;

/** Nettoie un pseudonyme : pas de caractères de contrôle ni de chevrons, espaces simplifiés, 18 caractères maximum. */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function isGender(v: unknown): v is PlayerGender {
  return v === 'homme' || v === 'femme';
}

/** Genre valide ou `undefined` (valeur inconnue, ancienne sauvegarde, message réseau mal formé). */
export function parseGender(v: unknown): PlayerGender | undefined {
  return isGender(v) ? v : undefined;
}

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { name?: unknown; gender?: unknown };
    const name = typeof data.name === 'string' ? sanitizeName(data.name) : '';
    if (name.length < NAME_MIN || !isGender(data.gender)) return null;
    return { name, gender: data.gender };
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* stockage indisponible : le profil vaut pour la session */
  }
}
