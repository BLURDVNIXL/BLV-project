import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_DESTINIES } from './destinies';
import { createInitialPlayerState } from './simulation';
import { normalizeSessionState } from './sessionValidation';
import { ALL_ITEMS, PLACE_MENUS, getItem, placePrice, HOTSPOT_PLACE } from './items';
import {
  BAG_SLOTS,
  HAND_ID,
  MAX_STACK,
  bagOf,
  buyItem,
  countOf,
  fridgeOf,
  heldOf,
  holdItem,
  moveToFridge,
  takeFromFridge,
  useHeldItem,
} from './inventory';

const identity = { playerId: 'p', sessionToken: 't', homeLotId: 'lot' };
const rich = () => ({ ...createInitialPlayerState(ALL_DESTINIES[0], 'p', 't'), cash: 1_000_000 });

test('catalogue : ids uniques, prix et effets valides, menus sans doublon et sans id inconnu', () => {
  const ids = new Set<string>();
  for (const item of ALL_ITEMS) {
    assert.ok(!ids.has(item.id), `id en double : ${item.id}`);
    ids.add(item.id);
    assert.ok(item.price > 0, `prix ${item.id}`);
    assert.ok(item.name.length > 0 && item.icon.length > 0);
  }
  for (const place of Object.values(PLACE_MENUS)) {
    assert.equal(new Set(place.itemIds).size, place.itemIds.length, `doublon dans ${place.id}`);
    assert.ok(place.itemIds.length > 0);
    for (const id of place.itemIds) assert.ok(getItem(id), `${place.id} : objet inconnu ${id}`);
  }
  for (const target of Object.values(HOTSPOT_PLACE)) assert.ok(target === 'fridge' || PLACE_MENUS[target]);
});

test('prix par lieu : maquis ×1, Akwaba Eats ×1,3, hôtel Ivoire ×2 ; hors menu = 0', () => {
  const base = getItem('poulet_braise_demi')!.price;
  assert.equal(placePrice('poulet_braise_demi', 'maquis'), base);
  assert.equal(placePrice('poulet_braise_demi', 'akwaba'), Math.round((base * 1.3) / 50) * 50);
  assert.equal(placePrice('steak_poivre', 'hotel_ivoire'), getItem('steak_poivre')!.price * 2);
  assert.equal(placePrice('steak_poivre', 'maquis'), 0);
  assert.equal(placePrice('eau_50cl', 'maquis') > 0, true);
  assert.equal(placePrice('savon_creme', 'boutique'), 0);
  assert.ok(placePrice('savon_creme', 'superette') > 0);
});

test('acheter ajoute au sac et débite ; sac plein et fonds insuffisants refusés', () => {
  let s = rich();
  s = buyItem(s, 'eau_50cl', 'boutique');
  assert.equal(countOf(bagOf(s), 'eau_50cl'), 1);
  assert.equal(s.cash, 1_000_000 - placePrice('eau_50cl', 'boutique'));

  const poor = { ...createInitialPlayerState(ALL_DESTINIES[0], 'p', 't'), cash: 0 };
  assert.equal(bagOf(buyItem(poor, 'eau_50cl', 'boutique')).length, 0);

  let full = rich();
  const ids = PLACE_MENUS.superette.itemIds.slice(0, BAG_SLOTS + 1);
  for (const id of ids) full = buyItem(full, id, 'superette');
  assert.equal(bagOf(full).length, BAG_SLOTS);

  let stack = rich();
  for (let i = 0; i < MAX_STACK + 2; i++) stack = buyItem(stack, 'eau_50cl', 'boutique');
  assert.equal(countOf(bagOf(stack), 'eau_50cl'), MAX_STACK);
});

test('un seul objet en main ; mains vides par défaut ; la main est un choix du sac', () => {
  let s = rich();
  assert.equal(heldOf(s), null);
  s = buyItem(buyItem(s, 'eau_50cl', 'boutique'), 'baguette', 'boutique');
  s = holdItem(s, 'eau_50cl');
  s = holdItem(s, 'baguette');
  assert.equal(heldOf(s), 'baguette');
  assert.equal(heldOf(holdItem(s, 'objet_inconnu')), 'baguette');
  assert.equal(heldOf(holdItem(s, HAND_ID)), HAND_ID);
  assert.equal(heldOf(holdItem(s, null)), null);
});

