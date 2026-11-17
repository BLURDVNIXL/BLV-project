import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  WeatherType,
  VehicleModelType,
  SapeOutfitId,
  RemotePlayer,
  CribUpgrades,
  PlayerGender,
} from '../types/game';
import {
  CharacterRig,
  VehicleRig,
  createBassamFuturisticSchool,
  createBridgeModel,
  createCashPickupMesh,
  createCathedralLandmark,
  createCharacterModel,
  createClassicLyceeStructure,
  createFloatingNameplate,
  createHotelIvoireLandmark,
  createLaPyramideLandmark,
  createMairiePlateauLandmark,
  createMaquisStructure,
  createMarketStallCluster,
  createPortCraneAndContainers,
  createStadeFhbLandmark,
  createTourPostelLandmark,
  createVehicleModel,
} from './models';
import {
  AnimatedWaterHandle,
  LIGHTING_MOODS,
  LightingMood,
  createAnimatedWaterMaterial,
  getLightingMood,
} from './materials';
import { AnimalSystem } from './animalSystem';
import { NPC_POOL_SIZE, NPC_POOL_SIZE_LOW } from '../world/budgets';
import { NpcSystem } from './npcSystem';
import { AvatarController, loadAvatar } from './avatars';
import { getWasmCore } from '../wasm/wasmBridge';
import {
  CharacterState,
  PhysicsCore,
  SolidFlag,
  VehiclePreset,
  VehiclePresetId,
  VehicleState,
  createCharacterState,
  createVehicleState,
  loadPhysics,
} from '../physics/PhysicsCore';
import { WorldStreamer } from '../world/WorldStreamer';
import { ChunkMaterials, createChunkMaterials } from '../world/chunkMesh';
import { daylight, sampleAmbient, sunDirection } from './ambiance';
import { createSkyDome, SkyDome } from './sky';
import { createChunkProvider } from '../world/chunkProvider';
import {
  HouseLot,
  SPECIAL_FOOTPRINTS,
  carSpotForLot,
  findHouseLot,
} from '../world/city';
import {
  HomeType,
  districtAt,
  isWater,
  projected,
} from '../world/abidjanGeography';
import { project, WORLD_SCALE } from '../world/geo';
import { bridgeAt } from '../world/roads';
import { findRoute, nearestRoadPoint } from '../world/routing';
import {
  pathLength,
  planTaxiApproach,
  pointAlongPath,
  taxiProgress,
  taxiRideProgress,
  taxiRideSeconds,
  taxiRouteTo,
  TaxiPath,
} from '../world/taxiApproach';
import { exteriorSolidsFor, type ExteriorSolid, type ExteriorSolidId } from '../world/exteriorSolids';
import { HOSPITAL_SITES } from '../world/hospitals';
import { INTERIORS, InteriorDef, InteriorId, PublicInteriorId, interiorToWorld } from '../world/interiors';
import { InteriorRig, createHospitalExterior, createInteriorRig } from './interiors';
import {
  HouseSpec,
  buildHouseFloorDef,
  facadeWorldSolids,
  getHouseUpgradeBoxes,
  houseToWorld,
  resolveHouseSpec,
} from '../world/playerHouses';
import { createHouseFacadeRig, createHouseFloorFurniture } from './houseModels';
import { RoadCar, updateRoadTraffic } from '../world/roadTraffic';
import { strHash } from '../world/rng';

export interface CityHotspot {
  id: string;
  label: string;
  district: string;
  x: number;
  z: number;
  radius: number;
  type:
    | 'eat'
    | 'loto'
    | 'vieux_sage'
    | 'work'
    | 'bank'
    | 'toilet'
    | 'shower'
    | 'sleep'
    | 'black_market'
    | 'yannis_academy'
    | 'interior_door'
    | 'interior_exit'
    | 'interior_stairs';
  color: number;
  targetFloor?: number;
  arrival?: { x: number; z: number; rotY: number };
}

export interface RadarSnapshot {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  district: string;
  hotspots: Array<{ id: string; label: string; x: number; z: number; color: number }>;
  /** Lieux fixes de la ville (sans les zones d'action de la maison) pour la grande carte. */
  places: Array<{ id: string; label: string; x: number; z: number; color: number }>;
  /** Position de ta maison (parcelle), null tant qu'elle n'est pas posée. */
  home: { x: number; z: number } | null;
  /** Perron de ta maison (là où le GPS te dépose), null tant qu'elle n'est pas posée. */
  homePorch: { x: number; z: number } | null;
  remotes: Array<{ name: string; x: number; z: number; color: string }>;
}

export interface SceneCallbacks {
  onNearestHotspotChange: (hotspot: CityHotspot | null) => void;
  onNearestVehicleChange: (vehicle: { id: string; label: string; type: VehicleModelType } | null) => void;
  onDistrictChange: (district: string) => void;
  onCashPickup: (amount: number) => void;
  onEngineStallChange: (stalled: boolean) => void;
  onInteractionTriggered: (hotspot: CityHotspot) => void;
  onVehicleToggle: (entering: boolean, vehicleType?: VehicleModelType) => void;
  onPositionTick: (pos: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    isDriving: boolean;
    vehicleType: VehicleModelType | null;
  }) => void;
  onHorn?: () => void;
  onPauseKey?: () => void;
  /** Cinématique du taxi (B3) : true = l'écran doit passer au noir, false = revenir à l'image. */
  onTaxiFade?: (dark: boolean) => void;
  /** Écran noir à l'arrivée : le joueur vient d'être déposé (le temps du trajet peut passer). */
  onTaxiRideArrived?: () => void;
  /** Cinématique terminée : le joueur est arrivé et peut de nouveau jouer. */
  onTaxiRideEnd?: () => void;
}

function vehicleTypeToPreset(type: VehicleModelType | null): VehiclePresetId {
  switch (type) {
    case 'gbaka':
      return VehiclePreset.GBAKA;
    case 'police_plcc':
      return VehiclePreset.POLICE;
    case 'rolls_royce_phantom':
    case 'berline_citadine':
      return VehiclePreset.LAND_CRUISER;
    case 'supercar_madrid':
    case 'bmw_m_series':
      return VehiclePreset.COUPE_GT;
    case 'woro_woro':
    default:
      return VehiclePreset.WORO_WORO;
  }
}

export class AbidjanSceneManager {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private routeGuide: THREE.Group | null = null;
  /** Cinématique du trajet (étape B3) : le joueur monte, le taxi roule sur l'itinéraire, puis il est déposé. */
  private taxiRide: {
    phase: 'board' | 'ride' | 'unfade';
    t: number;
    totalS: number;
    rig: VehicleRig;
    points: Array<{ x: number; z: number }>;
    length: number;
    dest: { x: number; z: number };
    heading: number;
    lastS: number;
    x: number;
    z: number;
    endFade: boolean;
  } | null = null;
  /** Woro-woro appelé (étape B2) : visible seulement chez le joueur, jamais envoyé aux autres joueurs. */
  private taxiApproach: {
    rig: VehicleRig;
    path: TaxiPath;
    /** Instant (s, horloge de la boucle) du départ du trajet courant. */
    t0: number;
    /** Durée (s) du trajet courant : le taxi s'arrête quelques secondes avant la montée. */
    arriveInS: number;
    /** Instant (s) de la montée : fin de l'attente annoncée au joueur. */
    boardAt: number;
    heading: number;
    lastS: number;
    nextCheck: number;
  } | null = null;
  private camera!: THREE.PerspectiveCamera;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  private physics: PhysicsCore | null = null;
  private streamer: WorldStreamer | null = null;
  private chunkMats!: ChunkMaterials;
  private npcSystem!: NpcSystem;
  private animalSystem!: AnimalSystem;

  private lagoonWaterHandle!: AnimatedWaterHandle;
  /** Dôme de ciel (null sur rendu logiciel : le fond uni est alors utilisé). */
  private skyDome: SkyDome | null = null;
  /** Direction unitaire du soleil (ou de la lune la nuit), mise à jour avec l'heure de jeu. */
  private sunDir = new THREE.Vector3(0.5, 0.78, 0.37).normalize();
  private floodWaterMesh!: THREE.Mesh;
  private bridgeSetNights: Array<(night: boolean) => void> = [];
  private beaconRings: THREE.Mesh[] = [];
  private cashPickups: Array<{ mesh: THREE.Group; active: boolean; x: number; z: number }> = [];

  private playerRig!: CharacterRig;
  /** Avatar GLB du joueur (genre choisi) ; l'ancien petit personnage sert de repli. */
  private playerAvatar: THREE.Object3D | null = null;
  private playerAvatarGender: PlayerGender | null = null;
  private playerAvatarCtl: AvatarController | null = null;
  private playerOutfit: SapeOutfitId = 'standard';
  private avatarRequestId = 0;
  private playerCharId = -1;
  private charState: CharacterState = createCharacterState();
  private carState: VehicleState = createVehicleState();
  private trafficState: VehicleState = createVehicleState();

  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private playerRotY = 0;
  private walkPhase = 0;
  private playerSquashY = 1;
  private jumpPending = false;
  private isSprinting = false;
  private isHandbraking = false;

  private spawnedVehicles: Array<{ id: string; vehId: number; rig: VehicleRig }> = [];
  private drivingVehicle: { id: string; vehId: number; rig: VehicleRig } | null = null;
  private engineStalled = false;

  private trafficCars: Array<RoadCar & { rig: VehicleRig }> = [];
  private remoteRigs: Map<
    string,
    {
      rig: CharacterRig;
      name: string;
      targetX: number;
      targetZ: number;
      prevX: number;
      prevZ: number;
      lastNetTime: number;
      rotY: number;
      /** Avatar 3D du joueur distant (genre reçu à la connexion) ; sinon petit personnage de repli. */
      gender: PlayerGender | null;
      avatar: THREE.Object3D | null;
      avatarCtl: AvatarController | null;
      outfit: SapeOutfitId;
      speed: number;
    }
  > = new Map();

  // Maison du joueur (façade extérieure fermée + intérieur dédié par destin et par étage)
  private ownHouseLot: HouseLot | null = null;
  private ownHouseSpec: HouseSpec | null = null;
  private ownHouseFacade: { group: THREE.Group; dispose: () => void } | null = null;
  private ownHouseDoorRing: THREE.Mesh | null = null;
  private ownHouseColliderIds: number[] = [];
  /** Solides des structures extérieures (étals, poteaux…) : calculés à la construction, enregistrés quand la physique est prête. */
  private exteriorSolidDefs: ExteriorSolid[] = [];
  private exteriorColliderIds: number[] = [];
  private ownUpgrades: CribUpgrades = { splitClim: false, bafflesMaquis: false, tv4k: false, canapeCuir: false };
  private ownHomeType: HomeType = 'studio';

  private staticHotspots: CityHotspot[] = [];
  private homeHotspots: CityHotspot[] = [];
  /** Portes des intérieurs (id de zone d'action → type d'intérieur, nom et point de retour devant la porte). */
  private interiorDoors = new Map<string, {
    interiorId: InteriorId;
    siteId: string;
    name: string;
    outX: number;
    outZ: number;
    outRotY: number;
  }>();
  /** Intérieur actuellement occupé par le joueur (téléportation dans une salle fermée hors carte). */
  private activeInterior: {
    id: InteriorId;
    def: InteriorDef;
    rig: InteriorRig;
    colliderIds: number[];
    hotspots: CityHotspot[];
    label: string;
    returnX: number;
    returnZ: number;
    returnRotY: number;
    prevPitch: number;
    prevDist: number;
  } | null = null;
  /** État actif si l'intérieur occupé appartient à la maison du joueur (étage + mises à jour d'améliorations). */
  private activeHouse: {
    spec: HouseSpec;
    floorIndex: number;
    upgradeColliderIds: number[];
    updateUpgrades: (u: CribUpgrades) => void;
  } | null = null;

