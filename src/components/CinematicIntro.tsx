/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Cinématique Narrative d'Introduction avec Voix Off & Survol d'Abidjan
 */

import React, { useState, useEffect } from 'react';
import { PlayerState } from '../types/game';
import { narratorService } from '../services/narratorService';
import { FastForward, Volume2, Sparkles, MapPin } from 'lucide-react';

interface CinematicIntroProps {
  playerState: PlayerState;
  onFinish: () => void;
}

const CINEMATIC_LINES_FR = [
  "Bienvenue à Abidjan, la perle des lagunes.",
  "Ici, le soleil ne se lève pas : il explose sur le bitume et réveille deux millions de destins.",
  "Entre les tours de verre du Plateau, les villas fermées de Cocody, et le vacarme vibrant des gbakas d'Adjamé...",
  "Certains naissent avec tout sur un plateau d'argent. D'autres doivent arracher chaque franc à la sueur de leur front.",
  "Le Destin vient de choisir ton point de départ. Mais c'est ton cran et ta chance qui forgeront ta légende.",
  "Bienvenue dans BLV : Babi Life Vibes."
];

const CINEMATIC_LINES_EN = [
  "Welcome to Abidjan, the economic heartbeat of West Africa.",
  "Here, the tropical sun blazes over the Ebrié lagoon as millions of lives cross the bridges.",
  "Between the high-rise towers of Plateau, the private beach duplexes in Assinie, and the street hustlers of Adjamé...",
  "Some are born with an unlimited platinum card. Others must hustle every single franc from the asphalt.",
  "Destiny just handed you your cards. Now your choices and your lucky star will write your story.",
  "Welcome to BLV: Babi Life Vibes."
];

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ playerState, onFinish }) => {
  const isEnglish = playerState.isEnglishLocked;
  const lines = isEnglish ? CINEMATIC_LINES_EN : CINEMATIC_LINES_FR;
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    // Lancer la narration vocale
    const fullSpeech = lines.join(' ');
    narratorService.speak(fullSpeech, isEnglish, () => {
      // Fin naturelle de la voix
      setTimeout(onFinish, 1500);
    });

    // Progression des lignes textuelles à l'écran
    const interval = setInterval(() => {
      setCurrentLineIndex((prev) => {
        if (prev < lines.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 4500);

    return () => {
      clearInterval(interval);
      narratorService.stop();
    };
  }, [isEnglish]);

  const handleSkip = () => {
    narratorService.stop();
    onFinish();
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-slate-950 p-6 sm:p-12 select-none text-white">
      {/* Arrière-plan cinématique avec dégradé chaud d'Abidjan */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-orange-950/30"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-amber-500/10 blur-3xl animate-pulse"></div>
        {/* Lignes stylisées de pont et lagune */}
        <div className="absolute bottom-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
      </div>

      {/* Top Bar : Bouton Passer & Indicateur de Voix Off */}
      <div className="relative z-10 flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-300">
          <Volume2 className="h-3.5 w-3.5 animate-pulse text-amber-400" />
          <span>{isEnglish ? 'Cinematic Voiceover Active' : 'Voix Off Narrative Active'}</span>
        </div>

        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-amber-400 hover:text-white transition-all active:scale-95"
        >
          <span>{isEnglish ? 'Skip Intro' : 'Passer'}</span>
          <FastForward className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Centre : Texte Scénarisé avec animation fluide */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto max-w-3xl px-4">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-950/40 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-orange-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>{playerState.destiny.commune} • Abidjan</span>
        </div>

        <div className="min-h-[140px] flex items-center justify-center">
          <h2
            key={currentLineIndex}
            className="text-xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-tight transition-all duration-700 animate-fadeIn drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          >
            « {lines[currentLineIndex]} »
          </h2>
        </div>

        {/* Fiche de départ du joueur */}
        <div className="mt-8 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-3 text-xs">
          <span className="text-2xl">{playerState.destiny.icon}</span>
          <div className="text-left">
            <div className="font-bold text-white uppercase">{playerState.character.firstName} {playerState.character.lastName}</div>
            <div className="text-amber-400 font-mono text-[11px]">{playerState.destiny.name} • {playerState.cash.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div className="ml-4 flex items-center gap-1 text-amber-300 font-mono font-bold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Étoile : {playerState.luckStar}/100</span>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="relative z-10 flex flex-col items-center">
        <button
          onClick={handleSkip}
          className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
        >
          {isEnglish ? 'Enter Abidjan City ➔' : 'Prendre les rênes de Babi ➔'}
        </button>
      </div>
    </div>
  );
};
