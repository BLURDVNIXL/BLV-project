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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-ink-900/60 text-ink-800 select-none">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl bg-cream-100 border-2 border-cream-200 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4 bg-cream-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-300/40 border border-sun-400/40 text-sun-600">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink-800">
                La Roulette du Destin d’Abidjan
              </h2>
              <p className="text-xs text-ink-600">
                19 Classes & 7 Easter Eggs Légendaires • Tire ton destin ou choisis ta commune
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning}
              className={`flex items-center gap-2 rounded-xl bg-sun-500 hover:bg-sun-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer ${
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-200 hover:bg-cream-200 text-ink-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 no-scrollbar">
          {/* LEFT: SELECTED DESTINY DETAILS */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-2xl bg-cream-50 p-5 border border-cream-200">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  style={{ backgroundColor: `${selected.color}25`, borderColor: selected.color, color: selected.color }}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider border"
                >
                  {selected.rarity}
                </span>

                <div className="flex items-center gap-1 text-xs font-bold text-sun-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Étoile : {selected.startingStar}/100</span>
                </div>
              </div>

              <h3 className="font-display text-2xl md:text-3xl font-bold text-ink-800 leading-tight">
                {selected.name}
              </h3>
              <p className="text-xs font-semibold text-sun-600 mt-0.5">{selected.subtitle}</p>

              <blockquote className="my-3 rounded-xl bg-cream-100 p-3 text-xs italic text-ink-600 border-l-2 border-sun-400/60">
                {selected.quote}
              </blockquote>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between border-b border-cream-200 pb-1">
                  <span className="text-ink-600">Commune de départ :</span>
                  <span className="font-bold text-lagoon-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selected.district}
                  </span>
                </div>

                <div className="flex justify-between border-b border-cream-200 pb-1">
                  <span className="text-ink-600">Cash de départ :</span>
                  <span className="tabular-nums font-bold text-palm-600">
                    {selected.startingCash.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="flex justify-between border-b border-cream-200 pb-1 gap-2">
                  <span className="text-ink-600 shrink-0">Logement :</span>
                  <span className="font-semibold text-ink-800 text-right truncate">{selected.housing}</span>
                </div>

                <div className="flex justify-between border-b border-cream-200 pb-1">
                  <span className="text-ink-600">Véhicule(s) :</span>
                  <span className="font-semibold text-ink-800 uppercase">
                    {selected.vehicle
                      ? `${selected.vehicle.replace(/_/g, ' ')}${selected.secondaryVehicle ? ` + ${selected.secondaryVehicle.replace(/_/g, ' ')}` : ''}`
                      : 'À pied / Gbaka'}
                  </span>
                </div>

                <div className="mt-2 rounded-xl bg-sun-300/35 p-2.5 border border-sun-400/30">
                  <div className="text-xs font-bold uppercase text-sun-600 tracking-wider">Atout Spécial :</div>
                  <div className="text-xs text-sun-600 mt-0.5">{selected.perk}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectDestiny(selected)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-palm-600 hover:bg-palm-500 py-3 text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
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
                  className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer ${
                    activeFilter === f ? 'bg-sun-500 text-white' : 'bg-cream-200 text-ink-600 hover:text-white'
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
                        ? 'bg-sun-300/35 border-sun-400/60 ring-1 ring-sun-400'
                        : 'bg-cream-50 border-cream-200 hover:border-cream-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-ink-800 truncate">{d.name}</span>
                      <span style={{ color: d.color }} className="text-xs font-extrabold uppercase shrink-0">
                        {d.rarity}
                      </span>
                    </div>
                    <span className="text-xs text-ink-600 truncate mt-0.5">{d.district} · {d.subtitle}</span>
                    <span className="text-xs tabular-nums font-bold text-palm-600 mt-1">
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
