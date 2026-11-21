import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_DESTINIES } from './destinies';
import { createInitialPlayerState } from './simulation';
import { normalizeSessionState } from './sessionValidation';
import {
  ALL_ITEMS,
  GARBA_ID,
  GNONMI_VENDOR_ITEMS,
  GARBADROME_DISCOUNTS,
  PLACE_MENUS,
  STREET_VENDOR_ITEMS,
  VENDOR_DISCOUNTS,
  getItem,
  garbadromeDiscount,
  placeForHotspot,
  placeItemIds,
  placePrice,
  vendorOffer,
  HOTSPOT_PLACE,
} from './items';
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

test('échelle de prix : maquis 100 à 3 000 F, Akwaba Eats ≤ 3 900 F, hôtel Ivoire ≤ 6 000 F, aucun objet de base au-delà de 3 000 F', () => {
  for (const item of ALL_ITEMS) assert.ok(item.price <= 3000, `${item.id} : ${item.price} F de base (max 3 000)`);
  for (const [placeId, max] of [['maquis', 3000], ['akwaba', 3900], ['hotel_ivoire', 6000]] as const) {
    for (const id of PLACE_MENUS[placeId].itemIds) {
      const price = placePrice(id, placeId);
      assert.ok(price >= 100 && price <= max, `${placeId} / ${id} : ${price} F (attendu 100 à ${max})`);
    }
  }
});

test('effets des plats : un plat cher rassasie plus, restent dans les bornes', () => {
  const small = getItem('attieke')!.effects.hunger!;
  const big = getItem('poulet_braise_entier')!.effects.hunger!;
  assert.ok(small >= 5 && big > small && big <= 80, `faim ${small} → ${big}`);
});

test('garbadrome : réduction fixe (50 ou 75 %) sur le garba seulement', () => {
  for (let i = 0; i < 40; i++) {
    const key = `garbadrome_${i}_${i * 7}`;
    const d = garbadromeDiscount(key);
    assert.ok(GARBADROME_DISCOUNTS.includes(d));
    assert.equal(garbadromeDiscount(key), d, 'stable pour une même clé');
    const base = getItem(GARBA_ID)!.price;
    assert.equal(placePrice(GARBA_ID, 'garbadrome', key), Math.round((base * (1 - d / 100)) / 25) * 25);
    assert.equal(placePrice('attieke', 'garbadrome', key), placePrice('attieke', 'maquis'));
  }
  const seen = new Set(Array.from({ length: 60 }, (_, i) => garbadromeDiscount(`garbadrome_${i}_x`)));
  assert.equal(seen.size, GARBADROME_DISCOUNTS.length, 'les deux réductions apparaissent');
  assert.equal(placePrice(GARBA_ID, 'garbadrome'), getItem(GARBA_ID)!.price, 'sans clé : prix plein');
});

test('vendeuses de rue : 1 à 4 produits, une réduction de 25/50/75 %, stable et variée', () => {
  const counts = new Set<number>();
  const discounts = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const key = `vendeuse_${i}_${i * 13}`;
    const o = vendorOffer(key);
    assert.deepEqual(vendorOffer(key), o, 'stable');
    assert.ok(o.itemIds.length >= 1 && o.itemIds.length <= 4);
    assert.equal(new Set(o.itemIds).size, o.itemIds.length);
    for (const id of o.itemIds) {
      assert.ok((STREET_VENDOR_ITEMS as readonly string[]).includes(id));
      assert.ok(placePrice(id, 'vendeuse', key) >= 50);
      assert.ok(placePrice(id, 'vendeuse', key) <= getItem(id)!.price || getItem(id)!.price < 50);
    }
    assert.ok(VENDOR_DISCOUNTS.includes(o.discount));
    counts.add(o.itemIds.length);
    discounts.add(o.discount);
  }
  assert.equal(counts.size, 4);
  assert.equal(discounts.size, 3);
  assert.equal(placePrice('alloco', 'vendeuse'), 0, 'sans clé : rien à vendre');
  assert.deepEqual(placeItemIds('vendeuse'), []);
  const key = 'vendeuse_1_1';
  const missing = STREET_VENDOR_ITEMS.find((id) => !vendorOffer(key).itemIds.includes(id));
  if (missing) assert.equal(placePrice(missing, 'vendeuse', key), 0, 'produit hors stock');
});

test('vendeuses de gnonmi : 1 ou 2 produits (gnonmi, gboson), réduction fixe', () => {
  const counts = new Set<number>();
  for (let i = 0; i < 100; i++) {
    const key = `vendeuse_gnonmi_${i}_${i * 3}`;
    const o = vendorOffer(key);
    assert.deepEqual(vendorOffer(key), o);
    assert.ok(o.itemIds.length >= 1 && o.itemIds.length <= 2);
    for (const id of o.itemIds) {
      assert.ok((GNONMI_VENDOR_ITEMS as readonly string[]).includes(id));
      assert.ok(placePrice(id, 'vendeuse', key) > 0);
    }
    assert.ok(VENDOR_DISCOUNTS.includes(o.discount));
    counts.add(o.itemIds.length);
  }
  assert.equal(counts.size, 2);
  assert.deepEqual(placeForHotspot('vendeuse_gnonmi_1_2'), { placeId: 'vendeuse', key: 'vendeuse_gnonmi_1_2' });
});

test('achat chez une vendeuse : prix réduit débité, faim calculée sur le prix de base', () => {
  const key = 'vendeuse_7_7';
  const id = vendorOffer(key).itemIds[0];
  const price = placePrice(id, 'vendeuse', key);
  const s0 = rich();
  const s1 = buyItem(s0, id, 'vendeuse', key);
  assert.equal(s0.cash - s1.cash, price);
  assert.equal(countOf(bagOf(s1), id), 1);
  assert.equal(buyItem(s0, id, 'vendeuse'), s0, 'sans clé : refusé');
  assert.ok(getItem(id)!.price >= price || price === 50);
});

test('produits de rue : hors menus maquis, Akwaba et hôtel ; repères garbadrome et vendeuse reconnus', () => {
  for (const id of ['claclo', 'gboson', 'galettes', 'gnonmi']) {
    assert.ok(getItem(id));
    for (const place of ['maquis', 'akwaba', 'hotel_ivoire'] as const) assert.ok(!PLACE_MENUS[place].itemIds.includes(id), `${id} dans ${place}`);
  }
  assert.ok(PLACE_MENUS.maquis.itemIds.includes('alloco'));
  assert.deepEqual(placeForHotspot('vendeuse_12_34'), { placeId: 'vendeuse', key: 'vendeuse_12_34' });
  assert.deepEqual(placeForHotspot('garbadrome_5_6'), { placeId: 'garbadrome', key: 'garbadrome_5_6' });
  assert.deepEqual(placeForHotspot('local_garba'), { placeId: 'garbadrome', key: 'local_garba' });
  assert.deepEqual(placeForHotspot('eat_maquis'), { placeId: 'maquis' });
});
