import React from 'react';
import { Backpack, Hand } from 'lucide-react';
import { PlayerState } from '../types/game';
import { getItem } from '../core/items';
import { BAG_SLOTS, HAND_ID, bagOf, heldOf } from '../core/inventory';
import { Modal } from './ui/Modal';

interface BagPanelProps {
  playerState: PlayerState;
  /** `null` : mains vides. `'main'` : la main. Sinon l'id d'un objet du sac. */
  onHold: (itemId: string | null) => void;
  onClose: () => void;
}

/** Sac : la main + 12 emplacements. Un seul objet sorti à la fois ; un second appui range. */
export const BagPanel: React.FC<BagPanelProps> = ({ playerState, onHold, onClose }) => {
  const bag = bagOf(playerState);
  const held = heldOf(playerState);
  const heldItem = held && held !== HAND_ID ? getItem(held) : null;

  const tile = (active: boolean) =>
    `relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-1 text-center transition ${
      active ? 'border-lagoon-500 bg-lagoon-400/20 shadow-inner' : 'border-cream-200 bg-cream-50 hover:bg-cream-100'
    }`;

  return (
    <Modal title="Sac" icon={<Backpack className="h-5 w-5" />} onClose={onClose} widthClass="max-w-md">
      <div className="text-xs text-ink-600">
        {held === HAND_ID
          ? '✋ La main est sortie : tu peux frapper. Touche-la à nouveau pour la ranger.'
          : heldItem
          ? `${heldItem.icon} ${heldItem.name} en main. « Interagir » l'utilise. Touche-le à nouveau pour le ranger.`
          : 'Mains vides. Choisis un objet à sortir : un seul à la fois.'}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onHold(held === HAND_ID ? null : HAND_ID)}
          className={tile(held === HAND_ID)}
          aria-pressed={held === HAND_ID}
        >
          <Hand className="h-7 w-7 text-ink-800" />
          <span className="mt-0.5 text-[10px] font-bold leading-tight text-ink-800">Main</span>
        </button>

        {Array.from({ length: BAG_SLOTS }, (_, i) => {
          const slot = bag[i];
          const item = slot ? getItem(slot.itemId) : undefined;
          if (!slot || !item) {
            return <div key={`empty_${i}`} className="aspect-square rounded-2xl border-2 border-dashed border-cream-200 bg-cream-50/50" />;
          }
          const active = held === slot.itemId;
          return (
            <button
              key={slot.itemId}
              type="button"
              onClick={() => onHold(active ? null : slot.itemId)}
              className={tile(active)}
              aria-pressed={active}
              title={item.name}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="mt-0.5 line-clamp-2 text-[9px] font-bold leading-tight text-ink-800">{item.name}</span>
              {slot.qty > 1 && (
                <span className="absolute right-1 top-1 rounded-full bg-sun-600 px-1.5 text-[10px] font-bold text-white">×{slot.qty}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-right text-[11px] text-ink-500">
        {bag.length}/{BAG_SLOTS} emplacements
      </div>
    </Modal>
  );
};
