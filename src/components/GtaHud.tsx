/**
 * GTA Abidjan - Authentic GTA San Andreas Mobile HUD & UI Controls
 */

import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Volume2,
  VolumeX,
  Radio,
  Compass,
  MapPin,
  Car,
  Crosshair,
  Footprints,
  Flame,
  ArrowUp,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PlayerState, VehicleState, Mission, DistrictInfo, WeaponType } from '../game/types';

interface GtaHudProps {
  player: PlayerState;
  vehicle: VehicleState | null;
  activeMission: Mission | null;
  currentDistrict: DistrictInfo;
  gameTime: string; // e.g. "14:25"
  radioStationName: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onNextRadio: () => void;
  onSwitchWeapon: (direction: 'next' | 'prev') => void;
  onVehicleAction: () => void; // enter/exit
  onAttack: () => void;
  onHorn: () => void;
  onCameraToggle: () => void;
  cameraMode: string;
  onStartMission: (missionId: string) => void;
  availableMissions: Mission[];
  radarHeading: number;
}

export const GtaHud: React.FC<GtaHudProps> = ({
  player,
  vehicle,
  activeMission,
  currentDistrict,
  gameTime,
  radioStationName,
  isMuted,
  onToggleMute,
  onNextRadio,
  onSwitchWeapon,
  onVehicleAction,
  onAttack,
  onHorn,
  onCameraToggle,
  cameraMode,
  onStartMission,
  availableMissions,
  radarHeading,
}) => {
  const [showMapModal, setShowMapModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);

  const currentWeapon = player.weapons[player.currentWeapon];

  // Format cash as 8-digit green digital counter (GTA style)
  const formattedCash = `$${player.cash.toString().padStart(7, '0')}`;

  // Wanted stars array (1..6)
  const stars = [1, 2, 3, 4, 5, 6];

  // Weapon icons rendering
  const renderWeaponIcon = (type: WeaponType) => {
    switch (type) {
      case 'fist':
        return <span className="text-3xl select-none">👊</span>;
      case 'machete':
        return <span className="text-3xl select-none">🗡️</span>;
      case 'pistol':
        return <span className="text-3xl select-none">🔫</span>;
      case 'smg':
        return <span className="text-3xl select-none">💥</span>;
      case 'ak47':
        return <span className="text-3xl select-none">⚡</span>;
      case 'rpg':
        return <span className="text-3xl select-none">🚀</span>;
      default:
        return <span className="text-3xl select-none">👊</span>;
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden font-sans select-none">
      {/* ================= TOP RIGHT GTA SA HUD ================= */}
      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5 drop-shadow-md">
        {/* Weapon Display & Switcher */}
        <div className="flex items-center gap-2 bg-black/80 border-2 border-stone-800 rounded-lg p-1.5 shadow-2xl backdrop-blur-none">
          <button
            onClick={() => onSwitchWeapon('prev')}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-bold text-xs rounded border border-stone-700"
            title="Arme précédente (A / Q)"
            aria-label="Arme précédente"
          >
            ◀
          </button>

          <div className="flex flex-col items-center justify-center w-28 h-20 bg-gradient-to-b from-stone-900 to-black rounded border border-stone-700 px-1 py-1.5">
            <div className="h-8 flex items-center justify-center">
              {renderWeaponIcon(player.currentWeapon)}
            </div>
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider truncate max-w-[100px] text-center mt-0.5">
              {currentWeapon?.name || 'Poings'}
            </div>
            <div className="text-xs font-mono font-bold text-white tracking-widest">
              {player.currentWeapon === 'fist' || player.currentWeapon === 'machete'
                ? '∞'
                : `${currentWeapon.ammo}/${currentWeapon.maxAmmo}`}
            </div>
          </div>

          <button
            onClick={() => onSwitchWeapon('next')}
            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-bold text-xs rounded border border-stone-700"
            title="Arme suivante (E)"
            aria-label="Arme suivante"
          >
            ▶
          </button>
        </div>

        {/* Digital Clock */}
        <div className="text-xl font-mono font-extrabold text-stone-200 tracking-wider bg-black/70 px-2 py-0.5 rounded border border-stone-800">
          {gameTime}
        </div>

        {/* Green GTA Cash Counter */}
        <div
          className="text-2xl sm:text-3xl font-extrabold text-[#38ef7d] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{ fontFamily: '"Changa One", "Anton", monospace' }}
        >
          {formattedCash}
        </div>

        {/* Health & Armor Bars */}
        <div className="flex flex-col gap-1 w-44 bg-black/85 p-2 rounded-md border border-stone-700">
          {/* Health Bar (Red/Orange) */}
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
            <div className="w-full bg-red-950/80 h-3 rounded-sm overflow-hidden border border-red-900">
              <div
                className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, player.health))}%` }}
              />
            </div>
          </div>

          {/* Armor Bar (White/Cyan) */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />
            <div className="w-full bg-cyan-950/80 h-2.5 rounded-sm overflow-hidden border border-cyan-900">
              <div
                className="bg-gradient-to-r from-cyan-400 to-white h-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (player.armor / 100) * 100))}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar */}
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="w-full bg-amber-950/80 h-1.5 rounded-sm overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, player.stamina))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Wanted Stars (0 to 6) */}
        <div className="flex items-center gap-1 bg-black/80 px-2 py-1 rounded border border-stone-800">
          {stars.map((starNum) => {
            const isWanted = player.wantedLevel >= starNum;
            return (
              <span
                key={starNum}
                className={`text-lg transition-transform ${
                  isWanted
                    ? 'text-amber-400 drop-shadow-[0_0_8px_#f59e0b] scale-110'
                    : 'text-stone-700'
                }`}
              >
                ★
              </span>
            );
          })}
        </div>
      </div>

      {/* ================= TOP LEFT DISTRICT BADGE & CONTROLS ================= */}
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-col gap-2">
        {/* District Banner */}
        <div className="bg-black/85 border-l-4 border-amber-500 px-3 py-1.5 rounded-r shadow-2xl flex flex-col">
          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
            Ville d'Abidjan • District
          </div>
          <div className="text-base sm:text-lg font-black text-white tracking-wide">
            {currentDistrict.name}
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMapModal(true)}
            className="px-2.5 py-1.5 bg-black/80 hover:bg-stone-800 active:scale-95 text-xs font-bold text-stone-200 rounded border border-stone-700 flex items-center gap-1.5 shadow"
            title="Carte d'Abidjan (Touche M)"
            aria-label="Ouvrir la carte de la ville"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Carte Babi</span>
          </button>

          <button
            onClick={() => setShowMissionsModal(true)}
            className="px-2.5 py-1.5 bg-black/80 hover:bg-stone-800 active:scale-95 text-xs font-bold text-amber-400 rounded border border-amber-600/50 flex items-center gap-1.5 shadow"
            title="Missions GTA Abidjan"
            aria-label="Ouvrir les missions"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Missions</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-1.5 bg-black/80 hover:bg-stone-800 text-stone-300 rounded border border-stone-700"
            title="Son / Musique"
            aria-label="Activer ou couper le son"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
          </button>

          <button
            onClick={onCameraToggle}
            className="px-2 py-1.5 bg-black/80 hover:bg-stone-800 text-xs font-bold text-stone-300 rounded border border-stone-700 flex items-center gap-1"
            title="Changer de vue caméra (Touche V)"
            aria-label="Changer de vue caméra"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{cameraMode === 'tps' ? 'Vue 3e pers.' : cameraMode === 'top' ? 'Vue GTA 1' : 'Vue Capot'}</span>
          </button>
        </div>
      </div>

      {/* ================= ACTIVE MISSION OBJECTIVE BANNER ================= */}
      {activeMission && (
        <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 max-w-lg w-[90%] bg-black/90 border-t-2 border-b-2 border-amber-500 py-2 px-4 shadow-2xl text-center">
          <div className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
            {activeMission.title} • {activeMission.subtitle}
          </div>
          <div className="text-sm font-semibold text-white mt-0.5">
            {activeMission.steps[activeMission.currentStepIndex]?.text || 'Atteins l\'objectif !'}
          </div>
        </div>
      )}

      {/* ================= VEHICLE SPEEDOMETER & RADIO BANNER ================= */}
      {vehicle && (
        <div className="pointer-events-auto absolute bottom-24 right-4 flex flex-col items-end gap-1.5">
          {/* Radio Station Dial */}
          <div
            onClick={onNextRadio}
            className="cursor-pointer bg-black/85 border border-stone-700 px-3 py-1 rounded flex items-center gap-2 hover:border-amber-500 transition-colors shadow-lg"
            title="Changer de station radio (Touche R)"
          >
            <Radio className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider text-stone-400">Radio Babi</span>
              <span className="text-xs font-bold text-white">{radioStationName}</span>
            </div>
          </div>

          {/* Speedometer Card */}
          <div className="bg-black/90 border-2 border-amber-500/80 rounded-lg p-2.5 flex flex-col items-center w-36 shadow-2xl">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate max-w-full">
              {vehicle.name}
            </span>
            <div className="flex items-baseline gap-1 my-0.5">
              <span className="text-3xl font-black font-mono text-white">
                {Math.round(Math.abs(vehicle.speed) * 3.6)}
              </span>
              <span className="text-xs font-bold text-stone-400">KM/H</span>
            </div>
            {/* RPM / Speed bar */}
            <div className="w-full bg-stone-900 h-2 rounded overflow-hidden border border-stone-800">
              <div
                className="bg-gradient-to-r from-green-500 via-amber-500 to-red-600 h-full transition-all duration-75"
                style={{
                  width: `${Math.min(100, (Math.abs(vehicle.speed) / 35) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM LEFT GTA RADAR / MINIMAP ================= */}
      <div className="pointer-events-auto absolute bottom-4 left-4 flex flex-col items-start gap-1">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-stone-900 bg-emerald-950/90 shadow-2xl overflow-hidden">
          {/* Rotating Map Canvas / SVG */}
          <svg
            className="w-full h-full"
            viewBox="-80 -80 160 160"
            style={{
              transform: `rotate(${radarHeading}rad)`,
              transition: 'transform 0.08s ease-out',
            }}
          >
            {/* Lagune Ebrié Water Ribbon */}
            <rect x="-80" y="-20" width="160" height="36" fill="#0891b2" opacity="0.85" />

            {/* Bridges */}
            {/* Pont HKB */}
            <rect x="25" y="-30" width="8" height="55" fill="#f59e0b" />
            {/* Pont Houphouët-Boigny */}
            <rect x="-15" y="-25" width="7" height="46" fill="#cbd5e1" />

            {/* Roads grid */}
            <line x1="-80" y1="35" x2="80" y2="35" stroke="#475569" strokeWidth="4" />
            <line x1="-80" y1="-45" x2="80" y2="-45" stroke="#475569" strokeWidth="4" />
            <line x1="-15" y1="-80" x2="-15" y2="80" stroke="#64748b" strokeWidth="5" />
            <line x1="25" y1="-80" x2="25" y2="80" stroke="#64748b" strokeWidth="5" />

            {/* Mission Target Blip */}
            {activeMission && (
              <circle
                cx={activeMission.steps[activeMission.currentStepIndex]?.targetX / 2 || 0}
                cy={activeMission.steps[activeMission.currentStepIndex]?.targetZ / 2 || 0}
                r="4.5"
                fill="#facc15"
                stroke="#000000"
                strokeWidth="1.5"
              />
            )}
          </svg>

          {/* Fixed Player Center Pointer */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" />
          </div>

          {/* North needle indicator */}
          <div
            className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-500 drop-shadow pointer-events-none"
            style={{
              transform: `translateX(-50%) rotate(${radarHeading}rad)`,
            }}
          >
            ▲ N
          </div>
        </div>

        {/* District tag below radar */}
        <div className="bg-black/85 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 uppercase tracking-wider">
          {currentDistrict.id.toUpperCase()}
        </div>
      </div>

      {/* ================= ON-SCREEN MOBILE / TOUCH ACTION BUTTONS ================= */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2 sm:hidden">
        {/* Vehicle Enter / Exit */}
        <button
          onClick={onVehicleAction}
          className="w-13 h-13 rounded-full bg-amber-600 active:scale-95 text-white flex flex-col items-center justify-center border-2 border-amber-400 shadow-xl"
          aria-label={vehicle ? 'Sortir du véhicule' : 'Monter dans le véhicule'}
        >
          <Car className="w-5 h-5" />
          <span className="text-[9px] font-bold">{vehicle ? 'SORTIR' : 'MONTER'}</span>
        </button>

        {/* Horn / Attack */}
        {vehicle ? (
          <button
            onClick={onHorn}
            className="w-13 h-13 rounded-full bg-cyan-600 active:scale-95 text-white flex flex-col items-center justify-center border-2 border-cyan-400 shadow-xl"
            aria-label="Klaxonner"
          >
            <Volume2 className="w-5 h-5" />
            <span className="text-[9px] font-bold">KLAXON</span>
          </button>
        ) : (
          <button
            onClick={onAttack}
            className="w-13 h-13 rounded-full bg-red-600 active:scale-95 text-white flex flex-col items-center justify-center border-2 border-red-400 shadow-xl"
            aria-label="Attaquer ou tirer"
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-[9px] font-bold">FRAPPER</span>
          </button>
        )}
      </div>

      {/* ================= MAP MODAL ================= */}
      {showMapModal && (
        <div className="pointer-events-auto absolute inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-8 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
            <div>
              <h2 className="text-2xl font-black text-amber-400 tracking-wider">
                CARTE DE LA VILLE D'ABIDJAN (BABI STORIES)
              </h2>
              <p className="text-xs text-stone-400">
                Plateau, Treichville, Cocody, Yopougon, Lagune Ébrié & Pont HKB
              </p>
            </div>
            <button
              onClick={() => setShowMapModal(false)}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded border border-stone-600"
            >
              Fermer (Échap)
            </button>
          </div>

          <div className="flex-1 bg-stone-950 border border-stone-800 rounded-lg p-4 flex flex-col lg:flex-row gap-6 overflow-auto">
            {/* Schematic City Map */}
            <div className="flex-1 relative min-h-[300px] bg-slate-900 rounded-lg border border-slate-800 p-4 flex items-center justify-center">
              <svg className="w-full h-full max-h-[500px]" viewBox="-160 -150 320 300">
                {/* Lagune */}
                <rect x="-160" y="-30" width="320" height="70" fill="#0891b2" />
                <text x="0" y="5" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  LAGUNE ÉBRIÉ
                </text>

                {/* Pont HKB */}
                <rect x="75" y="-45" width="20" height="110" fill="#f59e0b" opacity="0.9" />
                <text x="85" y="15" fill="#000000" fontSize="8" fontWeight="bold" textAnchor="middle">
                  PONT HKB
                </text>

                {/* Pont Houphouët-Boigny */}
                <rect x="-12" y="-35" width="20" height="80" fill="#94a3b8" opacity="0.9" />
                <text x="-2" y="5" fill="#000000" fontSize="7" fontWeight="bold" textAnchor="middle">
                  PONT H-B
                </text>

                {/* Districts */}
                <rect x="-60" y="45" width="120" height="95" fill="#3b82f6" opacity="0.25" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="85" fill="#60a5fa" fontSize="9" fontWeight="900" textAnchor="middle">
                  LE PLATEAU
                </text>
                <text x="0" y="100" fill="#93c5fd" fontSize="7" fontWeight="bold" textAnchor="middle">
                  (TOURS & AFFAIRES)
                </text>

                <rect x="-60" y="-140" width="120" height="105" fill="#f97316" opacity="0.25" stroke="#f97316" strokeWidth="2" />
                <text x="0" y="-95" fill="#fb923c" fontSize="9" fontWeight="900" textAnchor="middle">
                  TREICHVILLE
                </text>
                <text x="0" y="-80" fill="#fdba74" fontSize="7" fontWeight="bold" textAnchor="middle">
                  (PORT & MARCHÉS)
                </text>

                <rect x="65" y="45" width="90" height="95" fill="#10b981" opacity="0.25" stroke="#10b981" strokeWidth="2" />
                <text x="110" y="85" fill="#34d399" fontSize="9" fontWeight="900" textAnchor="middle">
                  COCODY
                </text>
                <text x="110" y="100" fill="#a7f3d0" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                  (VILLAS & HÔTEL IVOIRE)
                </text>

                <rect x="-155" y="45" width="90" height="95" fill="#a855f7" opacity="0.25" stroke="#a855f7" strokeWidth="2" />
                <text x="-110" y="85" fill="#c084fc" fontSize="9" fontWeight="900" textAnchor="middle">
                  YOPOUGON
                </text>
                <text x="-110" y="100" fill="#e9d5ff" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                  ("YOP CITY - SIPOREX")
                </text>

                {/* Player Blip */}
                <circle cx={player.x} cy={player.z} r="6" fill="#22d3ee" stroke="#ffffff" strokeWidth="2" />
                <text x={player.x} y={player.z - 8} fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="middle">
                  VOUS ÊTES ICI
                </text>
              </svg>
            </div>

            {/* District Guide */}
            <div className="w-full lg:w-80 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                Quartiers Légendaires
              </h3>
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-stone-900 border-l-4 border-blue-500 rounded text-xs">
                  <span className="font-bold text-blue-400">Le Plateau :</span> Gratte-ciel, banques, ministères, Tour CCIA et Postel 2001.
                </div>
                <div className="p-3 bg-stone-900 border-l-4 border-orange-500 rounded text-xs">
                  <span className="font-bold text-orange-400">Treichville :</span> Avenue 16, docks portuaires, gare de Gbaka et marchés.
                </div>
                <div className="p-3 bg-stone-900 border-l-4 border-emerald-500 rounded text-xs">
                  <span className="font-bold text-emerald-400">Cocody :</span> Résidences diplomatiques, palmiers royaux, Hôtel Ivoire.
                </div>
                <div className="p-3 bg-stone-900 border-l-4 border-purple-500 rounded text-xs">
                  <span className="font-bold text-purple-400">Yopougon :</span> Rue Princesse, grands maquis, ambiance festive 24/7.
                </div>
                <div className="p-3 bg-stone-900 border-l-4 border-cyan-500 rounded text-xs">
                  <span className="font-bold text-cyan-400">Pont HKB :</span> Pont à haubans géant traversant la lagune.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MISSIONS MODAL ================= */}
      {showMissionsModal && (
        <div className="pointer-events-auto absolute inset-0 z-50 bg-black/90 flex flex-col p-4 sm:p-8 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
            <div>
              <h2 className="text-2xl font-black text-amber-400 tracking-wider">
                MISSIONS PRINCIPALES GTA ABIDJAN
              </h2>
              <p className="text-xs text-stone-400">
                Choisis une mission scénarisée et deviens le roi de Babi !
              </p>
            </div>
            <button
              onClick={() => setShowMissionsModal(false)}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded border border-stone-600"
            >
              Fermer (Échap)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto p-1">
            {availableMissions.map((m) => {
              const isCurrent = activeMission?.id === m.id;
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-lg border-2 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {m.district.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono font-bold text-green-400">
                        +${m.rewardCash.toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">{m.title}</h3>
                    <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="text-[11px] text-stone-400 mt-2 italic bg-stone-950/60 p-2 rounded">
                      {m.initialDialogue[0]}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      Respect: <strong className="text-amber-400">+{m.rewardRespect}</strong>
                    </span>
                    <button
                      onClick={() => {
                        onStartMission(m.id);
                        setShowMissionsModal(false);
                      }}
                      className={`px-4 py-1.5 rounded font-black text-xs uppercase tracking-wider ${
                        isCurrent
                          ? 'bg-amber-500 text-black cursor-default'
                          : 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
                      }`}
                    >
                      {isCurrent ? 'En cours' : 'Lancer la mission'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
