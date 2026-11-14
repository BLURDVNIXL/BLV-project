import React, { useState } from 'react';
import { Settings, ShieldCheck, Trash2, Volume2, VolumeX, Globe, Gamepad2 } from 'lucide-react';
import { PlayerState } from '../types/game';
import { purgeAllDataRGPD } from '../core/storage';
import { JellyButton } from './ui/Jelly';
import { Modal, SettingRow } from './ui/Modal';

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
    <Modal title="Réglages" icon={<Settings className="h-5 w-5" />} onClose={onClose} closeLabel="Fermer les réglages">
      <SettingRow title="Audio & radios d’Abidjan" description="Radios FM et ambiance sonore">
        <JellyButton
          tone={isMuted ? 'coral' : 'palm'}
          size="sm"
          onClick={onToggleSound}
          icon={isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        >
          {isMuted ? 'Muet' : 'Actif'}
        </JellyButton>
      </SettingRow>

      <SettingRow title="Manette tactile" description="Automatique sur mobile en paysage · optionnelle sur ordinateur">
        <JellyButton tone={forceGamepad ? 'sun' : 'cream'} size="sm" onClick={onToggleForceGamepad} icon={<Gamepad2 className="h-4 w-4" />}>
          {forceGamepad ? 'Toujours visible' : 'Auto mobile'}
        </JellyButton>
      </SettingRow>

      <SettingRow
        title="Langue / Language"
        description={playerState.destiny.englishLock ? '🔒 Locked in Jet-Set English (Golden Boy)' : 'Français (Babi) / English'}
      >
        <JellyButton tone="lagoon" size="sm" onClick={handleLanguageClick} icon={<Globe className="h-4 w-4" />}>
          {playerState.language === 'fr' ? 'Français' : 'English'}
        </JellyButton>
      </SettingRow>

      {goldenBoyNotice && (
        <div className="rounded-2xl border-2 border-sun-400/60 bg-sun-300/25 p-3 text-xs">
          <div className="text-[11px] font-bold uppercase text-sun-600">🔒 Golden Boy Easter Egg</div>
          <p className="mt-0.5 italic text-ink-800">
            « Bro, you literally graduated from the American International School of Abidjan, French is not in your DNA anymore! »
          </p>
        </div>
      )}

      <SettingRow
        title="Protection des données (RGPD UE 2016/679)"
        description={
          <>
            <strong>Minimisation (Art. 25)</strong> : aucune donnée nominative réelle n’est demandée. L’état de jeu est enregistré sous un identifiant technique pseudonyme (IndexedDB local + base serveur SQLite). Zéro cookie publicitaire ni traceur tiers.
          </>
        }
      >
        <ShieldCheck className="h-6 w-6 text-palm-500" />
      </SettingRow>

      <SettingRow
        tone="coral"
        title="Droit à l’oubli (article 17 RGPD)"
        description="Efface les clés blv_* locales, IndexedDB et la session serveur"
      >
        {!confirmPurge ? (
          <JellyButton tone="coral" size="sm" onClick={() => setConfirmPurge(true)} icon={<Trash2 className="h-4 w-4" />}>
            Purger
          </JellyButton>
        ) : (
          <div className="flex gap-1.5">
            <JellyButton tone="coral" size="sm" onClick={handlePurgeConfirm}>
              Confirmer
            </JellyButton>
            <JellyButton tone="cream" size="sm" onClick={() => setConfirmPurge(false)}>
              Annuler
            </JellyButton>
          </div>
        )}
      </SettingRow>
      {purgeSuccess && (
        <div className="text-sm font-bold text-palm-600">✅ Toutes les données locales et caches ont été purgés. Réinitialisation…</div>
      )}
    </Modal>
  );
};
