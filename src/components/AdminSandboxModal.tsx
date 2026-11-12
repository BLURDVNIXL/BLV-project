/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Espace Admin Sandbox Secret (Tests & Configurations Développeur Non Public)
 */

import React, { useState } from 'react';
import { PlayerState, DestinyClass, SchoolBadgeId } from '../types/game';
import { ALL_DESTINIES } from '../data/destinies';
import { Wrench, X, PlusCircle, Sparkles, ShieldAlert, CloudRain, Sun, Wind, CheckCircle2 } from 'lucide-react';

interface AdminSandboxModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onUpdateState: (newState: Partial<PlayerState>) => void;
  onForceDestiny: (destiny: DestinyClass) => void;
}

export const AdminSandboxModal: React.FC<AdminSandboxModalProps> = ({
  playerState,
  onClose,
  onUpdateState,
  onForceDestiny
}) => {
  const [selectedDestinyId, setSelectedDestinyId] = useState(playerState.destiny.id);

  const handleApplyDestiny = () => {
    const dest = ALL_DESTINIES.find((d) => d.id === selectedDestinyId);
    if (dest) {
      onForceDestiny(dest);
    }
  };

  const handleAddCash = (amount: number) => {
    onUpdateState({ cash: playerState.cash + amount });
  };

  const handleSetWeather = (w: 'sunny' | 'rain_tropical' | 'flood_inondation' | 'harmattan') => {
    onUpdateState({ weather: w });
  };

  const handleSetHeat = (heat: number) => {
    onUpdateState({ policeHeat: Math.max(0, Math.min(5, heat)) });
  };

  const handleToggleBadge = (badgeId: SchoolBadgeId) => {
    const has = playerState.badges.includes(badgeId);
    if (has) {
      onUpdateState({ badges: playerState.badges.filter((b) => b !== badgeId) });
    } else {
      onUpdateState({ badges: [...playerState.badges, badgeId] });
    }
  };

  const handleSetEnvie = (val: number) => {
    onUpdateState({ envieJauge: Math.max(0, Math.min(100, val)) });
  };

  const handleAdvanceTime = (minutes: number) => {
    const newMin = (playerState.inGameMinute + minutes) % 1440;
    const addDay = playerState.inGameMinute + minutes >= 1440 ? 1 : 0;
    onUpdateState({ inGameMinute: newMin, dayCount: playerState.dayCount + addDay });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none text-white">
      <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/50 bg-slate-900 p-6 shadow-2xl text-left max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="font-black uppercase tracking-wider text-white text-base">
                Panneau Admin Sandbox (Tests Développeur)
              </h3>
              <p className="text-[10px] text-amber-300 font-mono">
                Mode confidentiel non public • Conforme aux normes d'audit européennes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. Forcer un Destin parmi les 19 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-xs font-black uppercase text-amber-400 mb-2">1. Forcer un Destin (19 Classes & Easter Eggs)</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedDestinyId}
                onChange={(e) => setSelectedDestinyId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
              >
                {ALL_DESTINIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.name} ({d.rarity.toUpperCase()})
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyDestiny}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95"
              >
                Appliquer Immédiatement
              </button>
            </div>
          </div>

          {/* 2. Économie & Cash */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-xs font-black uppercase text-emerald-400 mb-2">2. Injection d'Argent FCFA</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAddCash(100000)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-950"
              >
                +100 000 FCFA
              </button>
              <button
                onClick={() => handleAddCash(1000000)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-950"
              >
                +1 000 000 FCFA
              </button>
              <button
                onClick={() => handleAddCash(10000000)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-950"
              >
                +10 000 000 FCFA
              </button>
            </div>
          </div>

          {/* 3. Météo & Heure */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-xs font-black uppercase text-sky-400 mb-2">3. Contrôle Météo & Temps</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => handleSetWeather('sunny')}
                className={`flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-bold border ${
                  playerState.weather === 'sunny' ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Soleil Babi
              </button>

              <button
                onClick={() => handleSetWeather('rain_tropical')}
                className={`flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-bold border ${
                  playerState.weather === 'rain_tropical' ? 'border-sky-400 bg-sky-500/20 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <CloudRain className="h-3.5 w-3.5 text-sky-400" />
                Pluie Tropicale
              </button>

              <button
                onClick={() => handleSetWeather('flood_inondation')}
                className={`flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-bold border ${
                  playerState.weather === 'flood_inondation' ? 'border-rose-400 bg-rose-500/20 text-rose-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                🌊 Inondation
              </button>

              <button
                onClick={() => handleSetWeather('harmattan')}
                className={`flex items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-bold border ${
                  playerState.weather === 'harmattan' ? 'border-amber-600 bg-amber-600/20 text-amber-400' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <Wind className="h-3.5 w-3.5 text-amber-600" />
                Harmattan 38°C
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAdvanceTime(240)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Avancer le temps de 4h in-game (1h réelle)
              </button>
            </div>
          </div>

          {/* 4. Badges des Lycées d'Excellence */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-xs font-black uppercase text-purple-400 mb-2">4. Badges d'Élite Immédiats</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleToggleBadge('caiman')}
                className={`p-2 rounded-lg text-xs font-bold border text-center ${
                  playerState.badges.includes('caiman') ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                🐊 Caïman (Classique)
              </button>
              <button
                onClick={() => handleToggleBadge('alysma')}
                className={`p-2 rounded-lg text-xs font-bold border text-center ${
                  playerState.badges.includes('alysma') ? 'border-pink-500 bg-pink-950/40 text-pink-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                👑 Alysma (Ste-Marie)
              </button>
              <button
                onClick={() => handleToggleBadge('alex')}
                className={`p-2 rounded-lg text-xs font-bold border text-center ${
                  playerState.badges.includes('alex') ? 'border-sky-500 bg-sky-950/40 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                ⚡ Alex (Bassam)
              </button>
            </div>
          </div>

          {/* 5. Jauge d'Envie & Police Heat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-black uppercase text-rose-400 mb-2">Jauge d'Envie</h4>
              <div className="flex gap-2">
                <button onClick={() => handleSetEnvie(100)} className="rounded-lg bg-emerald-600/30 border border-emerald-500 px-3 py-1 text-xs text-emerald-300">Max 100%</button>
                <button onClick={() => handleSetEnvie(50)} className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300">50%</button>
                <button onClick={() => handleSetEnvie(0)} className="rounded-lg bg-rose-600/30 border border-rose-500 px-3 py-1 text-xs text-rose-300">0% (Dépression)</button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-xs font-black uppercase text-rose-400 mb-2">Étoiles Police Heat (0-5)</h4>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleSetHeat(star)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                      playerState.policeHeat === star ? 'border-rose-500 bg-rose-950 text-white' : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {star} ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
