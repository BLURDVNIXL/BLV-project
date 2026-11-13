import * as THREE from 'three';
import { SapeOutfitId, VehicleModelType } from '../types/game';
import { SAPE_OUTFITS } from '../core/destinies';
import { createContactShadow, getSurfaceBumpTexture, getWaxFabricTexture } from './materials';

/**
 * BLV — High-Craft 3D Procedural Models
 * Every character, vehicle, and landmark is a multi-part composite THREE.Group
 * with calibrated roughness contrast, beveled profiles, and joint articulation.
 */

export interface CharacterRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftShinPivot: THREE.Group;
  rightShinPivot: THREE.Group;
  shirtMeshes: THREE.MeshStandardMaterial[];
  pantsMeshes: THREE.MeshStandardMaterial[];
  applyOutfit: (outfitId: SapeOutfitId) => void;
  animateGait: (phase: number, speedFactor: number, dt: number) => void;
}

export function createCharacterModel(
  skinHex = 0x5c3824,
  initialOutfit: SapeOutfitId = 'standard',
  hasCapOrGlasses = false
): CharacterRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const shadow = createContactShadow(0.55);
  group.add(shadow);

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinHex,
    roughness: 0.68,
    metalness: 0.05,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.72,
    metalness: 0.05,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.04,
  });

  const sneakerMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.08,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.9,
    metalness: 0.02,
  });

  // 1. Pelvis + Belt
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.28), pantsMat);
  pelvis.position.y = 0.86;
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.05, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.2 })
  );
  belt.position.y = 0.94;
  bodyPivot.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.055, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.25 })
  );
  buckle.position.set(0, 0.94, 0.155);
  bodyPivot.add(buckle);

  // 2. Sculpted Torso (V-tapered jacket/shirt)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.54, 10), shirtMat);
  torso.scale.set(1.05, 1, 0.65);
  torso.position.y = 1.23;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), shirtMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.49;
  bodyPivot.add(collar);

  // 3. Neck & Sculpted Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), skinMat);
  neck.position.y = 1.54;
  bodyPivot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.72;
  bodyPivot.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 12), skinMat);
  cranium.scale.set(0.95, 1.08, 1.0);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
  hair.position.set(0, 0.02, -0.015);
  headGroup.add(hair);

  // Ears & Nose for human silhouette read
  const earGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.18, 0, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.18, 0, 0);
  headGroup.add(leftEar, rightEar);

  // Eyes / Sunglasses
  if (hasCapOrGlasses) {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.065, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.12, metalness: 0.25 })
    );
    shades.position.set(0, 0.02, 0.17);
    headGroup.add(shades);
  } else {
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });
    [-0.065, 0.065].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
      eye.position.set(ex, 0.02, 0.165);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), pupilMat);
      pupil.position.set(ex, 0.02, 0.182);
      headGroup.add(eye, pupil);
    });
  }

  // 4. Articulated Arms (Shoulder -> UpperArm -> Elbow -> Forearm -> Hand)
  const buildArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.31, 1.44, 0);
    bodyPivot.add(shoulderPivot);

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), shirtMat);
    shoulderPivot.add(shoulderCap);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.26, 8), shirtMat);
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.y = -0.27;
    shoulderPivot.add(forearmPivot);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.054, 8, 8), skinMat);
    forearmPivot.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.24, 8), skinMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.06), skinMat);
    hand.position.y = -0.25;
    forearmPivot.add(hand);

    return { shoulderPivot, forearmPivot };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // 5. Articulated Legs (Hip -> Thigh -> Knee -> Shin -> Sneaker)
  const buildLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.13, 0.8, 0);
    bodyPivot.add(hipPivot);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.072, 0.36, 8), pantsMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.36;
    hipPivot.add(shinPivot);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pantsMat);
    shinPivot.add(knee);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.34, 8), pantsMat);
    shin.position.y = -0.17;
    shin.castShadow = true;
    shinPivot.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.22), sneakerMat);
    shoe.position.set(0, -0.38, 0.045);
    shoe.castShadow = true;
    shinPivot.add(shoe);

    return { hipPivot, shinPivot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const applyOutfit = (outfitId: SapeOutfitId) => {
    const def = SAPE_OUTFITS.find((o) => o.id === outfitId) || SAPE_OUTFITS[0];
    if (outfitId === 'wax_bazin') {
      shirtMat.map = getWaxFabricTexture('#d97706', '#16a34a');
      shirtMat.color.setHex(0xffffff);
    } else {
      shirtMat.map = null;
      shirtMat.color.setHex(def.shirtHex);
    }
    shirtMat.needsUpdate = true;
    pantsMat.color.setHex(def.pantsHex);
  };

  applyOutfit(initialOutfit);

  const animateGait = (phase: number, speedFactor: number, dt: number) => {
    const amp = Math.min(1, speedFactor);
    const swing = Math.sin(phase) * 0.65 * amp;
    leftLeg.hipPivot.rotation.x = swing;
    rightLeg.hipPivot.rotation.x = -swing;
    leftLeg.shinPivot.rotation.x = Math.max(0, -Math.cos(phase) * 0.6 * amp);
    rightLeg.shinPivot.rotation.x = Math.max(0, Math.cos(phase) * 0.6 * amp);

    leftArm.shoulderPivot.rotation.x = -swing * 0.85;
    rightArm.shoulderPivot.rotation.x = swing * 0.85;
    leftArm.forearmPivot.rotation.x = -0.25 - Math.abs(swing) * 0.35;
    rightArm.forearmPivot.rotation.x = -0.25 - Math.abs(swing) * 0.35;

    // Gentle idle breathing / walk bob
    const bob = amp > 0.05 ? Math.abs(Math.sin(phase)) * 0.045 * amp : Math.sin(performance.now() * 0.003) * 0.015;
    bodyPivot.position.y = THREE.MathUtils.lerp(bodyPivot.position.y, bob, 1 - Math.exp(-12 * dt));
  };

  return {
    group,
    bodyPivot,
    headGroup,
    leftArmPivot: leftArm.shoulderPivot,
    rightArmPivot: rightArm.shoulderPivot,
    leftForearmPivot: leftArm.forearmPivot,
    rightForearmPivot: rightArm.forearmPivot,
    leftLegPivot: leftLeg.hipPivot,
    rightLegPivot: rightLeg.hipPivot,
    leftShinPivot: leftLeg.shinPivot,
    rightShinPivot: rightLeg.shinPivot,
    shirtMeshes: [shirtMat],
    pantsMeshes: [pantsMat],
    applyOutfit,
    animateGait,
  };
}

