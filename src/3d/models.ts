import * as THREE from 'three';
import { SapeOutfitId, VehicleModelType } from '../types/game';
import { SAPE_OUTFITS } from '../core/destinies';
import type { TimedBodyActionKind } from '../core/timedActions';
import { computeActionPose } from './avatars';
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
  animateAction: (kind: TimedBodyActionKind, elapsedSec: number, dt: number) => void;
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
    bodyPivot.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    const amp = Math.min(1, speedFactor);
    const swing = Math.sin(phase) * 0.65 * amp;
    leftLeg.hipPivot.rotation.x = swing;
    rightLeg.hipPivot.rotation.x = -swing;
    leftLeg.shinPivot.rotation.x = Math.max(0, -Math.cos(phase) * 0.6 * amp);
    rightLeg.shinPivot.rotation.x = Math.max(0, Math.cos(phase) * 0.6 * amp);

    leftArm.shoulderPivot.rotation.set(-swing * 0.85, 0, 0);
    rightArm.shoulderPivot.rotation.set(swing * 0.85, 0, 0);
    leftArm.forearmPivot.rotation.x = -0.25 - Math.abs(swing) * 0.35;
    rightArm.forearmPivot.rotation.x = -0.25 - Math.abs(swing) * 0.35;

    // Gentle idle breathing / walk bob
    const bob = amp > 0.05 ? Math.abs(Math.sin(phase)) * 0.045 * amp : Math.sin(performance.now() * 0.003) * 0.015;
    bodyPivot.position.y = THREE.MathUtils.lerp(bodyPivot.position.y, bob, 1 - Math.exp(-12 * dt));
  };

  const animateAction = (kind: TimedBodyActionKind, elapsedSec: number, dt: number) => {
    const p = computeActionPose(kind, elapsedSec);
    const alpha = 1 - Math.exp(-14 * dt);
    bodyPivot.rotation.x = THREE.MathUtils.lerp(bodyPivot.rotation.x, p.rootPitchX + p.spineX, alpha);
    bodyPivot.rotation.y = THREE.MathUtils.lerp(bodyPivot.rotation.y, p.spineY, alpha);
    bodyPivot.position.y = THREE.MathUtils.lerp(bodyPivot.position.y, p.rootOffsetY + p.hipOffsetY, alpha);
    headGroup.rotation.set(p.headX, p.headY, 0);
    // Notice: fallback buildArm puts leftArm at -X and rightArm at +X, opposite Z sign to Mixamo.
    leftArm.shoulderPivot.rotation.set(p.leftArmX, 0, -p.leftArmZ);
    leftArm.forearmPivot.rotation.x = p.leftForearmX;
    rightArm.shoulderPivot.rotation.set(p.rightArmX, 0, -p.rightArmZ);
    rightArm.forearmPivot.rotation.x = p.rightForearmX;
    leftLeg.hipPivot.rotation.x = p.leftUpLegX;
    leftLeg.shinPivot.rotation.x = p.leftLegX;
    rightLeg.hipPivot.rotation.x = p.rightUpLegX;
    rightLeg.shinPivot.rotation.x = p.rightLegX;
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
    animateAction,
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

const WHEEL_MATS = {
  tire: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.04 }),
  sidewall: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.78, metalness: 0.06 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.32 }),
  hubCap: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.3 }),
};

function buildWheel(radius = 0.38, width = 0.24): THREE.Group {
  const wheel = new THREE.Group();

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), WHEEL_MATS.tire);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const sidewall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, width + 0.008, 16),
    WHEEL_MATS.sidewall
  );
  sidewall.rotation.z = Math.PI / 2;
  wheel.add(sidewall);

  const rimBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.016, 14),
    WHEEL_MATS.hubCap
  );
  rimBarrel.rotation.z = Math.PI / 2;
  wheel.add(rimBarrel);

  const rimLip = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.54, radius * 0.055, 6, 16),
    WHEEL_MATS.rim
  );
  rimLip.rotation.y = Math.PI / 2;
  for (const side of [-1, 1]) {
    const lip = rimLip.clone();
    lip.position.x = side * (width / 2 + 0.008);
    wheel.add(lip);
  }

  // 5-spoke chibi alloy star + central lug cap
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width + 0.036, radius * 0.9, 0.052), WHEEL_MATS.rim);
    spoke.rotation.x = (i * Math.PI) / 5;
    wheel.add(spoke);
  }

  const centerCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width + 0.046, 10),
    WHEEL_MATS.rim
  );
  centerCap.rotation.z = Math.PI / 2;
  wheel.add(centerCap);

  return wheel;
}

