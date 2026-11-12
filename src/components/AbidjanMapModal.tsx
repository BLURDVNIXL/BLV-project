/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Carte Interactive d'Abidjan (Communes, Lagune Ébrié, Ponts, Lycées d'Excellence & Déplacements)
 */

import React, { useState } from 'react';
import { PlayerState, SchoolBadgeId } from '../types/game';
import { MapPin, Navigation, Car, Bus, Footprints, X, GraduationCap, Building2, Store, Palmtree, Waves, Award } from 'lucide-react';

interface AbidjanMapModalProps {
  playerState: PlayerState;
  onClose: () => void;
  onTravelTo: (commune: string, locationName: string, travelType: 'walk' | 'woroworo' | 'car') => void;
  onOpenBadgeQuest?: (badgeId: SchoolBadgeId) => void;
  isEnglish?: boolean;
}

interface AbidjanLocation {
  id: string;
  name: string;
  commune: string;
  type: 'school' | 'business' | 'leisure' | 'market' | 'home';
  badgeId?: SchoolBadgeId;
  description: string;
  coords: { x: number; y: number }; // Pourcentage sur la carte
  icon: string;
}

const ABIDJAN_LOCATIONS: AbidjanLocation[] = [
  {
    id: 'lycee_classique',
    name: 'Lycée Classique d\'Abidjan',
    commune: 'Cocody',
    type: 'school',
    badgeId: 'caiman',
    description: 'Le sanctuaire des Caïmans. Berceau de Gbagbo et Thiam. Décroche le badge Devenir Caïman !',
    coords: { x: 62, y: 35 },
    icon: '🐊'
  },
  {
    id: 'lycee_sainte_marie',
    name: 'Lycée Sainte-Marie de Cocody',
    commune: 'Cocody',
    type: 'school',
    badgeId: 'alysma',
    description: '100% de réussite au Bac. L\'excellence féminine d\'Abidjan. Badge Devenir Alysma !',
    coords: { x: 68, y: 32 },
    icon: '🌸'
  },
  {
    id: 'lycee_excellence_bassam',
    name: 'Lycée d\'Excellence Alassane Ouattara',
    commune: 'Grand-Bassam',
    type: 'school',
    badgeId: 'alex',
    description: 'Campus futuriste de 20 ha. Le haut niveau en maths et physique. Badge Devenir Alex !',
    coords: { x: 88, y: 72 },
    icon: '⚡'
  },
  {
    id: 'plateau_tours',
    name: 'Tours Administratives & Sièges de Banques',
    commune: 'Plateau',
    type: 'business',
    description: 'Le Manhattan ivoirien. Les grands salaires, les ministères et la haute finance.',
    coords: { x: 48, y: 52 },
    icon: '🏢'
  },
  {
    id: 'adjame_marche',
    name: 'Grand Marché d\'Adjamé & Gare Gbaka',
    commune: 'Adjamé',
    type: 'market',
    description: 'Le cœur battant du commerce informel. Affaires en or, pièces détachées et djassa.',
    coords: { x: 45, y: 30 },
    icon: '🛍️'
  },
  {
    id: 'yopougon_maroc',
    name: 'Rue Princesse & Maquis de Yopougon',
    commune: 'Yopougon',
    type: 'leisure',
    description: 'Capitale de l\'ambiance, du Coupé-Décalé et des poissons braisés géants.',
    coords: { x: 25, y: 32 },
    icon: '🎉'
  },
  {
    id: 'treichville_port',
    name: 'Port Autonome & Dépôts de Conteneurs',
    commune: 'Treichville',
    type: 'business',
    description: 'Le premier port thonier d\'Afrique. Logistique, fret et bateaux de transport.',
    coords: { x: 42, y: 68 },
    icon: '🚢'
  },
  {
    id: 'marcory_allodromes',
    name: 'Allodrome & Espace Gastronomique',
    commune: 'Marcory',
    type: 'leisure',
    description: 'Le temple de l\'alloco croustillant et du poisson sauce pimentée.',
    coords: { x: 55, y: 62 },
    icon: '🍌'
  },
  {
    id: 'assinie_mer',
    name: 'Plages & Duplex d\'Assinie Mafia',
    commune: 'Assinie',
    type: 'leisure',
    description: 'Villas de milliardaires, jet-ski sur la lagune et repos VIP au bord de l\'océan.',
    coords: { x: 92, y: 88 },
    icon: '🏖️'
  }
];