export interface VehicleRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  frontWheelSteerPivots: THREE.Group[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  type: VehicleModelType;
  isLowClearance: boolean;
  label: string;
  setWheelSpin: (distanceDelta: number) => void;
  setPhysicsWheelPose: (wheelAngle: number, steerAngle: number) => void;
  updateSiren: (timeSec: number, active: boolean) => void;
}

function buildWheel(radius = 0.38, width = 0.24): THREE.Group {
  const wheel = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.04 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.25 });

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 10), rimMat);
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);

  const hub = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, radius * 0.85, 0.07), rimMat);
  wheel.add(hub);

  return wheel;
}

function createExtrudedProfileMesh(
  points: Array<[number, number]>,
  width: number,
  material: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  // ExtrudeGeometry extrudes along +Z, profile in XY -> rotate so length is Z, width is X
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createVehicleModel(type: VehicleModelType): VehicleRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const wheels: THREE.Group[] = [];
  const frontWheelSteerPivots: THREE.Group[] = [];
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;

  const addWheelAt = (wx: number, wy: number, wz: number, radius: number, width: number, isFront: boolean) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, wy, wz);
    const w = buildWheel(radius, width);
    steerPivot.add(w);
    wheels.push(w);
    if (isFront) frontWheelSteerPivots.push(steerPivot);
    group.add(steerPivot);
  };

  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.25 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.08 });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
    roughness: 0.15,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });

  const isLowClearance =
    type === 'berline_citadine' ||
    type === 'bmw_m_series' ||
    type === 'supercar_madrid' ||
    type === 'rolls_royce_phantom';

  let label = 'Véhicule';

  if (type === 'gbaka') {
    label = 'Gbaka Express';
    group.add(createContactShadow(2.2));
    const paintMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.42, metalness: 0.1 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45, metalness: 0.05 });

    // Beveled van silhouette
    const hull = createExtrudedProfileMesh(
      [
        [-2.3, 0.45],
        [2.1, 0.45],
        [2.25, 1.15],
        [1.75, 2.05],
        [-2.2, 2.05],
      ],
      1.95,
      paintMat
    );
    bodyGroup.add(hull);

    // Classic Abidjan white band + orange destination strip
    const whiteBand = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.34, 4.3), stripeMat);
    whiteBand.position.set(0, 1.18, -0.05);
    bodyGroup.add(whiteBand);

    const destSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.4 })
    );
    destSign.position.set(0, 1.88, 1.88);
    bodyGroup.add(destSign);

    // Windshield + side windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 0.1), glassMat);
    windshield.position.set(0, 1.56, 1.98);
    windshield.rotation.x = -0.38;
    bodyGroup.add(windshield);

    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.09, 0.48, 2.9), glassMat);
    sideWin.position.set(0, 1.62, -0.3);
    bodyGroup.add(sideWin);

    // Roof luggage rack + spare wheel
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 2.6), bumperMat);
    rack.position.set(0, 2.15, -0.4);
    bodyGroup.add(rack);
    const spare = buildWheel(0.32, 0.18);
    spare.rotation.z = Math.PI / 2;
    spare.position.set(0, 2.28, -0.8);
    bodyGroup.add(spare);

    // 4 wheels
    [
      [-0.98, 0.42, 1.4, true],
      [0.98, 0.42, 1.4, true],
      [-0.98, 0.42, -1.45, false],
      [0.98, 0.42, -1.45, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.42, 0.25, isF as boolean));
  } else if (type === 'woro_woro') {
    label = 'Woro-Woro 504';
    group.add(createContactShadow(1.9));
    const paintMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.34, metalness: 0.12 });

    const chassis = createExtrudedProfileMesh(
      [
        [-2.05, 0.38],
        [2.05, 0.38],
        [2.1, 0.92],
        [1.1, 1.0],
        [0.65, 1.54],
        [-0.85, 1.54],
        [-1.35, 1.02],
        [-2.08, 0.92],
      ],
      1.78,
      paintMat
    );
    bodyGroup.add(chassis);

    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 1.55), glassMat);
    cabinGlass.position.set(0, 1.26, -0.1);
    bodyGroup.add(cabinGlass);

    // Roof TAXI dome
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.18, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde047, emissiveIntensity: 0.5 })
    );
    taxiSign.position.set(0, 1.66, 0.1);
    bodyGroup.add(taxiSign);

    [
      [-0.9, 0.36, 1.32, true],
      [0.9, 0.36, 1.32, true],
      [-0.9, 0.36, -1.32, false],
      [0.9, 0.36, -1.32, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.36, 0.22, isF as boolean));
  } else if (type === 'police_plcc') {
    label = '4x4 Police PLCC';
    group.add(createContactShadow(2.1));
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.2 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 });

    const suvBody = createExtrudedProfileMesh(
      [
        [-2.15, 0.48],
        [2.15, 0.48],
        [2.2, 1.15],
        [1.15, 1.22],
        [0.75, 1.85],
        [-1.95, 1.85],
        [-2.15, 1.15],
      ],
      1.92,
      blackMat
    );
    bodyGroup.add(suvBody);

    const whiteDoors = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.56, 1.6), whiteMat);
    whiteDoors.position.set(0, 0.94, 0);
    bodyGroup.add(whiteDoors);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.5, 2.3), glassMat);
    glass.position.set(0, 1.5, -0.5);
    bodyGroup.add(glass);

    // Flashing PLCC Siren Lightbar
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.28), bumperMat);
    barBase.position.set(0, 1.92, 0.2);
    bodyGroup.add(barBase);

    sirenRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 })
    );
    sirenRed.position.set(-0.32, 1.98, 0.2);
    sirenBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.5 })
    );
    sirenBlue.position.set(0.32, 1.98, 0.2);
    bodyGroup.add(sirenRed, sirenBlue);

    [
      [-0.98, 0.44, 1.38, true],
      [0.98, 0.44, 1.38, true],
      [-0.98, 0.44, -1.38, false],
      [0.98, 0.44, -1.38, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.44, 0.27, isF as boolean));
  } else if (type === 'rolls_royce_phantom') {
    label = 'Rolls-Royce Phantom';
    group.add(createContactShadow(2.4));
    const paintMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.18, metalness: 0.24 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.25 });

    const chassis = createExtrudedProfileMesh(
      [
        [-2.5, 0.34],
        [2.5, 0.34],
        [2.55, 0.96],
        [1.25, 1.02],
        [0.75, 1.58],
        [-1.35, 1.58],
        [-1.85, 1.04],
        [-2.52, 0.94],
      ],
      1.95,
      paintMat
    );
    bodyGroup.add(chassis);

    const silverHood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 1.3), hoodMat);
    silverHood.position.set(0, 1.03, 1.85);
    bodyGroup.add(silverHood);

    // Pantheon Grille + Spirit of Ecstasy
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.56, 0.1), chromeMat);
    grille.position.set(0, 0.72, 2.58);
    bodyGroup.add(grille);

    const spirit = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), chromeMat);
    spirit.position.set(0, 1.14, 2.52);
    bodyGroup.add(spirit);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.46, 1.9), glassMat);
    glass.position.set(0, 1.28, -0.3);
    bodyGroup.add(glass);

    [
      [-0.98, 0.38, 1.65, true],
      [0.98, 0.38, 1.65, true],
      [-0.98, 0.38, -1.65, false],
      [0.98, 0.38, -1.65, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.38, 0.25, isF as boolean));
  } else if (type === 'supercar_madrid') {
    label = 'Supercar Madrid #25';
    group.add(createContactShadow(2.2));
    const whitePaint = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.25 });

    const wedge = createExtrudedProfileMesh(
      [
        [-2.25, 0.28],
        [2.25, 0.28],
        [2.3, 0.65],
        [1.15, 0.86],
        [0.45, 1.28],
        [-0.95, 1.28],
        [-1.95, 0.92],
        [-2.3, 0.78],
      ],
      1.98,
      whitePaint
    );
    bodyGroup.add(wedge);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.38, 1.55), glassMat);
    canopy.position.set(0, 1.06, -0.2);
    bodyGroup.add(canopy);

    // Gold racing stripe + GT wing
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 4.4), goldMat);
    stripe.position.set(0, 0.88, 0);
    bodyGroup.add(stripe);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.07, 0.36), bumperMat);
    wing.position.set(0, 1.24, -2.05);
    bodyGroup.add(wing);

    [
      [-0.98, 0.35, 1.45, true],
      [0.98, 0.35, 1.45, true],
      [-0.98, 0.35, -1.45, false],
      [0.98, 0.35, -1.45, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.35, 0.26, isF as boolean));
  } else {
    // berline_citadine or bmw_m_series
    const isBmw = type === 'bmw_m_series';
    label = isBmw ? 'BMW M-Series' : 'Berline Citadine';
    group.add(createContactShadow(2.0));
    const paintMat = new THREE.MeshStandardMaterial({
      color: isBmw ? 0x1d4ed8 : 0x64748b,
      roughness: isBmw ? 0.22 : 0.36,
      metalness: 0.2,
    });

    const sedan = createExtrudedProfileMesh(
      [
        [-2.12, 0.32],
        [2.12, 0.32],
        [2.18, 0.82],
        [1.15, 0.94],
        [0.65, 1.46],
        [-0.95, 1.46],
        [-1.55, 0.96],
        [-2.15, 0.88],
      ],
      1.86,
      paintMat
    );
    bodyGroup.add(sedan);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.42, 1.6), glassMat);
    glass.position.set(0, 1.2, -0.15);
    bodyGroup.add(glass);

    if (isBmw) {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.24), bumperMat);
      spoiler.position.set(0, 1.02, -2.02);
      bodyGroup.add(spoiler);
    }

    [
      [-0.92, 0.35, 1.38, true],
      [0.92, 0.35, 1.38, true],
      [-0.92, 0.35, -1.38, false],
      [0.92, 0.35, -1.38, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.35, 0.23, isF as boolean));
  }

  // Universal front headlights & rear taillights + bumpers
  const zFront = type === 'rolls_royce_phantom' ? 2.55 : type === 'gbaka' ? 2.28 : 2.18;
  const zBack = type === 'rolls_royce_phantom' ? -2.55 : -2.22;

  [-0.68, 0.68].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headLightMat);
    hl.position.set(hx, 0.72, zFront);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.08), tailLightMat);
    tl.position.set(hx, 0.76, zBack);
    bodyGroup.add(hl, tl);
  });

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.18, 0.16), bumperMat);
  frontBumper.position.set(0, 0.4, zFront + 0.02);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.18, 0.16), bumperMat);
  rearBumper.position.set(0, 0.4, zBack - 0.02);
  bodyGroup.add(frontBumper, rearBumper);

  return {
    group,
    bodyGroup,
    wheels,
    frontWheelSteerPivots,
    sirenRed,
    sirenBlue,
    type,
    isLowClearance,
    label,
    setWheelSpin: (distanceDelta: number) => {
      const spin = distanceDelta / 0.38;
      for (const w of wheels) {
        w.rotation.x += spin;
      }
    },
    setPhysicsWheelPose: (wheelAngle: number, steerAngle: number) => {
      for (const p of frontWheelSteerPivots) {
        p.rotation.y = -steerAngle;
      }
      for (const w of wheels) {
        w.rotation.x = wheelAngle;
      }
    },
    updateSiren: (timeSec: number, active: boolean) => {
      if (!sirenRed || !sirenBlue) return;
      const flash = active && Math.floor(timeSec * 8) % 2 === 0;
      (sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 2.5 : active ? 0.2 : 0.6;
      (sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = active && !flash ? 2.5 : 0.6;
    },
  };
}

export function createPalmTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x78553a,
    roughness: 0.9,
    bumpMap: getSurfaceBumpTexture(),
    bumpScale: 0.05,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });

  // Curved 3-segment trunk
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - i * 0.04, 0.3 - i * 0.04, 2.2, 7), trunkMat);
    seg.position.set(i * 0.18, 1.1 + i * 2.05, 0);
    seg.rotation.z = -0.06 * i;
    seg.castShadow = true;
    g.add(seg);
  }

  // 6 arched fronds
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.2, 4), frondMat);
    frond.scale.set(1, 1, 0.22);
    frond.position.set(0.36 + Math.cos(angle) * 1.35, 6.2, Math.sin(angle) * 1.35);
    frond.rotation.z = -Math.PI / 2.6;
    frond.rotation.y = -angle;
    frond.castShadow = true;
    g.add(frond);
  }

  g.scale.setScalar(scale);
  return g;
}

