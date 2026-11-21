import React, { useState } from 'react';
import { Settings, ShieldCheck, Trash2, Volume2, VolumeX, Globe, Gamepad2, Move3d, Eye, Users } from 'lucide-react';
import { PlayerState } from '../types/game';
import { purgeAllDataRGPD } from '../core/storage';
import { JellyButton } from './ui/Jelly';
import { Modal, SettingRow } from './ui/Modal';
import { DISTANCE_LEVEL_LABELS, clampLevel, type DistanceLevels, type DistancePref } from '../world/qualitySettings';

interface SettingsModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onToggleSound: () => void;
  isMuted: boolean;
  onToggleLanguage: () => void;
  forceGamepad: boolean;
  onToggleForceGamepad: () => void;
  showHud: boolean;
  onToggleHud: () => void;
  pcControlsMode: 'zqsl' | 'arrows';
  onChangeControlsMode: (mode: 'zqsl' | 'arrows') => void;
  /** 0,5 à 2,5 ; 1 = normal. */
  cameraSensitivity: number;
  onCameraSensitivityChange: (value: number) => void;
  /** 0 à 2,5 ; 1 = normal (0 = désactivée). */
  autoCameraSensitivity: number;
  onAutoCameraSensitivityChange: (value: number) => void;
  /** Distance d'affichage : « auto » ou niveau fixe 0..3. */
  renderDistance: DistancePref;
  onRenderDistanceChange: (pref: DistancePref) => void;
  /** Distance de simulation (PNJ, animaux) : « auto » ou niveau fixe 0..3. */
  simDistance: DistancePref;
  onSimDistanceChange: (pref: DistancePref) => void;
  /** Niveaux réellement appliqués par la scène (utile en Auto). */
  effectiveDistances: DistanceLevels;
  onResetGame: () => void;
}

