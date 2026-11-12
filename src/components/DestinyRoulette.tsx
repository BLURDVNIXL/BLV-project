/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * La Roulette du Destin (19 Classes & Easter Eggs Asymétriques)
 */

import React, { useState, useEffect } from 'react';
import { DestinyClass, CharacterProfile } from '../types/game';
import { ALL_DESTINIES } from '../data/destinies';
import { Sparkles, Dices, Award, Home, Car, AlertTriangle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DestinyRouletteProps {
  character: CharacterProfile;
  forcedDestinyId?: string; // Utilisé par le Sandbox Admin pour forcer un destin spécifique
  onDestinyConfirmed: (destiny: DestinyClass) => void;
}

export const DestinyRoulette: React.FC<DestinyRouletteProps> = ({
  character,
  forcedDestinyId,
  onDestinyConfirmed
}) => {
  const [isSpinning, setIsSpinning] = useState(true);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [selectedDestiny, setSelectedDestiny] = useState<DestinyClass | null>(null);

  useEffect(() => {
    // Si un destin est forcé par le Mode Admin
    if (forcedDestinyId) {
      const found = ALL_DESTINIES.find((d) => d.id === forcedDestinyId);
      if (found) {
        setSelectedDestiny(found);
        setIsSpinning(false);
        return;
      }
    }

    // Animation de rotation de la roulette
    let speed = 40;
    let iterations = 0;
    const maxIterations = 35 + Math.floor(Math.random() * 15);

    const spinInterval = setInterval(() => {
      setDisplayedIndex((prev) => (prev + 1) % ALL_DESTINIES.length);
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(spinInterval);
        // Tirage pondéré avec chance
        let finalDestiny: DestinyClass;
        const roll = Math.random() * 100;

        if (roll < 35) {
          // Communes
          const pool = ALL_DESTINIES.filter((d) => d.rarity === 'common');
          finalDestiny = pool[Math.floor(Math.random() * pool.length)];
        } else if (roll < 65) {
          // Rares
          const pool = ALL_DESTINIES.filter((d) => d.rarity === 'rare');
          finalDestiny = pool[Math.floor(Math.random() * pool.length)];
        } else if (roll < 85) {
          // Épiques
          const pool = ALL_DESTINIES.filter((d) => d.rarity === 'epic');
          finalDestiny = pool[Math.floor(Math.random() * pool.length)];
        } else {
          // Easter Eggs & Légendaires
          const pool = ALL_DESTINIES.filter((d) => d.rarity === 'easter_egg');
          finalDestiny = pool[Math.floor(Math.random() * pool.length)];
        }

        setSelectedDestiny(finalDestiny);
        setIsSpinning(false);

        // Explosion de confettis si Easter Egg ou Épique
        if (finalDestiny.rarity === 'easter_egg' || finalDestiny.rarity === 'epic') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    }, speed);

    return () => clearInterval(spinInterval);
  }, [forcedDestinyId]);

  const currentDisplay = isSpinning ? ALL_DESTINIES[displayedIndex] : selectedDestiny || ALL_DESTINIES[0];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-slate-950 p-4 sm:p-8 select-none text-white">
      {/* Halo de fond */}
      <div className="absolute inset-0 z-0 bg-radial from-amber-500/10 via-slate-950 to-slate-950"></div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Header Roulette */}
        <div className="mb-4 flex items-center gap-2">
          <Dices className={`h-6 w-6 text-amber-400 ${isSpinning ? 'animate-spin' : ''}`} />
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            {isSpinning ? 'Tirage du Destin en cours...' : 'Le Destin s\'est prononcé !'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2">
          {character.firstName} {character.lastName}, voici ta vie
        </h2>

        {/* Carte de Destin Révélée */}
        <div className={`mt-4 w-full rounded-2xl border p-6 sm:p-8 transition-all duration-500 shadow-2xl ${
          isSpinning
            ? 'border-slate-800 bg-slate-900/60 blur-[1px]'
            : currentDisplay.rarity === 'easter_egg'
              ? 'border-rose-500 bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 shadow-rose-500/20'
              : currentDisplay.rarity === 'epic'
                ? 'border-amber-500 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 shadow-amber-500/20'
                : 'border-slate-700 bg-slate-900/90'
        }`}>
          {/* Badge Rareté & Icône */}
          <div className="flex items-center justify-between mb-4">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
              currentDisplay.rarity === 'easter_egg'
                ? 'bg-rose-500 text-slate-950 animate-pulse'
                : currentDisplay.rarity === 'epic'
                  ? 'bg-amber-400 text-slate-950'
                  : currentDisplay.rarity === 'rare'
                    ? 'bg-blue-500 text-slate-950'
                    : 'bg-slate-700 text-white'
            }`}>
              {currentDisplay.rarity === 'easter_egg'
                ? '🔴 EASTER EGG SECRET'
                : currentDisplay.rarity === 'epic'
                  ? '🟣 CLASSE ÉPIQUE'
                  : currentDisplay.rarity === 'rare'
                    ? '🔵 CLASSE RARE'
                    : '⚪ CLASSE COMMUNE'}
            </span>

            <span className="text-3xl">{currentDisplay.icon}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-1">
            {currentDisplay.name}
          </h3>

          <p className="text-xs font-mono font-bold text-amber-400 mb-4">
            Quartier de départ : {currentDisplay.commune}
          </p>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 italic">
            "{currentDisplay.description}"
          </p>

          {/* Grille des Conditions de Départ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left mb-6">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Argent en Poche</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {currentDisplay.startingCash.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Logement</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <Home className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{currentDisplay.homeLabel}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Véhicule</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <Car className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{currentDisplay.vehicles[0] || 'Aucun (Gbaka/À pied)'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">L'Étoile (Chance)</span>
              <div className="flex items-center gap-1.5 text-sm font-black text-amber-300">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{currentDisplay.luckStat}/100</span>
              </div>
            </div>
          </div>

          {/* Alerte Spéciale EASTER EGG : GOLDEN BOY EN ANGLAIS */}
          {currentDisplay.isEnglishLocked && !isSpinning && (
            <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-left">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase mb-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>EASTER EGG : Language Locked in English! 🔒</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                Bro, you literally graduated from the American International School of Abidjan! French is not in your settings. The entire game is strictly locked in English! Enjoy Assinie beach house with the Rolls-Royce!
              </p>
            </div>
          )}

          {/* Alerte Spéciale : BARAKA DU POIGNON */}
          {currentDisplay.isPoignon && !isSpinning && (
            <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-left">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase mb-1">
                <Award className="h-4 w-4 shrink-0" />
                <span>BARAKA MYSTIQUE DU POIGNON (95/100) ✨</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Tu démarres sans abri avec 2 000 FCFA, mais l'univers entier est de ton côté. Tes chances au Loto et tes trouvailles dans la rue sont surhumaines !
              </p>
            </div>
          )}

          {/* Perks */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {currentDisplay.perks.map((perk, i) => (
              <span key={i} className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300 border border-slate-700">
                ✓ {perk}
              </span>
            ))}
          </div>

          {/* Bouton de Confirmation */}
          {!isSpinning && (
            <button
              onClick={() => onDestinyConfirmed(currentDisplay)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-6 py-4 text-base font-black uppercase tracking-wider text-slate-950 shadow-xl hover:scale-[1.01] active:scale-95 transition-all"
            >
              <span>Entrer dans l'Histoire de Babi</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