export function createLaPyramideLandmark(): THREE.Group {
  const g = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    roughness: 0.78,
    bumpMap: getSurfaceBumpTexture(),
    bumpScale: 0.04,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.18, metalness: 0.24 });

  // Stepped inverted Pyramid of Le Plateau
  const basePodium = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 16), concreteMat);
  basePodium.position.y = 2;
  basePodium.castShadow = true;
  basePodium.receiveShadow = true;
  g.add(basePodium);

  for (let tier = 0; tier < 5; tier++) {
    const size = 12 + tier * 2.2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(size, 4.2, size), tier % 2 === 0 ? glassMat : concreteMat);
    block.position.y = 6 + tier * 4.2;
    block.castShadow = true;
    g.add(block);
  }

  // Crown roof + spire
  const crown = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), concreteMat);
  crown.rotation.y = Math.PI / 4;
  crown.position.y = 28.5;
  g.add(crown);

  return g;
}

export function createTourPostelLandmark(): THREE.Group {
  const g = new THREE.Group();
  const facadeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.2 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

  const core = new THREE.Mesh(new THREE.BoxGeometry(12, 42, 12), facadeMat);
  core.position.y = 21;
  core.castShadow = true;
  g.add(core);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 8), facadeMat);
  upper.position.y = 48;
  g.add(upper);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(12.6, 1.2, 12.6), accentMat);
  collar.position.y = 42;
  g.add(collar);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 10, 6), chromeMaterialShared);
  antenna.position.y = 59;
  g.add(antenna);

  return g;
}