  // Camera state: flyover (Title) vs follow (360° mouse drag + wheel zoom + building ray pull-in)
  private cameraMode: 'flyover' | 'follow' = 'flyover';
  private isPaused = false;
  private camYaw = 0.25;
  private camPitch = 0.34;
  private camDist = 11.5;
  private camPos = new THREE.Vector3(0, 32, 65);
  private camLook = new THREE.Vector3(0, 10, 0);
  private flyoverCenter = project(5.3258, -4.0185);
  private isDraggingCam = false;
  /** Doigt / pointeur qui oriente la caméra : les autres (joystick, 2e doigt) sont ignorés. */
  private camPointerId: number | null = null;
  /** Réglage du joueur (0,5 à 2,5), 1 = normal. */
  private camSensitivity = 1;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Input state
  private keys = new Set<string>();
  private joystickVec = { x: 0, y: 0 };
  private isSoftwareGl = false;
  /** Compteur de performance (`?blvdebug=1`) : absent sans le paramètre. */
  private debugEl: HTMLDivElement | null = null;
  private debugAcc = 0;
  private animFrameId: number | null = null;
  private softwareTimeoutId: number | null = null;
  private disposed = false;
  private lastTime = performance.now();
  private lastDistrict = 'Le Plateau';
  private lastRemoteTick = 0;
  private lastUiSync = 0;
  private currentMood: LightingMood = 'day';

  // Live simulation flags synced from React
  private weather: WeatherType = 'soleil';
  private gameTimeHours = 10;
  private policeWanted = 0;
  private star = 50;
  private isSuperstar = false;
  private mysticBaraka = false;

  // Pending spawn payload if PhysicsCore WASM finishes loading milliseconds after initial mount
  private pendingSpawnArgs: Parameters<AbidjanSceneManager['spawnPlayerAtDestiny']> | null = null;

