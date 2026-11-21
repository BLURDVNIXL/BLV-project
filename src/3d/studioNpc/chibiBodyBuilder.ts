// BLV : copie du studio PNJ (BLV — Babi Life Vibes Asset Studio), utilisée par studioActorBuilder.ts. Ne pas modifier sans le studio.
import * as THREE from 'three';
import type { BodySpec } from './blvCatalog';
import { ChibiRig, createSkinnedPart, SkinZone } from './chibiRig';

/**
 * Builds a low-poly lofted cylinder/torso profile between Y=hipsY and Y=neckY
 * with distinct width/depth rings so Male, Female, Child, Teen, Elderly, Corpulent
 * have unmistakable chibi silhouettes.
 */
export function createSculptedTorsoGeometry(
  spec: BodySpec,
  rig: ChibiRig,
  inflation = 0
): THREE.BufferGeometry {
  const j = rig.joints;
  const radialSegments = 12;
  const rings = 5;

  // Profile rows from hipsY to neckY
  const profile: { t: number; rx: number; rz: number; zOffset: number }[] = [
    {
      t: 0.0,
      rx: spec.torsoHipWidth + inflation,
      rz: spec.torsoDepth * 1.02 + inflation,
      zOffset: 0,
    },
    {
      t: 0.35,
      rx: spec.torsoWaistWidth + inflation + spec.bellyBulge * 0.45,
      rz: spec.torsoDepth * 0.96 + inflation + spec.bellyBulge,
      zOffset: spec.bellyBulge * 0.35 + j.chestZ * 0.25,
    },
    {
      t: 0.68,
      rx: THREE.MathUtils.lerp(spec.torsoWaistWidth, spec.torsoTopWidth, 0.72) + inflation,
      rz: spec.torsoDepth * 1.02 + inflation + spec.bellyBulge * 0.35,
      zOffset: j.chestZ * 0.68,
    },
    {
      t: 0.9,
      rx: spec.torsoTopWidth + inflation,
      rz: spec.torsoDepth * 0.94 + inflation,
      zOffset: j.chestZ * 0.95,
    },
    {
      t: 1.0,
      rx: spec.torsoTopWidth * 0.56 + inflation * 0.5,
      rz: spec.torsoDepth * 0.65 + inflation * 0.5,
      zOffset: j.headZ * 0.85,
    },
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings; r++) {
    const p = profile[r];
    const y = THREE.MathUtils.lerp(j.hipsY - 0.015, j.neckY + 0.005, p.t);
    for (let s = 0; s <= radialSegments; s++) {
      const u = s / radialSegments;
      const theta = u * Math.PI * 2;
      const x = Math.sin(theta) * p.rx;
      const z = Math.cos(theta) * p.rz + p.zOffset;
      positions.push(x, y, z);
      uvs.push(u, p.t);
    }
  }

  const stride = radialSegments + 1;
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < radialSegments; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  // Bottom cap center
  const botCenterIdx = positions.length / 3;
  positions.push(0, j.hipsY - 0.025, 0);
  uvs.push(0.5, 0);
  for (let s = 0; s < radialSegments; s++) {
    indices.push(botCenterIdx, s + 1, s);
  }

  // Top cap center
  const topStart = (rings - 1) * stride;
  const topCenterIdx = positions.length / 3;
  positions.push(0, j.neckY + 0.01, j.headZ * 0.85);
  uvs.push(0.5, 1);
  for (let s = 0; s < radialSegments; s++) {
    indices.push(topCenterIdx, topStart + s, topStart + s + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a tapered low-poly limb segment aligned cleanly from start -> end.
 */
export function createLimbSegmentGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radiusStart: number,
  radiusEnd: number,
  radialSegments = 8
): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radiusEnd, radiusStart, len, radialSegments, 2);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  const mat = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(mat);
  return geo;
}

/**
 * Builds the oversized, expressive chibi head (10+ sub-parts: sculpted cranium, ears, eyes, irises,
 * catchlights, brows, cute nose, friendly mouth).
 */