const chromeMaterialShared = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.25 });

export function createMairiePlateauLandmark(): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.68 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }));
  base.position.y = 0.4;
  g.add(base);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 10), wallMat);
  hall.position.y = 4.3;
  hall.castShadow = true;
  g.add(hall);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(11.5, 3.2, 4), roofMat);
  pediment.rotation.y = Math.PI / 4;
  pediment.position.y = 9.4;
  g.add(pediment);

  // 4 Front Pillars
  [-5.2, -1.8, 1.8, 5.2].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 6.8, 10), wallMat);
    col.position.set(px, 4.2, 5.4);
    g.add(col);
  });

  // Côte d'Ivoire tricolor banner (Orange - White - Green)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 11, 6), chromeMaterialShared);
  pole.position.set(0, 6, 6.4);
  g.add(pole);

  [0xf97316, 0xffffff, 0x16a34a].forEach((c, idx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    strip.position.set(-0.9 + idx * 0.9, 10.6, 6.45);
    g.add(strip);
  });

  return g;
}

export function createPortCraneAndContainers(): THREE.Group {
  const g = new THREE.Group();
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.15 });

  // Crane legs & boom
  [-3, 3].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 18, 1.1), craneMat);
    leg.position.set(lx, 9, 0);
    leg.castShadow = true;
    g.add(leg);
  });
  const boom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 22), craneMat);
  boom.position.set(0, 18, 2);
  g.add(boom);

  // Stacked Containers
  const colors = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.8, 7.5),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.65 })
    );
    c.position.set((i % 3) * 3.6 - 10, 1.4 + Math.floor(i / 3) * 2.8, -6);
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

