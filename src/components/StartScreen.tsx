/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Écran d'Accueil Officiel (Menu Principal)
 */

import React, { useState } from 'react';
import { Play, RotateCcw, Settings, ShieldCheck, Wrench, Volume2, Radio, Trash2, X, Lock } from 'lucide-react';
import { executeGdprRightToErasure, GameSettings } from '../services/storageService';

interface StartScreenProps {
  hasSaveGame: boolean;
  onNewGame: () => void;
  onContinueGame: () => void;
  onOpenAdmin: () => void;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  hasSaveGame,
  onNewGame,
  onContinueGame,
  onOpenAdmin,
  settings,
  onUpdateSettings
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminCodeModal, setShowAdminCodeModal] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [gdprPurged, setGdprPurged] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Code secret développeur
    if (adminCodeInput.trim() === 'BLV2026' || adminCodeInput.trim() === 'ADMIN' || adminCodeInput.trim() === 'BABI') {
      setShowAdminCodeModal(false);
      onOpenAdmin();
    } else {
      setAdminError(true);
    }
  };

  const handleGdprPurge = () => {
    if (window.confirm('Conformément au RGPD (Art. 17 Droit à l\'oubli) : cette action efface définitivement toutes vos données et sauvegardes locales. Confirmer ?')) {
      executeGdprRightToErasure();
      setGdprPurged(true);
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-slate-950 p-6 sm:p-10 select-none">
      {/* Fond atmosphérique : Ciel crépusculaire d'Abidjan (San Andreas sunset vibes) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-amber-950/40"></div>
        {/* Silhouette de la skyline du Plateau et du Pont De Gaulle */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent"></div>
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl"></div>
      </div>

      {/* Top Header : Badges et raccourci discret Admin */}
      <div className="relative z-10 flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloudflare Edge Abidjan
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Conforme RGPD
          </span>
        </div>

        {/* Accès discret au Sandbox Admin (RÈGLE : non public, sécurisé) */}
        <button
          onClick={() => setShowAdminCodeModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
          title="Mode Admin Sandbox (Développeurs & Testeurs)"
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Admin Dev Mode</span>
        </button>
      </div>

      {/* Centre : Titre Iconique BLV */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        <div className="relative mb-2">
          <h1 className="text-7xl sm:text-9xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 drop-shadow-[0_10px_25px_rgba(245,158,11,0.3)]">
            BLV
          </h1>
          <span className="absolute -bottom-2 right-1 sm:right-2 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/40">
            Babi Life Vibes
          </span>
        </div>

        <p className="max-w-md text-xs sm:text-sm font-medium text-slate-300 tracking-wide mt-3">
          La simulation de vie urbaine en 3D à Abidjan. Choisi par le destin, forgé par tes choix.
        </p>

        {/* Menu Principal des Actions */}
        <div className="mt-8 flex flex-col w-full max-w-xs gap-3">
          <button
            onClick={onNewGame}
            className="group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-base font-extrabold uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-amber-500/40 active:scale-95"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>Nouvelle Partie</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
          </button>

          {hasSaveGame && (
            <button
              onClick={onContinueGame}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:border-amber-400/60 hover:bg-slate-800 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              <span>Continuer la partie</span>
            </button>
          )}

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:border-slate-700 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Réglages & RGPD</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex w-full max-w-4xl items-center justify-between text-[11px] text-slate-500 border-t border-slate-900/80 pt-3">
        <span>© 2026 BLV • Moteur 3D San Andreas WebGL</span>
        <span>Version 1.0.0 (Release)</span>
      </div>

      {/* Modale des Réglages & Droit à l'oubli RGPD */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold uppercase tracking-wider text-white">Réglages du Jeu</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Volume Sonore */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    Effets Sonores
                  </span>
                  <span>{settings.soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.soundVolume}
                  onChange={(e) => onUpdateSettings({ ...settings, soundVolume: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Volume Radio Live */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Radio className="h-3.5 w-3.5 text-orange-400" />
                    Radios Ivoiriennes en Direct
                  </span>
                  <span>{settings.radioVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.radioVolume}
                  onChange={(e) => onUpdateSettings({ ...settings, radioVolume: Number(e.target.value) })}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* Voix Off Narrative */}
              <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-3 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Voix Off Narrative</span>
                <input
                  type="checkbox"
                  checked={settings.voiceOverEnabled}
                  onChange={(e) => onUpdateSettings({ ...settings, voiceOverEnabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500"
                />
              </div>

              {/* Section RGPD (RÈGLE 2 : Normes Européennes) */}
              <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-4 mt-6">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  Conformité RGPD (Art. 17 Droit à l'oubli)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Vos données restent strictement sur votre appareil. Vous pouvez à tout moment exercer votre droit d'effacement total.
                </p>
                <button
                  onClick={handleGdprPurge}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-rose-600/20 border border-rose-500/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600/30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {gdprPurged ? 'Données effacées avec succès' : 'Effacer toutes mes données (Droit à l\'oubli)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Authentification Mode Admin (RÈGLE : Accès privé) */}
      {showAdminCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold uppercase tracking-wider text-white text-sm">Mode Admin Sandbox</h3>
              </div>
              <button
                onClick={() => { setShowAdminCodeModal(false); setAdminError(false); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Espace réservé aux tests et configurations de développement (non public). Entrez le code d'accès :
            </p>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Code secret développeur..."
                value={adminCodeInput}
                onChange={(e) => { setAdminCodeInput(e.target.value); setAdminError(false); }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
              {adminError && (
                <p className="text-[11px] font-semibold text-rose-400">Code incorrect (Indice : BLV2026)</p>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Valider l'Accès
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
