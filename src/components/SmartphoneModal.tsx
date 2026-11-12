/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Le Smartphone BabiOS (Wave Money, Lycées d'Excellence & Badges, Tontine, Djassa, Radios)
 */

import React, { useState } from 'react';
import { PlayerState, SchoolBadgeId } from '../types/game';
import { SCHOOL_BADGES } from '../data/destinies';
import { radioService } from '../services/radioService';
import {
  Smartphone,
  X,
  CreditCard,
  GraduationCap,
  Users,
  ShoppingBag,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SmartphoneModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onUnlockBadge: (badgeId: SchoolBadgeId) => void;
  onTontineContribute: () => void;
  onPurifyStar: () => void;
  isEnglish?: boolean;
}

export const SmartphoneModal: React.FC<SmartphoneModalProps> = ({
  playerState,
  onClose,
  onUnlockBadge,
  onTontineContribute,
  onPurifyStar,
  isEnglish = false
}) => {
  const [activeApp, setActiveApp] = useState<'home' | 'wave' | 'schools' | 'tontine' | 'radios' | 'sage'>('home');
  const stations = radioService.getStations();
  const currentStation = radioService.getCurrentStation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none text-white">
      {/* Cadre du Smartphone BabiOS */}
      <div className="relative flex h-[620px] w-full max-w-[340px] flex-col overflow-hidden rounded-[40px] border-[6px] border-slate-800 bg-slate-950 shadow-2xl">
        {/* Encoche Haut (Dynamic Island) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex h-4 w-28 items-center justify-center rounded-full bg-black">
          <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-700"></div>
        </div>

        {/* Top Status Bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-mono font-bold text-slate-400">
          <span>06:45</span>
          <div className="flex items-center gap-1.5">
            <span>4G Babi</span>
            <span>100%</span>
          </div>
        </div>

        {/* Contenu de l'Écran */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {/* ÉCRAN D'ACCUEIL DES APPLIS */}
          {activeApp === 'home' && (
            <div className="flex flex-col h-full justify-between">
              <div>
                {/* Widget Profil Résumé */}
                <div className="mb-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-amber-950/30 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{playerState.destiny.icon}</span>
                    <div className="text-left">
                      <h4 className="text-xs font-black uppercase text-white">
                        {playerState.character.firstName} {playerState.character.lastName}
                      </h4>
                      <p className="text-[10px] text-amber-400 font-mono">
                        {playerState.destiny.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] font-mono text-slate-400">
                    <span>Étoile : <strong className="text-amber-300">{playerState.luckStar}/100</strong></span>
                    <span>Commune : <strong className="text-white">{playerState.destiny.commune}</strong></span>
                  </div>
                </div>

                {/* Grille d'Applis BabiOS */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {/* Wave Money */}
                  <button
                    onClick={() => setActiveApp('wave')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-md shadow-sky-500/20">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Wave Babi</span>
                  </button>

                  {/* Lycées d'Excellence & Badges */}
                  <button
                    onClick={() => setActiveApp('schools')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-500/20">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Excellence</span>
                  </button>

                  {/* Tontine d'Abidjan */}
                  <button
                    onClick={() => setActiveApp('tontine')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                      <Users className="h-6 w-6 text-slate-950" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Tontine</span>
                  </button>

                  {/* Tuner Radios Live */}
                  <button
                    onClick={() => setActiveApp('radios')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 shadow-md shadow-orange-500/20">
                      <Radio className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Radios Live</span>
                  </button>

                  {/* Lavage d'Étoile (Sage de Yopougon) */}
                  <button
                    onClick={() => setActiveApp('sage')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-900 active:scale-95 transition-all"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 shadow-md shadow-purple-500/20">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">Lavage Étoile</span>
                  </button>

                  {/* Sécurité RGPD */}
                  <div className="flex flex-col items-center gap-1.5 p-2 opacity-70">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">RGPD Safe</span>
                  </div>
                </div>
              </div>

              {/* Dock Bas */}
              <div className="mb-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 flex justify-around">
                <span className="text-xl">📞</span>
                <span className="text-xl">💬</span>
                <span className="text-xl">🗺️</span>
                <span className="text-xl">⚙️</span>
              </div>
            </div>
          )}

          {/* APPLICATION : WAVE MONEY */}
          {activeApp === 'wave' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp('home')} className="text-xs text-sky-400 font-bold">‹ Retour</button>
                <h4 className="text-xs font-black uppercase text-white">Wave Babi Money</h4>
                <div className="w-6"></div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 p-4 text-white shadow-lg">
                <span className="text-[10px] font-bold uppercase opacity-80">Solde Disponible</span>
                <div className="text-xl font-black font-mono mt-1">
                  {playerState.unlimitedCashUntilDay && playerState.unlimitedCashUntilDay > playerState.dayCount
                    ? '∞ ILLIMITÉ'
                    : `${playerState.cash.toLocaleString('fr-FR')} FCFA`}
                </div>
                <div className="mt-3 text-[10px] opacity-75">
                  ID Compte : @{playerState.character.nickname}
                </div>
              </div>

              {playerState.destiny.isINPHB && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs">
                  <div className="font-bold text-emerald-400 uppercase text-[10px] mb-1">🏛️ Bourse d'État « Koidio » Active</div>
                  <p className="text-slate-300 text-[11px]">
                    Tu reçois automatiquement 50 000 FCFA versés par le Trésor public tous les 3 jours in-game.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* APPLICATION : LYCÉES D'EXCELLENCE & LES 3 BADGES */}
          {activeApp === 'schools' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp('home')} className="text-xs text-emerald-400 font-bold">‹ Retour</button>
                <h4 className="text-xs font-black uppercase text-white">Lycées d'Excellence</h4>
                <div className="w-6"></div>
              </div>

              <p className="text-[10px] text-slate-400 leading-snug">
                Débloque les titres mythiques des grands sanctuaires académiques ivoiriens :
              </p>

              {SCHOOL_BADGES.map((badge) => {
                const isEarned = playerState.badges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      isEarned
                        ? 'border-emerald-500/60 bg-emerald-950/20'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{badge.icon}</span>
                        <div>
                          <h5 className="text-xs font-black uppercase text-white">{badge.name}</h5>
                          <span className="text-[10px] font-mono text-amber-400">{badge.institution}</span>
                        </div>
                      </div>
                      {isEarned ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                      {badge.description}
                    </p>

                    <div className="rounded-lg bg-slate-950/80 p-2 text-[9px] text-slate-300 space-y-0.5 mb-2">
                      <span className="font-bold text-amber-300 block">Avantages :</span>
                      {badge.perks.map((p, i) => (
                        <div key={i}>✓ {p}</div>
                      ))}
                    </div>

                    {!isEarned ? (
                      <button
                        onClick={() => {
                          onUnlockBadge(badge.id);
                          confetti({ particleCount: 50, spread: 60 });
                        }}
                        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 py-1.5 text-[10px] font-black uppercase text-slate-950 hover:opacity-90 active:scale-95"
                      >
                        Passer le Concours d'Élite
                      </button>
                    ) : (
                      <div className="text-center text-[10px] font-bold text-emerald-400 uppercase">
                        ✓ Titre Obtenu à Vie
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* APPLICATION : LA TONTINE MULTIJOUEUR */}
          {activeApp === 'tontine' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp('home')} className="text-xs text-amber-400 font-bold">‹ Retour</button>
                <h4 className="text-xs font-black uppercase text-white">Tontine de Babi</h4>
                <div className="w-6"></div>
              </div>

              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-slate-900 p-4">
                <span className="text-[10px] font-bold uppercase text-amber-400">Cagnotte en Cours</span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {playerState.tontineBalance.toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-[10px] text-slate-300 mt-2">
                  Cercle de 5 participants solidaires. Cotisation hebdomadaire de 50 000 F.
                </p>
              </div>

              <button
                onClick={onTontineContribute}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 active:scale-95"
              >
                Cotiser 50 000 FCFA
              </button>
            </div>
          )}

          {/* APPLICATION : TUNER RADIOS LIVE */}
          {activeApp === 'radios' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp('home')} className="text-xs text-orange-400 font-bold">‹ Retour</button>
                <h4 className="text-xs font-black uppercase text-white">Radios Direct Live</h4>
                <div className="w-6"></div>
              </div>

              {stations.map((st) => {
                const isCurrent = currentStation.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => radioService.playStation(st.id)}
                    className={`flex items-center justify-between w-full p-3 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? 'border-orange-500 bg-orange-950/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{st.logo}</span>
                      <div>
                        <div className="text-xs font-black text-white">{st.name}</div>
                        <span className="text-[10px] text-amber-400 font-mono">{st.frequency}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-orange-400 animate-pulse">● EN ONDE</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* APPLICATION : LAVAGE D'ÉTOILE CHEZ LE SAGE */}
          {activeApp === 'sage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <button onClick={() => setActiveApp('home')} className="text-xs text-purple-400 font-bold">‹ Retour</button>
                <h4 className="text-xs font-black uppercase text-white">Lavage d'Étoile</h4>
                <div className="w-6"></div>
              </div>

              <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4 text-center">
                <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2 animate-spin" style={{ animationDuration: '6s' }} />
                <h5 className="text-xs font-black uppercase text-white">Le Vieux Sage de Yopougon</h5>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                  Si la malchance s'acharne, le rituel traditionnel purifie ton Karma négatif et recharge ton Étoile de chance (+30%).
                </p>
                <div className="mt-3 text-xs font-mono font-bold text-amber-300">
                  Offrande : 10 000 FCFA
                </div>
              </div>

              <button
                onClick={onPurifyStar}
                className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-black uppercase text-white hover:bg-purple-500 active:scale-95"
              >
                Faire le Rituel de Purification
              </button>
            </div>
          )}
        </div>

        {/* Barre Accueil Bas (Home Bar) */}
        <div className="flex justify-center pb-2 pt-1">
          <button
            onClick={() => setActiveApp('home')}
            className="h-1 w-24 rounded-full bg-slate-700 hover:bg-slate-500"
          ></button>
        </div>

        {/* Bouton Fermer le Smartphone */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 rounded-full p-1 text-slate-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