function buildChibiHeadParts(
  spec: BodySpec,
  rig: ChibiRig,
  skinMat: THREE.Material
): THREE.SkinnedMesh[] {
  const meshes: THREE.SkinnedMesh[] = [];
  const j = rig.joints;
  const R = spec.headRadius;
  const hc = new THREE.Vector3(0, j.headCenterY, j.headZ);

  // 1. Cranium: low-poly sculpted sphere with fuller chibi cheeks and soft chin
  const headGeo = new THREE.SphereGeometry(R, 14, 10);
  const pos = headGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Chibi cheek fullness below equator, softer chin
    if (y < 0) {
      const ny = -y / R;
      const cheekFactor = 1.0 + Math.sin(ny * Math.PI) * 0.08;
      x *= cheekFactor;
      z *= 0.96 + Math.sin(ny * Math.PI) * 0.06;
      y *= 0.92;
    }
    // Slight front-to-back rounding
    z *= 0.95;
    x *= spec.headScaleX;
    y *= spec.headScaleY;

    pos.setXYZ(i, x + hc.x, y + hc.y, z + hc.z);
  }
  headGeo.computeVertexNormals();
  meshes.push(createSkinnedPart(headGeo, skinMat, 'head', rig, 'Chibi_Head'));

  // 2. Ears (left + right)
  const earGeoL = new THREE.SphereGeometry(R * 0.17, 7, 6);
  earGeoL.scale(0.55, 1.05, 0.75);
  earGeoL.translate(hc.x + R * spec.headScaleX * 0.96, hc.y - R * 0.05, hc.z - R * 0.04);
  meshes.push(createSkinnedPart(earGeoL, skinMat, 'head', rig, 'Chibi_Ear_L'));

  const earGeoR = new THREE.SphereGeometry(R * 0.17, 7, 6);
  earGeoR.scale(0.55, 1.05, 0.75);
  earGeoR.translate(hc.x - R * spec.headScaleX * 0.96, hc.y - R * 0.05, hc.z - R * 0.04);
  meshes.push(createSkinnedPart(earGeoR, skinMat, 'head', rig, 'Chibi_Ear_R'));

  // 3. Cute compact chibi nose
  const noseGeo = new THREE.SphereGeometry(R * 0.085, 7, 6);
  noseGeo.scale(1.1, 0.85, 0.9);
  noseGeo.translate(hc.x, hc.y - R * 0.12, hc.z + R * 0.94);
  meshes.push(createSkinnedPart(noseGeo, skinMat, 'head', rig, 'Chibi_Nose'));

  // Shared facial feature materials
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.0,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x23140e,
    roughness: 0.2,
    metalness: 0.05,
  });
  const catchlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 0.25,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: spec.id === 'BODY_ELDERLY' ? 0x9ca3af : 0x1c1917,
    roughness: 0.75,
  });
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x3b1f16,
    roughness: 0.65,
  });

  const eyeX = R * 0.38;
  const eyeY = hc.y - R * 0.02;
  const eyeZ = hc.z + R * 0.84;

  for (const side of [-1, 1] as const) {
    const sx = hc.x + side * eyeX;
    // Sclera disc
    const scleraGeo = new THREE.SphereGeometry(R * 0.145, 8, 7);
    scleraGeo.scale(0.95, 1.15, 0.42);
    scleraGeo.rotateY(side * 0.18);
    scleraGeo.translate(sx, eyeY, eyeZ);
    meshes.push(createSkinnedPart(scleraGeo, scleraMat, 'head', rig, `Chibi_Sclera_${side > 0 ? 'L' : 'R'}`));

    // Dark iris
    const irisGeo = new THREE.SphereGeometry(R * 0.105, 8, 7);
    irisGeo.scale(0.92, 1.12, 0.45);
    irisGeo.rotateY(side * 0.18);
    irisGeo.translate(sx + side * 0.002, eyeY - R * 0.01, eyeZ + R * 0.032);
    meshes.push(createSkinnedPart(irisGeo, irisMat, 'head', rig, `Chibi_Iris_${side > 0 ? 'L' : 'R'}`));

    // Specular catchlight dot
    const catchGeo = new THREE.SphereGeometry(R * 0.036, 6, 5);
    catchGeo.translate(sx - side * R * 0.032, eyeY + R * 0.045, eyeZ + R * 0.068);
    meshes.push(createSkinnedPart(catchGeo, catchlightMat, 'head', rig, `Chibi_Catchlight_${side > 0 ? 'L' : 'R'}`));

    // Stylized eyebrow arch
    const browGeo = new THREE.BoxGeometry(R * 0.24, R * 0.042, R * 0.045);
    browGeo.rotateZ(side * -0.08);
    browGeo.rotateY(side * 0.18);
    browGeo.translate(sx, eyeY + R * 0.22, eyeZ + R * 0.015);
    meshes.push(createSkinnedPart(browGeo, browMat, 'head', rig, `Chibi_Brow_${side > 0 ? 'L' : 'R'}`));
  }

  // Friendly low-poly smile curve
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(hc.x - R * 0.15, hc.y - R * 0.29, hc.z + R * 0.87),
    new THREE.Vector3(hc.x, hc.y - R * 0.34, hc.z + R * 0.91),
    new THREE.Vector3(hc.x + R * 0.15, hc.y - R * 0.29, hc.z + R * 0.87),
  ]);
  const mouthGeo = new THREE.TubeGeometry(smileCurve, 6, R * 0.022, 5, false);
  meshes.push(createSkinnedPart(mouthGeo, mouthMat, 'head', rig, 'Chibi_Mouth'));

  return meshes;
}

export interface BuiltChibiBody {
  group: THREE.Group;
  rig: ChibiRig;
  skinMaterial: THREE.MeshStandardMaterial;
  bareFeetMeshes: THREE.SkinnedMesh[];
}

/**
 * Builds one of the 6 distinct BLV Chibi Low-Poly Base Bodies with shared 20-bone skeleton,
 * grounded feet at Y = 0, and modular visibility hooks (e.g. hide bare feet when shoes equipped).
 */
