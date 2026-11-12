/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Écran de Fin Tragique / Épitaphe (Game Over Réaliste San Andreas × Sims)
 */

import React, { useEffect } from 'react';
import { PlayerState } from '../types/game';
import { Skull, RotateCcw, AlertTriangle, Calendar, Award, Banknote, Sparkles } from 'lucide-react';
import { narratorService } from '../services/narratorService';

interface TragicEndingModalProps {
  playerState: PlayerState;
  reason?: string;
  onRestartGame: () => void;
  isEnglish?: boolean;
}

export const TragicEndingModal: React.FC<TragicEndingModalProps> = ({
  playerState,
  reason = 'Faillite totale et épuisement moral au cœur de la jungle urbaine',
  onRestartGame,
  isEnglish = false
}) => {
  useEffect(() => {
    const text = isEnglish
      ? `Game over. ${playerState.character.firstName} ${playerState.character.lastName} could not survive the unforgiving streets of Abidjan.`
      : `Fin de partie. ${playerState.character.firstName} ${playerState.character.lastName} n'a pas résisté à la fureur d'Abidjan. Le bitume ne pardonne pas.`;
    narratorService.speak(text, isEnglish);
  }, [playerState, isEnglish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 select-none text-white animate-fade-in backdrop-blur-lg">
      <div className="relative w-full max-w-xl rounded-3xl border border-rose-950 bg-gradient-to-b from-stone-950 via-neutral-900 to-black p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
        {/* Lueur rouge / ambiance dramatique */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-rose-900/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-900/10 blur-3xl" />

        {/* Icone Tête de mort */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-700/50 bg-rose-950/40 shadow-inner">
          <Skull className="h-10 w-10 text-rose-500 animate-pulse" />
        </div>

        {/* Titre */}
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-rose-500 font-mono">
          {isEnglish ? 'WASTED IN BABI' : 'LE BITUME T\'A EU'}
        </h2>
        <p className="mt-2 text-sm text-neutral-400 italic font-serif">
          « {isEnglish ? 'The lagoon never returns what the streets have taken.' : 'La lagune ne rend jamais ce que la rue a avalé.'} »
        </p>

        {/* Motif du Trépas */}
        <div className="mt-5 rounded-2xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-xs sm:text-sm text-rose-300">
          <span className="font-bold flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            {isEnglish ? 'Cause of Downfall' : 'Cause de la Chute'}
          </span>
          {reason}
        </div>

        {/* Bilan de la Vie */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <Calendar className="h-3 w-3 text-neutral-400" />
              {isEnglish ? 'Days Survived' : 'Jours Vécus'}
            </span>
            <span className="text-xl font-black text-amber-400 font-mono">
              {playerState.dayCount} {isEnglish ? 'days' : 'jours'}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <Banknote className="h-3 w-3 text-emerald-400" />
              {isEnglish ? 'Final Net Cash' : 'Dernier Solde'}
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {playerState.cash.toLocaleString('fr-FR')} F
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              {isEnglish ? 'Destiny' : 'Destin Déchu'}
            </span>
            <span className="text-sm font-black text-indigo-300 truncate block">
              {playerState.destiny.icon} {playerState.destiny.name}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <Award className="h-3 w-3 text-amber-400" />
              {isEnglish ? 'Badges' : 'Honneurs Acquis'}
            </span>
            <span className="text-sm font-black text-amber-300">
              {playerState.badges.length > 0 ? `${playerState.badges.length} badges d'élite` : (isEnglish ? 'None' : 'Aucun')}
            </span>
          </div>
        </div>

        {/* Bouton Recommencer */}
        <button
          onClick={onRestartGame}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 py-3.5 px-6 font-black uppercase tracking-wider text-slate-950 transition hover:from-amber-500 hover:to-amber-400 active:scale-98 shadow-xl shadow-amber-600/20"
        >
          <RotateCcw className="h-5 w-5" />
          {isEnglish ? 'Respawn / New Life' : 'Renaître / Nouvelle Vie'}
        </button>
      </div>
    </div>
  );
};
