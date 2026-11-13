import React from 'react';
import { Skull, RotateCcw, Calendar, DollarSign, Award, Heart } from 'lucide-react';
import { PlayerState } from '../types/game';

interface GameOverModalProps {
  playerState: PlayerState;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ playerState, onRestart }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 text-white select-none">
      <div className="relative flex flex-col w-full max-w-md rounded-2xl bg-slate-900 border-2 border-rose-700/70 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center rounded-2xl bg-rose-950 border border-rose-600/50 text-rose-500">
          <Skull className="h-9 w-9" />
        </div>

        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-white">
          Fin du Parcours à Babi
        </h2>

        <p className="mt-2 text-xs text-rose-300 italic px-2">
          « {playerState.gameOverReason || 'Épuisement total sous le poids des dettes à Abidjan.'} »
        </p>

        <div className="my-5 flex flex-col gap-2 rounded-xl bg-slate-950 p-4 border border-slate-800 text-left text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Jours survécus :
            </span>
            <span className="font-mono font-bold text-white tabular-nums">{playerState.daysLived} jours</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-2 text-slate-400">
              <DollarSign className="h-3.5 w-3.5 text-rose-400" />
              Dettes cumulées :
            </span>
            <span className="font-mono font-bold text-rose-400 tabular-nums">
              {playerState.debt.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-2 text-slate-400">
              <Award className="h-3.5 w-3.5 text-amber-400" />
              Destin vécu :
            </span>
            <span className="font-bold text-amber-300">{playerState.destiny.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              Statut du cœur :
            </span>
            <span className="font-semibold text-white">
              {playerState.loveState.isMarried ? 'Marié(e)' : playerState.loveState.partnerName ? 'En couple' : 'Célibataire'}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onRestart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black uppercase tracking-wider text-slate-950 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Renaître à Babi (Nouvelle Vie)</span>
        </button>
      </div>
    </div>
  );
};
