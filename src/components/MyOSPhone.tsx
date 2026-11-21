import React, { useEffect, useMemo, useState } from 'react';
import { ItemIcon } from './ItemIcon';
import {
  X,
  Search,
  UtensilsCrossed,
  MapPin,
  Shirt,
  Save,
  CheckCircle,
  Wifi,
  Battery,
  SlidersHorizontal,
  Flame,
  Trophy,
  Utensils,
  Zap,
  ShowerHead,
  Droplet,
  CarTaxiFront,
  Wrench,
} from 'lucide-react';
import {
  PlayerState,
  SapeOutfitId,
} from '../types/game';
import { SAPE_OUTFITS } from '../core/destinies';
import { PLACE_MENUS, getItem, placePrice } from '../core/items';
import {
  buildGpsDestinations,
  searchGpsDestinations,
  type GpsDestination,
  type GpsKind,
  type GpsSource,
} from '../core/gpsDestinations';
import { FARE_BETWEEN_COMMUNES, FARE_SAME_COMMUNE, fastTravelFare, formatGameTime, hasUnlimitedPlatinum } from '../core/simulation';
import { getMissionForDestiny } from '../core/missions';
import { t } from '../core/i18n';
import { BarGauge, RingGauge } from './ui/Gauge';
import { FcfaCoin, StarBadge } from './ui/icons';

function IvoryFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="10" height="20" fill="#f77f00" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#009e60" />
    </svg>
  );
}

interface MyOSPhoneProps {
  playerState: PlayerState;
  /** Lieux et perron de la maison, relevés à l'ouverture de l'application GPS. */
  getGpsSource: () => GpsSource;
  taxiCall?: { districtName: string; remainingS: number } | null;
  onCancelTaxi?: () => void;
  onRepairEngine?: () => void;
  onClose: () => void;
  /** Akwaba Eats : commande un objet du menu (×1,3) ; il arrive dans le sac (livreur : plus tard). */
  onOrderFood: (itemId: string) => void;
  onFastTravel: (x: number, z: number, districtName: string, districtId: string) => void;
  onBuyOrEquipOutfit: (outfit: SapeOutfitId) => void;
  /** Sauvegarde immédiate de la partie ; renvoie vrai si elle a bien été écrite. */
  onSaveGame: () => Promise<boolean>;
  playerModelScale: number;
  onPlayerModelScaleChange: (value: number) => void;
}

type PhoneApp = 'home' | 'eats' | 'gps' | 'sape' | 'customisation';

