import React, { useState } from 'react';
import {
  Smartphone,
  Radio,
  Settings,
  SlidersHorizontal,
  Flame,
  Volume2,
  VolumeX,
  Lock,
  Dices,
  Pause,
  Wrench,
  Utensils,
  Zap,
  ShowerHead,
  Droplet,
  Sun,
  CloudRain,
  Waves,
  Wind,
  Star,
  Trophy,
} from 'lucide-react';
import { PlayerState, WeatherType } from '../types/game';
import { RADIO_STATIONS } from '../core/destinies';
import { formatGameTime, hasUnlimitedPlatinum } from '../core/simulation';
import { getMissionForDestiny } from '../core/missions';
import { t } from '../core/i18n';
import { CityHotspot, RadarSnapshot } from '../3d/sceneManager';
import { MinimapRadar } from './MinimapRadar';
import { RadioPlayStatus } from '../audio/radioManager';
import { JellyButton, RoundIconButton } from './ui/Jelly';
import { BarGauge, RingGauge } from './ui/Gauge';
import { FcfaCoin, GroupBadge, StarBadge } from './ui/icons';

interface GameHUDProps {
  playerState: PlayerState;
  currentDistrict: string;
  onlineCount: number;
  nearbyHotspot: CityHotspot | null;
  nearbyVehicle: { id: string; label: string } | null;
  radioStatus: RadioPlayStatus;
  getRadarSnapshot: () => RadarSnapshot | null;
  /** Commandes tactiles affichées : le bouton « Interagir » de la manette remplace l'invitation du haut. */
  touchControls: boolean;
  onInteractClick: () => void;
  onRepairEngine: () => void;
  onOpenPhone: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenRoulette: () => void;
  onNextRadio: () => void;
  onToggleSound: () => void;
  onPauseClick: () => void;
  isMuted: boolean;
}

type OpenPanel = null | 'flag' | 'mission' | 'menu';

const WEATHER_LABEL: Record<'fr' | 'en', Record<WeatherType, string>> = {
  fr: { soleil: 'Ensoleillé', pluie: 'Pluie', inondation: 'Inondation', harmattan: 'Harmattan' },
  en: { soleil: 'Sunny', pluie: 'Rain', inondation: 'Flood', harmattan: 'Harmattan' },
};

function WeatherIcon({ weather }: { weather: WeatherType }) {
  const cls = 'h-7 w-7';
  if (weather === 'soleil') return <Sun className={`${cls} text-sun-500`} />;
  if (weather === 'pluie') return <CloudRain className={`${cls} text-lagoon-500`} />;
  if (weather === 'inondation') return <Waves className={`${cls} text-lagoon-600`} />;
  return <Wind className={`${cls} text-sun-600`} />;
}

