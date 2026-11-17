import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  UtensilsCrossed,
  MapPin,
  Shirt,
  CheckCircle,
  Wifi,
  Battery,
} from 'lucide-react';
import {
  PlayerState,
  RemotePlayer,
  SapeOutfitId,
} from '../types/game';
import {
  IVORIAN_FOODS,
  SAPE_OUTFITS,
} from '../core/destinies';
import {
  buildGpsDestinations,
  searchGpsDestinations,
  type GpsDestination,
  type GpsKind,
  type GpsSource,
} from '../core/gpsDestinations';
import { FARE_BETWEEN_COMMUNES, FARE_SAME_COMMUNE, fastTravelFare, formatGameTime } from '../core/simulation';
import { t } from '../core/i18n';
import { ServerTontineSnapshot } from '../network/multiplayerClient';

interface BabiOSPhoneProps {
  playerState: PlayerState;
  remotePlayers: RemotePlayer[];
  tontineSnapshot: ServerTontineSnapshot | null;
  tontineError: string | null;
  /** Lieux et perron de la maison, relevés à l'ouverture de l'application GPS. */
  getGpsSource: () => GpsSource;
  onClose: () => void;
  onEatFood: (foodId: string) => void;
  onFastTravel: (x: number, z: number, districtName: string, districtId: string) => void;
  onBuyOrEquipOutfit: (outfit: SapeOutfitId) => void;
  onDonateYannis: () => void;
  onClearPoliceNetwork: (isBlackMarket: boolean) => void;
}

type PhoneApp = 'home' | 'eats' | 'gps' | 'sape';

