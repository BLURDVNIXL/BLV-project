import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Destiny,
  GameScreenState,
  PlayerProfile,
  PlayerState,
  RemotePlayer,
  SapeOutfitId,
  WeatherType,
} from './types/game';
import {
  ALL_DESTINIES,
  IVORIAN_FOODS,
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
  fastTravelFare,
  applyTaxiRideTime,
  taxiRideGameMinutes,
  taxiWaitSeconds,
  taxiCallRefusal,
  performLavageEtoile,
  performWorkShift,
  playLotoAkwaba,
  repayDebt,
  rollDestiny,
  sleepAtHome,
  spendCash,
  takeBankLoan,
  takeShower,
  useToilet,
  withdrawFromBank,
} from './core/simulation';
import { DISTRICTS } from './world/abidjanGeography';
import { loadGameStateAsync, loadGameStateSync, saveGameStateAsync } from './core/storage';
import { initWasmCore } from './wasm/wasmBridge';
import { AbidjanSceneManager, CityHotspot, RadarSnapshot } from './3d/sceneManager';
import { soundEngine } from './audio/soundEngine';
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
import { NewLifeScreen } from './components/NewLifeScreen';
import { loadProfile, saveProfile } from './core/profile';
import { AdminModal } from './components/AdminModal';
import { FullMapModal } from './components/FullMapModal';
import type { GpsSource } from './core/gpsDestinations';
import { districtAt } from './world/abidjanGeography';
import type { Route } from './world/routing';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { OrientationGuard } from './components/OrientationGuard';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import { Play, RotateCcw, Home, ShieldCheck } from 'lucide-react';

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
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const routeRef = useRef<Route | null>(null);
  routeRef.current = route;

  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Audio & Settings
  const [isMuted, setIsMuted] = useState(false);
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
            saved.destiny.districtId,
            saved.destiny.id
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
    };
  }, [isAutostart]);

  // Touche M : ouvre / ferme la carte (ordinateur)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat || screenState !== 'playing') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      setIsMapOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenState]);

  // Fondu au noir pour entrer / sortir d'un intérieur (la scène bascule pendant que l'écran est noir)
  const [fadeBlack, setFadeBlack] = useState(false);
  const transitionBusyRef = useRef(false);
  const runTransition = useCallback((action: () => void) => {
    if (transitionBusyRef.current) return;
    transitionBusyRef.current = true;
    setFadeBlack(true);
    window.setTimeout(() => {
      action();
      window.setTimeout(() => {
        setFadeBlack(false);
        transitionBusyRef.current = false;
      }, 180);
    }, 280);
  }, []);

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
        soundEngine.playJingle();
      } else if (h.type === 'work') {
        setPlayerState((prev) => performWorkShift(prev));
        syncEconomy('work');
        soundEngine.playCashSound();
      } else if (h.type === 'bank') {
        setIsPhoneOpen(true);
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
        soundEngine.playJingle();
      } else if (h.type === 'interior_door') {
        if (cur.isDriving) {
          showToast('🚗 Descends de ton véhicule pour entrer.');
        } else {
          runTransition(() => {
            sceneRef.current?.enterInterior(h.id);
          });
        }
      } else if (h.type === 'interior_exit') {
        runTransition(() => {
          sceneRef.current?.exitInterior();
        });
      } else if (h.type === 'interior_stairs') {
        runTransition(() => {
          sceneRef.current?.switchHouseFloor(h.targetFloor ?? 0);
        });
      }
    },
    [showToast, syncEconomy, runTransition]
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
              soundEngine.playJingle();
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
      onTaxiFade: (dark) => setTaxiFadeDark(dark),
      onTaxiRideArrived: () => {
        // Écran noir : le temps du trajet passe (heure de jeu, faim, énergie).
        const ride = taxiRideRef.current;
        if (!ride) return;
        setPlayerState((prev) => applyTaxiRideTime(prev, ride.distanceM));
        showToast(`🚖 Trajet : ${taxiRideGameMinutes(ride.distanceM)} min de jeu`);
      },
      onTaxiRideEnd: () => {
        const dest = taxiRideRef.current;
        taxiRideRef.current = null;
        if (dest) setCurrentDistrict(districtAt({ x: dest.x, z: dest.z }).name);
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
        const rt = routeRef.current;
        if (rt) {
          const end = rt.points[rt.points.length - 1];
          // Arrivé (≈ 15 m de jeu de la destination) : l'itinéraire s'efface
          if (Math.hypot(pos.x - end.x, pos.z - end.z) < 15) setRoute(null);
        }
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
    mgr.setRoute(routeRef.current ? routeRef.current.points : null);
    mgr.setPlayerGender(playerStateRef.current.gender);
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
        p.destiny.districtId,
        p.destiny.id
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

  // Avatar 3D selon le genre choisi (Homme → garçon, Femme → fille)
  useEffect(() => {
    sceneRef.current?.setPlayerGender(playerState.gender);
  }, [playerState.gender]);

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
        gender: p.gender,
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

  const enterAbidjanWithDestiny = (destiny: Destiny, profile?: PlayerProfile) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const cur = playerStateRef.current;
    const fresh = createInitialPlayerState(destiny, cur.playerId, cur.sessionToken, profile);
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
      destiny.districtId,
      destiny.id
    );
    if (lot?.id) fresh.homeLotId = lot.id;

    setPlayerState(fresh);
    setCurrentDistrict(destiny.district);
    setScreenState('playing');
    saveGameStateAsync(fresh);
    persistServerState(fresh);

    sceneRef.current?.syncCribUpgrades(fresh.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
    showToast(`🇨🇮 Bienvenue${profile ? ` ${profile.name}` : ''} à ${destiny.district} (${destiny.name}) !`);
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
      cur.destiny.districtId,
      cur.destiny.id
    );
    sceneRef.current?.syncCribUpgrades(cur.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
  };

  const handleToggleSound = () => {
    const m = soundEngine.toggleMute();
    setIsMuted(m);
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

  // L'itinéraire choisi sur la carte est aussi tracé dans le monde 3D
  useEffect(() => {
    sceneRef.current?.setRoute(route ? route.points : null);
  }, [route]);

  // Taxi appelé (étape B1) : compte à rebours, annulation libre, paiement seulement à la montée.
  const [taxiCall, setTaxiCall] = useState<{
    x: number;
    z: number;
    districtName: string;
    districtId: string;
    endsAt: number;
    remainingS: number;
  } | null>(null);
  const taxiCallRef = useRef(taxiCall);
  taxiCallRef.current = taxiCall;
  // Cinématique du trajet (B3) : écran noir et destination de la course en cours.
  const [taxiFadeDark, setTaxiFadeDark] = useState(false);
  const taxiRideRef = useRef<{ x: number; z: number; distanceM: number } | null>(null);
  useEffect(() => {
    // Hors du jeu (menu, fin de partie), plus de cinématique ni d'écran noir.
    if (screenState !== 'playing') {
      taxiRideRef.current = null;
      setTaxiFadeDark(false);
    }
  }, [screenState]);

  const cancelTaxi = useCallback((message?: string) => {
    taxiCallRef.current = null;
    setTaxiCall(null);
    sceneRef.current?.stopTaxiApproach();
    if (message) showToast(message);
  }, [showToast]);

  /** Montée dans le taxi : paie la course (une seule fois), puis téléporte comme avant. */
  const arriveTaxiRef = useRef<(call: { x: number; z: number; districtName: string; districtId: string }) => void>(() => {});
  arriveTaxiRef.current = (call) => {
    const snap = sceneRef.current?.getRadarSnapshot();
    const fromDistrictId = snap ? districtAt({ x: snap.playerX, z: snap.playerZ }).id : null;
    const cur = playerStateRef.current;
    const res = payFastTravel(cur, call.districtName, fastTravelFare(fromDistrictId, call.districtId));
    const nextSt = res.ok ? evaluateMissionProgress(res.nextState, call.districtId) : res.nextState;
    setPlayerState(nextSt);
    syncEconomy('fast_travel', { districtName: call.districtName, districtId: call.districtId, fromDistrictId });
    if (!res.ok) {
      sceneRef.current?.stopTaxiApproach();
      showToast('❌ Pas assez d\u2019argent : le taxi repart sans toi.');
      return;
    }
    // Depuis un intérieur (hôpital), on en sort d'abord : sinon le joueur serait déposé dehors
    // alors que la salle partagée resterait active.
    if (sceneRef.current?.isInsideInterior()) sceneRef.current.exitInterior();
    setIsPhoneOpen(false);
    // B3 : cinématique du trajet ; si aucun trajet n'existe, on dépose le joueur directement (comme en B1/B2).
    const ride = sceneRef.current?.startTaxiRide({ x: call.x, z: call.z });
    if (ride) {
      taxiRideRef.current = { x: call.x, z: call.z, distanceM: ride.distanceM };
      return;
    }
    sceneRef.current?.stopTaxiApproach();
    sceneRef.current?.teleportPlayer(call.x, call.z);
    setCurrentDistrict(districtAt({ x: call.x, z: call.z }).name);
  };

  useEffect(() => {
    if (!taxiCall) return;
    const id = window.setInterval(() => {
      const call = taxiCallRef.current;
      if (!call) return;
      if (playerStateRef.current.isDriving) {
        cancelTaxi('🚖 Course annulée : tu conduis.');
        return;
      }
      if (screenStateRef.current !== 'playing') {
        cancelTaxi();
        return;
      }
      const left = call.endsAt - Date.now();
      if (left <= 0) {
        taxiCallRef.current = null;
        setTaxiCall(null);
        arriveTaxiRef.current(call);
        return;
      }
      const remainingS = Math.ceil(left / 1000);
      if (remainingS !== call.remainingS) setTaxiCall({ ...call, remainingS });
    }, 250);
    return () => window.clearInterval(id);
  }, [taxiCall === null, cancelTaxi]);

  const getRadarSnapshot = useCallback((): RadarSnapshot | null => {
    return sceneRef.current ? sceneRef.current.getRadarSnapshot() : null;
  }, []);

  /** Lieux fixes et perron de la maison pour l'application GPS du téléphone. */
  const getGpsSource = useCallback((): GpsSource => {
    const snap = sceneRef.current ? sceneRef.current.getRadarSnapshot() : null;
    return {
      places: snap ? snap.places : [],
      homePorch: snap ? snap.homePorch : null,
      fromDistrictId: snap ? districtAt({ x: snap.playerX, z: snap.playerZ }).id : null,
    };
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
          language={playerState.language}
        />
      )}

      {/* STAGE 2: DESTINY ROULETTE */}
      {screenState === 'roulette' && (
        <NewLifeScreen
          initialProfile={playerState.playerName && playerState.gender ? { name: playerState.playerName, gender: playerState.gender } : loadProfile()}
          canClose={hasSavedGame}
          onClose={() => setScreenState('title')}
          onEnter={(destiny, profile) => {
            saveProfile(profile);
            enterAbidjanWithDestiny(destiny, profile);
          }}
        />
      )}

      {/* Carte plein écran : toucher le radar (ou touche M) */}
      {isMapOpen && screenState === 'playing' && <FullMapModal getSnapshot={getRadarSnapshot} route={route} onRouteChange={setRoute} onClose={() => setIsMapOpen(false)} />}

      {/* Fondu au noir des entrées / sorties d'intérieurs */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-[90] bg-black transition-opacity duration-300 ${fadeBlack ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* STAGE 3: ACTIVE ABIDJAN HUD & OPTIONAL MOBILE GAMEPAD */}
      {screenState === 'playing' && (
        <>
          <GameHUD
            playerState={playerState}
            currentDistrict={currentDistrict}
            onlineCount={onlineCount}
            nearbyHotspot={nearbyHotspot}
            nearbyVehicle={nearbyVehicle}
            getRadarSnapshot={getRadarSnapshot}
            touchControls={touchControls}
            onInteractClick={() => sceneRef.current?.triggerInteract()}
            onRepairEngine={handleRepairStalledEngine}
            onOpenPhone={() => setIsPhoneOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenRoulette={() => setScreenState('roulette')}
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
          isSenderMuted={(id) => mpRef.current?.isSenderMuted(id) ?? false}
          getGpsSource={getGpsSource}
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
            // Étape B1 : on appelle le taxi, il arrive après 10 à 20 s ; le prix (500 F dans la commune,
            // 1 000 F entre communes, recalculé par le serveur) n'est débité qu'à la montée.
            const snap = sceneRef.current?.getRadarSnapshot();
            const fromDistrictId = snap ? districtAt({ x: snap.playerX, z: snap.playerZ }).id : null;
            const refusal = taxiCallRefusal(
              playerState,
              fastTravelFare(fromDistrictId, districtId),
              taxiCallRef.current !== null || taxiRideRef.current !== null
            );
            if (refusal) {
              showToast(refusal);
              return;
            }
            const distanceM = snap ? Math.hypot(x - snap.playerX, z - snap.playerZ) : Infinity;
            const waitS = taxiWaitSeconds(distanceM);
            const call = { x, z, districtName, districtId, endsAt: Date.now() + waitS * 1000, remainingS: waitS };
            taxiCallRef.current = call;
            setTaxiCall(call);
            sceneRef.current?.startTaxiApproach(waitS);
            setIsPhoneOpen(false);
          }}

          onBuyOrEquipOutfit={(outfit: SapeOutfitId) => {
            setPlayerState((prev) => {
              const next = buyOrEquipOutfit(prev, outfit);
              sceneRef.current?.setOutfit(next.sapeOutfit);
              return next;
            });
            syncEconomy('buy_outfit', { outfitId: outfit });
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
            soundEngine.playJingle();
            setPlayerState((prev) => donateYannisAcademy(prev));
            syncEconomy('yannis_academy');
          }}
          onClearPoliceNetwork={(isBlackMarket) => {
            setPlayerState((prev) => clearPoliceViaNetwork(prev, isBlackMarket));
            syncEconomy('clear_police', { isBlackMarket });
          }}
        />
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
                nextSt.destiny.districtId,
                nextSt.destiny.id
              );
              if (lot?.id) nextSt.homeLotId = lot.id;
              setPlayerState(nextSt);
              setCurrentDistrict(nextSt.destiny.district);
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

      {/* CINÉMATIQUE DU TAXI : fondu au noir au début et à la fin du trajet */}
      <div
        data-testid="taxi-fade"
        aria-hidden="true"
        className={`fixed inset-0 z-[120] bg-black pointer-events-none transition-opacity duration-700 ${taxiFadeDark ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* TAXI APPELÉ : compte à rebours + annulation */}
      {taxiCall && screenState === 'playing' && (
        <div
          data-testid="taxi-call-banner"
          className="fixed top-28 left-1/2 -translate-x-1/2 z-[105] flex items-center gap-3 rounded-xl bg-ink-900/80 border border-sun-400/60 px-4 py-2 text-xs font-bold text-sun-600 shadow-2xl"
        >
          <span>
            🚖 Taxi vers {taxiCall.districtName} dans {taxiCall.remainingS} s
          </span>
          <button
            type="button"
            onClick={() => cancelTaxi('🚖 Taxi annulé, rien n\u2019a été débité.')}
            className="rounded-lg bg-white/15 hover:bg-white/25 px-2 py-1 text-white cursor-pointer"
          >
            Annuler
          </button>
        </div>
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