export function createBassamFuturisticSchool(): THREE.Group {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.12, metalness: 0.22 });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 8, 24, Math.PI), goldMat);
  arch.position.set(0, 1, 0);
  g.add(arch);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 10), whiteMat);
  wingL.position.set(-10, 3.5, 0);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 10), whiteMat);
  wingR.position.set(10, 3.5, 0);
  const centerGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), glassMat);
  centerGlass.position.set(0, 4, -2);
  g.add(wingL, wingR, centerGlass);

  return g;
}

export function createMaquisStructure(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 1.2 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 10), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
  floor.position.y = 0.125;
  g.add(floor);

  [
    [-5.5, -4.5],
    [5.5, -4.5],
    [-5.5, 4.5],
    [5.5, 4.5],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4, 8), woodMat);
    post.position.set(px, 2, pz);
    g.add(post);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 2.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.1;
  g.add(roof);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 0.2), neonMat);
  sign.position.set(0, 3.8, 4.8);
  g.add(sign);

  // Two giant speakers outside
  [-4.2, 4.2].forEach((sx) => {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 }));
    spk.position.set(sx, 1.2, 4.4);
    g.add(spk);
  });

  return g;
}

export interface CribZoneHandles {
  group: THREE.Group;
  splitClim: THREE.Group;
  bafflesMaquis: THREE.Group;
  tv4k: THREE.Group;
  canapeCuir: THREE.Group;
  updateUpgrades: (u: { splitClim: boolean; bafflesMaquis: boolean; tv4k: boolean; canapeCuir: boolean }) => void;
}

/**
 * Maison de poupée explorable 12 × 9 m alignée à 100% avec HOUSE_COLLIDERS (playerHouse.ts) :
 * - mur arrière z = -4.5, mur gauche x = -6, façade +z ouverte sur la rue
 * - lit (-4, -3), frigo (3, -3.5), douche (4, 2), bureau PC (-4, 2)
 * - piscine extérieure pour villa_ambassade et duplex_mer
 */