export function createExtrudedProfileMesh(
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
  // ExtrudeGeometry extrudes along +Z, profile in XY -> -PI/2 maps +X (front of 2D profile) to +Z (vehicle forward)
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
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
    const whiteBand = new THREE.Mesh(new THREE.BoxGeometry(2.11, 0.34, 4.3), stripeMat);
    whiteBand.position.set(0, 1.18, -0.05);
    bodyGroup.add(whiteBand);

    const destSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.4 })
    );
    destSign.position.set(0, 1.88, 1.88);
    bodyGroup.add(destSign);

    // Windshield + side windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.62, 0.14), glassMat);
    windshield.position.set(0, 1.56, 1.98);
    windshield.rotation.x = -0.38;
    bodyGroup.add(windshield);

    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.48, 2.95), glassMat);
    sideWin.position.set(0, 1.62, -0.3);
    bodyGroup.add(sideWin);

    // Sun visor brow + front wipers + chrome slatted grille
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.1, 0.24), paintMat);
    visor.position.set(0, 1.93, 2.02);
    visor.rotation.x = 0.18;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.34, 0.09), chromeMat);
    grille.position.set(0, 0.84, 2.26);
    const grilleSlats = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.22, 0.11), bumperMat);
    grilleSlats.position.set(0, 0.84, 2.26);
    const sideStep = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 1.35), chromeMat);
    sideStep.position.set(1.06, 0.42, 0.15);
    bodyGroup.add(visor, grille, grilleSlats, sideStep);

    for (const wx of [-0.36, 0.36]) {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.04), bumperMat);
      wiper.position.set(wx, 1.28, 2.12);
      wiper.rotation.z = 0.22;
      bodyGroup.add(wiper);
    }

    // Roof luggage rack rails + spare wheel + colorful strapped parcels & yellow jerrycan
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 2.65), bumperMat);
    rack.position.set(0, 2.13, -0.42);
    bodyGroup.add(rack);
    for (const rx of [-0.8, 0.8]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 2.65), chromeMat);
      rail.position.set(rx, 2.22, -0.42);
      bodyGroup.add(rail);
    }
    const spare = buildWheel(0.32, 0.18);
    spare.rotation.z = Math.PI / 2;
    spare.position.set(-0.22, 2.28, -0.95);
    bodyGroup.add(spare);

    const parcelBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.32, 0.82),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.72 })
    );
    parcelBlue.position.set(0.18, 2.34, 0.18);
    const parcelStrap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.09), stripeMat);
    parcelStrap.position.set(0.18, 2.34, 0.18);
    const bagRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.24, 0.56),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 })
    );
    bagRed.position.set(-0.36, 2.29, 0.28);
    const jerrycan = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.36, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 })
    );
    jerrycan.position.set(0.46, 2.34, -0.95);
    bodyGroup.add(parcelBlue, parcelStrap, bagRed, jerrycan);

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

    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.42, 1.52), glassMat);
    cabinGlass.position.set(0, 1.26, -0.1);
    const woroWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.44, 0.12), glassMat);
    woroWindshield.position.set(0, 1.27, 0.84);
    woroWindshield.rotation.x = -0.68;
    const woroRearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.42, 0.12), glassMat);
    woroRearGlass.position.set(0, 1.27, -1.08);
    woroRearGlass.rotation.x = 0.72;
    const woroBPillar = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.44, 0.1), paintMat);
    woroBPillar.position.set(0, 1.26, -0.12);
    bodyGroup.add(cabinGlass, woroWindshield, woroRearGlass, woroBPillar);

    // Green Abidjan taxi waist stripes + ribbed chrome front grille + hood crease
    const taxiBand = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.12, 2.85),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.42 })
    );
    taxiBand.position.set(0, 0.8, 0.0);
    const woroGrille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.28, 0.08), chromeMat);
    woroGrille.position.set(0, 0.72, 2.13);
    const woroGrilleCore = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.1), bumperMat);
    woroGrilleCore.position.set(0, 0.72, 2.13);
    const hoodCrease = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 1.0), paintMat);
    hoodCrease.position.set(0, 1.0, 1.55);
    bodyGroup.add(taxiBand, woroGrille, woroGrilleCore, hoodCrease);

    // Roof TAXI dome + cradle base
    const taxiBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.34), bumperMat);
    taxiBase.position.set(0, 1.6, 0.1);
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.17, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfde047, emissiveIntensity: 0.55 })
    );
    taxiSign.position.set(0, 1.71, 0.1);
    bodyGroup.add(taxiBase, taxiSign);

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

    const whiteDoors = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.56, 1.6), whiteMat);
    whiteDoors.position.set(0, 0.94, 0);
    const bluePoliceStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.13, 1.55),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
    );
    bluePoliceStripe.position.set(0, 0.94, 0);
    bodyGroup.add(whiteDoors, bluePoliceStripe);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.07, 0.46, 2.28), glassMat);
    glass.position.set(0, 1.5, -0.5);
    bodyGroup.add(glass);

    // Front bull-bar + running boards + rear tailgate spare wheel + radio antenna
    const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.4, 0.14), chromeMat);
    bullBar.position.set(0, 0.68, 2.28);
    const bullBarInner = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.24, 0.16), bumperMat);
    bullBarInner.position.set(0, 0.68, 2.28);
    for (const rx of [-1.06, 1.06]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 1.75), bumperMat);
      board.position.set(rx, 0.48, 0.0);
      bodyGroup.add(board);
    }
    const rearSpare = buildWheel(0.36, 0.2);
    rearSpare.rotation.y = Math.PI / 2;
    rearSpare.position.set(0, 1.02, -2.26);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.65, 6), bumperMat);
    antenna.position.set(-0.75, 2.16, -1.65);
    antenna.rotation.x = -0.18;
    bodyGroup.add(bullBar, bullBarInner, rearSpare, antenna);

    // Flashing PLCC Siren Lightbar
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.1, 0.28), bumperMat);
    barBase.position.set(0, 1.92, 0.2);
    const barCenter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.24), whiteMat);
    barCenter.position.set(0, 1.98, 0.2);
    bodyGroup.add(barBase, barCenter);

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

    // Pantheon Grille with vertical ribs + Spirit of Ecstasy + chrome beltline + pano roof
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.58, 0.1), chromeMat);
    grille.position.set(0, 0.72, 2.58);
    bodyGroup.add(grille);
    for (let gx = -0.36; gx <= 0.361; gx += 0.12) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.12), bumperMat);
      rib.position.set(gx, 0.72, 2.59);
      bodyGroup.add(rib);
    }

    const spirit = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), chromeMat);
    spirit.position.set(0, 1.14, 2.52);
    const beltline = new THREE.Mesh(new THREE.BoxGeometry(2.11, 0.05, 3.3), chromeMat);
    beltline.position.set(0, 1.0, -0.15);
    const panoRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.55), glassMat);
    panoRoof.position.set(0, 1.63, -0.3);
    bodyGroup.add(spirit, beltline, panoRoof);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.44, 1.95), glassMat);
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

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.13, 0.32, 1.48), glassMat);
    canopy.position.set(0, 1.06, -0.2);
    bodyGroup.add(canopy);

    // Gold racing stripe + front splitter + roof scoop + GT wing stanchions + rear diffuser
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 4.4), goldMat);
    stripe.position.set(0, 0.88, 0);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.06, 0.24), bumperMat);
    splitter.position.set(0, 0.3, 2.28);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.58), bumperMat);
    scoop.position.set(0, 1.35, -0.58);
    const goldSill = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.07, 2.2), goldMat);
    goldSill.position.set(0, 0.34, 0.0);
    bodyGroup.add(stripe, splitter, scoop, goldSill);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.07, 0.36), bumperMat);
    wing.position.set(0, 1.24, -2.05);
    for (const sx of [-0.58, 0.58]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.22), goldMat);
      pylon.position.set(sx, 1.04, -2.02);
      bodyGroup.add(pylon);
    }
    for (const dx of [-0.36, 0, 0.36]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.22), bumperMat);
      fin.position.set(dx, 0.36, -2.32);
      bodyGroup.add(fin);
    }
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

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.01, 0.4, 1.56), glassMat);
    glass.position.set(0, 1.2, -0.15);
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(2.03, 0.4, 0.1), bumperMat);
    bPillar.position.set(0, 1.2, -0.12);
    bodyGroup.add(glass, bPillar);

    if (isBmw) {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.24), bumperMat);
      spoiler.position.set(0, 1.02, -2.02);
      const sharkFin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), paintMat);
      sharkFin.position.set(0, 1.56, -0.78);
      for (const kx of [-0.22, 0.22]) {
        const kidneyFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.08), chromeMat);
        kidneyFrame.position.set(kx, 0.64, 2.2);
        const kidneyCore = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.1), bumperMat);
        kidneyCore.position.set(kx, 0.64, 2.2);
        bodyGroup.add(kidneyFrame, kidneyCore);
      }
      // M tri-color accent bar
      [0x38bdf8, 0x1e3a8a, 0xef4444].forEach((c, idx) => {
        const mBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.14, 0.11),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })
        );
        mBar.position.set(0.55 + idx * 0.09, 0.56, 2.2);
        bodyGroup.add(mBar);
      });
      bodyGroup.add(spoiler, sharkFin);
    } else {
      const cityGrille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.08), chromeMat);
      cityGrille.position.set(0, 0.64, 2.2);
      const roofAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.24, 5), bumperMat);
      roofAnt.position.set(0, 1.58, -0.78);
      bodyGroup.add(cityGrille, roofAnt);
    }

    [
      [-0.92, 0.35, 1.38, true],
      [0.92, 0.35, 1.38, true],
      [-0.92, 0.35, -1.38, false],
      [0.92, 0.35, -1.38, false],
    ].forEach(([wx, wy, wz, isF]) => addWheelAt(wx as number, wy as number, wz as number, 0.35, 0.23, isF as boolean));
  }

  // Universal front headlights, indicators, plates, side mirrors, door handles & bumpers
  const zFront = type === 'rolls_royce_phantom' ? 2.55 : type === 'gbaka' ? 2.28 : 2.18;
  const zBack = type === 'rolls_royce_phantom' ? -2.55 : -2.22;
  const halfBodyW = type === 'woro_woro' ? 0.94 : type === 'berline_citadine' || type === 'bmw_m_series' ? 0.98 : 1.03;
  const mirrorY = type === 'gbaka' ? 1.44 : type === 'police_plcc' ? 1.3 : 1.06;
  const mirrorZ = type === 'gbaka' ? 1.62 : 0.68;
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const plateBadgeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

  [-0.68, 0.68].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headLightMat);
    hl.position.set(hx, 0.72, zFront);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.08), tailLightMat);
    tl.position.set(hx, 0.76, zBack);
    const sign = Math.sign(hx);
    const indF = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.08), indicatorMat);
    indF.position.set(hx + sign * 0.22, 0.72, zFront - 0.01);
    const indR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.08), indicatorMat);
    indR.position.set(hx + sign * 0.22, 0.76, zBack + 0.01);
    bodyGroup.add(hl, tl, indF, indR);
  });

  // Side mirrors + door handles
  for (const side of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.06), bumperMat);
    stem.position.set(side * (halfBodyW + 0.04), mirrorY, mirrorZ);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), bumperMat);
    cap.position.set(side * (halfBodyW + 0.11), mirrorY + 0.02, mirrorZ - 0.02);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), chromeMat);
    handle.position.set(side * (halfBodyW + 0.02), mirrorY - 0.18, 0.05);
    bodyGroup.add(stem, cap, handle);
  }

  // Front & rear Ivorian license plates + twin chrome exhaust tips
  const plateF = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.04), plateMat);
  plateF.position.set(0, 0.42, zFront + 0.1);
  const plateFBadge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.045), plateBadgeMat);
  plateFBadge.position.set(-0.21, 0.42, zFront + 0.1);
  const plateR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.04), plateMat);
  plateR.position.set(0, 0.56, zBack - 0.02);
  bodyGroup.add(plateF, plateFBadge, plateR);

  const exhaustOffsets = type === 'bmw_m_series' ? [-0.58, -0.44, 0.44, 0.58] : [-0.52, 0.52];
  for (const ex of exhaustOffsets) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.29, zBack - 0.08);
    bodyGroup.add(pipe);
  }

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

