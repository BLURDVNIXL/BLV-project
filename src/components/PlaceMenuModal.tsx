import React from 'react';
import { ItemIcon } from './ItemIcon';
import { Refrigerator, Store } from 'lucide-react';
import { PlayerState } from '../types/game';
import { CATEGORY_LABELS, CATEGORY_ORDER, ItemCategory, PLACE_MENUS, PlaceMenuId, getItem, placeDiscount, placeItemIds, placePrice } from '../core/items';
import { BAG_SLOTS, FRIDGE_SLOTS, bagOf, fridgeOf } from '../core/inventory';
import { hasUnlimitedPlatinum } from '../core/simulation';
import { Modal } from './ui/Modal';

interface PlaceMenuModalProps {
  /** Un lieu d'achat, ou `'fridge'` pour le frigo de la maison. */
  placeId: PlaceMenuId | 'fridge';
  playerState: PlayerState;
  /** Clé du garbadrome ou de la vendeuse (stock et réduction fixes). */
  placeKey?: string;
  onBuy: (itemId: string, placeId: PlaceMenuId, placeKey?: string) => void;
  onFridgePut: (itemId: string) => void;
  onFridgeTake: (itemId: string) => void;
  onClose: () => void;
}

const btn = 'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-40';

/** Menu d'achat d'un lieu (acheter = ajouter au sac, rien n'est consommé sur place) ou frigo de la maison. */
export const PlaceMenuModal: React.FC<PlaceMenuModalProps> = ({ placeId, placeKey, playerState, onBuy, onFridgePut, onFridgeTake, onClose }) => {
  const bag = bagOf(playerState);

  if (placeId === 'fridge') {
    const fridge = fridgeOf(playerState);
    const row = (slot: { itemId: string; qty: number }, label: string, onClick: () => void, tone: string) => {
      const item = getItem(slot.itemId);
      if (!item) return null;
      return (
        <div key={`${label}_${slot.itemId}`} className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-100 p-2">
          <div className="flex min-w-0 items-center gap-2">
            <ItemIcon itemId={item.id} emoji={item.icon} size={32} />
            <span className="truncate text-xs font-bold text-ink-800">
              {item.name} <span className="text-ink-500">×{slot.qty}</span>
            </span>
          </div>
          <button type="button" onClick={onClick} className={`${btn} ${tone}`}>
            {label}
          </button>
        </div>
      );
    };
    return (
      <Modal title="Réfrigérateur" icon={<Refrigerator className="h-5 w-5" />} onClose={onClose} widthClass="max-w-md">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-500">
          Sac ({bag.length}/{BAG_SLOTS})
        </div>
        {bag.length === 0 && <div className="text-xs text-ink-500">Le sac est vide.</div>}
        {bag.map((s) => row(s, 'Ranger', () => onFridgePut(s.itemId), 'bg-lagoon-500 hover:bg-lagoon-400'))}
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-500">
          Frigo ({fridge.length}/{FRIDGE_SLOTS})
        </div>
        {fridge.length === 0 && <div className="text-xs text-ink-500">Le frigo est vide.</div>}
        {fridge.map((s) => row(s, 'Prendre', () => onFridgeTake(s.itemId), 'bg-sun-600 hover:bg-sun-500'))}
      </Modal>
    );
  }

  const place = PLACE_MENUS[placeId];
  const bagFull = bag.length >= BAG_SLOTS;
  const rich = hasUnlimitedPlatinum(playerState);
  const byCategory = new Map<ItemCategory, string[]>();
  for (const id of placeItemIds(placeId, placeKey)) {
    const item = getItem(id);
    if (!item) continue;
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), id]);
  }

  return (
    <Modal title={place.label} icon={<Store className="h-5 w-5" />} onClose={onClose} widthClass="max-w-md">
      <div className="flex items-center justify-between text-xs text-ink-600">
        <span>{playerState.cash.toLocaleString('fr-FR')} F</span>
        <span>
          Sac {bag.length}/{BAG_SLOTS}
          {bagFull ? ' · plein' : ''}
        </span>
      </div>
      {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{CATEGORY_LABELS[cat]}</div>
          {byCategory.get(cat)!.map((id) => {
            const item = getItem(id)!;
            const price = placePrice(id, placeId, placeKey);
            const discount = placeDiscount(id, placeId, placeKey);
            const owned = bag.find((s) => s.itemId === id);
            const cannot = (!owned && bagFull) || (owned?.qty ?? 0) >= 9 || (!rich && playerState.cash < price);
            return (
              <div key={id} className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-100 p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ItemIcon itemId={item.id} emoji={item.icon} size={32} />
                  <span className="truncate text-xs font-bold text-ink-800">{item.name}</span>
                  {discount > 0 && <span className="shrink-0 rounded bg-green-600 px-1 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>}
                </div>
                <button type="button" disabled={cannot} onClick={() => onBuy(id, placeId, placeKey)} className={`${btn} bg-sun-600 hover:bg-sun-500`}>
                  {price.toLocaleString('fr-FR')} F
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </Modal>
  );
};