export const MyOSPhone: React.FC<MyOSPhoneProps> = ({
  playerState,
  getGpsSource,
  taxiCall = null,
  onCancelTaxi,
  onRepairEngine,
  onClose,
  onOrderFood,
  onFastTravel,
  onBuyOrEquipOutfit,
  onSaveGame,
  playerModelScale,
  onPlayerModelScaleChange,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('home');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const handleSave = async () => {
    const ok = await onSaveGame();
    setSaveStatus(ok ? 'ok' : 'fail');
    window.setTimeout(() => setSaveStatus('idle'), 2500);
  };
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
  const platinumActive = hasUnlimitedPlatinum(playerState);
  const mission = getMissionForDestiny(playerState.destiny.id);
  const missionIdx = Math.min(playerState.activeMission.stepIndex, mission.steps.length - 1);
  const missionStep = mission.steps[missionIdx];
  const vitals = [
    { label: s.hunger, value: playerState.needs.hunger, tone: 'palm' as const, icon: <Utensils className="h-4 w-4" /> },
    { label: s.energy, value: playerState.needs.energy, tone: 'sun' as const, icon: <Zap className="h-4 w-4" /> },
    { label: s.hygiene, value: playerState.needs.hygiene, tone: 'lagoon' as const, icon: <ShowerHead className="h-4 w-4" /> },
    { label: s.bladder, value: playerState.needs.bladder, tone: 'plum' as const, icon: <Droplet className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-ink-900/60">
      <div className="relative flex flex-col h-[min(630px,calc(100dvh-16px))] w-[min(360px,calc(100vw-16px))] md:h-[min(670px,calc(100dvh-32px))] md:w-[390px] rounded-[28px] md:rounded-[36px] bg-cream-50 border-[4px] md:border-[5px] border-ink-800 shadow-2xl overflow-hidden text-ink-800">
        {/* TOP STATUS BAR */}
        <div className="relative shrink-0 flex items-center justify-between px-5 pt-2.5 pb-2 text-xs font-bold text-ink-600 bg-cream-100">
          <span className="tabular-nums">{formatGameTime(playerState.gameTimeHours)}</span>
          <span className="text-xs tabular-nums text-sun-600">MyOS 26</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-palm-600" />
            <Battery className="h-3.5 w-3.5 text-ink-600" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer MyOS"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 hover:bg-cream-200 text-ink-800 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          {activeApp === 'home' && (
            <div className="flex flex-col gap-2.5">
              {/* DESTIN, FINANCES & MISSION */}
              <div className="rounded-2xl bg-cream-100 p-3 border border-sun-400/30 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-sm"
                      style={{ backgroundColor: playerState.destiny.color }}
                      aria-hidden="true"
                    >
                      <IvoryFlag className="h-5 w-7 rounded-sm border border-white/80" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] uppercase font-bold text-sun-600 truncate">{playerState.destiny.district}</span>
                        <span className="shrink-0 rounded-full bg-sun-300 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sun-600">
                          {playerState.destiny.rarity}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-ink-800 truncate">{playerState.destiny.name}</div>
                      {playerState.playerName && (
                        <div className="text-[11px] font-semibold text-ink-500 truncate">{playerState.playerName}</div>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white bg-sun-300 px-2.5 py-1 text-xs font-bold tabular-nums text-sun-600 shadow-xs">
                    <Trophy className="h-3.5 w-3.5" />
                    {playerState.activeMission.completed ? 'Fini' : `${missionIdx + 1}/${mission.steps.length}`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                  <span className="inline-flex items-center gap-1 text-palm-600 font-bold">
                    <FcfaCoin className="h-4 w-4 shrink-0" />
                    {Math.round(playerState.cash).toLocaleString('fr-FR')} F
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lagoon-600 font-semibold">{s.bankBalance}: {Math.round(playerState.bankCash).toLocaleString('fr-FR')} F</span>
                    {playerState.debt > 0 && <span className="text-coral-600 font-semibold">−{Math.round(playerState.debt).toLocaleString('fr-FR')}</span>}
                  </div>
                </div>

                {playerState.destiny.englishLock && (
                  <div className={`text-[11px] font-semibold ${platinumActive ? 'text-sun-600' : 'text-coral-600'}`}>
                    {platinumActive ? `${s.platinumActive} (${playerState.goldenBoyDaysLeft}d)` : s.platinumExpired}
                  </div>
                )}
                {playerState.destiny.rehabJourney && (
                  <div className={`text-[11px] font-semibold ${playerState.redemptionTrophyUnlocked ? 'text-palm-600' : 'text-sun-600'}`}>
                    {playerState.redemptionTrophyUnlocked ? 'Trophée Rédemption débloqué' : `Sevrage : ${playerState.cleanDaysStreak}/7 jours`}
                  </div>
                )}
                {playerState.destiny.realMadridSuperstar && (
                  <div className="text-[11px] font-semibold text-lagoon-600">Académie niveau {playerState.yannisAcademyLevel}/3</div>
                )}

                <div className="rounded-xl bg-cream-50/90 px-2.5 py-2 border border-cream-200">
                  <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wide truncate">{mission.title}</div>
                  {playerState.activeMission.completed ? (
                    <div className="text-xs font-bold text-palm-600 mt-0.5">Trophée : {mission.finalTrophy}</div>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-ink-800 leading-snug mt-0.5">{missionStep.title}</div>
                      <div className="text-[11px] font-medium text-ink-600 leading-snug">{missionStep.description}</div>
                    </>
                  )}
                </div>
              </div>

              {/* JAUGE D'ENVIE UNIVERSELLE + BESOINS + ÉTOILE */}
              <div className="rounded-2xl bg-cream-100 p-3 border border-sun-400/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 shrink-0 text-sun-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between text-xs font-bold text-ink-600">
                      <span className="truncate">{s.envyGauge}</span>
                      <span className={`tabular-nums ${playerState.needs.envy < 30 ? 'text-coral-600' : 'text-sun-600'}`}>
                        {Math.round(playerState.needs.envy)}%
                      </span>
                    </div>
                    <BarGauge value={playerState.needs.envy} tone={playerState.needs.envy < 30 ? 'coral' : 'sun'} label={s.envyGauge} className="mt-1" />
                  </div>
                </div>

                <div className="flex items-center justify-around gap-1.5">
                  {vitals.map((v) => (
                    <RingGauge key={v.label} value={v.value} tone={v.tone} label={v.label} icon={v.icon} size={40} />
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-cream-200 pt-2">
                  <StarBadge className="h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-xs font-bold">
                      <span className="text-ink-600">{s.starLabel}</span>
                      <span className="tabular-nums text-sun-600">{Math.round(playerState.star)}</span>
                    </div>
                    <BarGauge value={playerState.star} tone="sun" label={s.starLabel} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-0.5">
                <AppIcon label={s.eats} icon={<UtensilsCrossed className="h-6 w-6" />} tone="sun" onClick={() => setActiveApp('eats')} />
                <AppIcon label={s.gps} icon={<MapPin className="h-6 w-6" />} tone="lagoon" onClick={() => setActiveApp('gps')} />
                <AppIcon label={s.sape} icon={<Shirt className="h-6 w-6" />} tone="plum" onClick={() => setActiveApp('sape')} />
                <AppIcon
                  label={playerState.language === 'fr' ? 'Customisation' : 'Customisation'}
                  icon={<SlidersHorizontal className="h-6 w-6" />}
                  tone="coral"
                  onClick={() => setActiveApp('customisation')}
                />
                <AppIcon
                  label={
                    saveStatus === 'ok'
                      ? playerState.language === 'fr' ? 'Sauvegardé ✓' : 'Saved ✓'
                      : saveStatus === 'fail'
                      ? playerState.language === 'fr' ? 'Échec' : 'Failed'
                      : playerState.language === 'fr' ? 'Sauvegarder' : 'Save'
                  }
                  icon={<Save className="h-6 w-6" />}
                  tone="palm"
                  onClick={handleSave}
                />
              </div>

              {/* TAXI ACTIF & PANNES */}
              {taxiCall && (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-lagoon-400/15 border border-lagoon-500/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CarTaxiFront className="h-4 w-4 shrink-0 text-lagoon-600" />
                    <div className="min-w-0 text-xs font-bold text-ink-800 truncate">
                      {taxiCall.districtName} · {taxiCall.remainingS} s
                    </div>
                  </div>
                  {onCancelTaxi && (
                    <button
                      type="button"
                      onClick={onCancelTaxi}
                      className="shrink-0 rounded-lg bg-coral-500 hover:bg-coral-600 px-2.5 py-1 text-xs font-bold text-white cursor-pointer"
                    >
                      {playerState.language === 'fr' ? 'Annuler le taxi' : 'Cancel taxi'}
                    </button>
                  )}
                </div>
              )}

              {playerState.engineStalled && onRepairEngine && (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-coral-400/15 border border-coral-500/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wrench className="h-4 w-4 shrink-0 text-coral-600" />
                    <span className="text-xs font-bold text-coral-600 truncate">{s.engineStalled}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRepairEngine();
                    }}
                    className="shrink-0 rounded-lg bg-coral-500 hover:bg-coral-600 px-2.5 py-1 text-xs font-bold text-white cursor-pointer"
                  >
                    {playerState.language === 'fr' ? 'Dépanner' : 'Repair'}
                  </button>
                </div>
              )}

              {/* JOURNAL RÉCENT */}
              {playerState.logs.length > 0 && (
                <div className="rounded-2xl bg-cream-100 p-2.5 border border-cream-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">
                    {playerState.language === 'fr' ? 'Journal' : 'Activity Log'}
                  </div>
                  {playerState.logs.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="text-[11px] leading-snug text-ink-700">
                      <span className="font-bold tabular-nums text-ink-500">{entry.time}</span> · {entry.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AKWABA EATS */}
          {activeApp === 'eats' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.eats} onBack={() => setActiveApp('home')} />
              {PLACE_MENUS.akwaba.itemIds.map((id) => {
                const item = getItem(id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ItemIcon itemId={item.id} emoji={item.icon} size={32} />
                      <div className="font-bold text-xs text-ink-800 truncate">{item.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOrderFood(id)}
                      className="shrink-0 rounded-lg bg-sun-600 hover:bg-sun-500 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                    >
                      {placePrice(id, 'akwaba').toLocaleString('fr-FR')} F
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* GPS ABIDJAN : Chez moi, lieux, repères, communes (taxi express 500 F dans la commune, 1 000 F entre communes) */}
          {activeApp === 'gps' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.gps} onBack={() => setActiveApp('home')} />
              {taxiCall && onCancelTaxi && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-lagoon-400/15 border border-lagoon-500/40 px-2.5 py-2">
                  <span className="text-xs font-bold text-ink-800 truncate">
                    🚖 {taxiCall.districtName} · {taxiCall.remainingS} s
                  </span>
                  <button
                    type="button"
                    onClick={onCancelTaxi}
                    className="shrink-0 rounded-lg bg-coral-500 hover:bg-coral-600 px-2 py-1 text-xs font-bold text-white cursor-pointer"
                  >
                    {playerState.language === 'fr' ? 'Annuler le taxi' : 'Cancel taxi'}
                  </button>
                </div>
              )}
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

          {/* CUSTOMISATION */}
          {activeApp === 'customisation' && (
            <div className="flex flex-col gap-3">
              <AppHeader title={playerState.language === 'fr' ? 'Customisation' : 'Customisation'} onBack={() => setActiveApp('home')} />
              <div className="rounded-xl bg-cream-100 p-3 border border-cream-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink-800">
                    {playerState.language === 'fr' ? 'Taille du modèle' : 'Model size'}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-sun-600">
                    {Math.round((playerModelScale / 1.20) * 100)} %
                  </span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="1"
                  value={Math.round((playerModelScale / 1.20) * 100)}
                  onChange={(event) => onPlayerModelScaleChange((Number(event.target.value) / 100) * 1.20)}
                  aria-label={playerState.language === 'fr' ? 'Taille du modèle' : 'Model size'}
                  className="w-full accent-sun-600"
                />
                <div className="mt-1 flex justify-between text-[10px] text-ink-500">
                  <span>{playerState.language === 'fr' ? 'Petit' : 'Small'}</span>
                  <span>{playerState.language === 'fr' ? 'Normal' : 'Normal'}</span>
                  <span>{playerState.language === 'fr' ? 'Grand' : 'Large'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HOME BAR */}
        <div className="shrink-0 flex justify-center py-2 bg-cream-100 border-t border-cream-200">
          <button
            type="button"
            onClick={() => setActiveApp('home')}
            className="h-1.5 w-28 rounded-full bg-cream-200 hover:bg-white cursor-pointer"
            aria-label="Accueil MyOS"
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