  private callbacks: SceneCallbacks;
  private scratchVec = new THREE.Vector3();
  private scratchTarget = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.initRendererAndScene();
    this.bindInputs();
    this.bootPhysicsAndWorld();
    this.startLoop();
  }

  private initRendererAndScene() {
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const glName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    // `?quality=high` force le chemin graphique complet (ciel, eau, vent) même sur rendu logiciel : utile pour les tests.
    const forceHigh = typeof location !== 'undefined' && /[?&]quality=high/.test(location.search);
    this.isSoftwareGl = !forceHigh && /SwiftShader|llvmpipe|Software/i.test(glName);

    const lowEnd =
      this.isSoftwareGl ||
      /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      (navigator.hardwareConcurrency ?? 8) <= 4;

    this.renderer.setPixelRatio(this.isSoftwareGl ? 0.75 : Math.min(window.devicePixelRatio, lowEnd ? 1.5 : 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    // Sans cela, le navigateur tactile annule les glissements (pointercancel) pour défiler/zoomer : la caméra ne tourne presque pas.
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const day = LIGHTING_MOODS.day;
    this.scene.background = new THREE.Color(day.skyHex);
    this.scene.fog = new THREE.FogExp2(day.fogHex, this.isSoftwareGl ? 0.0042 : day.fogDensity);

    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.4, this.isSoftwareGl ? 280 : 720);

    if (!this.isSoftwareGl) {
      this.skyDome = createSkyDome(this.camera.far * 0.9);
      this.scene.add(this.skyDome.mesh);
    }

    if (!this.isSoftwareGl) {
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      } catch {
        // Safe fallback
      }
    }

    this.hemiLight = new THREE.HemisphereLight(day.hemiSky, day.hemiGround, day.hemiIntensity);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(day.sunColor, day.sunIntensity);
    this.dirLight.position.set(this.flyoverCenter.x + 110, 145, this.flyoverCenter.z + 75);
    if (!this.isSoftwareGl) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.set(1024, 1024);
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 360;
      const d = 120;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 1. Animated Lagune Ébrié & Océan Atlantique base plane across full Abidjan extent (X/Z ~ 7500m)
    this.lagoonWaterHandle = createAnimatedWaterMaterial(0x0b6b86, 1.0, this.isSoftwareGl);
    const lagoonMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7600, 7600, this.isSoftwareGl ? 1 : 48, this.isSoftwareGl ? 1 : 48),
      this.lagoonWaterHandle.material
    );
    lagoonMesh.rotation.x = -Math.PI / 2;
    lagoonMesh.position.y = -0.35;
    lagoonMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(lagoonMesh);

    // Rising flood plane (hidden unless weather === 'inondation')
    const floodMat = new THREE.MeshStandardMaterial({
      color: 0x155e75,
      transparent: true,
      opacity: 0.72,
      roughness: 0.16,
    });
    this.floodWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(7600, 7600), floodMat);
    this.floodWaterMesh.rotation.x = -Math.PI / 2;
    this.floodWaterMesh.position.y = -1.8;
    this.floodWaterMesh.visible = false;
    this.scene.add(this.floodWaterMesh);

    // 2. Chunk Materials + 5 Abidjan Bridges + Hero Landmarks + Pedestrian NPCs
    this.chunkMats = createChunkMaterials(false, !this.isSoftwareGl);
    this.buildAllBridges();
    this.buildStaticHeroLandmarks();
    this.buildStaticHotspotsAndPickups();

    this.npcSystem = new NpcSystem(this.scene, this.isSoftwareGl ? NPC_POOL_SIZE_LOW : NPC_POOL_SIZE);
    this.animalSystem = new AnimalSystem(this.scene, this.isSoftwareGl);
    this.initDebugOverlay();

    // 3. Player Character Rig
    this.playerRig = createCharacterModel(0x5c3824, 'standard', true);
    this.playerRig.group.position.set(this.flyoverCenter.x, 0, this.flyoverCenter.z);
    this.scene.add(this.playerRig.group);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildAllBridges() {
    this.bridgeSetNights = [];
    for (const { b, a, z } of projected.bridges) {
      const widthGame = Math.max(7, b.widthM * WORLD_SCALE * 1.15);
      const model = createBridgeModel(b.id, a, z, widthGame);
      this.scene.add(model.group);
      this.bridgeSetNights.push(model.setNight);
    }
  }

  private buildStaticHeroLandmarks() {
    this.exteriorSolidDefs = [];
    const placeSpecial = (specId: string, mesh: THREE.Group, solidId?: ExteriorSolidId) => {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === specId);
      if (!fp) return;
      mesh.position.set(fp.x, 0, fp.z);
      mesh.rotation.y = -fp.angle;
      this.scene.add(mesh);
      if (solidId) this.exteriorSolidDefs.push(...exteriorSolidsFor(solidId, fp.x, fp.z, mesh.rotation.y, fp.w, fp.d));
    };

    placeSpecial('stade', createStadeFhbLandmark());
    placeSpecial('cathedrale', createCathedralLandmark());
    placeSpecial('hotel_ivoire', createHotelIvoireLandmark());
    placeSpecial('lycee_alex', createBassamFuturisticSchool());
    const caimanFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'lycee_caiman');
    if (caimanFp) {
      placeSpecial('lycee_caiman', createClassicLyceeStructure(caimanFp.w, caimanFp.d, caimanFp.spec.h, 0xfef3c7, 0xb45309), 'lycee');
    }
    const alysmaFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'lycee_alysma');
    if (alysmaFp) {
      placeSpecial('lycee_alysma', createClassicLyceeStructure(alysmaFp.w, alysmaFp.d, alysmaFp.spec.h, 0xfff1f2, 0xbe123c), 'lycee');
    }
    const marcheFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
    if (marcheFp) {
      placeSpecial('marche_adjame', createMarketStallCluster(marcheFp.w, marcheFp.d, marcheFp.spec.h), 'marche_adjame');
    }

    // Hôpitaux : bâtiments héros à porte d'entrée (intérieur partagé)
    for (const site of HOSPITAL_SITES) {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === site.id);
      if (!fp) continue;
      placeSpecial(site.id, createHospitalExterior(fp.w, fp.d, fp.spec.h, site.name), 'hopital');
    }

    const portFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'port');
    if (portFp) {
      const port = createPortCraneAndContainers();
      port.position.set(portFp.x, 0, portFp.z);
      port.rotation.y = -portFp.angle;
      this.scene.add(port);
    }

    // Iconic Plateau & Yopougon landmarks
    const pyramide = createLaPyramideLandmark();
    const pPyr = project(5.3258, -4.0185);
    pyramide.position.set(pPyr.x, 0, pPyr.z);
    this.scene.add(pyramide);
    this.exteriorSolidDefs.push(...exteriorSolidsFor('pyramide', pPyr.x, pPyr.z, 0, 16, 16));

    const postel = createTourPostelLandmark();
    const pPos = project(5.3242, -4.0195);
    postel.position.set(pPos.x, 0, pPos.z);
    this.scene.add(postel);
    this.exteriorSolidDefs.push(...exteriorSolidsFor('postel', pPos.x, pPos.z, 0, 12, 12));

    const mairieFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'mairie');
    if (mairieFp) {
      placeSpecial('mairie', createMairiePlateauLandmark(), 'mairie');
    }

    const maquisFp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'maquis');
    if (maquisFp) {
      placeSpecial('maquis', createMaquisStructure(maquisFp.w, maquisFp.d, maquisFp.spec.h), 'maquis');
    }
  }

  private addBeaconHotspot(h: CityHotspot) {
    this.staticHotspots.push(h);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.55, 24),
      new THREE.MeshBasicMaterial({ color: h.color, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(h.x, 0.08, h.z);
    this.scene.add(ring);
    this.beaconRings.push(ring);
  }

  private buildStaticHotspotsAndPickups() {
    this.staticHotspots = [];
    this.beaconRings = [];

    // Portes d'intérieurs : zone d'action devant l'entrée (la façade est du côté +z local de l'emprise)
    this.interiorDoors.clear();
    for (const site of HOSPITAL_SITES) {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === site.id);
      if (!fp) continue;
      const vx = -Math.sin(fp.angle);
      const vz = Math.cos(fp.angle);
      const hx = fp.x + vx * (fp.d / 2 + 2.2);
      const hz = fp.z + vz * (fp.d / 2 + 2.2);
      this.registerInteriorDoor({
        id: `door_${site.id}`,
        interiorId: 'hopital',
        siteId: site.id,
        name: site.name,
        label: `🏥 Entrer — ${site.name}`,
        district: districtAt({ x: fp.x, z: fp.z }).name,
        doorX: hx,
        doorZ: hz,
        outX: fp.x + vx * (fp.d / 2 + 3.6),
        outZ: fp.z + vz * (fp.d / 2 + 3.6),
        outRotY: -fp.angle,
        radius: 3.4,
        color: 0xef4444,
      });
    }

    // 2. Grands lieux interactifs d'Abidjan
    const pMaquis = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'maquis');
    if (pMaquis) {
      const vx = -Math.sin(pMaquis.angle);
      const vz = Math.cos(pMaquis.angle);
      this.registerInteriorDoor({
        id: 'door_maquis',
        interiorId: 'maquis',
        siteId: 'maquis',
        name: pMaquis.spec.name,
        label: '🍗 Entrer — Maquis Le Temple · Rue Princesse',
        district: districtAt({ x: pMaquis.x, z: pMaquis.z }).name,
        doorX: pMaquis.x + vx * (pMaquis.d / 2 + 2.4),
        doorZ: pMaquis.z + vz * (pMaquis.d / 2 + 2.4),
        outX: pMaquis.x + vx * (pMaquis.d / 2 + 3.8),
        outZ: pMaquis.z + vz * (pMaquis.d / 2 + 3.8),
        outRotY: -pMaquis.angle,
        radius: 3.4,
        color: 0xf97316,
      });
    }

    const pMarche = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
    if (pMarche) {
      const vx = -Math.sin(pMarche.angle);
      const vz = Math.cos(pMarche.angle);
      this.registerInteriorDoor({
        id: 'door_adjame',
        interiorId: 'marche_adjame',
        siteId: 'marche_adjame',
        name: pMarche.spec.name,
        label: "🛒 Entrer — Marché d'Adjamé",
        district: districtAt({ x: pMarche.x, z: pMarche.z }).name,
        doorX: pMarche.x + vx * (pMarche.d / 2 + 2.4),
        doorZ: pMarche.z + vz * (pMarche.d / 2 + 2.4),
        outX: pMarche.x + vx * (pMarche.d / 2 + 3.8),
        outZ: pMarche.z + vz * (pMarche.d / 2 + 3.8),
        outRotY: -pMarche.angle,
        radius: 3.4,
        color: 0xf97316,
      });
      this.addBeaconHotspot({
        id: 'work_adjame',
        label: '💼 Grand Marché d’Adjamé (Commerce)',
        district: 'Adjamé',
        x: pMarche.x + vx * (pMarche.d / 2 + 10.5),
        z: pMarche.z + vz * (pMarche.d / 2 + 10.5),
        radius: 4.5,
        type: 'work',
        color: 0x10b981,
      });
    }

    const pMairie = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'mairie');
    if (pMairie) {
      const vx = -Math.sin(pMairie.angle);
      const vz = Math.cos(pMairie.angle);
      this.registerInteriorDoor({
        id: 'door_mairie',
        interiorId: 'mairie',
        siteId: 'mairie',
        name: pMairie.spec.name,
        label: '🏛️ Entrer — Mairie du Plateau',
        district: districtAt({ x: pMairie.x, z: pMairie.z }).name,
        doorX: pMairie.x + vx * (pMairie.d / 2 + 2.4),
        doorZ: pMairie.z + vz * (pMairie.d / 2 + 2.4),
        outX: pMairie.x + vx * (pMairie.d / 2 + 3.8),
        outZ: pMairie.z + vz * (pMairie.d / 2 + 3.8),
        outRotY: -pMairie.angle,
        radius: 3.4,
        color: 0x0f766e,
      });
    }

    const lyceeDoors: Array<{ id: 'lycee_caiman' | 'lycee_alysma' | 'lycee_alex'; label: string; color: number }> = [
      { id: 'lycee_caiman', label: '🐊 Entrer — Lycée Classique', color: 0xd97706 },
      { id: 'lycee_alysma', label: '🌸 Entrer — Lycée Sainte-Marie', color: 0xe11d48 },
      { id: 'lycee_alex', label: "🎓 Entrer — Lycée d'Excellence de Bassam", color: 0x0284c7 },
    ];
    for (const ld of lyceeDoors) {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === ld.id);
      if (!fp) continue;
      const vx = -Math.sin(fp.angle);
      const vz = Math.cos(fp.angle);
      this.registerInteriorDoor({
        id: `door_${ld.id}`,
        interiorId: ld.id,
        siteId: ld.id,
        name: fp.spec.name,
        label: ld.label,
        district: districtAt({ x: fp.x, z: fp.z }).name,
        doorX: fp.x + vx * (fp.d / 2 + 2.4),
        doorZ: fp.z + vz * (fp.d / 2 + 2.4),
        outX: fp.x + vx * (fp.d / 2 + 3.8),
        outZ: fp.z + vz * (fp.d / 2 + 3.8),
        outRotY: -fp.angle,
        radius: 3.4,
        color: ld.color,
      });
    }

    const pStade = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'stade');
    if (pStade) {
      this.addBeaconHotspot({
        id: 'yannis_academy_stade',
        label: '⚽ Stade FHB · Fondation Yannis #25',
        district: 'Le Plateau',
        x: pStade.x,
        z: pStade.z + 36,
        radius: 7,
        type: 'yannis_academy',
        color: 0xfbbf24,
      });
    }

    const pLoto = project(5.3245, -4.017);
    this.addBeaconHotspot({
      id: 'loto_plateau',
      label: '🎟️ Kiosque Loto Akwaba · Plateau',
      district: 'Le Plateau',
      x: pLoto.x,
      z: pLoto.z,
      radius: 4.5,
      type: 'loto',
      color: 0xeab308,
    });

    const pBoulay = project(5.3135, -4.063);
    this.addBeaconHotspot({
      id: 'vieux_sage',
      label: '🔮 Sanctuaire Île Boulay (Lavage d’Étoile)',
      district: 'Île Boulay',
      x: pBoulay.x,
      z: pBoulay.z,
      radius: 5.5,
      type: 'vieux_sage',
      color: 0x8b5cf6,
    });

    const pDocks = project(5.308, -4.011);
    this.addBeaconHotspot({
      id: 'black_market_docks',
      label: '🕶️ Docks Treichville (Marché Noir)',
      district: 'Treichville',
      x: pDocks.x,
      z: pDocks.z,
      radius: 5,
      type: 'black_market',
      color: 0xef4444,
    });

    // Cash pickups scattered around key landmarks
    const pickupCoords = [
      project(5.325, -4.019),
      project(5.355, -4.023),
      project(5.336, -4.074),
      project(5.311, -4.012),
      project(5.301, -3.982),
      project(5.359, -3.994),
    ];
    for (const pc of pickupCoords) {
      const mesh = createCashPickupMesh();
      mesh.position.set(pc.x + 4, 0, pc.z + 4);
      this.scene.add(mesh);
      this.cashPickups.push({ mesh, active: true, x: pc.x + 4, z: pc.z + 4 });
    }
  }

  private async bootPhysicsAndWorld() {
    try {
      const core = await loadPhysics();
      if (this.disposed) return;
      this.physics = core;
      this.physics.reset();
      this.npcSystem.setPhysics(core); // pool de personnages des PNJ (après reset, qui efface les personnages)
      this.animalSystem.setPhysics(core); // personnages des animaux (même raison)
      this.registerExteriorSolids(core);

      const lowEnd =
        this.isSoftwareGl ||
        /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
        (navigator.hardwareConcurrency ?? 8) <= 4;

      this.streamer = new WorldStreamer(
        this.scene,
        core,
        createChunkProvider([]),
        this.chunkMats,
        this.isSoftwareGl ? 3 : lowEnd ? 3 : 4
      );

      // Spawn AI Traffic cars via roadTraffic.ts
      const trafficCount = this.isSoftwareGl ? 4 : 8;
      for (let t = 0; t < trafficCount; t++) {
        const vType: VehicleModelType =
          t % 4 === 0 ? 'gbaka' : t % 4 === 1 ? 'woro_woro' : t % 4 === 2 ? 'berline_citadine' : 'police_plcc';
        const vehId = core.createVehicle(vehicleTypeToPreset(vType), 0, 0, 0);
        if (vehId >= 0) {
          core.setVehicleEnabled(vehId, false);
          const rig = createVehicleModel(vType);
          rig.group.visible = false;
          rig.group.rotation.order = 'YXZ';
          this.scene.add(rig.group);
          this.trafficCars.push({
            rig,
            vehId,
            art: 0,
            dir: 1,
            targetSpeed: 11 + (t % 3) * 2,
            stuckTimer: 0,
            wait: 0.3 + t * 0.4,
          });
        }
      }

      if (this.pendingSpawnArgs) {
        const args = this.pendingSpawnArgs;
        this.pendingSpawnArgs = null;
        this.spawnPlayerAtDestiny(...args);
      }
    } catch (err) {
      console.error('Physics WASM failed to initialize:', err);
    }
  }

  /** Enregistre les solides des structures extérieures (une fois : la scène statique n'est jamais rechargée). */
  private registerExteriorSolids(core: PhysicsCore) {
    for (const id of this.exteriorColliderIds) core.removeSolid(id);
    this.exteriorColliderIds = [];
    for (const s of this.exteriorSolidDefs) {
      const id = s.shape === 'box'
        ? core.addBox(s.x, s.z, s.hx, s.hz, s.angle, s.h, SolidFlag.PROP)
        : core.addCircle(s.x, s.z, s.r, s.h, SolidFlag.PROP);
      if (id >= 0) this.exteriorColliderIds.push(id);
    }
  }

  private rebuildStreamerReservedLots() {
    if (!this.physics) return;
    const reserved: string[] = [];
    if (this.ownHouseLot) reserved.push(this.ownHouseLot.id);
    if (this.streamer) {
      this.streamer.dispose();
    }
    const lowEnd =
      this.isSoftwareGl ||
      /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      (navigator.hardwareConcurrency ?? 8) <= 4;
    this.streamer = new WorldStreamer(
      this.scene,
      this.physics,
      createChunkProvider(reserved),
      this.chunkMats,
      this.isSoftwareGl ? 3 : lowEnd ? 3 : 4
    );
  }

  private disposeOwnHouse() {
    if (this.physics) {
      for (const id of this.ownHouseColliderIds) this.physics.removeSolid(id);
    }
    this.ownHouseColliderIds = [];
    if (this.ownHouseFacade) {
      this.scene.remove(this.ownHouseFacade.group);
      this.ownHouseFacade.dispose();
      this.ownHouseFacade = null;
    }
    if (this.ownHouseDoorRing) {
      this.scene.remove(this.ownHouseDoorRing);
      this.ownHouseDoorRing.geometry.dispose();
      (this.ownHouseDoorRing.material as THREE.Material).dispose();
      this.ownHouseDoorRing = null;
    }
    this.interiorDoors.delete('door_home');
  }

  private buildHomeHotspots(lot: HouseLot, spec: HouseSpec) {
    this.homeHotspots = [];
    const districtName = districtAt({ x: lot.x, z: lot.z }).name;
    const doorPos = houseToWorld(lot.x, lot.z, lot.rotationY, 0, spec.facade.doorZ);
    const porch = houseToWorld(lot.x, lot.z, lot.rotationY, 0, spec.facade.porchZ);

    this.interiorDoors.set('door_home', {
      interiorId: 'house_floor_0',
      siteId: spec.destinyId,
      name: spec.name,
      outX: porch.x,
      outZ: porch.z,
      outRotY: lot.rotationY,
    });
    this.homeHotspots.push({
      id: 'door_home',
      label: `🏠 Entrer — ${spec.name}`,
      district: districtName,
      x: doorPos.x,
      z: doorPos.z,
      radius: spec.facade.doorRadius,
      type: 'interior_door',
      color: spec.facade.doorColor,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: spec.facade.doorColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(doorPos.x, 0.08, doorPos.z);
    this.scene.add(ring);
    this.ownHouseDoorRing = ring;

    // Garbadrome de quartier dans la rue devant la parcelle
    const curbSpot = carSpotForLot(lot);
    const streetX = curbSpot.x + Math.sin(curbSpot.heading) * 14;
    const streetZ = curbSpot.z + Math.cos(curbSpot.heading) * 14;
    if (!isWater({ x: streetX, z: streetZ })) {
      this.homeHotspots.push({
        id: 'local_garba',
        label: '🍲 Garbadrome du Quartier',
        district: districtAt({ x: streetX, z: streetZ }).name,
        x: streetX,
        z: streetZ,
        radius: 4.5,
        type: 'eat',
        color: 0xea580c,
      });
    }
  }

  public spawnPlayerAtDestiny(
    spawnX: number,
    spawnZ: number,
    primaryVehicle: VehicleModelType | null,
    secondaryVehicle?: VehicleModelType,
    outfit: SapeOutfitId = 'standard',
    isSuperstar = false,
    mysticBaraka = false,
    homeType: HomeType = 'studio',
    seedKey = 'blv_default',
    preferredDistrict?: string,
    destinyId?: string
  ): HouseLot | null {
    this.ownHomeType = homeType;
    this.isSuperstar = isSuperstar;
    this.mysticBaraka = mysticBaraka;
    this.applyPlayerOutfit(outfit);

    if (!this.physics) {
      this.pendingSpawnArgs = [
        spawnX,
        spawnZ,
        primaryVehicle,
        secondaryVehicle,
        outfit,
        isSuperstar,
        mysticBaraka,
        homeType,
        seedKey,
        preferredDistrict,
        destinyId,
      ];
      this.playerX = spawnX;
      this.playerZ = spawnZ;
      this.playerRig.group.position.set(spawnX, 0, spawnZ);
      return null;
    }

    const core = this.physics;

    // Si on recommence ou change de destin depuis un intérieur, on le libère proprement
    if (this.activeInterior) {
      for (const id of this.activeInterior.colliderIds) core.removeSolid(id);
      if (this.activeHouse) {
        for (const id of this.activeHouse.upgradeColliderIds) core.removeSolid(id);
        this.activeHouse = null;
      }
      this.scene.remove(this.activeInterior.rig.group);
      this.activeInterior.rig.dispose();
      this.activeInterior = null;
      this.npcSystem.setIndoor(false);
      this.animalSystem.setIndoor(false);
    }

    // Clear old vehicles & characters & houses
    for (const v of this.spawnedVehicles) {
      this.scene.remove(v.rig.group);
      core.destroyVehicle(v.vehId);
    }
    this.spawnedVehicles = [];
    this.drivingVehicle = null;
    this.engineStalled = false;

    if (this.playerCharId >= 0) {
      core.destroyCharacter(this.playerCharId);
      this.playerCharId = -1;
    }
    this.disposeOwnHouse();

    // 1. Find deterministic HouseLot on a real road in the matching district
    const seed = strHash(seedKey);
    const foundLot = findHouseLot(homeType, seed, undefined, preferredDistrict);
    const lot: HouseLot = foundLot ?? {
      id: `fallback_${seed}`,
      district: 'plateau',
      x: spawnX,
      z: spawnZ,
      front: { x: 0, z: 1 },
      rotationY: 0,
      width: 16,
      depth: 16,
      toStreet: 8,
      homes: [homeType],
    };
    this.ownHouseLot = lot;

    this.rebuildStreamerReservedLots();

    // 2. Façade fermée + solides extérieurs + porte-balise de la maison du destin
    const resolvedId = destinyId ?? seedKey.split('|').slice(1).join('|');
    const spec = resolveHouseSpec(resolvedId, homeType);
    this.ownHouseSpec = spec;
    const facade = createHouseFacadeRig(spec);
    facade.group.position.set(lot.x, 0, lot.z);
    facade.group.rotation.y = lot.rotationY;
    this.scene.add(facade.group);
    this.ownHouseFacade = facade;

    for (const s of facadeWorldSolids(spec, lot.x, lot.z, lot.rotationY)) {
      const id = core.addBox(
        s.x,
        s.z,
        s.hx,
        s.hz,
        s.angle,
        s.h,
        s.flag === 'building' ? SolidFlag.BUILDING : SolidFlag.PROP
      );
      if (id >= 0) this.ownHouseColliderIds.push(id);
    }
    this.buildHomeHotspots(lot, spec);

    // 3. On apparaît sur le perron, face à sa porte ; la caméra est côté rue et voit la façade
    const porch = houseToWorld(lot.x, lot.z, lot.rotationY, 0, spec.facade.porchZ);
    this.playerX = porch.x;
    this.playerY = 0;
    this.playerZ = porch.z;
    const faceDoor = lot.rotationY + Math.PI;
    this.playerRotY = faceDoor;
    this.playerCharId = core.createCharacter(porch.x, porch.z, 0.35);
    core.faceCharacter(this.playerCharId, faceDoor, true);
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(porch.x, 0, porch.z);
    this.playerRig.group.rotation.y = faceDoor;

    // 4. Spawn player vehicle(s) parked cleanly on the street outside lot
    const curb = carSpotForLot(lot);
    if (primaryVehicle) {
      const vehId = core.createVehicle(vehicleTypeToPreset(primaryVehicle), curb.x, curb.z, curb.heading);
      const rig = createVehicleModel(primaryVehicle);
      rig.group.position.set(curb.x, 0, curb.z);
      rig.group.rotation.order = 'YXZ';
      rig.group.rotation.y = curb.heading;
      this.scene.add(rig.group);
      this.spawnedVehicles.push({ id: `player_v1_${primaryVehicle}`, vehId, rig });
    }
    if (secondaryVehicle) {
      const s2x = curb.x - Math.sin(curb.heading) * 6.5;
      const s2z = curb.z - Math.cos(curb.heading) * 6.5;
      const vehId = core.createVehicle(vehicleTypeToPreset(secondaryVehicle), s2x, s2z, curb.heading);
      const rig = createVehicleModel(secondaryVehicle);
      rig.group.position.set(s2x, 0, s2z);
      rig.group.rotation.order = 'YXZ';
      rig.group.rotation.y = curb.heading;
      this.scene.add(rig.group);
      this.spawnedVehicles.push({ id: `player_v2_${secondaryVehicle}`, vehId, rig });
    }

    // 5. Caméra derrière le joueur (côté rue), face à la façade
    this.camYaw = lot.rotationY;
    this.camPitch = 0.32;
    this.camDist = 9.5;
    this.camPos.set(
      porch.x + Math.sin(this.camYaw) * 9.5,
      5.2,
      porch.z + Math.cos(this.camYaw) * 9.5
    );
    this.camLook.set(porch.x, 1.5, porch.z);

    // Pre-warm chunks immediately around spawn
    this.streamer?.update(porch.x, porch.z, 9);

    return lot;
  }

  public setCameraMode(mode: 'flyover' | 'follow') {
    this.cameraMode = mode;
    if (mode === 'follow') {
      this.camPos.set(
        this.playerX + Math.sin(this.camYaw) * 9.5,
        this.playerY + 5,
        this.playerZ + Math.cos(this.camYaw) * 9.5
      );
      this.camLook.set(this.playerX, this.playerY + 1.5, this.playerZ);
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.keys.clear();
      this.joystickVec = { x: 0, y: 0 };
      this.isDraggingCam = false;
      this.camPointerId = null;
      this.isSprinting = false;
      this.isHandbraking = false;
    }
  }

  public setOutfit(outfit: SapeOutfitId) {
    this.applyPlayerOutfit(outfit);
  }

  /** Tenue du joueur : petit personnage de repli et avatar 3D (si chargé). */
  private applyPlayerOutfit(outfit: SapeOutfitId) {
    this.playerOutfit = outfit;
    this.playerRig.applyOutfit(outfit);
    this.playerAvatarCtl?.applyOutfit(outfit);
  }

  /**
   * Affiche l'avatar 3D du genre choisi (Homme → garçon, Femme → fille).
   * Sans genre (ancienne sauvegarde) ou si le chargement échoue, le petit
   * personnage procédural reste affiché.
   */
  public setPlayerGender(gender?: PlayerGender) {
    if (!gender || gender === this.playerAvatarGender) return;
    const requestId = ++this.avatarRequestId;
    loadAvatar(gender)
      .then(({ root, animations }) => {
        if (this.disposed || requestId !== this.avatarRequestId) return;
        if (this.playerAvatar) this.playerRig.group.remove(this.playerAvatar);
        this.playerAvatar = root;
        this.playerAvatarGender = gender;
        this.playerRig.group.add(root);
        this.playerAvatarCtl = new AvatarController(root, animations);
        this.playerAvatarCtl.applyOutfit(this.playerOutfit);
        this.playerRig.bodyPivot.visible = false;
      })
      .catch((err) => {
        console.warn('[BLV] Avatar 3D indisponible, repli sur le personnage simple', err);
      });
  }

  public syncCribUpgrades(u: CribUpgrades) {
    this.ownUpgrades = u;
    if (!this.activeHouse || !this.physics) return;
    const core = this.physics;
    for (const id of this.activeHouse.upgradeColliderIds) core.removeSolid(id);
    this.activeHouse.upgradeColliderIds = [];
    const floor = this.activeHouse.spec.floors[this.activeHouse.floorIndex];
    const origin = this.activeInterior?.def.origin;
    if (floor && origin) {
      for (const b of getHouseUpgradeBoxes(floor, u)) {
        const id = core.addBox(origin.x + b.x, origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
        if (id >= 0) this.activeHouse.upgradeColliderIds.push(id);
      }
    }
    this.activeHouse.updateUpgrades(u);
  }

  public updateWorldConditions(weather: WeatherType, gameTimeHours: number, policeWanted: number, star = 50) {
    this.weather = weather;
    this.gameTimeHours = gameTimeHours;
    this.policeWanted = policeWanted;
    this.star = star;

    const mood = getLightingMood(gameTimeHours);
    if (mood !== this.currentMood) {
      this.currentMood = mood;
      const isNight = mood === 'night';
      this.chunkMats.setNight(isNight);
      this.bridgeSetNights.forEach((fn) => fn(isNight));
    }

    // Ambiance continue : palette chaude interpolée selon l'heure, soleil qui voyage d'est en ouest
    const amb = sampleAmbient(gameTimeHours);
    sunDirection(gameTimeHours, this.sunDir);
    const isNightMood = mood === 'night';
    const zenith = amb.zenith.clone();
    const horizon = amb.horizon.clone();
    let sunInt = amb.sunIntensity;
    let fogDensity = amb.fogDensity;
    let skyGlowScale = 1;
    let glint = daylight(gameTimeHours);

    if (weather === 'pluie' || weather === 'inondation') {
      horizon.setHex(isNightMood ? 0x09101d : 0x475569);
      zenith.setHex(isNightMood ? 0x050911 : 0x2e3a4c);
      sunInt *= 0.55;
      fogDensity = 0.0032;
      skyGlowScale = 0.1;
      glint *= 0.15;
    } else if (weather === 'harmattan') {
      horizon.setHex(isNightMood ? 0x1e1810 : 0xd6b07c);
      zenith.setHex(isNightMood ? 0x120e08 : 0xb89868);
      sunInt *= 0.85;
      fogDensity = 0.0045;
      skyGlowScale = 0.35;
      glint *= 0.5;
    }

    this.dirLight.color.copy(amb.sunColor);
    this.dirLight.intensity = sunInt;
    this.hemiLight.color.copy(amb.hemiSky);
    this.hemiLight.groundColor.copy(amb.hemiGround);
    this.hemiLight.intensity = amb.hemiIntensity;
    this.renderer.toneMappingExposure = amb.exposure;
    // Le brouillard prend la couleur de l'horizon : la ville se fond dans le ciel sans couture
    (this.scene.background as THREE.Color).copy(horizon);
    (this.scene.fog as THREE.FogExp2).color.copy(horizon);
    (this.scene.fog as THREE.FogExp2).density = fogDensity;

    this.skyDome?.apply(amb, this.sunDir, { zenith, horizon, glowScale: skyGlowScale });
    this.lagoonWaterHandle.setAmbient(this.sunDir, amb.sunColor, horizon, glint);
  }

  public syncRemotePlayers(players: RemotePlayer[]) {
    const activeIds = new Set(players.map((p) => p.id));

    for (const [id, entry] of this.remoteRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.rig.group);
        this.remoteRigs.delete(id);
      }
    }

    const nowMs = performance.now();
    for (const p of players) {
      let entry = this.remoteRigs.get(p.id);
      if (!entry) {
        const rig = createCharacterModel(0x5c3824, p.sapeOutfit || 'standard', true);
        const nameplate = createFloatingNameplate(p.name || 'Joueur Babi', '#1e293b');
        nameplate.position.set(0, 2.55, 0);
        rig.group.add(nameplate);
        rig.group.position.set(p.x, p.y, p.z);
        this.scene.add(rig.group);
        entry = {
          rig,
          name: p.name || 'Joueur Babi',
          targetX: p.x,
          targetZ: p.z,
          prevX: p.x,
          prevZ: p.z,
          lastNetTime: nowMs,
          rotY: p.rotY,
          gender: null,
          avatar: null,
          avatarCtl: null,
          outfit: p.sapeOutfit || 'standard',
          speed: 0,
        };
        this.remoteRigs.set(p.id, entry);
        this.attachRemoteAvatar(p.id, entry, p.gender);
      } else {
        entry.prevX = entry.rig.group.position.x;
        entry.prevZ = entry.rig.group.position.z;
        entry.targetX = p.x;
        entry.targetZ = p.z;
        entry.lastNetTime = nowMs;
        entry.rotY = p.rotY;
        entry.outfit = p.sapeOutfit || 'standard';
        entry.rig.applyOutfit(entry.outfit);
        entry.avatarCtl?.applyOutfit(entry.outfit);
        this.attachRemoteAvatar(p.id, entry, p.gender);
      }
    }
  }

  /** Remplace le petit personnage d'un joueur distant par l'avatar de son genre (sans effet si absent ou déjà fait). */
  private attachRemoteAvatar(id: string, entry: { rig: CharacterRig; gender: PlayerGender | null; avatar: THREE.Object3D | null; avatarCtl: AvatarController | null; outfit: SapeOutfitId }, gender?: PlayerGender) {
    if (!gender || gender === entry.gender) return;
    entry.gender = gender; // évite de relancer le chargement à chaque message réseau
    loadAvatar(gender)
      .then(({ root, animations }) => {
        // Le joueur a pu partir (ou la scène être détruite) pendant le chargement.
        if (this.disposed || this.remoteRigs.get(id) !== entry || entry.gender !== gender) return;
        if (entry.avatar) entry.rig.group.remove(entry.avatar);
        entry.avatar = root;
        entry.rig.group.add(root);
        entry.avatarCtl = new AvatarController(root, animations);
        entry.avatarCtl.applyOutfit(entry.outfit);
        entry.rig.bodyPivot.visible = false;
      })
      .catch((err) => {
        // On ne retente pas à chaque message réseau : le repli reste affiché jusqu'à la prochaine connexion.
        console.warn('[BLV] Avatar 3D distant indisponible, repli sur le personnage simple', err);
      });
  }



  /** Vrai si le joueur est dans un intérieur (salle fermée hors carte). */
  public isInsideInterior(): boolean {
    return this.activeInterior !== null;
  }

  private registerInteriorDoor(opts: {
    id: string;
    interiorId: InteriorId;
    siteId: string;
    name: string;
    label: string;
    district: string;
    doorX: number;
    doorZ: number;
    outX: number;
    outZ: number;
    outRotY: number;
    radius: number;
    color: number;
  }) {
    this.interiorDoors.set(opts.id, {
      interiorId: opts.interiorId,
      siteId: opts.siteId,
      name: opts.name,
      outX: opts.outX,
      outZ: opts.outZ,
      outRotY: opts.outRotY,
    });
    this.addBeaconHotspot({
      id: opts.id,
      label: opts.label,
      district: opts.district,
      x: opts.doorX,
      z: opts.doorZ,
      radius: opts.radius,
      type: 'interior_door',
      color: opts.color,
    });
  }

  private mountHouseFloor(
    spec: HouseSpec,
    floorIndex: number,
    returnDoor: { name: string; outX: number; outZ: number; outRotY: number },
    prevPitch: number,
    prevDist: number,
    atOverride?: { x: number; z: number; rotY: number }
  ): boolean {
    const core = this.physics;
    const floor = spec.floors[floorIndex];
    if (!core || !floor || this.playerCharId < 0) return false;

    const noUpg: CribUpgrades = { splitClim: false, bafflesMaquis: false, tv4k: false, canapeCuir: false };
    const baseDef = buildHouseFloorDef(spec, floorIndex, noUpg);
    const furniture = createHouseFloorFurniture(floor, this.ownUpgrades);
    const rig = createInteriorRig(baseDef, furniture.build);
    this.scene.add(rig.group);

    const colliderIds: number[] = [];
    for (const b of baseDef.boxes) {
      const p = interiorToWorld(baseDef, b.x, b.z);
      const id = core.addBox(p.x, p.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
      if (id >= 0) colliderIds.push(id);
    }
    const upgradeColliderIds: number[] = [];
    for (const b of getHouseUpgradeBoxes(floor, this.ownUpgrades)) {
      const p = interiorToWorld(baseDef, b.x, b.z);
      const id = core.addBox(p.x, p.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
      if (id >= 0) upgradeColliderIds.push(id);
    }

    const hotspots: CityHotspot[] = [];
    if (baseDef.hasStreetExit !== false) {
      const ex = interiorToWorld(baseDef, baseDef.exit.x, baseDef.exit.z);
      hotspots.push({
        id: `exit_${baseDef.id}`,
        label: `🚪 Sortir — ${returnDoor.name}`,
        district: baseDef.label,
        x: ex.x,
        z: ex.z,
        radius: baseDef.exit.radius,
        type: 'interior_exit',
        color: 0xef4444,
      });
    }
    for (const act of baseDef.actions ?? []) {
      const p = interiorToWorld(baseDef, act.x, act.z);
      hotspots.push({
        id: act.id,
        label: act.label,
        district: baseDef.label,
        x: p.x,
        z: p.z,
        radius: act.radius,
        type: act.type,
        color: act.color,
        targetFloor: act.targetFloor,
        arrival: act.arrival,
      });
    }

    this.activeHouse = { spec, floorIndex, upgradeColliderIds, updateUpgrades: furniture.updateUpgrades };
    this.activeInterior = {
      id: baseDef.id,
      def: baseDef,
      rig,
      colliderIds,
      hotspots,
      label: returnDoor.name,
      returnX: returnDoor.outX,
      returnZ: returnDoor.outZ,
      returnRotY: returnDoor.outRotY,
      prevPitch,
      prevDist,
    };

    const at = atOverride ?? baseDef.entry;
    const w = interiorToWorld(baseDef, at.x, at.z);
    core.placeCharacter(this.playerCharId, w.x, w.z);
    core.faceCharacter(this.playerCharId, at.rotY, true);
    this.playerX = w.x;
    this.playerY = 0;
    this.playerZ = w.z;
    this.playerRotY = at.rotY;
    this.playerRig.group.position.set(w.x, 0, w.z);
    this.playerRig.group.rotation.y = at.rotY;
    this.camYaw = at.rotY + Math.PI;
    this.camPitch = 0.5;
    this.camDist = 8.2;
    this.camPos.set(
      w.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      this.playerY + 1.55 + Math.sin(this.camPitch) * this.camDist,
      w.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist
    );
    this.camLook.set(w.x, 1.55, w.z);
    return true;
  }

  /**
   * Entre dans un intérieur par la porte `doorId` : fondu géré par l'interface ; ici on construit la salle,
   * on enregistre ses collisions, on téléporte le joueur et on fige la ville (elle reste chargée).
   */
  public enterInterior(doorId: string, spawn: 'door' | 'bed' = 'door'): { ok: boolean; reason?: 'driving' | 'unknown' } {
    const door = this.interiorDoors.get(doorId);
    const core = this.physics;
    if (!door || !core || this.playerCharId < 0) return { ok: false, reason: 'unknown' };
    if (this.activeInterior) return { ok: false };
    if (this.drivingVehicle) return { ok: false, reason: 'driving' };

    if (doorId === 'door_home') {
      const spec = this.ownHouseSpec;
      if (!spec) return { ok: false, reason: 'unknown' };
      this.npcSystem.setIndoor(true);
      this.animalSystem.setIndoor(true);
      const floorIdx = spawn === 'bed'
        ? Math.max(0, spec.floors.findIndex((f) => Boolean(f.bed)))
        : 0;
      const fl = spec.floors[floorIdx] ?? spec.floors[0];
      const at = spawn === 'bed' && fl.bed ? fl.bed : fl.entry;
      this.mountHouseFloor(
        spec,
        floorIdx,
        { name: door.name, outX: door.outX, outZ: door.outZ, outRotY: door.outRotY },
        this.camPitch,
        this.camDist,
        at
      );
      return { ok: true };
    }

    const def = INTERIORS[door.interiorId as PublicInteriorId];
    if (!def) return { ok: false, reason: 'unknown' };

    this.npcSystem.setIndoor(true); // les PNJ extérieurs sont désactivés tant qu'on est dedans
    this.animalSystem.setIndoor(true); // les animaux aussi
    const rig = createInteriorRig(def);
    this.scene.add(rig.group);
    const colliderIds: number[] = [];
    for (const b of def.boxes) {
      const p = interiorToWorld(def, b.x, b.z);
      const id = core.addBox(p.x, p.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
      if (id >= 0) colliderIds.push(id);
    }
    this.npcSystem.enterInterior(def); // PNJ de la salle (après ses solides : positions de départ libres)
    this.animalSystem.enterInterior(def); // animal de la salle (ex. le chat du maquis)
    const ex = interiorToWorld(def, def.exit.x, def.exit.z);
    const exitHotspot: CityHotspot = {
      id: `exit_${def.id}`,
      label: `🚪 Sortir — ${door.name}`,
      district: def.label,
      x: ex.x,
      z: ex.z,
      radius: def.exit.radius,
      type: 'interior_exit',
      color: 0xef4444,
    };
    const actionHotspots: CityHotspot[] = (def.actions ?? []).map((act) => {
      const p = interiorToWorld(def, act.x, act.z);
      return {
        id: act.id,
        label: act.label,
        district: def.label,
        x: p.x,
        z: p.z,
        radius: act.radius,
        type: act.type,
        color: act.color,
      };
    });
    this.activeInterior = {
      id: def.id, def, rig, colliderIds, hotspots: [exitHotspot, ...actionHotspots], label: door.name,
      returnX: door.outX, returnZ: door.outZ, returnRotY: door.outRotY,
      prevPitch: this.camPitch, prevDist: this.camDist,
    };

    const at = spawn === 'bed' && def.bed ? def.bed : def.entry;
    const w = interiorToWorld(def, at.x, at.z);
    core.placeCharacter(this.playerCharId, w.x, w.z);
    core.faceCharacter(this.playerCharId, at.rotY, true);
    this.playerX = w.x;
    this.playerY = 0;
    this.playerZ = w.z;
    this.playerRotY = at.rotY;
    this.playerRig.group.position.set(w.x, 0, w.z);
    this.playerRig.group.rotation.y = at.rotY;
    this.camYaw = at.rotY + Math.PI;
    this.camPitch = 0.5;
    this.camDist = 8.5;
    this.camPos.set(
      w.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      this.playerY + 1.55 + Math.sin(this.camPitch) * this.camDist,
      w.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist
    );
    this.camLook.set(w.x, 1.55, w.z);
    return { ok: true };
  }

  /** Change d'étage dans une maison à plusieurs niveaux en conservant le point de retour sur rue. */
  public switchHouseFloor(targetFloor: number): boolean {
    const a = this.activeInterior;
    const h = this.activeHouse;
    if (!a || !h || !this.physics) return false;
    const nextFloor = h.spec.floors[targetFloor];
    if (!nextFloor) return false;

    const stairFrom = a.hotspots.find((hs) => hs.type === 'interior_stairs' && hs.targetFloor === targetFloor);
    const arrival = stairFrom?.arrival ?? nextFloor.entry;
    const returnDoor = { name: a.label, outX: a.returnX, outZ: a.returnZ, outRotY: a.returnRotY };
    const { prevPitch, prevDist } = a;

    for (const id of a.colliderIds) this.physics.removeSolid(id);
    for (const id of h.upgradeColliderIds) this.physics.removeSolid(id);
    this.scene.remove(a.rig.group);
    a.rig.dispose();
    this.activeInterior = null;
    this.activeHouse = null;

    return this.mountHouseFloor(h.spec, targetFloor, returnDoor, prevPitch, prevDist, arrival);
  }

  /** Sort de l'intérieur : retire la salle et remet le joueur devant la porte, face à la rue. */
  public exitInterior(): boolean {
    const a = this.activeInterior;
    if (!a || !this.physics) return false;
    for (const id of a.colliderIds) this.physics.removeSolid(id);
    if (this.activeHouse) {
      for (const id of this.activeHouse.upgradeColliderIds) this.physics.removeSolid(id);
      this.activeHouse = null;
    }
    this.scene.remove(a.rig.group);
    a.rig.dispose();
    this.activeInterior = null;
    this.camPitch = a.prevPitch;
    this.camDist = a.prevDist;
    this.playerRotY = a.returnRotY;
    this.camYaw = a.returnRotY + Math.PI;
    this.physics.faceCharacter(this.playerCharId, a.returnRotY, true);
    this.teleportPlayer(a.returnX, a.returnZ);
    this.playerRig.group.rotation.y = a.returnRotY;
    this.npcSystem.setIndoor(false); // les PNJ réapparaissent autour du joueur (hors champ de préférence)
    this.animalSystem.setIndoor(false);
    return true;
  }

  /** Murs de l'intérieur occupé : transparents côté caméra ; les anneaux d'action pulsent. */
  private updateInteriorShell(dt: number, nowSec: number) {
    const a = this.activeInterior;
    if (!a) return;
    a.rig.fader.update(this.camPos.x - a.def.origin.x, this.camPos.z - a.def.origin.z, true, dt);
    const pulse = 0.6 + 0.25 * Math.sin(nowSec * 4);
    if (a.rig.exitRing) (a.rig.exitRing.material as THREE.MeshBasicMaterial).opacity = pulse;
    for (const r of a.rig.actionRings) (r.material as THREE.MeshBasicMaterial).opacity = pulse;
    a.rig.animate?.(nowSec, dt);
  }

  /** Position du joueur à pied ou, depuis un intérieur, devant l'entrée (là où le taxi le prendrait). */
  private taxiPickupPoint(): { x: number; z: number } {
    return this.activeInterior
      ? { x: this.activeInterior.returnX, z: this.activeInterior.returnZ }
      : { x: this.playerX, z: this.playerZ };
  }

  /**
   * Étape B2 : un woro-woro jaune apparaît à environ 120 m sur le grand axe le plus proche, roule jusqu'au point
   * de route le plus proche du joueur et s'y arrête avant la fin de l'attente. Renvoie false si aucun trajet n'existe
   * (le joueur est alors simplement déposé à la fin de l'attente, comme en B1).
   */
  public startTaxiApproach(waitS: number): boolean {
    this.stopTaxiApproach();
    const plan = planTaxiApproach(this.taxiPickupPoint());
    if (!plan) return false;
    const rig = createVehicleModel('woro_woro');
    rig.group.rotation.order = 'YXZ';
    const first = pointAlongPath(plan.points, 0);
    rig.group.position.set(first.x, 0, first.z);
    rig.group.rotation.y = first.heading;
    this.scene.add(rig.group);
    const now = performance.now() / 1000;
    this.taxiApproach = {
      rig,
      path: plan,
      t0: now,
      arriveInS: Math.max(1, waitS - 1.5),
      boardAt: now + waitS,
      heading: first.heading,
      lastS: 0,
      nextCheck: now + 0.5,
    };
    return true;
  }

  /** Le taxi disparaît (le joueur monte, annule ou la course est abandonnée). */
  public stopTaxiApproach() {
    const t = this.taxiApproach;
    if (!t) return;
    this.taxiApproach = null;
    this.scene.remove(t.rig.group);
    t.rig.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m.dispose();
    });
  }

  private updateTaxiApproach(nowSec: number, dt: number) {
    const t = this.taxiApproach;
    if (!t) return;
    // Si le joueur s'éloigne, le taxi le rejoint là où il est : nouveau trajet depuis sa position actuelle.
    if (nowSec >= t.nextCheck) {
      t.nextCheck = nowSec + 0.5;
      const stop = nearestRoadPoint(this.taxiPickupPoint()).at;
      if (Math.hypot(stop.x - t.path.stop.x, stop.z - t.path.stop.z) > 15) {
        const cur = pointAlongPath(t.path.points, t.lastS);
        const re = taxiRouteTo({ x: cur.x, z: cur.z }, stop);
        if (re) {
          t.path = re;
          t.t0 = nowSec;
          t.arriveInS = Math.max(1, t.boardAt - nowSec - 1.5);
          t.lastS = 0;
        }
      }
    }
    const s = t.path.length * taxiProgress(nowSec - t.t0, t.arriveInS);
    const pos = pointAlongPath(t.path.points, s);
    if (s > t.lastS + 1e-4) {
      // Cap lissé : pas de rotation brusque dans les virages.
      let d = pos.heading - t.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      t.heading += d * (1 - Math.exp(-8 * dt));
    }
    t.rig.group.position.set(pos.x, 0, pos.z);
    t.rig.group.rotation.set(0, t.heading, 0);
    t.rig.setWheelSpin(s - t.lastS);
    t.lastS = s;
  }

  /** Vrai pendant la cinématique du taxi : pas de déplacement, pas d'interaction, pas de position envoyée. */
  public isTaxiRideActive(): boolean {
    return this.taxiRide !== null;
  }

  /**
   * Étape B3 : fondu au noir, le taxi roule sur l'itinéraire jusqu'à la route la plus proche de la destination
   * (15 à 30 s selon la distance, caméra qui le suit), nouveau fondu au noir, puis le joueur est déposé en `dest`.
   * Reprend le woro-woro de B2 s'il est là. Renvoie la distance réelle du trajet, ou null s'il est impossible : l'appelant téléporte alors comme avant.
   */
  public startTaxiRide(dest: { x: number; z: number }): { distanceM: number } | null {
    if (this.taxiRide) return null;
    const ap = this.taxiApproach;
    const from = ap
      ? { x: ap.rig.group.position.x, z: ap.rig.group.position.z }
      : nearestRoadPoint(this.taxiPickupPoint()).at;
    const route = findRoute(from, dest);
    if (!route) return null;
    // On s'arrête sur la route : pas de dernier tronçon en ligne droite à travers les bâtiments.
    const points = route.points.length > 2 ? route.points.slice(0, -1) : route.points;
    const length = pathLength(points);
    if (length < 5) return null;
    let rig: VehicleRig;
    let heading: number;
    if (ap) {
      rig = ap.rig;
      heading = ap.heading;
      this.taxiApproach = null;
    } else {
      rig = createVehicleModel('woro_woro');
      rig.group.rotation.order = 'YXZ';
      rig.group.position.set(from.x, 0, from.z);
      this.scene.add(rig.group);
      heading = pointAlongPath(points, 0).heading;
    }
    this.taxiRide = {
      phase: 'board',
      t: 0,
      totalS: taxiRideSeconds(route.distanceM),
      rig,
      points,
      length,
      dest: { x: dest.x, z: dest.z },
      heading,
      lastS: 0,
      x: from.x,
      z: from.z,
      endFade: false,
    };
    this.callbacks.onTaxiFade?.(true);
    return { distanceM: route.distanceM };
  }

  private static readonly TAXI_FADE_S = 0.75;

  private updateTaxiRide(dt: number) {
    const r = this.taxiRide;
    if (!r) return;
    r.t += dt;
    const FADE = AbidjanSceneManager.TAXI_FADE_S;
    if (r.phase === 'board') {
      // Écran noir : le joueur est « monté », la cinématique commence.
      if (r.t < FADE) return;
      r.phase = 'ride';
      r.t = 0;
      this.playerRig.group.visible = false;
      const start = pointAlongPath(r.points, 0);
      r.heading = start.heading;
      r.x = start.x;
      r.z = start.z;
      r.rig.group.position.set(start.x, 0, start.z);
      r.rig.group.rotation.set(0, start.heading, 0);
      this.updateTaxiRideCamera(0, true);
      this.callbacks.onTaxiFade?.(false);
      return;
    }
    if (r.phase === 'ride') {
      const s = r.length * taxiRideProgress(r.t, r.totalS);
      const pos = pointAlongPath(r.points, s);
      if (s > r.lastS + 1e-4) {
        let d = pos.heading - r.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.heading += d * (1 - Math.exp(-8 * dt));
      }
      r.x = pos.x;
      r.z = pos.z;
      r.rig.group.position.set(pos.x, 0, pos.z);
      r.rig.group.rotation.set(0, r.heading, 0);
      r.rig.setWheelSpin(s - r.lastS);
      r.lastS = s;
      if (!r.endFade && r.t >= r.totalS - FADE) {
        r.endFade = true;
        this.callbacks.onTaxiFade?.(true);
      }
      if (r.t >= r.totalS) {
        // Écran noir : le taxi disparaît, le joueur est déposé devant le lieu.
        this.taxiRide = null;
        this.scene.remove(r.rig.group);
        r.rig.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) m.dispose();
        });
        this.playerRig.group.visible = true;
        this.teleportPlayer(r.dest.x, r.dest.z);
        this.taxiRide = {
          ...r,
          phase: 'unfade',
          t: 0,
        };
        this.callbacks.onTaxiRideArrived?.();
        this.callbacks.onTaxiFade?.(false);
      }
      return;
    }
    // 'unfade' : retour à l'image, puis le joueur reprend la main.
    if (r.t >= FADE) {
      this.taxiRide = null;
      this.callbacks.onTaxiRideEnd?.();
    }
  }

  /** Caméra de poursuite derrière le taxi, avec un léger balancement ; `snap` la place d'un coup. */
  private updateTaxiRideCamera(dt: number, snap = false) {
    const r = this.taxiRide;
    if (!r) return;
    const sway = Math.sin(r.t * 0.35) * 0.4;
    const yaw = r.heading + Math.PI + sway;
    this.scratchVec.set(r.x + Math.sin(yaw) * 11, 5.4, r.z + Math.cos(yaw) * 11);
    this.scratchTarget.set(r.x + Math.sin(r.heading) * 3, 1.5, r.z + Math.cos(r.heading) * 3);
    if (snap) {
      this.camPos.copy(this.scratchVec);
      this.camLook.copy(this.scratchTarget);
    } else {
      const k = 1 - Math.exp(-6 * dt);
      this.camPos.lerp(this.scratchVec, k);
      this.camLook.lerp(this.scratchTarget, k);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.dirLight.position.set(r.x + this.sunDir.x * 150, this.sunDir.y * 150, r.z + this.sunDir.z * 150);
    this.dirLight.target.position.set(r.x, 0, r.z);
  }

  public teleportPlayer(x: number, z: number) {
    if (this.drivingVehicle && this.physics) {
      this.physics.placeVehicle(this.drivingVehicle.vehId, x, z, this.playerRotY);
      this.drivingVehicle.rig.group.position.set(x, 0, z);
    } else if (this.physics && this.playerCharId >= 0) {
      this.physics.placeCharacter(this.playerCharId, x, z);
    }
    this.playerX = x;
    this.playerY = 0;
    this.playerZ = z;
    this.playerRig.group.position.set(x, 0, z);
    this.camPos.set(x + Math.sin(this.camYaw) * 10, 6, z + Math.cos(this.camYaw) * 10);
    this.camLook.set(x, 1.8, z);
    this.streamer?.update(x, z, 9);
  }

  public setJoystick(x: number, y: number) {
    this.joystickVec = { x, y };
  }

  public setSprint(active: boolean) {
    this.isSprinting = active;
  }

  public setHandbrake(active: boolean) {
    this.isHandbraking = active;
  }

  public triggerInteract() {
    const h = this.findNearestHotspot();
    if (h) {
      this.callbacks.onInteractionTriggered(h);
      return;
    }
    this.toggleVehicle();
  }

  public triggerJump() {
    if (this.taxiRide) return;
    if (this.drivingVehicle) {
      this.isHandbraking = true;
      window.setTimeout(() => {
        this.isHandbraking = false;
      }, 280);
      return;
    }
    if (this.charState.grounded) {
      this.jumpPending = true;
      this.playerSquashY = 1.16;
    }
  }

  public triggerHorn() {
    this.callbacks.onHorn?.();
  }

  public toggleVehicle() {
    if (!this.physics) return;
    if (this.drivingVehicle) {
      const v = this.drivingVehicle;
      const cs = this.physics.readVehicle(v.vehId, this.carState);
      const ex = cs.x - Math.cos(cs.heading) * 2.1;
      const ez = cs.z + Math.sin(cs.heading) * 2.1;
      this.playerX = ex;
      this.playerZ = ez;
      if (this.playerCharId >= 0) {
        this.physics.placeCharacter(this.playerCharId, ex, ez);
        this.physics.setCharacterEnabled(this.playerCharId, true);
      }
      this.physics.vehicleInput(v.vehId, 0, 0, true);
      this.playerRig.group.visible = true;
      this.playerRig.group.position.set(ex, 0, ez);
      this.drivingVehicle = null;
      this.engineStalled = false;
      this.callbacks.onEngineStallChange(false);
      this.callbacks.onVehicleToggle(false);
      return;
    }

    const nearest = this.findNearestVehicle();
    if (nearest) {
      this.drivingVehicle = nearest;
      if (this.playerCharId >= 0) {
        this.physics.setCharacterEnabled(this.playerCharId, false);
      }
      this.playerRig.group.visible = false;
      const cs = this.physics.readVehicle(nearest.vehId, this.carState);
      this.playerX = cs.x;
      this.playerZ = cs.z;
      this.callbacks.onVehicleToggle(true, nearest.rig.type);
    }
  }

  public repairStalledEngine() {
    this.engineStalled = false;
    this.callbacks.onEngineStallChange(false);
  }

  /** Ruban orange au sol qui montre l'itinéraire choisi sur la carte ; null l'efface. */
  public setRoute(points: Array<{ x: number; z: number }> | null) {
    if (this.routeGuide) {
      this.scene.remove(this.routeGuide);
      this.routeGuide.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      this.routeGuide = null;
    }
    if (!points || points.length < 2) return;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });
    const width = 3;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length < 0.5) continue;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(width, length + width), mat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI;
      seg.position.set((a.x + b.x) / 2, 0.6, (a.z + b.z) / 2);
      seg.renderOrder = 999;
      group.add(seg);
    }
    this.scene.add(group);
    this.routeGuide = group;
  }

  public getRadarSnapshot(): RadarSnapshot {
    const allHotspots = [...this.staticHotspots, ...this.homeHotspots];
    return {
      playerX: this.activeInterior ? this.activeInterior.returnX : this.playerX,
      playerZ: this.activeInterior ? this.activeInterior.returnZ : this.playerZ,
      playerRotY: this.activeInterior ? this.activeInterior.returnRotY : this.playerRotY,
      district: this.lastDistrict,
      hotspots: allHotspots.map((h) => ({ id: h.id, label: h.label, x: h.x, z: h.z, color: h.color })),
      places: this.staticHotspots.map((h) => ({ id: h.id, label: h.label, x: h.x, z: h.z, color: h.color })),
      home: this.ownHouseLot ? { x: this.ownHouseLot.x, z: this.ownHouseLot.z } : null,
      homePorch: this.ownHouseLot
        ? houseToWorld(this.ownHouseLot.x, this.ownHouseLot.z, this.ownHouseLot.rotationY, 0, this.ownHouseSpec?.facade.porchZ ?? 5.2)
        : null,
      remotes: Array.from(this.remoteRigs.values()).map((r) => ({
        name: r.name,
        x: r.rig.group.position.x,
        z: r.rig.group.position.z,
        color: '#22c55e',
      })),
    };
  }

  public handleResize() {
    if (this.disposed) return;
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    if (code === 'KeyP' || code === 'Escape') {
      if (this.cameraMode === 'follow') {
        this.callbacks.onPauseKey?.();
      }
      return;
    }

    if (this.cameraMode !== 'follow' || this.isPaused) return;
    this.keys.add(code);
    if (code === 'ShiftLeft' || code === 'ShiftRight') this.isSprinting = true;
    if (code === 'Space') {
      e.preventDefault();
      if (this.drivingVehicle) this.isHandbraking = true;
      else this.triggerJump();
    }

    if (code === 'KeyE') {
      this.triggerInteract();
    } else if (code === 'KeyF') {
      this.toggleVehicle();
    } else if (code === 'KeyH') {
      this.triggerHorn();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.isSprinting = false;
    if (e.code === 'Space') this.isHandbraking = false;
  };

  /** Le doigt va moins loin que la souris sur un petit écran : on compense un peu. */
  private static readonly TOUCH_CAM_GAIN = 1.6;

  public setCameraSensitivity(value: number) {
    this.camSensitivity = THREE.MathUtils.clamp(value, 0.3, 3);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.cameraMode !== 'follow' || this.camPointerId !== null) return;
    this.camPointerId = e.pointerId;
    this.isDraggingCam = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCam || this.cameraMode !== 'follow' || e.pointerId !== this.camPointerId) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const gain = this.camSensitivity * (e.pointerType === 'touch' ? AbidjanSceneManager.TOUCH_CAM_GAIN : 1);
    this.camYaw -= dx * 0.0065 * gain;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005 * gain, 0.08, 1.25);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.camPointerId) return;
    this.isDraggingCam = false;
    this.camPointerId = null;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.cameraMode !== 'follow') return;
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 5.5, 34);
  };

  private onWindowBlur = () => {
    this.keys.clear();
    this.isDraggingCam = false;
    this.camPointerId = null;
    this.isSprinting = false;
    this.isHandbraking = false;
    this.joystickVec = { x: 0, y: 0 };
  };

  private onResize = () => this.handleResize();

  private bindInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private findNearestHotspot(): CityHotspot | null {
    if (this.taxiRide) return null;
    let best: CityHotspot | null = null;
    let bestD = Infinity;
    const pool = this.activeInterior ? this.activeInterior.hotspots : [...this.homeHotspots, ...this.staticHotspots];
    for (const h of pool) {
      const d = Math.hypot(this.playerX - h.x, this.playerZ - h.z);
      if (d <= h.radius && d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  private findNearestVehicle(): { id: string; vehId: number; rig: VehicleRig } | null {
    if (this.taxiRide) return null;
    let best: { id: string; vehId: number; rig: VehicleRig } | null = null;
    let bestD = 6.2;
    for (const v of this.spawnedVehicles) {
      const d = Math.hypot(this.playerX - v.rig.group.position.x, this.playerZ - v.rig.group.position.z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private stepSimulation(dt: number, nowSec: number) {
    // 1. Lagoon shader & flood water animation
    this.lagoonWaterHandle.updateTime(nowSec);
    this.chunkMats.setWindTime(nowSec);
    const isFlood = this.weather === 'inondation';
    this.floodWaterMesh.visible = !this.activeInterior && (isFlood || this.floodWaterMesh.position.y > -1.2);
    const targetFloodY = isFlood ? 0.36 : -1.8;
    this.floodWaterMesh.position.y = THREE.MathUtils.lerp(
      this.floodWaterMesh.position.y,
      targetFloodY,
      1 - Math.exp(-2 * dt)
    );

    // 1bis. Taxi appelé (étape B2)
    this.updateTaxiApproach(nowSec, dt);

    // 2. Beacon rings & pickups
    for (let i = 0; i < this.beaconRings.length; i++) {
      const r = this.beaconRings[i];
      const pulse = 1 + Math.sin(nowSec * 3.5 + i) * 0.08;
      r.scale.set(pulse, pulse, 1);
    }
    if (this.ownHouseDoorRing) {
      const p = 1 + Math.sin(nowSec * 3.5) * 0.08;
      this.ownHouseDoorRing.scale.set(p, p, 1);
    }

    for (const p of this.cashPickups) {
      if (!p.active) continue;
      p.mesh.rotation.y = nowSec * 1.8;
      p.mesh.position.y = Math.sin(nowSec * 3) * 0.14;
      if (this.cameraMode === 'follow' && Math.hypot(this.playerX - p.x, this.playerZ - p.z) < 3.0) {
        p.active = false;
        p.mesh.visible = false;
        const amt = this.mysticBaraka ? 25000 : 5000;
        this.callbacks.onCashPickup(amt);
      }
    }

    // 3. Remote Multiplayer Smooth 150ms Interpolation
    const nowMs = performance.now();
    for (const entry of this.remoteRigs.values()) {
      const t = Math.min(1, (nowMs - entry.lastNetTime) / 150);
      const rx = entry.rig.group.position.x;
      const rz = entry.rig.group.position.z;
      const nx = THREE.MathUtils.lerp(entry.prevX, entry.targetX, t);
      const nz = THREE.MathUtils.lerp(entry.prevZ, entry.targetZ, t);
      const moved = Math.hypot(nx - rx, nz - rz);
      entry.rig.group.position.set(nx, 0, nz);
      entry.rig.group.rotation.y = entry.rotY;
      entry.rig.animateGait(nowSec * 6, moved > 0.015 ? 1 : 0, dt);
      if (entry.avatarCtl) {
        // Vitesse lissée : les positions réseau arrivent par à-coups (≥ 100 ms).
        entry.speed += (moved / Math.max(dt, 1e-3) - entry.speed) * Math.min(1, dt * 8);
        entry.avatarCtl.update(dt, entry.speed, true, false);
      }
    }

    // 4. Title / Roulette Flyover Mode over Le Plateau & Lagune Ébrié
    if (this.cameraMode === 'flyover') {
      this.streamer?.update(this.flyoverCenter.x, this.flyoverCenter.z, 8);
      const angle = nowSec * 0.16;
      this.camPos.set(
        this.flyoverCenter.x + Math.sin(angle) * 65,
        29 + Math.sin(nowSec * 0.3) * 4,
        this.flyoverCenter.z + Math.cos(angle) * 58
      );
      this.camLook.set(this.flyoverCenter.x, 9, this.flyoverCenter.z);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.dirLight.position.set(
        this.flyoverCenter.x + this.sunDir.x * 150,
        this.sunDir.y * 150,
        this.flyoverCenter.z + this.sunDir.z * 150
      );
      this.dirLight.target.position.set(this.flyoverCenter.x, 0, this.flyoverCenter.z);
      return;
    }

    if (this.isPaused) return;

    // 4bis. Cinématique du taxi (B3)
    this.updateTaxiRide(dt);

    // 5. Stream Abidjan chunks around player
    // (dans un intérieur, la ville reste chargée telle quelle : pas de rechargement à la sortie)
    if (this.taxiRide?.phase === 'ride') {
      this.streamer?.update(this.taxiRide.x, this.taxiRide.z, this.isSoftwareGl ? 3 : 4);
    } else if (!this.activeInterior) {
      this.streamer?.update(this.playerX, this.playerZ, this.streamer.loadedCount < 25 ? 8 : this.isSoftwareGl ? 3 : 4);
    }

    // 6. Walking Pedestrians
    if (!this.activeInterior) {
      const worldReady = this.streamer?.isReady(this.playerX, this.playerZ, 2) ?? false;
      this.npcSystem.update(dt, this.playerX, this.playerZ, this.isSuperstar, this.camYaw, worldReady);
      this.animalSystem.update(dt, this.playerX, this.playerZ, this.camYaw, worldReady);
    } else {
      this.npcSystem.updateIndoor(dt, this.playerX, this.playerZ);
      this.animalSystem.update(dt, this.playerX, this.playerZ, this.camYaw, false);
    }

    // 7. Player Input -> C++/WASM PhysicsCore
    let fwd = 0;
    let turnRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turnRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turnRight -= 1;

    if (Math.abs(this.joystickVec.y) > 0.08) fwd = -this.joystickVec.y;
    if (Math.abs(this.joystickVec.x) > 0.08) turnRight = this.joystickVec.x;
    // Pendant la cinématique du taxi, le joueur ne bouge pas.
    if (this.taxiRide) {
      fwd = 0;
      turnRight = 0;
    }

    const core = this.physics;
    if (core && this.playerCharId >= 0) {
      // Flood engine stall check
      if (this.drivingVehicle && this.weather === 'inondation' && !this.engineStalled) {
        const wasm = getWasmCore();
        const stall = wasm.compute_flood_stall(
          Math.round(this.star),
          Math.floor((nowSec * 37) % 100),
          this.drivingVehicle.rig.isLowClearance ? 1 : 0
        );
        if (stall === 1 && Math.abs(this.carState.forwardSpeed) > 6 && Math.random() < 0.015) {
          this.engineStalled = true;
          this.callbacks.onEngineStallChange(true);
        }
      } else if (this.weather !== 'inondation' && this.engineStalled) {
        this.engineStalled = false;
        this.callbacks.onEngineStallChange(false);
      }

      if (this.drivingVehicle) {
        const accel = this.engineStalled ? 0 : fwd;
        core.vehicleInput(this.drivingVehicle.vehId, accel, turnRight, this.isHandbraking);
      } else {
        const forwardX = -Math.sin(this.camYaw);
        const forwardZ = -Math.cos(this.camYaw);
        const rightX = -forwardZ;
        const rightZ = forwardX;
        const wx = forwardX * fwd + rightX * turnRight;
        const wz = forwardZ * fwd + rightZ * turnRight;
        const baseSpeed = this.isSuperstar ? 10.5 : 6.2;
        const speed = this.isSprinting ? baseSpeed * 1.48 : baseSpeed;
        core.characterInput(this.playerCharId, wx, wz, speed, this.jumpPending);
        this.jumpPending = false;
      }

      // Autonomous AI Road Traffic (active once local chunks are ready)
      if (this.streamer?.isReady(this.playerX, this.playerZ, 1)) {
        const playerVehicles = this.spawnedVehicles.map((v) => ({
          x: v.rig.group.position.x,
          z: v.rig.group.position.z,
        }));
        updateRoadTraffic(core, this.trafficCars, this.playerX, this.playerZ, dt, playerVehicles);
      }

      core.step(dt);
      core.drainEvents(() => {});

      // Sync player vehicles
      for (const v of this.spawnedVehicles) {
        const vs = core.readVehicle(v.vehId, this.carState);
        v.rig.group.position.set(vs.x, 0, vs.z);
        v.rig.group.rotation.set(-vs.pitch, vs.heading, vs.roll);
        v.rig.setPhysicsWheelPose(vs.wheelAngle, vs.steer);
        v.rig.updateSiren(nowSec, this.policeWanted > 0);
        if (this.drivingVehicle === v) {
          this.playerX = vs.x;
          this.playerY = 0;
          this.playerZ = vs.z;
          this.playerRotY = vs.heading;
        }
      }

      // Sync player character
      if (!this.drivingVehicle) {
        const ps = core.readCharacter(this.playerCharId, this.charState);
        this.playerX = ps.x;
        this.playerY = ps.y;
        this.playerZ = ps.z;
        this.playerRotY = ps.heading;
        const knocked = ps.stun > 0;
        const moving = ps.speed > 0.35 && ps.grounded && !knocked;
        if (moving) {
          this.walkPhase += ps.speed * dt * 2.5;
        }
        this.playerSquashY = THREE.MathUtils.lerp(this.playerSquashY, 1, 1 - Math.exp(-12 * dt));
        this.playerRig.group.position.set(ps.x, ps.y, ps.z);
        this.playerRig.group.rotation.order = 'YXZ';
        this.playerRig.group.rotation.set(knocked ? -1.35 : 0, ps.heading, 0);
        this.playerRig.group.scale.set(
          1 / Math.sqrt(this.playerSquashY),
          this.playerSquashY,
          1 / Math.sqrt(this.playerSquashY)
        );
        this.playerRig.animateGait(this.walkPhase, moving ? 1 : 0, dt);
        this.playerAvatarCtl?.update(dt, ps.speed, ps.grounded, knocked);
      }

      // Sync AI road traffic cars
      for (const tc of this.trafficCars) {
        const ts = core.readVehicle(tc.vehId, this.trafficState);
        tc.rig.group.visible = tc.wait <= 0;
        if (tc.rig.group.visible) {
          tc.rig.group.position.set(ts.x, 0, ts.z);
          tc.rig.group.rotation.set(-ts.pitch, ts.heading, ts.roll);
          tc.rig.setPhysicsWheelPose(ts.wheelAngle, ts.steer);
          tc.rig.updateSiren(nowSec, this.policeWanted > 0);
          this.animalSystem.pushThreat(ts.x, ts.z, Math.abs(ts.forwardSpeed)); // les animaux fuient la circulation
        }
      }
    }

    // Cinématique du taxi (B3) : caméra de poursuite, aucune position envoyée aux autres joueurs.
    if (this.taxiRide?.phase === 'ride') {
      this.updateTaxiRideCamera(dt);
      return;
    }

    // 8. 360° Orbital Third-Person Camera with Exponential Damping + Building Raycast Pull-in
    const desiredDist = this.drivingVehicle ? this.camDist + 3.2 : this.camDist;
    const lookY = this.playerY + (this.drivingVehicle ? 1.3 : 1.55);
    this.scratchTarget.set(this.playerX, lookY, this.playerZ);

    let cx = this.playerX + Math.sin(this.camYaw) * Math.cos(this.camPitch) * desiredDist;
    let cy = Math.max(1.2, lookY + Math.sin(this.camPitch) * desiredDist);
    let cz = this.playerZ + Math.cos(this.camYaw) * Math.cos(this.camPitch) * desiredDist;

    if (core) {
      const horiz = Math.hypot(cx - this.playerX, cz - this.playerZ);
      if (horiz > 0.6) {
        const hit = core.ray(
          this.playerX,
          this.playerZ,
          cx - this.playerX,
          cz - this.playerZ,
          horiz,
          SolidFlag.BUILDING
        );
        if (hit >= 0) {
          const heightAtHit = lookY + (cy - lookY) * (hit / horiz);
          if (core.solidHeight(core.lastRayHitId) > heightAtHit - 0.3) {
            const k = Math.max(0.22, (hit - 0.65) / horiz);
            cx = this.playerX + (cx - this.playerX) * k;
            cy = lookY + (cy - lookY) * k;
            cz = this.playerZ + (cz - this.playerZ) * k;
          }
        }
      }
    }

    this.scratchVec.set(cx, cy, cz);
    const k = 1 - Math.exp(-10 * dt);
    this.camPos.lerp(this.scratchVec, k);
    this.camLook.lerp(this.scratchTarget, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.updateInteriorShell(dt, nowSec);

    this.dirLight.position.set(
      this.playerX + this.sunDir.x * 150,
      this.sunDir.y * 150,
      this.playerZ + this.sunDir.z * 150
    );
    this.dirLight.target.position.set(this.playerX, 0, this.playerZ);

    // 9. Throttled HUD & Network Sync (<= 10Hz)
    if (nowSec - this.lastUiSync > 0.14) {
      this.lastUiSync = nowSec;
      const here = { x: this.playerX, z: this.playerZ };
      const onBridge = bridgeAt(here, 0);
      const distName = this.activeInterior ? this.activeInterior.label : onBridge ? `Pont — ${onBridge.name}` : districtAt(here).name;
      if (distName !== this.lastDistrict) {
        this.lastDistrict = distName;
        this.callbacks.onDistrictChange(distName);
      }
      this.callbacks.onNearestHotspotChange(this.findNearestHotspot());
      const nearV = this.findNearestVehicle();
      this.callbacks.onNearestVehicleChange(
        nearV ? { id: nearV.id, label: nearV.rig.label, type: nearV.rig.type } : null
      );
    }

    if (nowSec - this.lastRemoteTick > 0.12) {
      this.lastRemoteTick = nowSec;
      this.callbacks.onPositionTick({
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        rotY: this.playerRotY,
        isDriving: Boolean(this.drivingVehicle),
        vehicleType: this.drivingVehicle ? this.drivingVehicle.rig.type : null,
      });
    }
  }

  /** Compteur de performance en haut à gauche, créé seulement avec `?blvdebug=1` (texte seul, jamais d'HTML). */
  private initDebugOverlay(): void {
    if (this.debugEl || typeof document === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('blvdebug') !== '1') return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:4px;left:4px;z-index:9999;padding:3px 6px;border-radius:4px;'
      + 'background:rgba(0,0,0,0.6);color:#e5e7eb;font:11px/1.3 monospace;white-space:pre;pointer-events:none';
    el.textContent = '…';
    document.body.appendChild(el);
    this.debugEl = el;
  }

  /** Met à jour le compteur deux fois par seconde (appels de dessin, triangles, PNJ actifs). */
  private updateDebugOverlay(dt: number): void {
    if (!this.debugEl) return;
    this.debugAcc += dt;
    if (this.debugAcc < 0.5) return;
    this.debugAcc = 0;
    const info = this.renderer.info.render;
    this.debugEl.textContent = `appels de dessin : ${info.calls}\ntriangles : ${info.triangles}\nPNJ actifs : ${this.npcSystem.activeCount} (${this.npcSystem.drawnMeshCount} instanced meshes)\nanimaux actifs : ${this.animalSystem.activeCount}`;
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      this.stepSimulation(dt, now / 1000);
      this.skyDome?.followCamera(this.camera);
      this.renderer.render(this.scene, this.camera);
      this.updateDebugOverlay(dt);

      if (this.isSoftwareGl) {
        this.softwareTimeoutId = window.setTimeout(() => {
          this.animFrameId = requestAnimationFrame(tick);
        }, 140);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public dispose() {
    this.disposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.softwareTimeoutId !== null) clearTimeout(this.softwareTimeoutId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('wheel', this.onWheel);

    this.stopTaxiApproach();
    this.taxiRide = null;
    this.streamer?.dispose();
    this.disposeOwnHouse();
    if (this.physics) {
      for (const id of this.exteriorColliderIds) this.physics.removeSolid(id);
      if (this.activeHouse) {
        for (const id of this.activeHouse.upgradeColliderIds) this.physics.removeSolid(id);
        this.activeHouse = null;
      }
    }
    this.exteriorColliderIds = [];
    this.skyDome?.dispose();
    this.chunkMats.dispose();
    this.activeInterior?.rig.dispose();
    this.npcSystem.dispose();
    this.animalSystem.dispose();
    this.debugEl?.remove();
    this.debugEl = null;
    this.renderer.dispose();
  }
}
