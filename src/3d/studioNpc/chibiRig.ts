// BLV : copie du studio PNJ (BLV — Babi Life Vibes Asset Studio), utilisée par studioActorBuilder.ts. Ne pas modifier sans le studio.
import * as THREE from 'three';
import type { BodySpec } from './blvCatalog';

export const CHIBI_BONE_NAMES = [
  'Root',
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
] as const;

export type ChibiBoneName = (typeof CHIBI_BONE_NAMES)[number];

export interface ChibiJointPositions {
  hipsY: number;
  spineY: number;
  chestY: number;
  neckY: number;
  headCenterY: number;
  headZ: number;
  chestZ: number;
  shoulderY: number;
  shoulderZ: number;
  leftShoulder: THREE.Vector3;
  leftArm: THREE.Vector3;
  leftForeArm: THREE.Vector3;
  leftHand: THREE.Vector3;
  rightShoulder: THREE.Vector3;
  rightArm: THREE.Vector3;
  rightForeArm: THREE.Vector3;
  rightHand: THREE.Vector3;
  leftUpLeg: THREE.Vector3;
  leftLeg: THREE.Vector3;
  leftFoot: THREE.Vector3;
  rightUpLeg: THREE.Vector3;
  rightLeg: THREE.Vector3;
  rightFoot: THREE.Vector3;
  armDropAngle: number;
}

export interface ChibiRig {
  rootBone: THREE.Bone;
  bones: THREE.Bone[];
  boneMap: Record<ChibiBoneName, THREE.Bone>;
  boneIndexMap: Record<ChibiBoneName, number>;
  skeleton: THREE.Skeleton;
  joints: ChibiJointPositions;
  restQuaternions: Record<ChibiBoneName, THREE.Quaternion>;
}

/**
 * Computes exact anatomical joint world positions in meters with feet grounded at Y = 0.
 */
export function computeJointPositions(spec: BodySpec): ChibiJointPositions {
  const ankleY = spec.footHeight;
  const kneeY = ankleY + spec.legLength * 0.48;
  const hipsY = ankleY + spec.legLength;
  const spineY = hipsY + spec.torsoHeight * 0.34;
  const chestY = hipsY + spec.torsoHeight * 0.72;
  const tiltOffsetZ = Math.sin(spec.spineForwardTilt) * spec.torsoHeight * 0.55;
  const shoulderY = hipsY + spec.torsoHeight * 0.88;
  const neckY = hipsY + spec.torsoHeight;
  const headCenterY =
    neckY + spec.neckLength + spec.headRadius * spec.headScaleY * 0.88;

  const armDropAngle = 1.18; // ~68 deg downward from horizontal (relaxed natural arms)
  const upperArmLen = spec.armLength * 0.52;
  const foreArmLen = spec.armLength * 0.48;

  const shoulderX = spec.shoulderWidth;
  const shoulderZ = tiltOffsetZ * 0.9;

  const cosA = Math.cos(armDropAngle);
  const sinA = Math.sin(armDropAngle);

  // Left = +X in character space (character faces +Z)
  const leftShoulder = new THREE.Vector3(shoulderX * 0.65, shoulderY, shoulderZ);
  const leftArm = new THREE.Vector3(shoulderX, shoulderY, shoulderZ);
  const leftForeArm = new THREE.Vector3(
    shoulderX + cosA * upperArmLen,
    shoulderY - sinA * upperArmLen,
    shoulderZ
  );
  const leftHand = new THREE.Vector3(
    leftForeArm.x + cosA * foreArmLen,
    leftForeArm.y - sinA * foreArmLen,
    shoulderZ + 0.015
  );

  // Right = -X
  const rightShoulder = new THREE.Vector3(-shoulderX * 0.65, shoulderY, shoulderZ);
  const rightArm = new THREE.Vector3(-shoulderX, shoulderY, shoulderZ);
  const rightForeArm = new THREE.Vector3(
    -shoulderX - cosA * upperArmLen,
    shoulderY - sinA * upperArmLen,
    shoulderZ
  );
  const rightHand = new THREE.Vector3(
    rightForeArm.x - cosA * foreArmLen,
    rightForeArm.y - sinA * foreArmLen,
    shoulderZ + 0.015
  );

  const hipX = spec.hipSpread;
  const leftUpLeg = new THREE.Vector3(hipX, hipsY, 0);
  const leftLeg = new THREE.Vector3(hipX, kneeY, 0.008);
  const leftFoot = new THREE.Vector3(hipX, ankleY, 0);

  const rightUpLeg = new THREE.Vector3(-hipX, hipsY, 0);
  const rightLeg = new THREE.Vector3(-hipX, kneeY, 0.008);
  const rightFoot = new THREE.Vector3(-hipX, ankleY, 0);

  return {
    hipsY,
    spineY,
    chestY,
    neckY,
    headCenterY,
    headZ: tiltOffsetZ * 1.15,
    chestZ: tiltOffsetZ * 0.75,
    shoulderY,
    shoulderZ,
    leftShoulder,
    leftArm,
    leftForeArm,
    leftHand,
    rightShoulder,
    rightArm,
    rightForeArm,
    rightHand,
    leftUpLeg,
    leftLeg,
    leftFoot,
    rightUpLeg,
    rightLeg,
    rightFoot,
    armDropAngle,
  };
}

/**
 * Creates a standardized 20-bone chibi skeleton in bind pose for the given BodySpec.
 */
