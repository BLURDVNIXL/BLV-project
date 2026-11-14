import React, { useState } from 'react';
import {
  X,
  CreditCard,
  UtensilsCrossed,
  MapPin,
  Heart,
  Shirt,
  GraduationCap,
  Radio,
  Home,
  Briefcase,
  MessageSquare,
  ShieldCheck,
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
  AcademicBadge,
  CareerJob,
  RemotePlayer,
  SapeOutfitId,
  HomeAccessMode,
} from '../types/game';
import {
  ABIDJAN_GPS_ZONES,
  IVORIAN_FOODS,
  RADIO_STATIONS,
  ACADEMIC_BADGES,
  CAREERS,
  SAPE_OUTFITS,
  CRIB_UPGRADE_PRICES,
} from '../core/destinies';
import { getMissionForDestiny } from '../core/missions';
import { formatGameTime } from '../core/simulation';
import { t } from '../core/i18n';
import { ChatMessage, ServerTontineSnapshot } from '../network/multiplayerClient';
import { RadioPlayStatus } from '../audio/radioManager';

interface BabiOSPhoneProps {
  playerState: PlayerState;
  remotePlayers: RemotePlayer[];
  tontineSnapshot: ServerTontineSnapshot | null;
  tontineError: string | null;
  chatMessages: ChatMessage[];
  radioStatus: RadioPlayStatus;
  pendingOutgoingConsent: {
    requestId: string;
    toPlayerId: string;
    partnerName: string;
    kind: 'woohoo' | 'marriage';
  } | null;
  visitingNeighbor: string | null;
  isSenderMuted: (senderId: string) => boolean;
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
  onWooHoo: (partnerName: string) => void;
  onMarry: (partnerName: string) => void;
  onRequestRemoteConsent: (targetId: string, partnerName: string, kind: 'woohoo' | 'marriage') => void;
  onCancelConsent: (requestId: string) => void;
  onVisitNeighbor: (ownerId: string) => void;
  onReturnHome: () => void;
  onChangeHomeAccess: (mode: HomeAccessMode) => void;
  onStartSchoolExam: (badge: AcademicBadge) => void;
  onBuyOrEquipOutfit: (outfit: SapeOutfitId) => void;
  onChangeRadio: (radioId: string) => void;
  onUpgradeCrib: (upgradeKey: 'splitClim' | 'bafflesMaquis' | 'tv4k' | 'canapeCuir') => void;
  onSleepHome: () => void;
  onShowerHome: () => void;
  onToiletHome: () => void;
  onDoJob: (job: CareerJob) => void;
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
  | 'romance'
  | 'sape'
  | 'schools'
  | 'radio'
  | 'crib'
  | 'jobs'
  | 'social';

export const BabiOSPhone: React.FC<BabiOSPhoneProps> = ({
  playerState,
  remotePlayers,
  tontineSnapshot,
  tontineError,
  chatMessages,
  radioStatus,
  pendingOutgoingConsent,
  visitingNeighbor,
  isSenderMuted,
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
  onWooHoo,
  onMarry,
  onRequestRemoteConsent,
  onCancelConsent,
  onVisitNeighbor,
  onReturnHome,
  onChangeHomeAccess,
  onStartSchoolExam,
  onBuyOrEquipOutfit,
  onChangeRadio,
  onUpgradeCrib,
  onSleepHome,
  onShowerHome,
  onToiletHome,
  onDoJob,
  onSendChat,
  onReportChat,
  onToggleMuteSender,
  onDonateYannis,
  onClearPoliceNetwork,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('home');
  const [consentRequest, setConsentRequest] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [reportedIds, setReportedIds] = useState<Record<string, boolean>>({});
  const [, setMuteTick] = useState(0);

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
                <AppIcon label="Missions" icon={<Target className="h-5 w-5 text-sun-600" />} color="bg-sun-300/35 border-sun-400/40" onClick={() => setActiveApp('missions')} />
                <AppIcon label={s.bank} icon={<CreditCard className="h-5 w-5 text-palm-600" />} color="bg-palm-400/15 border-palm-400/40" onClick={() => setActiveApp('bank')} />
                <AppIcon label={s.eats} icon={<UtensilsCrossed className="h-5 w-5 text-sun-600" />} color="bg-sun-300/35 border-sun-400/40" onClick={() => setActiveApp('eats')} />
                <AppIcon label={s.gps} icon={<MapPin className="h-5 w-5 text-lagoon-600" />} color="bg-lagoon-400/15 border-lagoon-400/40" onClick={() => setActiveApp('gps')} />
                <AppIcon label={s.romance} icon={<Heart className="h-5 w-5 text-coral-600" />} color="bg-coral-400/15 border-coral-400/40" onClick={() => setActiveApp('romance')} />
                <AppIcon label={s.sape} icon={<Shirt className="h-5 w-5 text-plum-500" />} color="bg-plum-500/10 border-plum-400/40" onClick={() => setActiveApp('sape')} />
                <AppIcon label={s.schools} icon={<GraduationCap className="h-5 w-5 text-sun-600" />} color="bg-sun-300/35 border-sun-400/40" onClick={() => setActiveApp('schools')} />
                <AppIcon label={s.radio} icon={<Radio className="h-5 w-5 text-lagoon-600" />} color="bg-lagoon-400/15 border-lagoon-400/40" onClick={() => setActiveApp('radio')} />
                <AppIcon label={s.crib} icon={<Home className="h-5 w-5 text-plum-500" />} color="bg-plum-500/10 border-plum-400/40" onClick={() => setActiveApp('crib')} />
                <AppIcon label={s.jobs} icon={<Briefcase className="h-5 w-5 text-sun-600" />} color="bg-sun-300/35 border-sun-400/40" onClick={() => setActiveApp('jobs')} />
                <AppIcon label="Babi Chat" icon={<MessageSquare className="h-5 w-5 text-palm-600" />} color="bg-palm-400/15 border-palm-400/40" onClick={() => setActiveApp('social')} />
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

          {/* GPS ABIDJAN (COMMUNES PROJETÉES RÉELLES, 1500 FCFA) */}
          {activeApp === 'gps' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.gps} onBack={() => setActiveApp('home')} />
              <div className="text-xs text-ink-600">
                Taxi Express Inter-Communes : <strong className="text-sun-600">1 500 FCFA</strong>
              </div>
              {ABIDJAN_GPS_ZONES.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onFastTravel(loc.x, loc.z, loc.name, loc.id)}
                  className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200 hover:border-lagoon-400/60 text-left cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-ink-800 truncate">{loc.name}</div>
                    <div className="text-xs text-ink-600 truncate">{loc.desc}</div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-lagoon-400/20 px-2 py-1 text-xs font-bold text-lagoon-600">
                    1 500 F
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ROMANCE, CONSENTEMENT BILATÉRAL & VISITES VOISINS */}
          {activeApp === 'romance' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.romance} onBack={() => setActiveApp('home')} />

              {pendingOutgoingConsent && (
                <div className="rounded-xl bg-sun-300/35 p-3 border border-sun-400/50 space-y-2">
                  <div className="text-xs font-bold text-sun-600">
                    ⏳ Demande en attente auprès de {pendingOutgoingConsent.partnerName} (
                    {pendingOutgoingConsent.kind === 'marriage' ? 'Mariage Civil' : 'Intimité Sims'})
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelConsent(pendingOutgoingConsent.requestId)}
                    className="w-full rounded-lg bg-cream-200 hover:bg-cream-200 py-1.5 text-xs font-bold text-coral-600 cursor-pointer"
                  >
                    Annuler la demande
                  </button>
                </div>
              )}