const mairieSharedMats = {
  wall: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.68 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0xfef08a, emissiveIntensity: 0.16, roughness: 0.25 }),
  flags: [0xf97316, 0xffffff, 0x16a34a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })),
};

export function createMairiePlateauLandmark(label?: string): THREE.Group {
  const g = new THREE.Group();
  const { wall: wallMat, roof: roofMat, trim: trimMat, glass: glassMat } = mairieSharedMats;

  const base = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), trimMat);
  base.position.y = 0.4;
  g.add(base);

  const steps = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.44, 1.3), trimMat);
  steps.position.set(0, 0.22, 6.45);
  g.add(steps);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 10), wallMat);
  hall.position.y = 4.3;
  hall.castShadow = true;
  g.add(hall);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.6, 0.22), roofMat);
  doorFrame.position.set(0, 2.6, 5.06);
  g.add(doorFrame);

  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.2, 0.26), glassMat);
  doorGlass.position.set(0, 2.45, 5.08);
  g.add(doorGlass);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(11.5, 3.2, 4), roofMat);
  pediment.rotation.y = Math.PI / 4;
  pediment.position.y = 9.4;
  g.add(pediment);

  // 4 Front Pillars + chapiteaux et socles + horloge dorée du fronton + balustres latéraux du perron
  [-5.2, -1.8, 1.8, 5.2].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 6.8, 10), wallMat);
    col.position.set(px, 4.2, 5.4);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 1.12), trimMat);
    cap.position.set(px, 7.65, 5.4);
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.32, 1.16), trimMat);
    colBase.position.set(px, 0.96, 5.4);
    g.add(col, cap, colBase);
  });

  const clockRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.24, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.28, metalness: 0.3 })
  );
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(0, 8.75, 5.18);
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.26, 16), wallMat);
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 8.75, 5.19);
  const handH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.06), roofMat);
  handH.position.set(0.1, 8.85, 5.33);
  handH.rotation.z = -0.5;
  const handM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.06), roofMat);
  handM.position.set(-0.14, 8.72, 5.33);
  handM.rotation.z = 1.1;
  g.add(clockRim, clockFace, handH, handM);

  // Côte d'Ivoire tricolor banner (Orange - White - Green), décalée à droite du perron
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 11, 6), chromeMaterialShared);
  pole.position.set(7.2, 5.5, 6.2);
  g.add(pole);

  mairieSharedMats.flags.forEach((mat, idx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.08), mat);
    strip.position.set(6.3 + idx * 0.9, 10.1, 6.25);
    g.add(strip);
  });

  if (label && typeof document !== 'undefined') {
    const badge = createFloatingNameplate(label.toUpperCase(), '#0f766e');
    badge.position.set(0, 6.8, 5.3);
    badge.scale.set(6.4, 1.35, 1);
    g.add(badge);
  }

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
  const doorGlow = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x38bdf8, emissiveIntensity: 0.45, roughness: 0.2 });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 8, 24, Math.PI), goldMat);
  arch.position.set(0, 1, 0);
  g.add(arch);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 10), whiteMat);
  wingL.position.set(-10, 3.5, 0);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 10), whiteMat);
  wingR.position.set(10, 3.5, 0);
  const centerGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), glassMat);
  centerGlass.position.set(0, 4, -2);
  // Hall d'entrée avancé (+z = 8) avec porte vitrée et auvent doré
  const lobby = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.8, 6.2), whiteMat);
  lobby.position.set(0, 1.9, 4.9);
  lobby.castShadow = true;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.3, 2.2), goldMat);
  canopy.position.set(0, 3.9, 8.0);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.9, 0.2), doorGlow);
  door.position.set(0, 1.45, 8.02);
  g.add(wingL, wingR, centerGlass, lobby, canopy, door);

  return g;
}

