/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Moteur 3D Métropole d'Abidjan & Véhicules GTA San Andreas
 * 
 * - Modèle humain haute fidélité (CJ San Andreas : torse musclé, marcel/chemise, jean, sneakers, tête sculptée)
 * - Véhicules fidèles d'Abidjan (Woro-woro 504 jaune avec galerie de bagages sur le toit, Gbaka vert, BMW, Rolls)
 * - Échappement à particules de fumée, phares directionnels, suspension active
 * - Audio procédural Web Audio (moteur GTA, crissement de pneus, bruits de pas)
 * - Détection automatique des quartiers (Plateau, Cocody, Adjamé, Lagune, Treichville, Grand-Bassam)
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { PlayerState, SchoolBadgeId } from '../types/game';
import { audioFx } from '../services/audioFxService';
import { GtaRadar } from './GtaRadar';
import {
  PhysicsCore,
  SolidFlag,
  VehiclePreset,
  createVehicleState,
  createCharacterState,
  loadPhysics
} from '../physics/PhysicsCore';
import { playerVehiclePreset } from '../physics/abidjanWorld';
import { WorldStreamer } from '../world/WorldStreamer';
import { createChunkMaterials } from '../world/chunkMesh';
import { createChunkProvider } from '../world/chunkProvider';
import { findHouseLot, carSpotForLot, SPECIAL_FOOTPRINTS, HouseLot } from '../world/city';
import { HomeType, districtAt } from '../world/abidjanGeography';
import { bridgeAt } from '../world/roads';
import { registerPlayerHouse, houseToWorld } from '../world/playerHouse';
import { RoadCar, updateRoadTraffic } from '../world/roadTraffic';
import { strHash } from '../world/rng';
import { HeldControls, createHeldControls } from '../physics/controls';

const NO_HELD_CONTROLS: HeldControls = createHeldControls();

interface InteractiveHotspot {
  id: string;
  name: string;
  icon: string;
  pos: THREE.Vector3;
  type: 'bed' | 'shower' | 'fridge' | 'computer' | 'tv' | 'car' | 'caiman_school' | 'alysma_school' | 'alex_school';
}

interface ThreeCanvasProps {
  playerState: PlayerState;
  moveDirection: { x: number; y: number };
  onInteractFurniture: (actionType: string) => void;
  cameraMode?: 'shoulder' | 'topdown';
  onToggleCameraMode?: () => void;
  onUnlockBadge?: (badgeId: SchoolBadgeId) => void;
  onDistrictChange?: (districtName: string) => void;
  heldControls?: React.MutableRefObject<HeldControls>;
  /** Rempli par ThreeCanvas : déclenche l'action ✕ / E / F (entrer-sortir de voiture, interagir). Renvoie false si rien à faire. */
  crossActionRef?: React.MutableRefObject<(() => boolean) | null>;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  playerState,
  moveDirection,
  onInteractFurniture,
  cameraMode = 'shoulder',
  onToggleCameraMode,
  onUnlockBadge,
  onDistrictChange,
  heldControls,
  crossActionRef
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Parcelle de la maison du joueur (déterministe ; en multijoueur, le serveur attribuera la parcelle)
  const homeLot: HouseLot = useMemo(() => {
    const seed = strHash(`${playerState.character.firstName}|${playerState.character.lastName}|${playerState.destiny.id}`);
    const lot = findHouseLot(playerState.destiny.homeType as HomeType, seed);
    return lot ?? { id: 'fallback', district: 'plateau', x: 0, z: 0, front: { x: 0, z: 1 }, rotationY: 0, width: 18, depth: 18, toStreet: 9, homes: [] };
  }, [playerState.destiny.homeType, playerState.destiny.id, playerState.character.firstName, playerState.character.lastName]);
  const homeSpot = useMemo(() => carSpotForLot(homeLot), [homeLot]);

