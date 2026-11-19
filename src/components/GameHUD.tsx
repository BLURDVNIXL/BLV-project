import React, { useState } from 'react';
import {
  Smartphone,
  Settings,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Dices,
  Pause,
  Wrench,
  Sun,
  CloudRain,
  Waves,
  Wind,
  Star,
} from 'lucide-react';
import { PlayerState, WeatherType } from '../types/game';
import { formatGameTime } from '../core/simulation';
import { t } from '../core/i18n';
import { CityHotspot, RadarSnapshot } from '../3d/sceneManager';
import { MinimapRadar } from './MinimapRadar';
import { JellyButton, RoundIconButton } from './ui/Jelly';

interface GameHUDProps {
  playerState: PlayerState;
  currentDistrict: string;
  nearbyHotspot: CityHotspot | null;
  nearbyVehicle: { id: string; label: string } | null;
  getRadarSnapshot: () => RadarSnapshot | null;
  /** Commandes tactiles affichées : le bouton « Interagir » de la manette remplace l'invitation du haut. */
  touchControls: boolean;
  onInteractClick: () => void;
  onRepairEngine: () => void;
  onOpenPhone: () => void;
  onOpenMap: () => void;
  onOpenSettings: () => void;
  onOpenRoulette: () => void;
  onToggleSound: () => void;
  onPauseClick: () => void;
  isMuted: boolean;
}

type OpenPanel = null | 'menu';

const WEATHER_LABEL: Record<'fr' | 'en', Record<WeatherType, string>> = {
  fr: { soleil: 'Ensoleillé', pluie: 'Pluie', inondation: 'Inondation', harmattan: 'Harmattan' },
  en: { soleil: 'Sunny', pluie: 'Rain', inondation: 'Flood', harmattan: 'Harmattan' },
};

function WeatherIcon({ weather }: { weather: WeatherType }) {
  const cls = 'h-7 w-7 short:h-5 short:w-5';
  if (weather === 'soleil') return <Sun className={`${cls} text-sun-500`} />;
  if (weather === 'pluie') return <CloudRain className={`${cls} text-lagoon-500`} />;
  if (weather === 'inondation') return <Waves className={`${cls} text-lagoon-600`} />;
  return <Wind className={`${cls} text-sun-600`} />;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onClick: () => void;
}

function MenuItem({ icon, label, detail, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center gap-2 rounded-2xl border-2 border-white bg-cream-100 px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-cream-200 focus-visible:outline-2 focus-visible:outline-lagoon-500"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sun-300 text-sun-600">{icon}</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold">{label}</span>
        {detail && <span className="block truncate text-[11px] font-semibold text-ink-600">{detail}</span>}
      </span>
    </button>
  );
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerState,
  currentDistrict,
  nearbyHotspot,
  nearbyVehicle,
  getRadarSnapshot,
  touchControls,
  onInteractClick,
  onRepairEngine,
  onOpenPhone,
  onOpenMap,
  onOpenSettings,
  onOpenRoulette,
  onToggleSound,
  onPauseClick,
  isMuted,
}) => {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const s = t(playerState.language);

  const toggle = (panel: Exclude<OpenPanel, null>) => setOpenPanel((p) => (p === panel ? null : panel));
  const closePanel = () => setOpenPanel(null);
  const runAndClose = (fn: () => void) => () => {
    closePanel();
    fn();
  };

  const showInteractPrompt = !touchControls && (nearbyHotspot || nearbyVehicle || playerState.isDriving);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-3 md:p-4 short:p-2">
      {/* Fond invisible : un toucher en dehors du menu le referme */}
      {openPanel && <div className="pointer-events-auto absolute inset-0 z-0" onClick={closePanel} aria-hidden="true" />}

      {/* ── HAUT ─────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full items-start justify-between gap-3">
        {/* Haut gauche : radar */}
        <div className="flex items-start gap-2">
          <MinimapRadar getSnapshot={getRadarSnapshot} district={currentDistrict} onOpen={onOpenMap} />
        </div>

        {/* Haut centre : alertes, et invitation à agir quand il n'y a pas de manette tactile */}
        <div className="flex flex-col items-center gap-2">
          {playerState.engineStalled && (
            <JellyButton tone="coral" size="sm" onClick={onRepairEngine} className="pointer-events-auto" icon={<Wrench className="h-4 w-4" />}>
              {s.engineStalled} — Réparer (5 000 F)
            </JellyButton>
          )}

          {showInteractPrompt && (
            <JellyButton
              tone="lagoon"
              size="md"
              onClick={onInteractClick}
              className="pointer-events-auto"
              icon={
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white bg-white/95 text-sm font-bold text-lagoon-600 shadow-sm">
                  E
                </span>
              }
            >
              {playerState.isDriving ? s.exitVehicle : nearbyHotspot ? nearbyHotspot.label : `${s.enterVehicle} ${nearbyVehicle?.label || ''}`}
            </JellyButton>
          )}

          {playerState.isDepressed && (
            <div className="panel border-coral-400 px-3 py-1.5 text-xs font-bold text-coral-600">{s.depressedWarning}</div>
          )}
        </div>

        {/* Haut droite : heure, météo, son, menu ; recherche */}
        <div className="pointer-events-auto relative flex flex-col items-end gap-2 short:gap-1">
          <div className="panel flex items-center gap-2.5 px-3 py-2 short:gap-1.5 short:px-2 short:py-1">
            <WeatherIcon weather={playerState.weather} />
            <div className="leading-tight">
              <div className="font-display text-xl font-bold tabular-nums short:text-base">{formatGameTime(playerState.gameTimeHours)}</div>
              <div className="text-xs font-semibold text-ink-600 short:text-[10px]">
                {s.day} {playerState.daysLived} · {WEATHER_LABEL[playerState.language][playerState.weather]}
              </div>
            </div>
            <RoundIconButton
              tone={isMuted ? 'coral' : 'palm'}
              size="sm"
              label={isMuted ? 'Activer le son' : 'Couper le son'}
              onClick={onToggleSound}
              tabIndex={-1}
              className="short:h-7 short:w-7"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </RoundIconButton>
            <RoundIconButton
              tone="sun"
              size="sm"
              label={s.menuLabel}
              aria-expanded={openPanel === 'menu'}
              onClick={() => toggle('menu')}
              tabIndex={-1}
              className="short:h-7 short:w-7"
            >
              <Settings className="h-4 w-4" />
            </RoundIconButton>
          </div>

          {openPanel === 'menu' && (
            <div className="panel panel-solid absolute right-0 top-[3.75rem] z-30 grid short:top-[2.75rem] w-[21rem] max-w-[calc(100vw-1.5rem)] grid-cols-2 gap-1.5 p-2">
              <MenuItem icon={<Pause className="h-4 w-4 fill-current" />} label={s.pauseLabel} onClick={runAndClose(onPauseClick)} />
              <MenuItem icon={<SlidersHorizontal className="h-4 w-4" />} label={s.settingsLabel} onClick={runAndClose(onOpenSettings)} />
              <MenuItem icon={<Smartphone className="h-4 w-4" />} label="MyOS" onClick={runAndClose(onOpenPhone)} />
              <MenuItem icon={<Dices className="h-4 w-4" />} label={s.destinyBtn} onClick={runAndClose(onOpenRoulette)} />
            </div>
          )}

          <div className="flex items-center gap-2">
            {playerState.policeWanted > 0 && (
              <div className="panel flex items-center gap-0.5 px-2.5 py-1" aria-label={`Recherché : ${playerState.policeWanted} sur 5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= playerState.policeWanted ? 'fill-coral-500 text-coral-500' : 'text-ink-400/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