export const AbidjanMapModal: React.FC<AbidjanMapModalProps> = ({
  playerState,
  onClose,
  onTravelTo,
  onOpenBadgeQuest,
  isEnglish = false
}) => {
  const [selectedLoc, setSelectedLoc] = useState<AbidjanLocation>(ABIDJAN_LOCATIONS[0]);

  const handleTravel = (type: 'walk' | 'woroworo' | 'car') => {
    onTravelTo(selectedLoc.commune, selectedLoc.name, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none text-white">
      <div className="relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-amber-500/40 bg-slate-950/95 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-amber-400 font-mono">
                {isEnglish ? 'Map of Abidjan & Travel' : 'Carte Complète d\'Abidjan'}
              </h2>
              <span className="text-xs text-slate-400">
                {isEnglish ? `Current location: ${playerState.currentLocationName}` : `Position actuelle : ${playerState.currentLocationName}`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CORPS : Carte Visuelle (Gauche) + Détails & Voyage (Droite) */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* CARTE VISUELLE STYLISÉE D'ABIDJAN */}
          <div className="relative flex-1 bg-slate-900/90 p-4 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 flex items-center justify-center">
            {/* Découpe stylisée d'Abidjan : Terres & Lagune Ébrié */}
            <div className="relative h-full w-full min-h-[280px] max-w-[650px] rounded-2xl border border-slate-800 bg-emerald-950/30 overflow-hidden shadow-inner">
              {/* Lagune Ébrié (Ruban bleu qui traverse Abidjan) */}
              <div
                className="absolute left-0 right-0 h-16 sm:h-20 bg-sky-600/40 backdrop-blur-sm border-y border-sky-400/30 -rotate-3"
                style={{ top: '48%' }}
              >
                <div className="flex h-full items-center justify-center">
                  <span className="text-[11px] font-black tracking-widest uppercase text-sky-200/60 font-mono">
                    🌊 LAGUNE ÉBRIÉ
                  </span>
                </div>
              </div>

              {/* Les 4 Ponts Emblematiques */}
              <div className="absolute top-[47%] left-[46%] h-20 w-3 bg-amber-600/70 border border-amber-300/60 rounded z-10" title="Pont HKB / Pont De Gaulle" />
              <div className="absolute top-[49%] left-[53%] h-20 w-3 bg-amber-600/70 border border-amber-300/60 rounded z-10" title="Pont Houphouët-Boigny" />
              <div className="absolute top-[45%] left-[38%] h-24 w-3.5 bg-yellow-500/80 border border-yellow-200 rounded z-10 -rotate-12" title="Pont Alassane Ouattara (Haubans)" />

              {/* Marqueurs des Lieux Clés */}
              {ABIDJAN_LOCATIONS.map((loc) => {
                const isSelected = selectedLoc.id === loc.id;
                const isCurrent = playerState.currentLocationName.includes(loc.commune);

                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLoc(loc)}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all shadow-xl z-20 ${
                      isSelected
                        ? 'scale-110 bg-amber-500 text-slate-950 ring-4 ring-amber-400/40 shadow-amber-500/50'
                        : loc.badgeId
                        ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-400 hover:scale-105'
                        : 'bg-slate-950/80 text-slate-200 border border-slate-700 hover:bg-slate-800'
                    }`}
                    style={{ left: `${loc.coords.x}%`, top: `${loc.coords.y}%` }}
                  >
                    <span>{loc.icon}</span>
                    <span className="text-[11px] font-mono whitespace-nowrap">
                      {loc.name.split(' ')[0]}
                    </span>
                    {loc.badgeId && (
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DÉTAILS DU LIEU SÉLECTIONNÉ & OPTIONS DE VOYAGE */}
          <div className="w-full md:w-80 flex flex-col justify-between p-4 sm:p-5 bg-slate-950 overflow-y-auto">
            <div>
              {/* Badge Lycée d'Excellence si applicable */}
              {selectedLoc.badgeId && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-300">
                  <Award className="h-4 w-4 text-amber-400 animate-bounce" />
                  <span>
                    {isEnglish ? 'Elite School Badge Quest Available!' : 'Lycée d\'Excellence : Badge à Décrocher !'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-amber-400 text-2xl">
                <span>{selectedLoc.icon}</span>
                <h3 className="text-base font-black uppercase text-white font-mono">
                  {selectedLoc.name}
                </h3>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Commune : <strong className="text-slate-200">{selectedLoc.commune}</strong></span>
              </div>

              <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {selectedLoc.description}
              </p>
            </div>

            {/* CHOIX DU MODE DE VOYAGE */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block">
                {isEnglish ? 'Select Transport :' : 'Choisir son Moyen de Transport :'}
              </span>

              {/* À pied */}
              <button
                onClick={() => handleTravel('walk')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-emerald-400" />
                  <span>{isEnglish ? 'On Foot' : 'À pied'}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">Gratuit (-10 Énergie)</span>
              </button>

              {/* Woro-woro 504 */}
              <button
                onClick={() => handleTravel('woroworo')}
                disabled={playerState.cash < 200}
                className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/40 transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-amber-400" />
                  <span>Woro-woro (Peugeot 504)</span>
                </div>
                <span className="text-[10px] font-bold font-mono text-amber-400">200 F</span>
              </button>

              {/* Voiture personnelle */}
              <button
                onClick={() => handleTravel('car')}
                className="flex w-full items-center justify-between rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 py-2 text-xs text-sky-200 hover:bg-sky-900/40 transition"
              >
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-sky-400" />
                  <span>{isEnglish ? 'My Ride / Personal Car' : 'Mon Véhicule'}</span>
                </div>
                <span className="text-[10px] font-bold text-sky-400">Rapide & Confort</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
