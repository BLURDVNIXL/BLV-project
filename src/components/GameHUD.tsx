import React, { useState } from 'react';
import {
  Smartphone,
  Radio,
  Settings,
  ChevronDown,
  ChevronUp,
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

export const GameHUD: React.FC<GameHUDProps> = ({
  playerState,
  currentDistrict,
  onlineCount,
  nearbyHotspot,
  nearbyVehicle,
  radioStatus,
  getRadarSnapshot,
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
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const s = t(playerState.language);
  const currentRadio = RADIO_STATIONS.find((r) => r.id === playerState.activeRadioId) || RADIO_STATIONS[0];
  const platinumActive = hasUnlimitedPlatinum(playerState);
  const mission = getMissionForDestiny(playerState.destiny.id);
  const missionIdx = Math.min(playerState.activeMission.stepIndex, mission.steps.length - 1);
  const missionStep = mission.steps[missionIdx];

  const vitals = [
    { label: s.hunger, value: playerState.needs.hunger, tone: 'palm' as const, icon: <Utensils className="h-5 w-5" /> },
    { label: s.energy, value: playerState.needs.energy, tone: 'sun' as const, icon: <Zap className="h-5 w-5" /> },
    { label: s.hygiene, value: playerState.needs.hygiene, tone: 'lagoon' as const, icon: <ShowerHead className="h-5 w-5" /> },
    { label: s.bladder, value: playerState.needs.bladder, tone: 'plum' as const, icon: <Droplet className="h-5 w-5" /> },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-3 md:p-4">
      {/* ── HAUT ─────────────────────────────────────────── */}
      <div className="flex w-full items-start justify-between gap-3">
        {/* Haut gauche : qui je suis, mon argent, ma mission */}
        <div className="flex max-w-[17rem] flex-col gap-2 md:max-w-sm">
          <div className="panel pointer-events-auto flex items-center gap-3 px-3 py-2.5">
            <div
              style={{ backgroundColor: playerState.destiny.color }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-white text-xl shadow-sm"
              aria-hidden="true"
            >
              🇨🇮
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-display text-base font-semibold leading-tight">{playerState.destiny.name}</span>
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
                <div className="mt-0.5 flex gap-2 text-xs font-semibold tabular-nums">
                  {playerState.bankCash > 0 && (
                    <span className="text-lagoon-600">
                      {s.bankBalance} : {Math.round(playerState.bankCash).toLocaleString('fr-FR')}
                    </span>
                  )}
                  {playerState.debt > 0 && <span className="text-coral-600">−{Math.round(playerState.debt).toLocaleString('fr-FR')}</span>}
                </div>
              )}
            </div>
          </div>

          {(playerState.destiny.englishLock || playerState.destiny.rehabJourney || playerState.destiny.realMadridSuperstar) && (
            <div className="panel pointer-events-auto flex flex-col gap-0.5 px-3 py-1.5 text-xs font-semibold">
              {playerState.destiny.englishLock && (
                <span className={platinumActive ? 'text-sun-600' : 'text-coral-600'}>
                  {platinumActive ? `${s.platinumActive} (${playerState.goldenBoyDaysLeft}d)` : s.platinumExpired}
                </span>
              )}
              {playerState.destiny.rehabJourney && (
                <span className={playerState.redemptionTrophyUnlocked ? 'text-palm-600' : 'text-sun-600'}>
                  {playerState.redemptionTrophyUnlocked ? 'Trophée Rédemption débloqué' : `Sevrage : ${playerState.cleanDaysStreak}/7 jours`}
                </span>
              )}
              {playerState.destiny.realMadridSuperstar && (
                <span className="text-lagoon-600">Académie niveau {playerState.yannisAcademyLevel}/3</span>
              )}
            </div>
          )}

          <div className="panel pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-sun-300 px-2 text-[11px] font-bold text-sun-600">
              <Trophy className="h-3.5 w-3.5" />
              {playerState.activeMission.completed ? 'Fini' : `${missionIdx + 1}/${mission.steps.length}`}
            </span>
            <span className="truncate font-semibold">{playerState.activeMission.completed ? mission.title : missionStep.title}</span>
          </div>
        </div>

        {/* Haut centre : invitations à agir */}
        <div className="flex flex-col items-center gap-2">
          {playerState.engineStalled && (
            <JellyButton tone="coral" size="sm" onClick={onRepairEngine} className="pointer-events-auto" icon={<Wrench className="h-4 w-4" />}>
              {s.engineStalled} — Réparer (5 000 F)
            </JellyButton>
          )}

          {(nearbyHotspot || nearbyVehicle || playerState.isDriving) && (
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

        {/* Haut droite : heure, météo, Étoile */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
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
            <RoundIconButton tone="sun" size="sm" label="Mettre en pause" onClick={onPauseClick} tabIndex={-1}>
              <Pause className="h-4 w-4 fill-white" />
            </RoundIconButton>
            {/* Sur téléphone en paysage, le dock est masqué : les réglages passent ici */}
            <div className="hidden touch-short:block">
              <RoundIconButton tone="lagoon" size="sm" label="Réglages" onClick={onOpenSettings} tabIndex={-1}>
                <Settings className="h-4 w-4" />
              </RoundIconButton>
            </div>
          </div>

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

      {/* ── BAS ──────────────────────────────────────────── */}
      <div className="flex w-full items-end justify-between gap-3">
        {/* Bas gauche : radar + besoins */}
        <div className="flex items-end gap-2.5 touch-short:mb-[116px]">
          <MinimapRadar getSnapshot={getRadarSnapshot} district={currentDistrict} />

          <div className="panel pointer-events-auto hidden flex-col gap-2 p-2.5 sm:flex">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 shrink-0 text-sun-500" />
              <div className="w-44">
                <div className="flex items-baseline justify-between text-xs font-bold text-ink-600">
                  <span className="truncate">{s.envyGauge}</span>
                  {playerState.needs.envy < 30 && <span className="tabular-nums text-coral-600">{Math.round(playerState.needs.envy)}%</span>}
                </div>
                <BarGauge value={playerState.needs.envy} tone={playerState.needs.envy < 30 ? 'coral' : 'sun'} label={s.envyGauge} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              {vitals.map((v) => (
                <RingGauge key={v.label} value={v.value} tone={v.tone} label={v.label} icon={v.icon} />
              ))}
            </div>
          </div>
        </div>

        {/* Bas droite : dock d'actions */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 touch-short:hidden">
          <RoundIconButton
            tone="cream"
            size="sm"
            label={isDockCollapsed ? s.showDock : s.hideDock}
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          >
            {isDockCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </RoundIconButton>

          {!isDockCollapsed && (
            <div className="panel flex items-center gap-2.5 px-3 py-2.5">
              <JellyButton tone="sun" size="md" onClick={onOpenPhone} icon={<Smartphone className="h-5 w-5" />}>
                BabiOS
              </JellyButton>

              <button
                type="button"
                onClick={onNextRadio}
                className="flex items-center gap-2 rounded-2xl border-2 border-white bg-cream-100 px-2.5 py-1.5 text-left shadow-sm transition-colors hover:bg-cream-200"
              >
                <Radio className="h-5 w-5 shrink-0 text-palm-500" />
                <div className="max-w-[120px] leading-tight">
                  <div className="truncate text-xs font-bold">{currentRadio.name}</div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    {currentRadio.freq} · {radioStatus === 'live' ? 'En direct' : radioStatus === 'synth-fallback' ? 'Synthé' : 'Coupée'}
                  </div>
                </div>
              </button>

              <RoundIconButton tone="plum" size="md" label={s.destinyBtn} onClick={onOpenRoulette}>
                <Dices className="h-5 w-5" />
              </RoundIconButton>
              <RoundIconButton tone="lagoon" size="md" label="Réglages" onClick={onOpenSettings}>
                <Settings className="h-5 w-5" />
              </RoundIconButton>
              <RoundIconButton tone="cream" size="sm" label="Admin Sandbox" onClick={onOpenAdmin}>
                <Lock className="h-4 w-4" />
              </RoundIconButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