/** Curseur à 5 positions : 0 = Auto, 1..4 = niveaux 0..3. En Auto, le niveau en cours est affiché. */
const DistanceSlider: React.FC<{
  pref: DistancePref;
  effective: number;
  lang: 'fr' | 'en';
  label: string;
  onChange: (pref: DistancePref) => void;
}> = ({ pref, effective, lang, label, onChange }) => {
  const labels = DISTANCE_LEVEL_LABELS[lang];
  const position = pref === 'auto' ? 0 : pref + 1;
  const text = pref === 'auto' ? `Auto · ${labels[clampLevel(effective)]}` : labels[pref];
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={position}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(v === 0 ? 'auto' : clampLevel(v - 1));
        }}
        aria-label={label}
        aria-valuetext={text}
        className="h-2 w-24 cursor-pointer accent-sun-500"
      />
      <span className="w-24 text-right text-xs font-bold">{text}</span>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  playerState,
  onClose,
  onToggleSound,
  isMuted,
  onToggleLanguage,
  forceGamepad,
  onToggleForceGamepad,
  showHud,
  onToggleHud,
  pcControlsMode,
  onChangeControlsMode,
  cameraSensitivity,
  onCameraSensitivityChange,
  autoCameraSensitivity,
  onAutoCameraSensitivityChange,
  renderDistance,
  onRenderDistanceChange,
  simDistance,
  onSimDistanceChange,
  effectiveDistances,
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
      <SettingRow title="Son" description="Effets sonores et ambiance">
        <JellyButton
          tone={isMuted ? 'coral' : 'palm'}
          size="sm"
          onClick={onToggleSound}
          icon={isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        >
          {isMuted ? 'Muet' : 'Actif'}
        </JellyButton>
      </SettingRow>

      <SettingRow title="Affichage du HUD" description="Masque ou réaffiche les infos du jeu en cours">
        <JellyButton tone={showHud ? 'palm' : 'cream'} size="sm" onClick={onToggleHud} icon={<Settings className="h-4 w-4" />}>
          {showHud ? 'Visible' : 'Masqué'}
        </JellyButton>
      </SettingRow>

      <SettingRow title="Contrôles PC" description="ZQSL ou flèches pour le déplacement">
        <JellyButton
          tone={pcControlsMode === 'zqsl' ? 'lagoon' : 'sun'}
          size="sm"
          onClick={() => onChangeControlsMode(pcControlsMode === 'zqsl' ? 'arrows' : 'zqsl')}
          icon={<Gamepad2 className="h-4 w-4" />}
        >
          {pcControlsMode === 'zqsl' ? 'ZQSL' : 'Flèches'}
        </JellyButton>
      </SettingRow>

      <SettingRow title="Manette tactile" description="Automatique sur mobile en paysage · optionnelle sur ordinateur">
        <JellyButton tone={forceGamepad ? 'sun' : 'cream'} size="sm" onClick={onToggleForceGamepad} icon={<Gamepad2 className="h-4 w-4" />}>
          {forceGamepad ? 'Toujours visible' : 'Auto mobile'}
        </JellyButton>
      </SettingRow>

      <SettingRow
        title={playerState.language === 'en' ? 'Camera sensitivity' : 'Sensibilité de la caméra'}
        description={playerState.language === 'en' ? 'Swipe / mouse turning speed' : 'Vitesse de rotation au doigt ou à la souris'}
      >
        <div className="flex items-center gap-2">
          <Move3d className="h-4 w-4 text-ink-600" aria-hidden="true" />
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={cameraSensitivity}
            onChange={(e) => onCameraSensitivityChange(Number(e.target.value))}
            aria-label={playerState.language === 'en' ? 'Camera sensitivity' : 'Sensibilité de la caméra'}
            className="h-2 w-28 cursor-pointer accent-sun-500"
          />
          <span className="w-10 text-right text-xs font-bold tabular-nums">{cameraSensitivity.toFixed(1)}×</span>
        </div>
      </SettingRow>

      <SettingRow
        title={playerState.language === 'en' ? 'Auto camera rotation' : 'Rotation auto de la caméra'}
        description={
          playerState.language === 'en'
            ? 'Speed of automatic follow while moving (0× = off)'
            : 'Sensibilité du suivi automatique en mouvement (0× = désactivée)'
        }
      >
        <div className="flex items-center gap-2">
          <Move3d className="h-4 w-4 text-ink-600" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={2.5}
            step={0.1}
            value={autoCameraSensitivity}
            onChange={(e) => onAutoCameraSensitivityChange(Number(e.target.value))}
            aria-label={playerState.language === 'en' ? 'Auto camera rotation' : 'Rotation auto de la caméra'}
            className="h-2 w-28 cursor-pointer accent-sun-500"
          />
          <span className="w-10 text-right text-xs font-bold tabular-nums">{autoCameraSensitivity.toFixed(1)}×</span>
        </div>
      </SettingRow>

      <SettingRow
        title={playerState.language === 'en' ? 'Render distance' : 'Distance d’affichage'}
        description={
          playerState.language === 'en'
            ? 'How far the city is drawn. Auto adapts to your device and lowers itself if the game stutters.'
            : 'Jusqu’où la ville est dessinée. Auto s’adapte à ton appareil et baisse seule si le jeu saccade.'
        }
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-ink-600" aria-hidden="true" />
          <DistanceSlider
            pref={renderDistance}
            effective={effectiveDistances.render}
            lang={playerState.language}
            label={playerState.language === 'en' ? 'Render distance' : 'Distance d’affichage'}
            onChange={onRenderDistanceChange}
          />
        </div>
      </SettingRow>

      <SettingRow
        title={playerState.language === 'en' ? 'Simulation distance' : 'Distance de simulation'}
        description={
          playerState.language === 'en'
            ? 'How far and how densely pedestrians and animals live around you. Lower = fewer of them, smoother game.'
            : 'À quelle distance et avec quelle densité piétons et animaux vivent autour de toi. Plus bas = moins nombreux, jeu plus fluide.'
        }
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-ink-600" aria-hidden="true" />
          <DistanceSlider
            pref={simDistance}
            effective={effectiveDistances.sim}
            lang={playerState.language}
            label={playerState.language === 'en' ? 'Simulation distance' : 'Distance de simulation'}
            onChange={onSimDistanceChange}
          />
        </div>
      </SettingRow>

      <SettingRow
        title="Langue / Language"
        description={playerState.destiny.englishLock ? '🔒 Locked in Jet-Set English (Golden Boy)' : 'Français / English'}
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