              {consentRequest && (
                <div className="rounded-xl bg-coral-400/15 p-3 border-2 border-coral-400/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-coral-600">
                    <ShieldCheck className="h-4 w-4" />
                    Consentement Mutuel Strict
                  </div>
                  <p className="text-xs text-ink-800 mt-1">
                    Confirmer l’accord mutuel avec {consentRequest} pour une intimité pudique (style Les Sims) ?
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onWooHoo(consentRequest);
                        setConsentRequest(null);
                      }}
                      className="flex-1 rounded-lg bg-coral-600 hover:bg-coral-500 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      Consentir 💖
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsentRequest(null)}
                      className="rounded-lg bg-cream-200 px-3 py-1.5 text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {remotePlayers.length > 0 && (
                <div className="rounded-xl bg-cream-100 p-2.5 border border-palm-400/40 space-y-2">
                  <div className="text-xs font-bold uppercase text-palm-600">
                    Joueurs en ligne (Handshake WS)
                  </div>
                  {remotePlayers.map((rp) => (
                    <div key={rp.id} className="flex flex-col gap-1.5 border-b border-cream-200 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink-800 truncate">{rp.name}</span>
                        <span className="text-xs text-ink-600">{rp.destinyName}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onVisitNeighbor(rp.id)}
                          className="flex-1 px-2 py-1 rounded bg-plum-500 hover:bg-plum-500 text-xs font-bold cursor-pointer"
                        >
                          🏠 Visiter
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestRemoteConsent(rp.id, rp.name, 'woohoo')}
                          className="px-2 py-1 rounded bg-coral-600 hover:bg-coral-500 text-xs font-bold cursor-pointer"
                        >
                          Sims
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestRemoteConsent(rp.id, rp.name, 'marriage')}
                          className="px-2 py-1 rounded bg-sun-600 hover:bg-sun-500 text-xs font-bold cursor-pointer"
                        >
                          Marier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {['Awa (Marcory)', 'Affoué (Plateau)', 'Kouadio (Adjamé)', 'Franck (Yopougon)'].map((name) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200">
                  <div className="text-xs font-bold text-ink-800">{name}</div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConsentRequest(name)}
                      className="rounded-lg bg-coral-400/25 border border-coral-400/50 px-2 py-1 text-xs font-bold text-coral-600 cursor-pointer"
                    >
                      Intimité
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarry(name)}
                      className="rounded-lg bg-sun-300/40 border border-sun-400/50 px-2 py-1 text-xs font-bold text-sun-600 cursor-pointer"
                    >
                      Marier (150k)
                    </button>
                  </div>
                </div>
              ))}
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

          {/* LYCÉES ÉLITE */}
          {activeApp === 'schools' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.schools} onBack={() => setActiveApp('home')} />
              {ACADEMIC_BADGES.map((badge) => {
                const isUnlocked = playerState.activeBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`rounded-xl p-3 border ${isUnlocked ? 'bg-cream-100 border-palm-400/60' : 'bg-cream-100 border-cream-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink-800">{badge.title}</span>
                      {isUnlocked ? (
                        <span className="rounded bg-palm-400/20 px-2 py-0.5 text-xs font-bold text-palm-600">Obtenu</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartSchoolExam(badge.id)}
                          className="rounded-lg bg-sun-500 hover:bg-sun-400 px-2.5 py-1 text-xs font-bold text-white cursor-pointer"
                        >
                          Passer le Concours
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-sun-600 mt-0.5">{badge.school}</div>
                    <div className="text-xs text-palm-600 mt-1">{badge.perks}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RADIO FM */}
          {activeApp === 'radio' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.radio} onBack={() => setActiveApp('home')} />
              <div className="text-xs text-ink-600">
                Statut audio : <strong className="text-palm-600 uppercase">{radioStatus}</strong>
              </div>
              {RADIO_STATIONS.map((station) => {
                const isActive = playerState.activeRadioId === station.id;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => onChangeRadio(station.id)}
                    className={`flex items-center justify-between rounded-xl p-3 border text-left cursor-pointer ${
                      isActive ? 'bg-lagoon-400/15 border-lagoon-400/60 text-ink-800' : 'bg-cream-100 border-cream-200 text-ink-600'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-ink-800">{station.name}</div>
                      <div className="text-xs text-lagoon-600 tabular-nums">{station.freq}</div>
                      <div className="text-xs text-ink-600">{station.genre}</div>
                    </div>
                    {isActive && <span className="text-xs font-bold text-palm-600">ON AIR</span>}
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

          {/* MÉTIERS, FACTIONS & POUVOIRS DE DESTIN */}
          {activeApp === 'jobs' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.jobs} onBack={() => setActiveApp('home')} />

              <div className="rounded-xl bg-cream-100 p-2.5 border border-cream-200 space-y-1 text-xs">
                <div className="font-bold text-sun-600 uppercase">Réputation Factions</div>
                <div className="flex justify-between"><span>🚌 Syndicat Transporteurs</span><span className="tabular-nums">{playerState.factions.syndicat}/100</span></div>
                <div className="flex justify-between"><span>🏛️ Ordre Républicain</span><span className="tabular-nums">{playerState.factions.ordre}/100</span></div>
                <div className="flex justify-between"><span>✨ Jet-Set Showbiz</span><span className="tabular-nums">{playerState.factions.jetset}/100</span></div>
              </div>

              {CAREERS.filter((j) => {
                if (j.requiredFlag === 'plccTarget' && !playerState.destiny.plccTarget) return false;
                if (j.requiredFlag === 'shadowBaron' && !playerState.destiny.shadowBaron) return false;
                return true;
              }).map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-xl bg-cream-100 p-2.5 border border-cream-200">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-ink-800 truncate">{job.title}</div>
                    <div className="text-xs text-ink-600">{job.district} · -{job.energyCost}% ⚡</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDoJob(job)}
                    className="shrink-0 rounded-lg bg-palm-600 hover:bg-palm-500 px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    +{job.basePay.toLocaleString('fr-FR')} F
                  </button>
                </div>
              ))}

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

          {/* BABI CHAT MULTIJOUEUR + MUTE / SIGNALER */}
          {activeApp === 'social' && (
            <div className="flex flex-col gap-2.5 h-full">
              <AppHeader title="Babi Chat Multijoueur" onBack={() => setActiveApp('home')} />
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
  color: string;
  onClick: () => void;
}> = ({ label, icon, color, onClick }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer">
    <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${color}`}>{icon}</div>
    <span className="text-xs font-semibold text-ink-600 truncate max-w-full">{label}</span>
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