export function buildChibiBaseBody(
  spec: BodySpec,
  skinHex: string,
  rig: ChibiRig
): BuiltChibiBody {
  const group = new THREE.Group();
  group.name = spec.id;
  group.add(rig.rootBone);

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skinHex),
    roughness: 0.7,
    metalness: 0.02,
  });

  const j = rig.joints;

  // 1. Head + Facial Details
  const headParts = buildChibiHeadParts(spec, rig, skinMaterial);
  headParts.forEach((m) => group.add(m));

  // 2. Neck
  const neckGeo = new THREE.CylinderGeometry(
    spec.torsoTopWidth * 0.32,
    spec.torsoTopWidth * 0.38,
    spec.neckLength + 0.035,
    8
  );
  neckGeo.translate(0, j.neckY + spec.neckLength * 0.45, j.headZ * 0.92);
  group.add(createSkinnedPart(neckGeo, skinMaterial, 'neck', rig, 'Chibi_Neck'));

  // 3. Sculpted Torso
  const torsoGeo = createSculptedTorsoGeometry(spec, rig, 0);
  group.add(createSkinnedPart(torsoGeo, skinMaterial, 'torso', rig, 'Chibi_Torso'));

  // 4. Arms & Chibi Mitten Hands
  const buildArm = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const shoulder = isLeft ? j.leftArm : j.rightArm;
    const elbow = isLeft ? j.leftForeArm : j.rightForeArm;
    const hand = isLeft ? j.leftHand : j.rightHand;
    const zone: SkinZone = isLeft ? 'leftArm' : 'rightArm';

    // Shoulder cap
    const shCap = new THREE.SphereGeometry(spec.armRadius * 1.05, 8, 6);
    shCap.translate(shoulder.x, shoulder.y, shoulder.z);
    group.add(createSkinnedPart(shCap, skinMaterial, zone, rig, `Chibi_Shoulder_${side}`));

    // Upper Arm
    const upperGeo = createLimbSegmentGeometry(
      shoulder,
      elbow,
      spec.armRadius * 1.02,
      spec.armRadius * 0.88,
      8
    );
    group.add(createSkinnedPart(upperGeo, skinMaterial, zone, rig, `Chibi_UpperArm_${side}`));

    // Forearm
    const foreGeo = createLimbSegmentGeometry(
      elbow,
      hand,
      spec.armRadius * 0.88,
      spec.armRadius * 0.74,
      8
    );
    group.add(createSkinnedPart(foreGeo, skinMaterial, zone, rig, `Chibi_ForeArm_${side}`));

    // Cute compact chibi hand
    const handZone: SkinZone = isLeft ? 'leftHand' : 'rightHand';
    const handGeo = new THREE.SphereGeometry(spec.armRadius * 1.05, 8, 6);
    handGeo.scale(1.12, 0.92, 0.88);
    handGeo.translate(hand.x + (isLeft ? 0.015 : -0.015), hand.y - 0.01, hand.z);
    group.add(createSkinnedPart(handGeo, skinMaterial, handZone, rig, `Chibi_Hand_${side}`));
  };
  buildArm('left');
  buildArm('right');

  // 5. Legs & Bare Feet (grounded cleanly at Y = 0)
  const bareFeetMeshes: THREE.SkinnedMesh[] = [];
  const buildLeg = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const hip = isLeft ? j.leftUpLeg : j.rightUpLeg;
    const knee = isLeft ? j.leftLeg : j.rightLeg;
    const ankle = isLeft ? j.leftFoot : j.rightFoot;
    const zone: SkinZone = isLeft ? 'leftLeg' : 'rightLeg';
    const footZone: SkinZone = isLeft ? 'leftFoot' : 'rightFoot';

    const thighGeo = createLimbSegmentGeometry(
      hip,
      knee,
      spec.legRadius * 1.06,
      spec.legRadius * 0.88,
      8
    );
    group.add(createSkinnedPart(thighGeo, skinMaterial, zone, rig, `Chibi_Thigh_${side}`));

    const shinGeo = createLimbSegmentGeometry(
      knee,
      ankle,
      spec.legRadius * 0.88,
      spec.legRadius * 0.74,
      8
    );
    group.add(createSkinnedPart(shinGeo, skinMaterial, zone, rig, `Chibi_Shin_${side}`));

    // Bare foot sitting flush at Y = 0
    const footGeo = new THREE.BoxGeometry(
      spec.legRadius * 1.55,
      spec.footHeight,
      spec.footLength
    );
    footGeo.translate(
      ankle.x,
      spec.footHeight * 0.5,
      spec.footLength * 0.24
    );
    const footMesh = createSkinnedPart(footGeo, skinMaterial, footZone, rig, `Chibi_BareFoot_${side}`);
    bareFeetMeshes.push(footMesh);
    group.add(footMesh);
  };
  buildLeg('left');
  buildLeg('right');

  return {
    group,
    rig,
    skinMaterial,
    bareFeetMeshes,
  };
}
