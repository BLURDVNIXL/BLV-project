/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Interface HUD en Jeu (Terre d'Ivoire Dock × GTA San Andreas Stats)
 */

import React from 'react';
import { PlayerState } from '../types/game';
import {
  Sparkles,
  Radio,
  Play,
  Pause,
  Utensils,
  Moon,
  Droplets,
  Smartphone,
  ShieldAlert,
  Sun,
  CloudRain,
  Wind,
  HeartCrack,
  Map,
  Briefcase,
  Home,
  Plus
} from 'lucide-react';
import { radioService } from '../services/radioService';

interface GameHUDProps {
  playerState: PlayerState;
  onOpenPhone: () => void;
  onEatFoodModal: () => void;
  onOpenMap: () => void;
  onGoToWork: () => void;
  onRest: () => void;
  onShower: () => void;
  onTragicEnding: () => void;
  onToggleRadio: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerState,
  onOpenPhone,
  onEatFoodModal,
  onOpenMap,
  onGoToWork,
  onRest,
  onShower,
  onTragicEnding,
  onToggleRadio
}) => {
  const isEnglish = playerState.isEnglishLocked;
  const currentStation = radioService.getCurrentStation();
  const radioStatus = radioService.getStatus();

  // Formatage heure in-game
  const hours = Math.floor(playerState.inGameMinute / 60) % 24;
  const minutes = playerState.inGameMinute % 60;
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Statut vital (Épuisé, En forme, Affamé)
  const isExhausted = playerState.needs.energie < 20;
  const isHungry = playerState.needs.faim < 25;
  const vitalLabel = isExhausted
    ? (isEnglish ? 'Exhausted' : 'Épuisé')
    : isHungry
    ? (isEnglish ? 'Starving' : 'Affamé')
    : (isEnglish ? 'In Shape' : 'En forme');

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* 1. TOP BAR : Horloge, Météo, Solde FCFA, Étoile, Heat Police & Radio Live */}
      <div className="flex w-full items-start justify-between gap-2">
        {/* Gauche : Horloge, Météo, Statut Vital & Étoile */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Horloge & Météo */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/85 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span className="text-sm font-black font-mono text-amber-400">
              {formattedTime}
            </span>
            <span className="text-xs text-slate-400 font-bold">J{playerState.dayCount}</span>
            <div className="h-3 w-px bg-slate-800" />
            {playerState.weather === 'sunny' && <Sun className="h-4 w-4 text-amber-400" />}
            {playerState.weather === 'rain_tropical' && <CloudRain className="h-4 w-4 text-sky-400 animate-bounce" />}
            {playerState.weather === 'flood_inondation' && <span className="text-xs font-bold text-rose-400">🌊 Inondation</span>}
            {playerState.weather === 'harmattan' && <Wind className="h-4 w-4 text-amber-600" />}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isExhausted ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
            }`}>
              {vitalLabel}
            </span>
          </div>

          {/* L'Étoile (Chance / Baraka) */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-950/50 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black text-amber-300 font-mono">
              {isEnglish ? 'Lucky Star' : 'Étoile'} : {playerState.luckStar}/100
            </span>
          </div>

          {/* Étoiles de Recherche Police (GTA Heat) */}
          {playerState.policeHeat > 0 && (
            <div className="flex items-center gap-1 rounded-2xl border border-rose-500 bg-rose-950/80 px-2.5 py-1 text-rose-400 animate-pulse shadow-lg">
              <ShieldAlert className="h-4 w-4" />
              <div className="flex text-xs font-black">
                {Array.from({ length: playerState.policeHeat }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Droite : Solde FCFA & Tuner Radio Live */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {/* Solde FCFA */}
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-slate-950/85 px-3.5 py-1.5 shadow-xl backdrop-blur-md">
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
              {playerState.unlimitedCashUntilDay !== undefined && playerState.dayCount <= playerState.unlimitedCashUntilDay
                ? (isEnglish ? '∞ UNLIMITED FCFA' : '∞ ILLIMITÉ FCFA')
                : `${playerState.cash.toLocaleString('fr-FR')} F`}
            </span>
            <button
              onClick={onOpenPhone}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold"
              title="Wave Money / Recharger"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </button>
          </div>

          {/* Widget Radio Live */}
          <button
            onClick={onToggleRadio}
            className={`group flex items-center gap-2 rounded-2xl border px-3 py-1.5 shadow-xl backdrop-blur-md transition-all ${
              radioStatus.isPlaying
                ? 'border-rose-500/60 bg-rose-950/70 text-rose-300'
                : 'border-slate-800 bg-slate-950/85 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className={`h-4 w-4 ${radioStatus.isPlaying ? 'animate-pulse text-rose-400' : ''}`} />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider line-clamp-1">
                {currentStation.name}
              </span>
              <span className="text-[9px] text-slate-400">{currentStation.frequency}</span>
            </div>
            {radioStatus.isPlaying ? (
              <Pause className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Play className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* 2. CENTRE / BAS : JAUGE D'ENVIE & DOCK DE NAVIGATION TERRE D'IVOIRE */}
      <div className="pointer-events-auto flex flex-col items-center gap-2 w-full max-w-2xl mx-auto mb-20 sm:mb-24">
        {/* LA JAUGE D'ENVIE UNIVERSELLE */}
        <div className="w-full rounded-2xl border border-amber-500/40 bg-slate-950/85 p-2.5 shadow-2xl backdrop-blur-lg">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400 font-mono">
              <span className="text-sm">🔥</span>
              {isEnglish ? 'Craving Gauge' : 'Jauge d\'Envie'} : {playerState.envieJauge}%
            </span>
            {playerState.envieBuff ? (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                ✨ {playerState.envieBuff.name}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">
                {isEnglish ? 'Satisfied by Garba, Love, Success' : 'Comblée par le Garba, l\'Amour, le Succès'}
              </span>
            )}
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all duration-500"
              style={{ width: `${playerState.envieJauge}%` }}
            />
          </div>

          {/* Les 6 Besoins Sims */}
          <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] text-slate-300">
            <div className="flex flex-col items-center">
              <span>🍛 Faim</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-amber-500" style={{ width: `${playerState.needs.faim}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>⚡ Énergie</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-sky-500" style={{ width: `${playerState.needs.energie}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>🚿 Hygiène</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-teal-400" style={{ width: `${playerState.needs.hygiene}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>🚽 Vessie</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-blue-500" style={{ width: `${playerState.needs.vessie}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>💬 Social</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-pink-500" style={{ width: `${playerState.needs.social}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>🎉 Loisirs</span>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-indigo-500" style={{ width: `${playerState.needs.loisirs}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. DOCK NAVIGATION INSPIRÉ DE TERRE D'IVOIRE (Ici, Carte, Manger, Phone, Aller au travail) */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-md">
          {/* Ici (Maison) */}
          <button
            onClick={onRest}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-500/50 hover:text-amber-300 transition"
            title="Logement / Lieu actuel"
          >
            <Home className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Ici (Maison)</span>
          </button>

          {/* Carte d'Abidjan */}
          <button
            onClick={onOpenMap}
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-900/50 transition"
            title="Carte d'Abidjan & Déplacements"
          >
            <Map className="h-4 w-4 text-sky-400" />
            <span>{isEnglish ? 'Map' : 'Carte'}</span>
          </button>

          {/* Manger */}
          <button
            onClick={onEatFoodModal}
            className="flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-pink-950/30 px-3 py-1.5 text-xs font-bold text-pink-300 hover:bg-pink-900/40 transition"
            title="Gastronomie ivoirienne (Garba, Alloco)"
          >
            <Utensils className="h-4 w-4 text-pink-400" />
            <span>{isEnglish ? 'Eat' : 'Manger'}</span>
          </button>

          {/* Smartphone BabiOS */}
          <button
            onClick={onOpenPhone}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 transition"
            title="Wave Money, Tontine, Badges d'Écoles"
          >
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span>BabiOS</span>
          </button>

          {/* Aller au Travail */}
          <button
            onClick={onGoToWork}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500 bg-gradient-to-r from-amber-600 to-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:from-amber-500 hover:to-amber-400 active:scale-95 transition shadow-lg shadow-amber-600/30"
            title="Aller au travail / Gagner des FCFA"
          >
            <Briefcase className="h-4 w-4" />
            <span>{isEnglish ? 'Go to Work' : 'Travailler'}</span>
          </button>

          {/* Fin Tragique (Baisser les bras) */}
          <button
            onClick={onTragicEnding}
            className="rounded-xl p-1.5 text-slate-600 hover:text-rose-400 transition"
            title={isEnglish ? "Give up / Tragic ending" : "Baisser les bras / Fin tragique"}
          >
            <HeartCrack className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
