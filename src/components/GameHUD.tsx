import React, { useState } from 'react';
import {
  Sparkles,
  Smartphone,
  Radio,
  Settings,
  ChevronDown,
  ChevronUp,
  Flame,
  Volume2,
  VolumeX,
  Lock,
  RotateCcw,
  Pause,
  Users,
  Wrench,
} from 'lucide-react';
import { PlayerState } from '../types/game';
import { RADIO_STATIONS } from '../core/destinies';
import { formatGameTime, hasUnlimitedPlatinum } from '../core/simulation';
import { getMissionForDestiny } from '../core/missions';
import { t } from '../core/i18n';
import { CityHotspot, RadarSnapshot } from '../3d/sceneManager';
import { MinimapRadar } from './MinimapRadar';
import { RadioPlayStatus } from '../audio/radioManager';

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

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 md:p-4 select-none">
      {/* TOP PERIMETER CLUSTER */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* TOP-LEFT: DESTINY DOSSIER & FCFA */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-950/92 px-3 py-2.5 border border-amber-500/40 shadow-xl max-w-xs md:max-w-sm">
          <div
            style={{ backgroundColor: playerState.destiny.color }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-black text-base border border-white/20"
          >
            🇨🇮
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate">{playerState.destiny.name}</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
                {playerState.destiny.rarity}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-0.5 tabular-nums">
              <span className="font-mono font-black text-base md:text-lg text-emerald-400">
                {Math.round(playerState.cash).toLocaleString('fr-FR')} F
              </span>
              {playerState.bankCash > 0 && (
                <span className="text-[10px] text-cyan-300 font-mono">
                  ({s.bankBalance}: {Math.round(playerState.bankCash).toLocaleString('fr-FR')} F)
                </span>
              )}
              {playerState.debt > 0 && (
                <span className="text-[10px] text-rose-400 font-mono font-bold">
                  (-{Math.round(playerState.debt).toLocaleString('fr-FR')} F)
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-0.5 text-[9px] font-bold">
              {playerState.destiny.englishLock && (
                <span className={platinumActive ? 'text-amber-300' : 'text-rose-400'}>
                  {platinumActive ? `${s.platinumActive} (${playerState.goldenBoyDaysLeft}d)` : s.platinumExpired}
                </span>
              )}
              {playerState.destiny.rehabJourney && (
                <span className={playerState.redemptionTrophyUnlocked ? 'text-emerald-400' : 'text-amber-300'}>
                  {playerState.redemptionTrophyUnlocked
                    ? '🏆 Trophée Rédemption Débloqué'
                    : `Sevrage: ${playerState.cleanDaysStreak}/7 j`}
                </span>
              )}
              {playerState.destiny.realMadridSuperstar && (
                <span className="text-sky-300">⚽ Académie Niv.{playerState.yannisAcademyLevel}/3</span>
              )}
            </div>

            {(() => {
              const m = getMissionForDestiny(playerState.destiny.id);
              const idx = Math.min(playerState.activeMission.stepIndex, m.steps.length - 1);
              const step = m.steps[idx];
              return (
                <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] flex items-center gap-1.5 text-amber-200 truncate">
                  <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-black text-amber-400 shrink-0">
                    {playerState.activeMission.completed ? 'FINI 🏆' : `M${idx + 1}/${m.steps.length}`}
                  </span>
                  <span className="truncate font-semibold">
                    {playerState.activeMission.completed ? m.title : step.title}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* TOP-CENTER: INTERACTION OR STALL PROMPT */}
        <div className="flex flex-col items-center gap-1.5">
          {playerState.engineStalled && (
            <button
              type="button"
              onClick={onRepairEngine}
              className="pointer-events-auto flex items-center gap-2 rounded-xl bg-rose-950/95 border-2 border-rose-500 px-3.5 py-2 text-xs font-black text-rose-200 shadow-lg cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>{s.engineStalled} — Réparer (5 000 F)</span>
            </button>
          )}

          {(nearbyHotspot || nearbyVehicle || playerState.isDriving) && (
            <button
              type="button"
              onClick={onInteractClick}
              className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-950/95 px-4 py-2 border-2 border-cyan-400 shadow-xl text-xs font-bold text-white cursor-pointer"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-400 text-slate-950 font-black text-[11px]">
                E
              </span>
              <span>
                {playerState.isDriving
                  ? s.exitVehicle
                  : nearbyHotspot
                  ? nearbyHotspot.label
                  : `${s.enterVehicle} ${nearbyVehicle?.label || ''}`}
              </span>
            </button>
          )}

          {playerState.isDepressed && (
            <div className="rounded-lg bg-rose-950/95 border border-rose-500 px-3 py-1 text-[10px] font-black text-rose-200 shadow">
              {s.depressedWarning}
            </div>
          )}
        </div>

        {/* TOP-RIGHT: CLOCK, WEATHER, STAR, POLICE, ONLINE & PAUSE */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/92 px-3 py-1.5 border border-slate-700 shadow-lg">
            <div className="text-right">
              <div className="font-mono text-sm font-black text-white tabular-nums">
                {formatGameTime(playerState.gameTimeHours)}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                {s.day} {playerState.daysLived} · {playerState.weather}
              </div>
            </div>
            <div className="text-base">
              {playerState.weather === 'soleil'
                ? '☀️'
                : playerState.weather === 'pluie'
                ? '🌧️'
                : playerState.weather === 'inondation'
                ? '🌊'
                : '🌪️'}
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <button
              type="button"
              onClick={onToggleSound}
              tabIndex={-1}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={onPauseClick}
              tabIndex={-1}
              aria-label="Mettre en pause"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <Pause className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-950/92 px-3 py-1.5 border border-amber-500/40 shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <div>
              <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-amber-300 uppercase">
                <span>{s.starLabel}</span>
                <span className="font-mono font-black text-amber-400 tabular-nums">{Math.round(playerState.star)}/100</span>
              </div>
              <div className="h-1.5 w-28 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, playerState.star))}%` }}
                  className="h-full bg-amber-400 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-950/92 px-2 py-1 border border-slate-700 text-[10px] font-bold text-emerald-400">
              <Users className="w-3 h-3" />
              <span>{onlineCount}</span>
            </div>

            <div className="flex items-center gap-0.5 rounded-lg bg-slate-950/92 px-2 py-1 border border-slate-700">
              {[1, 2, 3, 4, 5].map((starIndex) => (
                <span
                  key={starIndex}
                  className={`text-xs ${
                    starIndex <= playerState.policeWanted ? 'text-amber-400 font-black' : 'text-slate-700'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: RADAR + NEEDS + DOCK */}
      <div className="flex items-end justify-between gap-3 w-full">
        {/* BOTTOM-LEFT: MINIMAP RADAR + COMPACT NEEDS */}
        <div className="flex items-end gap-2.5">
          <MinimapRadar getSnapshot={getRadarSnapshot} district={currentDistrict} />

          <div className="pointer-events-auto hidden sm:flex flex-col gap-1 rounded-xl bg-slate-950/92 p-2.5 border border-slate-700 shadow-xl w-52">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-400">
              <span className="flex items-center gap-1 truncate">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                {s.envyGauge}
              </span>
              <span className="font-mono tabular-nums">{Math.round(playerState.needs.envy)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${Math.round(playerState.needs.envy)}%` }}
                className="h-full bg-orange-500 transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 mt-1 pt-1 border-t border-slate-800 text-[9px] tabular-nums">
              {[
                { label: s.hunger, val: playerState.needs.hunger, color: 'bg-emerald-400' },
                { label: s.energy, val: playerState.needs.energy, color: 'bg-cyan-400' },
                { label: s.hygiene, val: playerState.needs.hygiene, color: 'bg-sky-400' },
                { label: s.bladder, val: playerState.needs.bladder, color: 'bg-indigo-400' },
              ].map((n) => (
                <div key={n.label}>
                  <div className="flex justify-between text-slate-300 font-semibold">
                    <span>{n.label}</span>
                    <span>{Math.round(n.val)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.round(n.val)}%` }}
                      className={`h-full ${n.val < 20 ? 'bg-rose-500' : n.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER/RIGHT: ACTION DOCK */}
        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1 rounded-t-lg bg-slate-950/92 px-3 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white border-t border-x border-slate-700 cursor-pointer"
          >
            {isDockCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{isDockCollapsed ? s.showDock : s.hideDock}</span>
          </button>

          {!isDockCollapsed && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/94 px-3 py-2 border border-slate-700 shadow-2xl">
              <button
                type="button"
                onClick={onOpenPhone}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 cursor-pointer"
              >
                <Smartphone className="h-4 w-4" />
                <span>BabiOS</span>
              </button>

              <button
                type="button"
                onClick={onNextRadio}
                className="flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 border border-slate-700 text-left cursor-pointer"
              >
                <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="max-w-[110px] truncate">
                  <div className="text-[10px] font-bold text-white truncate">{currentRadio.name}</div>
                  <div className="text-[9px] text-emerald-400 font-mono">
                    {currentRadio.freq} · {radioStatus === 'live' ? 'LIVE' : radioStatus === 'synth-fallback' ? 'SYNTH' : 'OFF'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenRoulette}
                className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-2 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden md:inline">{s.destinyBtn}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Réglages"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onOpenAdmin}
                aria-label="Admin Sandbox"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-400 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