export function createPlayerHouseRig(
  homeType = 'studio',
  upgrades: { splitClim: boolean; bafflesMaquis: boolean; tv4k: boolean; canapeCuir: boolean } = {
    splitClim: false,
    bafflesMaquis: false,
    tv4k: false,
    canapeCuir: false,
  },
  ownerLabel?: string
): CribZoneHandles {
  const group = new THREE.Group();
  const isLuxury = homeType === 'villa_ambassade' || homeType === 'duplex_mer' || homeType === 'bunker';
  const isShack = homeType === 'squat' || homeType === 'chambre_cour';

  const tileMat = new THREE.MeshStandardMaterial({
    color: isLuxury ? 0xf8fafc : isShack ? 0x9ca3af : 0xe2e8f0,
    roughness: isLuxury ? 0.25 : 0.68,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: isLuxury ? 0xfef3c7 : isShack ? 0xcbd5e1 : 0xf1e8d6,
    roughness: 0.72,
  });

  // Sol 12 × 9 m (légèrement relevé pour éviter le Z-fighting avec le sol du chunk)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.14, 9), tileMat);
  floor.position.set(0, 0.07, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Mur arrière z = -4.5
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 0.3), wallMat);
  backWall.position.set(0, 1.6, -4.5);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Mur gauche x = -6
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 9), wallMat);
  leftWall.position.set(-6, 1.6, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // Corniche haute extérieure (sans bloquer la vue caméra plongeante)
  const roofTrim = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 0.24, 0.55),
    new THREE.MeshStandardMaterial({ color: isLuxury ? 0xb45309 : 0x7c2d12, roughness: 0.6 })
  );
  roofTrim.position.set(0, 3.25, -4.5);
  group.add(roofTrim);

  // Tapis Wax central
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.04, 2.8),
    new THREE.MeshStandardMaterial({ map: getWaxFabricTexture('#d97706', '#16a34a'), color: 0xffffff, roughness: 0.85 })
  );
  rug.position.set(0, 0.16, -0.5);
  group.add(rug);

  // Lit à (-4, -3) [hx:1, hz:0.75]
  const bedFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.45, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 })
  );
  bedFrame.position.set(-4, 0.35, -3);
  bedFrame.castShadow = true;
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.18, 1.25),
    new THREE.MeshStandardMaterial({ color: isLuxury ? 0x0f766e : 0xd97706, roughness: 0.8 })
  );
  blanket.position.set(-4, 0.62, -2.9);
  group.add(bedFrame, blanket);

  // Réfrigérateur à (3, -3.5) [hx:0.5, hz:0.45]
  const fridge = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.0, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.28, metalness: 0.22 })
  );
  fridge.position.set(3, 1.1, -3.5);
  fridge.castShadow = true;
  group.add(fridge);

  // Douche à (4, 2) [hx:0.6, hz:0.6]
  const showerTray = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 })
  );
  showerTray.position.set(4, 0.22, 2);
  const showerGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 2.1, 1.18),
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.34, roughness: 0.1 })
  );
  showerGlass.position.set(4, 1.25, 2);
  group.add(showerTray, showerGlass);

  // Bureau + PC à (-4, 2) [hx:0.9, hz:0.45]
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.75, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
  );
  desk.position.set(-4, 0.5, 2);
  desk.castShadow = true;
  const monitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.48, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  monitor.position.set(-4, 1.12, 1.82);
  group.add(desk, monitor);

  // Piscine extérieure pour villas & duplex (décor non bloquant)
  if (homeType === 'villa_ambassade' || homeType === 'duplex_mer') {
    const coping = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.12, 5.4),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45 })
    );
    coping.position.set(8.6, 0.06, -0.5);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.15, 4.8),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.85 })
    );
    water.position.set(8.6, 0.08, -0.5);
    group.add(coping, water);
  }

  // Upgrades Babi Cribs
  const splitClim = new THREE.Group();
  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.42), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 }));
  acUnit.position.set(0, 2.75, -4.15);
  splitClim.add(acUnit);
  group.add(splitClim);

  const bafflesMaquis = new THREE.Group();
  [-1.6, 1.6].forEach((bx) => {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.7), new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 }));
    spk.position.set(bx, 0.95, -3.95);
    bafflesMaquis.add(spk);
  });
  group.add(bafflesMaquis);

  const tv4k = new THREE.Group();
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.4, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x15803d, emissiveIntensity: 0.45, roughness: 0.15 })
  );
  screen.position.set(0, 1.85, -4.25);
  tv4k.add(screen);
  group.add(tv4k);

  const canapeCuir = new THREE.Group();
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.8, 1.15), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.42 }));
  sofa.position.set(0, 0.54, -1.6);
  canapeCuir.add(sofa);
  group.add(canapeCuir);

  if (ownerLabel) {
    const plaque = createFloatingNameplate(ownerLabel, '#0f172a');
    plaque.position.set(0, 4.1, 0);
    group.add(plaque);
  }

  const updateUpgrades = (u: { splitClim: boolean; bafflesMaquis: boolean; tv4k: boolean; canapeCuir: boolean }) => {
    splitClim.visible = u.splitClim;
    bafflesMaquis.visible = u.bafflesMaquis;
    tv4k.visible = u.tv4k;
    canapeCuir.visible = u.canapeCuir;
  };
  updateUpgrades(upgrades);

  return { group, splitClim, bafflesMaquis, tv4k, canapeCuir, updateUpgrades };
}

