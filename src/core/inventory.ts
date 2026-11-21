/**
 * BLV — Sac, frigo et objet en main (logique pure, sans DOM ni Three.js).
 * Partagé par le client (réponse immédiate) et le serveur (économie validée) : mêmes fonctions des deux côtés.
 *
 * Règles : sac de 12 emplacements (un objet par emplacement, jusqu'à 9 exemplaires), frigo de 24.
 * Un seul objet en main à la fois ; « la main » (HAND_ID) est un choix du sac qui permet de frapper.
 * Mains vides par défaut (heldItemId = null).
 */

import { InventorySlot, PlayerState } from '../types/game';
import { getItem, placePrice, PLACE_MENUS, PlaceMenuId } from './items';
import { addLog, evaluateMissionProgress, spendCash } from './simulation';

export const BAG_SLOTS = 12;
export const FRIDGE_SLOTS = 24;
export const MAX_STACK = 9;
/** Identifiant spécial de « la main » : choix du sac permettant d'attaquer. */
export const HAND_ID = 'main';

export const bagOf = (state: PlayerState): InventorySlot[] => state.inventory ?? [];
export const fridgeOf = (state: PlayerState): InventorySlot[] => state.fridge ?? [];
export const heldOf = (state: PlayerState): string | null => state.heldItemId ?? null;

export function countOf(slots: InventorySlot[], itemId: string): number {
  return slots.find((s) => s.itemId === itemId)?.qty ?? 0;
}

/** Ajoute `qty` exemplaires ; null si plus de place (emplacements ou pile pleine). */
export function addToSlots(slots: InventorySlot[], itemId: string, qty: number, capacity: number): InventorySlot[] | null {
  const idx = slots.findIndex((s) => s.itemId === itemId);
  if (idx >= 0) {
    if (slots[idx].qty + qty > MAX_STACK) return null;
    return slots.map((s, i) => (i === idx ? { ...s, qty: s.qty + qty } : s));
  }
  if (slots.length >= capacity || qty > MAX_STACK) return null;
  return [...slots, { itemId, qty }];
}

/** Retire `qty` exemplaires (supprime l'emplacement à zéro) ; null si pas assez. */
export function removeFromSlots(slots: InventorySlot[], itemId: string, qty: number): InventorySlot[] | null {
  const idx = slots.findIndex((s) => s.itemId === itemId);
  if (idx < 0 || slots[idx].qty < qty) return null;
  const left = slots[idx].qty - qty;
  return left > 0 ? slots.map((s, i) => (i === idx ? { ...s, qty: left } : s)) : slots.filter((_, i) => i !== idx);
}

/**
 * Valide un tableau reçu (sauvegarde, serveur). `undefined` = vide. Renvoie null si la forme est invalide.
 * Les objets inconnus du catalogue sont ignorés (catalogue qui évolue) ; les doublons sont fusionnés.
 */
export function sanitizeSlots(raw: unknown, capacity: number): InventorySlot[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > capacity) return null;
  let out: InventorySlot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null;
    const { itemId, qty } = entry as InventorySlot;
    if (typeof itemId !== 'string' || itemId.length > 64) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_STACK) return null;
    if (!getItem(itemId)) continue;
    const merged = addToSlots(out, itemId, qty, capacity);
    if (!merged) return null;
    out = merged;
  }
  return out;
}

/** L'objet en main doit être « la main » ou un objet du sac. */
export function sanitizeHeld(raw: unknown, bag: InventorySlot[]): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  if (raw === HAND_ID) return HAND_ID;
  return countOf(bag, raw) > 0 ? raw : null;
}

// ───────────────────────────── Actions (état → état) ─────────────────────────────