test('utiliser l’objet en main : effets, −1 exemplaire, rangé quand le dernier est consommé', () => {
  let s = { ...rich(), needs: { hunger: 30, energy: 30, hygiene: 30, bladder: 80, envy: 30 } };
  s = buyItem(s, 'baguette', 'boutique');
  s = holdItem(s, 'baguette');
  const eaten = s.activeMission.eatCount;
  s = useHeldItem(s);
  assert.equal(s.needs.hunger, 30 + (getItem('baguette')!.effects.hunger ?? 0));
  assert.equal(countOf(bagOf(s), 'baguette'), 0);
  assert.equal(heldOf(s), null);
  assert.equal(s.activeMission.eatCount, eaten + 1);

  s = buyItem(buyItem(s, 'canette_energisant', 'boutique'), 'canette_energisant', 'boutique');
  s = holdItem(s, 'canette_energisant');
  s = useHeldItem(s);
  assert.equal(heldOf(s), 'canette_energisant');
  assert.equal(countOf(bagOf(s), 'canette_energisant'), 1);
  assert.ok(s.needs.energy > 30 && s.needs.bladder < 80);

  // le parapluie ne se consomme pas, la main n'utilise rien
  s = buyItem(s, 'parapluie_noir', 'superette');
  s = holdItem(s, 'parapluie_noir');
  assert.equal(countOf(bagOf(useHeldItem(s)), 'parapluie_noir'), 1);
  assert.equal(useHeldItem(holdItem(s, HAND_ID)).needs.hunger, s.needs.hunger);
});

test('frigo : ranger et reprendre, objet en main rangé avec le dernier exemplaire', () => {
  let s = rich();
  s = holdItem(buyItem(s, 'yaourt_fraise', 'superette'), 'yaourt_fraise');
  s = moveToFridge(s, 'yaourt_fraise');
  assert.equal(countOf(fridgeOf(s), 'yaourt_fraise'), 1);
  assert.equal(bagOf(s).length, 0);
  assert.equal(heldOf(s), null);
  s = takeFromFridge(s, 'yaourt_fraise');
  assert.equal(countOf(bagOf(s), 'yaourt_fraise'), 1);
  assert.equal(fridgeOf(s).length, 0);
});

test('sauvegarde serveur : l’inventaire est conservé, validé, et les anciennes sauvegardes restent valides', () => {
  let s = rich();
  s = holdItem(buyItem(s, 'baguette', 'boutique'), 'baguette');
  const ok = normalizeSessionState(s, identity);
  assert.ok(ok);
  assert.equal(countOf(bagOf(ok), 'baguette'), 1);
  assert.equal(heldOf(ok), 'baguette');

  const old = { ...createInitialPlayerState(ALL_DESTINIES[0], 'p', 't') } as Record<string, unknown>;
  delete old.inventory;
  delete old.fridge;
  delete old.heldItemId;
  const migrated = normalizeSessionState(old, identity);
  assert.ok(migrated);
  assert.deepEqual(bagOf(migrated), []);
  assert.equal(heldOf(migrated), null);

  assert.equal(normalizeSessionState({ ...s, inventory: [{ itemId: 'baguette', qty: 99 }] }, identity), null);
  assert.equal(normalizeSessionState({ ...s, inventory: 'x' }, identity), null);
  const tooMany = Array.from({ length: BAG_SLOTS + 1 }, () => ({ itemId: 'baguette', qty: 1 }));
  assert.equal(normalizeSessionState({ ...s, inventory: tooMany }, identity), null);
  // objet en main absent du sac : remis à mains vides ; objet inconnu du catalogue : ignoré
  assert.equal(heldOf(normalizeSessionState({ ...s, heldItemId: 'eau_50cl' }, identity)!), null);
  const unknown = normalizeSessionState({ ...s, inventory: [{ itemId: 'supprime', qty: 1 }] }, identity);
  assert.deepEqual(bagOf(unknown!), []);
});
