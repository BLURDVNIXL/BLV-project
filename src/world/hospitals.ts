/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Les 4 hôpitaux d'Abidjan : emplacements APPROXIMATIFS (à ajuster sur la carte), emprise du bâtiment
 * et identifiants de repères. Ils deviennent de vrais bâtiments « héros » (voir city.ts → SPECIALS)
 * avec une porte d'entrée qui mène à l'intérieur partagé (voir interiors.ts).
 */

export interface HospitalSite {
  /** Identifiant de repère (préfixe `hopital_`, reconnu par chunkMesh pour ne pas dessiner de boîte générique). */
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Emprise souhaitée (m) ; réduite si le bloc de rues est plus petit. */
  w: number;
  d: number;
  h: number;
}

export const HOSPITAL_SITES: HospitalSite[] = [
  { id: 'hopital_cocody', name: 'CHU de Cocody', lat: 5.3405, lon: -3.9855, w: 34, d: 20, h: 13 },
  { id: 'hopital_treichville', name: 'CHU de Treichville', lat: 5.2935, lon: -4.0115, w: 32, d: 20, h: 13 },
  { id: 'hopital_yopougon', name: 'CHU de Yopougon', lat: 5.333, lon: -4.069, w: 32, d: 20, h: 13 },
  { id: 'hopital_abobo', name: 'Hôpital Général d’Abobo', lat: 5.4175, lon: -4.0165, w: 32, d: 20, h: 12 }
];

export const isHospitalId = (id: string | undefined): boolean => !!id && id.startsWith('hopital_');