  // Cœur physique WebAssembly (physics/physics.cpp), chargé une seule fois
  const [physics, setPhysics] = useState<PhysicsCore | null>(null);
  const [physicsError, setPhysicsError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadPhysics()
      .then((core) => { if (alive) setPhysics(core); })
      .catch((err: unknown) => { if (alive) setPhysicsError(err instanceof Error ? err.message : 'Échec du chargement du moteur physique'); });
    return () => { alive = false; };
  }, []);
  const heldControlsRef = useRef<HeldControls>(heldControls?.current ?? NO_HELD_CONTROLS);
  useEffect(() => {
    heldControlsRef.current = heldControls?.current ?? NO_HELD_CONTROLS;
  }, [heldControls]);

  // État de conduite
  const [isDriving, setIsDriving] = useState(false);
  const isDrivingRef = useRef(false);

  // Prompt d'interaction à proximité
  const [activePrompt, setActivePrompt] = useState<InteractiveHotspot | null>(null);

  // Vitesse actuelle en km/h
  const [carSpeedKmh, setCarSpeedKmh] = useState(0);

  // La ville est prête quand les chunks autour du joueur sont chargés
  const [cityReady, setCityReady] = useState(false);

  // Coordonnées pour le Radar GTA
  const [radarData, setRadarData] = useState({
    playerX: 0,
    playerZ: 0,
    playerRot: 0,
    camYaw: 0,
    district: 'ABIDJAN'
  });

  // Refs de boucle 60 FPS
  const moveDirectionRef = useRef(moveDirection);
  useEffect(() => {
    moveDirectionRef.current = moveDirection;
  }, [moveDirection]);

  const onInteractRef = useRef(onInteractFurniture);
  useEffect(() => {
    onInteractRef.current = onInteractFurniture;
  }, [onInteractFurniture]);

  const onUnlockBadgeRef = useRef(onUnlockBadge);
  useEffect(() => {
    onUnlockBadgeRef.current = onUnlockBadge;
  }, [onUnlockBadge]);

  const onDistrictChangeRef = useRef(onDistrictChange);
  useEffect(() => {
    onDistrictChangeRef.current = onDistrictChange;
  }, [onDistrictChange]);

  const isDrivingStateRef = useRef(isDriving);
  useEffect(() => {
    isDrivingStateRef.current = isDriving;
    isDrivingRef.current = isDriving;
    if (!isDriving) {
      audioFx.stopEngine();
    }
  }, [isDriving]);

  // Position et physique du joueur / véhicule
  const playerPosRef = useRef({ x: homeLot.x, y: 0, z: homeLot.z, rot: homeLot.rotationY, speed: 0 });
  const carStateRef = useRef({
    x: homeSpot.x,
    y: 0,
    z: homeSpot.z,
    rot: homeSpot.heading,
    speed: 0,
    steering: 0,
    maxSpeed: 26, // ~95 km/h
    acceleration: 19,
    drag: 0.94,
    vx: 0,
    vz: 0,
    w: 0
  });

  // Caméra Orbitale GTA San Andreas
  const camOrbitRef = useRef({
    yaw: 0.1,
    pitch: 0.35,
    distance: cameraMode === 'topdown' ? 24 : 6.5,
    targetDistance: cameraMode === 'topdown' ? 24 : 6.5,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  useEffect(() => {
    camOrbitRef.current.targetDistance = cameraMode === 'topdown' ? 24 : (isDriving ? 9.8 : 6.2);
  }, [cameraMode, isDriving]);

  // La scène ne se reconstruit qu'aux changements d'éclairage (nuit / coucher de soleil / jour),
  // et non plus à chaque minute de jeu (1 minute de jeu ≈ 0,9 s réelle).
  const minuteOfDay = playerState.inGameMinute;
  const lightBucket: 'night' | 'sunset' | 'day' =
    minuteOfDay > 1260 || minuteOfDay < 360 ? 'night' : minuteOfDay >= 1050 ? 'sunset' : 'day';

  useEffect(() => {
    if (!mountRef.current || !physics) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    // Niveau de détail : téléphones / machines modestes -> rayon de ville et ombres réduits
    const lowEnd = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4;

    // 1. Ciel Tropical San Andreas & Météo d'Abidjan
    const isNight = lightBucket === 'night';
    const isSunset = lightBucket === 'sunset';

    const skyColor = isNight
      ? 0x050811
      : isSunset
      ? 0xea580c // Coucher de soleil orangé chaud GTA
      : playerState.weather === 'harmattan'
      ? 0xd97706
      : playerState.weather === 'rain_tropical' || playerState.weather === 'flood_inondation'
      ? 0x334155
      : 0x38bdf8;

    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.0075);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.2, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowEnd ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);

    // 2. Éclairage PBR d'Abidjan
    const ambientLight = new THREE.AmbientLight(0xffedd5, isNight ? 0.35 : 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(isSunset ? 0xf97316 : 0xfef08a, isNight ? 0.2 : 1.45);
    sunLight.position.set(45, 75, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = lowEnd ? 1024 : 2048;
    sunLight.shadow.mapSize.height = lowEnd ? 1024 : 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -70;
    sunLight.shadow.camera.right = 70;
    sunLight.shadow.camera.top = 70;
    sunLight.shadow.camera.bottom = -70;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.45);
    scene.add(hemiLight);

    // 3. LA VILLE D'ABIDJAN : générée par chunks de 64 m (identique pour tous les joueurs), chargée autour du joueur
    const hotspots: InteractiveHotspot[] = [];
    const schoolHotspot = (specId: string, id: InteractiveHotspot['type'], name: string, icon: string): void => {
      const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === specId);
      if (!fp) return;
      const vx = -Math.sin(fp.angle);
      const vz = Math.cos(fp.angle);
      hotspots.push({ id, name, icon, pos: new THREE.Vector3(fp.x + vx * (fp.d / 2 + 3), 1.5, fp.z + vz * (fp.d / 2 + 3)), type: id });
    };
    schoolHotspot('lycee_caiman', 'caiman_school', 'Lycée Classique (Badge Caïman)', '🐊');
    schoolHotspot('lycee_alysma', 'alysma_school', 'Lycée Sainte-Marie (Badge Alysma)', '🌸');
    schoolHotspot('lycee_alex', 'alex_school', 'Lycée Bassam (Badge Alex)', '⚡');

    const chunkMats = createChunkMaterials(isNight);
    const streamer = new WorldStreamer(scene, physics, createChunkProvider([homeLot.id]), chunkMats, lowEnd ? 3 : 4);

    // 4. MAISON DU JOUEUR (Modèle Stylisé Dollhouse)
    const homeType = playerState.destiny.homeType;
    const houseGroup = new THREE.Group();

    const houseFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 9),
      new THREE.MeshStandardMaterial({
        color: homeType === 'villa_ambassade' || homeType === 'duplex_mer' ? 0xf8fafc : 0x78350f,
        roughness: 0.4
      })
    );
    houseFloor.rotation.x = -Math.PI / 2;
    houseFloor.position.set(0, 0.01, 0);
    houseFloor.receiveShadow = true;
    houseGroup.add(houseFloor);

    const hWallMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.8 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 0.3), hWallMat);
    backWall.position.set(0, 1.6, -4.5);
    backWall.castShadow = true;
    houseGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 9), hWallMat);
    leftWall.position.set(-6, 1.6, 0);
    leftWall.castShadow = true;
    houseGroup.add(leftWall);

    // Meubles intérieurs
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x4f46e5 })
    );
    bed.position.set(-4, 0.3, -3);
    bed.castShadow = true;
    houseGroup.add(bed);

    hotspots.push({
      id: 'bed',
      name: 'Grand Lit',
      icon: '🛏️',
      pos: new THREE.Vector3(-4, 1.2, -3),
      type: 'bed'
    });

    const fridge = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.3 })
    );
    fridge.position.set(3, 1, -3.5);
    fridge.castShadow = true;
    houseGroup.add(fridge);

    hotspots.push({
      id: 'fridge',
      name: 'Réfrigérateur & Garba',
      icon: '🧊',
      pos: new THREE.Vector3(3, 1.2, -3.5),
      type: 'fridge'
    });

    const shower = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
    );
    shower.position.set(4, 1.1, 2);
    houseGroup.add(shower);

    hotspots.push({
      id: 'shower',
      name: 'Douche',
      icon: '🚿',
      pos: new THREE.Vector3(4, 1.2, 2),
      type: 'shower'
    });

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.75, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    desk.position.set(-4, 0.38, 2);
    desk.castShadow = true;
    houseGroup.add(desk);

    hotspots.push({
      id: 'computer',
      name: 'Poste PC / Travail',
      icon: '💻',
      pos: new THREE.Vector3(-4, 1.2, 2),
      type: 'computer'
    });

    if (homeType === 'villa_ambassade' || homeType === 'duplex_mer') {
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 5),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.8 })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, -0.02, 8);
      houseGroup.add(pool);
    }

    houseGroup.position.set(homeLot.x, 0, homeLot.z);
    houseGroup.rotation.y = homeLot.rotationY;
    scene.add(houseGroup);

    hotspots.forEach((h) => {
      if (['bed', 'fridge', 'shower', 'computer'].includes(h.type)) {
        const w = houseToWorld(homeLot.x, homeLot.z, homeLot.rotationY, h.pos.x, h.pos.z);
        h.pos.set(w.x, h.pos.y, w.z);
      }
    });

    // 5. VÉHICULE HAUTE FIDÉLITÉ D'ABIDJAN (Peugeot 504 Woro-woro avec galerie de toit)
    const carGroup = new THREE.Group();
    const isWoro = homeType === 'chambre_cour' || homeType === 'squat';
    const isRolls = homeType === 'villa_ambassade';
    const carColor = isWoro ? 0xfacc15 : isRolls ? 0xf8fafc : 0x1e3a8a;

    // Châssis principal
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.7, 4.4),
      new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3, metalness: 0.5 })
    );
    chassis.position.set(0, 0.58, 0);
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Pare-chocs chromés avant & arrière
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.2), bumperMat);
    bumperF.position.set(0, 0.38, 2.25);
    carGroup.add(bumperF);

    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.2), bumperMat);
    bumperR.position.set(0, 0.38, -2.25);
    carGroup.add(bumperR);

    // Habitacle vitré
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 })
    );
    cabin.position.set(0, 1.25, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Galerie de toit chargée de bagages (Typique Woro-woro d'Abidjan)
    if (isWoro) {
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.8), rackMat);
      rack.position.set(0, 1.62, -0.2);
      carGroup.add(rack);

      // Valises et cartons
      const luggageColors = [0x991b1b, 0x1e3a8a, 0x78350f];
      luggageColors.forEach((lc, i) => {
        const luggage = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.35, 0.6),
          new THREE.MeshStandardMaterial({ color: lc, roughness: 0.8 })
        );
        luggage.position.set(-0.35 + i * 0.38, 1.85, -0.2);
        luggage.castShadow = true;
        carGroup.add(luggage);
      });
    }

    // Phares avant puissants
    const headLightL = new THREE.SpotLight(0xfef08a, 2.2, 35, Math.PI / 5, 0.4);
    headLightL.position.set(-0.7, 0.6, 2.3);
    headLightL.target.position.set(-0.7, 0, 15);
    carGroup.add(headLightL);
    carGroup.add(headLightL.target);

    const headLightR = new THREE.SpotLight(0xfef08a, 2.2, 35, Math.PI / 5, 0.4);
    headLightR.position.set(0.7, 0.6, 2.3);
    headLightR.target.position.set(0.7, 0, 15);
    carGroup.add(headLightR);
    carGroup.add(headLightR.target);

    // 4 Roues détaillées avec jantes
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.2 });

    const frontWheelsGroup = new THREE.Group();
    const createWheel = (x: number, y: number, z: number) => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), rimMat);
      hub.rotation.z = Math.PI / 2;
      wGroup.add(hub);

      wGroup.position.set(x, y, z);
      return wGroup;
    };

    const wFL = createWheel(-1.1, 0.38, 1.3);
    const wFR = createWheel(1.1, 0.38, 1.3);
    frontWheelsGroup.add(wFL);
    frontWheelsGroup.add(wFR);
    carGroup.add(frontWheelsGroup);

    const wRL = createWheel(-1.1, 0.38, -1.3);
    const wRR = createWheel(1.1, 0.38, -1.3);
    carGroup.add(wRL);
    carGroup.add(wRR);

    carGroup.position.set(carStateRef.current.x, 0, carStateRef.current.z);
    carGroup.rotation.y = carStateRef.current.rot;
    scene.add(carGroup);

    hotspots.push({
      id: 'car',
      name: playerState.destiny.vehicles[0] || 'Conduire la Voiture',
      icon: '🚗',
      pos: new THREE.Vector3(carStateRef.current.x, 1.2, carStateRef.current.z),
      type: 'car'
    });

    // 6. MODÈLE DU PERSONNAGE HAUTE DÉFINITION (CJ San Andreas Look)
    const playerGroup = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: playerState.character.skinTone, roughness: 0.65 });
    const tankTopMat = new THREE.MeshStandardMaterial({ color: playerState.character.outfitColor, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 }); // Jean denim
    const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const shoeTopMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

    // Torse athlétique avec débardeur (Tank Top CJ)
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.36), tankTopMat);
    chest.position.set(0, 1.45, 0);
    chest.castShadow = true;
    playerGroup.add(chest);

    // Ceinture avec boucle argentée
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.69, 0.1, 0.37),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
    );
    belt.position.set(0, 1.1, 0);
    playerGroup.add(belt);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 })
    );
    buckle.position.set(0, 1.1, 0.19);
    playerGroup.add(buckle);

    // Cou & Tête sculptée
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 8), skinMat);
    neck.position.set(0, 1.84, 0);
    playerGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), skinMat);
    head.position.set(0, 2.05, 0);
    head.castShadow = true;
    playerGroup.add(head);

    // Cheveux stylisés selon le choix du joueur
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 14, 14), hairMat);
    hair.position.set(0, 2.09, -0.03);
    playerGroup.add(hair);

    // Bras avec muscles deltoïdes et biceps
    const leftArmGroup = new THREE.Group();
    const lBicep = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), skinMat);
    lBicep.position.set(0, -0.22, 0);
    lBicep.castShadow = true;
    leftArmGroup.add(lBicep);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skinMat);
    lHand.position.set(0, -0.48, 0);
    leftArmGroup.add(lHand);
    leftArmGroup.position.set(-0.46, 1.7, 0);
    playerGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    const rBicep = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), skinMat);
    rBicep.position.set(0, -0.22, 0);
    rBicep.castShadow = true;
    rightArmGroup.add(rBicep);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skinMat);
    rHand.position.set(0, -0.48, 0);
    rightArmGroup.add(rHand);
    rightArmGroup.position.set(0.46, 1.7, 0);
    playerGroup.add(rightArmGroup);

    // Jambes & Sneakers (baskets blanches basses CJ)
    const createLeg = (x: number) => {
      const legGrp = new THREE.Group();
      const pant = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.82, 0.26), pantsMat);
      pant.position.set(0, -0.41, 0);
      pant.castShadow = true;
      legGrp.add(pant);

      // Sneaker
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.1, 0.42), shoeSoleMat);
      sole.position.set(0, -0.85, 0.06);
      sole.castShadow = true;
      legGrp.add(sole);

      const top = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.38), shoeTopMat);
      top.position.set(0, -0.76, 0.06);
      legGrp.add(top);

      legGrp.position.set(x, 1.0, 0);
      return legGrp;
    };

    const leftLegGroup = createLeg(-0.2);
    const rightLegGroup = createLeg(0.2);
    playerGroup.add(leftLegGroup);
    playerGroup.add(rightLegGroup);

    playerGroup.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
    scene.add(playerGroup);

    // 7. MOTEUR PHYSIQUE WASM : décor, joueur, voiture et trafic d'Abidjan
    physics.reset();
    registerPlayerHouse(physics, homeLot.x, homeLot.z, homeLot.rotationY);
    const playerChar = physics.createCharacter(playerPosRef.current.x, playerPosRef.current.z);
    const carVeh = physics.createVehicle(
      playerVehiclePreset(homeType),
      carStateRef.current.x,
      carStateRef.current.z,
      carStateRef.current.rot
    );
    physics.setVehicleVelocity(carVeh, carStateRef.current.vx, carStateRef.current.vz, carStateRef.current.w);
    if (isDrivingRef.current) physics.setCharacterEnabled(playerChar, false);
    carGroup.rotation.order = 'YXZ';
    playerGroup.rotation.order = 'YXZ';
    const carHotspot = hotspots.find((h) => h.type === 'car');

    const carS = createVehicleState();
    const charS = createCharacterState();
    const trafficS = createVehicleState();

    // Trafic : 10 voitures qui apparaissent autour du joueur sur les grands axes
    const trafficCars: Array<RoadCar & { mesh: THREE.Mesh; halfHeight: number }> = [];
    for (let t = 0; t < 10; t++) {
      const isGb = t % 3 === 0;
      const vehId = physics.createVehicle(isGb ? VehiclePreset.GBAKA : VehiclePreset.WORO_WORO, 0, 0, 0);
      physics.setVehicleEnabled(vehId, false);
      const bodyHeight = isGb ? 1.9 : 1.1;
      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(physics.vehicleHalfWidth(vehId) * 2, bodyHeight, physics.vehicleHalfLength(vehId) * 2),
        new THREE.MeshStandardMaterial({ color: isGb ? 0x16a34a : 0xfacc15, roughness: 0.4 })
      );
      tMesh.castShadow = true;
      tMesh.visible = false;
      tMesh.rotation.order = 'YXZ';
      scene.add(tMesh);
      trafficCars.push({ mesh: tMesh, halfHeight: bodyHeight / 2, vehId, art: 0, dir: 1, targetSpeed: 12, stuckTimer: 0, wait: 0.4 + t * 0.5 });
    }

    // 8. CONTRÔLEUR DE CAMÉRA ORBITALE SAN ANDREAS (Clic-glisser & Molette)
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      camOrbitRef.current.isDragging = true;
      camOrbitRef.current.lastMouseX = clientX;
      camOrbitRef.current.lastMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!camOrbitRef.current.isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - camOrbitRef.current.lastMouseX;
      const deltaY = clientY - camOrbitRef.current.lastMouseY;

      camOrbitRef.current.lastMouseX = clientX;
      camOrbitRef.current.lastMouseY = clientY;

      camOrbitRef.current.yaw -= deltaX * 0.006;
      camOrbitRef.current.pitch = Math.max(
        0.08,
        Math.min(1.35, camOrbitRef.current.pitch + deltaY * 0.005)
      );
    };

    const handlePointerUp = () => {
      camOrbitRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camOrbitRef.current.targetDistance = Math.max(
        3.5,
        Math.min(45, camOrbitRef.current.targetDistance + e.deltaY * 0.02)
      );
    };

    const dom = mountRef.current;
    dom.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    dom.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    // 9. BOUCLE DE JEU 60 FPS (PHYSIQUE SAN ANDREAS UNITY & AUDIO D'ABIDJAN)
    let animId: number;
    const clock = new THREE.Clock();
    let walkTimer = 0;
    let footstepTimer = 0;
    let lastDistrict = '';
    let lastJumpCount = heldControlsRef.current.jumpCount;
    let wasDriving = isDrivingRef.current;
    let lastKmh = -1;
    let screechCooldown = 0;
    let cityReadyFlag = false;
    let cameraSnap = true;

    // Instrumentation des tests de bout en bout (activée uniquement par ?blvdebug dans l'URL)
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('blvdebug')) {
      (window as unknown as { __blv?: unknown }).__blv = {
        scene,
        camera,
        streamer,
        orbit: camOrbitRef.current,
        state: () => ({
          player: { ...playerPosRef.current },
          car: { ...carStateRef.current },
          driving: isDrivingRef.current,
          lot: homeLot,
          chunks: streamer.loadedCount,
          solids: physics.solidCount,
          ready: cityReadyFlag
        })
      };
    }

    const animateLoop = () => {
      animId = requestAnimationFrame(animateLoop);
      const delta = Math.min(clock.getDelta(), 0.08);

      const input = moveDirectionRef.current;
      const driving = isDrivingRef.current;

      let currentX = playerPosRef.current.x;
      let currentZ = playerPosRef.current.z;
      let currentRot = playerPosRef.current.rot;

      // A. COMMANDES -> MOTEUR PHYSIQUE (touches maintenues : CONTEXT.md §4)
      const held = heldControlsRef.current;
      const jumpPressed = held.jumpCount !== lastJumpCount;
      lastJumpCount = held.jumpCount;

      // Entrée / sortie de véhicule : le piéton est désactivé en voiture, replacé à gauche en sortant
      if (driving !== wasDriving) {
        const exitState = physics.readVehicle(carVeh, carS);
        if (driving) {
          physics.setCharacterEnabled(playerChar, false);
        } else {
          const side = physics.vehicleHalfWidth(carVeh) + 0.9;
          physics.placeCharacter(
            playerChar,
            exitState.x + Math.cos(exitState.heading) * side,
            exitState.z - Math.sin(exitState.heading) * side
          );
          physics.setCharacterEnabled(playerChar, true);
          playerPosRef.current.rot = exitState.heading;
          physics.vehicleInput(carVeh, 0, 0, false);
        }
        wasDriving = driving;
      }

      if (driving) {
        // y < 0 = avant ; x > 0 = droite
        physics.vehicleInput(carVeh, -input.y, input.x, held.handbrake);
      } else {
        // Déplacement RELATIF À L'ORIENTATION DE CAMÉRA (SanAndreasUnity)
        const camYaw = camOrbitRef.current.yaw;
        const forwardX = -Math.sin(camYaw);
        const forwardZ = -Math.cos(camYaw);
        const rightX = -forwardZ;
        const rightZ = forwardX;
        const worldMoveX = forwardX * -input.y + rightX * input.x;
        const worldMoveZ = forwardZ * -input.y + rightZ * input.x;
        physics.characterInput(playerChar, worldMoveX, worldMoveZ, held.sprint ? 7.6 : 5.0, jumpPressed);
      }

      // Chargement de la ville autour du joueur (ou de sa voiture) ; la physique démarre quand le sol est prêt
      const focusX = driving ? carStateRef.current.x : playerPosRef.current.x;
      const focusZ = driving ? carStateRef.current.z : playerPosRef.current.z;
      streamer.update(focusX, focusZ);
      sunLight.position.set(focusX + 45, 75, focusZ + 35);
      sunLight.target.position.set(focusX, 0, focusZ);
      if (!cityReadyFlag && streamer.isReady(focusX, focusZ, 1)) {
        cityReadyFlag = true;
        setCityReady(true);
      }

      if (cityReadyFlag) {
        updateRoadTraffic(physics, trafficCars, focusX, focusZ, delta, [{ x: carStateRef.current.x, z: carStateRef.current.z }]);
        physics.step(delta);
      }

      // Événements : chocs et piétons renversés (sons uniquement pour le joueur)
      physics.drainEvents((ev) => {
        const involvesPlayer = ev.a === carVeh || (ev.kind === 'vehicle-vehicle' && ev.b === carVeh);
        if (!involvesPlayer) return;
        if (ev.kind === 'vehicle-pedestrian') audioFx.playCrash(0.35);
        else audioFx.playCrash(Math.min(1, ev.impulse / 20000));
      });

      // B. SYNCHRONISATION VOITURE (état physique -> refs + modèle 3D)
      const cs = physics.readVehicle(carVeh, carS);
      const car = carStateRef.current;
      car.x = cs.x;
      car.z = cs.z;
      car.rot = cs.heading;
      car.speed = cs.forwardSpeed;
      car.steering = cs.steer;
      car.vx = cs.vx;
      car.vz = cs.vz;
      car.w = cs.yawRate;

      carGroup.position.set(cs.x, 0, cs.z);
      carGroup.rotation.set(-cs.pitch, cs.heading, cs.roll);
      frontWheelsGroup.rotation.y = -cs.steer;
      wFL.rotation.x = cs.wheelAngle;
      wFR.rotation.x = cs.wheelAngle;
      wRL.rotation.x = cs.wheelAngle;
      wRR.rotation.x = cs.wheelAngle;
      if (carHotspot) carHotspot.pos.set(cs.x, 1.2, cs.z);

      // Personnage
      const ps = physics.readCharacter(playerChar, charS);
      const p = playerPosRef.current;
      if (!driving) {
        p.x = ps.x;
        p.z = ps.z;
        p.rot = ps.heading;
      }

      if (driving) {
        playerGroup.visible = false;

        // Moteur audio GTA piloté par le régime moteur simulé
        audioFx.updateEngineSound((cs.rpm - 900) / 6100);
        screechCooldown -= delta;
        if (cs.skid > 0.45 && screechCooldown <= 0) {
          audioFx.playTireScreech();
          screechCooldown = 0.28;
        }

        const kmh = Math.round(Math.abs(cs.forwardSpeed) * 3.6);
        if (kmh !== lastKmh) {
          lastKmh = kmh;
          setCarSpeedKmh(kmh);
        }

        currentX = cs.x;
        currentZ = cs.z;
        currentRot = cs.heading;
      } else {
        // JOUEUR À PIED (cycle de marche et animation)
        playerGroup.visible = true;
        const knockedDown = ps.stun > 0;
        const moving = ps.speed > 0.4 && ps.grounded && !knockedDown;

        if (moving) {
          const cadence = held.sprint ? 19 : 15;
          walkTimer += delta * cadence;
          footstepTimer += delta * cadence;
          if (footstepTimer > Math.PI) {
            footstepTimer = 0;
            audioFx.playFootstep();
          }

          leftLegGroup.rotation.x = Math.sin(walkTimer) * 0.75;
          rightLegGroup.rotation.x = -Math.sin(walkTimer) * 0.75;
          leftArmGroup.rotation.x = -Math.sin(walkTimer) * 0.65;
          rightArmGroup.rotation.x = Math.sin(walkTimer) * 0.65;

          // Légère inclinaison du torse vers l'avant (plus marquée en sprint)
          chest.rotation.x = held.sprint ? 0.2 : 0.08;
        } else {
          // Idle breathing
          walkTimer += delta * 2;
          leftLegGroup.rotation.x = 0;
          rightLegGroup.rotation.x = 0;
          leftArmGroup.rotation.x = 0;
          rightArmGroup.rotation.x = 0;
          chest.position.y = 1.45 + Math.sin(walkTimer) * 0.015;
          chest.rotation.x = 0;
        }

        playerGroup.position.set(ps.x, ps.y, ps.z);
        playerGroup.rotation.set(knockedDown ? -1.35 : 0, ps.heading, 0);

        currentX = ps.x;
        currentZ = ps.z;
        currentRot = ps.heading;
      }

      // C. QUARTIER D'ABIDJAN (bannière GTA) : commune réelle ou nom du pont
      const here = { x: currentX, z: currentZ };
      const onBridge = bridgeAt(here, 0);
      const districtName = onBridge ? `PONT — ${onBridge.name.toUpperCase()}` : districtAt(here).name.toUpperCase();

      if (districtName !== lastDistrict) {
        lastDistrict = districtName;
        if (onDistrictChangeRef.current) {
          onDistrictChangeRef.current(districtName);
        }
      }

      // Synchronisation du Radar GTA
      setRadarData({
        playerX: currentX,
        playerZ: currentZ,
        playerRot: currentRot,
        camYaw: camOrbitRef.current.yaw,
        district: districtName
      });

      // D. PROMPT DU HOTSPOT PROCHE
      const targetPos = new THREE.Vector3(currentX, 0, currentZ);
      let closest: InteractiveHotspot | null = null;
      let minDistance = driving ? 4.5 : 2.6;

      for (const spot of hotspots) {
        if (driving && spot.type === 'car') continue;
        // La voiture est un objet solide de 4,5 m : on mesure la portée jusqu'à sa carrosserie, pas son centre
        const d = targetPos.distanceTo(spot.pos) - (spot.type === 'car' ? 1.6 : 0);
        if (d < minDistance) {
          minDistance = d;
          closest = spot;
        }
      }
      setActivePrompt(closest);

      // E. TRAFIC ROUTIER (états physiques -> modèles 3D)
      trafficCars.forEach((tc) => {
        const ts = physics.readVehicle(tc.vehId, trafficS);
        tc.mesh.visible = tc.wait <= 0;
        tc.mesh.position.set(ts.x, tc.halfHeight, ts.z);
        tc.mesh.rotation.set(-ts.pitch, ts.heading, ts.roll);
      });

      // F. CAMÉRA SUIVEUSE ORBITALE SAN ANDREAS (CameraFollow.cs)
      const orbit = camOrbitRef.current;
      orbit.distance = THREE.MathUtils.lerp(orbit.distance, orbit.targetDistance, 0.08);

      const lookTarget = targetPos.clone().add(new THREE.Vector3(0, driving ? 1.2 : 1.45, 0));
      const cx = lookTarget.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance;
      const cy = lookTarget.y + Math.sin(orbit.pitch) * orbit.distance;
      const cz = lookTarget.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance;

      // Collision caméra : un bâtiment plus haut que la caméra rapproche celle-ci du joueur
      const camGoal = new THREE.Vector3(cx, cy, cz);
      const horizontal = Math.hypot(cx - lookTarget.x, cz - lookTarget.z);
      if (horizontal > 0.5) {
        const hit = physics.ray(lookTarget.x, lookTarget.z, cx - lookTarget.x, cz - lookTarget.z, horizontal, SolidFlag.BUILDING);
        if (hit >= 0) {
          const heightAtHit = lookTarget.y + (cy - lookTarget.y) * (hit / horizontal);
          if (physics.solidHeight(physics.lastRayHitId) > heightAtHit - 0.3) {
            const k = Math.max(0.2, (hit - 0.6) / horizontal);
            camGoal.set(
              lookTarget.x + (cx - lookTarget.x) * k,
              lookTarget.y + (cy - lookTarget.y) * k,
              lookTarget.z + (cz - lookTarget.z) * k
            );
          }
        }
      }
      // Suivi indépendant du nombre d'images par seconde ; première image : placement direct
      if (cameraSnap) { camera.position.copy(camGoal); cameraSnap = false; }
      else camera.position.lerp(camGoal, 1 - Math.exp(-delta * 9));
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
    };

    animateLoop();

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      streamer.dispose();
      chunkMats.dispose();
      const lastCar = physics.readVehicle(carVeh, carS);
      carStateRef.current.vx = lastCar.vx;
      carStateRef.current.vz = lastCar.vz;
      carStateRef.current.w = lastCar.yawRate;
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      dom.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);

      audioFx.stopEngine();

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [playerState.weather, playerState.destiny.homeType, playerState.character, lightBucket, physics, homeLot]);

  // Action d'interaction (Bouton Action ✕ ou Clic)
  const handleTriggerAction = useCallback(() => {
    audioFx.playButtonClick();

    if (isDrivingRef.current) {
      setIsDriving(false);
      audioFx.stopEngine();
      return;
    }

    if (!activePrompt) {
      onInteractRef.current('bed');
      return;
    }

    if (activePrompt.type === 'car') {
      setIsDriving(true);
      audioFx.playCarHonk();
      return;
    }

    if (activePrompt.type === 'caiman_school') {
      audioFx.playMissionPassed();
      onUnlockBadgeRef.current?.('caiman');
      return;
    }
    if (activePrompt.type === 'alysma_school') {
      audioFx.playMissionPassed();
      onUnlockBadgeRef.current?.('alysma');
      return;
    }
    if (activePrompt.type === 'alex_school') {
      audioFx.playMissionPassed();
      onUnlockBadgeRef.current?.('alex');
      return;
    }

    onInteractRef.current(activePrompt.type);
  }, [activePrompt]);

  // Touche E / F / bouton ✕ de la manette : même action que le bouton contextuel à l'écran
  useEffect(() => {
    if (!crossActionRef) return;
    crossActionRef.current = () => {
      if (isDrivingRef.current || activePrompt) {
        handleTriggerAction();
        return true;
      }
      return false;
    };
    return () => {
      crossActionRef.current = null;
    };
  }, [crossActionRef, activePrompt, handleTriggerAction]);

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Canvas 3D Three.js */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {(!physics || !cityReady) && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-6 text-center">
          <span className="rounded-xl border border-amber-500/40 bg-slate-950/90 px-4 py-3 font-mono text-xs text-amber-300">
            {physicsError ?? (!physics ? 'Chargement du moteur physique…' : "Chargement d'Abidjan…")}
          </span>
        </div>
      )}

      {/* MINI-MAP RADAR GTA SAN ANDREAS (En bas à gauche) */}
      <GtaRadar
        playerX={radarData.playerX}
        playerZ={radarData.playerZ}
        playerRot={radarData.playerRot}
        camYaw={radarData.camYaw}
        energyPercent={playerState.needs.energie}
        healthPercent={playerState.envieJauge}
        currentDistrict={radarData.district}
        isDriving={isDriving}
        homeX={homeLot.x}
        homeZ={homeLot.z}
      />

      {/* BOUTON TOGGLE CAMÉRA (Épaule GTA / Vue Aérienne Abidjan) */}
      <div className="pointer-events-auto absolute top-20 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            audioFx.playButtonClick();
            onToggleCameraMode?.();
          }}
          className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-slate-950/85 px-3.5 py-2 text-xs font-bold text-amber-400 shadow-2xl backdrop-blur-md transition hover:bg-slate-900 active:scale-95"
        >
          <span>🎥</span>
          <span>{cameraMode === 'shoulder' ? 'Vue du ciel' : 'Vue épaule GTA'}</span>
        </button>
      </div>

      {/* COMPTEUR DE VITESSE EN VOITURE (GTA UI) */}
      {isDriving && (
        <div className="pointer-events-none fixed bottom-24 right-6 z-40 flex flex-col items-end animate-fade-in">
          <div className="flex items-baseline gap-1 rounded-2xl border-2 border-amber-500 bg-slate-950/90 px-4 py-2 shadow-2xl backdrop-blur-md">
            <span className="text-3xl font-black font-mono text-amber-400">{carSpeedKmh}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">KM/H</span>
          </div>
          <span className="text-[10px] font-bold text-amber-300 mt-1 uppercase font-mono bg-black/60 px-2 py-0.5 rounded">
            {playerState.destiny.vehicles[0] || 'Woro-woro 504'}
          </span>
        </div>
      )}

      {/* PROMPT D'INTERACTION PROXIMITÉ (Mobilier, Conduire, Badges Écoles) */}
      {(activePrompt || isDriving) && (
        <div className="pointer-events-auto fixed bottom-28 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <button
            onClick={handleTriggerAction}
            className="flex items-center gap-2.5 rounded-2xl border-2 border-amber-400 bg-slate-950/95 px-5 py-3 shadow-2xl backdrop-blur-lg active:scale-95 transition-all text-white"
          >
            <span className="text-2xl">{isDriving ? '🚗' : activePrompt?.icon}</span>
            <div className="text-left">
              <span className="text-xs font-black uppercase text-amber-400 block font-mono">
                [✕ / Clic] {isDriving ? 'Sortir de la Voiture' : activePrompt?.name}
              </span>
              <span className="text-[10px] text-slate-300">
                {isDriving ? 'Appuie pour redevenir piéton' : 'Appuie pour interagir'}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