export function createClassicLyceeStructure(w = 22, d = 14, h = 8, wallHex = 0xfef3c7, roofHex = 0xb45309): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, roughness: 0.78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.62 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x334e68, emissive: 0xfef08a, emissiveIntensity: 0.16, roughness: 0.25 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), trimMat);
  plinth.position.y = 0.25;
  g.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2 + 0.25;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.55, d + 1.0), roofMat);
  cornice.position.y = h + 0.45;
  cornice.castShadow = true;
  g.add(cornice);

  // Deux rangées de baies vitrées sur la façade et les côtés
  for (const wy of [h * 0.36, h * 0.74]) {
    const wf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 1.3, 0.12), glassMat);
    wf.position.set(0, wy, d / 2 + 0.05);
    const wb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 1.3, 0.12), glassMat);
    wb.position.set(0, wy, -d / 2 - 0.05);
    g.add(wf, wb);
  }

  // Portique central (+z = d/2) avec piliers, auvent et porte vitrée
  const porchCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.35, 2.4), roofMat);
  porchCanopy.position.set(0, 3.6, d / 2 + 1.1);
  for (const px of [-2.4, 2.4]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.5, 0.36), trimMat);
    col.position.set(px, 1.75, d / 2 + 2.0);
    g.add(col);
  }
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.0, 0.18), roofMat);
  doorFrame.position.set(0, 1.55, d / 2 + 0.06);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.22), glassMat);
  doorGlass.position.set(0, 1.45, d / 2 + 0.07);

  // Horloge scolaire dorée sur la façade + faîtage
  const schoolClock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.25 })
  );
  schoolClock.rotation.x = Math.PI / 2;
  schoolClock.position.set(0, h - 0.85, d / 2 + 0.14);
  const schoolClockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.23, 16), trimMat);
  schoolClockFace.rotation.x = Math.PI / 2;
  schoolClockFace.position.set(0, h - 0.85, d / 2 + 0.15);
  const roofCrest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.32, 0.4), roofMat);
  roofCrest.position.set(0, h + 0.86, 0);
  g.add(porchCanopy, doorFrame, doorGlass, schoolClock, schoolClockFace, roofCrest);

  return g;
}

