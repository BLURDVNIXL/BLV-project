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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/85">
      <div className="relative flex flex-col h-[min(630px,calc(100dvh-16px))] w-[min(360px,calc(100vw-16px))] md:h-[min(670px,calc(100dvh-32px))] md:w-[390px] rounded-[28px] md:rounded-[36px] bg-slate-950 border-[4px] md:border-[5px] border-slate-700 shadow-2xl overflow-hidden text-white">
        {/* TOP STATUS BAR */}
        <div className="relative shrink-0 flex items-center justify-between px-5 pt-2.5 pb-2 text-[11px] font-bold text-slate-300 bg-slate-900">
          <span className="font-mono">{formatGameTime(playerState.gameTimeHours)}</span>
          <span className="text-[10px] font-mono text-amber-400">BabiOS 26</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-emerald-400" />
            <Battery className="h-3.5 w-3.5 text-slate-300" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer BabiOS"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          {activeApp === 'home' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 border border-amber-500/30">
                <div className="text-[10px] uppercase font-bold text-amber-400">{playerState.destiny.district}</div>
                <div className="text-sm font-black text-white mt-0.5">{playerState.destiny.name}</div>
                <div className="flex items-center justify-between text-xs mt-1.5 font-mono">
                  <span className="text-emerald-400 font-bold">{Math.round(playerState.cash).toLocaleString('fr-FR')} F</span>
                  <span className="text-cyan-400">{s.bankBalance}: {Math.round(playerState.bankCash).toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              {/* ACTIVE MISSION SUMMARY TILE */}
              <button
                type="button"
                onClick={() => setActiveApp('missions')}
                className="rounded-2xl bg-amber-950/50 hover:bg-amber-950/80 p-3 border border-amber-500/40 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-400">
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Mission : {mission.title}
                  </span>
                  <span>{playerState.activeMission.completed ? '🏆 3/3' : `${activeStepIdx + 1}/${mission.steps.length}`}</span>
                </div>
                <div className="text-[11px] font-bold text-white mt-0.5 truncate">
                  {playerState.activeMission.completed ? `Trophée : ${mission.finalTrophy}` : activeStep.title}
                </div>
              </button>

              <div className="grid grid-cols-4 gap-2.5">
                <AppIcon label="Missions" icon={<Target className="h-5 w-5 text-amber-400" />} color="bg-amber-950 border-amber-500/40" onClick={() => setActiveApp('missions')} />
                <AppIcon label={s.bank} icon={<CreditCard className="h-5 w-5 text-emerald-400" />} color="bg-emerald-950 border-emerald-500/40" onClick={() => setActiveApp('bank')} />
                <AppIcon label={s.eats} icon={<UtensilsCrossed className="h-5 w-5 text-orange-400" />} color="bg-orange-950 border-orange-500/40" onClick={() => setActiveApp('eats')} />
                <AppIcon label={s.gps} icon={<MapPin className="h-5 w-5 text-cyan-400" />} color="bg-cyan-950 border-cyan-500/40" onClick={() => setActiveApp('gps')} />
                <AppIcon label={s.romance} icon={<Heart className="h-5 w-5 text-rose-400" />} color="bg-rose-950 border-rose-500/40" onClick={() => setActiveApp('romance')} />
                <AppIcon label={s.sape} icon={<Shirt className="h-5 w-5 text-fuchsia-400" />} color="bg-fuchsia-950 border-fuchsia-500/40" onClick={() => setActiveApp('sape')} />
                <AppIcon label={s.schools} icon={<GraduationCap className="h-5 w-5 text-amber-400" />} color="bg-amber-950 border-amber-500/40" onClick={() => setActiveApp('schools')} />
                <AppIcon label={s.radio} icon={<Radio className="h-5 w-5 text-sky-400" />} color="bg-sky-950 border-sky-500/40" onClick={() => setActiveApp('radio')} />
                <AppIcon label={s.crib} icon={<Home className="h-5 w-5 text-indigo-400" />} color="bg-indigo-950 border-indigo-500/40" onClick={() => setActiveApp('crib')} />
                <AppIcon label={s.jobs} icon={<Briefcase className="h-5 w-5 text-yellow-400" />} color="bg-yellow-950 border-yellow-500/40" onClick={() => setActiveApp('jobs')} />
                <AppIcon label="Babi Chat" icon={<MessageSquare className="h-5 w-5 text-teal-400" />} color="bg-teal-950 border-teal-500/40" onClick={() => setActiveApp('social')} />
              </div>

              {/* RECENT LOGS */}
              <div className="rounded-2xl bg-slate-900 p-3 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Journal d’Abidjan</div>
                <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                  {playerState.logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="text-[11px] leading-snug border-b border-slate-800 pb-1 last:border-0">
                      <span className="font-mono font-bold text-amber-400 mr-1.5">{log.time}</span>
                      <span className="text-slate-200">{log.message}</span>
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
              <div className="rounded-xl bg-slate-900 p-3.5 border border-amber-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase">{mission.title}</span>
                  {playerState.activeMission.completed && <Trophy className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">{mission.summary}</p>
                <div className="text-[10px] font-bold text-emerald-400">
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
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : current
                        ? 'bg-amber-950/40 border-amber-400'
                        : 'bg-slate-900 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        {index + 1}. {step.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          done
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : current
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {done ? 'Validée' : current ? 'En cours' : 'À venir'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">{step.description}</p>
                    <div className="flex items-center justify-between text-[10px] mt-1.5 font-mono">
                      <span className="text-cyan-400">📍 {step.targetDistrictName}</span>
                      <span className="text-emerald-400">
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

              <div className="rounded-xl bg-slate-900 p-3.5 border border-emerald-500/40 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{s.cash} :</span>
                  <span className="font-mono font-bold text-emerald-400">{Math.round(playerState.cash).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{s.bankBalance} :</span>
                  <span className="font-mono font-bold text-cyan-400">{Math.round(playerState.bankCash).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{s.debtLabel} :</span>
                  <span className="font-mono font-bold text-rose-400">{Math.round(playerState.debt).toLocaleString('fr-FR')} F</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onDepositBank(25000)} className="rounded-lg bg-emerald-700 hover:bg-emerald-600 py-2 text-[11px] font-bold cursor-pointer">
                  Déposer 25 000 F
                </button>
                <button type="button" onClick={() => onWithdrawBank(25000)} className="rounded-lg bg-cyan-700 hover:bg-cyan-600 py-2 text-[11px] font-bold cursor-pointer">
                  Retirer 25 000 F
                </button>
                <button type="button" onClick={() => onTakeLoan(100000)} className="rounded-lg bg-amber-600 hover:bg-amber-500 py-2 text-[11px] font-bold text-slate-950 cursor-pointer">
                  Emprunter 100 000 F
                </button>
                <button type="button" onClick={() => onRepayDebt(50000)} className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 py-2 text-[11px] font-bold cursor-pointer">
                  Rembourser 50k Dette
                </button>
              </div>

              {/* SERVER-AUTHORITATIVE NON-NPC TONTINE */}
              <div className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">🤝 Tontine Live d’Abidjan</span>
                  <span className="text-[10px] font-mono text-amber-400">
                    Pot: {(tontineSnapshot?.currentPot ?? 0).toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Tour #{tontineSnapshot?.roundNumber ?? 1} · {tontineSnapshot?.participants.length ?? 0} joueur(s) réel(s) · Mise : 50 000 F
                </div>
                <div className="text-[9px] text-slate-400">
                  Minimum 2 joueurs connectés requis pour déclencher le versement (0 faux PNJ).
                </div>
                {tontineError && (
                  <div className="rounded-lg bg-rose-950/70 border border-rose-500/40 px-2.5 py-1 text-[10px] text-rose-300 font-semibold">
                    {tontineError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={onJoinTontine} className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-[11px] font-bold cursor-pointer">
                    Rejoindre
                  </button>
                  <button type="button" onClick={onContributeTontine} className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 text-[11px] font-bold cursor-pointer">
                    Cotiser 50 000 F
                  </button>
                </div>
                {(tontineSnapshot?.currentPot ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={onFleeTontine}
                    className="w-full rounded-lg bg-rose-700 hover:bg-rose-600 py-1.5 text-[10px] font-bold uppercase cursor-pointer"
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
                <div key={food.id} className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">{food.icon}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{food.name}</div>
                      <div className="text-[10px] text-amber-400">{food.buffName}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEatFood(food.id)}
                    className="shrink-0 rounded-lg bg-orange-600 hover:bg-orange-500 px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
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
              <div className="text-[11px] text-slate-400">
                Taxi Express Inter-Communes : <strong className="text-amber-400">1 500 FCFA</strong>
              </div>
              {ABIDJAN_GPS_ZONES.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onFastTravel(loc.x, loc.z, loc.name, loc.id)}
                  className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5 border border-slate-800 hover:border-cyan-400 text-left cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-white truncate">{loc.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{loc.desc}</div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-400">
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
                <div className="rounded-xl bg-amber-950/60 p-3 border border-amber-500/50 space-y-2">
                  <div className="text-[11px] font-bold text-amber-300">
                    ⏳ Demande en attente auprès de {pendingOutgoingConsent.partnerName} (
                    {pendingOutgoingConsent.kind === 'marriage' ? 'Mariage Civil' : 'Intimité Sims'})
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelConsent(pendingOutgoingConsent.requestId)}
                    className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-[10px] font-bold text-rose-300 cursor-pointer"
                  >
                    Annuler la demande
                  </button>
                </div>
              )}

              {consentRequest && (
                <div className="rounded-xl bg-rose-950 p-3 border-2 border-rose-500">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-300">
                    <ShieldCheck className="h-4 w-4" />
                    Consentement Mutuel Strict
                  </div>
                  <p className="text-[11px] text-white mt-1">
                    Confirmer l’accord mutuel avec {consentRequest} pour une intimité pudique (style Les Sims) ?
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onWooHoo(consentRequest);
                        setConsentRequest(null);
                      }}
                      className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      Consentir 💖
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsentRequest(null)}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {remotePlayers.length > 0 && (
                <div className="rounded-xl bg-slate-900 p-2.5 border border-emerald-500/40 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-emerald-400">
                    Joueurs en ligne (Handshake WS)
                  </div>
                  {remotePlayers.map((rp) => (
                    <div key={rp.id} className="flex flex-col gap-1.5 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">{rp.name}</span>
                        <span className="text-[10px] text-slate-400">{rp.destinyName}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onVisitNeighbor(rp.id)}
                          className="flex-1 px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-[10px] font-bold cursor-pointer"
                        >
                          🏠 Visiter
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestRemoteConsent(rp.id, rp.name, 'woohoo')}
                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold cursor-pointer"
                        >
                          Sims
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestRemoteConsent(rp.id, rp.name, 'marriage')}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[10px] font-bold cursor-pointer"
                        >
                          Marier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {['Awa (Marcory)', 'Affoué (Plateau)', 'Kouadio (Adjamé)', 'Franck (Yopougon)'].map((name) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <div className="text-xs font-bold text-white">{name}</div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConsentRequest(name)}
                      className="rounded-lg bg-rose-600/30 border border-rose-500/50 px-2 py-1 text-[10px] font-bold text-rose-300 cursor-pointer"
                    >
                      Intimité
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarry(name)}
                      className="rounded-lg bg-amber-600/30 border border-amber-500/50 px-2 py-1 text-[10px] font-bold text-amber-300 cursor-pointer"
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
                      equipped ? 'bg-fuchsia-950 border-fuchsia-400' : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{outfit.icon}</span>
                        <span className="truncate">{outfit.name}</span>
                      </div>
                      <div className="text-[10px] text-fuchsia-300">{outfit.perk}</div>
                    </div>
                    {equipped ? (
                      <CheckCircle className="h-4 w-4 text-fuchsia-400 shrink-0" />
                    ) : (
                      <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-amber-400">
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
                    className={`rounded-xl p-3 border ${isUnlocked ? 'bg-slate-900 border-emerald-500' : 'bg-slate-900 border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{badge.title}</span>
                      {isUnlocked ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Obtenu</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartSchoolExam(badge.id)}
                          className="rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-950 cursor-pointer"
                        >
                          Passer le Concours
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-amber-400 mt-0.5">{badge.school}</div>
                    <div className="text-[10px] text-emerald-300 mt-1">{badge.perks}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RADIO FM */}
          {activeApp === 'radio' && (
            <div className="flex flex-col gap-2">
              <AppHeader title={s.radio} onBack={() => setActiveApp('home')} />
              <div className="text-[10px] text-slate-400">
                Statut audio : <strong className="text-emerald-400 uppercase">{radioStatus}</strong>
              </div>
              {RADIO_STATIONS.map((station) => {
                const isActive = playerState.activeRadioId === station.id;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => onChangeRadio(station.id)}
                    className={`flex items-center justify-between rounded-xl p-3 border text-left cursor-pointer ${
                      isActive ? 'bg-sky-950 border-sky-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{station.name}</div>
                      <div className="text-[10px] text-sky-400 font-mono">{station.freq}</div>
                      <div className="text-[9px] text-slate-400">{station.genre}</div>
                    </div>
                    {isActive && <span className="text-[10px] font-bold text-emerald-400">ON AIR</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* BABI CRIBS + CONTRÔLE D'ACCÈS MAISON */}
          {activeApp === 'crib' && (
            <div className="flex flex-col gap-2.5">
              <AppHeader title={s.crib} onBack={() => setActiveApp('home')} />
              <div className="text-[11px] text-slate-300">{playerState.destiny.housing}</div>

              {visitingNeighbor && (
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2 text-xs font-black text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DoorOpen className="h-4 w-4" />
                  Rentrer chez moi (quitter chez {visitingNeighbor})
                </button>
              )}

              {/* PORTE / ACCÈS MAISON */}
              <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-indigo-300">Porte & Visiteurs Multijoueur</div>
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
                      className={`rounded-lg py-1.5 text-[10px] font-bold border cursor-pointer ${
                        playerState.homeAccess === opt.id
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={onSleepHome} className="rounded-lg bg-indigo-700 hover:bg-indigo-600 py-1.5 text-[10px] font-bold cursor-pointer">
                  🛏️ Dormir
                </button>
                <button type="button" onClick={onShowerHome} className="rounded-lg bg-sky-700 hover:bg-sky-600 py-1.5 text-[10px] font-bold cursor-pointer">
                  🚿 Douche
                </button>
                <button type="button" onClick={onToiletHome} className="rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-[10px] font-bold cursor-pointer">
                  🚽 Toilettes
                </button>
              </div>

              {(Object.keys(CRIB_UPGRADE_PRICES) as Array<'splitClim' | 'bafflesMaquis' | 'tv4k' | 'canapeCuir'>).map((key) => {
                const up = CRIB_UPGRADE_PRICES[key];
                const isOwned = playerState.cribUpgrades[key];
                return (
                  <div key={key} className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">{up.name}</div>
                      <div className="text-[9px] text-slate-400">{up.desc}</div>
                    </div>
                    {isOwned ? (
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">Installé</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpgradeCrib(key)}
                        className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2 py-1 text-[10px] font-bold text-white cursor-pointer"
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

              <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800 space-y-1 text-[10px]">
                <div className="font-bold text-amber-400 uppercase">Réputation Factions</div>
                <div className="flex justify-between"><span>🚌 Syndicat Transporteurs</span><span className="font-mono">{playerState.factions.syndicat}/100</span></div>
                <div className="flex justify-between"><span>🏛️ Ordre Républicain</span><span className="font-mono">{playerState.factions.ordre}/100</span></div>
                <div className="flex justify-between"><span>✨ Jet-Set Showbiz</span><span className="font-mono">{playerState.factions.jetset}/100</span></div>
              </div>

              {CAREERS.filter((j) => {
                if (j.requiredFlag === 'plccTarget' && !playerState.destiny.plccTarget) return false;
                if (j.requiredFlag === 'shadowBaron' && !playerState.destiny.shadowBaron) return false;
                return true;
              }).map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{job.title}</div>
                    <div className="text-[9px] text-slate-400">{job.district} · -{job.energyCost}% ⚡</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDoJob(job)}
                    className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-[10px] font-bold cursor-pointer"
                  >
                    +{job.basePay.toLocaleString('fr-FR')} F
                  </button>
                </div>
              ))}

              {playerState.destiny.realMadridSuperstar && (
                <button type="button" onClick={onDonateYannis} className="rounded-xl bg-sky-700 hover:bg-sky-600 py-2 text-xs font-bold cursor-pointer">
                  ⚽ Financer Académie Yannis Diomandé (500 000 F)
                </button>
              )}
              {playerState.destiny.secretAddressBook && playerState.policeWanted > 0 && (
                <button type="button" onClick={() => onClearPoliceNetwork(false)} className="rounded-xl bg-amber-600 py-2 text-xs font-bold text-slate-950 cursor-pointer">
                  📞 Carnet d’Adresses : Annuler ★ Police
                </button>
              )}
              {playerState.destiny.blackMarketAccess && (
                <button type="button" onClick={() => onClearPoliceNetwork(true)} className="rounded-xl bg-teal-700 py-2 text-xs font-bold cursor-pointer">
                  🕶️ Marché Noir : Fausses Plaques (35 000 F)
                </button>
              )}
            </div>
          )}

          {/* BABI CHAT MULTIJOUEUR + MUTE / SIGNALER */}
          {activeApp === 'social' && (
            <div className="flex flex-col gap-2.5 h-full">
              <AppHeader title="Babi Chat Multijoueur" onBack={() => setActiveApp('home')} />
              <div className="flex-1 rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-[11px] text-slate-500 text-center py-6">
                    Aucun message pour l’instant. Passe le bonjour à Babi !
                  </div>
                )}
                {chatMessages.map((m) => {
                  const isOwn = m.senderId === playerState.playerId;
                  const muted = isSenderMuted(m.senderId);
                  return (
                    <div key={m.id} className="text-[11px] border-b border-slate-800/70 pb-1.5 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-amber-400 font-bold">{m.senderName}</span>
                          <span className="text-slate-500 text-[9px] ml-1">{m.time}</span>
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
                              className="rounded bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300 flex items-center gap-0.5 cursor-pointer"
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
                              className="rounded bg-slate-800 hover:bg-rose-900/60 disabled:opacity-50 px-1.5 py-0.5 text-[9px] text-rose-300 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Flag className="h-2.5 w-2.5" />
                              <span>{reportedIds[m.id] ? 'Signalé' : 'Signaler'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-slate-200 mt-0.5">{muted ? '[Message masqué]' : m.text}</div>
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
                  className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <button type="submit" aria-label="Envoyer" className="rounded-lg bg-amber-500 px-3 py-2 text-slate-950 font-bold cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* HOME BAR */}
        <div className="shrink-0 flex justify-center py-2 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveApp('home')}
            className="h-1.5 w-28 rounded-full bg-slate-600 hover:bg-white cursor-pointer"
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
    <span className="text-[10px] font-semibold text-slate-300 truncate max-w-full">{label}</span>
  </button>
);

const AppHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
    <button
      type="button"
      onClick={onBack}
      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-xs font-bold text-slate-200 cursor-pointer"
    >
      ‹ Retour
    </button>
    <span className="text-xs font-bold text-white truncate">{title}</span>
  </div>
);
