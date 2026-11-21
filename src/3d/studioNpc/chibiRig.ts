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
        if (y >= hipY - 0.01) {
          setWeights(i, 'Hips', 0.55, 'LeftUpLeg', 0.45);
        } else if (y > kneeY) {
          const t = THREE.MathUtils.clamp((hipY - y) / Math.max(0.03, hipY - kneeY), 0, 1);
          setWeights(i, 'LeftUpLeg', 1 - t * 0.3, 'LeftLeg', t * 0.3);
        } else if (y > ankleY) {
          const t = THREE.MathUtils.clamp((kneeY - y) / Math.max(0.03, kneeY - ankleY), 0, 1);
          setWeights(i, 'LeftLeg', 1 - t * 0.3, 'LeftFoot', t * 0.3);
        } else {
          setWeights(i, 'LeftFoot', 1);
        }
        break;
      }
      case 'rightLeg': {
        const hipY = j.rightUpLeg.y;
        const kneeY = j.rightLeg.y;
        const ankleY = j.rightFoot.y;
        if (y >= hipY - 0.01) {
          setWeights(i, 'Hips', 0.55, 'RightUpLeg', 0.45);
        } else if (y > kneeY) {
          const t = THREE.MathUtils.clamp((hipY - y) / Math.max(0.03, hipY - kneeY), 0, 1);
          setWeights(i, 'RightUpLeg', 1 - t * 0.3, 'RightLeg', t * 0.3);
        } else if (y > ankleY) {
          const t = THREE.MathUtils.clamp((kneeY - y) / Math.max(0.03, kneeY - ankleY), 0, 1);
          setWeights(i, 'RightLeg', 1 - t * 0.3, 'RightFoot', t * 0.3);
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

const _deltaQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

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

/**
 * Generates shared procedural animations (Idle, Walk, Talk) compatible with all 6 chibi rigs.
 */
export function createChibiAnimations(rig: ChibiRig): THREE.AnimationClip[] {
  const rq = rig.restQuaternions;

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

  // 3. BLV_Talk (1.6s friendly Abidjan greeting / gesture)
  const talkTimes = [0, 0.4, 0.8, 1.2, 1.6];
  const talkClip = new THREE.AnimationClip('BLV_Talk', 1.6, [
    makeBoneTrack('Head', rq.Head, talkTimes, [
      [0, 0, 0],
      [-0.06, 0.1, 0.04],
      [0.04, -0.08, -0.03],
      [-0.04, 0.06, 0.03],
      [0, 0, 0],
    ]),
    makeBoneTrack('LeftArm', rq.LeftArm, talkTimes, [
      [0, 0, 0],
      [-0.25, 0.15, 0.72],
      [-0.35, 0.2, 0.92],
      [-0.22, 0.15, 0.65],
      [0, 0, 0],
    ]),
    makeBoneTrack('LeftForeArm', rq.LeftForeArm, talkTimes, [
      [0, 0, 0],
      [-0.2, 0.35, 0.4],
      [-0.28, 0.5, 0.6],
      [-0.18, 0.3, 0.35],
      [0, 0, 0],
    ]),
    makeBoneTrack('Chest', rq.Chest, talkTimes, [
      [0, 0, 0],
      [0, 0.05, 0],
      [-0.03, -0.04, 0],
      [0, 0.04, 0],
      [0, 0, 0],
    ]),
  ]);

  return [idleClip, walkClip, talkClip];
}
