import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Destiny,
  GameScreenState,
  PlayerProfile,
  PlayerState,
  SapeOutfitId,
  WeatherType,
} from './types/game';
import {
  IVORIAN_FOODS,
} from './core/destinies';
import {
  addLog,
  advanceGameTime,
  buyOrEquipOutfit,
  clearPoliceViaNetwork,
  createInitialPlayerState,
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
  rollDestiny,
  sleepAtHome,
  spendCash,
  takeShower,
  useToilet,
} from './core/simulation';
import { DISTRICTS } from './world/abidjanGeography';
import { purgeAllDataRGPD } from './core/storage';
import {
  SLOT_COUNT,
  cleanPosition,
  type SavePosition,
  type SaveSlot,
  type SlotList,
  defaultSlotName,
  deleteSlot,
  loadSlotsAsync,
  loadSlotsSync,
  makeSlot,
  mostRecentPlayable,
  pickSlotForNewGame,
  writeSlot,
} from './core/saveSlots';
import { initWasmCore } from './wasm/wasmBridge';
import { AbidjanSceneManager, CityHotspot, RadarSnapshot } from './3d/sceneManager';
import { soundEngine } from './audio/soundEngine';
import { initServerSession, postEconomyAction } from './network/serverApi';
import { TitleScreen } from './components/TitleScreen';
import { JellyButton } from './components/ui/Jelly';
import { GameHUD } from './components/GameHUD';
import { ConsoleGamepad } from './components/ConsoleGamepad';
import { useTouchControls } from './components/useTouchControls';
import { MyOSPhone } from './components/MyOSPhone';
import { NewLifeScreen } from './components/NewLifeScreen';
import { loadProfile, saveProfile } from './core/profile';
import { FullMapModal } from './components/FullMapModal';
import type { GpsSource } from './core/gpsDestinations';
import { districtAt } from './world/abidjanGeography';
import type { Route } from './world/routing';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { OrientationGuard } from './components/OrientationGuard';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import { Play, RotateCcw, Home } from 'lucide-react';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  // Sauvegardes multiples : lues une seule fois au démarrage (plus à chaque rendu).
  const initialSlotsRef = useRef<SlotList | null>(null);
  if (initialSlotsRef.current === null) initialSlotsRef.current = loadSlotsSync();
  const initialRecent = mostRecentPlayable(initialSlotsRef.current);
  const initialSaved = initialRecent ? initialRecent.data.state : null;
  const [slots, setSlots] = useState<SlotList>(initialSlotsRef.current);
  const slotsRef = useRef<SlotList>(slots);
  slotsRef.current = slots;
  /** Emplacement (1 à 5) de la partie en cours ; null tant qu'aucune partie n'est lancée. */
  const activeSlotRef = useRef<number | null>(isAutostart && initialRecent ? initialRecent.slot : null);
  const saveFailWarnedRef = useRef(false);
  const hasSavedGame = slots.some(Boolean);

  const [screenState, setScreenState] = useState<GameScreenState>(() => (isAutostart ? 'playing' : 'title'));
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    if (isAutostart && initialSaved && !initialSaved.isGameOver) {
      return initialSaved.isDriving ? { ...initialSaved, isDriving: false } : initialSaved;
    }
    return createInitialPlayerState(rollDestiny());
  });

  const [currentDistrict, setCurrentDistrict] = useState<string>(() => {
    if (isAutostart && initialRecent?.data.position) {
      const pos = cleanPosition(initialRecent.data.position);
      if (pos) return districtAt({ x: pos.x, z: pos.z }).name;
    }
    return playerState.destiny.district;
  });
  const [nearbyHotspot, setNearbyHotspot] = useState<CityHotspot | null>(null);
  const [nearbyVehicle, setNearbyVehicle] = useState<{ id: string; label: string } | null>(null);

  // Modals
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
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
  const [showHud, setShowHud] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('blv_show_hud');
      return raw === null ? true : raw !== '0';
    } catch {
      return true;
    }
  });
  const [pcControlsMode, setPcControlsMode] = useState<'zqsl' | 'arrows'>(() => {
    try {
      const raw = localStorage.getItem('blv_pc_controls_mode');
      if (raw === 'arrows') return 'arrows';
      if (raw === 'wasd' || raw === 'zqsl' || raw === 'zqsd') return 'zqsl';
      return 'zqsl';
    } catch {
      return 'zqsl';
    }
  });
  const [cameraSensitivity, setCameraSensitivity] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('blv_camera_sensitivity'));
      return Number.isFinite(v) && v >= 0.5 && v <= 2.5 ? v : 1;
    } catch {
      return 1;
    }
  });
    const [playerModelScale, setPlayerModelScale] = useState<number>(() => {
      localStorage.removeItem('blv_player_model_scale');
      return 1.2;
    });
  const handleCameraSensitivityChange = (v: number) => {
    setCameraSensitivity(v);
    try {
      localStorage.setItem('blv_camera_sensitivity', String(v));
    } catch {
      /* stockage indisponible : le réglage vaut pour la session */
    }
  };
  const handlePlayerModelScaleChange = (v: number) => {
    const next = Math.max(0.90, Math.min(1.50, v));
    setPlayerModelScale(next);
    try {
      localStorage.setItem('blv_player_model_scale', String(next));
    } catch {
      // réglage conservé pour la session
    }
  };
  useEffect(() => {
    try {
      localStorage.setItem('blv_show_hud', showHud ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showHud]);
  useEffect(() => {
    try {
      localStorage.setItem('blv_pc_controls_mode', pcControlsMode);
    } catch {
      // ignore
    }
    sceneRef.current?.setControlsMode(pcControlsMode);
  }, [pcControlsMode]);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<AbidjanSceneManager | null>(null);
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

  /**
   * Sauvegarde la partie dans son emplacement (état + position du joueur), sur l'appareil.
   * Le serveur reçoit toujours une copie : l'économie y est validée à partir de cet état.
   */
  const saveNow = useCallback(
    async (opts: { manual?: boolean; state?: PlayerState; fresh?: boolean; useCurrentPosition?: boolean } = {}): Promise<boolean> => {
      const slotNo = activeSlotRef.current;
      if (!slotNo) return false;
      const cur = opts.state ?? playerStateRef.current;
      const previous = opts.fresh ? null : slotsRef.current[slotNo - 1];
      let position: SavePosition | undefined = previous?.position;
      const scene = sceneRef.current;
      if ((!opts.state || opts.useCurrentPosition) && scene && !scene.hasPendingSpawn()) {
        const snap = scene.getRadarSnapshot();
        if (snap) position = { x: snap.playerX, z: snap.playerZ, rotY: snap.playerRotY };
      }
      const data = makeSlot(cur, previous?.name ?? defaultSlotName(cur), position);
      slotsRef.current = slotsRef.current.map((x, i) => (i === slotNo - 1 ? data : x));
      setSlots(slotsRef.current);
      persistServerState(cur);
      const ok = await writeSlot(slotNo, data);
      const fr = cur.language === 'fr';
      if (!ok && !saveFailWarnedRef.current) {
        saveFailWarnedRef.current = true;
        showToast(fr ? '⚠️ Sauvegarde impossible sur cet appareil (stockage plein ou bloqué)' : '⚠️ Cannot save on this device (storage full or blocked)');
      }
      if (ok) saveFailWarnedRef.current = false;
      return ok;
    },
    [persistServerState, showToast]
  );

  const renameSlotName = useCallback((slotNo: number, name: string) => {
    const cur = slotsRef.current[slotNo - 1];
    if (!cur) return;
    const data: SaveSlot = { ...cur, name, savedAt: Date.now() };
    slotsRef.current = slotsRef.current.map((x, i) => (i === slotNo - 1 ? data : x));
    setSlots(slotsRef.current);
    void writeSlot(slotNo, data);
  }, []);

  const removeSlot = useCallback((slotNo: number) => {
    slotsRef.current = slotsRef.current.map((x, i) => (i === slotNo - 1 ? null : x));
    setSlots(slotsRef.current);
    if (activeSlotRef.current === slotNo) activeSlotRef.current = null;
    void deleteSlot(slotNo);
  }, []);

  // Sauvegarde quand la page se cache ou se ferme (changement d'appli, fermeture de l'onglet, verrouillage du téléphone)
  useEffect(() => {
    const onHide = () => {
      if (screenStateRef.current === 'playing') void saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [saveNow]);

  // Sensibilité de la caméra (réglages) : réappliquée aussi quand l'état change, la scène pouvant être créée après le premier rendu.
  useEffect(() => {
    sceneRef.current?.setCameraSensitivity(cameraSensitivity);
  }, [cameraSensitivity, screenState]);

  useEffect(() => {
    sceneRef.current?.setPlayerModelScale(playerModelScale);
  }, [playerModelScale, screenState]);

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
    loadSlotsAsync().then(async (merged) => {
      if (!mounted) return;
      // On ne remplace pas la liste si une partie a déjà été sauvegardée entre-temps
      if (!activeSlotRef.current || isAutostart) {
        slotsRef.current = merged;
        setSlots(merged);
      }
      const recent = mostRecentPlayable(merged);
      const saved = recent ? recent.data.state : null;
      if (recent && saved && isAutostart) {
        const restored = saved.isDriving ? { ...saved, isDriving: false } : saved;
        const restoredPos = cleanPosition(recent.data.position);
        activeSlotRef.current = recent.slot;
        setPlayerState(restored);
        setCurrentDistrict(restoredPos ? districtAt({ x: restoredPos.x, z: restoredPos.z }).name : restored.destiny.district);
        sceneRef.current?.spawnPlayerAtDestiny(
          restored.destiny.spawnX,
          restored.destiny.spawnZ,
          restored.destiny.vehicle,
          restored.destiny.secondaryVehicle,
          restored.sapeOutfit,
          Boolean(restored.destiny.realMadridSuperstar),
          Boolean(restored.destiny.mysticBaraka),
          restored.destiny.homeType,
          `${restored.playerId}|${restored.destiny.id}`,
          restored.destiny.districtId,
          restored.destiny.id,
          restoredPos,
          restored.homeLotId ?? undefined
        );
        sceneRef.current?.syncCribUpgrades(restored.cribUpgrades);
      }

      const seedState = saved && !saved.isGameOver ? saved : playerStateRef.current;
      const session = await initServerSession(seedState);
      if (mounted && session) {
        setPlayerState((prev) => ({
          ...prev,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
          homeLotId: prev.homeLotId || session.homeLotId || null,
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
      const autoRecent = mostRecentPlayable(slotsRef.current);
      const autoPos = cleanPosition(autoRecent?.data.position);
      setCurrentDistrict(autoPos ? districtAt({ x: autoPos.x, z: autoPos.z }).name : p.destiny.district);
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
        p.destiny.id,
        autoPos,
        p.homeLotId ?? undefined
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

  // Navigation clavier de l'écran titre gérée directement par TitleScreen.tsx.

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
      void saveNow();
    }, 6000);

    return () => {
      clearInterval(timer);
      clearInterval(saveTimer);
      // On quitte le jeu (écran titre, game over, nouveau destin) : dernière sauvegarde avec la position
      void saveNow();
    };
  }, [screenState, saveNow]);

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
    // Nouvelle partie : premier emplacement vide (sinon on remplace la sauvegarde la moins récente)
    const pick = pickSlotForNewGame(slotsRef.current);
    activeSlotRef.current = pick.slot;
    if (pick.replaces) {
      showToast(
        fresh.language === 'fr'
          ? `Toutes les sauvegardes sont pleines : la sauvegarde ${pick.slot} est remplacée`
          : `All saves are full: save ${pick.slot} is replaced`
      );
    }
    void saveNow({ state: fresh, fresh: true, useCurrentPosition: Boolean(lot) });

    sceneRef.current?.syncCribUpgrades(fresh.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
    showToast(`🇨🇮 Bienvenue${profile ? ` ${profile.name}` : ''} à ${destiny.district} (${destiny.name}) !`);
  };

  const handleContinueSavedGame = (slotNo: number) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const entry = slotsRef.current[slotNo - 1];
    if (!entry || entry.state.isGameOver) return;
    const raw = entry.state;
    const cur = raw.isDriving ? { ...raw, isDriving: false } : raw;
    const restoredPos = cleanPosition(entry.position);
    activeSlotRef.current = slotNo;
    setPlayerState(cur);
    setCurrentDistrict(restoredPos ? districtAt({ x: restoredPos.x, z: restoredPos.z }).name : cur.destiny.district);
    setScreenState('playing');
    const lot = sceneRef.current?.spawnPlayerAtDestiny(
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
      cur.destiny.id,
      restoredPos,
      cur.homeLotId ?? undefined
    );
    if (lot?.id && !cur.homeLotId) {
      setPlayerState((prev) => ({ ...prev, homeLotId: lot.id }));
    }
    sceneRef.current?.syncCribUpgrades(cur.cribUpgrades);
    sceneRef.current?.setCameraMode('follow');
    sceneRef.current?.setPaused(false);
    // Identité de session fraîche : le jeton de l'ancienne sauvegarde peut être refusé par le serveur,
    // mais on garde la parcelle (homeLotId) de la sauvegarde pour que la maison ne déménage pas.
    void initServerSession(cur).then((session) => {
      if (!session || activeSlotRef.current !== slotNo) return;
      setPlayerState((prev) => ({
        ...prev,
        playerId: session.playerId,
        sessionToken: session.sessionToken,
        homeLotId: prev.homeLotId || session.homeLotId || null,
      }));
    });
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
          slots={slots.map((x) => (x ? { name: x.name, gameOver: x.state.isGameOver } : null))}
          onStartNewGame={() => setScreenState('roulette')}
          onContinueGame={handleContinueSavedGame}
          onRenameSlot={renameSlotName}
          onDeleteSlot={removeSlot}
          language={playerState.language}
          showHud={showHud}
          onToggleHud={() => setShowHud((v) => !v)}
          pcControlsMode={pcControlsMode}
          onChangeControlsMode={(mode) => setPcControlsMode(mode)}
          isMuted={isMuted}
          onToggleSound={handleToggleSound}
          onToggleLanguage={() =>
            setPlayerState((prev) => ({
              ...prev,
              language: prev.destiny.englishLock ? 'en' : prev.language === 'fr' ? 'en' : 'fr',
            }))
          }
          onEraseData={async () => {
            await purgeAllDataRGPD(playerState.playerId, playerState.sessionToken);
            activeSlotRef.current = null;
            slotsRef.current = Array.from({ length: SLOT_COUNT }, () => null);
            setSlots(slotsRef.current);
            setIsMuted(false);
            setPlayerState(createInitialPlayerState(rollDestiny()));
          }}
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
      {screenState === 'playing' && showHud && (
        <>
          <GameHUD
            playerState={playerState}
            currentDistrict={currentDistrict}
            nearbyHotspot={nearbyHotspot}
            nearbyVehicle={nearbyVehicle}
            getRadarSnapshot={getRadarSnapshot}
            touchControls={touchControls}
            onInteractClick={() => sceneRef.current?.triggerInteract()}
            onRepairEngine={handleRepairStalledEngine}
            onOpenPhone={() => setIsPhoneOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
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

      {/* MYOS SMARTPHONE */}
      {isPhoneOpen && screenState === 'playing' && (
        <MyOSPhone
          playerState={playerState}
          getGpsSource={getGpsSource}
          onClose={() => setIsPhoneOpen(false)}
          onSaveGame={() => saveNow({ manual: true })}
          playerModelScale={playerModelScale}
          onPlayerModelScaleChange={handlePlayerModelScaleChange}
          onEatFood={(foodId) => {
            const f = IVORIAN_FOODS.find((x) => x.id === foodId);
            if (f) {
              soundEngine.playCashSound();
              setPlayerState((prev) => eatFood(prev, f));
              syncEconomy('eat', { foodId });
            }
          }}
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
          showHud={showHud}
          onToggleHud={() => setShowHud((v) => !v)}
          pcControlsMode={pcControlsMode}
          onChangeControlsMode={(mode) => setPcControlsMode(mode)}
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
            setScreenState('title');
          }}
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