export function createChibiSkeleton(spec: BodySpec): ChibiRig {
  const joints = computeJointPositions(spec);
  const boneMap = {} as Record<ChibiBoneName, THREE.Bone>;
  const boneIndexMap = {} as Record<ChibiBoneName, number>;
  const bones: THREE.Bone[] = [];

  for (let i = 0; i < CHIBI_BONE_NAMES.length; i++) {
    const name = CHIBI_BONE_NAMES[i];
    const bone = new THREE.Bone();
    bone.name = name;
    boneMap[name] = bone;
    boneIndexMap[name] = i;
    bones.push(bone);
  }

  // Hierarchy
  boneMap.Root.add(boneMap.Hips);
  boneMap.Hips.add(boneMap.Spine);
  boneMap.Spine.add(boneMap.Chest);
  boneMap.Chest.add(boneMap.Neck);
  boneMap.Neck.add(boneMap.Head);

  boneMap.Chest.add(boneMap.LeftShoulder);
  boneMap.LeftShoulder.add(boneMap.LeftArm);
  boneMap.LeftArm.add(boneMap.LeftForeArm);
  boneMap.LeftForeArm.add(boneMap.LeftHand);

  boneMap.Chest.add(boneMap.RightShoulder);
  boneMap.RightShoulder.add(boneMap.RightArm);
  boneMap.RightArm.add(boneMap.RightForeArm);
  boneMap.RightForeArm.add(boneMap.RightHand);

  boneMap.Hips.add(boneMap.LeftUpLeg);
  boneMap.LeftUpLeg.add(boneMap.LeftLeg);
  boneMap.LeftLeg.add(boneMap.LeftFoot);

  boneMap.Hips.add(boneMap.RightUpLeg);
  boneMap.RightUpLeg.add(boneMap.RightLeg);
  boneMap.RightLeg.add(boneMap.RightFoot);

  // Set local offsets from world joint coordinates
  boneMap.Root.position.set(0, 0, 0);
  boneMap.Hips.position.set(0, joints.hipsY, 0);
  boneMap.Spine.position.set(0, joints.spineY - joints.hipsY, joints.chestZ * 0.3);
  boneMap.Chest.position.set(0, joints.chestY - joints.spineY, joints.chestZ * 0.45);
  boneMap.Neck.position.set(0, joints.neckY - joints.chestY, joints.headZ - joints.chestZ * 0.75);
  boneMap.Head.position.set(0, joints.headCenterY - joints.neckY, 0);

  // Arms (local relative to Chest)
  const chestWorld = new THREE.Vector3(0, joints.chestY, joints.chestZ * 0.75);
  boneMap.LeftShoulder.position.copy(joints.leftShoulder).sub(chestWorld);
  boneMap.LeftArm.position.copy(joints.leftArm).sub(joints.leftShoulder);
  boneMap.LeftForeArm.position.copy(joints.leftForeArm).sub(joints.leftArm);
  boneMap.LeftHand.position.copy(joints.leftHand).sub(joints.leftForeArm);

  boneMap.RightShoulder.position.copy(joints.rightShoulder).sub(chestWorld);
  boneMap.RightArm.position.copy(joints.rightArm).sub(joints.rightShoulder);
  boneMap.RightForeArm.position.copy(joints.rightForeArm).sub(joints.rightArm);
  boneMap.RightHand.position.copy(joints.rightHand).sub(joints.rightForeArm);

  // Legs (local relative to Hips)
  const hipsWorld = new THREE.Vector3(0, joints.hipsY, 0);
  boneMap.LeftUpLeg.position.copy(joints.leftUpLeg).sub(hipsWorld);
  boneMap.LeftLeg.position.copy(joints.leftLeg).sub(joints.leftUpLeg);
  boneMap.LeftFoot.position.copy(joints.leftFoot).sub(joints.leftLeg);

  boneMap.RightUpLeg.position.copy(joints.rightUpLeg).sub(hipsWorld);
  boneMap.RightLeg.position.copy(joints.rightLeg).sub(joints.rightUpLeg);
  boneMap.RightFoot.position.copy(joints.rightFoot).sub(joints.rightLeg);

  // Subtle elderly spine bend in rest pose
  if (spec.spineForwardTilt > 0) {
    boneMap.Spine.rotation.x = spec.spineForwardTilt * 0.45;
    boneMap.Chest.rotation.x = spec.spineForwardTilt * 0.45;
    boneMap.Head.rotation.x = -spec.spineForwardTilt * 0.75; // keeps head looking forward
  }

  boneMap.Root.updateMatrixWorld(true);

  const restQuaternions = {} as Record<ChibiBoneName, THREE.Quaternion>;
  for (const name of CHIBI_BONE_NAMES) {
    restQuaternions[name] = boneMap[name].quaternion.clone();
  }

  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  return {
    rootBone: boneMap.Root,
    bones,
    boneMap,
    boneIndexMap,
    skeleton,
    joints,
    restQuaternions,
  };
}

export type SkinZone =
  | 'head'
  | 'neck'
  | 'torso'
  | 'leftArm'
  | 'rightArm'
  | 'leftHand'
  | 'rightHand'
  | 'leftLeg'
  | 'rightLeg'
  | 'leftFoot'
  | 'rightFoot'
  | 'hipsOnly'
  | 'chestOnly';

/**
 * Computes normalized skinIndex / skinWeight attributes on a BufferGeometry
 * using smooth spatial blending for the specified anatomical zone.
 */
