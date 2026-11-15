import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  CreditCard,
  UtensilsCrossed,
  MapPin,
  Shirt,
  Home,
  MessageSquare,
  CheckCircle,
  Send,
  Wifi,
  Battery,
  Target,
  DoorOpen,
  Flag,
  VolumeX,
  Volume2,
  Trophy,
} from 'lucide-react';
import {
  PlayerState,
  RemotePlayer,
  SapeOutfitId,
  HomeAccessMode,
} from '../types/game';
import {
  IVORIAN_FOODS,
  SAPE_OUTFITS,
  CRIB_UPGRADE_PRICES,
} from '../core/destinies';
import { getMissionForDestiny } from '../core/missions';
import {
  buildGpsDestinations,
  searchGpsDestinations,
  type GpsDestination,
  type GpsKind,
  type GpsSource,
} from '../core/gpsDestinations';
import { FARE_BETWEEN_COMMUNES, FARE_SAME_COMMUNE, fastTravelFare, formatGameTime } from '../core/simulation';
import { t } from '../core/i18n';
import { ChatMessage, ServerTontineSnapshot } from '../network/multiplayerClient';

interface BabiOSPhoneProps {
  playerState: PlayerState;
  remotePlayers: RemotePlayer[];
  tontineSnapshot: ServerTontineSnapshot | null;
  tontineError: string | null;
  chatMessages: ChatMessage[];
  visitingNeighbor: string | null;
  isSenderMuted: (senderId: string) => boolean;
  /** Lieux et perron de la maison, relevés à l'ouverture de l'application GPS. */
  getGpsSource: () => GpsSource;
  onClose: () => void;
  onEatFood: (foodId: string) => void;
  onDepositBank: (amount: number) => void;
  onWithdrawBank: (amount: number) => void;
  onTakeLoan: (amount: number) => void;
  onRepayDebt: (amount: number) => void;
  onJoinTontine: () => void;
  onContributeTontine: () => void;
  onFleeTontine: () => void;
  onFastTravel: (x: number, z: number, districtName: string, districtId: string) => void;
  onVisitNeighbor: (ownerId: string) => void;
  onReturnHome: () => void;
  onChangeHomeAccess: (mode: HomeAccessMode) => void;
  onBuyOrEquipOutfit: (outfit: SapeOutfitId) => void;
  onUpgradeCrib: (upgradeKey: 'splitClim' | 'bafflesMaquis' | 'tv4k' | 'canapeCuir') => void;
  onSleepHome: () => void;
  onShowerHome: () => void;
  onToiletHome: () => void;
  onSendChat: (text: string) => void;
  onReportChat: (messageId: string, senderId: string) => void;
  onToggleMuteSender: (senderId: string) => void;
  onDonateYannis: () => void;
  onClearPoliceNetwork: (isBlackMarket: boolean) => void;
}

type PhoneApp =
  | 'home'
  | 'missions'
  | 'bank'
  | 'eats'
  | 'gps'
  | 'sape'
  | 'crib'
  | 'social';