/** Drapeau de la Côte d'Ivoire (orange, blanc, vert) dessiné en SVG : pas d'emoji, rendu identique partout. */
function IvoryFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="10" height="20" fill="#f77f00" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#009e60" />
    </svg>
  );
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
  onlineCount,
  nearbyHotspot,
  nearbyVehicle,
  radioStatus,
  getRadarSnapshot,
  touchControls,
  onInteractClick,
  onRepairEngine,
  onOpenPhone,
  onOpenSettings,
  onOpenAdmin,
  onOpenRoulette,
  onNextRadio,
  onToggleSound,
  onPauseClick,
  isMuted,
}) => {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const s = t(playerState.language);
  const currentRadio = RADIO_STATIONS.find((r) => r.id === playerState.activeRadioId) || RADIO_STATIONS[0];
  const platinumActive = hasUnlimitedPlatinum(playerState);
  const mission = getMissionForDestiny(playerState.destiny.id);
  const missionIdx = Math.min(playerState.activeMission.stepIndex, mission.steps.length - 1);
  const missionStep = mission.steps[missionIdx];

  const toggle = (panel: Exclude<OpenPanel, null>) => setOpenPanel((p) => (p === panel ? null : panel));
  const closePanel = () => setOpenPanel(null);
  const runAndClose = (fn: () => void) => () => {
    closePanel();
    fn();
  };

  const vitals = [
    { label: s.hunger, value: playerState.needs.hunger, tone: 'palm' as const, icon: <Utensils className="h-5 w-5" /> },
    { label: s.energy, value: playerState.needs.energy, tone: 'sun' as const, icon: <Zap className="h-5 w-5" /> },
    { label: s.hygiene, value: playerState.needs.hygiene, tone: 'lagoon' as const, icon: <ShowerHead className="h-5 w-5" /> },
    { label: s.bladder, value: playerState.needs.bladder, tone: 'plum' as const, icon: <Droplet className="h-5 w-5" /> },
  ];

  const showInteractPrompt = !touchControls && (nearbyHotspot || nearbyVehicle || playerState.isDriving);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-3 md:p-4">
      {/* Fond invisible : un toucher en dehors d'une fiche ou du menu la referme */}
      {openPanel && <div className="pointer-events-auto absolute inset-0 z-0" onClick={closePanel} aria-hidden="true" />}

      {/* ── HAUT ─────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full items-start justify-between gap-3">
        {/* Haut gauche : radar, pastilles destin et mission, besoins */}
        <div className="flex items-start gap-2">
          <MinimapRadar getSnapshot={getRadarSnapshot} district={currentDistrict} />

          <div className="relative flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle('flag')}
                aria-expanded={openPanel === 'flag'}
                aria-label={`${playerState.destiny.name} : voir la fiche`}
                title={playerState.destiny.name}
                className="pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: playerState.destiny.color }}
              >
                <IvoryFlag className="h-6 w-9 rounded-sm border border-white/80" />
              </button>

              <button
                type="button"
                onClick={() => toggle('mission')}
                aria-expanded={openPanel === 'mission'}
                aria-label="Voir la mission en cours"
                className="pointer-events-auto flex h-10 items-center gap-1 rounded-full border-2 border-white bg-sun-300 px-3 text-sm font-bold tabular-nums text-sun-600 shadow-md transition-transform active:scale-95"
              >
                <Trophy className="h-4 w-4" />
                {playerState.activeMission.completed ? 'Fini' : `${missionIdx + 1}/${mission.steps.length}`}
              </button>
            </div>

            {openPanel === 'flag' && (
              <div className="panel panel-solid pointer-events-auto absolute left-0 top-14 z-30 w-64 space-y-1.5 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-base font-semibold leading-tight">{playerState.destiny.name}</span>
                  <span className="shrink-0 rounded-full bg-sun-300 px-2 py-0.5 text-[11px] font-bold uppercase text-sun-600">
                    {playerState.destiny.rarity}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <FcfaCoin className="h-6 w-6 shrink-0" />
                  <span className="font-display text-2xl font-bold leading-none text-palm-600">
                    {Math.round(playerState.cash).toLocaleString('fr-FR')}
                  </span>
                </div>
                {(playerState.bankCash > 0 || playerState.debt > 0) && (
                  <div className="flex gap-2 text-xs font-semibold tabular-nums">
                    {playerState.bankCash > 0 && (
                      <span className="text-lagoon-600">
                        {s.bankBalance} : {Math.round(playerState.bankCash).toLocaleString('fr-FR')}
                      </span>
                    )}
                    {playerState.debt > 0 && <span className="text-coral-600">−{Math.round(playerState.debt).toLocaleString('fr-FR')}</span>}
                  </div>
                )}
                {playerState.destiny.englishLock && (
                  <div className={`text-xs font-semibold ${platinumActive ? 'text-sun-600' : 'text-coral-600'}`}>
                    {platinumActive ? `${s.platinumActive} (${playerState.goldenBoyDaysLeft}d)` : s.platinumExpired}
                  </div>
                )}
                {playerState.destiny.rehabJourney && (
                  <div className={`text-xs font-semibold ${playerState.redemptionTrophyUnlocked ? 'text-palm-600' : 'text-sun-600'}`}>
                    {playerState.redemptionTrophyUnlocked ? 'Trophée Rédemption débloqué' : `Sevrage : ${playerState.cleanDaysStreak}/7 jours`}
                  </div>
                )}
                {playerState.destiny.realMadridSuperstar && (
                  <div className="text-xs font-semibold text-lagoon-600">Académie niveau {playerState.yannisAcademyLevel}/3</div>
                )}
              </div>
            )}

            {openPanel === 'mission' && (
              <div className="panel panel-solid pointer-events-auto absolute left-0 top-14 z-30 w-64 space-y-1 p-3">
                <div className="font-display text-sm font-semibold leading-tight text-ink-600">{mission.title}</div>
                {playerState.activeMission.completed ? (
                  <div className="text-sm font-bold text-palm-600">Trophée : {mission.finalTrophy}</div>
                ) : (
                  <>
                    <div className="text-sm font-bold leading-tight">{missionStep.title}</div>
                    <div className="text-xs font-semibold text-ink-600">{missionStep.description}</div>
                  </>
                )}
              </div>
            )}

            <div className="panel pointer-events-auto hidden flex-col gap-2 p-2.5 sm:flex">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 shrink-0 text-sun-500" />
                <div className="w-44 short:w-36">
                  <div className="flex items-baseline justify-between text-xs font-bold text-ink-600">
                    <span className="truncate">{s.envyGauge}</span>
                    {playerState.needs.envy < 30 && <span className="tabular-nums text-coral-600">{Math.round(playerState.needs.envy)}%</span>}
                  </div>
                  <BarGauge value={playerState.needs.envy} tone={playerState.needs.envy < 30 ? 'coral' : 'sun'} label={s.envyGauge} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {vitals.map((v) => (
                  <RingGauge key={v.label} value={v.value} tone={v.tone} label={v.label} icon={v.icon} size={42} />
                ))}
              </div>
            </div>
          </div>
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

        {/* Haut droite : heure, météo, son, menu ; Étoile ; recherche et joueurs */}
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          <div className="panel flex items-center gap-2.5 px-3 py-2">
            <WeatherIcon weather={playerState.weather} />
            <div className="leading-tight">
              <div className="font-display text-xl font-bold tabular-nums">{formatGameTime(playerState.gameTimeHours)}</div>
              <div className="text-xs font-semibold text-ink-600">
                {s.day} {playerState.daysLived} · {WEATHER_LABEL[playerState.language][playerState.weather]}
              </div>
            </div>
            <RoundIconButton
              tone={isMuted ? 'coral' : 'palm'}
              size="sm"
              label={isMuted ? 'Activer le son' : 'Couper le son'}
              onClick={onToggleSound}
              tabIndex={-1}
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
            >
              <Settings className="h-4 w-4" />
            </RoundIconButton>
          </div>

          {openPanel === 'menu' && (
            <div className="panel panel-solid absolute right-0 top-[3.75rem] z-30 grid w-[21rem] max-w-[calc(100vw-1.5rem)] grid-cols-2 gap-1.5 p-2">
              <MenuItem icon={<Pause className="h-4 w-4 fill-current" />} label={s.pauseLabel} onClick={runAndClose(onPauseClick)} />
              <MenuItem icon={<SlidersHorizontal className="h-4 w-4" />} label={s.settingsLabel} onClick={runAndClose(onOpenSettings)} />
              <MenuItem icon={<Smartphone className="h-4 w-4" />} label="BabiOS" onClick={runAndClose(onOpenPhone)} />
              <MenuItem
                icon={<Radio className="h-4 w-4" />}
                label={currentRadio.name}
                detail={`${currentRadio.freq} · ${radioStatus === 'live' ? 'En direct' : radioStatus === 'synth-fallback' ? 'Synthé' : 'Coupée'}`}
                onClick={onNextRadio}
              />
              <MenuItem icon={<Dices className="h-4 w-4" />} label={s.destinyBtn} onClick={runAndClose(onOpenRoulette)} />
              <MenuItem icon={<Lock className="h-4 w-4" />} label={s.adminLabel} onClick={runAndClose(onOpenAdmin)} />
            </div>
          )}

          <div className="panel flex items-center gap-2.5 px-3 py-2">
            <StarBadge className="h-8 w-8 shrink-0" />
            <div className="w-36">
              <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-xs font-bold">
                <span className="text-ink-600">{s.starLabel}</span>
                <span className="tabular-nums text-sun-600">{Math.round(playerState.star)}</span>
              </div>
              <BarGauge value={playerState.star} tone="sun" label={s.starLabel} />
            </div>
          </div>

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
            <div className="panel flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-palm-600" title="Joueurs en ligne">
              <GroupBadge className="h-6 w-6" />
              <span>{onlineCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