export function applyZoneSkinning(
  geometry: THREE.BufferGeometry,
  zone: SkinZone,
  rig: ChibiRig
): THREE.BufferGeometry {
  const pos = geometry.attributes.position;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  const idx = rig.boneIndexMap;
  const j = rig.joints;

  const setWeights = (
    v: number,
    b0: ChibiBoneName,
    w0: number,
    b1: ChibiBoneName = 'Root',
    w1 = 0,
    b2: ChibiBoneName = 'Root',
    w2 = 0
  ) => {
    const sum = w0 + w1 + w2 || 1;
    skinIndices[v * 4] = idx[b0];
    skinIndices[v * 4 + 1] = idx[b1];
    skinIndices[v * 4 + 2] = idx[b2];
    skinIndices[v * 4 + 3] = 0;

    skinWeights[v * 4] = w0 / sum;
    skinWeights[v * 4 + 1] = w1 / sum;
    skinWeights[v * 4 + 2] = w2 / sum;
    skinWeights[v * 4 + 3] = 0;
  };

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    switch (zone) {
      case 'head':
        setWeights(i, 'Head', 1);
        break;
      case 'neck': {
        const t = THREE.MathUtils.clamp((y - j.chestY) / Math.max(0.05, j.headCenterY - j.chestY), 0, 1);
        setWeights(i, 'Neck', 1 - t * 0.5, 'Head', t * 0.5);
        break;
      }
      case 'chestOnly':
        setWeights(i, 'Chest', 1);
        break;
      case 'hipsOnly':
        setWeights(i, 'Hips', 1);
        break;
      case 'leftHand':
        setWeights(i, 'LeftHand', 1);
        break;
      case 'rightHand':
        setWeights(i, 'RightHand', 1);
        break;
      case 'leftFoot':
        setWeights(i, 'LeftFoot', 1);
        break;
      case 'rightFoot':
        setWeights(i, 'RightFoot', 1);
        break;
      case 'torso': {
        // Check if vertex extends onto arm sleeves
        const armStart = j.leftArm.x - 0.025;
        if (x > armStart && y > j.spineY) {
          const armSpan = Math.max(0.05, j.leftHand.x - armStart);
          const armT = THREE.MathUtils.clamp((x - armStart) / armSpan, 0, 1);
          if (armT < 0.45) {
            setWeights(i, 'Chest', 1 - armT * 1.6, 'LeftArm', armT * 1.6);
          } else {
            const foreT = THREE.MathUtils.clamp((armT - 0.45) / 0.55, 0, 1);
            setWeights(i, 'LeftArm', 1 - foreT, 'LeftForeArm', foreT);
          }
        } else if (x < -armStart && y > j.spineY) {
          const armSpan = Math.max(0.05, j.leftHand.x - armStart);
          const armT = THREE.MathUtils.clamp((-x - armStart) / armSpan, 0, 1);
          if (armT < 0.45) {
            setWeights(i, 'Chest', 1 - armT * 1.6, 'RightArm', armT * 1.6);
          } else {
            const foreT = THREE.MathUtils.clamp((armT - 0.45) / 0.55, 0, 1);
            setWeights(i, 'RightArm', 1 - foreT, 'RightForeArm', foreT);
          }
        } else if (y < j.hipsY) {
          // Skirt or long tunic extending over hips/thighs
          const legT = THREE.MathUtils.clamp((j.hipsY - y) / Math.max(0.1, j.hipsY - j.leftLeg.y), 0, 0.6);
          if (x > 0.02) {
            setWeights(i, 'Hips', 1 - legT, 'LeftUpLeg', legT);
          } else if (x < -0.02) {
            setWeights(i, 'Hips', 1 - legT, 'RightUpLeg', legT);
          } else {
            setWeights(i, 'Hips', 1 - legT * 0.5, 'LeftUpLeg', legT * 0.25, 'RightUpLeg', legT * 0.25);
          }
        } else {
          const t = THREE.MathUtils.clamp(
            (y - j.hipsY) / Math.max(0.05, j.neckY - j.hipsY),
            0,
            1
          );
          if (t < 0.4) {
            const k = t / 0.4;
            setWeights(i, 'Hips', 1 - k, 'Spine', k);
          } else {
            const k = (t - 0.4) / 0.6;
            setWeights(i, 'Spine', 1 - k, 'Chest', k);
          }
        }
        break;
      }
      case 'leftArm': {
        const armAxis = new THREE.Vector3().subVectors(j.leftHand, j.leftArm);
        const totalLen = Math.max(0.05, armAxis.length());
        armAxis.normalize();
        const elbowDist = j.leftForeArm.distanceTo(j.leftArm);
        const vPos = new THREE.Vector3(x, y, pos.getZ(i));
        const proj = vPos.sub(j.leftArm).dot(armAxis);
        if (proj <= 0.012) {
          setWeights(i, 'LeftShoulder', 0.35, 'LeftArm', 0.65);
        } else if (proj < elbowDist) {
          const t = THREE.MathUtils.clamp(proj / Math.max(0.03, elbowDist), 0, 1);
          setWeights(i, 'LeftArm', 1 - t * 0.35, 'LeftForeArm', t * 0.35);
        } else if (proj < totalLen) {
          const t = THREE.MathUtils.clamp((proj - elbowDist) / Math.max(0.03, totalLen - elbowDist), 0, 1);
          setWeights(i, 'LeftForeArm', 1 - t * 0.3, 'LeftHand', t * 0.3);
        } else {
          setWeights(i, 'LeftHand', 1);
        }
        break;
      }
      case 'rightArm': {
        const armAxis = new THREE.Vector3().subVectors(j.rightHand, j.rightArm);
        const totalLen = Math.max(0.05, armAxis.length());
        armAxis.normalize();
        const elbowDist = j.rightForeArm.distanceTo(j.rightArm);
        const vPos = new THREE.Vector3(x, y, pos.getZ(i));
        const proj = vPos.sub(j.rightArm).dot(armAxis);
        if (proj <= 0.012) {
          setWeights(i, 'RightShoulder', 0.35, 'RightArm', 0.65);
        } else if (proj < elbowDist) {
          const t = THREE.MathUtils.clamp(proj / Math.max(0.03, elbowDist), 0, 1);
          setWeights(i, 'RightArm', 1 - t * 0.35, 'RightForeArm', t * 0.35);
        } else if (proj < totalLen) {
          const t = THREE.MathUtils.clamp((proj - elbowDist) / Math.max(0.03, totalLen - elbowDist), 0, 1);
          setWeights(i, 'RightForeArm', 1 - t * 0.3, 'RightHand', t * 0.3);
        } else {
          setWeights(i, 'RightHand', 1);
        }
        break;
      }
      case 'leftLeg': {
        const hipY = j.leftUpLeg.y;
        const kneeY = j.leftLeg.y;
        const ankleY = j.leftFoot.y;
        const kneeBand = 0.022;
        if (y >= hipY - 0.01) {
          setWeights(i, 'Hips', 0.55, 'LeftUpLeg', 0.45);
        } else if (y > kneeY + kneeBand) {
          setWeights(i, 'LeftUpLeg', 1);
        } else if (y >= kneeY - kneeBand) {
          const t = THREE.MathUtils.clamp((kneeY + kneeBand - y) / (kneeBand * 2), 0, 1);
          setWeights(i, 'LeftUpLeg', 1 - t, 'LeftLeg', t);
        } else if (y > ankleY) {
          const t = THREE.MathUtils.clamp((kneeY - y) / Math.max(0.03, kneeY - ankleY), 0, 1);
          setWeights(i, 'LeftLeg', 1 - t * 0.25, 'LeftFoot', t * 0.25);
        } else {
          setWeights(i, 'LeftFoot', 1);
        }
        break;
      }
      case 'rightLeg': {
        const hipY = j.rightUpLeg.y;
        const kneeY = j.rightLeg.y;
        const ankleY = j.rightFoot.y;
        const kneeBand = 0.022;
        if (y >= hipY - 0.01) {
          setWeights(i, 'Hips', 0.55, 'RightUpLeg', 0.45);
        } else if (y > kneeY + kneeBand) {
          setWeights(i, 'RightUpLeg', 1);
        } else if (y >= kneeY - kneeBand) {
          const t = THREE.MathUtils.clamp((kneeY + kneeBand - y) / (kneeBand * 2), 0, 1);
          setWeights(i, 'RightUpLeg', 1 - t, 'RightLeg', t);
        } else if (y > ankleY) {
          const t = THREE.MathUtils.clamp((kneeY - y) / Math.max(0.03, kneeY - ankleY), 0, 1);
          setWeights(i, 'RightLeg', 1 - t * 0.25, 'RightFoot', t * 0.25);
        } else {
          setWeights(i, 'RightFoot', 1);
        }
        break;
      }
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  return geometry;
}

export function createSkinnedPart(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  zone: SkinZone,
  rig: ChibiRig,
  name: string
): THREE.SkinnedMesh {
  applyZoneSkinning(geometry, zone, rig);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.bind(rig.skeleton);
  return mesh;
}

export function computeMotoRidingSeat(spec: BodySpec): {
  hipsY: number;
  hipsZ: number;
  saddleTopY: number;
} {
  const dropFromHips = spec.legLength * 0.655 + spec.footHeight;
  const hipsY = Math.max(0.335, dropFromHips + 0.07);
  const hipsZ = -0.09;
  const saddleTopY = hipsY - 0.025;
  return { hipsY, hipsZ, saddleTopY };
}

/**
 * Poses the 20-bone chibi rig into a seated motorbike riding posture (after skeleton bind inverses).
 * Updates restQuaternions so riding animations modulate smoothly around the riding pose.
 */
export function applyMotoRidingPose(
  rig: ChibiRig,
  spec: BodySpec
): {
  hipsY: number;
  hipsZ: number;
  saddleTopY: number;
  leftHandWorld: THREE.Vector3;
  rightHandWorld: THREE.Vector3;
} {
  const { hipsY, hipsZ, saddleTopY } = computeMotoRidingSeat(spec);
  const b = rig.boneMap;

  b.Hips.position.set(0, hipsY, hipsZ);
  b.Hips.rotation.set(0, 0, 0);

  // Subtle forward rider lean while keeping head level forward
  b.Spine.rotation.set(0.08 + spec.spineForwardTilt * 0.35, 0, 0);
  b.Chest.rotation.set(0.11 + spec.spineForwardTilt * 0.35, 0, 0);
  b.Neck.rotation.set(-0.04, 0, 0);
  b.Head.rotation.set(-0.14 - spec.spineForwardTilt * 0.6, 0, 0);

  // Seated legs straddling scooter onto floorboards
  b.LeftUpLeg.rotation.set(-1.28, 0.04, 0.16);
  b.LeftLeg.rotation.set(1.36, 0, 0);
  b.LeftFoot.rotation.set(-0.08, 0, 0);

  b.RightUpLeg.rotation.set(-1.28, -0.04, -0.16);
  b.RightLeg.rotation.set(1.36, 0, 0);
  b.RightFoot.rotation.set(-0.08, 0, 0);

  // Arms reaching forward & slightly inward to grip handlebars
  b.LeftArm.rotation.set(-1.12, 0, -0.18);
  b.LeftForeArm.rotation.set(-0.24, 0, 0);
  b.RightArm.rotation.set(-1.12, 0, 0.18);
  b.RightForeArm.rotation.set(-0.24, 0, 0);

  rig.rootBone.updateMatrixWorld(true);

  for (const name of CHIBI_BONE_NAMES) {
    rig.restQuaternions[name] = b[name].quaternion.clone();
  }

  const leftHandWorld = new THREE.Vector3().setFromMatrixPosition(b.LeftHand.matrixWorld);
  const rightHandWorld = new THREE.Vector3().setFromMatrixPosition(b.RightHand.matrixWorld);

  return { hipsY, hipsZ, saddleTopY, leftHandWorld, rightHandWorld };
}

const _deltaQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _spinAxis = new THREE.Vector3(1, 0, 0);

function makeBoneTrack(
  boneName: ChibiBoneName,
  restQuat: THREE.Quaternion,
  times: number[],
  eulers: [number, number, number][]
): THREE.QuaternionKeyframeTrack {
  const values: number[] = [];
  for (const [rx, ry, rz] of eulers) {
    _euler.set(rx, ry, rz, 'XYZ');
    _deltaQuat.setFromEuler(_euler);
    const q = restQuat.clone().multiply(_deltaQuat);
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
}

function makeWheelSpinTrack(
  nodeName: string,
  duration: number,
  turns: number
): THREE.QuaternionKeyframeTrack {
  const steps = turns * 8;
  const times: number[] = [];
  const values: number[] = [];
  let prevQ: THREE.Quaternion | null = null;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration;
    const angle = (i / steps) * Math.PI * 2 * turns;
    const q = new THREE.Quaternion().setFromAxisAngle(_spinAxis, angle);
    if (prevQ && prevQ.dot(q) < 0) {
      q.set(-q.x, -q.y, -q.z, -q.w);
    }
    prevQ = q.clone();
    times.push(t);
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values);
}

/**
 * Generates shared procedural animations (Idle, Walk, Run, Combat, Talk) compatible with all 6 chibi rigs.
 * When isMotoRider is true, produces continuous motorbike driving animations with spinning wheels.
 */
export function createChibiAnimations(
  rig: ChibiRig,
  isMotoRider = false
): THREE.AnimationClip[] {
  const rq = rig.restQuaternions;

  if (isMotoRider) {
    const hipsPos = rig.boneMap.Hips.position;
    const hy = hipsPos.y;
    const hz = hipsPos.z;

    // 1. BLV_Idle (1.2s steady city cruise on moto — driver always rides!)
    const cruiseTimes = [0, 0.3, 0.6, 0.9, 1.2];
    const motoIdleClip = new THREE.AnimationClip('BLV_Idle', 1.2, [
      makeWheelSpinTrack('Moto_Wheel_Front', 1.2, 2),
      makeWheelSpinTrack('Moto_Wheel_Rear', 1.2, 2),
      new THREE.VectorKeyframeTrack('Moto_ChassisGroup.position', cruiseTimes, [
        0, 0, 0,
        0, 0.008, 0,
        0, 0.001, 0,
        0, 0.009, 0,
        0, 0, 0,
      ]),
      new THREE.VectorKeyframeTrack('Hips.position', cruiseTimes, [
        0, hy, hz,
        0, hy + 0.008, hz,
        0, hy + 0.001, hz,
        0, hy + 0.009, hz,
        0, hy, hz,
      ]),
      makeBoneTrack('Chest', rq.Chest, cruiseTimes, [
        [0, 0, 0],
        [0.02, 0.02, 0],
        [0, 0, 0],
        [0.02, -0.02, 0],
        [0, 0, 0],
      ]),
      makeBoneTrack('Head', rq.Head, cruiseTimes, [
        [0, 0, 0],
        [-0.02, 0.06, 0.02],
        [0, 0, 0],
        [-0.02, -0.06, -0.02],
        [0, 0, 0],
      ]),
    ]);

    // 2. BLV_Walk (0.8s standard Abidjan delivery cruise)
    const fastTimes = [0, 0.2, 0.4, 0.6, 0.8];
    const motoWalkClip = new THREE.AnimationClip('BLV_Walk', 0.8, [
      makeWheelSpinTrack('Moto_Wheel_Front', 0.8, 3),
      makeWheelSpinTrack('Moto_Wheel_Rear', 0.8, 3),
      new THREE.VectorKeyframeTrack('Moto_ChassisGroup.position', fastTimes, [
        0, 0, 0,
        0, 0.012, 0,
        0, 0.002, 0,
        0, 0.013, 0,
        0, 0, 0,
      ]),
      new THREE.VectorKeyframeTrack('Hips.position', fastTimes, [
        0, hy, hz,
        0, hy + 0.012, hz,
        0, hy + 0.002, hz,
        0, hy + 0.013, hz,
        0, hy, hz,
      ]),
      makeBoneTrack('Chest', rq.Chest, fastTimes, [
        [0.05, 0, 0.02],
        [0.08, 0.03, -0.02],
        [0.05, 0, 0.02],
        [0.08, -0.03, -0.02],
        [0.05, 0, 0.02],
      ]),
      makeBoneTrack('Head', rq.Head, fastTimes, [
        [-0.04, 0, 0],
        [-0.06, 0.04, 0],
        [-0.04, 0, 0],
        [-0.06, -0.04, 0],
        [-0.04, 0, 0],
      ]),
    ]);

    // 3. BLV_Run (0.56s express sprint / tucked aerodynamic moto dash)
    const turboTimes = [0, 0.14, 0.28, 0.42, 0.56];
    const motoRunClip = new THREE.AnimationClip('BLV_Run', 0.56, [
      makeWheelSpinTrack('Moto_Wheel_Front', 0.56, 4),
      makeWheelSpinTrack('Moto_Wheel_Rear', 0.56, 4),
      new THREE.VectorKeyframeTrack('Moto_ChassisGroup.position', turboTimes, [
        0, 0, 0,
        0, 0.015, 0,
        0, 0.003, 0,
        0, 0.015, 0,
        0, 0, 0,
      ]),
      new THREE.VectorKeyframeTrack('Hips.position', turboTimes, [
        0, hy, hz,
        0, hy + 0.015, hz,
        0, hy + 0.003, hz,
        0, hy + 0.015, hz,
        0, hy, hz,
      ]),
      makeBoneTrack('Chest', rq.Chest, turboTimes, [
        [0.14, 0, 0],
        [0.17, 0.02, -0.02],
        [0.14, 0, 0],
        [0.17, -0.02, 0.02],
        [0.14, 0, 0],
      ]),
      makeBoneTrack('Head', rq.Head, turboTimes, [
        [-0.12, 0, 0],
        [-0.14, 0, 0],
        [-0.12, 0, 0],
        [-0.14, 0, 0],
        [-0.12, 0, 0],
      ]),
    ]);

    // 4. BLV_Combat (1.0s evasive traffic swerve while keeping wheels rolling)
    const evadeTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const motoCombatClip = new THREE.AnimationClip('BLV_Combat', 1.0, [
      makeWheelSpinTrack('Moto_Wheel_Front', 1.0, 3),
      makeWheelSpinTrack('Moto_Wheel_Rear', 1.0, 3),
      new THREE.VectorKeyframeTrack('Moto_ChassisGroup.position', evadeTimes, [
        0, 0, 0,
        0, 0.011, 0,
        0, 0.002, 0,
        0, 0.011, 0,
        0, 0, 0,
      ]),
      new THREE.VectorKeyframeTrack('Hips.position', evadeTimes, [
        0, hy, hz,
        0, hy + 0.011, hz,
        0, hy + 0.002, hz,
        0, hy + 0.011, hz,
        0, hy, hz,
      ]),
      makeBoneTrack('Hips', rq.Hips, evadeTimes, [
        [0, 0, 0],
        [0, -0.08, 0.14],
        [0, 0, 0],
        [0, 0.08, -0.14],
        [0, 0, 0],
      ]),
      makeBoneTrack('Chest', rq.Chest, evadeTimes, [
        [0.06, 0, 0],
        [0.1, -0.12, 0.08],
        [0.06, 0, 0],
        [0.1, 0.12, -0.08],
        [0.06, 0, 0],
      ]),
      makeBoneTrack('Head', rq.Head, evadeTimes, [
        [-0.04, 0, 0],
        [-0.06, 0.18, -0.06],
        [-0.04, 0, 0],
        [-0.06, -0.18, 0.06],
        [-0.04, 0, 0],
      ]),
    ]);

    // 5. BLV_Talk (1.4s friendly rider discussion / nod while wheels keep rolling)
    const talkTimes = [0, 0.35, 0.7, 1.05, 1.4];
    const motoTalkClip = new THREE.AnimationClip('BLV_Talk', 1.4, [
      makeWheelSpinTrack('Moto_Wheel_Front', 1.4, 2),
      makeWheelSpinTrack('Moto_Wheel_Rear', 1.4, 2),
      new THREE.VectorKeyframeTrack('Moto_ChassisGroup.position', talkTimes, [
        0, 0, 0,
        0, 0.007, 0,
        0, 0.001, 0,
        0, 0.007, 0,
        0, 0, 0,
      ]),
      new THREE.VectorKeyframeTrack('Hips.position', talkTimes, [
        0, hy, hz,
        0, hy + 0.007, hz,
        0, hy + 0.001, hz,
        0, hy + 0.007, hz,
        0, hy, hz,
      ]),
      makeBoneTrack('Head', rq.Head, talkTimes, [
        [0, 0, 0],
        [-0.09, 0.18, 0.05],
        [0.06, -0.14, -0.04],
        [-0.07, 0.12, 0.04],
        [0, 0, 0],
      ]),
      makeBoneTrack('Chest', rq.Chest, talkTimes, [
        [0, 0, 0],
        [0, 0.08, 0],
        [-0.03, -0.06, 0],
        [0, 0.06, 0],
        [0, 0, 0],
      ]),
    ]);

    return [motoIdleClip, motoWalkClip, motoRunClip, motoCombatClip, motoTalkClip];
  }

  const hy = rig.boneMap.Hips.position.y;

  // 1. BLV_Idle (2.4s gentle breathing + subtle head sway)
  const idleTimes = [0, 0.6, 1.2, 1.8, 2.4];
  const idleClip = new THREE.AnimationClip('BLV_Idle', 2.4, [
    makeBoneTrack('Chest', rq.Chest, idleTimes, [
      [0, 0, 0],
      [-0.03, 0.02, 0],
      [0, 0, 0],
      [-0.03, -0.02, 0],
      [0, 0, 0],
    ]),
    makeBoneTrack('Head', rq.Head, idleTimes, [
      [0, 0, 0],
      [0.02, 0.04, 0.02],
      [0, 0, 0],
      [0.02, -0.04, -0.02],
      [0, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, idleTimes, [
      [0, 0, -0.04],
      [0.03, 0, 0],
      [0, 0, -0.04],
      [-0.02, 0, 0],
      [0, 0, -0.04],
    ]),
    makeBoneTrack('RightArm', rq.RightArm, idleTimes, [
      [0, 0, 0.04],
      [-0.02, 0, 0],
      [0, 0, 0.04],
      [0.03, 0, 0],
      [0, 0, 0.04],
    ]),
  ]);

  // 2. BLV_Walk (1.0s energetic chibi stride)
  const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];
  const walkClip = new THREE.AnimationClip('BLV_Walk', 1.0, [
    makeBoneTrack('Hips', rq.Hips, walkTimes, [
      [0, 0.06, 0.03],
      [0.03, 0, 0],
      [0, -0.06, -0.03],
      [0.03, 0, 0],
      [0, 0.06, 0.03],
    ]),
    makeBoneTrack('Chest', rq.Chest, walkTimes, [
      [0.04, -0.07, 0],
      [0.04, 0, 0],
      [0.04, 0.07, 0],
      [0.04, 0, 0],
      [0.04, -0.07, 0],
    ]),
    makeBoneTrack('LeftUpLeg', rq.LeftUpLeg, walkTimes, [
      [-0.55, 0, 0],
      [0.0, 0, 0],
      [0.5, 0, 0],
      [0.15, 0, 0],
      [-0.55, 0, 0],
    ]),
    makeBoneTrack('LeftLeg', rq.LeftLeg, walkTimes, [
      [0.2, 0, 0],
      [0.05, 0, 0],
      [0.45, 0, 0],
      [0.65, 0, 0],
      [0.2, 0, 0],
    ]),
    makeBoneTrack('RightUpLeg', rq.RightUpLeg, walkTimes, [
      [0.5, 0, 0],
      [0.15, 0, 0],
      [-0.55, 0, 0],
      [0.0, 0, 0],
      [0.5, 0, 0],
    ]),
    makeBoneTrack('RightLeg', rq.RightLeg, walkTimes, [
      [0.45, 0, 0],
      [0.65, 0, 0],
      [0.2, 0, 0],
      [0.05, 0, 0],
      [0.45, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, walkTimes, [
      [0.32, 0, -0.04],
      [0, 0, -0.04],
      [-0.32, 0, -0.04],
      [0, 0, -0.04],
      [0.32, 0, -0.04],
    ]),
    makeBoneTrack('RightArm', rq.RightArm, walkTimes, [
      [-0.32, 0, 0.04],
      [0, 0, 0.04],
      [0.32, 0, 0.04],
      [0, 0, 0.04],
      [-0.32, 0, 0.04],
    ]),
    makeBoneTrack('Head', rq.Head, walkTimes, [
      [-0.03, 0.04, 0],
      [0.02, 0, 0],
      [-0.03, -0.04, 0],
      [0.02, 0, 0],
      [-0.03, 0.04, 0],
    ]),
  ]);

  // 3. BLV_Run (0.6s dynamic chibi sprint cycle)
  const runTimes = [0, 0.15, 0.3, 0.45, 0.6];
  const runClip = new THREE.AnimationClip('BLV_Run', 0.6, [
    new THREE.VectorKeyframeTrack('Hips.position', runTimes, [
      0, hy + 0.005, 0,
      0, hy + 0.034, 0,
      0, hy + 0.005, 0,
      0, hy + 0.034, 0,
      0, hy + 0.005, 0,
    ]),
    makeBoneTrack('Hips', rq.Hips, runTimes, [
      [0.06, 0.1, 0.03],
      [0.1, 0, 0],
      [0.06, -0.1, -0.03],
      [0.1, 0, 0],
      [0.06, 0.1, 0.03],
    ]),
    makeBoneTrack('Spine', rq.Spine, runTimes, [
      [0.08, -0.04, 0],
      [0.1, 0, 0],
      [0.08, 0.04, 0],
      [0.1, 0, 0],
      [0.08, -0.04, 0],
    ]),
    makeBoneTrack('Chest', rq.Chest, runTimes, [
      [0.14, -0.14, 0],
      [0.16, 0, 0],
      [0.14, 0.14, 0],
      [0.16, 0, 0],
      [0.14, -0.14, 0],
    ]),
    makeBoneTrack('Head', rq.Head, runTimes, [
      [-0.22, 0.05, 0],
      [-0.24, 0, 0],
      [-0.22, -0.05, 0],
      [-0.24, 0, 0],
      [-0.22, 0.05, 0],
    ]),
    makeBoneTrack('LeftUpLeg', rq.LeftUpLeg, runTimes, [
      [-0.92, 0, 0],
      [-0.1, 0, 0],
      [0.74, 0, 0],
      [0.15, 0, 0],
      [-0.92, 0, 0],
    ]),
    makeBoneTrack('LeftLeg', rq.LeftLeg, runTimes, [
      [0.28, 0, 0],
      [0.15, 0, 0],
      [0.85, 0, 0],
      [1.26, 0, 0],
      [0.28, 0, 0],
    ]),
    makeBoneTrack('LeftFoot', rq.LeftFoot, runTimes, [
      [0.24, 0, 0],
      [0.05, 0, 0],
      [0.32, 0, 0],
      [-0.18, 0, 0],
      [0.24, 0, 0],
    ]),
    makeBoneTrack('RightUpLeg', rq.RightUpLeg, runTimes, [
      [0.74, 0, 0],
      [0.15, 0, 0],
      [-0.92, 0, 0],
      [-0.1, 0, 0],
      [0.74, 0, 0],
    ]),
    makeBoneTrack('RightLeg', rq.RightLeg, runTimes, [
      [0.85, 0, 0],
      [1.26, 0, 0],
      [0.28, 0, 0],
      [0.15, 0, 0],
      [0.85, 0, 0],
    ]),
    makeBoneTrack('RightFoot', rq.RightFoot, runTimes, [
      [0.32, 0, 0],
      [-0.18, 0, 0],
      [0.24, 0, 0],
      [0.05, 0, 0],
      [0.32, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, runTimes, [
      [0.64, 0, 0.08],
      [-0.08, 0, 0.05],
      [-0.78, 0, 0.04],
      [-0.05, 0, 0.05],
      [0.64, 0, 0.08],
    ]),
    makeBoneTrack('LeftForeArm', rq.LeftForeArm, runTimes, [
      [-1.08, 0, 0],
      [-1.12, 0, 0],
      [-1.18, 0, 0],
      [-1.05, 0, 0],
      [-1.08, 0, 0],
    ]),
    makeBoneTrack('RightArm', rq.RightArm, runTimes, [
      [-0.78, 0, -0.04],
      [-0.05, 0, -0.05],
      [0.64, 0, -0.08],
      [-0.08, 0, -0.05],
      [-0.78, 0, -0.04],
    ]),
    makeBoneTrack('RightForeArm', rq.RightForeArm, runTimes, [
      [-1.18, 0, 0],
      [-1.05, 0, 0],
      [-1.08, 0, 0],
      [-1.12, 0, 0],
      [-1.18, 0, 0],
    ]),
  ]);

  // 4. BLV_Combat (1.4s athletic boxing / martial arts combo: guard -> jab -> cross -> hook -> guard)
  const combatTimes = [0, 0.25, 0.52, 0.84, 1.12, 1.4];
  const combatClip = new THREE.AnimationClip('BLV_Combat', 1.4, [
    new THREE.VectorKeyframeTrack('Hips.position', combatTimes, [
      0, hy - 0.018, 0,
      0, hy - 0.025, 0.02,
      0, hy - 0.028, 0.035,
      0, hy - 0.022, 0.015,
      0, hy - 0.014, 0,
      0, hy - 0.018, 0,
    ]),
    makeBoneTrack('Hips', rq.Hips, combatTimes, [
      [0.04, 0.32, 0],
      [0.06, 0.14, 0],
      [0.08, 0.42, 0],
      [0.04, -0.18, 0],
      [0.02, 0.24, 0],
      [0.04, 0.32, 0],
    ]),
    makeBoneTrack('Chest', rq.Chest, combatTimes, [
      [0.12, 0.18, 0],
      [0.16, -0.34, -0.04],
      [0.18, 0.48, 0.06],
      [0.14, -0.42, 0.1],
      [0.1, 0.12, 0],
      [0.12, 0.18, 0],
    ]),
    makeBoneTrack('Head', rq.Head, combatTimes, [
      [-0.1, -0.44, 0],
      [-0.12, 0.16, 0],
      [-0.14, -0.58, 0],
      [-0.1, 0.45, -0.04],
      [-0.08, -0.32, 0],
      [-0.1, -0.44, 0],
    ]),
    makeBoneTrack('LeftUpLeg', rq.LeftUpLeg, combatTimes, [
      [-0.36, 0.1, 0.06],
      [-0.44, 0.1, 0.06],
      [-0.48, 0.1, 0.06],
      [-0.38, 0.1, 0.06],
      [-0.32, 0.1, 0.06],
      [-0.36, 0.1, 0.06],
    ]),
    makeBoneTrack('LeftLeg', rq.LeftLeg, combatTimes, [
      [0.42, 0, 0],
      [0.52, 0, 0],
      [0.56, 0, 0],
      [0.44, 0, 0],
      [0.36, 0, 0],
      [0.42, 0, 0],
    ]),
    makeBoneTrack('RightUpLeg', rq.RightUpLeg, combatTimes, [
      [0.24, -0.15, -0.06],
      [0.32, -0.15, -0.06],
      [0.36, -0.15, -0.06],
      [0.22, -0.15, -0.06],
      [0.2, -0.15, -0.06],
      [0.24, -0.15, -0.06],
    ]),
    makeBoneTrack('RightLeg', rq.RightLeg, combatTimes, [
      [0.3, 0, 0],
      [0.36, 0, 0],
      [0.32, 0, 0],
      [0.34, 0, 0],
      [0.28, 0, 0],
      [0.3, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, combatTimes, [
      [-0.82, 0.1, -0.22],
      [-1.48, 0, -0.34],
      [-0.92, 0.12, -0.26],
      [-1.26, -0.38, 0.25],
      [-0.86, 0.1, -0.22],
      [-0.82, 0.1, -0.22],
    ]),
    makeBoneTrack('LeftForeArm', rq.LeftForeArm, combatTimes, [
      [-1.22, 0, 0],
      [-0.12, 0, 0],
      [-1.28, 0, 0],
      [-1.08, 0.2, 0.3],
      [-1.2, 0, 0],
      [-1.22, 0, 0],
    ]),
    makeBoneTrack('RightArm', rq.RightArm, combatTimes, [
      [-0.88, -0.1, 0.24],
      [-0.94, -0.12, 0.28],
      [-1.52, 0, 0.36],
      [-0.92, -0.1, 0.28],
      [-0.86, -0.1, 0.24],
      [-0.88, -0.1, 0.24],
    ]),
    makeBoneTrack('RightForeArm', rq.RightForeArm, combatTimes, [
      [-1.26, 0, 0],
      [-1.3, 0, 0],
      [-0.1, 0, 0],
      [-1.28, 0, 0],
      [-1.24, 0, 0],
      [-1.26, 0, 0],
    ]),
  ]);

  // 5. BLV_Talk (2.2s expressive Abidjan two-handed conversation / discussion)
  const talkTimes = [0, 0.45, 0.95, 1.45, 1.85, 2.2];
  const talkClip = new THREE.AnimationClip('BLV_Talk', 2.2, [
    makeBoneTrack('Hips', rq.Hips, talkTimes, [
      [0, 0, 0],
      [0, 0.05, 0.02],
      [0, -0.04, -0.02],
      [0, 0.04, 0.015],
      [0, -0.02, 0],
      [0, 0, 0],
    ]),
    makeBoneTrack('Chest', rq.Chest, talkTimes, [
      [0, 0, 0],
      [0.04, 0.09, -0.02],
      [0.06, -0.08, 0.02],
      [0.05, 0.07, 0],
      [0.02, -0.04, 0],
      [0, 0, 0],
    ]),
    makeBoneTrack('Head', rq.Head, talkTimes, [
      [0, 0, 0],
      [-0.08, 0.14, 0.05],
      [0.06, -0.14, -0.05],
      [-0.06, 0.08, 0.04],
      [0.05, -0.05, -0.02],
      [0, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, talkTimes, [
      [0, 0, -0.02],
      [-0.36, 0.08, 0.28],
      [-0.68, -0.05, 0.18],
      [-0.54, 0.04, 0.42],
      [-0.24, 0, 0.14],
      [0, 0, -0.02],
    ]),
    makeBoneTrack('LeftForeArm', rq.LeftForeArm, talkTimes, [
      [0, 0, 0],
      [-0.72, 0.15, 0.25],
      [-0.98, 0.28, 0.35],
      [-0.84, 0.18, 0.28],
      [-0.42, 0.08, 0.12],
      [0, 0, 0],
    ]),
    makeBoneTrack('RightArm', rq.RightArm, talkTimes, [
      [0, 0, 0.02],
      [-0.64, 0.06, -0.22],
      [-0.34, -0.08, -0.28],
      [-0.56, 0.05, -0.38],
      [-0.28, 0, -0.15],
      [0, 0, 0.02],
    ]),
    makeBoneTrack('RightForeArm', rq.RightForeArm, talkTimes, [
      [0, 0, 0],
      [-0.95, -0.22, -0.32],
      [-0.68, -0.14, -0.22],
      [-0.86, -0.2, -0.28],
      [-0.45, -0.1, -0.12],
      [0, 0, 0],
    ]),
  ]);

  return [idleClip, walkClip, runClip, combatClip, talkClip];
}