/** Achète un exemplaire : le prix est recalculé ici (lieu × coefficient), jamais fourni par le client. */
export function buyItem(state: PlayerState, itemId: string, placeId: PlaceMenuId, placeKey?: string): PlayerState {
  const item = getItem(itemId);
  const price = placePrice(itemId, placeId, placeKey);
  if (!item || price <= 0 || !PLACE_MENUS[placeId]) return state;
  const bag = addToSlots(bagOf(state), itemId, 1, BAG_SLOTS);
  if (!bag) return addLog(state, `🎒 Sac plein : impossible de prendre ${item.name}.`, 'danger');
  const payment = spendCash(state, price);
  if (!payment.ok) {
    return addLog(state, `Fonds insuffisants pour ${item.name} (${price.toLocaleString('fr-FR')} FCFA).`, 'danger');
  }
  return addLog({ ...state, cash: payment.nextCash, inventory: bag }, `🛍️ ${item.name} ajouté au sac (${price.toLocaleString('fr-FR')} FCFA).`, 'success');
}

/** Sort un objet (ou la main) ; `null` ramène les mains vides. */
export function holdItem(state: PlayerState, itemId: string | null): PlayerState {
  if (itemId === null) return { ...state, heldItemId: null };
  if (itemId === HAND_ID) return { ...state, heldItemId: HAND_ID };
  if (countOf(bagOf(state), itemId) < 1) return state;
  return { ...state, heldItemId: itemId };
}

const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

/** Utilise l'objet en main : consomme un exemplaire et applique ses effets. La main ne fait rien ici (coups : plus tard). */
export function useHeldItem(state: PlayerState): PlayerState {
  const held = heldOf(state);
  if (!held || held === HAND_ID) return state;
  const item = getItem(held);
  if (!item || countOf(bagOf(state), held) < 1) return { ...state, heldItemId: null };
  if (!item.consumable) return addLog(state, `${item.icon} ${item.name} : rien à faire avec pour l'instant.`, 'neutral');

  const left = removeFromSlots(bagOf(state), held, 1) ?? [];
  const fx = item.effects;
  const n = state.needs;
  const isFood = item.category !== 'hygiene' && item.category !== 'divers';
  const next: PlayerState = {
    ...state,
    inventory: left,
    heldItemId: countOf(left, held) > 0 ? held : null,
    needs: {
      hunger: clamp100(n.hunger + (fx.hunger ?? 0)),
      energy: clamp100(n.energy + (fx.energy ?? 0)),
      hygiene: clamp100(n.hygiene + (fx.hygiene ?? 0)),
      bladder: clamp100(n.bladder + (fx.bladder ?? 0)),
      envy: clamp100(n.envy + (fx.envy ?? 0)),
    },
    isDepressed: fx.envy ? false : state.isDepressed,
    activeMission: isFood
      ? { ...state.activeMission, eatCount: state.activeMission.eatCount + 1 }
      : state.activeMission,
  };
  const verb = item.category === 'boisson' ? 'Bu' : item.category === 'hygiene' ? 'Utilisé' : 'Mangé';
  return evaluateMissionProgress(addLog(next, `${item.icon} ${verb} : ${item.name}.`, 'success'));
}

/** Range un exemplaire du sac dans le frigo (maison). */
export function moveToFridge(state: PlayerState, itemId: string): PlayerState {
  const item = getItem(itemId);
  if (!item) return state;
  const bag = removeFromSlots(bagOf(state), itemId, 1);
  if (!bag) return state;
  const fridge = addToSlots(fridgeOf(state), itemId, 1, FRIDGE_SLOTS);
  if (!fridge) return addLog(state, '🧊 Le frigo est plein.', 'danger');
  const stillHeld = heldOf(state) === itemId && countOf(bag, itemId) < 1;
  return { ...state, inventory: bag, fridge, heldItemId: stillHeld ? null : heldOf(state) };
}

/** Reprend un exemplaire du frigo dans le sac. */
export function takeFromFridge(state: PlayerState, itemId: string): PlayerState {
  const item = getItem(itemId);
  if (!item) return state;
  const fridge = removeFromSlots(fridgeOf(state), itemId, 1);
  if (!fridge) return state;
  const bag = addToSlots(bagOf(state), itemId, 1, BAG_SLOTS);
  if (!bag) return addLog(state, `🎒 Sac plein : impossible de prendre ${item.name}.`, 'danger');
  return { ...state, inventory: bag, fridge };
}
