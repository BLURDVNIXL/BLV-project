import React, { useState } from 'react';
import { Settings, ShieldCheck, Trash2, Volume2, VolumeX, Globe, Gamepad2, X } from 'lucide-react';
import { PlayerState } from '../types/game';
import { purgeAllDataRGPD } from '../core/storage';

interface SettingsModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onToggleSound: () => void;
  isMuted: boolean;
  onToggleLanguage: () => void;
  forceGamepad: boolean;
  onToggleForceGamepad: () => void;
  onResetGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  playerState,
  onClose,
  onToggleSound,
  isMuted,
  onToggleLanguage,
  forceGamepad,
  onToggleForceGamepad,
  onResetGame,
}) => {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [goldenBoyNotice, setGoldenBoyNotice] = useState(false);

  const handleLanguageClick = () => {
    if (playerState.destiny.englishLock) {
      setGoldenBoyNotice(true);
    } else {
      onToggleLanguage();
    }
  };

  const handlePurgeConfirm = async () => {
    await purgeAllDataRGPD(playerState.playerId, playerState.sessionToken);
    setPurgeSuccess(true);
    setTimeout(() => {
      onResetGame();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/92 text-white select-none">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-amber-400" />
            <h3 className="font-display text-xl font-black uppercase text-white">
              Réglages & Conformité Européenne
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer Réglages"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* SOUND */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Audio & Radios d’Abidjan</div>
              <div className="text-[11px] text-slate-400">Radios FM et ambiance sonore</div>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${
                isMuted ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{isMuted ? 'Muet' : 'Actif'}</span>
            </button>
          </div>

          {/* TOUCH GAMEPAD OVERLAY ON PC */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Manette Tactile PlayStation</div>
              <div className="text-[11px] text-slate-400">Auto sur mobile paysage · Optionnelle sur PC</div>
            </div>
            <button
              type="button"
              onClick={onToggleForceGamepad}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${
                forceGamepad ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              <span>{forceGamepad ? 'Forcée ON' : 'Auto Mobile'}</span>
            </button>
          </div>

          {/* LANGUAGE */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Langue / Language</div>
              <div className="text-[11px] text-slate-400">
                {playerState.destiny.englishLock
                  ? '🔒 Locked in Jet-Set English (Golden Boy)'
                  : 'Français (Babi) / English'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLanguageClick}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white border border-slate-700 cursor-pointer"
            >
              <Globe className="h-4 w-4 text-cyan-400" />
              <span>{playerState.language === 'fr' ? 'Français' : 'English'}</span>
            </button>
          </div>

          {goldenBoyNotice && (
            <div className="rounded-xl bg-amber-950/80 p-3 border border-amber-500/50 text-xs text-amber-200">
              <div className="font-bold uppercase text-[10px] text-amber-400">🔒 Golden Boy Easter Egg :</div>
              <p className="mt-0.5 italic">
                « Bro, you literally graduated from the American International School of Abidjan, French is not in your DNA anymore! »
              </p>
            </div>
          )}

          {/* RGPD COMPLIANCE NOTICE */}
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              Protection des Données (RGPD UE 2016/679)
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>Minimisation (Art. 25)</strong> : Aucune donnée nominative réelle n’est demandée. L’état de jeu est enregistré sous un identifiant technique pseudonyme (IndexedDB local + base serveur SQLite). Zéro cookie publicitaire ni traceur tiers.
            </p>
          </div>

          {/* RIGHT TO ERASURE (ART. 17 RGPD) */}
          <div className="rounded-xl bg-rose-950/60 p-4 border border-rose-500/40 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-rose-300">Droit à l’Oubli (Article 17 RGPD)</div>
                <div className="text-[11px] text-rose-300/80">Efface les clés blv_* locales, IndexedDB et la session serveur</div>
              </div>
              {!confirmPurge ? (
                <button
                  type="button"
                  onClick={() => setConfirmPurge(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-bold text-white cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Purger</span>
                </button>
              ) : (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePurgeConfirm}
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-black text-white cursor-pointer"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPurge(false)}
                    className="rounded-xl bg-slate-800 px-2.5 py-2 text-xs text-slate-300 cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
            {purgeSuccess && (
              <div className="text-xs text-emerald-400 font-bold">
                ✅ Toutes les données locales et caches ont été purgés. Réinitialisation...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
