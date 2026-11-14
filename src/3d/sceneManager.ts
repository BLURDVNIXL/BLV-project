import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  WeatherType,
  VehicleModelType,
  SapeOutfitId,
  RemotePlayer,
  CribUpgrades,
} from '../types/game';
import {
  CharacterRig,
  CribZoneHandles,
  VehicleRig,
  createBassamFuturisticSchool,
  createBridgeModel,
  createCashPickupMesh,
  createCathedralLandmark,
  createCharacterModel,
  createFloatingNameplate,
  createHotelIvoireLandmark,
  createLaPyramideLandmark,
  createMairiePlateauLandmark,
  createMaquisStructure,
  createMarketStallCluster,
  createPlayerHouseRig,
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
import { NpcSystem } from './npcSystem';
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
import { houseToWorld, registerPlayerHouse } from '../world/playerHouse';
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
    | 'marry'
    | 'woohoo'
    | 'school_caiman'
    | 'school_alysma'
    | 'school_alex'
    | 'bank'
    | 'toilet'
    | 'shower'
    | 'sleep'
    | 'black_market'
    | 'yannis_academy';
  color: number;
}

export interface RadarSnapshot {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  district: string;
  hotspots: Array<{ id: string; label: string; x: number; z: number; color: number }>;
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
  private camera!: THREE.PerspectiveCamera;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  private physics: PhysicsCore | null = null;
  private streamer: WorldStreamer | null = null;
  private chunkMats!: ChunkMaterials;
  private npcSystem!: NpcSystem;

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
    }
  > = new Map();

  // Houses (own + optional visited neighbor)
  private ownHouseLot: HouseLot | null = null;
  private ownHouseRig: CribZoneHandles | null = null;
  private ownHouseColliderIds: number[] = [];
  private visitedHouseLot: HouseLot | null = null;
  private visitedHouseRig: CribZoneHandles | null = null;
  private visitedHouseColliderIds: number[] = [];
  private ownUpgrades: CribUpgrades = { splitClim: false, bafflesMaquis: false, tv4k: false, canapeCuir: false };
  private ownHomeType: HomeType = 'studio';

  private staticHotspots: CityHotspot[] = [];
  private homeHotspots: CityHotspot[] = [];

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
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Input state
  private keys = new Set<string>();
  private joystickVec = { x: 0, y: 0 };
  private isSoftwareGl = false;
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

    this.npcSystem = new NpcSystem(this.scene, this.isSoftwareGl ? 8 : 14);

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
    const placeSpecial = (specId: string, mesh: THREE.Group) => {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === specId);
      if (!fp) return;
      mesh.position.set(fp.x, 0, fp.z);
      mesh.rotation.y = -fp.angle;
      this.scene.add(mesh);
    };

    placeSpecial('stade', createStadeFhbLandmark());
    placeSpecial('cathedrale', createCathedralLandmark());
    placeSpecial('hotel_ivoire', createHotelIvoireLandmark());
    placeSpecial('lycee_alex', createBassamFuturisticSchool());
    placeSpecial('marche_adjame', createMarketStallCluster());

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

    const postel = createTourPostelLandmark();
    const pPos = project(5.3242, -4.0195);
    postel.position.set(pPos.x, 0, pPos.z);
    this.scene.add(postel);

    const mairie = createMairiePlateauLandmark();
    const pMai = project(5.3266, -4.0205);
    mairie.position.set(pMai.x, 0, pMai.z);
    this.scene.add(mairie);

    const maquis = createMaquisStructure();
    const pMaq = project(5.3375, -4.072);
    maquis.position.set(pMaq.x, 0, pMaq.z);
    this.scene.add(maquis);
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

    // 1. 3 Lycées d'Excellence (positions réelles SPECIAL_FOOTPRINTS devant l'entrée)
    const addSchool = (specId: string, type: CityHotspot['type'], label: string, color: number) => {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === specId);
      if (!fp) return;
      const vx = -Math.sin(fp.angle);
      const vz = Math.cos(fp.angle);
      this.addBeaconHotspot({
        id: specId,
        label,
        district: districtAt({ x: fp.x, z: fp.z }).name,
        x: fp.x + vx * (fp.d / 2 + 3.5),
        z: fp.z + vz * (fp.d / 2 + 3.5),
        radius: 5,
        type,
        color,
      });
    };
    addSchool('lycee_caiman', 'school_caiman', '🐊 Lycée Classique (Concours Caïman)', 0x16a34a);
    addSchool('lycee_alysma', 'school_alysma', '🌸 Lycée Sainte-Marie (Concours Alysma)', 0xec4899);
    addSchool('lycee_alex', 'school_alex', '⚡ Lycée d’Excellence Bassam (Concours Alex)', 0xf59e0b);

    // 2. Grands lieux interactifs d'Abidjan
    const pMairie = project(5.3266, -4.0205);
    this.addBeaconHotspot({
      id: 'mairie_plateau',
      label: '💍 Mairie du Plateau (Mariage Civil)',
      district: 'Le Plateau',
      x: pMairie.x,
      z: pMairie.z + 9,
      radius: 5,
      type: 'marry',
      color: 0xf43f5e,
    });

    const pMaquis = project(5.3375, -4.072);
    this.addBeaconHotspot({
      id: 'eat_maquis',
      label: '🍗 Maquis Le Temple · Rue Princesse',
      district: 'Yopougon',
      x: pMaquis.x,
      z: pMaquis.z + 7,
      radius: 5.5,
      type: 'eat',
      color: 0xf97316,
    });

    const pMarche = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
    if (pMarche) {
      this.addBeaconHotspot({
        id: 'work_adjame',
        label: '💼 Grand Marché d’Adjamé (Commerce)',
        district: 'Adjamé',
        x: pMarche.x,
        z: pMarche.z + 18,
        radius: 6,
        type: 'work',
        color: 0x10b981,
      });
    }

    const pIvoire = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'hotel_ivoire');
    if (pIvoire) {
      this.addBeaconHotspot({
        id: 'hotel_ivoire_suite',
        label: '💕 Suite Hôtel Ivoire (Crac-Crac Consentant)',
        district: 'Cocody · Deux-Plateaux',
        x: pIvoire.x,
        z: pIvoire.z + 20,
        radius: 6,
        type: 'woohoo',
        color: 0xec4899,
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

  private rebuildStreamerReservedLots() {
    if (!this.physics) return;
    const reserved: string[] = [];
    if (this.ownHouseLot) reserved.push(this.ownHouseLot.id);
    if (this.visitedHouseLot && this.visitedHouseLot.id !== this.ownHouseLot?.id) {
      reserved.push(this.visitedHouseLot.id);
    }
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

  private buildHomeHotspots(lot: HouseLot) {
    this.homeHotspots = [];
    const addLocal = (
      id: string,
      lx: number,
      lz: number,
      type: CityHotspot['type'],
      label: string,
      color: number,
      radius = 2.6
    ) => {
      const p = houseToWorld(lot.x, lot.z, lot.rotationY, lx, lz);
      this.homeHotspots.push({
        id,
        label,
        district: districtAt({ x: lot.x, z: lot.z }).name,
        x: p.x,
        z: p.z,
        radius,
        type,
        color,
      });
    };

    addLocal('home_bed', -4, -3, 'sleep', '🛏️ Dormir au lit (Énergie +85%)', 0x6366f1);
    addLocal('home_fridge', 3, -3.5, 'eat', '🧊 Réfrigérateur & Garba maison', 0xf97316);
    addLocal('home_shower', 4, 2, 'shower', '🚿 Douche & Hygiène', 0x06b6d4);
    addLocal('home_pc', -4, 2, 'work', '💻 Bureau PC / Télétravail', 0x10b981);

    // Local curb garbadrome & loto kiosk right down the street from the player's parcel
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
    preferredDistrict?: string
  ): HouseLot | null {
    this.ownHomeType = homeType;
    this.isSuperstar = isSuperstar;
    this.mysticBaraka = mysticBaraka;
    this.playerRig.applyOutfit(outfit);

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
      ];
      this.playerX = spawnX;
      this.playerZ = spawnZ;
      this.playerRig.group.position.set(spawnX, 0, spawnZ);
      return null;
    }

    const core = this.physics;

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
    for (const id of this.ownHouseColliderIds) core.removeSolid(id);
    this.ownHouseColliderIds = [];
    if (this.ownHouseRig) {
      this.scene.remove(this.ownHouseRig.group);
      this.ownHouseRig = null;
    }

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
    this.visitedHouseLot = null;

    this.rebuildStreamerReservedLots();

    // 2. Mount Open Dollhouse + Physics Colliders
    this.ownHouseRig = createPlayerHouseRig(homeType, this.ownUpgrades);
    this.ownHouseRig.group.position.set(lot.x, 0, lot.z);
    this.ownHouseRig.group.rotation.y = lot.rotationY;
    this.scene.add(this.ownHouseRig.group);
    this.ownHouseColliderIds = registerPlayerHouse(core, lot.x, lot.z, lot.rotationY);
    this.buildHomeHotspots(lot);

    // 3. Spawn player on front porch facing street (+z local)
    const porch = houseToWorld(lot.x, lot.z, lot.rotationY, 0, 5.2);
    this.playerX = porch.x;
    this.playerY = 0;
    this.playerZ = porch.z;
    this.playerRotY = lot.rotationY;
    this.playerCharId = core.createCharacter(porch.x, porch.z, 0.35);
    core.faceCharacter(this.playerCharId, lot.rotationY, true);
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(porch.x, 0, porch.z);
    this.playerRig.group.rotation.y = lot.rotationY;

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

    // 5. Aim camera smoothly behind player looking down the street
    this.camYaw = lot.rotationY + Math.PI;
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

  /** Permet de visiter la maison d'un joueur en ligne (ou revenir chez soi). */
  public visitNeighborHouse(
    homeType: HomeType,
    seedKey: string,
    ownerName: string,
    upgrades: CribUpgrades = { splitClim: false, bafflesMaquis: false, tv4k: false, canapeCuir: false }
  ) {
    if (!this.physics) return;
    const lot = findHouseLot(homeType, strHash(seedKey));
    if (!lot) return;

    // Clean old visited house
    if (this.visitedHouseRig) {
      this.scene.remove(this.visitedHouseRig.group);
      this.visitedHouseRig = null;
    }
    for (const id of this.visitedHouseColliderIds) this.physics.removeSolid(id);
    this.visitedHouseColliderIds = [];

    this.visitedHouseLot = lot;
    this.rebuildStreamerReservedLots();

    this.visitedHouseRig = createPlayerHouseRig(homeType, upgrades, `Chez ${ownerName}`);
    this.visitedHouseRig.group.position.set(lot.x, 0, lot.z);
    this.visitedHouseRig.group.rotation.y = lot.rotationY;
    this.scene.add(this.visitedHouseRig.group);
    this.visitedHouseColliderIds = registerPlayerHouse(this.physics, lot.x, lot.z, lot.rotationY);

    const porch = houseToWorld(lot.x, lot.z, lot.rotationY, 0, 5.4);
    this.teleportPlayer(porch.x, porch.z);
  }

  public returnToOwnHouse() {
    if (!this.ownHouseLot) return;
    if (this.visitedHouseRig) {
      this.scene.remove(this.visitedHouseRig.group);
      this.visitedHouseRig = null;
    }
    if (this.physics) {
      for (const id of this.visitedHouseColliderIds) this.physics.removeSolid(id);
    }
    this.visitedHouseColliderIds = [];
    this.visitedHouseLot = null;
    this.rebuildStreamerReservedLots();
    const porch = houseToWorld(this.ownHouseLot.x, this.ownHouseLot.z, this.ownHouseLot.rotationY, 0, 5.2);
    this.teleportPlayer(porch.x, porch.z);
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
      this.isSprinting = false;
      this.isHandbraking = false;
    }
  }

  public setOutfit(outfit: SapeOutfitId) {
    this.playerRig.applyOutfit(outfit);
  }

  public syncCribUpgrades(u: CribUpgrades) {
    this.ownUpgrades = u;
    this.ownHouseRig?.updateUpgrades(u);
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
        };
        this.remoteRigs.set(p.id, entry);
      } else {
        entry.prevX = entry.rig.group.position.x;
        entry.prevZ = entry.rig.group.position.z;
        entry.targetX = p.x;
        entry.targetZ = p.z;
        entry.lastNetTime = nowMs;
        entry.rotY = p.rotY;
        entry.rig.applyOutfit(p.sapeOutfit || 'standard');
      }
    }
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

  public getRadarSnapshot(): RadarSnapshot {
    const allHotspots = [...this.staticHotspots, ...this.homeHotspots];
    return {
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerRotY: this.playerRotY,
      district: this.lastDistrict,
      hotspots: allHotspots.map((h) => ({ id: h.id, label: h.label, x: h.x, z: h.z, color: h.color })),
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

  private onPointerDown = (e: PointerEvent) => {
    if (this.cameraMode !== 'follow') return;
    this.isDraggingCam = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCam || this.cameraMode !== 'follow') return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.camYaw -= dx * 0.0065;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005, 0.08, 1.25);
  };

  private onPointerUp = () => {
    this.isDraggingCam = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.cameraMode !== 'follow') return;
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 5.5, 34);
  };

  private onWindowBlur = () => {
    this.keys.clear();
    this.isDraggingCam = false;
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
    dom.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private findNearestHotspot(): CityHotspot | null {
    let best: CityHotspot | null = null;
    let bestD = Infinity;
    for (const h of [...this.homeHotspots, ...this.staticHotspots]) {
      const d = Math.hypot(this.playerX - h.x, this.playerZ - h.z);
      if (d <= h.radius && d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  private findNearestVehicle(): { id: string; vehId: number; rig: VehicleRig } | null {
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
    this.floodWaterMesh.visible = isFlood || this.floodWaterMesh.position.y > -1.2;
    const targetFloodY = isFlood ? 0.36 : -1.8;
    this.floodWaterMesh.position.y = THREE.MathUtils.lerp(
      this.floodWaterMesh.position.y,
      targetFloodY,
      1 - Math.exp(-2 * dt)
    );

    // 2. Beacon rings & pickups
    for (let i = 0; i < this.beaconRings.length; i++) {
      const r = this.beaconRings[i];
      const pulse = 1 + Math.sin(nowSec * 3.5 + i) * 0.08;
      r.scale.set(pulse, pulse, 1);
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

    // 5. Stream Abidjan chunks around player
    this.streamer?.update(this.playerX, this.playerZ, this.streamer.loadedCount < 25 ? 8 : this.isSoftwareGl ? 3 : 4);

    // 6. Walking Pedestrians
    this.npcSystem.update(dt, this.playerX, this.playerZ, this.isSuperstar);

    // 7. Player Input -> C++/WASM PhysicsCore
    let fwd = 0;
    let turnRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turnRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turnRight -= 1;

    if (Math.abs(this.joystickVec.y) > 0.08) fwd = -this.joystickVec.y;
    if (Math.abs(this.joystickVec.x) > 0.08) turnRight = this.joystickVec.x;

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
        }
      }
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
      const distName = onBridge ? `Pont — ${onBridge.name}` : districtAt(here).name;
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

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      this.stepSimulation(dt, now / 1000);
      this.skyDome?.followCamera(this.camera);
      this.renderer.render(this.scene, this.camera);

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

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('wheel', this.onWheel);

    this.streamer?.dispose();
    this.skyDome?.dispose();
    this.chunkMats.dispose();
    this.npcSystem.dispose();
    this.renderer.dispose();
  }
}