export function createMaquisStructure(w = 18, d = 12, h = 5.2): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.82 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.78 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
  const warmGlass = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.65, roughness: 0.25 });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 1.15 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfbbf24, emissiveIntensity: 1.1 });
  const spkMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

  // Corps du bâtiment (aligné sur l'emprise solide w × d, façade avant +z = d/2)
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roofRim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.35, d + 0.8), roofMat);
  roofRim.position.y = h + 0.18;
  roofRim.castShadow = true;
  g.add(roofRim);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), deckMat);
  plinth.position.y = 0.2;
  g.add(plinth);

  // Bandeau lumineux chaleureux sur la façade avant et les côtés
  const winFrontL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, 1.1, 0.08), warmGlass);
  winFrontL.position.set(-w * 0.28, 2.3, d / 2 + 0.04);
  const winFrontR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, 1.1, 0.08), warmGlass);
  winFrontR.position.set(w * 0.28, 2.3, d / 2 + 0.04);
  g.add(winFrontL, winFrontR);

  // Porte vitrée d'entrée au centre (+z = d/2)
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.9, 0.18), trimMat);
  doorFrame.position.set(0, 1.45, d / 2 + 0.05);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 0.22), warmGlass);
  doorGlass.position.set(0, 1.35, d / 2 + 0.06);
  g.add(doorFrame, doorGlass);

  // Avancée en paillote ouverte devant l'entrée (z = +d/2 .. +d/2 + 5.2, passage central libre)
  const patioD = 5.2;
  const patioW = Math.min(13.6, w - 2.4);
  const patioZ = d / 2 + patioD / 2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(patioW, 0.04, patioD), deckMat);
  deck.position.set(0, 0.02, patioZ);
  deck.receiveShadow = true;
  g.add(deck);

  // Poteaux de paillote bien écartés de l'axe de la porte (±6 m)
  const postX = patioW / 2 - 0.6;
  [
    [-postX, d / 2 + 0.5],
    [postX, d / 2 + 0.5],
    [-postX, d / 2 + patioD - 0.5],
    [postX, d / 2 + patioD - 0.5],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.9, 8), woodMat);
    post.position.set(px, 1.95, pz);
    post.castShadow = true;
    g.add(post);
  });

  // Grand toit de paillote pyramidal au-dessus de la terrasse ouverte
  const pailloteRoof = new THREE.Mesh(new THREE.ConeGeometry(patioW * 0.68, 2.0, 4), roofMat);
  pailloteRoof.rotation.y = Math.PI / 4;
  pailloteRoof.position.set(0, 4.9, patioZ);
  pailloteRoof.castShadow = true;
  g.add(pailloteRoof);

  // Enseigne néon au fronton de la paillote + guirlande ambre
  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.78, 0.22), neonMat);
  sign.position.set(0, 3.35, d / 2 + patioD + 0.04);
  g.add(sign);

  for (let i = -2; i <= 2; i++) {
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), bulbMat);
    bulb.position.set(i * 2.2, 3.72, d / 2 + patioD - 0.15);
    g.add(bulb);
  }

  // Chapiteau paille au sommet de la paillote
  const thatchCap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.55, 4), trimMat);
  thatchCap.rotation.y = Math.PI / 4;
  thatchCap.position.set(0, 6.0, patioZ);
  g.add(thatchCap);

  // Deux baffles géantes avec woofers circulaires encadrant la façade du maquis
  const wooferMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.2 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
  [-4.4, 4.4].forEach((sx) => {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.9), spkMat);
    spk.position.set(sx, 1.25, d / 2 + 0.48);
    spk.castShadow = true;
    g.add(spk);
    for (const wy of [0.82, 1.66]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12), wooferMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(sx, wy, d / 2 + 0.94);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), coneMat);
      center.rotation.x = Math.PI / 2;
      center.position.set(sx, wy, d / 2 + 0.95);
      g.add(ring, center);
    }
  });

  // Deux mange-debout décoratifs + tabourets colorés sur les bords de la terrasse (hors du passage central)
  const stoolMats = [0xea580c, 0x16a34a, 0x2563eb, 0xfacc15].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })
  );
  const stoolGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.48, 8);
  [-4.6, 4.6].forEach((tx, idx) => {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12), woodMat);
    table.position.set(tx, 0.95, d / 2 + 3.2);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8), trimMat);
    leg.position.set(tx, 0.45, d / 2 + 3.2);
    // Bouteilles fraîches & assiette sur le mange-debout (au-dessus du solide r=0.65)
    const btlGreen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.26, 8),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.2 })
    );
    btlGreen.position.set(tx - 0.14, 1.12, d / 2 + 3.12);
    const btlAmber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.24, 8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2 })
    );
    btlAmber.position.set(tx + 0.04, 1.11, d / 2 + 3.25);
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    plate.position.set(tx + 0.2, 1.01, d / 2 + 3.08);
    g.add(table, leg, btlGreen, btlAmber, plate);
    const sideDir = tx < 0 ? -1 : 1;
    [
      [tx + sideDir * 0.95, d / 2 + 2.85],
      [tx + sideDir * 0.95, d / 2 + 3.65],
    ].forEach(([sx, sz], j) => {
      const stool = new THREE.Mesh(stoolGeo, stoolMats[(idx * 2 + j) % stoolMats.length]);
      stool.position.set(sx, 0.24, sz);
      stool.castShadow = true;
      g.add(stool);
    });
  });

  // Brasero à charbon incandescent avec brochettes (côté droit de la terrasse)
  const grillX = postX - 0.9;
  const grillZ = d / 2 + 1.9;
  const grillStand = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.68, 0.65), spkMat);
  grillStand.position.set(grillX, 0.34, grillZ);
  grillStand.castShadow = true;
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.35,
    roughness: 0.4,
  });
  const embers = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.48), emberMat);
  embers.position.set(grillX, 0.72, grillZ);
  const grate = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.05, 0.54), trimMat);
  grate.position.set(grillX, 0.78, grillZ);
  // Brochettes de choukouya posées sur la grille
  const meatMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 });
  for (const sx of [-0.28, 0, 0.28]) {
    const skewer = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.34), meatMat);
    skewer.position.set(grillX + sx, 0.84, grillZ);
    g.add(skewer);
  }
  g.add(grillStand, embers, grate);

  return g;
}