export function createCribInteriorZone(): CribZoneHandles {
  return createPlayerHouseRig('studio');
}

export function createCashPickupMesh(): THREE.Group {
  const g = new THREE.Group();
  g.add(createContactShadow(0.45));
  const stack = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.22, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.45, roughness: 0.35 })
  );
  stack.position.y = 0.65;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.37), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
  band.position.y = 0.65;
  g.add(stack, band);
  return g;
}

export function createMarketStallCluster(): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xf97316, 0x16a34a, 0x2563eb, 0xeab308];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 4.2;
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.9, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 })
    );
    table.position.set(ox, 0.45, 0);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 0.8, 4),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.72 })
    );
    canopy.rotation.y = Math.PI / 4;
    canopy.position.set(ox, 2.7, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), poleMat);
    pole.position.set(ox, 1.35, 0);
    g.add(table, canopy, pole);
  }
  return g;
}

export function createFloatingNameplate(label: string, bgHex = '#0f172a'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 68;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(6, 8, 408, 52);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 8, 408, 52);
  ctx.fillStyle = '#ffffff';
  let fontSize = 21;
  ctx.font = `bold ${fontSize}px sans-serif`;
  while (ctx.measureText(label).width > 376 && fontSize > 13) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 210, 35);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5.4, 0.9, 1);
  return sprite;
}

/**
 * Construit les 5 vrais ponts d'Abidjan entre `a` et `z` (échelle 1:4) :
 * - 'fhb' : Pont Félix Houphouët-Boigny (double tablier & piles en arc)
 * - 'degaulle' : Pont Charles de Gaulle (poutres métalliques & piles)
 * - 'hkb' : Pont Henri Konan Bédié (pylônes en A, haubans blancs & péage)
 * - 'ado' : Pont Alassane Ouattara (grand pylône V incliné à haubans sur baie de Cocody)
 * - 'yopougon' : 4ème Pont (viaduc large & pylônes jumelés)
 */
