import React, { useState } from 'react';
import { Sparkles, Dices, RotateCcw, Check, X, MapPin } from 'lucide-react';
import { Destiny } from '../types/game';
import { ALL_DESTINIES } from '../core/destinies';
import { rollDestiny } from '../core/simulation';
import { soundEngine } from '../audio/radioManager';

interface DestinyRouletteModalProps {
  currentDestiny: Destiny;
  onSelectDestiny: (destiny: Destiny) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const DestinyRouletteModal: React.FC<DestinyRouletteModalProps> = ({
  currentDestiny,
  onSelectDestiny,
  onClose,
  canClose = true,
}) => {
  const [selected, setSelected] = useState<Destiny>(currentDestiny);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'commune' | 'rare' | 'epique' | 'legendaire'>('all');

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    soundEngine.playCashSound();

    let counter = 0;
    const interval = setInterval(() => {
      const randomDestiny = ALL_DESTINIES[Math.floor(Math.random() * ALL_DESTINIES.length)];
      setSelected(randomDestiny);
      counter++;
      if (counter > 14) {
        clearInterval(interval);
        const finalDestiny = rollDestiny();
        setSelected(finalDestiny);
        setIsSpinning(false);
        soundEngine.playWooHooJingle();
      }
    }, 80);
  };

  const filteredDestinies =
    activeFilter === 'all' ? ALL_DESTINIES : ALL_DESTINIES.filter((d) => d.rarity === activeFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/92 text-white select-none">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">
                La Roulette du Destin d’Abidjan
              </h2>
              <p className="text-xs text-slate-400">
                19 Classes & 7 Easter Eggs Légendaires • Tire ton destin ou choisis ta commune
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning}
              className={`flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 transition-colors cursor-pointer ${
                isSpinning ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RotateCcw className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>Tourner la Roulette</span>
            </button>

            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer la Roulette"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 no-scrollbar">
          {/* LEFT: SELECTED DESTINY DETAILS */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-2xl bg-slate-950 p-5 border border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  style={{ backgroundColor: `${selected.color}25`, borderColor: selected.color, color: selected.color }}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border"
                >
                  {selected.rarity}
                </span>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Étoile : {selected.startingStar}/100</span>
                </div>
              </div>

              <h3 className="font-display text-2xl md:text-3xl font-black text-white leading-tight">
                {selected.name}
              </h3>
              <p className="text-xs font-semibold text-amber-400 mt-0.5">{selected.subtitle}</p>

              <blockquote className="my-3 rounded-xl bg-slate-900 p-3 text-xs italic text-slate-300 border-l-2 border-amber-500">
                {selected.quote}
              </blockquote>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Commune de départ :</span>
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selected.district}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Cash de départ :</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selected.startingCash.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-1 gap-2">
                  <span className="text-slate-400 shrink-0">Logement :</span>
                  <span className="font-semibold text-white text-right truncate">{selected.housing}</span>
                </div>

                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Véhicule(s) :</span>
                  <span className="font-semibold text-white uppercase">
                    {selected.vehicle
                      ? `${selected.vehicle.replace(/_/g, ' ')}${selected.secondaryVehicle ? ` + ${selected.secondaryVehicle.replace(/_/g, ' ')}` : ''}`
                      : 'À pied / Gbaka'}
                  </span>
                </div>

                <div className="mt-2 rounded-xl bg-amber-950/60 p-2.5 border border-amber-500/30">
                  <div className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Atout Spécial :</div>
                  <div className="text-xs text-amber-200 mt-0.5">{selected.perk}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectDestiny(selected)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-black uppercase tracking-wider text-white cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Entrer à Abidjan ({selected.district})</span>
            </button>
          </div>

          {/* RIGHT: ALL 19 DESTINIES LIST */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(['all', 'commune', 'rare', 'epique', 'legendaire'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-xl px-3 py-1 text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer ${
                    activeFilter === f ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Tous (19)' : f}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
              {filteredDestinies.map((d) => {
                const isCurrent = selected.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-950/60 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white truncate">{d.name}</span>
                      <span style={{ color: d.color }} className="text-[9px] font-extrabold uppercase shrink-0">
                        {d.rarity}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">{d.district} · {d.subtitle}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 mt-1">
                      {d.startingCash.toLocaleString('fr-FR')} F
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