export function createCashPickupMesh(): THREE.Group {
  const g = new THREE.Group();
  g.add(createContactShadow(0.45));
  const billMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.45, roughness: 0.35 });
  const topBillMat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.5, roughness: 0.3 });
  const stackBot = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.35), billMat);
  stackBot.position.y = 0.6;
  const stackTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.11, 0.33), topBillMat);
  stackTop.position.set(0.03, 0.72, 0.02);
  stackTop.rotation.y = 0.14;
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.26, 0.37),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.25 })
  );
  band.position.y = 0.66;
  g.add(stackBot, stackTop, band);
  return g;
}

export function createMarketStallCluster(w = 36, d = 18, h = 9.5): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xb85c38, roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.68 });
  const skyGlass = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.5, roughness: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
  const canopyMats = [0xf97316, 0x16a34a, 0x2563eb, 0xeab308, 0xdc2626, 0x9333ea].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72 })
  );
  const goodsMats = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xec4899].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 })
  );

  // 1. Grande Halle couverte centrale (alignée sur l'emprise solide w × d)
  const hall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  hall.position.y = h / 2;
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), plinthMat);
  plinth.position.y = 0.25;
  g.add(plinth);

  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.55, d + 1.4), roofMat);
  roofBase.position.y = h + 0.25;
  roofBase.castShadow = true;
  const roofMonitor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 1.4, d * 0.48), trimMat);
  roofMonitor.position.y = h + 1.1;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.35, d * 0.54), roofMat);
  roofCap.position.y = h + 1.95;
  g.add(roofBase, roofMonitor, roofCap);

  // Bandeaux vitrés en hauteur sur les 4 faces
  const clereFront = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 1.3, 0.1), skyGlass);
  clereFront.position.set(0, h * 0.68, d / 2 + 0.05);
  const clereBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 1.3, 0.1), skyGlass);
  clereBack.position.set(0, h * 0.68, -d / 2 - 0.05);
  g.add(clereFront, clereBack);

  // Portique et double porte vitrée sur la façade sud (+z = d/2)
  const portal = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 0.4), trimMat);
  portal.position.set(0, 1.9, d / 2 + 0.12);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 0.45), skyGlass);
  doorGlass.position.set(0, 1.4, d / 2 + 0.15);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 2.2), roofMat);
  awning.position.set(0, 3.7, d / 2 + 1.1);
  g.add(portal, doorGlass, awning);

  // Enseigne courte frontale
  const marquee = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.0, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, emissive: 0xd97706, emissiveIntensity: 0.7 })
  );
  marquee.position.set(0, 4.9, d / 2 + 0.15);
  g.add(marquee);

  // 2. Grand marché ouvert autour de la Halle : 16 étals colorés avec allée centrale dégagée (|x| >= 8.5)
  const addStall = (sx: number, sz: number, idx: number, rotY = 0) => {
    const s = new THREE.Group();
    s.position.set(sx, 0, sz);
    s.rotation.y = rotY;
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 1.7), woodMat);
    table.position.set(0, 0.44, 0);
    table.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.5, 0.9, 4), canopyMats[idx % canopyMats.length]);
    canopy.rotation.y = Math.PI / 4;
    canopy.position.set(0, 2.85, 0);
    canopy.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.6, 6), poleMat);
    pole.position.set(0, 1.3, 0);
    // Paniers & rouleaux de pagne colorés sur l'étal
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.28, 0.65), goodsMats[idx % goodsMats.length]);
    g1.position.set(-0.9, 1.02, 0.1);
    const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.34, 0.65), goodsMats[(idx + 2) % goodsMats.length]);
    g2.position.set(0.85, 1.05, -0.05);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.55), crateMat);
    crate.position.set(1.15, 0.22, 1.05);
    // Sacs de riz / oignons en toile de jute + tas de tomates / plantains
    const sackMat = new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0xd6b88d : 0xc2a278, roughness: 0.9 });
    const sack1 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.44), sackMat);
    sack1.position.set(-1.18, 0.17, 1.02);
    const sack2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.4), sackMat);
    sack2.position.set(-1.12, 0.46, 0.98);
    sack2.rotation.y = 0.2;
    const producePile = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.34, 6),
      goodsMats[(idx + 1) % goodsMats.length]
    );
    producePile.position.set(0.0, 1.04, 0.12);
    s.add(table, canopy, pole, g1, g2, crate, sack1, sack2, producePile);
    g.add(s);
  };

  let idx = 0;
  // Parvis sud (2 rangées de part et d'autre de l'allée centrale et du point commerce)
  for (const sz of [d / 2 + 6.8, d / 2 + 12.8]) {
    for (const sx of [-26, -18, -10.5, 10.5, 18, 26]) {
      addStall(sx, sz, idx++);
    }
  }
  // Ailes ouest et est de la halle (étals perpendiculaires)
  for (const sx of [-(w / 2 + 5.8), w / 2 + 5.8]) {
    for (const sz of [-4.2, 3.8]) {
      addStall(sx, sz, idx++, Math.PI / 2);
    }
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

function createLandmarkSignBoard(text: string, bg: string, fg: string, w: number, h: number): THREE.Mesh {
  if (typeof document === 'undefined') {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: bg, roughness: 0.5 })
    );
  }
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 144;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 62;
  ctx.font = `bold ${size}px sans-serif`;
  while (ctx.measureText(text).width > c.width - 64 && size > 20) {
    size -= 4;
    ctx.font = `bold ${size}px sans-serif`;
  }
  ctx.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.38, roughness: 0.5 })
  );
}

