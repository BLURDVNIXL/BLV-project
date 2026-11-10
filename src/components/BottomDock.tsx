/**
 * GTA Abidjan - Unified Collapsible Bottom Control Dock
 * Follows Three.js Skill architectural guidelines:
 * - Pinned to bottom-center with zero center-viewport occlusion
 * - Collapsible drawer (Zen / Cinema mode)
 * - Clean static indicators, no pulsating dots
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Car,
  Radio,
  Eye,
  KeyRound,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { VehicleModelType } from '../game/types';

interface BottomDockProps {
  timeOfDay: number; // 0..24
  onChangeTime: (time: number) => void;
  cameraMode: string;
  onToggleCamera: () => void;
  onSpawnVehicle: (type: VehicleModelType) => void;
  radioStation: string | null;
  onChangeRadio: (station: string | null) => void;
  onGiveWeapons: () => void;
  onHealPlayer: () => void;
  onClearWanted: () => void;
  onAddCash: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  timeOfDay,
  onChangeTime,
  cameraMode,
  onToggleCamera,
  onSpawnVehicle,
  radioStation,
  onChangeRadio,
  onGiveWeapons,
  onHealPlayer,
  onClearWanted,
  onAddCash,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'env' | 'radio' | 'cheats' | 'controls'>('vehicles');

  return (
    <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[94vw] w-full sm:w-auto z-40 flex flex-col items-center">
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-3 py-1 bg-stone-900/90 hover:bg-stone-800 text-stone-300 text-xs font-bold rounded-t-md border-t border-x border-stone-700 flex items-center gap-1.5 shadow-lg active:scale-95"
        aria-label={isCollapsed ? 'Afficher les commandes' : 'Masquer les commandes'}
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Afficher Commandes (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Mode Cinéma / Masquer (H)</span>
          </>
        )}
      </button>

      {/* Dock Container */}
      {!isCollapsed && (
        <div className="bg-black/90 border border-stone-700 rounded-b-lg rounded-t-sm p-2 sm:p-3 shadow-2xl flex flex-col gap-2 backdrop-blur-none w-full sm:w-[580px]">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'vehicles' ? 'bg-amber-500 text-black' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Véhicules Babi
              </button>
              <button
                onClick={() => setActiveTab('env')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'env' ? 'bg-amber-500 text-black' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Heure & Météo
              </button>
              <button
                onClick={() => setActiveTab('radio')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'radio' ? 'bg-amber-500 text-black' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Radios
              </button>
              <button
                onClick={() => setActiveTab('cheats')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'cheats' ? 'bg-amber-500 text-black' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Codes GTA
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'controls' ? 'bg-amber-500 text-black' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                Aide Touches
              </button>
            </div>

            <button
              onClick={onToggleCamera}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded border border-cyan-900 bg-cyan-950/40 shrink-0"
              title="Changer l'angle caméra"
            >
              Vue: {cameraMode.toUpperCase()}
            </button>
          </div>

          {/* Tab content */}
          <div className="pt-1">
            {activeTab === 'vehicles' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <button
                  onClick={() => onSpawnVehicle('woro')}
                  className="px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-extrabold text-xs rounded shadow flex items-center gap-1.5 shrink-0"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Wôrô-wôrô 504 (Taxi)</span>
                </button>
                <button
                  onClick={() => onSpawnVehicle('gbaka')}
                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-extrabold text-xs rounded shadow flex items-center gap-1.5 shrink-0"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Gbaka 207 (Minibus)</span>
                </button>
                <button
                  onClick={() => onSpawnVehicle('police')}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs rounded shadow flex items-center gap-1.5 shrink-0"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Police Nationale CI</span>
                </button>
                <button
                  onClick={() => onSpawnVehicle('suv')}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-extrabold text-xs rounded border border-stone-600 shadow flex items-center gap-1.5 shrink-0"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Babi Land Cruiser</span>
                </button>
                <button
                  onClick={() => onSpawnVehicle('sports')}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs rounded shadow flex items-center gap-1.5 shrink-0"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Cocody GT Coupe</span>
                </button>
              </div>
            )}

            {activeTab === 'env' && (
              <div className="flex items-center gap-4 py-1">
                <div className="flex items-center gap-2 flex-1">
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={timeOfDay}
                    onChange={(e) => onChangeTime(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                </div>
                <div className="text-xs font-mono font-bold text-amber-400 w-16 text-right">
                  {Math.floor(timeOfDay).toString().padStart(2, '0')}:
                  {Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {activeTab === 'radio' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <button
                  onClick={() => onChangeRadio('gbaka_fm')}
                  className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
                    radioStation === 'gbaka_fm' ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  Gbaka FM 104.5 (Coupé-Décalé)
                </button>
                <button
                  onClick={() => onChangeRadio('nostalgie')}
                  className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
                    radioStation === 'nostalgie' ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  Radio Nostalgie Babi (Afrobeats)
                </button>
                <button
                  onClick={() => onChangeRadio('ebony_radio')}
                  className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
                    radioStation === 'ebony_radio' ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  Ebony Radio (Afro-Trap)
                </button>
                <button
                  onClick={() => onChangeRadio(null)}
                  className={`px-2.5 py-1.5 rounded text-xs font-bold shrink-0 ${
                    radioStation === null ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  Radio Éteinte
                </button>
              </div>
            )}

            {activeTab === 'cheats' && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <button
                  onClick={onGiveWeapons}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold rounded border border-stone-600 flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pack d'Armes (AK47/RPG)</span>
                </button>
                <button
                  onClick={onHealPlayer}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold rounded border border-stone-600 flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  <span>Santé & Gilet Max</span>
                </button>
                <button
                  onClick={onClearWanted}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 text-xs font-bold rounded border border-stone-600 flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Effacer Étoiles Police</span>
                </button>
                <button
                  onClick={onAddCash}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-green-400 text-xs font-bold rounded border border-stone-600 flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  <span>+$5,000 Cash</span>
                </button>
              </div>
            )}

            {activeTab === 'controls' && (
              <div className="text-[11px] text-stone-300 grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                <div><strong className="text-amber-400">WASD / Flèches:</strong> Marcher / Conduire</div>
                <div><strong className="text-amber-400">Shift:</strong> Courir / Accélérer</div>
                <div><strong className="text-amber-400">Espace:</strong> Sauter / Frein à main</div>
                <div><strong className="text-amber-400">F / Entrée:</strong> Monter / Sortir de voiture</div>
                <div><strong className="text-amber-400">Clic Gauche:</strong> Frapper / Tirer</div>
                <div><strong className="text-amber-400">A / E:</strong> Changer d'arme</div>
                <div><strong className="text-amber-400">H:</strong> Klaxon / Sirène</div>
                <div><strong className="text-amber-400">R:</strong> Radio Babi</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
