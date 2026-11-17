/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Destinations de l'application GPS de MyOS : « Chez moi », lieux, repères de la ville et communes.
 *
 * Module pur (aucune dépendance au rendu 3D) : il est donc testable seul.
 * Il décide aussi OÙ le joueur est déposé : devant l'entrée pour un lieu, au perron pour « Chez moi »,
 * sur le grand axe le plus proche pour un repère, au centre pour une commune.
 */

import { ABIDJAN_GPS_ZONES } from './destinies';
import { districtAt, projected } from '../world/abidjanGeography';
import { nearestRoadPoint } from '../world/routing';
import type { Vec2 } from '../world/geo';

export type GpsKind = 'home' | 'place' | 'landmark' | 'district';

export interface GpsDestination {
  /** Identifiant stable (préfixé selon le type : `home`, `place:…`, `lm:…`, `zone:…`). */
  id: string;
  kind: GpsKind;
  icon: string;
  name: string;
  /** Nom court de la commune où se trouve le point de dépôt. */
  commune: string;
  /** Ligne d'aide affichée sous le nom. */
  desc: string;
  /** Point où le joueur est déposé (mètres de jeu). */
  x: number;
  z: number;
  /** Commune du point de dépôt : sert à valider les étapes de mission « va à tel quartier ». */
  districtId: string;
}

/** Ce que le jeu fournit au GPS : les lieux fixes de la ville et le perron de la maison du joueur. */
export interface GpsSource {
  places: Array<{ id: string; label: string; x: number; z: number }>;
  homePorch: Vec2 | null;
  /** Zone où se trouve le joueur : sert à calculer le prix de la course (même commune ou non). */
  fromDistrictId: string | null;
}

const LANDMARK_ICON: Record<string, string> = {
  airport: '✈️',
  port: '⚓',
  stadium: '🏟️',
  worship: '⛪',
  market: '🛒',
  tower: '🏙️',
  university: '🎓',
  hotel: '🏨',
};

/** Nom de commune sans précision entre parenthèses ni sous-quartier (« Cocody · Riviera » → « Cocody »). */
export const shortCommune = (name: string): string => name.replace(/\s*\(.*$/, '').replace(/\s*·.*$/, '').trim();

/**
 * « 🏥 Entrer — CHU de Cocody » → icône 🏥, nom « CHU de Cocody ».
 * Retire le préfixe « Entrer — » et la précision entre parenthèses.
 */
export function splitPlaceLabel(label: string): { icon: string; name: string } {
  const m = label.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  const icon = m ? m[1] : '📍';
  const name = label
    .slice(m ? m[0].length : 0)
    .replace(/^Entrer\s*—\s*/, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
  return { icon, name: name || label };
}

/** Minuscules, sans accents ni ponctuation superflue : « Hôpital » et « hopital » se valent. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const communeAt = (p: Vec2): { id: string; name: string } => {
  const d = districtAt(p);
  return { id: d.id, name: shortCommune(d.name) };
};

/**
 * Toutes les destinations, dans l'ordre d'affichage : Chez moi, lieux, repères, communes.
 * Les lieux sont déjà posés devant leur entrée dans le monde ; les repères sont ramenés sur la route.
 */
export function buildGpsDestinations(source: GpsSource): GpsDestination[] {
  const list: GpsDestination[] = [];

  if (source.homePorch) {
    const c = communeAt(source.homePorch);
    list.push({
      id: 'home',
      kind: 'home',
      icon: '🏠',
      name: 'Chez moi',
      commune: c.name,
      desc: `Ton perron · ${c.name}`,
      x: source.homePorch.x,
      z: source.homePorch.z,
      districtId: c.id,
    });
  }

  for (const p of source.places) {
    const { icon, name } = splitPlaceLabel(p.label);
    const c = communeAt(p);
    list.push({
      id: `place:${p.id}`,
      kind: 'place',
      icon,
      name,
      commune: c.name,
      desc: `Devant l'entrée · ${c.name}`,
      x: p.x,
      z: p.z,
      districtId: c.id,
    });
  }

  for (const lm of projected.landmarks) {
    const drop = nearestRoadPoint(lm.p).at;
    const c = communeAt(drop);
    list.push({
      id: `lm:${lm.l.id}`,
      kind: 'landmark',
      icon: LANDMARK_ICON[lm.l.kind] ?? '📍',
      name: lm.l.name,
      commune: c.name,
      desc: `Sur la route la plus proche · ${c.name}`,
      x: drop.x,
      z: drop.z,
      districtId: c.id,
    });
  }

  for (const z of ABIDJAN_GPS_ZONES) {
    list.push({
      id: `zone:${z.id}`,
      kind: 'district',
      icon: '🏘️',
      name: z.name,
      commune: shortCommune(z.name),
      desc: z.desc,
      x: z.x,
      z: z.z,
      districtId: z.id,
    });
  }

  return list;
}

/**
 * Filtre par recherche : chaque mot saisi doit se retrouver dans le nom, la commune ou l'aide.
 * Sans accents ni majuscules. Une recherche vide renvoie la liste entière, dans le même ordre.
 */
export function searchGpsDestinations(list: GpsDestination[], query: string): GpsDestination[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return list;
  return list.filter((d) => {
    const hay = normalizeSearch(`${d.name} ${d.commune} ${d.desc}`);
    return words.every((w) => hay.includes(w));
  });
}