export function createCathedralLandmark(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45 });
  const stainedMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.42, roughness: 0.2 });
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

  // Parvis & portail d'entrée aligné sur l'emprise d = 44 (façade à z = +22)
  const narthex = new THREE.Mesh(new THREE.BoxGeometry(14, 9.5, 6), stoneMat);
  narthex.position.set(0, 4.75, 19);
  narthex.castShadow = true;
  const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.2, 0.45), trimMat);
  portalFrame.position.set(0, 2.6, 22.02);
  const portalDoor = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.1, 0.2), stainedMat);
  portalDoor.position.set(0, 2.15, 22.2);
  const roseWindow = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.25, 16), stainedMat);
  roseWindow.rotation.x = Math.PI / 2;
  roseWindow.position.set(0, 7.2, 22.05);
  const cathSign = createLandmarkSignBoard('CATHEDRALE SAINT-PAUL', '#0c4a6e', '#fef08a', 6.8, 1.15);
  cathSign.position.set(0, 5.65, 22.3);

  g.add(nave, sweepingRoof, bellTower, crossV, crossH, narthex, portalFrame, portalDoor, roseWindow, cathSign);
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

export function createHotelIvoireLandmark(w = 46, d = 30): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.48 });
  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xe7dfd0, roughness: 0.58 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.16, metalness: 0.25 });
  const warmGlass = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.35, roughness: 0.22 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.25, roughness: 0.28, metalness: 0.45 });

  // Grand podium travertin aligné 1:1 sur l'emprise (46 × 30)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(w, 6.4, d), travertineMat);
  podium.position.y = 3.2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  g.add(podium);

  // Baies vitrées panoramiques du hall sur les 4 faces du podium
  const frontGlassL = new THREE.Mesh(new THREE.BoxGeometry(12, 3.8, 0.14), warmGlass);
  frontGlassL.position.set(-12, 3.1, d / 2 + 0.06);
  const frontGlassR = new THREE.Mesh(new THREE.BoxGeometry(12, 3.8, 0.14), warmGlass);
  frontGlassR.position.set(12, 3.1, d / 2 + 0.06);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 3.6, 0.14), glassMat);
  backGlass.position.set(0, 3.1, -d / 2 - 0.06);
  g.add(frontGlassL, frontGlassR, backGlass);

  // Grande tour Ivoire + ailes vitrées + anneaux dorés d'étages
  const tower = new THREE.Mesh(new THREE.BoxGeometry(22, 60, 14), wallMat);
  tower.position.set(-5, 36, -1);
  tower.castShadow = true;
  g.add(tower);

  for (let fy = 12; fy <= 60; fy += 6) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.55, 14.6), fy % 12 === 0 ? goldMat : glassMat);
    band.position.set(-5, fy, -1);
    g.add(band);
  }

  const glassWing = new THREE.Mesh(new THREE.BoxGeometry(15, 48, 12), glassMat);
  glassWing.position.set(11, 30, 1.5);
  glassWing.castShadow = true;
  g.add(glassWing);

  // Couronne dorée panoramique + flèche sommitale
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 3.8, 20), goldMat);
  crown.position.set(-5, 67.8, -1);
  const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 8.8, 1.2, 20), warmGlass);
  crownRing.position.set(-5, 67.5, -1);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.45, 7, 8), goldMat);
  spire.position.set(-5, 73, -1);
  g.add(crown, crownRing, spire);

  // Portique VIP d'entrée avant (z = d/2 .. d/2 + 2.6), 2 piliers à (±3.4, d/2 + 2.4) alignés sur hotelIvoireLocal
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.8, 0.18), warmGlass);
  doorGlass.position.set(0, 2.0, d / 2 + 0.08);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.42, 3.2), goldMat);
  canopy.position.set(0, 4.4, d / 2 + 1.5);
  canopy.castShadow = true;
  g.add(doorGlass, canopy);

  for (const px of [-3.4, 3.4]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 4.2, 0.44), travertineMat);
    pillar.position.set(px, 2.1, d / 2 + 2.4);
    pillar.castShadow = true;
    g.add(pillar);
  }

  const signBoard = createLandmarkSignBoard('GRAND HOTEL IVOIRE', '#78350f', '#fef08a', 9.2, 1.65);
  signBoard.position.set(0, 5.55, d / 2 + 0.12);
  g.add(signBoard);
  return g;
}