export function createBridgeModel(
  bridgeId: string,
  a: { x: number; z: number },
  z: { x: number; z: number },
  width: number
): { group: THREE.Group; setNight: (night: boolean) => void } {
  const group = new THREE.Group();
  const dx = z.x - a.x;
  const dz = z.z - a.z;
  const len = Math.hypot(dx, dz);
  const cx = (a.x + z.x) / 2;
  const cz = (a.z + z.z) / 2;
  const rotY = Math.atan2(dx, dz);

  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(cx, 0, cz);
  bridgeGroup.rotation.y = rotY;
  group.add(bridgeGroup);

  const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.72 });
  const whitePylonMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });

  // Tablier routier affleurant (y=0.06 pour ne jamais bloquer les roues PhysicsCore tout en couvrant l'eau)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, len + 8), deckMat);
  deck.position.y = 0.04;
  deck.receiveShadow = true;
  bridgeGroup.add(deck);

  // Garde-corps latéraux
  [-width / 2 + 0.2, width / 2 - 0.2].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, len + 4), concreteMat);
    rail.position.set(rx, 0.55, 0);
    bridgeGroup.add(rail);
  });

  // Ligne médiane jaune + lampadaires réguliers
  const centerStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.03, len),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 })
  );
  centerStripe.position.y = 0.2;
  bridgeGroup.add(centerStripe);

  const lampCount = Math.max(4, Math.floor(len / 28));
  for (let i = 0; i <= lampCount; i++) {
    const lz = -len / 2 + (i / lampCount) * len;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6), concreteMat);
    pole.position.set(0, 2.3, lz);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.35), lampBulbMat);
    bulb.position.set(0, 4.6, lz);
    bridgeGroup.add(pole, bulb);
  }

  // Pylônes & architecture propre à chaque pont
  if (bridgeId === 'hkb') {
    // Pont HKB : 2 grands pylônes en A avec haubans blancs
    [-len * 0.22, len * 0.22].forEach((pz) => {
      const hTower = 28;
      [-width * 0.45, width * 0.45].forEach((px) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, hTower, 1.4), whitePylonMat);
        leg.position.set(px * 0.85, hTower / 2, pz);
        leg.rotation.z = px > 0 ? 0.12 : -0.12;
        leg.castShadow = true;
        bridgeGroup.add(leg);
      });
      const cross = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 1.3, 1.4), whitePylonMat);
      cross.position.set(0, 18, pz);
      bridgeGroup.add(cross);

      // Haubans
      [-35, -24, -14, 14, 24, 35].forEach((dzCable) => {
        const anchorZ = pz + dzCable;
        const cLen = Math.hypot(dzCable, hTower - 4);
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cLen, 5), cableMat);
        cable.position.set(0, (hTower - 2) / 2, (pz + anchorZ) / 2);
        cable.rotation.x = Math.atan2(dzCable, hTower - 4);
        bridgeGroup.add(cable);
      });
    });
  } else if (bridgeId === 'ado') {
    // Pont Alassane Ouattara (Cocody Bay) : pylône central incliné iconique (~48m) + éventail de haubans
    const hTower = 42;
    [-width * 0.36, width * 0.36].forEach((px) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.3, hTower, 1.6), whitePylonMat);
      leg.position.set(px * 0.75, hTower / 2, -4);
      leg.rotation.x = -0.18;
      leg.rotation.z = px > 0 ? 0.14 : -0.14;
      leg.castShadow = true;
      bridgeGroup.add(leg);
    });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.2), whitePylonMat);
    cap.position.set(0, hTower - 2, -7.6);
    bridgeGroup.add(cap);
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const anchorZ = k * 14;
      const dzC = anchorZ + 7.6;
      const dyC = hTower - 3;
      const cLen = Math.hypot(dzC, dyC);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, cLen, 5), cableMat);
      cable.position.set(0, dyC / 2 + 0.5, (anchorZ - 7.6) / 2);
      cable.rotation.x = Math.atan2(dzC, dyC);
      bridgeGroup.add(cable);
    }
  } else {
    // FHB, De Gaulle & Yopougon : piles en arc sous tablier + portiques d'entrée
    const spans = Math.max(3, Math.floor(len / 40));
    for (let i = 1; i < spans; i++) {
      const pz = -len / 2 + (i / spans) * len;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 3.2, 1.8), concreteMat);
      pier.position.set(0, -1.5, pz);
      bridgeGroup.add(pier);
    }
    if (bridgeId === 'fhb' || bridgeId === 'degaulle') {
      const portal = new THREE.Mesh(
        new THREE.BoxGeometry(width + 1.5, 0.9, 1.2),
        new THREE.MeshStandardMaterial({ color: bridgeId === 'fhb' ? 0xf97316 : 0x0f766e, roughness: 0.5 })
      );
      portal.position.set(0, 6.2, -len / 2 + 6);
      bridgeGroup.add(portal);
    }
  }

  return {
    group,
    setNight: (night: boolean) => {
      lampBulbMat.emissiveIntensity = night ? 1.8 : 0.25;
    },
  };
}

export function createCathedralLandmark(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.65 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45 });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 34), stoneMat);
  nave.position.y = 7;
  nave.castShadow = true;
  const sweepingRoof = new THREE.Mesh(new THREE.ConeGeometry(18, 22, 4), roofMat);
  sweepingRoof.rotation.y = Math.PI / 4;
  sweepingRoof.position.y = 22;
  const bellTower = new THREE.Mesh(new THREE.BoxGeometry(5, 42, 5), stoneMat);
  bellTower.position.set(0, 21, 15);
  bellTower.castShadow = true;
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.6 }));
  crossV.position.set(0, 44.5, 15);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.6), crossV.material);
  crossH.position.set(0, 45.2, 15);
  g.add(nave, sweepingRoof, bellTower, crossV, crossH);
  return g;
}

export function createStadeFhbLandmark(): THREE.Group {
  const g = new THREE.Group();
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 });
  const pitchMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(36, 32, 14, 24, 1, true), bowlMat);
  ring.position.y = 7;
  const pitch = new THREE.Mesh(new THREE.BoxGeometry(44, 0.4, 28), pitchMat);
  pitch.position.y = 0.25;
  const canopy = new THREE.Mesh(new THREE.TorusGeometry(33, 4.2, 8, 24), roofMat);
  canopy.rotation.x = Math.PI / 2;
  canopy.position.y = 14.5;
  g.add(ring, pitch, canopy);
  return g;
}

export function createHotelIvoireLandmark(): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.18, metalness: 0.2 });
  const podium = new THREE.Mesh(new THREE.BoxGeometry(38, 6, 24), wallMat);
  podium.position.y = 3;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(20, 58, 12), wallMat);
  tower.position.set(-4, 32, 0);
  tower.castShadow = true;
  const glassWing = new THREE.Mesh(new THREE.BoxGeometry(14, 46, 10), glassMat);
  glassWing.position.set(10, 26, 2);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 3, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }));
  crown.position.set(-4, 62.5, 0);
  g.add(podium, tower, glassWing, crown);
  return g;
}
