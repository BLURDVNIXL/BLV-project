import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AcademicBadge,
  CareerJob,
  ConsentPrompt,
  Destiny,
  GameScreenState,
  HomeAccessMode,
  HouseKnockPrompt,
  PlayerState,
  RemotePlayer,
  SapeOutfitId,
  WeatherType,
} from './types/game';
import {
  ALL_DESTINIES,
  IVORIAN_FOODS,
  RADIO_STATIONS,
} from './core/destinies';
import {
  addLog,
  advanceGameTime,
  buyCribUpgrade,
  buyOrEquipOutfit,
  clearPoliceViaNetwork,
  createInitialPlayerState,
  depositToBank,
  donateYannisAcademy,
  eatFood,
  evaluateMissionProgress,
  payFastTravel,
  performCareerJob,
  performCivilMarriage,
  performConsensualWooHoo,
  performLavageEtoile,
  performWorkShift,
  playLotoAkwaba,
  repayDebt,
  rollDestiny,
  setHomeAccessMode,
  sleepAtHome,
  spendCash,
  takeBankLoan,
  takeShower,
  unlockBadge,
  useToilet,
  withdrawFromBank,
} from './core/simulation';
import { DISTRICTS } from './world/abidjanGeography';
import { loadGameStateAsync, loadGameStateSync, saveGameStateAsync } from './core/storage';
import { initWasmCore } from './wasm/wasmBridge';
import { AbidjanSceneManager, CityHotspot, RadarSnapshot } from './3d/sceneManager';
import { soundEngine, RadioPlayStatus } from './audio/radioManager';
import {
  ChatMessage,
  MultiplayerClient,
  ServerTontineSnapshot,
  initServerSession,
  postEconomyAction,
} from './network/multiplayerClient';
import { TitleScreen } from './components/TitleScreen';
import { JellyButton } from './components/ui/Jelly';
import { GameHUD } from './components/GameHUD';
import { ConsoleGamepad } from './components/ConsoleGamepad';
import { useTouchControls } from './components/useTouchControls';
import { BabiOSPhone } from './components/BabiOSPhone';
import { DestinyRouletteModal } from './components/DestinyRouletteModal';
import { AdminModal } from './components/AdminModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { OrientationGuard } from './components/OrientationGuard';
import { SchoolExamModal } from './components/SchoolExamModal';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import { Play, RotateCcw, Home, ShieldCheck, DoorOpen } from 'lucide-react';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  const initialSaved = loadGameStateSync();
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(Boolean(initialSaved && !initialSaved.isGameOver));

  const [screenState, setScreenState] = useState<GameScreenState>(() => (isAutostart ? 'playing' : 'title'));
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    if (isAutostart && initialSaved && !initialSaved.isGameOver) return initialSaved;
    return createInitialPlayerState(rollDestiny());
  });

  const [currentDistrict, setCurrentDistrict] = useState<string>(playerState.destiny.district);
  const [nearbyHotspot, setNearbyHotspot] = useState<CityHotspot | null>(null);
  const [nearbyVehicle, setNearbyVehicle] = useState<{ id: string; label: string } | null>(null);

  // Modals
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeExamBadge, setActiveExamBadge] = useState<AcademicBadge | null>(null);
  const [incomingConsent, setIncomingConsent] = useState<ConsentPrompt | null>(null);
  const [pendingOutgoingConsent, setPendingOutgoingConsent] = useState<{
    requestId: string;
    toPlayerId: string;
    partnerName: string;
    kind: 'woohoo' | 'marriage';
  } | null>(null);
  const [incomingKnock, setIncomingKnock] = useState<HouseKnockPrompt | null>(null);
  const [visitingNeighbor, setVisitingNeighbor] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Audio & Settings
  const [isMuted, setIsMuted] = useState(false);
  const [radioStatus, setRadioStatus] = useState<RadioPlayStatus>('idle');
  const [forceGamepad, setForceGamepad] = useState(false);
  const touchControls = useTouchControls(forceGamepad);
  const [cameraSensitivity, setCameraSensitivity] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('blv_camera_sensitivity'));
      return Number.isFinite(v) && v >= 0.5 && v <= 2.5 ? v : 1;
    } catch {
      return 1;
    }
  });
  const handleCameraSensitivityChange = (v: number) => {
    setCameraSensitivity(v);
    try {
      localStorage.setItem('blv_camera_sensitivity', String(v));
    } catch {
      /* stockage indisponible : le réglage vaut pour la session */
    }
  };

  // Multiplayer
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [tontineSnapshot, setTontineSnapshot] = useState<ServerTontineSnapshot | null>(null);
  const [tontineError, setTontineError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<AbidjanSceneManager | null>(null);
  const mpRef = useRef<MultiplayerClient | null>(null);
  const playerStateRef = useRef<PlayerState>(playerState);
  playerStateRef.current = playerState;
  const screenStateRef = useRef<GameScreenState>(screenState);
  screenStateRef.current = screenState;

  const showToast = useCallback((msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === msg ? null : curr));
    }, 3600);
  }, []);

  const syncEconomy = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    const cur = playerStateRef.current;
    if (!cur.sessionToken) return;
    postEconomyAction(cur.playerId, cur.sessionToken, action, payload).then((serverState) => {
      if (!serverState) return;
      setPlayerState((prev) => {
        const keepHours =
          prev.daysLived === serverState.daysLived
            ? Math.max(prev.gameTimeHours, serverState.gameTimeHours)
            : serverState.daysLived > prev.daysLived
            ? serverState.gameTimeHours
            : prev.gameTimeHours;
        return {
          ...serverState,
          sessionToken: prev.sessionToken || serverState.sessionToken,
          gameTimeHours: keepHours,
        };
      });
    });
  }, []);

  const persistServerState = useCallback((st: PlayerState) => {
    if (!st.sessionToken) return;
    fetch('/api/session/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${st.sessionToken}`,
      },
      body: JSON.stringify({ playerId: st.playerId, state: st }),
    }).catch(() => {});
  }, []);

  // Sensibilité de la caméra (réglages) : réappliquée aussi quand l'état change, la scène pouvant être créée après le premier rendu.
  useEffect(() => {
    sceneRef.current?.setCameraSensitivity(cameraSensitivity);
  }, [cameraSensitivity, screenState]);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screenState;
    if (sceneRef.current) {
      sceneRef.current.setCameraMode(screenState === 'title' || screenState === 'roulette' ? 'flyover' : 'follow');
      sceneRef.current.setPaused(screenState !== 'playing');
    }
    if (screenState === 'paused' || screenState === 'gameover') {
      soundEngine.pauseForMenu();
    }
  }, [screenState]);

  // Trigger Game Over state automatically when simulation flags isGameOver
  useEffect(() => {
    if (playerState.isGameOver && screenState === 'playing') {
      setScreenState('gameover');
    }
  }, [playerState.isGameOver, screenState]);

  // Initialize WASM Core + Async IndexedDB Save Load + Server Session + Audio Status Listener
  useEffect(() => {
    initWasmCore().catch(() => {});
    soundEngine.setStatusListener((st) => setRadioStatus(st));

    let mounted = true;
    loadGameStateAsync().then(async (saved) => {
      if (!mounted) return;
      if (saved && !saved.isGameOver) {
        setHasSavedGame(true);
        if (isAutostart) {
          setPlayerState(saved);
          setCurrentDistrict(saved.destiny.district);
          sceneRef.current?.spawnPlayerAtDestiny(
            saved.destiny.spawnX,
            saved.destiny.spawnZ,
            saved.destiny.vehicle,
            saved.destiny.secondaryVehicle,
            saved.sapeOutfit,
            Boolean(saved.destiny.realMadridSuperstar),
            Boolean(saved.destiny.mysticBaraka),
            saved.destiny.homeType,
            `${saved.playerId}|${saved.destiny.id}`,
            saved.destiny.districtId
          );
          sceneRef.current?.syncCribUpgrades(saved.cribUpgrades);
        }
      }

      const seedState = saved && !saved.isGameOver ? saved : playerStateRef.current;
      const session = await initServerSession(seedState);
      if (mounted && session) {
        setPlayerState((prev) => ({
          ...prev,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
          homeLotId: session.homeLotId || prev.homeLotId,
        }));
      }
    });

    return () => {
      mounted = false;
      soundEngine.setStatusListener(null);
    };
  }, [isAutostart]);

  // Hotspot Interaction Handler
  const handleHotspotAction = useCallback(
    (h: CityHotspot) => {
      const cur = playerStateRef.current;
      if (h.type === 'eat') {
        const meal = h.id === 'eat_maquis' ? IVORIAN_FOODS[1] : IVORIAN_FOODS[0];
        setPlayerState((prev) => eatFood(prev, meal));
        syncEconomy('eat', { foodId: meal.id });
        soundEngine.playCashSound();
        showToast(`🍽️ ${meal.name} savouré !`);
      } else if (h.type === 'loto') {
        setPlayerState((prev) => playLotoAkwaba(prev));
        syncEconomy('loto');
        soundEngine.playCashSound();
      } else if (h.type === 'vieux_sage') {
        setPlayerState((prev) => performLavageEtoile(prev));
        syncEconomy('lavage_etoile');
        soundEngine.playWooHooJingle();
      } else if (h.type === 'work') {
        setPlayerState((prev) => performWorkShift(prev));
        syncEconomy('work');
        soundEngine.playCashSound();
      } else if (h.type === 'bank') {
        setIsPhoneOpen(true);
      } else if (h.type === 'marry') {
        const partner = cur.loveState.partnerName || 'Awa (Marcory)';
        setPlayerState((prev) => performCivilMarriage(prev, partner));
        syncEconomy('marriage', { partnerName: partner });
        soundEngine.playWooHooJingle();
      } else if (h.type === 'woohoo') {
        const partner = cur.loveState.partnerName || 'Affoué (Plateau)';
        setPlayerState((prev) => performConsensualWooHoo(prev, partner));
        syncEconomy('woohoo', { partnerName: partner });
        soundEngine.playWooHooJingle();
      } else if (h.type === 'school_caiman') {
        setActiveExamBadge('caiman');
      } else if (h.type === 'school_alysma') {
        setActiveExamBadge('alysma');
      } else if (h.type === 'school_alex') {
        setActiveExamBadge('alex');
      } else if (h.type === 'sleep') {
        setPlayerState((prev) => sleepAtHome(prev));
        syncEconomy('sleep');
      } else if (h.type === 'shower' || h.type === 'toilet') {
        setPlayerState((prev) => takeShower(useToilet(prev)));
        syncEconomy('shower');
      } else if (h.type === 'black_market') {
        if (cur.destiny.blackMarketAccess || cur.cash >= 35000) {
          setPlayerState((prev) => clearPoliceViaNetwork(prev, true));
          syncEconomy('clear_police', { isBlackMarket: true });
        } else {
          showToast('🕶️ Marché Noir réservé ou 35 000 F requis.');
        }
      } else if (h.type === 'yannis_academy') {
        setPlayerState((prev) => donateYannisAcademy(prev));
        syncEconomy('yannis_academy');
        soundEngine.playWooHooJingle();
      }
    },
    [showToast, syncEconomy]
  );

  // Mount Three.js AbidjanSceneManager ONCE
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const mgr = new AbidjanSceneManager(canvasContainerRef.current, {
      onNearestHotspotChange: (h) => setNearbyHotspot(h),
      onNearestVehicleChange: (v) => setNearbyVehicle(v ? { id: v.id, label: v.label } : null),
      onDistrictChange: (d) => {
        setCurrentDistrict(d);
        const match = DISTRICTS.find((x) => x.name === d || d.includes(x.name));
        if (match) {
          setPlayerState((prev) => {
            const next = evaluateMissionProgress(prev, match.id);
            if (next.activeMission.stepIndex !== prev.activeMission.stepIndex || next.activeMission.completed !== prev.activeMission.completed) {
              soundEngine.playWooHooJingle();
              showToast(`🎯 Mission mise à jour à ${match.name} !`);
              syncEconomy('visit_district', { districtId: match.id });
            }
            return next;
          });
        }
      },
      onCashPickup: (amount) => {
        soundEngine.playCashSound();
        setPlayerState((prev) =>
          addLog({ ...prev, cash: prev.cash + amount }, `💵 Liasse trouvée dans la rue : +${amount.toLocaleString('fr-FR')} FCFA !`, 'star')
        );
        showToast(`💵 +${amount.toLocaleString('fr-FR')} F trouvés !`);
      },
      onEngineStallChange: (stalled) => {
        setPlayerState((prev) => ({ ...prev, engineStalled: stalled }));
        if (stalled) showToast('🌊 Moteur noyé par l’inondation !');
      },
      onInteractionTriggered: (h) => handleHotspotAction(h),
      onVehicleToggle: (entering, vType) => {
        setPlayerState((prev) => ({
          ...prev,
          isDriving: entering,
          currentVehicleId: vType || prev.currentVehicleId,
        }));
      },
      onPositionTick: (pos) => {
        const cur = playerStateRef.current;
        mpRef.current?.sendPosition({
          ...pos,
          sapeOutfit: cur.sapeOutfit,
        });
      },
      onHorn: () => soundEngine.playHorn(),
      onPauseKey: () => {
        setScreenState((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));
      },
    });

    sceneRef.current = mgr;
    // Aide au débogage et aux tests visuels : `?blvdebug` expose le gestionnaire de scène (window.__blvScene)
    if (new URLSearchParams(window.location.search).has('blvdebug')) {
      (window as unknown as { __blvScene?: unknown }).__blvScene = mgr;
    }

    if (isAutostart) {
      const p = playerStateRef.current;
      setCurrentDistrict(p.destiny.district);
      mgr.spawnPlayerAtDestiny(
        p.destiny.spawnX,
        p.destiny.spawnZ,
        p.destiny.vehicle,
        p.destiny.secondaryVehicle,
        p.sapeOutfit,
        Boolean(p.destiny.realMadridSuperstar),
        Boolean(p.destiny.mysticBaraka),
        p.destiny.homeType,
        `${p.playerId}|${p.destiny.id}`,
        p.destiny.districtId
      );
      mgr.syncCribUpgrades(p.cribUpgrades);
      mgr.setCameraMode('follow');
      mgr.setPaused(false);
    } else {
      mgr.setCameraMode('flyover');
      mgr.setPaused(true);
    }

    return () => {
      mgr.dispose();
      sceneRef.current = null;
    };
  }, [handleHotspotAction, isAutostart, showToast, syncEconomy]);

  // Title Screen Enter/Space keyboard start handshake
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screenStateRef.current === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        setScreenState('roulette');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Connect Authenticated WebSocket once playing and sessionToken is ready
  useEffect(() => {
    if (screenState !== 'playing' || !playerState.sessionToken) return;
    if (!mpRef.current) {
      const client = new MultiplayerClient({
        onPlayersChange: (players, count) => {
          setRemotePlayers(players);
          setOnlineCount(count);
          sceneRef.current?.syncRemotePlayers(players);
        },
        onTontineUpdate: (snap) => {
          setTontineError(null);
          setTontineSnapshot(snap);
        },
        onTontinePayout: (amt) => {
          soundEngine.playCashSound();
          setPlayerState((prev) =>
            addLog({ ...prev, cash: prev.cash + amt }, `🎉 Tontine Live : Tu encaisses la cagnotte de ${amt.toLocaleString('fr-FR')} FCFA !`, 'star')
          );
          showToast(`🎉 Cagnotte Tontine : +${amt.toLocaleString('fr-FR')} F !`);
        },
        onTontineFleeResult: (amt) => {
          soundEngine.playPoliceSiren();
          setPlayerState((prev) =>
            addLog(
              { ...prev, cash: prev.cash + amt, policeWanted: Math.min(5, prev.policeWanted + 3) },
              `🚨 SCANDALE ! Tu as fui avec ${amt.toLocaleString('fr-FR')} F de la Tontine ! (+3 ★ Police)`,
              'danger'
            )
          );
          showToast('🚨 Fuite Tontine : +3 ★ Police !');
        },
        onTontineError: (msg) => {
          setTontineError(msg);
          showToast(`⚠️ ${msg}`);
        },
        onChatMessage: (msg) => setChatMessages((prev) => [...prev.slice(-30), msg]),
        onIncomingConsent: (req) => setIncomingConsent(req),
        onConsentSent: (sent) => {
          const target = remotePlayers.find((r) => r.id === sent.toPlayerId);
          setPendingOutgoingConsent({
            requestId: sent.requestId,
            toPlayerId: sent.toPlayerId,
            partnerName: target?.name || 'Citoyen',
            kind: sent.kind,
          });
        },
        onConsentCancelled: (requestId) => {
          setIncomingConsent((curr) => (curr?.requestId === requestId ? null : curr));
          showToast('💬 La demande de consentement a été annulée.');
        },
        onConsentResolved: (res) => {
          setPendingOutgoingConsent((curr) => (curr?.requestId === res.requestId ? null : curr));
          if (res.accepted) {
            soundEngine.playWooHooJingle();
            setPlayerState((prev) =>
              res.kind === 'marriage'
                ? performCivilMarriage(prev, res.partnerName)
                : performConsensualWooHoo(prev, res.partnerName)
            );
          } else {
            showToast(`💬 ${res.partnerName} a décliné la demande.`);
          }
        },
        onHouseKnockIncoming: (knock) => setIncomingKnock(knock),
        onHouseVisitResolved: (res) => {
          if (res.approved && res.homeType && res.seedKey) {
            sceneRef.current?.visitNeighborHouse(res.homeType, res.seedKey, res.ownerName, res.upgrades);
            setVisitingNeighbor(res.ownerName);
            setIsPhoneOpen(false);
            showToast(`🏠 Bienvenue chez ${res.ownerName} !`);
          } else {
            showToast(`🚪 ${res.reason || 'Accès refusé.'}`);
          }
        },
        onConnectionChange: () => {},
      });
      mpRef.current = client;
      const p = playerStateRef.current;
      client.connect({
        id: p.playerId,
        authToken: p.sessionToken,
        name: p.destiny.name,
        destinyName: p.destiny.name,
        color: p.destiny.color,
        x: p.destiny.spawnX,
        y: 0,
        z: p.destiny.spawnZ,
        rotY: 0,
        isDriving: p.isDriving,
        vehicleType: p.destiny.vehicle,
        sapeOutfit: p.sapeOutfit,
        homeType: p.destiny.homeType,
      });
    }
  }, [screenState, playerState.sessionToken, remotePlayers, showToast]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      mpRef.current?.disconnect();
      mpRef.current = null;
    };
  }, []);

  // 1-second Simulation Tick (Time, Needs Decay, Weather, Autosave)
  useEffect(() => {
    if (screenState !== 'playing') return;

    const timer = window.setInterval(() => {
      setPlayerState((prev) => {
        let next = advanceGameTime(prev, 1, 1);

        if (Math.random() < 0.008) {
          const weathers: WeatherType[] = ['soleil', 'soleil', 'pluie', 'inondation', 'harmattan'];
          const w = weathers[Math.floor(Math.random() * weathers.length)];
          if (w !== next.weather) {
            next = addLog({ ...next, weather: w }, `🌦️ Météo Abidjan : passage en mode ${w.toUpperCase()}.`, 'neutral');
          }
        }

        sceneRef.current?.updateWorldConditions(next.weather, next.gameTimeHours, next.policeWanted, next.star);
        return next;
      });
    }, 1000);

    const saveTimer = window.setInterval(() => {
      const cur = playerStateRef.current;
      saveGameStateAsync(cur);
      persistServerState(cur);
    }, 6000);

    return () => {
      clearInterval(timer);
      clearInterval(saveTimer);
    };
  }, [screenState, persistServerState]);

  const enterAbidjanWithDestiny = (destiny: Destiny) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const cur = playerStateRef.current;
    const fresh = createInitialPlayerState(destiny, cur.playerId, cur.sessionToken);
    const lot = sceneRef.current?.spawnPlayerAtDestiny(
      destiny.spawnX,
      destiny.spawnZ,
      destiny.vehicle,
      destiny.secondaryVehicle,
      fresh.sapeOutfit,
      Boolean(destiny.realMadridSuperstar),
      Boolean(destiny.mysticBaraka),
      destiny.homeType,
      `${fresh.playerId}|${destiny.id}`,
      destiny.districtId
    );
    if (lot?.id) fresh.homeLotId = lot.id;

    setVisitingNeighbor(null);
    setPlayerState(fresh);
    setCurrentDistrict(destiny.district);
    setScreenState('playing');
    saveGameStateAsync(fresh);
    persistServerState(fresh);

    sceneRef.current?.syncCribUpgrades(fresh.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
    showToast(`🇨🇮 Bienvenue à ${destiny.district} (${destiny.name}) !`);
  };

  const handleContinueSavedGame = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const cur = initialSaved || playerState;
    setPlayerState(cur);
    setCurrentDistrict(cur.destiny.district);
    setScreenState('playing');
    sceneRef.current?.spawnPlayerAtDestiny(
      cur.destiny.spawnX,
      cur.destiny.spawnZ,
      cur.destiny.vehicle,
      cur.destiny.secondaryVehicle,
      cur.sapeOutfit,
      Boolean(cur.destiny.realMadridSuperstar),
      Boolean(cur.destiny.mysticBaraka),
      cur.destiny.homeType,
      `${cur.playerId}|${cur.destiny.id}`,
      cur.destiny.districtId
    );
    sceneRef.current?.syncCribUpgrades(cur.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
  };

  const handleToggleSound = () => {
    const m = soundEngine.toggleMute();
    setIsMuted(m);
  };

  const handleNextRadio = () => {
    const idx = RADIO_STATIONS.findIndex((r) => r.id === playerState.activeRadioId);
    const next = RADIO_STATIONS[(idx + 1) % RADIO_STATIONS.length];
    setPlayerState((prev) => ({ ...prev, activeRadioId: next.id }));
    soundEngine.setRadio(next.audioKey, next.streamUrl);
  };

  const handleRepairStalledEngine = () => {
    const repairCost = playerState.destiny.id === 'mecanicien_treichville' ? 2500 : 5000;
    const pay = spendCash(playerState, repairCost);
    if (!pay.ok) {
      showToast(`❌ ${repairCost} FCFA requis pour dépanner le moteur noyé.`);
      return;
    }
    sceneRef.current?.repairStalledEngine();
    setPlayerState((prev) =>
      addLog({ ...prev, cash: pay.nextCash, engineStalled: false }, `🔧 Moteur séché et réparé (-${repairCost} F) !`, 'success')
    );
  };

  const getRadarSnapshot = useCallback((): RadarSnapshot | null => {
    return sceneRef.current ? sceneRef.current.getRadarSnapshot() : null;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-cream-50 font-sans text-ink-800">
      {/* DEDICATED ISOLATED 3D WEBGL MOUNT */}
      <div ref={canvasContainerRef} data-testid="abidjan-canvas" className="fixed inset-0 z-0" />

      <OfflineIndicator lang={playerState.language} />
      <OrientationGuard />

      {/* STAGE 1: TITLE SCREEN (LIVE 3D FLYOVER BEHIND) */}
      {screenState === 'title' && (
        <TitleScreen
          hasSavedGame={hasSavedGame}
          savedDestinyName={initialSaved?.destiny.name}
          onStartNewGame={() => setScreenState('roulette')}
          onContinueGame={handleContinueSavedGame}
        />
      )}

      {/* STAGE 2: DESTINY ROULETTE */}
      {screenState === 'roulette' && (
        <DestinyRouletteModal
          currentDestiny={playerState.destiny}
          canClose={hasSavedGame}
          onClose={() => setScreenState('title')}
          onSelectDestiny={enterAbidjanWithDestiny}
        />
      )}

      {/* STAGE 3: ACTIVE ABIDJAN HUD & OPTIONAL MOBILE GAMEPAD */}
      {screenState === 'playing' && (
        <>
          <GameHUD
            playerState={playerState}
            currentDistrict={currentDistrict}
            onlineCount={onlineCount}
            nearbyHotspot={nearbyHotspot}
            nearbyVehicle={nearbyVehicle}
            radioStatus={radioStatus}
            getRadarSnapshot={getRadarSnapshot}
            touchControls={touchControls}
            onInteractClick={() => sceneRef.current?.triggerInteract()}
            onRepairEngine={handleRepairStalledEngine}
            onOpenPhone={() => setIsPhoneOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenRoulette={() => setScreenState('roulette')}
            onNextRadio={handleNextRadio}
            onToggleSound={handleToggleSound}
            onPauseClick={() => setScreenState('paused')}
            isMuted={isMuted}
          />

          <ConsoleGamepad
            visible={touchControls}
            isDriving={playerState.isDriving}
            canInteract={Boolean(nearbyHotspot || nearbyVehicle || playerState.isDriving)}
            onJoystickChange={(x, y) => sceneRef.current?.setJoystick(x, y)}
            onInteract={() => sceneRef.current?.triggerInteract()}
            onJump={() => (playerState.isDriving ? sceneRef.current?.triggerHorn() : sceneRef.current?.triggerJump())}
            onPhone={() => setIsPhoneOpen((o) => !o)}
            onHold={(active) => {
              const scene = sceneRef.current;
              if (!scene) return;
              if (!active) {
                scene.setSprint(false);
                scene.setHandbrake(false);
              } else if (playerState.isDriving) {
                scene.setHandbrake(true);
              } else {
                scene.setSprint(true);
              }
            }}
          />
        </>
      )}

      {/* PAUSED MODAL */}
      {screenState === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Jeu en pause">
          <div className="panel w-full max-w-sm space-y-4 p-6 text-center">
            <h2 className="font-display text-3xl font-semibold">Jeu en pause</h2>
            <p className="text-sm text-ink-600">
              {playerState.destiny.name} · {currentDistrict}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <JellyButton tone="sun" size="md" onClick={() => setScreenState('playing')} icon={<Play className="h-5 w-5 fill-white" />}>
                Reprendre la partie
              </JellyButton>
              <JellyButton tone="plum" size="md" onClick={() => setScreenState('roulette')} icon={<RotateCcw className="h-5 w-5" />}>
                Nouveau destin
              </JellyButton>
              <JellyButton tone="cream" size="md" onClick={() => setScreenState('title')} icon={<Home className="h-5 w-5" />}>
                Écran titre
              </JellyButton>
            </div>
          </div>
        </div>
      )}

      {/* BABIOS SMARTPHONE */}
      {isPhoneOpen && screenState === 'playing' && (
        <BabiOSPhone
          playerState={playerState}
          remotePlayers={remotePlayers}
          tontineSnapshot={tontineSnapshot}
          tontineError={tontineError}
          chatMessages={chatMessages}
          radioStatus={radioStatus}
          pendingOutgoingConsent={pendingOutgoingConsent}
          visitingNeighbor={visitingNeighbor}
          isSenderMuted={(id) => mpRef.current?.isSenderMuted(id) ?? false}
          onClose={() => setIsPhoneOpen(false)}
          onEatFood={(foodId) => {
            const f = IVORIAN_FOODS.find((x) => x.id === foodId);
            if (f) {
              soundEngine.playCashSound();
              setPlayerState((prev) => eatFood(prev, f));
              syncEconomy('eat', { foodId });
            }
          }}
          onDepositBank={(amt) => {
            setPlayerState((prev) => depositToBank(prev, amt));
            syncEconomy('deposit', { amount: amt });
          }}
          onWithdrawBank={(amt) => {
            setPlayerState((prev) => withdrawFromBank(prev, amt));
            syncEconomy('withdraw', { amount: amt });
          }}
          onTakeLoan={(amt) => {
            soundEngine.playCashSound();
            setPlayerState((prev) => takeBankLoan(prev, amt));
            syncEconomy('loan', { amount: amt });
          }}
          onRepayDebt={(amt) => {
            setPlayerState((prev) => repayDebt(prev, amt));
            syncEconomy('repay', { amount: amt });
          }}
          onJoinTontine={() => mpRef.current?.joinTontine()}
          onContributeTontine={() => {
            if (!playerState.sessionToken) {
              showToast('⚠️ Connexion serveur requise pour cotiser à la Tontine.');
              return;
            }
            const pay = spendCash(playerState, 50000);
            if (!pay.ok) {
              showToast('❌ 50 000 FCFA requis pour cotiser à la Tontine.');
              return;
            }
            setPlayerState((prev) => addLog({ ...prev, cash: pay.nextCash }, '🤝 Cotisation Tontine versée (-50 000 F).', 'work'));
            mpRef.current?.contributeTontine();
          }}
          onFleeTontine={() => mpRef.current?.fleeTontine()}
          onFastTravel={(x, z, districtName, districtId) => {
            const res = payFastTravel(playerState, districtName);
            const nextSt = res.ok ? evaluateMissionProgress(res.nextState, districtId) : res.nextState;
            setPlayerState(nextSt);
            syncEconomy('fast_travel', { districtName, districtId });
            if (res.ok) {
              sceneRef.current?.teleportPlayer(x, z);
              setCurrentDistrict(districtName);
              setIsPhoneOpen(false);
            }
          }}
          onWooHoo={(partner) => {
            soundEngine.playWooHooJingle();
            setPlayerState((prev) => performConsensualWooHoo(prev, partner));
            syncEconomy('woohoo', { partnerName: partner });
          }}
          onMarry={(partner) => {
            soundEngine.playWooHooJingle();
            setPlayerState((prev) => performCivilMarriage(prev, partner));
            syncEconomy('marriage', { partnerName: partner });
          }}
          onRequestRemoteConsent={(targetId, partnerName, kind) => {
            mpRef.current?.requestConsent(targetId, kind);
            showToast(`💌 Demande envoyée à ${partnerName} !`);
          }}
          onCancelConsent={(requestId) => {
            mpRef.current?.cancelConsent(requestId);
            setPendingOutgoingConsent(null);
            showToast('Demande de consentement annulée.');
          }}
          onVisitNeighbor={(ownerId) => {
            mpRef.current?.requestHouseVisit(ownerId);
            showToast('🚪 Tu frappes / entres chez ton voisin...');
          }}
          onReturnHome={() => {
            sceneRef.current?.returnToOwnHouse();
            setVisitingNeighbor(null);
            setIsPhoneOpen(false);
            showToast('🏠 De retour chez toi.');
          }}
          onChangeHomeAccess={(mode: HomeAccessMode) => {
            setPlayerState((prev) => setHomeAccessMode(prev, mode));
            syncEconomy('set_home_access', { mode });
          }}
          onStartSchoolExam={(badge) => {
            setIsPhoneOpen(false);
            setActiveExamBadge(badge);
          }}
          onBuyOrEquipOutfit={(outfit: SapeOutfitId) => {
            setPlayerState((prev) => {
              const next = buyOrEquipOutfit(prev, outfit);
              sceneRef.current?.setOutfit(next.sapeOutfit);
              return next;
            });
            syncEconomy('buy_outfit', { outfitId: outfit });
          }}
          onChangeRadio={(radioId) => {
            const r = RADIO_STATIONS.find((x) => x.id === radioId);
            if (r) {
              setPlayerState((prev) => ({ ...prev, activeRadioId: r.id }));
              soundEngine.setRadio(r.audioKey, r.streamUrl);
            }
          }}
          onUpgradeCrib={(key) => {
            setPlayerState((prev) => {
              const next = buyCribUpgrade(prev, key);
              sceneRef.current?.syncCribUpgrades(next.cribUpgrades);
              return next;
            });
            syncEconomy('buy_crib', { key });
          }}
          onSleepHome={() => {
            setPlayerState((prev) => sleepAtHome(prev));
            syncEconomy('sleep');
          }}
          onShowerHome={() => {
            setPlayerState((prev) => takeShower(prev));
            syncEconomy('shower');
          }}
          onToiletHome={() => {
            setPlayerState((prev) => useToilet(prev));
            syncEconomy('toilet');
          }}
          onDoJob={(job: CareerJob) => {
            soundEngine.playCashSound();
            setPlayerState((prev) => performCareerJob(prev, job));
            syncEconomy('work', { jobId: job.id });
          }}
          onSendChat={(txt) => mpRef.current?.sendChat(txt)}
          onReportChat={(messageId, senderId) => {
            mpRef.current?.reportChat(messageId, senderId);
            showToast('🚩 Message signalé à la modération.');
          }}
          onToggleMuteSender={(senderId) => {
            const nowMuted = mpRef.current?.toggleMuteSender(senderId) ?? false;
            showToast(nowMuted ? '🔇 Joueur masqué dans le chat.' : '🔊 Joueur réactivé.');
          }}
          onDonateYannis={() => {
            soundEngine.playWooHooJingle();
            setPlayerState((prev) => donateYannisAcademy(prev));
            syncEconomy('yannis_academy');
          }}
          onClearPoliceNetwork={(isBlackMarket) => {
            setPlayerState((prev) => clearPoliceViaNetwork(prev, isBlackMarket));
            syncEconomy('clear_police', { isBlackMarket });
          }}
        />
      )}

      {/* SCHOOL ENTRANCE EXAM (CONCOURS) */}
      {activeExamBadge && (
        <SchoolExamModal
          badgeId={activeExamBadge}
          onClose={() => setActiveExamBadge(null)}
          onPass={(badge) => {
            soundEngine.playWooHooJingle();
            setPlayerState((prev) => unlockBadge(prev, badge));
            syncEconomy('unlock_badge', { badgeId: badge });
            setActiveExamBadge(null);
            showToast(`🎓 Badge ${badge.toUpperCase()} obtenu !`);
          }}
        />
      )}

      {/* INCOMING BILATERAL MULTIPLAYER CONSENT MODAL */}
      {incomingConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60">
          <div className="w-full max-w-sm rounded-2xl bg-cream-100 border-2 border-coral-400/60 p-5 text-center space-y-3 shadow-2xl">
            <ShieldCheck className="w-8 h-8 text-coral-600 mx-auto" />
            <h3 className="font-display text-xl uppercase text-ink-800">Consentement Mutuel Requis</h3>
            <p className="text-xs text-ink-600">
              <strong>{incomingConsent.fromName}</strong> te propose{' '}
              {incomingConsent.type === 'marriage'
                ? 'un Mariage Civil à la Mairie du Plateau'
                : 'une intimité pudique (style Les Sims)'}
              .
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  mpRef.current?.respondConsent(incomingConsent.requestId, true);
                  setIncomingConsent(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-coral-600 hover:bg-coral-500 text-xs font-bold uppercase cursor-pointer"
              >
                Accepter 💖
              </button>
              <button
                type="button"
                onClick={() => {
                  mpRef.current?.respondConsent(incomingConsent.requestId, false);
                  setIncomingConsent(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cream-200 hover:bg-cream-200 text-xs font-bold uppercase cursor-pointer"
              >
                Décliner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING HOUSE KNOCK MODAL */}
      {incomingKnock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60">
          <div className="w-full max-w-sm rounded-2xl bg-cream-100 border-2 border-plum-400/60 p-5 text-center space-y-3 shadow-2xl">
            <DoorOpen className="w-8 h-8 text-plum-500 mx-auto" />
            <h3 className="font-display text-xl uppercase text-ink-800">On frappe à ta porte !</h3>
            <p className="text-xs text-ink-600">
              <strong>{incomingKnock.fromName}</strong> souhaite visiter ton logement à Abidjan.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  mpRef.current?.respondHouseKnock(incomingKnock.fromPlayerId, true);
                  setIncomingKnock(null);
                  showToast(`🏠 Tu as ouvert la porte à ${incomingKnock.fromName}.`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-plum-500 hover:bg-plum-500 text-xs font-bold uppercase cursor-pointer"
              >
                Ouvrir 🏠
              </button>
              <button
                type="button"
                onClick={() => {
                  mpRef.current?.respondHouseKnock(incomingKnock.fromPlayerId, false);
                  setIncomingKnock(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cream-200 hover:bg-cream-200 text-xs font-bold uppercase cursor-pointer"
              >
                Refuser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & RGPD */}
      {isSettingsOpen && (
        <SettingsModal
          playerState={playerState}
          onClose={() => setIsSettingsOpen(false)}
          onToggleSound={handleToggleSound}
          isMuted={isMuted}
          forceGamepad={forceGamepad}
          cameraSensitivity={cameraSensitivity}
          onCameraSensitivityChange={handleCameraSensitivityChange}
          onToggleForceGamepad={() => setForceGamepad((v) => !v)}
          onToggleLanguage={() =>
            setPlayerState((prev) => ({
              ...prev,
              language: prev.destiny.englishLock ? 'en' : prev.language === 'fr' ? 'en' : 'fr',
            }))
          }
          onResetGame={() => {
            setIsSettingsOpen(false);
            setHasSavedGame(false);
            setScreenState('title');
          }}
        />
      )}

      {/* ADMIN SANDBOX */}
      {isAdminOpen && (
        <AdminModal
          playerState={playerState}
          onClose={() => setIsAdminOpen(false)}
          onForceDestiny={(id, serverState) => {
            const d = ALL_DESTINIES.find((x) => x.id === id);
            if (serverState) {
              const nextSt: PlayerState = { ...serverState, sessionToken: playerState.sessionToken };
              const lot = sceneRef.current?.spawnPlayerAtDestiny(
                nextSt.destiny.spawnX,
                nextSt.destiny.spawnZ,
                nextSt.destiny.vehicle,
                nextSt.destiny.secondaryVehicle,
                nextSt.sapeOutfit,
                Boolean(nextSt.destiny.realMadridSuperstar),
                Boolean(nextSt.destiny.mysticBaraka),
                nextSt.destiny.homeType,
                `${nextSt.playerId}|${nextSt.destiny.id}`,
                nextSt.destiny.districtId
              );
              if (lot?.id) nextSt.homeLotId = lot.id;
              setPlayerState(nextSt);
              setCurrentDistrict(nextSt.destiny.district);
              setVisitingNeighbor(null);
              sceneRef.current?.syncCribUpgrades(nextSt.cribUpgrades);
              setIsAdminOpen(false);
            } else if (d) {
              enterAbidjanWithDestiny(d);
              setIsAdminOpen(false);
            }
          }}
          onAddCash={(amt, serverState) => {
            soundEngine.playCashSound();
            setPlayerState((prev) =>
              serverState
                ? { ...serverState, sessionToken: prev.sessionToken }
                : addLog({ ...prev, cash: prev.cash + amt }, `💎 Admin : +${amt.toLocaleString('fr-FR')} F`, 'star')
            );
          }}
          onChangeWeather={(w, serverState) => {
            setPlayerState((prev) => (serverState ? { ...serverState, sessionToken: prev.sessionToken } : { ...prev, weather: w }));
            sceneRef.current?.updateWorldConditions(w, playerState.gameTimeHours, playerState.policeWanted);
          }}
          onSetPoliceStars={(stars, serverState) => {
            setPlayerState((prev) =>
              serverState ? { ...serverState, sessionToken: prev.sessionToken } : { ...prev, policeWanted: stars }
            );
            if (stars > 0) soundEngine.playPoliceSiren();
          }}
          onRefillNeeds={(serverState) =>
            setPlayerState((prev) =>
              serverState
                ? { ...serverState, sessionToken: prev.sessionToken }
                : {
                    ...prev,
                    isDepressed: false,
                    needs: { hunger: 100, energy: 100, hygiene: 100, bladder: 100, envy: 100 },
                  }
            )
          }
          onUnlockBadge={(badge, serverState) =>
            setPlayerState((prev) =>
              serverState ? { ...serverState, sessionToken: prev.sessionToken } : unlockBadge(prev, badge)
            )
          }
        />
      )}

      {/* GAME OVER */}
      {screenState === 'gameover' && (
        <GameOverModal
          playerState={playerState}
          onRestart={() => {
            setScreenState('roulette');
          }}
        />
      )}

      {/* TRANSIENT EVENT TOAST */}
      {toastNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[110] rounded-xl bg-ink-900/60 border border-sun-400/60 px-4 py-2 text-xs font-bold text-sun-600 shadow-2xl pointer-events-none">
          {toastNotification}
        </div>
      )}
    </div>
  );
}
