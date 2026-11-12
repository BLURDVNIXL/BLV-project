/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Menu Gastronomique d'Abidjan (Garba, Alloco, Foutou, Choukouya...)
 */

import React from 'react';
import { FoodItem } from '../types/game';
import { GASTRONOMY_FOODS } from '../data/destinies';
import { Utensils, X, Sparkles, Check } from 'lucide-react';

interface FoodMenuModalProps {
  playerCash: number;
  unlimitedCash: boolean;
  onEatFood: (food: FoodItem) => void;
  onClose: () => void;
  isEnglish?: boolean;
}

export const FoodMenuModal: React.FC<FoodMenuModalProps> = ({
  playerCash,
  unlimitedCash,
  onEatFood,
  onClose,
  isEnglish = false
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none text-white">
      <div className="relative w-full max-w-xl rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="font-black uppercase tracking-wider text-white text-base">
                {isEnglish ? 'Authentic Ivorian Cuisine' : 'Gastronomie & Mets Savoureux d\'Abidjan'}
              </h3>
              <p className="text-[11px] text-amber-300">
                {isEnglish ? 'Eating delicious food directly satisfies your Craving Gauge!' : 'Déguster un plat savoureux comble directement votre Jauge d\'Envie !'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {GASTRONOMY_FOODS.map((food) => {
            const canAfford = unlimitedCash || playerCash >= food.price;
            return (
              <div
                key={food.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-amber-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl">{food.icon}</span>
                    <span className="font-mono text-xs font-black text-emerald-400">
                      {unlimitedCash ? 'FREE (Dad pays)' : `${food.price.toLocaleString('fr-FR')} F`}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white">{food.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {food.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-amber-400">+{food.faimGain}% Faim</span>
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      +{food.envieGain}% Envie
                    </span>
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      onEatFood(food);
                      onClose();
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      canAfford
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Déguster
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
