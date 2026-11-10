/**
 * GTA Abidjan: Babi Stories - Full 3D Open World Game
 * Integrates Three.js PBR rendering, vehicle & character physics,
 * procedural Abidjan map (Plateau, Treichville, Cocody, Yopougon, Lagune Ébrié, Pont HKB),
 * GTA San Andreas HUD, Mission system, Radio stations, and Web Audio synthesis.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';

import {
  PlayerState,
  VehicleState,
  VehicleModelType,
  Mission,
  DistrictInfo,
  WeaponType,
  PedestrianState,
} from './game/types';
import {
  stepVehiclePhysics,
  stepPlayerKinematics,
  getElevationAt,
  calculateWantedDecay,
  calculateWeaponDamage,
  VEHICLE_CONFIGS,
} from './game/physics';
import {
  DISTRICTS,
  generateRoadNetwork,
  generateCityBuildings,
  generateLandmarks,
} from './game/cityMap';
import {
  createRoadTexture,
  createSkyscraperTexture,
  createWaxMarketTexture,
} from './game/textures';
import {
  createWoroVehicleMesh,
  createGbakaVehicleMesh,
  createPoliceVehicleMesh,
  createPlayerMesh,
  createPalmTree,
  createStreetlight,
} from './game/proceduralModels';
import { soundEngine } from './game/audio';
import { STORY_MISSIONS } from './game/missions';
import { GtaHud } from './components/GtaHud';
import { BottomDock } from './components/BottomDock';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // React state for HUD
  const [playerState, setPlayerState] = useState<PlayerState>({
    x: 0,
    y: 0,
    z: -65, // Start at Treichville market
    rotationY: 0,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    isGrounded: true,
    health: 100,
    maxHealth: 100,
    armor: 100,
    cash: 3500,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isJumping: false,
    isAttacking: false,
    attackCombo: 0,
    currentWeapon: 'fist',
    weapons: {
      fist: { type: 'fist', name: 'Poings', damage: 15, range: 2.2, fireRate: 2, ammo: 1, maxAmmo: 1, iconName: 'fist' },
      machete: { type: 'machete', name: 'Machette Coupe-Coupe', damage: 45, range: 2.6, fireRate: 1.5, ammo: 1, maxAmmo: 1, iconName: 'machete' },
      pistol: { type: 'pistol', name: 'Pistolet 9mm', damage: 32, range: 45, fireRate: 3, ammo: 34, maxAmmo: 120, iconName: 'pistol' },
      smg: { type: 'smg', name: 'Micro-SMG', damage: 24, range: 40, fireRate: 8, ammo: 90, maxAmmo: 300, iconName: 'smg' },
      ak47: { type: 'ak47', name: 'AK-47 Kalash', damage: 55, range: 65, fireRate: 6, ammo: 120, maxAmmo: 400, iconName: 'ak47' },
      rpg: { type: 'rpg', name: 'Lance-Roquette RPG', damage: 180, range: 80, fireRate: 0.5, ammo: 4, maxAmmo: 12, iconName: 'rpg' },
    },
    inVehicleId: null,
    wantedLevel: 0,
    wantedProgress: 0,
    lastCrimeTime: 0,
  });

  const [activeVehicle, setActiveVehicle] = useState<VehicleState | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(STORY_MISSIONS[0]);
  const [currentDistrict, setCurrentDistrict] = useState<DistrictInfo>(DISTRICTS.treichville);
  const [gameTimeStr, setGameTimeStr] = useState<string>('14:30');
  const [timeOfDay, setTimeOfDay] = useState<number>(14.5); // 14:30
  const [radioStation, setRadioStation] = useState<string | null>('gbaka_fm');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'tps' | 'top' | 'hood'>('tps');
  const [radarHeading, setRadarHeading] = useState<number>(0);
  const [notification, setNotification] = useState<string | null>("Bienvenue à Abidjan ! Monte dans le Gbaka vert à Treichville.");

  // Mutable Game Engine References
  const gameRef = useRef<{
    player: PlayerState;
    vehicles: Map<string, { state: VehicleState; mesh: THREE.Group; lightbar?: THREE.Group }>;
    playerMeshGroup: THREE.Group | null;
    playerParts: { leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } | null;
    camera: THREE.PerspectiveCamera | null;
    scene: THREE.Scene | null;
    renderer: THREE.WebGLRenderer | null;
    sunLight: THREE.DirectionalLight | null;
    hemiLight: THREE.HemisphereLight | null;
    activeMission: Mission | null;
    keys: Record<string, boolean>;
    cameraPitch: number;
    cameraYaw: number;
    cameraMode: 'tps' | 'top' | 'hood';
    walkAnimTimer: number;
    timeOfDay: number;
    policeSpawnTimer: number;
    peds: Array<{ state: PedestrianState; mesh: THREE.Group }>;
    obstacles: Array<{ x: number; z: number; radius: number }>;
  }>({
    player: playerState,
    vehicles: new Map(),
    playerMeshGroup: null,
    playerParts: null,
    camera: null,
    scene: null,
    renderer: null,
    sunLight: null,
    hemiLight: null,
    activeMission: STORY_MISSIONS[0],
    keys: {},
    cameraPitch: 0.28,
    cameraYaw: 0,
    cameraMode: 'tps',
    walkAnimTimer: 0,
    timeOfDay: 14.5,
    policeSpawnTimer: 0,
    peds: [],
    obstacles: [],
  });

  // Keep gameRef in sync with essential state
  useEffect(() => {
    gameRef.current.activeMission = activeMission;
  }, [activeMission]);

  useEffect(() => {
    gameRef.current.cameraMode = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    gameRef.current.timeOfDay = timeOfDay;
  }, [timeOfDay]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = true;
      gameRef.current.keys[e.code] = true;

      // Fast toggle keys
      if (e.key === 'f' || e.key === 'F' || e.key === 'Enter') {
        handleVehicleAction();
      } else if (e.key === 'v' || e.key === 'V') {
        handleToggleCamera();
      } else if (e.key === 'r' || e.key === 'R') {
        handleNextRadio();
      } else if (e.key === 'h' || e.key === 'H') {
        handleHorn();
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'a' || e.key === 'A') {
        handleSwitchWeapon('prev');
      } else if (e.key === 'e' || e.key === 'E') {
        handleSwitchWeapon('next');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key.toLowerCase()] = false;
      gameRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Three.js Scene Setup & Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(renderer.domElement);
    gameRef.current.renderer = renderer;

    // 3. Create Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8); // tropical sky
    scene.fog = new THREE.FogExp2(0x93c5fd, 0.0035);
    gameRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );
    camera.position.set(0, 5, -75);
    gameRef.current.camera = camera;

    // PMREM Room Environment for PBR Reflections
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback
    }

    // 4. Lighting Rig (Warm sun + cool sky fill)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.85);
    scene.add(hemiLight);
    gameRef.current.hemiLight = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(60, 100, 60);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 280;
    const d = 90;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    gameRef.current.sunLight = sunLight;

    // 5. Build Procedural Abidjan Terrain & City Elements
    // Ground Terrain Plane
    const terrainGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // city foundation
      roughness: 0.9,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Lagune Ébrié Water Surface
    const waterGeo = new THREE.PlaneGeometry(500, 80);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0891b2, // tropical lagoon cyan
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const lagoonWater = new THREE.Mesh(waterGeo, waterMat);
    lagoonWater.position.set(0, -1.8, 5);
    scene.add(lagoonWater);

    // Roads
    const roadTexture = createRoadTexture();
    const roads = generateRoadNetwork();
    roads.forEach((road) => {
      const dx = road.endX - road.startX;
      const dz = road.endZ - road.startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const roadGeo = new THREE.PlaneGeometry(road.width, length);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMat = new THREE.MeshStandardMaterial({
        map: roadTexture,
        roughness: 0.7,
      });

      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      const midX = (road.startX + road.endX) / 2;
      const midZ = (road.startZ + road.endZ) / 2;
      const elev = getElevationAt(midX, midZ);

      roadMesh.position.set(midX, elev + 0.02, midZ);
      roadMesh.rotation.y = angle;
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);

      // If it's a bridge, add bridge pillars and railing
      if (road.isBridge) {
        // Concrete bridge base deck
        const deckGeo = new THREE.BoxGeometry(road.width + 0.5, 1.2, length);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(midX, elev - 0.6, midZ);
        deck.rotation.y = angle;
        deck.castShadow = true;
        scene.add(deck);

        // Bridge support pillars extending down into lagoon
        for (let p = -length / 2 + 15; p < length / 2; p += 25) {
          const pillarGeo = new THREE.CylinderGeometry(1.2, 1.5, elev + 3, 8);
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(midX, (elev - 1.8) / 2, midZ + p);
          pillar.castShadow = true;
          scene.add(pillar);
        }
      }
    });

    // Pont Henri Konan Bédié (HKB) Grand Pylons & Stay-cables
    const hkbPylonGeo = new THREE.ConeGeometry(3.5, 45, 4);
    const hkbPylonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.4,
    });
    [-10, 25].forEach((pz) => {
      const pylon = new THREE.Mesh(hkbPylonGeo, hkbPylonMat);
      pylon.position.set(85, 22, pz);
      pylon.castShadow = true;
      scene.add(pylon);

      // Stay cables radiating from top of pylon down to bridge deck
      for (let c = -30; c <= 30; c += 10) {
        if (c === 0) continue;
        const cableCurve = new THREE.LineCurve3(
          new THREE.Vector3(85, 38, pz),
          new THREE.Vector3(85, 6, pz + c)
        );
        const cableGeo = new THREE.TubeGeometry(cableCurve, 1, 0.08, 4, false);
        const cableMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.4,
        });
        const cable = new THREE.Mesh(cableGeo, cableMat);
        scene.add(cable);
      }
    });

    // City Buildings & Skyscrapers
    const skyscraperTex = createSkyscraperTexture();
    const marketTex = createWaxMarketTexture();
    const buildings = generateCityBuildings();
    const obstacles: Array<{ x: number; z: number; radius: number }> = [];

    buildings.forEach((b) => {
      const bldgGeo = new THREE.BoxGeometry(b.width, b.height, b.depth);
      let bldgMat: THREE.Material;

      if (b.type === 'skyscraper') {
        bldgMat = new THREE.MeshStandardMaterial({
          map: skyscraperTex,
          color: b.facadeColor || '#334155',
          roughness: 0.3,
          metalness: 0.6,
        });
      } else if (b.type === 'market_stall' || b.type === 'maquis') {
        bldgMat = new THREE.MeshStandardMaterial({
          map: marketTex,
          color: b.facadeColor || '#f97316',
          roughness: 0.8,
        });
      } else {
        bldgMat = new THREE.MeshStandardMaterial({
          color: b.facadeColor || '#cbd5e1',
          roughness: 0.7,
        });
      }

      const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
      const elev = getElevationAt(b.x, b.z);
      bldgMesh.position.set(b.x, elev + b.height / 2, b.z);
      bldgMesh.castShadow = true;
      bldgMesh.receiveShadow = true;
      scene.add(bldgMesh);

      // Add to collision obstacle list
      const radius = Math.max(b.width, b.depth) / 2 + 0.8;
      obstacles.push({ x: b.x, z: b.z, radius });
    });
    gameRef.current.obstacles = obstacles;

    // Palm trees along boulevards (Plateau & Cocody)
    const palmPositions = [
      [8, 55], [8, 75], [8, 95], [8, 115],
      [-12, 55], [-12, 75], [-12, 95], [-12, 115],
      [95, 75], [105, 95], [125, 115],
      [-95, 75], [-125, 95],
    ];
    palmPositions.forEach(([px, pz]) => {
      const palm = createPalmTree();
      palm.position.set(px, getElevationAt(px, pz), pz);
      palm.scale.setScalar(0.9 + Math.random() * 0.25);
      scene.add(palm);
    });

    // Streetlights
    [-2, 85].forEach((rx) => {
      for (let rz = -60; rz <= 120; rz += 40) {
        const sl = createStreetlight();
        sl.position.set(rx + (rx < 0 ? -7 : 7), getElevationAt(rx, rz), rz);
        scene.add(sl);
      }
    });

    // 6. Spawn Player Model
    const playerData = createPlayerMesh();
    playerData.group.position.set(playerState.x, playerState.y, playerState.z);
    scene.add(playerData.group);
    gameRef.current.playerMeshGroup = playerData.group;
    gameRef.current.playerParts = {
      leftLeg: playerData.leftLeg,
      rightLeg: playerData.rightLeg,
      leftArm: playerData.leftArm,
      rightArm: playerData.rightArm,
    };

    // 7. Spawn Initial Vehicles
    // A) Mission 1 Green Gbaka at Treichville Market
    const gbakaMesh = createGbakaVehicleMesh();
    const gbakaState: VehicleState = {
      id: 'veh_gbaka_mission_1',
      type: 'gbaka',
      name: 'Gbaka 207 (Minibus)',
      x: 0,
      y: 0,
      z: -70,
      rotationY: 0,
      speed: 0,
      steering: 0,
      health: 2000,
      maxHealth: 2000,
      isEngineOn: false,
      isSirenOn: false,
      isHonking: false,
      lightsOn: false,
      driverId: null,
      isPolice: false,
      color: '#15803d',
    };
    gbakaMesh.position.set(gbakaState.x, gbakaState.y, gbakaState.z);
    scene.add(gbakaMesh);
    gameRef.current.vehicles.set(gbakaState.id, { state: gbakaState, mesh: gbakaMesh });

    // B) Yellow Wôrô-wôrô Taxi nearby
    const woroMesh = createWoroVehicleMesh();
    const woroState: VehicleState = {
      id: 'veh_woro_1',
      type: 'woro',
      name: 'Wôrô-wôrô 504 (Taxi)',
      x: -6,
      y: 0,
      z: -55,
      rotationY: 0.1,
      speed: 0,
      steering: 0,
      health: 1200,
      maxHealth: 1200,
      isEngineOn: false,
      isSirenOn: false,
      isHonking: false,
      lightsOn: false,
      driverId: null,
      isPolice: false,
      color: '#eab308',
    };
    woroMesh.position.set(woroState.x, woroState.y, woroState.z);
    scene.add(woroMesh);
    gameRef.current.vehicles.set(woroState.id, { state: woroState, mesh: woroMesh });

    // C) Police Cruiser patrolling Plateau
    const policeData = createPoliceVehicleMesh();
    const policeState: VehicleState = {
      id: 'veh_police_1',
      type: 'police',
      name: 'Police Nationale CI',
      x: -2,
      y: 1,
      z: 75,
      rotationY: Math.PI,
      speed: 12,
      steering: 0,
      health: 1500,
      maxHealth: 1500,
      isEngineOn: true,
      isSirenOn: false,
      isHonking: false,
      lightsOn: true,
      driverId: 'police_npc',
      isPolice: true,
      color: '#2563eb',
    };
    policeData.group.position.set(policeState.x, policeState.y, policeState.z);
    scene.add(policeData.group);
    gameRef.current.vehicles.set(policeState.id, {
      state: policeState,
      mesh: policeData.group,
      lightbar: policeData.lightbar,
    });

    // 8. Spawn Pedestrians
    const pedColors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea', '#ea580c'];
    for (let p = 0; p < 14; p++) {
      const pedMesh = createPlayerMesh().group;
      const pedX = (p % 2 === 0 ? 5 : -7) + (Math.random() - 0.5) * 4;
      const pedZ = -80 + p * 15;
      const pedState: PedestrianState = {
        id: `ped_${p}`,
        x: pedX,
        y: getElevationAt(pedX, pedZ),
        z: pedZ,
        rotationY: Math.random() * Math.PI * 2,
        health: 50,
        speed: 1.8,
        targetX: pedX + (Math.random() - 0.5) * 12,
        targetZ: pedZ + (Math.random() - 0.5) * 25,
        isPanicking: false,
        dialogueText: null,
        dialogueTimer: 0,
        shirtColor: pedColors[p % pedColors.length],
        pantsColor: '#1e293b',
        gender: p % 2 === 0 ? 'male' : 'female',
      };
      pedMesh.position.set(pedState.x, pedState.y, pedState.z);
      scene.add(pedMesh);
      gameRef.current.peds.push({ state: pedState, mesh: pedMesh });
    }

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Start Radio
    soundEngine.startRadio('gbaka_fm');

    // 11. Animation Game Loop (Clock & Tick)
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const dt = Math.min(0.08, clock.getDelta());
      const g = gameRef.current;
      const keys = g.keys;

      // Update in-game day/night clock
      g.timeOfDay = (g.timeOfDay + dt * 0.05) % 24;
      const hours = Math.floor(g.timeOfDay);
      const mins = Math.floor((g.timeOfDay % 1) * 60);
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      // Adjust sky and sun based on timeOfDay
      if (g.sunLight && g.scene) {
        const sunAngle = ((g.timeOfDay - 6) / 12) * Math.PI;
        const sunY = Math.sin(sunAngle) * 90;
        const sunX = Math.cos(sunAngle) * 90;
        g.sunLight.position.set(sunX, Math.max(10, sunY), 40);

        if (g.timeOfDay >= 6 && g.timeOfDay <= 18) {
          // Daytime / Sunset
          g.sunLight.intensity = Math.max(0.4, Math.sin(sunAngle) * 1.5);
          g.scene.background = new THREE.Color(
            g.timeOfDay > 17 || g.timeOfDay < 7 ? 0xf97316 : 0x38bdf8
          );
        } else {
          // Nighttime (neon atmosphere)
          g.sunLight.intensity = 0.2;
          g.scene.background = new THREE.Color(0x090d16);
        }
      }

      // Check current district
      let detectedDistrict: DistrictInfo = DISTRICTS.treichville;
      const px = g.player.inVehicleId
        ? g.vehicles.get(g.player.inVehicleId)?.state.x || g.player.x
        : g.player.x;
      const pz = g.player.inVehicleId
        ? g.vehicles.get(g.player.inVehicleId)?.state.z || g.player.z
        : g.player.z;

      Object.values(DISTRICTS).forEach((dist) => {
        if (
          px >= dist.bounds.minX &&
          px <= dist.bounds.maxX &&
          pz >= dist.bounds.minZ &&
          pz <= dist.bounds.maxZ
        ) {
          detectedDistrict = dist;
        }
      });

      // ================= VEHICLE DRIVING OR ON FOOT =================
      let currentVehState: VehicleState | null = null;

      if (g.player.inVehicleId && g.vehicles.has(g.player.inVehicleId)) {
        const vehObj = g.vehicles.get(g.player.inVehicleId)!;
        const veh = vehObj.state;

        // Player vehicle inputs
        let throttle = 0;
        if (keys['w'] || keys['arrowup']) throttle += 1;
        if (keys['s'] || keys['arrowdown']) throttle -= 1;

        let steer = 0;
        if (keys['a'] || keys['arrowleft']) steer += 1;
        if (keys['d'] || keys['arrowright']) steer -= 1;

        const brake = keys['s'] && veh.speed > 1;
        const handbrake = !!keys[' '];

        // Step vehicle physics
        const { updated, collisionOccurred, impactVelocity } = stepVehiclePhysics(
          veh,
          { throttle, steer, brake, handbrake },
          dt,
          g.obstacles
        );

        vehObj.state = updated;
        currentVehState = updated;

        // Sync vehicle 3D mesh
        vehObj.mesh.position.set(updated.x, updated.y, updated.z);
        vehObj.mesh.rotation.y = updated.rotationY;

        // Engine sound modulation
        const config = VEHICLE_CONFIGS[updated.type] || VEHICLE_CONFIGS.woro;
        soundEngine.updateEngine(updated.speed, config.topSpeed, throttle);

        if (collisionOccurred && impactVelocity > 8) {
          soundEngine.playPunch();
        }

        // Hide player mesh while inside car
        if (g.playerMeshGroup) {
          g.playerMeshGroup.visible = false;
        }

        // Player follows car position
        g.player.x = updated.x;
        g.player.y = updated.y;
        g.player.z = updated.z;
        g.player.rotationY = updated.rotationY;
      } else {
        // Player on foot
        let moveX = 0;
        let moveZ = 0;
        if (keys['w'] || keys['arrowup']) moveZ += 1;
        if (keys['s'] || keys['arrowdown']) moveZ -= 1;
        if (keys['a'] || keys['arrowleft']) moveX -= 1;
        if (keys['d'] || keys['arrowright']) moveX += 1;

        const sprint = !!keys['shift'];
        const jump = !!keys[' '];

        const updatedPlayer = stepPlayerKinematics(
          g.player,
          { moveX, moveZ, sprint, jump },
          g.cameraYaw,
          dt,
          g.obstacles
        );
        g.player = updatedPlayer;

        // Update player 3D mesh
        if (g.playerMeshGroup) {
          g.playerMeshGroup.visible = true;
          g.playerMeshGroup.position.set(g.player.x, g.player.y, g.player.z);
          g.playerMeshGroup.rotation.y = g.player.rotationY;

          // Walk/Sprint limb swing animation
          if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
            const animSpeed = sprint ? 16 : 9;
            g.walkAnimTimer += dt * animSpeed;
            const swing = Math.sin(g.walkAnimTimer) * 0.65;

            if (g.playerParts) {
              g.playerParts.leftLeg.rotation.x = swing;
              g.playerParts.rightLeg.rotation.x = -swing;
              g.playerParts.leftArm.rotation.x = -swing * 0.8;
              g.playerParts.rightArm.rotation.x = swing * 0.8;
            }
          } else if (g.playerParts) {
            g.playerParts.leftLeg.rotation.x = 0;
            g.playerParts.rightLeg.rotation.x = 0;
            g.playerParts.leftArm.rotation.x = 0;
            g.playerParts.rightArm.rotation.x = 0;
          }
        }
      }

      // ================= MISSION OBJECTIVE CHECK =================
      if (g.activeMission && !g.activeMission.isCompleted && !g.activeMission.isFailed) {
        const step = g.activeMission.steps[g.activeMission.currentStepIndex];
        if (step) {
          const dx = g.player.x - step.targetX;
          const dz = g.player.z - step.targetZ;
          const dist = Math.sqrt(dx * dx + dz * dz);

          let stepPassed = false;
          if (step.requiredAction === 'enter_vehicle') {
            if (g.player.inVehicleId) {
              stepPassed = true;
            }
          } else if (dist <= step.targetRadius) {
            stepPassed = true;
          }

          if (stepPassed) {
            if (g.activeMission.currentStepIndex < g.activeMission.steps.length - 1) {
              g.activeMission.currentStepIndex += 1;
              setNotification(`Objectif réussi ! Étape suivante: ${g.activeMission.steps[g.activeMission.currentStepIndex].text}`);
            } else {
              // Mission completed!
              g.activeMission.isCompleted = true;
              g.player.cash += g.activeMission.rewardCash;
              soundEngine.playMissionPassed();
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              setNotification(`★ MISSION RÉUSSIE : ${g.activeMission.title} ! +$${g.activeMission.rewardCash} ★`);
            }
          }
        }
      }

      // ================= POLICE & WANTED LEVEL AI =================
      if (g.player.wantedLevel > 0) {
        g.vehicles.forEach((vObj) => {
          if (vObj.state.isPolice) {
            // Chase player
            const dx = g.player.x - vObj.state.x;
            const dz = g.player.z - vObj.state.z;
            const targetAngle = Math.atan2(dx, dz);
            vObj.state.rotationY = targetAngle;
            vObj.state.speed = 22; // pursuit speed
            vObj.state.x += Math.sin(targetAngle) * vObj.state.speed * dt;
            vObj.state.z += Math.cos(targetAngle) * vObj.state.speed * dt;
            vObj.state.y = getElevationAt(vObj.state.x, vObj.state.z);

            vObj.mesh.position.set(vObj.state.x, vObj.state.y, vObj.state.z);
            vObj.mesh.rotation.y = vObj.state.rotationY;

            // Flash lightbar
            if (vObj.lightbar) {
              vObj.lightbar.rotation.y += dt * 18;
            }
          }
        });
      }

      // Wanted level decay check
      g.player.wantedLevel = calculateWantedDecay(
        g.player.wantedLevel,
        (Date.now() - g.player.lastCrimeTime) / 1000,
        100
      );

      // ================= THIRD PERSON CAMERA =================
      if (camera) {
        const targetX = g.player.x;
        const targetY = g.player.y + 1.6;
        const targetZ = g.player.z;

        if (g.cameraMode === 'tps') {
          const camDist = g.player.inVehicleId ? 8.2 : 4.8;
          const camHeight = g.player.inVehicleId ? 3.4 : 2.2;
          const heading = g.player.inVehicleId
            ? currentVehState?.rotationY || 0
            : g.player.rotationY;

          const desiredCamX = targetX - Math.sin(heading) * camDist;
          const desiredCamZ = targetZ - Math.cos(heading) * camDist;
          const desiredCamY = targetY + camHeight;

          // Smooth exponential damping
          camera.position.x += (desiredCamX - camera.position.x) * (6 * dt);
          camera.position.y += (desiredCamY - camera.position.y) * (6 * dt);
          camera.position.z += (desiredCamZ - camera.position.z) * (6 * dt);

          camera.lookAt(targetX, targetY, targetZ);
          setRadarHeading(-heading);
        } else if (g.cameraMode === 'top') {
          // Classic GTA 1 / GTA 2 top-down angle
          camera.position.set(targetX, targetY + 35, targetZ + 0.1);
          camera.lookAt(targetX, targetY, targetZ);
          setRadarHeading(0);
        } else {
          // Hood / Driver First-Person cam
          camera.position.set(targetX, targetY + 1.2, targetZ);
          const heading = currentVehState?.rotationY || g.player.rotationY;
          camera.lookAt(targetX + Math.sin(heading) * 10, targetY + 1.0, targetZ + Math.cos(heading) * 10);
          setRadarHeading(-heading);
        }
      }

      // Render frame
      renderer.render(scene, camera);

      // Sync React state periodically (10Hz)
      if (Math.random() < 0.15) {
        setPlayerState({ ...g.player });
        setActiveVehicle(currentVehState);
        setCurrentDistrict(detectedDistrict);
        setGameTimeStr(timeStr);
      }

      // Next frame scheduling
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      soundEngine.stopEngine();
      soundEngine.stopSiren();
      soundEngine.stopRadio();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Action handlers
  const handleVehicleAction = () => {
    const g = gameRef.current;
    if (g.player.inVehicleId) {
      // Exit vehicle
      const vehObj = g.vehicles.get(g.player.inVehicleId);
      if (vehObj) {
        vehObj.state.driverId = null;
        vehObj.state.isEngineOn = false;
        // Position player next to driver door
        g.player.x = vehObj.state.x + Math.cos(vehObj.state.rotationY) * 2.2;
        g.player.z = vehObj.state.z - Math.sin(vehObj.state.rotationY) * 2.2;
        g.player.y = getElevationAt(g.player.x, g.player.z);
      }
      g.player.inVehicleId = null;
      soundEngine.stopEngine();
      setNotification("Tu es sorti du véhicule.");
    } else {
      // Find closest vehicle within 4.5m
      let closestVeh: VehicleState | null = null;
      let minDistance = 4.5;

      g.vehicles.forEach((vObj) => {
        const dx = g.player.x - vObj.state.x;
        const dz = g.player.z - vObj.state.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDistance) {
          minDistance = dist;
          closestVeh = vObj.state;
        }
      });

      if (closestVeh) {
        const v = closestVeh as VehicleState;
        g.player.inVehicleId = v.id;
        v.driverId = 'player';
        v.isEngineOn = true;
        soundEngine.startEngine();
        setNotification(`Tu as pris le volant : ${v.name}`);
      } else {
        setNotification("Aucun véhicule à proximité (approche d'une voiture et appuie sur F)");
      }
    }
    setPlayerState({ ...g.player });
  };

  const handleAttack = () => {
    const g = gameRef.current;
    if (g.player.inVehicleId) return;

    const weapon = g.player.weapons[g.player.currentWeapon];
    if (g.player.currentWeapon === 'fist' || g.player.currentWeapon === 'machete') {
      soundEngine.playPunch();
      g.player.attackCombo = (g.player.attackCombo + 1) % 3;
    } else {
      if (weapon.ammo > 0) {
        weapon.ammo -= 1;
        soundEngine.playGunshot(g.player.currentWeapon);

        // Gunshot crime alert -> 1 wanted star if near police
        if (g.player.wantedLevel === 0 && Math.random() < 0.3) {
          g.player.wantedLevel = 1;
          g.player.lastCrimeTime = Date.now();
          soundEngine.startSiren();
          setNotification("★ ATTENTION : La Police Nationale recherche le tireur ! ★");
        }
      }
    }
    setPlayerState({ ...g.player });
  };

  const handleHorn = () => {
    soundEngine.playHorn();
  };

  const handleNextRadio = () => {
    const stations = ['gbaka_fm', 'nostalgie', 'ebony_radio', null];
    const currentIndex = stations.indexOf(radioStation);
    const nextStation = stations[(currentIndex + 1) % stations.length];
    setRadioStation(nextStation);
    soundEngine.startRadio(nextStation);
  };

  const handleSwitchWeapon = (direction: 'next' | 'prev') => {
    const weaponsList: WeaponType[] = ['fist', 'machete', 'pistol', 'smg', 'ak47', 'rpg'];
    const currentIndex = weaponsList.indexOf(playerState.currentWeapon);
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % weaponsList.length
        : (currentIndex - 1 + weaponsList.length) % weaponsList.length;

    const newWeapon = weaponsList[nextIndex];
    gameRef.current.player.currentWeapon = newWeapon;
    setPlayerState({ ...gameRef.current.player });
  };

  const handleToggleCamera = () => {
    const modes: Array<'tps' | 'top' | 'hood'> = ['tps', 'top', 'hood'];
    const nextMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
    setCameraMode(nextMode);
  };

  const handleSpawnVehicle = (type: VehicleModelType) => {
    const g = gameRef.current;
    if (!g.scene) return;

    let mesh: THREE.Group;
    let lightbar: THREE.Group | undefined;

    if (type === 'woro') {
      mesh = createWoroVehicleMesh();
    } else if (type === 'gbaka') {
      mesh = createGbakaVehicleMesh();
    } else if (type === 'police') {
      const p = createPoliceVehicleMesh();
      mesh = p.group;
      lightbar = p.lightbar;
    } else {
      mesh = createWoroVehicleMesh();
    }

    const forwardX = Math.sin(g.player.rotationY);
    const forwardZ = Math.cos(g.player.rotationY);
    const spawnX = g.player.x + forwardX * 4;
    const spawnZ = g.player.z + forwardZ * 4;
    const spawnY = getElevationAt(spawnX, spawnZ);

    const newVeh: VehicleState = {
      id: `spawned_${Date.now()}`,
      type,
      name: VEHICLE_CONFIGS[type]?.name || 'Véhicule',
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      rotationY: g.player.rotationY,
      speed: 0,
      steering: 0,
      health: 1200,
      maxHealth: 1200,
      isEngineOn: false,
      isSirenOn: false,
      isHonking: false,
      lightsOn: false,
      driverId: null,
      isPolice: type === 'police',
      color: VEHICLE_CONFIGS[type]?.color || '#ffffff',
    };

    mesh.position.set(spawnX, spawnY, spawnZ);
    mesh.rotation.y = g.player.rotationY;
    g.scene.add(mesh);
    g.vehicles.set(newVeh.id, { state: newVeh, mesh, lightbar });

    setNotification(`Véhicule invoqué : ${newVeh.name} !`);
  };

  const handleStartMission = (missionId: string) => {
    const found = STORY_MISSIONS.find((m) => m.id === missionId);
    if (found) {
      found.currentStepIndex = 0;
      found.isCompleted = false;
      found.isFailed = false;
      setActiveMission({ ...found });
      setNotification(`Mission lancée : ${found.title}`);
    }
  };

  // Cheats / Powerups
  const handleGiveWeapons = () => {
    const g = gameRef.current;
    g.player.weapons.pistol.ammo = 120;
    g.player.weapons.smg.ammo = 300;
    g.player.weapons.ak47.ammo = 400;
    g.player.weapons.rpg.ammo = 12;
    g.player.currentWeapon = 'ak47';
    setPlayerState({ ...g.player });
    setNotification("★ CODE GTA : Pack d'armes Kalash & Roquettes activé ! ★");
  };

  const handleHealPlayer = () => {
    const g = gameRef.current;
    g.player.health = 100;
    g.player.armor = 100;
    setPlayerState({ ...g.player });
    setNotification("★ CODE GTA : Santé & Gilet pare-balles à 100% ! ★");
  };

  const handleClearWanted = () => {
    const g = gameRef.current;
    g.player.wantedLevel = 0;
    soundEngine.stopSiren();
    setPlayerState({ ...g.player });
    setNotification("★ CODE GTA : Avis de recherche effacé ! ★");
  };

  const handleAddCash = () => {
    const g = gameRef.current;
    g.player.cash += 5000;
    setPlayerState({ ...g.player });
    setNotification("★ CODE GTA : +$5,000 Cash ajouté au compte ! ★");
  };

  const getRadioDisplayName = () => {
    if (!radioStation) return 'Radio Éteinte';
    if (radioStation === 'gbaka_fm') return 'Gbaka FM 104.5 (Coupé-Décalé)';
    if (radioStation === 'nostalgie') return 'Radio Nostalgie Babi';
    if (radioStation === 'ebony_radio') return 'Ebony Radio (Afro-Trap)';
    return 'Radio Babi';
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Crosshair when on foot with firearm */}
      {!playerState.inVehicleId && playerState.currentWeapon !== 'fist' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border border-white/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          </div>
        </div>
      )}

      {/* Floating Game Notification */}
      {notification && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 bg-black/85 border border-amber-500/70 text-amber-300 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full shadow-2xl z-30 animate-pulse">
          {notification}
        </div>
      )}

      {/* Authentic GTA San Andreas HUD */}
      <GtaHud
        player={playerState}
        vehicle={activeVehicle}
        activeMission={activeMission}
        currentDistrict={currentDistrict}
        gameTime={gameTimeStr}
        radioStationName={getRadioDisplayName()}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(soundEngine.toggleMute())}
        onNextRadio={handleNextRadio}
        onSwitchWeapon={handleSwitchWeapon}
        onVehicleAction={handleVehicleAction}
        onAttack={handleAttack}
        onHorn={handleHorn}
        onCameraToggle={handleToggleCamera}
        cameraMode={cameraMode}
        onStartMission={handleStartMission}
        availableMissions={STORY_MISSIONS}
        radarHeading={radarHeading}
      />

      {/* Sleek Collapsible Bottom Dock */}
      <BottomDock
        timeOfDay={timeOfDay}
        onChangeTime={(t) => setTimeOfDay(t)}
        cameraMode={cameraMode}
        onToggleCamera={handleToggleCamera}
        onSpawnVehicle={handleSpawnVehicle}
        radioStation={radioStation}
        onChangeRadio={(st) => {
          setRadioStation(st);
          soundEngine.startRadio(st);
        }}
        onGiveWeapons={handleGiveWeapons}
        onHealPlayer={handleHealPlayer}
        onClearWanted={handleClearWanted}
        onAddCash={handleAddCash}
      />
    </div>
  );
}