export function createPalaisCultureLandmark(w = 60, d = 40, h = 20): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.65 });
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3, roughness: 0.2 });

  const baseH = Math.max(12, h * 0.72);
  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, d), wallMat);
  mainHall.position.y = baseH / 2;
  mainHall.castShadow = true;
  mainHall.receiveShadow = true;
  g.add(mainHall);

  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.9, d + 1.4), terracotta);
  roofTrim.position.y = baseH + 0.45;
  g.add(roofTrim);

  // Coupole culturelle centrale
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(11, 15, 6.2, 16), terracotta);
  dome.position.y = baseH + 3.6;
  const domeCrown = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 1.4, 12), goldMat);
  domeCrown.position.y = baseH + 7.2;
  g.add(dome, domeCrown);

  // Colonnes rythmant la façade avant
  for (let cx = -w * 0.38; cx <= w * 0.38; cx += w * 0.19) {
    if (Math.abs(cx) < 4.5) continue;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.1, baseH - 1, 0.6), terracotta);
    rib.position.set(cx, baseH / 2, d / 2 + 0.25);
    g.add(rib);
  }

  // Entrée principale + auvent + 2 piliers à (±3.6, d/2 + 2.4) alignés sur palaisCultureLocal
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.8, 0.2), glassMat);
  doorGlass.position.set(0, 2.0, d / 2 + 0.08);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.45, 3.2), terracotta);
  canopy.position.set(0, 4.7, d / 2 + 1.5);
  g.add(doorGlass, canopy);

  for (const px of [-3.6, 3.6]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.6, 0.48), wallMat);
    pillar.position.set(px, 2.3, d / 2 + 2.4);
    pillar.castShadow = true;
    g.add(pillar);
  }

  const signBoard = createLandmarkSignBoard('PALAIS DE LA CULTURE', '#7f1d1d', '#fef3c7', 10.5, 1.8);
  signBoard.position.set(0, 6.2, d / 2 + 0.14);
  g.add(signBoard);
  return g;
}

export function createAeroportLandmark(w = 130, d = 44, h = 18): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.18 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.22 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.35, roughness: 0.16, metalness: 0.25 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });

  const termH = Math.max(11, h * 0.65);
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(w, termH, d), bodyMat);
  terminal.position.y = termH / 2;
  terminal.castShadow = true;
  terminal.receiveShadow = true;
  g.add(terminal);

  // Longue baie vitrée aérogare + grand toit débordant
  const facadeGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, termH * 0.58, 0.2), glassMat);
  facadeGlass.position.set(0, termH * 0.54, d / 2 + 0.08);
  const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 1.1, d + 3), roofMat);
  wingRoof.position.y = termH + 0.55;
  g.add(facadeGlass, wingRoof);

  // Tour de contrôle aérienne (ATC) sur le toit à l'est
  const atcShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 20, 12), bodyMat);
  atcShaft.position.set(w * 0.28, termH + 10, -d * 0.16);
  const atcCab = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 4.2, 3.8, 12), glassMat);
  atcCab.position.set(w * 0.28, termH + 21.5, -d * 0.16);
  const atcCap = new THREE.Mesh(new THREE.CylinderGeometry(5.9, 5.9, 0.7, 12), orangeMat);
  atcCap.position.set(w * 0.28, termH + 23.8, -d * 0.16);
  g.add(atcShaft, atcCab, atcCap);

  // Dépose-minute avant : auvent + 2 piliers à (±4.0, d/2 + 2.4) alignés sur aeroportLocal
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 0.2), glassMat);
  doorGlass.position.set(0, 2.0, d / 2 + 0.1);
  const dropCanopy = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.45, 3.2), orangeMat);
  dropCanopy.position.set(0, 4.6, d / 2 + 1.5);
  g.add(doorGlass, dropCanopy);

  for (const px of [-4.0, 4.0]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.5, 0.48), bodyMat);
    pillar.position.set(px, 2.25, d / 2 + 2.4);
    pillar.castShadow = true;
    g.add(pillar);
  }

  const signBoard = createLandmarkSignBoard('AEROPORT FHB · ABIDJAN', '#0f172a', '#f8fafc', 12.5, 1.9);
  signBoard.position.set(0, 6.2, d / 2 + 0.16);
  g.add(signBoard);
  return g;
}
