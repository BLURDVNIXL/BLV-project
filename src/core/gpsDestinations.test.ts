import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGpsDestinations,
  normalizeSearch,
  searchGpsDestinations,
  splitPlaceLabel,
  type GpsSource,
} from './gpsDestinations';
import { ABIDJAN_GPS_ZONES } from './destinies';
import { DISTRICTS, districtAt } from '../world/abidjanGeography';
import { project } from '../world/geo';
import { nearestRoadPoint } from '../world/routing';

const plateau = DISTRICTS.find((d) => d.id === 'plateau')!;
const pPlateau = project(plateau.center.lat, plateau.center.lon);

const source: GpsSource = {
  places: [
    { id: 'door_hopital_chu_cocody', label: '🏥 Entrer — CHU de Cocody', x: pPlateau.x + 10, z: pPlateau.z + 10 },
    { id: 'lycee_caiman', label: '🐊 Lycée Classique (Concours Caïman)', x: pPlateau.x - 20, z: pPlateau.z },
    { id: 'eat_maquis', label: '🍗 Maquis Le Temple · Rue Princesse', x: pPlateau.x, z: pPlateau.z + 30 },
  ],
  homePorch: { x: pPlateau.x + 50, z: pPlateau.z - 40 },
  fromDistrictId: 'plateau',
};

test('splitPlaceLabel : icône, nom sans « Entrer — » ni précision entre parenthèses', () => {
  assert.deepEqual(splitPlaceLabel('🏥 Entrer — CHU de Cocody'), { icon: '🏥', name: 'CHU de Cocody' });
  assert.deepEqual(splitPlaceLabel('🍗 Entrer — Maquis Le Temple · Rue Princesse'), { icon: '🍗', name: 'Maquis Le Temple · Rue Princesse' });
  assert.deepEqual(splitPlaceLabel("🛒 Entrer — Marché d'Adjamé"), { icon: '🛒', name: "Marché d'Adjamé" });
  assert.deepEqual(splitPlaceLabel('🐊 Lycée Classique (Concours Caïman)'), { icon: '🐊', name: 'Lycée Classique' });
  assert.equal(splitPlaceLabel('Sans icône').icon, '📍');
});

test('normalizeSearch : sans accents, majuscules ni apostrophes', () => {
  assert.equal(normalizeSearch('  Hôpital  de COCODY '), 'hopital de cocody');
  assert.equal(normalizeSearch("Marché d’Adjamé"), 'marche d adjame');
});

test('ordre : Chez moi, lieux, repères, communes', () => {
  const list = buildGpsDestinations(source);
  const kinds = list.map((d) => d.kind);
  const order = ['home', 'place', 'landmark', 'district'];
  const ranks = kinds.map((k) => order.indexOf(k));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(list[0].kind, 'home');
  assert.equal(list.filter((d) => d.kind === 'place').length, source.places.length);
  assert.equal(list.filter((d) => d.kind === 'district').length, ABIDJAN_GPS_ZONES.length);
  assert.ok(list.filter((d) => d.kind === 'landmark').length >= 7);
});

test('sans maison posée : pas de « Chez moi »', () => {
  const list = buildGpsDestinations({ ...source, homePorch: null });
  assert.ok(!list.some((d) => d.kind === 'home'));
});

test('identifiants uniques', () => {
  const ids = buildGpsDestinations(source).map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('dépôt : lieu et maison au point fourni, repère sur la route, commune au centre', () => {
  const list = buildGpsDestinations(source);
  const home = list.find((d) => d.kind === 'home')!;
  assert.deepEqual({ x: home.x, z: home.z }, source.homePorch);
  const hosp = list.find((d) => d.id === 'place:door_hopital_chu_cocody')!;
  assert.equal(hosp.x, source.places[0].x);
  assert.equal(hosp.z, source.places[0].z);
  for (const lm of list.filter((d) => d.kind === 'landmark')) {
    const onRoad = nearestRoadPoint({ x: lm.x, z: lm.z });
    assert.ok(onRoad.dist < 0.01, `${lm.name} doit être déposé sur un grand axe`);
  }
  const zone = list.find((d) => d.id === 'zone:cocody')!;
  const z = ABIDJAN_GPS_ZONES.find((g) => g.id === 'cocody')!;
  assert.deepEqual({ x: zone.x, z: zone.z }, { x: z.x, z: z.z });
});

test('districtId : celui du point de dépôt (les missions « va dans tel quartier » restent valides)', () => {
  for (const d of buildGpsDestinations(source)) {
    assert.equal(d.districtId, districtAt({ x: d.x, z: d.z }).id, d.name);
    assert.ok(DISTRICTS.some((x) => x.id === d.districtId), `commune inconnue pour ${d.name}`);
  }
  for (const zone of buildGpsDestinations(source).filter((d) => d.kind === 'district')) {
    // une commune du GPS garde son identifiant historique : c'est lui que les missions attendent
    assert.equal(zone.districtId, zone.id.replace('zone:', ''));
  }
});

test('recherche : vide = tout, sans accents, plusieurs mots, aucun résultat', () => {
  const list = buildGpsDestinations(source);
  assert.equal(searchGpsDestinations(list, '').length, list.length);
  assert.equal(searchGpsDestinations(list, '   ').length, list.length);

  const chu = searchGpsDestinations(list, 'CHU cocody');
  assert.ok(chu.some((d) => d.id === 'place:door_hopital_chu_cocody'));

  const lycee = searchGpsDestinations(list, 'lycee classique');
  assert.ok(lycee.some((d) => d.id === 'place:lycee_caiman'));
  assert.ok(lycee.every((d) => normalizeSearch(`${d.name} ${d.commune} ${d.desc}`).includes('lycee')));

  assert.ok(searchGpsDestinations(list, 'marche adjame').some((d) => d.id === 'lm:marche_adjame'));
  assert.ok(searchGpsDestinations(list, 'Aéroport').some((d) => d.id === 'lm:airport'));
  assert.equal(searchGpsDestinations(list, 'zzzzqx').length, 0);
});

test('la recherche garde l’ordre d’affichage', () => {
  const list = buildGpsDestinations(source);
  const found = searchGpsDestinations(list, 'cocody');
  const idx = found.map((d) => list.indexOf(d));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
});