export const BabiOSPhone: React.FC<BabiOSPhoneProps> = ({
  playerState,
  remotePlayers,
  tontineSnapshot,
  tontineError,
  chatMessages,
  visitingNeighbor,
  isSenderMuted,
  getGpsSource,
  onClose,
  onEatFood,
  onDepositBank,
  onWithdrawBank,
  onTakeLoan,
  onRepayDebt,
  onJoinTontine,
  onContributeTontine,
  onFleeTontine,
  onFastTravel,
  onVisitNeighbor,
  onReturnHome,
  onChangeHomeAccess,
  onBuyOrEquipOutfit,
  onUpgradeCrib,
  onSleepHome,
  onShowerHome,
  onToiletHome,
  onSendChat,
  onReportChat,
  onToggleMuteSender,
  onDonateYannis,
  onClearPoliceNetwork,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('home');
  const [chatInput, setChatInput] = useState('');
  const [reportedIds, setReportedIds] = useState<Record<string, boolean>>({});
  const [, setMuteTick] = useState(0);
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
  const mission = getMissionForDestiny(playerState.destiny.id);
  const activeStepIdx = Math.min(playerState.activeMission.stepIndex, mission.steps.length - 1);
  const activeStep = mission.steps[activeStepIdx];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

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

              {/* ACTIVE MISSION SUMMARY TILE */}
              <button
                type="button"
                onClick={() => setActiveApp('missions')}
                className="rounded-2xl bg-sun-300/35 hover:bg-sun-300/35 p-3 border border-sun-400/40 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase text-sun-600">
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Mission : {mission.title}
                  </span>
                  <span>{playerState.activeMission.completed ? '🏆 3/3' : `${activeStepIdx + 1}/${mission.steps.length}`}</span>
                </div>
                <div className="text-xs font-bold text-ink-800 mt-0.5 truncate">
                  {playerState.activeMission.completed ? `Trophée : ${mission.finalTrophy}` : activeStep.title}
                </div>
              </button>

              <div className="grid grid-cols-4 gap-2.5">
                <AppIcon label="Missions" icon={<Target className="h-6 w-6" />} tone="sun" onClick={() => setActiveApp('missions')} />
                <AppIcon label={s.bank} icon={<CreditCard className="h-6 w-6" />} tone="palm" onClick={() => setActiveApp('bank')} />
                <AppIcon label={s.eats} icon={<UtensilsCrossed className="h-6 w-6" />} tone="sun" onClick={() => setActiveApp('eats')} />
                <AppIcon label={s.gps} icon={<MapPin className="h-6 w-6" />} tone="lagoon" onClick={() => setActiveApp('gps')} />
                <AppIcon label={s.sape} icon={<Shirt className="h-6 w-6" />} tone="plum" onClick={() => setActiveApp('sape')} />
                <AppIcon label={s.crib} icon={<Home className="h-6 w-6" />} tone="sun" onClick={() => setActiveApp('crib')} />
                <AppIcon label="Babi Chat" icon={<MessageSquare className="h-6 w-6" />} tone="plum" onClick={() => setActiveApp('social')} />
              </div>

              {/* RECENT LOGS */}
              <div className="rounded-2xl bg-cream-100 p-3 border border-cream-200">
                <div className="text-xs font-bold uppercase text-ink-600 mb-2">Journal d’Abidjan</div>
                <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                  {playerState.logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="text-xs leading-snug border-b border-cream-200 pb-1 last:border-0">
                      <span className="tabular-nums font-bold text-sun-600 mr-1.5">{log.time}</span>
                      <span className="text-ink-600">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MISSIONS DU DESTIN (3 ÉTAPES) */}
          {activeApp === 'missions' && (
            <div className="flex flex-col gap-3">
              <AppHeader title="Missions du Destin" onBack={() => setActiveApp('home')} />
              <div className="rounded-xl bg-cream-100 p-3.5 border border-sun-400/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sun-600 uppercase">{mission.title}</span>
                  {playerState.activeMission.completed && <Trophy className="h-4 w-4 text-sun-600" />}
                </div>
                <p className="text-xs text-ink-600 leading-snug">{mission.summary}</p>
                <div className="text-xs font-bold text-palm-600">
                  Trophée final : {mission.finalTrophy}
                </div>
              </div>

              {mission.steps.map((step, index) => {
                const done = playerState.activeMission.completed || index < playerState.activeMission.stepIndex;
                const current = !playerState.activeMission.completed && index === playerState.activeMission.stepIndex;
                return (
                  <div
                    key={step.id}
                    className={`rounded-xl p-3 border ${
                      done
                        ? 'bg-palm-400/15 border-palm-400/50'
                        : current
                        ? 'bg-sun-300/35 border-sun-400/60'
                        : 'bg-cream-100 border-cream-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink-800">
                        {index + 1}. {step.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                          done
                            ? 'bg-palm-400/20 text-palm-600'
                            : current
                            ? 'bg-sun-300/40 text-sun-600'
                            : 'bg-cream-200 text-ink-600'
                        }`}
                      >
                        {done ? 'Validée' : current ? 'En cours' : 'À venir'}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600 mt-1">{step.description}</p>
                    <div className="flex items-center justify-between text-xs mt-1.5 tabular-nums">
                      <span className="text-lagoon-600">📍 {step.targetDistrictName}</span>
                      <span className="text-palm-600">
                        +{step.rewardCash.toLocaleString('fr-FR')} F · +{step.rewardStar}★
                      </span>
                    </div>
                  </div>
                );
              })}

              {playerState.destiny.realMadridSuperstar && (
                <button type="button" onClick={onDonateYannis} className="rounded-xl bg-lagoon-600 hover:bg-lagoon-600 py-2 text-xs font-bold cursor-pointer">
                  ⚽ Financer Académie Yannis Diomandé (500 000 F)
                </button>
              )}
              {playerState.destiny.secretAddressBook && playerState.policeWanted > 0 && (
                <button type="button" onClick={() => onClearPoliceNetwork(false)} className="rounded-xl bg-sun-600 py-2 text-xs font-bold text-white cursor-pointer">
                  📞 Carnet d’Adresses : Annuler ★ Police
                </button>
              )}
              {playerState.destiny.blackMarketAccess && (
                <button type="button" onClick={() => onClearPoliceNetwork(true)} className="rounded-xl bg-palm-600 py-2 text-xs font-bold cursor-pointer">
                  🕶️ Marché Noir : Fausses Plaques (35 000 F)
                </button>
              )}
            </div>
          )}

          {/* BANQUE, PRÊTS & TONTINE MULTIJOUEUR */}
          {activeApp === 'bank' && (
            <div className="flex flex-col gap-3">
              <AppHeader title={s.bank} onBack={() => setActiveApp('home')} />

              <div className="rounded-xl bg-cream-100 p-3.5 border border-palm-400/40 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">{s.cash} :</span>
                  <span className="tabular-nums font-bold text-palm-600">{Math.round(playerState.cash).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">{s.bankBalance} :</span>
                  <span className="tabular-nums font-bold text-lagoon-600">{Math.round(playerState.bankCash).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">{s.debtLabel} :</span>
                  <span className="tabular-nums font-bold text-coral-600">{Math.round(playerState.debt).toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onDepositBank(25000)} className="rounded-lg bg-palm-600 hover:bg-palm-600 py-2 text-xs font-bold cursor-pointer">
                  Déposer 25 000 F
                </button>
                <button type="button" onClick={() => onWithdrawBank(25000)} className="rounded-lg bg-lagoon-600 hover:bg-lagoon-600 py-2 text-xs font-bold cursor-pointer">
                  Retirer 25 000 F
                </button>
                <button type="button" onClick={() => onTakeLoan(100000)} className="rounded-lg bg-sun-600 hover:bg-sun-500 py-2 text-xs font-bold text-white cursor-pointer">
                  Emprunter 100 000 F
                </button>
                <button type="button" onClick={() => onRepayDebt(50000)} className="rounded-lg bg-cream-200 hover:bg-cream-200 border border-cream-200 py-2 text-xs font-bold cursor-pointer">
                  Rembourser 50k Dette
                </button>
              </div>

              {/* SERVER-AUTHORITATIVE NON-NPC TONTINE */}
              <div className="rounded-xl bg-cream-100 p-3.5 border border-cream-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink-800">🤝 Tontine Live d’Abidjan</span>
                  <span className="text-xs tabular-nums text-sun-600">
                    Pot: {(tontineSnapshot?.currentPot ?? 0).toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="text-xs text-ink-600">
                  Tour #{tontineSnapshot?.roundNumber ?? 1} · {tontineSnapshot?.participants.length ?? 0} joueur(s) réel(s) · Mise : 50 000 F
                </div>
                <div className="text-xs text-ink-600">
                  Minimum 2 joueurs connectés requis pour déclencher le versement (0 faux PNJ).
                </div>
                {tontineError && (
                  <div className="rounded-lg bg-coral-400/15 border border-coral-400/40 px-2.5 py-1 text-xs text-coral-600 font-semibold">
                    {tontineError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={onJoinTontine} className="flex-1 rounded-lg bg-cream-200 hover:bg-cream-200 py-1.5 text-xs font-bold cursor-pointer">
                    Rejoindre
                  </button>
                  <button type="button" onClick={onContributeTontine} className="flex-1 rounded-lg bg-palm-600 hover:bg-palm-500 py-1.5 text-xs font-bold cursor-pointer">
                    Cotiser 50 000 F
                  </button>
                </div>
                {(tontineSnapshot?.currentPot ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={onFleeTontine}
                    className="w-full rounded-lg bg-coral-600 hover:bg-coral-600 py-1.5 text-xs font-bold uppercase cursor-pointer"
                  >
                    🚨 Fuir avec la caisse (Scandale +3 ★ Police)
                  </button>
                )}
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

          {/* BABI CRIBS + CONTRÔLE D'ACCÈS MAISON */}
          {activeApp === 'crib' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.crib} onBack={() => setActiveApp('home')} />
              <div className="text-xs text-ink-600">{playerState.destiny.housing}</div>

              {visitingNeighbor && (
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="w-full rounded-xl bg-lagoon-600 hover:bg-lagoon-500 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DoorOpen className="h-4 w-4" />
                  Rentrer chez moi (quitter chez {visitingNeighbor})
                </button>
              )}

              {/* PORTE / ACCÈS MAISON */}
              <div className="rounded-xl bg-cream-100 p-2.5 border border-cream-200 space-y-1.5">
                <div className="text-xs font-bold uppercase text-plum-500">Porte & Visiteurs Multijoueur</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'open', label: 'Ouverte' },
                      { id: 'friends', label: 'Frapper' },
                      { id: 'closed', label: 'Fermée' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeHomeAccess(opt.id)}
                      className={`rounded-lg py-1.5 text-xs font-bold border cursor-pointer ${
                        playerState.homeAccess === opt.id
                          ? 'bg-plum-500 border-plum-400/60 text-white'
                          : 'bg-cream-50 border-cream-200 text-ink-600 hover:text-ink-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={onSleepHome} className="rounded-lg bg-plum-500 hover:bg-plum-500 py-1.5 text-xs font-bold cursor-pointer">
                  🛏️ Dormir
                </button>
                <button type="button" onClick={onShowerHome} className="rounded-lg bg-lagoon-600 hover:bg-lagoon-600 py-1.5 text-xs font-bold cursor-pointer">
                  🚿 Douche
                </button>
                <button type="button" onClick={onToiletHome} className="rounded-lg bg-cream-200 hover:bg-cream-200 py-1.5 text-xs font-bold cursor-pointer">
                  🚽 Toilettes
                </button>
              </div>

              {(Object.keys(CRIB_UPGRADE_PRICES) as Array<'splitClim' | 'bafflesMaquis' | 'tv4k' | 'canapeCuir'>).map((key) => {
                const up = CRIB_UPGRADE_PRICES[key];
                const isOwned = playerState.cribUpgrades[key];
                return (
                  <div key={key} className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-ink-800 truncate">{up.name}</div>
                      <div className="text-xs text-ink-600">{up.desc}</div>
                    </div>
                    {isOwned ? (
                      <span className="text-xs font-bold text-palm-600 shrink-0">Installé</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpgradeCrib(key)}
                        className="shrink-0 rounded-lg bg-plum-500 hover:bg-plum-500 px-2 py-1 text-xs font-bold text-white cursor-pointer"
                      >
                        {up.cost.toLocaleString('fr-FR')} F
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* BABI CHAT MULTIJOUEUR + MUTE / SIGNALER */}
          {activeApp === 'social' && (
            <div className="flex flex-col gap-2.5 h-full">
              <AppHeader title="Babi Chat Multijoueur" onBack={() => setActiveApp('home')} />

              {remotePlayers.length > 0 && (
                <div className="rounded-xl bg-cream-100 p-2.5 border border-palm-400/40 space-y-2">
                  <div className="text-xs font-bold uppercase text-palm-600">Joueurs en ligne</div>
                  {remotePlayers.map((rp) => (
                    <div key={rp.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-ink-800 truncate">{rp.name}</div>
                        <div className="text-xs text-ink-600 truncate">{rp.destinyName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onVisitNeighbor(rp.id)}
                        className="shrink-0 px-2 py-1 rounded bg-plum-500 hover:bg-plum-500 text-xs font-bold cursor-pointer"
                      >
                        🏠 Visiter
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 rounded-xl bg-cream-100 border border-cream-200 p-2.5 space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-xs text-ink-400 text-center py-6">
                    Aucun message pour l’instant. Passe le bonjour à Babi !
                  </div>
                )}
                {chatMessages.map((m) => {
                  const isOwn = m.senderId === playerState.playerId;
                  const muted = isSenderMuted(m.senderId);
                  return (
                    <div key={m.id} className="text-xs border-b border-cream-200 pb-1.5 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sun-600 font-bold">{m.senderName}</span>
                          <span className="text-ink-400 text-xs ml-1">{m.time}</span>
                        </div>
                        {!isOwn && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onToggleMuteSender(m.senderId);
                                setMuteTick((v) => v + 1);
                              }}
                              title={muted ? 'Réactiver ce joueur' : 'Masquer ce joueur'}
                              className="rounded bg-cream-200 hover:bg-cream-200 px-1.5 py-0.5 text-xs text-ink-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              {muted ? <Volume2 className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
                              <span>{muted ? 'Unmute' : 'Mute'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(reportedIds[m.id])}
                              onClick={() => {
                                onReportChat(m.id, m.senderId);
                                setReportedIds((prev) => ({ ...prev, [m.id]: true }));
                              }}
                              title="Signaler ce message"
                              className="rounded bg-cream-200 hover:bg-coral-400/15 disabled:opacity-50 px-1.5 py-0.5 text-xs text-coral-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Flag className="h-2.5 w-2.5" />
                              <span>{reportedIds[m.id] ? 'Signalé' : 'Signaler'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-ink-600 mt-0.5">{muted ? '[Message masqué]' : m.text}</div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Écrire à Abidjan..."
                  className="flex-1 rounded-lg bg-cream-100 border border-cream-200 px-3 py-2 text-xs text-ink-800 focus:border-sun-400/60 focus:outline-none"
                />
                <button type="submit" aria-label="Envoyer" className="rounded-lg bg-sun-500 px-3 py-2 text-white font-bold cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
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