export const BabiOSPhone: React.FC<BabiOSPhoneProps> = ({
  playerState,
  remotePlayers,
  tontineSnapshot,
  tontineError,
  getGpsSource,
  onClose,
  onEatFood,
  onFastTravel,
  onBuyOrEquipOutfit,
  onDonateYannis,
  onClearPoliceNetwork,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('home');
  // GPS : la liste est relevée à chaque ouverture de l'application (la maison peut avoir été posée entre-temps).
  const [gpsList, setGpsList] = useState<GpsDestination[]>([]);
  const [gpsFrom, setGpsFrom] = useState<string | null>(null);
  const [gpsQuery, setGpsQuery] = useState('');
  useEffect(() => {
    if (activeApp !== 'gps') return;
    const src = getGpsSource();
    setGpsList(buildGpsDestinations(src));
    setGpsFrom(src.fromDistrictId);
    setGpsQuery('');
    // getGpsSource est volontairement hors des dépendances : on relève la liste à l'ouverture seulement.
  }, [activeApp]);
  const gpsShown = useMemo(() => searchGpsDestinations(gpsList, gpsQuery), [gpsList, gpsQuery]);

  const s = t(playerState.language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-ink-900/60">
      <div className="relative flex flex-col h-[min(630px,calc(100dvh-16px))] w-[min(360px,calc(100vw-16px))] md:h-[min(670px,calc(100dvh-32px))] md:w-[390px] rounded-[28px] md:rounded-[36px] bg-cream-50 border-[4px] md:border-[5px] border-ink-800 shadow-2xl overflow-hidden text-ink-800">
        {/* TOP STATUS BAR */}
        <div className="relative shrink-0 flex items-center justify-between px-5 pt-2.5 pb-2 text-xs font-bold text-ink-600 bg-cream-100">
          <span className="tabular-nums">{formatGameTime(playerState.gameTimeHours)}</span>
          <span className="text-xs tabular-nums text-sun-600">BabiOS 26</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-palm-600" />
            <Battery className="h-3.5 w-3.5 text-ink-600" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer BabiOS"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 hover:bg-cream-200 text-ink-800 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          {activeApp === 'home' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-cream-100 p-3 border border-sun-400/30">
                <div className="text-xs uppercase font-bold text-sun-600">{playerState.destiny.district}</div>
                <div className="text-sm font-bold text-ink-800 mt-0.5">{playerState.destiny.name}</div>
                <div className="flex items-center justify-between text-xs mt-1.5 tabular-nums">
                  <span className="text-palm-600 font-bold">{Math.round(playerState.cash).toLocaleString('fr-FR')} F</span>
                  <span className="text-lagoon-600">{s.bankBalance}: {Math.round(playerState.bankCash).toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <AppIcon label={s.eats} icon={<UtensilsCrossed className="h-6 w-6" />} tone="sun" onClick={() => setActiveApp('eats')} />
                <AppIcon label={s.gps} icon={<MapPin className="h-6 w-6" />} tone="lagoon" onClick={() => setActiveApp('gps')} />
                <AppIcon label={s.sape} icon={<Shirt className="h-6 w-6" />} tone="plum" onClick={() => setActiveApp('sape')} />
              </div>
            </div>
          )}

          {/* AKWABA EATS */}
          {activeApp === 'eats' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.eats} onBack={() => setActiveApp('home')} />
              {IVORIAN_FOODS.map((food) => (
                <div key={food.id} className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">{food.icon}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink-800 truncate">{food.name}</div>
                      <div className="text-xs text-sun-600">{food.buffName}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEatFood(food.id)}
                    className="shrink-0 rounded-lg bg-sun-600 hover:bg-sun-500 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    {food.price.toLocaleString('fr-FR')} F
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* GPS ABIDJAN : Chez moi, lieux, repères, communes (taxi express 500 F dans la commune, 1 000 F entre communes) */}
          {activeApp === 'gps' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.gps} onBack={() => setActiveApp('home')} />
              <div className="text-xs text-ink-600">
                Taxi Express :{' '}
                <strong className="text-sun-600">{FARE_SAME_COMMUNE.toLocaleString('fr-FR')} F</strong> dans ta commune,{' '}
                <strong className="text-sun-600">{FARE_BETWEEN_COMMUNES.toLocaleString('fr-FR')} F</strong> entre communes.
                Déposé devant l'entrée du lieu.
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-cream-100 border border-cream-200 px-2.5 py-2 focus-within:border-lagoon-400/60">
                <Search className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                <input
                  type="search"
                  value={gpsQuery}
                  onChange={(e) => setGpsQuery(e.target.value)}
                  placeholder="Chercher un lieu, une commune…"
                  aria-label="Chercher une destination"
                  maxLength={40}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-xs text-ink-800 placeholder:text-ink-400 outline-none"
                />
              </label>
              {gpsShown.length === 0 && (
                <div className="rounded-xl bg-cream-100 p-3 text-center text-xs text-ink-600">
                  Aucune destination ne correspond à « {gpsQuery.trim()} ».
                </div>
              )}
              {(
                [
                  ['home', 'Chez moi'],
                  ['place', 'Lieux'],
                  ['landmark', 'Repères de la ville'],
                  ['district', 'Communes'],
                ] as Array<[GpsKind, string]>
              ).map(([kind, title]) => {
                const rows = gpsShown.filter((d) => d.kind === kind);
                if (rows.length === 0) return null;
                return (
                  <div key={kind} className="flex flex-col gap-1.5">
                    {kind !== 'home' && (
                      <div className="pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-600">{title}</div>
                    )}
                    {rows.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => onFastTravel(loc.x, loc.z, loc.name, loc.districtId)}
                        className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200 hover:border-lagoon-400/60 text-left cursor-pointer"
                      >
                        <div className="flex min-w-0 items-center gap-2 pr-2">
                          <span className="shrink-0 text-base leading-none" aria-hidden="true">{loc.icon}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-ink-800 truncate">{loc.name}</div>
                            <div className="text-xs text-ink-600 truncate">{loc.desc}</div>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-lagoon-400/20 px-2 py-1 text-xs font-bold text-lagoon-600">
                          {fastTravelFare(gpsFrom, loc.districtId).toLocaleString('fr-FR')} F
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* SAPE & FAROT */}
          {activeApp === 'sape' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.sape} onBack={() => setActiveApp('home')} />
              {SAPE_OUTFITS.map((outfit) => {
                const owned = playerState.ownedOutfits.includes(outfit.id);
                const equipped = playerState.sapeOutfit === outfit.id;
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => onBuyOrEquipOutfit(outfit.id)}
                    className={`flex items-center justify-between rounded-xl p-2.5 border text-left cursor-pointer ${
                      equipped ? 'bg-plum-500/10 border-plum-400/60' : 'bg-cream-100 border-cream-200 hover:border-cream-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-ink-800 flex items-center gap-1.5">
                        <span>{outfit.icon}</span>
                        <span className="truncate">{outfit.name}</span>
                      </div>
                      <div className="text-xs text-plum-500">{outfit.perk}</div>
                    </div>
                    {equipped ? (
                      <CheckCircle className="h-4 w-4 text-plum-500 shrink-0" />
                    ) : (
                      <span className="shrink-0 rounded-lg bg-cream-200 px-2 py-1 text-xs font-bold text-sun-600">
                        {owned ? 'Porter' : `${outfit.price.toLocaleString('fr-FR')} F`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* HOME BAR */}
        <div className="shrink-0 flex justify-center py-2 bg-cream-100 border-t border-cream-200">
          <button
            type="button"
            onClick={() => setActiveApp('home')}
            className="h-1.5 w-28 rounded-full bg-cream-200 hover:bg-white cursor-pointer"
            aria-label="Accueil BabiOS"
          />
        </div>
      </div>
    </div>
  );
};

const AppIcon: React.FC<{
  label: string;
  icon: React.ReactNode;
  tone: 'sun' | 'lagoon' | 'palm' | 'coral' | 'plum';
  onClick: () => void;
}> = ({ label, icon, tone, onClick }) => (
  <button type="button" onClick={onClick} className="flex cursor-pointer flex-col items-center gap-1.5">
    <span className={`jelly jelly-tile jelly-${tone} h-12 w-12`}>
      <span className="relative flex items-center justify-center">{icon}</span>
    </span>
    <span className="max-w-full truncate text-xs font-semibold text-ink-600">{label}</span>
  </button>
);

const AppHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-2 border-b border-cream-200 pb-2">
    <button
      type="button"
      onClick={onBack}
      className="rounded-lg bg-cream-200 hover:bg-cream-200 px-2 py-1 text-xs font-bold text-ink-600 cursor-pointer"
    >
      ‹ Retour
    </button>
    <span className="text-xs font-bold text-ink-800 truncate">{title}</span>
  </div>
);
