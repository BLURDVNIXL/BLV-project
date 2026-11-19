/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Mairies et commissariats d'Abidjan : 1 mairie et 2 commissariats par commune urbaine.
 * La Mairie du Plateau conserve son identifiant historique `mairie` dans `city.ts` ;
 * les 12 autres mairies et les 26 commissariats sont déclarés ici.
 */

export interface CivicSite {
  id: string;
  districtId: string;
  name: string;
  lat: number;
  lon: number;
  w: number;
  d: number;
  h: number;
}

/** 12 mairies complémentaires (Le Plateau possède déjà `mairie` dans `SPECIALS`). */
export const MAIRIE_SITES: CivicSite[] = [
  { id: 'mairie_adjame', districtId: 'adjame', name: 'Mairie d’Adjamé', lat: 5.35506, lon: -4.02594, w: 18, d: 12, h: 11 },
  { id: 'mairie_attecoube', districtId: 'attecoube', name: 'Mairie d’Attécoubé', lat: 5.33942, lon: -4.04979, w: 18, d: 12, h: 11 },
  { id: 'mairie_yopougon', districtId: 'yopougon', name: 'Mairie de Yopougon', lat: 5.33415, lon: -4.07621, w: 18, d: 12, h: 11 },
  { id: 'mairie_abobo', districtId: 'abobo', name: 'Mairie d’Abobo', lat: 5.4181, lon: -4.01792, w: 18, d: 12, h: 11 },
  { id: 'mairie_cocody', districtId: 'cocody', name: 'Mairie de Cocody', lat: 5.36128, lon: -3.99697, w: 18, d: 12, h: 11 },
  { id: 'mairie_riviera', districtId: 'riviera', name: 'Mairie annexe de la Riviera', lat: 5.34587, lon: -3.9576, w: 18, d: 12, h: 11 },
  { id: 'mairie_treichville', districtId: 'treichville', name: 'Mairie de Treichville', lat: 5.31125, lon: -4.01395, w: 18, d: 12, h: 11 },
  { id: 'mairie_marcory', districtId: 'marcory', name: 'Mairie de Marcory', lat: 5.29889, lon: -3.98427, w: 18, d: 12, h: 11 },
  { id: 'mairie_koumassi', districtId: 'koumassi', name: 'Mairie de Koumassi', lat: 5.30092, lon: -3.95102, w: 18, d: 12, h: 11 },
  { id: 'mairie_port_bouet', districtId: 'port_bouet', name: 'Mairie de Port-Bouët', lat: 5.261, lon: -3.94654, w: 18, d: 12, h: 11 },
  { id: 'mairie_grand_bassam', districtId: 'grand_bassam', name: 'Mairie de Grand-Bassam', lat: 5.25355, lon: -3.90317, w: 18, d: 12, h: 11 },
  { id: 'mairie_vridi', districtId: 'vridi', name: 'Mairie annexe de Vridi', lat: 5.25199, lon: -3.99698, w: 18, d: 12, h: 11 },
];

/** 2 commissariats par commune urbaine (26 sites au total). */
export const COMMISSARIAT_SITES: CivicSite[] = [
  { id: 'commissariat_plateau_1', districtId: 'plateau', name: 'Commissariat du Plateau Sud', lat: 5.32162, lon: -4.02168, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_plateau_2', districtId: 'plateau', name: 'Commissariat du Plateau Nord', lat: 5.32904, lon: -4.02304, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_adjame_1', districtId: 'adjame', name: 'Commissariat d’Adjamé Centre', lat: 5.35882, lon: -4.02219, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_adjame_2', districtId: 'adjame', name: 'Commissariat d’Adjamé Liberté', lat: 5.3607, lon: -4.02969, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_attecoube_1', districtId: 'attecoube', name: 'Commissariat d’Attécoubé Sud', lat: 5.33522, lon: -4.04671, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_attecoube_2', districtId: 'attecoube', name: 'Commissariat d’Attécoubé Banco', lat: 5.34066, lon: -4.04473, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_yopougon_1', districtId: 'yopougon', name: 'Commissariat de Yopougon Nord', lat: 5.34035, lon: -4.07512, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_yopougon_2', districtId: 'yopougon', name: 'Commissariat de Yopougon Selmer', lat: 5.32929, lon: -4.07282, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_abobo_1', districtId: 'abobo', name: 'Commissariat d’Abobo Centre', lat: 5.41371, lon: -4.01424, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_abobo_2', districtId: 'abobo', name: 'Commissariat d’Abobo Gare', lat: 5.41222, lon: -4.02046, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_cocody_1', districtId: 'cocody', name: 'Commissariat de Cocody Deux-Plateaux', lat: 5.35546, lon: -3.99234, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_cocody_2', districtId: 'cocody', name: 'Commissariat de Cocody Vallon', lat: 5.36267, lon: -3.99047, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_riviera_1', districtId: 'riviera', name: 'Commissariat de la Riviera Palmeraie', lat: 5.35068, lon: -3.95935, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_riviera_2', districtId: 'riviera', name: 'Commissariat de Riviera Golf', lat: 5.34085, lon: -3.96392, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_treichville_1', districtId: 'treichville', name: 'Commissariat de Treichville Est', lat: 5.30705, lon: -4.00976, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_treichville_2', districtId: 'treichville', name: 'Commissariat de Treichville Port', lat: 5.30705, lon: -4.01813, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_marcory_1', districtId: 'marcory', name: 'Commissariat de Marcory Centre', lat: 5.30349, lon: -3.98156, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_marcory_2', districtId: 'marcory', name: 'Commissariat de Marcory Zone 4', lat: 5.29856, lon: -3.97952, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_koumassi_1', districtId: 'koumassi', name: 'Commissariat de Koumassi Nord', lat: 5.29723, lon: -3.94693, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_koumassi_2', districtId: 'koumassi', name: 'Commissariat de Koumassi Remblais', lat: 5.29497, lon: -3.95266, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_port_bouet_1', districtId: 'port_bouet', name: 'Commissariat de Port-Bouët Centre', lat: 5.26555, lon: -3.94292, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_port_bouet_2', districtId: 'port_bouet', name: 'Commissariat de Port-Bouët Plage', lat: 5.25991, lon: -3.94146, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_grand_bassam_1', districtId: 'grand_bassam', name: 'Commissariat de Grand-Bassam Centre', lat: 5.25006, lon: -3.89812, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_grand_bassam_2', districtId: 'grand_bassam', name: 'Commissariat de Grand-Bassam Littoral', lat: 5.24811, lon: -3.90393, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_vridi_1', districtId: 'vridi', name: 'Commissariat de Vridi Est', lat: 5.24801, lon: -3.99302, w: 16, d: 11, h: 8.5 },
  { id: 'commissariat_vridi_2', districtId: 'vridi', name: 'Commissariat de Vridi Canal', lat: 5.24801, lon: -4.00095, w: 16, d: 11, h: 8.5 },
];

export const isMairieId = (id: string | undefined): boolean =>
  id === 'mairie' || (!!id && id.startsWith('mairie_'));

export const isCommissariatId = (id: string | undefined): boolean =>
  !!id && id.startsWith('commissariat_');
