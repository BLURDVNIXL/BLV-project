// BLV : copie du studio PNJ (BLV — Babi Life Vibes Asset Studio), utilisée par studioActorBuilder.ts. Ne pas modifier sans le studio.
import * as THREE from 'three';
import {
  ACCESSORIES,
  BodySpec,
  CharacterLoadout,
  GARMENTS,
  HAIRSTYLES,
  PatternId,
  SHOES,
} from './blvCatalog';
import { createLimbSegmentGeometry } from './chibiBodyBuilder';
import { ChibiRig, createSkinnedPart, SkinZone } from './chibiRig';
import { getPatternTexture } from './chibiTextures';

function makeFabricMaterial(
  primaryHex: string,
  secondaryHex: string,
  pattern: PatternId,
  roughness = 0.82
): THREE.MeshStandardMaterial {
  if (pattern === 'solid') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryHex),
      roughness,
      metalness: 0.02,
    });
  }
  const tex = getPatternTexture(pattern, primaryHex, secondaryHex, 4);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    roughness,
    metalness: 0.02,
  });
  // BLV : la fusion en un seul mesh (studioActorBuilder) aplatit le motif en sa couleur principale.
  mat.userData.flatColor = primaryHex;
  return mat;
}

function sampleTorsoProfile(
  spec: BodySpec,
  rig: ChibiRig,
  t: number
): { rx: number; rz: number; zOffset: number } {
  const j = rig.joints;
  const stops = [
    {
      t: 0.0,
      rx: spec.torsoHipWidth,
      rz: spec.torsoDepth * 1.02,
      zOffset: 0,
    },
    {
      t: 0.35,
      rx: spec.torsoWaistWidth + spec.bellyBulge * 0.45,
      rz: spec.torsoDepth * 0.96 + spec.bellyBulge,
      zOffset: spec.bellyBulge * 0.35 + j.chestZ * 0.25,
    },
    {
      t: 0.68,
      rx: THREE.MathUtils.lerp(spec.torsoWaistWidth, spec.torsoTopWidth, 0.72),
      rz: spec.torsoDepth * 1.02 + spec.bellyBulge * 0.35,
      zOffset: j.chestZ * 0.68,
    },
    {
      t: 0.9,
      rx: spec.torsoTopWidth,
      rz: spec.torsoDepth * 0.94,
      zOffset: j.chestZ * 0.95,
    },
    {
      t: 1.0,
      rx: spec.torsoTopWidth * 0.56,
      rz: spec.torsoDepth * 0.65,
      zOffset: j.headZ * 0.85,
    },
  ];

  if (t <= stops[0].t) return stops[0];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return {
        rx: THREE.MathUtils.lerp(a.rx, b.rx, k),
        rz: THREE.MathUtils.lerp(a.rz, b.rz, k),
        zOffset: THREE.MathUtils.lerp(a.zOffset, b.zOffset, k),
      };
    }
  }
  return stops[stops.length - 1];
}

function createPartialTorsoShell(
  spec: BodySpec,
  rig: ChibiRig,
  tMin: number,
  tMax: number,
  inflation: number,
  boxyFactor = 0,
  flareBottom = 0
): THREE.BufferGeometry {
  const j = rig.joints;
  const radialSegments = 12;

  // Include exact body profile breakpoints inside [tMin, tMax] so garment never cuts chords inside shoulders
  const rawTs = [tMin, 0.35, 0.68, 0.9, tMax]
    .filter((v) => v >= tMin - 1e-4 && v <= tMax + 1e-4)
    .map((v) => THREE.MathUtils.clamp(v, tMin, tMax))
    .sort((a, b) => a - b);

  const ringTs: number[] = [];
  for (const t of rawTs) {
    if (ringTs.length === 0 || t - ringTs[ringTs.length - 1] > 0.03) {
      ringTs.push(t);
    }
  }
  if (ringTs[ringTs.length - 1] < tMax - 0.01) {
    ringTs.push(tMax);
  }
  if (ringTs.length < 3) {
    ringTs.splice(1, 0, (tMin + tMax) * 0.5);
  }

  const rings = ringTs.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings; r++) {
    const t = ringTs[r];
    const localT = (t - tMin) / Math.max(0.001, tMax - tMin);
    const y = THREE.MathUtils.lerp(j.hipsY - 0.015, j.neckY + 0.005, t);

    const sampled = sampleTorsoProfile(spec, rig, t);
    let rx = sampled.rx;
    let rz = sampled.rz;
    const zOffset = sampled.zOffset;

    if (boxyFactor > 0) {
      rx = THREE.MathUtils.lerp(rx, Math.max(spec.torsoTopWidth, spec.torsoHipWidth) + 0.018, boxyFactor);
      rz += boxyFactor * 0.015;
    }
    if (flareBottom > 0 && localT < 0.4) {
      const fk = 1 - localT / 0.4;
      rx += flareBottom * fk;
      rz += flareBottom * fk * 0.85;
    }

    rx += inflation;
    rz += inflation;

    for (let s = 0; s <= radialSegments; s++) {
      const u = s / radialSegments;
      const theta = u * Math.PI * 2;
      positions.push(Math.sin(theta) * rx, y, Math.cos(theta) * rz + zOffset);
      uvs.push(u, localT);
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

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createSkirtShell(
  spec: BodySpec,
  rig: ChibiRig,
  lengthRatio: number, // 0.45 = mini, 0.92 = long
  flare: number,
  bodycon = false
): THREE.BufferGeometry {
  const j = rig.joints;
  const topY = j.hipsY + spec.torsoHeight * 0.24;
  const botY = Math.max(j.leftFoot.y + 0.03, j.hipsY - spec.legLength * lengthRatio);
  const radialSegments = 14;
  const rings = 4;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const topRx = spec.torsoWaistWidth + 0.014;
  const topRz = spec.torsoDepth + 0.014;
  const midRx = spec.torsoHipWidth + 0.022 + (bodycon ? 0 : flare * 0.35);
  const midRz = spec.torsoDepth * 1.1 + 0.02 + (bodycon ? 0 : flare * 0.25);
  const botRx = bodycon ? spec.torsoHipWidth * 0.92 + 0.018 : spec.torsoHipWidth + 0.032 + flare;
  const botRz = bodycon ? spec.torsoDepth * 0.98 + 0.018 : spec.torsoDepth * 1.12 + 0.028 + flare * 0.8;

  for (let r = 0; r < rings; r++) {
    const t = r / (rings - 1);
    const y = THREE.MathUtils.lerp(botY, topY, t);
    let rx: number;
    let rz: number;
    if (t > 0.65) {
      const k = (t - 0.65) / 0.35;
      rx = THREE.MathUtils.lerp(midRx, topRx, k);
      rz = THREE.MathUtils.lerp(midRz, topRz, k);
    } else {
      const k = t / 0.65;
      rx = THREE.MathUtils.lerp(botRx, midRx, k);
      rz = THREE.MathUtils.lerp(botRz, midRz, k);
    }

    for (let s = 0; s <= radialSegments; s++) {
      const u = s / radialSegments;
      const theta = u * Math.PI * 2;
      // Subtle pleat ripple on flared skirts
      const pleat = !bodycon && flare > 0.02 ? Math.sin(theta * 7) * 0.004 * (1 - t) : 0;
      positions.push(Math.sin(theta) * (rx + pleat), y, Math.cos(theta) * (rz + pleat));
      uvs.push(u, t);
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

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addSleeves(
  target: THREE.Group,
  spec: BodySpec,
  rig: ChibiRig,
  mat: THREE.Material,
  sleeveType: 'short' | 'long' | 'oversize' | 'none',
  cuffMat?: THREE.Material
) {
  if (sleeveType === 'none') return;
  const j = rig.joints;

  for (const side of ['left', 'right'] as const) {
    const isLeft = side === 'left';
    const sh = isLeft ? j.leftArm : j.rightArm;
    const el = isLeft ? j.leftForeArm : j.rightForeArm;
    const ha = isLeft ? j.leftHand : j.rightHand;
    const zone: SkinZone = isLeft ? 'leftArm' : 'rightArm';

    const inflate = sleeveType === 'oversize' ? 0.019 : 0.013;
    const shCapRadius = spec.armRadius + inflate * 1.25;
    const shCapGeo = new THREE.SphereGeometry(shCapRadius, 8, 6);
    shCapGeo.translate(sh.x, sh.y, sh.z);
    target.add(createSkinnedPart(shCapGeo, mat, zone, rig, `SleeveCap_${side}`));

    if (sleeveType === 'short' || sleeveType === 'oversize') {
      const endPt = new THREE.Vector3().lerpVectors(
        sh,
        el,
        sleeveType === 'oversize' ? 1.05 : 0.76
      );
      const sleeveGeo = createLimbSegmentGeometry(
        sh.clone().lerp(el, -0.2),
        endPt,
        spec.armRadius + inflate * 1.25,
        spec.armRadius + inflate * 1.3,
        8
      );
      target.add(createSkinnedPart(sleeveGeo, mat, zone, rig, `Sleeve_${side}`));
    } else {
      const upperGeo = createLimbSegmentGeometry(
        sh.clone().lerp(el, -0.18),
        el,
        spec.armRadius + 0.014,
        spec.armRadius + 0.011,
        8
      );
      target.add(createSkinnedPart(upperGeo, mat, zone, rig, `SleeveUpper_${side}`));

      const wristEnd = new THREE.Vector3().lerpVectors(el, ha, 0.88);
      const foreGeo = createLimbSegmentGeometry(
        el,
        wristEnd,
        spec.armRadius + 0.011,
        spec.armRadius + 0.009,
        8
      );
      target.add(createSkinnedPart(foreGeo, mat, zone, rig, `SleeveFore_${side}`));

      if (cuffMat) {
        const cuffStart = new THREE.Vector3().lerpVectors(el, ha, 0.78);
        const cuffGeo = createLimbSegmentGeometry(
          cuffStart,
          wristEnd,
          spec.armRadius + 0.012,
          spec.armRadius + 0.012,
          8
        );
        target.add(createSkinnedPart(cuffGeo, cuffMat, zone, rig, `SleeveCuff_${side}`));
      }
    }
  }
}

function addTopGarment(
  target: THREE.Group,
  silhouette: string,
  spec: BodySpec,
  rig: ChibiRig,
  primaryHex: string,
  secondaryHex: string,
  pattern: PatternId
) {
  const j = rig.joints;
  const mainMat = makeFabricMaterial(primaryHex, secondaryHex, pattern, 0.82);
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondaryHex),
    roughness: 0.75,
    metalness: 0.04,
  });

  const isCrop = silhouette === 'crop_top';
  const isOversize = silhouette === 'oversize';
  const isOpen =
    silhouette === 'shirt_open' ||
    silhouette === 'jacket' ||
    silhouette === 'jacket_denim' ||
    silhouette === 'blazer' ||
    silhouette === 'bomber' ||
    silhouette === 'u_pro';
  const isLongSleeve =
    silhouette === 'shirt_long' ||
    silhouette === 'sweat' ||
    silhouette === 'jacket' ||
    silhouette === 'jacket_denim' ||
    silhouette === 'blazer' ||
    silhouette === 'bomber' ||
    silhouette === 'u_pro';

  if (isOpen) {
    // Inner tee/shirt
    const innerGeo = createPartialTorsoShell(spec, rig, 0.04, 0.985, 0.011, 0);
    target.add(createSkinnedPart(innerGeo, trimMat, 'torso', rig, 'Top_InnerTee'));

    // Outer jacket/open-shirt wrap
    const outerBoxy = silhouette === 'blazer' ? 0.18 : 0.25;
    const outerGeo = createPartialTorsoShell(spec, rig, 0.02, 0.985, 0.022, outerBoxy);
    target.add(createSkinnedPart(outerGeo, mainMat, 'torso', rig, 'Top_OuterShell'));

    // Front inner visible placket strip flush with torso
    const midSample = sampleTorsoProfile(spec, rig, 0.55);
    const placketZ = midSample.rz + midSample.zOffset + 0.024;
    const placketGeo = new THREE.BoxGeometry(
      spec.torsoTopWidth * 0.34,
      spec.torsoHeight * 0.72,
      0.012
    );
    placketGeo.translate(0, j.hipsY + spec.torsoHeight * 0.48, placketZ);
    target.add(createSkinnedPart(placketGeo, trimMat, 'torso', rig, 'Top_OpenFront'));

    if (silhouette === 'blazer' || silhouette === 'u_pro') {
      const chestSample = sampleTorsoProfile(spec, rig, 0.7);
      const lapelZ = chestSample.rz + chestSample.zOffset + 0.028;
      for (const side of [-1, 1] as const) {
        const lapel = new THREE.BoxGeometry(spec.torsoTopWidth * 0.2, spec.torsoHeight * 0.42, 0.012);
        lapel.rotateZ(side * 0.2);
        lapel.translate(side * spec.torsoTopWidth * 0.25, j.chestY + 0.01, lapelZ);
        target.add(createSkinnedPart(lapel, mainMat, 'torso', rig, `Top_Lapel_${side > 0 ? 'L' : 'R'}`));
      }
    }

    if (silhouette === 'jacket_denim') {
      const chestSample = sampleTorsoProfile(spec, rig, 0.68);
      const pocketZ = chestSample.rz + chestSample.zOffset + 0.028;
      for (const side of [-1, 1] as const) {
        const pocket = new THREE.BoxGeometry(spec.torsoTopWidth * 0.24, spec.torsoHeight * 0.16, 0.01);
        pocket.translate(side * spec.torsoTopWidth * 0.38, j.chestY + 0.01, pocketZ);
        target.add(createSkinnedPart(pocket, trimMat, 'torso', rig, `Top_DenimPocket_${side > 0 ? 'L' : 'R'}`));
      }
    }

    // Collar / Lapels
    const collarGeo = new THREE.TorusGeometry(spec.torsoTopWidth * 0.42, 0.016, 6, 10);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, j.neckY - 0.003, j.headZ * 0.85);
    target.add(
      createSkinnedPart(
        collarGeo,
        silhouette === 'jacket_denim' ? trimMat : mainMat,
        'torso',
        rig,
        'Top_Collar'
      )
    );

    addSleeves(
      target,
      spec,
      rig,
      mainMat,
      isLongSleeve ? 'long' : 'short',
      silhouette === 'bomber' || silhouette === 'jacket_denim' ? trimMat : undefined
    );
    return;
  }

  const tMin = isCrop ? 0.36 : 0.03;
  const inflation = isOversize ? 0.024 : silhouette === 'sweat' ? 0.02 : 0.016;
  const boxy = isOversize ? 0.55 : silhouette === 'blouse' ? 0.15 : 0;
  const flare = silhouette === 'blouse' ? 0.018 : 0;

  const torsoGeo = createPartialTorsoShell(spec, rig, tMin, 0.985, inflation, boxy, flare);
  target.add(createSkinnedPart(torsoGeo, mainMat, 'torso', rig, 'Top_Body'));

  // Collar / Neckline trim
  if (
    silhouette === 'polo' ||
    silhouette === 'shirt_short' ||
    silhouette === 'shirt_long' ||
    silhouette === 'blouse'
  ) {
    const collarGeo = new THREE.CylinderGeometry(
      spec.torsoTopWidth * 0.44,
      spec.torsoTopWidth * 0.52,
      0.026,
      10,
      1,
      true
    );
    collarGeo.translate(0, j.neckY - 0.002, j.headZ * 0.85);
    target.add(createSkinnedPart(collarGeo, trimMat, 'torso', rig, 'Top_PoloCollar'));

    const frontZ = spec.torsoDepth * 0.97 + j.chestZ * 0.7 + spec.bellyBulge * 0.35 + inflation;
    const placket = new THREE.BoxGeometry(0.022, spec.torsoHeight * 0.24, 0.008);
    placket.translate(0, j.chestY + 0.01, frontZ + 0.002);
    target.add(createSkinnedPart(placket, trimMat, 'torso', rig, 'Top_Placket'));
  } else {
    const ribGeo = new THREE.TorusGeometry(spec.torsoTopWidth * 0.4, 0.013, 6, 10);
    ribGeo.rotateX(Math.PI / 2);
    ribGeo.translate(0, j.neckY - 0.002, j.headZ * 0.85);
    target.add(createSkinnedPart(ribGeo, trimMat, 'torso', rig, 'Top_NeckRib'));
  }

  if (silhouette === 'sweat') {
    const hemGeo = createPartialTorsoShell(spec, rig, 0.0, 0.12, inflation + 0.004, 0);
    target.add(createSkinnedPart(hemGeo, trimMat, 'torso', rig, 'Top_SweatHem'));
  }

  const sleeveType =
    silhouette === 'tank' || silhouette === 'tank_fitted'
      ? 'none'
      : isOversize
        ? 'oversize'
        : isLongSleeve
          ? 'long'
          : 'short';
  addSleeves(target, spec, rig, mainMat, sleeveType, silhouette === 'sweat' ? trimMat : undefined);
}

function addBottomGarment(
  target: THREE.Group,
  silhouette: string,
  spec: BodySpec,
  rig: ChibiRig,
  primaryHex: string,
  secondaryHex: string,
  pattern: PatternId
) {
  const j = rig.joints;
  const mainMat = makeFabricMaterial(primaryHex, secondaryHex, pattern, 0.86);
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondaryHex),
    roughness: 0.72,
    metalness: 0.05,
  });

  if (silhouette === 'skirt_short' || silhouette === 'skirt_long') {
    const isLong = silhouette === 'skirt_long';
    const skirtGeo = createSkirtShell(spec, rig, isLong ? 0.88 : 0.44, isLong ? 0.045 : 0.032);
    target.add(createSkinnedPart(skirtGeo, mainMat, 'torso', rig, 'Bottom_Skirt'));

    const beltGeo = new THREE.CylinderGeometry(
      spec.torsoWaistWidth + 0.022,
      spec.torsoWaistWidth + 0.024,
      0.03,
      14
    );
    beltGeo.scale(1, 1, (spec.torsoDepth + 0.022) / Math.max(0.08, spec.torsoWaistWidth + 0.022));
    beltGeo.translate(0, j.hipsY + spec.torsoHeight * 0.24, 0);
    target.add(createSkinnedPart(beltGeo, trimMat, 'hipsOnly', rig, 'Bottom_Belt'));
    return;
  }

  // Pelvic shorts / trousers brief
  const pelvisGeo = createPartialTorsoShell(spec, rig, -0.05, 0.16, 0.013, 0);
  target.add(createSkinnedPart(pelvisGeo, mainMat, 'hipsOnly', rig, 'Bottom_Pelvis'));

  // Waistband tucked slightly below top hem
  const beltGeo = createPartialTorsoShell(spec, rig, 0.12, 0.19, 0.014, 0);
  target.add(createSkinnedPart(beltGeo, trimMat, 'hipsOnly', rig, 'Bottom_Waistband'));

  const isShorts = silhouette === 'shorts' || silhouette === 'swim_trunks';
  const isSwimTrunks = silhouette === 'swim_trunks';
  const isWide = silhouette === 'pants_wide';
  const isSlim = silhouette === 'pants_slim';
  const isCargo = silhouette === 'cargo';

  if (isSwimTrunks) {
    const knotZ = spec.torsoDepth * 1.02 + 0.02;
    const drawGeo = new THREE.BoxGeometry(0.026, 0.036, 0.012);
    drawGeo.translate(0, j.hipsY + spec.torsoHeight * 0.14, knotZ);
    target.add(createSkinnedPart(drawGeo, trimMat, 'hipsOnly', rig, 'Swim_Drawstring'));
  }

  const rTop = spec.legRadius + (isWide ? 0.022 : isSwimTrunks ? 0.019 : isSlim ? 0.008 : 0.014);
  const rMid = spec.legRadius * 0.9 + (isWide ? 0.026 : isSwimTrunks ? 0.018 : isSlim ? 0.007 : 0.012);
  const rBot = spec.legRadius * 0.78 + (isWide ? 0.032 : isSlim ? 0.006 : 0.011);

  for (const side of ['left', 'right'] as const) {
    const isLeft = side === 'left';
    const hip = isLeft ? j.leftUpLeg : j.rightUpLeg;
    const knee = isLeft ? j.leftLeg : j.rightLeg;
    const ankle = isLeft ? j.leftFoot : j.rightFoot;
    const zone: SkinZone = isLeft ? 'leftLeg' : 'rightLeg';

    if (isShorts) {
      const shortEnd = new THREE.Vector3().lerpVectors(hip, knee, isSwimTrunks ? 0.7 : 0.82);
      const legGeo = createLimbSegmentGeometry(hip, shortEnd, rTop, rMid * 1.05, 8);
      target.add(createSkinnedPart(legGeo, mainMat, zone, rig, `ShortsLeg_${side}`));
    } else {
      const thighGeo = createLimbSegmentGeometry(hip, knee, rTop, rMid, 8);
      target.add(createSkinnedPart(thighGeo, mainMat, zone, rig, `PantsThigh_${side}`));

      const cuffEnd = new THREE.Vector3().lerpVectors(knee, ankle, 0.94);
      const shinGeo = createLimbSegmentGeometry(knee, cuffEnd, rMid, rBot, 8);
      target.add(createSkinnedPart(shinGeo, mainMat, zone, rig, `PantsShin_${side}`));

      if (isCargo) {
        const pocketPos = new THREE.Vector3().lerpVectors(hip, knee, 0.55);
        const pocketGeo = new THREE.BoxGeometry(0.028, spec.legLength * 0.24, spec.legRadius * 1.3);
        pocketGeo.translate(pocketPos.x + (isLeft ? rTop * 0.92 : -rTop * 0.92), pocketPos.y, pocketPos.z);
        target.add(createSkinnedPart(pocketGeo, trimMat, zone, rig, `CargoPocket_${side}`));
      }
    }
  }
}

function addFullOutfit(
  target: THREE.Group,
  silhouette: string,
  spec: BodySpec,
  rig: ChibiRig,
  primaryHex: string,
  secondaryHex: string,
  pattern: PatternId
) {
  const j = rig.joints;
  const mainMat = makeFabricMaterial(primaryHex, secondaryHex, pattern, 0.78);
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondaryHex),
    roughness: 0.7,
    metalness: 0.05,
  });

  if (
    silhouette === 'dress_daily' ||
    silhouette === 'dress_casual' ||
    silhouette === 'dress_elegant' ||
    silhouette === 'dress_mini' ||
    silhouette === 'dress_bodycon'
  ) {
    const isMini = silhouette === 'dress_mini' || silhouette === 'dress_bodycon';
    const isBodycon = silhouette === 'dress_bodycon';
    const isLong = silhouette === 'dress_elegant';

    const bodiceGeo = createPartialTorsoShell(spec, rig, 0.22, 0.92, 0.015, 0);
    target.add(createSkinnedPart(bodiceGeo, mainMat, 'torso', rig, 'Dress_Bodice'));

    const skirtGeo = createSkirtShell(
      spec,
      rig,
      isLong ? 0.85 : isMini ? 0.42 : 0.62,
      isBodycon ? 0 : isLong ? 0.045 : 0.032,
      isBodycon
    );
    target.add(createSkinnedPart(skirtGeo, mainMat, 'torso', rig, 'Dress_Skirt'));

    // Waist sash / trim cleanly proud of both bodice & skirt top seam
    const sashGeo = new THREE.CylinderGeometry(
      spec.torsoWaistWidth + 0.022,
      spec.torsoWaistWidth + 0.025,
      0.032,
      14
    );
    sashGeo.scale(1, 1, (spec.torsoDepth + 0.022) / Math.max(0.08, spec.torsoWaistWidth + 0.022));
    sashGeo.translate(0, j.hipsY + spec.torsoHeight * 0.245, j.chestZ * 0.18);
    target.add(createSkinnedPart(sashGeo, trimMat, 'torso', rig, 'Dress_Sash'));

    if (silhouette === 'dress_daily' || silhouette === 'dress_casual') {
      addSleeves(target, spec, rig, mainMat, 'short');
    }
    return;
  }

  // Swimwear & Bikinis
  if (silhouette === 'swim_male_full') {
    addBottomGarment(target, 'swim_trunks', spec, rig, primaryHex, secondaryHex, pattern);
    return;
  }

  if (silhouette === 'swim_onepiece') {
    const suitGeo = createPartialTorsoShell(spec, rig, -0.05, 0.78, 0.012, 0);
    target.add(createSkinnedPart(suitGeo, mainMat, 'torso', rig, 'Swim_OnePiece'));

    // Closed pelvic bottom cap so swimsuit stays solid from all angles
    const bottomCap = new THREE.SphereGeometry(spec.torsoHipWidth * 0.92, 10, 6);
    bottomCap.scale(1.0, 0.35, (spec.torsoDepth * 0.96) / Math.max(0.08, spec.torsoHipWidth));
    bottomCap.translate(0, j.hipsY - 0.02, 0);
    target.add(createSkinnedPart(bottomCap, mainMat, 'hipsOnly', rig, 'Swim_BottomCap'));

    // Contrast waist/hip accent band
    const trimBand = createPartialTorsoShell(spec, rig, 0.18, 0.27, 0.015, 0);
    target.add(createSkinnedPart(trimBand, trimMat, 'torso', rig, 'Swim_Trim'));

    // Shoulder straps (front & back loop over shoulder)
    const chestTop = sampleTorsoProfile(spec, rig, 0.78);
    const shTop = sampleTorsoProfile(spec, rig, 0.92);
    for (const side of [-1, 1] as const) {
      const x = side * spec.torsoTopWidth * 0.44;
      const frontStrap = createLimbSegmentGeometry(
        new THREE.Vector3(x, j.hipsY + spec.torsoHeight * 0.74, chestTop.rz + chestTop.zOffset + 0.008),
        new THREE.Vector3(x * 0.92, j.neckY - 0.005, shTop.zOffset + 0.015),
        0.011,
        0.011,
        6
      );
      target.add(createSkinnedPart(frontStrap, trimMat, 'torso', rig, `Swim_StrapFront_${side > 0 ? 'L' : 'R'}`));

      const backStrap = createLimbSegmentGeometry(
        new THREE.Vector3(x, j.hipsY + spec.torsoHeight * 0.74, -chestTop.rz + chestTop.zOffset - 0.008),
        new THREE.Vector3(x * 0.92, j.neckY - 0.005, shTop.zOffset - 0.015),
        0.011,
        0.011,
        6
      );
      target.add(createSkinnedPart(backStrap, trimMat, 'torso', rig, `Swim_StrapBack_${side > 0 ? 'L' : 'R'}`));
    }
    return;
  }

  if (silhouette === 'bikini_classic' || silhouette === 'bikini_bandeau') {
    // Bikini brief bottom
    const briefGeo = createPartialTorsoShell(spec, rig, -0.05, 0.14, 0.013, 0);
    target.add(createSkinnedPart(briefGeo, mainMat, 'hipsOnly', rig, 'Bikini_Bottom'));

    const bottomCap = new THREE.SphereGeometry(spec.torsoHipWidth * 0.92, 10, 6);
    bottomCap.scale(1.0, 0.35, (spec.torsoDepth * 0.96) / Math.max(0.08, spec.torsoHipWidth));
    bottomCap.translate(0, j.hipsY - 0.02, 0);
    target.add(createSkinnedPart(bottomCap, mainMat, 'hipsOnly', rig, 'Bikini_BottomCap'));

    const briefTrim = createPartialTorsoShell(spec, rig, 0.1, 0.15, 0.016, 0);
    target.add(createSkinnedPart(briefTrim, trimMat, 'hipsOnly', rig, 'Bikini_BottomTrim'));

    // Bikini top band across chest (leaves midriff & shoulders bare skin)
    const topGeo = createPartialTorsoShell(spec, rig, 0.56, 0.76, 0.015, 0);
    target.add(createSkinnedPart(topGeo, mainMat, 'torso', rig, 'Bikini_TopBand'));

    const chestSample = sampleTorsoProfile(spec, rig, 0.66);
    const frontZ = chestSample.rz + chestSample.zOffset + 0.015;

    if (silhouette === 'bikini_classic') {
      for (const side of [-1, 1] as const) {
        const cup = new THREE.SphereGeometry(spec.torsoTopWidth * 0.25, 8, 6);
        cup.scale(1.05, 0.95, 0.55);
        cup.translate(side * spec.torsoTopWidth * 0.34, j.chestY + 0.005, frontZ);
        target.add(createSkinnedPart(cup, mainMat, 'torso', rig, `Bikini_Cup_${side > 0 ? 'L' : 'R'}`));

        const strapStart = new THREE.Vector3(
          side * spec.torsoTopWidth * 0.38,
          j.hipsY + spec.torsoHeight * 0.74,
          frontZ - 0.008
        );
        const strapEnd = new THREE.Vector3(
          side * spec.torsoTopWidth * 0.22,
          j.neckY - 0.004,
          j.headZ * 0.85 + 0.02
        );
        const strap = createLimbSegmentGeometry(strapStart, strapEnd, 0.008, 0.008, 6);
        target.add(createSkinnedPart(strap, trimMat, 'torso', rig, `Bikini_Strap_${side > 0 ? 'L' : 'R'}`));
      }
    } else {
      // Bandeau center twist knot
      const knot = new THREE.SphereGeometry(0.018, 7, 5);
      knot.scale(1.15, 0.85, 0.75);
      knot.translate(0, j.chestY + 0.005, frontZ + 0.004);
      target.add(createSkinnedPart(knot, trimMat, 'torso', rig, 'Bikini_Knot'));
    }
    return;
  }

  // Coordinated Two-Piece & Evening Sets
  if (silhouette === 'night_crop_skirt') {
    addTopGarment(target, 'crop_top', spec, rig, primaryHex, secondaryHex, pattern);
    addBottomGarment(target, 'skirt_short', spec, rig, secondaryHex, primaryHex, 'solid');
  } else if (silhouette === 'set_skirt_top') {
    addTopGarment(target, 'blouse', spec, rig, secondaryHex, primaryHex, 'solid');
    addBottomGarment(target, 'skirt_long', spec, rig, primaryHex, secondaryHex, pattern);
  } else if (silhouette === 'set_coord' || silhouette === 'night_set' || silhouette === 'night_light') {
    addTopGarment(target, 'top_fitted', spec, rig, primaryHex, secondaryHex, pattern);
    addBottomGarment(target, 'pants_wide', spec, rig, primaryHex, secondaryHex, pattern);
  } else if (silhouette === 'u_sport') {
    addTopGarment(target, 'tshirt', spec, rig, primaryHex, secondaryHex, pattern);
    addBottomGarment(target, 'pants_sport', spec, rig, secondaryHex, primaryHex, 'sport_stripe');
  } else if (silhouette === 'u_work') {
    addTopGarment(target, 'shirt_short', spec, rig, primaryHex, secondaryHex, 'solid');
    addBottomGarment(target, 'cargo', spec, rig, secondaryHex, primaryHex, 'solid');
  } else if (silhouette === 'u_pro') {
    addTopGarment(target, 'u_pro', spec, rig, primaryHex, secondaryHex, 'solid');
    addBottomGarment(target, 'pants_classic', spec, rig, primaryHex, secondaryHex, 'solid');
  } else if (silhouette === 'u_casual') {
    addTopGarment(target, 'oversize', spec, rig, primaryHex, secondaryHex, pattern);
    addBottomGarment(target, 'shorts', spec, rig, secondaryHex, primaryHex, 'solid');
  } else {
    // u_daily
    addTopGarment(target, 'polo', spec, rig, primaryHex, secondaryHex, pattern);
    addBottomGarment(target, 'pants_classic', spec, rig, secondaryHex, primaryHex, 'denim');
  }
}

function addShoes(
  target: THREE.Group,
  shoeId: string,
  spec: BodySpec,
  rig: ChibiRig,
  shoeHex: string
) {
  const shoeItem = SHOES.find((s) => s.id === shoeId) ?? SHOES[0];
  const j = rig.joints;

  const upperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(shoeHex),
    roughness: shoeItem.silhouette === 'dress' || shoeItem.silhouette === 'heels' ? 0.32 : 0.72,
    metalness: shoeItem.silhouette === 'heels' ? 0.15 : 0.04,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(shoeItem.soleColor),
    roughness: 0.85,
    metalness: 0.02,
  });

  for (const side of ['left', 'right'] as const) {
    const isLeft = side === 'left';
    const ankle = isLeft ? j.leftFoot : j.rightFoot;
    const zone: SkinZone = isLeft ? 'leftFoot' : 'rightFoot';
    const w = spec.legRadius * 1.68;
    const len = spec.footLength * 1.08;
    const h = spec.footHeight;
    const zCenter = len * 0.24;

    if (shoeItem.silhouette === 'heels') {
      // Elevated stiletto pump grounded cleanly at Y = 0
      const heelBlock = new THREE.CylinderGeometry(0.012, 0.008, h * 0.85, 6);
      heelBlock.translate(ankle.x, h * 0.425, zCenter - len * 0.34);
      target.add(createSkinnedPart(heelBlock, soleMat, zone, rig, `Shoe_Heel_${side}`));

      const solePlate = new THREE.BoxGeometry(w * 0.92, 0.012, len * 0.55);
      solePlate.translate(ankle.x, 0.006, zCenter + len * 0.2);
      target.add(createSkinnedPart(solePlate, soleMat, zone, rig, `Shoe_Sole_${side}`));

      const upper = new THREE.BoxGeometry(w * 0.92, h * 0.58, len * 0.96);
      upper.rotateX(0.22);
      upper.translate(ankle.x, h * 0.58, zCenter);
      target.add(createSkinnedPart(upper, upperMat, zone, rig, `Shoe_Upper_${side}`));
    } else if (shoeItem.silhouette === 'sandals' || shoeItem.silhouette === 'slides') {
      const sole = new THREE.BoxGeometry(w, 0.018, len);
      sole.translate(ankle.x, 0.009, zCenter);
      target.add(createSkinnedPart(sole, soleMat, zone, rig, `Shoe_Sole_${side}`));

      const strap = new THREE.BoxGeometry(w * 1.04, 0.024, len * 0.34);
      strap.translate(ankle.x, 0.032, zCenter + len * 0.14);
      target.add(createSkinnedPart(strap, upperMat, zone, rig, `Shoe_Strap_${side}`));

      if (shoeItem.silhouette === 'sandals') {
        const ankleStrap = new THREE.BoxGeometry(w * 1.02, 0.02, len * 0.24);
        ankleStrap.translate(ankle.x, h * 0.78, zCenter - len * 0.28);
        target.add(createSkinnedPart(ankleStrap, upperMat, zone, rig, `Shoe_AnkleStrap_${side}`));
      }
    } else {
      // Closed sneakers / baskets / dress / work boots
      const soleH = shoeItem.silhouette === 'sneakers' || shoeItem.silhouette === 'work' ? 0.022 : 0.015;
      const sole = new THREE.BoxGeometry(w * 1.05, soleH, len * 1.03);
      sole.translate(ankle.x, soleH * 0.5, zCenter);
      target.add(createSkinnedPart(sole, soleMat, zone, rig, `Shoe_Sole_${side}`));

      const bodyH = shoeItem.silhouette === 'work' ? h * 1.15 : h * 0.85;
      const upper = new THREE.BoxGeometry(w * 0.96, bodyH, len * 0.96);
      upper.translate(ankle.x, soleH + bodyH * 0.5 - 0.004, zCenter);
      target.add(createSkinnedPart(upper, upperMat, zone, rig, `Shoe_Upper_${side}`));

      // Toe cap / accent
      const toeCap = new THREE.SphereGeometry(w * 0.48, 8, 6);
      toeCap.scale(1.0, 0.68, 0.9);
      toeCap.translate(ankle.x, soleH + bodyH * 0.35, zCenter + len * 0.42);
      target.add(
        createSkinnedPart(
          toeCap,
          shoeItem.silhouette === 'baskets' ? soleMat : upperMat,
          zone,
          rig,
          `Shoe_Toe_${side}`
        )
      );
    }
  }
}

function addHairstyle(
  target: THREE.Group,
  hairId: string,
  hairHex: string,
  spec: BodySpec,
  rig: ChibiRig
) {
  const item = HAIRSTYLES.find((h) => h.id === hairId) ?? HAIRSTYLES[0];
  const j = rig.joints;
  const R = spec.headRadius;
  const hc = new THREE.Vector3(0, j.headCenterY, j.headZ);

  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairHex),
    roughness: 0.78,
    metalness: 0.04,
  });

  // Base scalp cap (stops cleanly above eyebrows; symmetric rear shell covers back/nape at phi=1.5*PI)
  const capGeo = new THREE.SphereGeometry(R * 1.065, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
  capGeo.scale(spec.headScaleX * 1.02, spec.headScaleY * 1.01, 0.98);
  capGeo.rotateX(-0.22);
  capGeo.translate(hc.x, hc.y + R * 0.04, hc.z - R * 0.03);
  target.add(createSkinnedPart(capGeo, hairMat, 'head', rig, 'Hair_Cap'));

  const backCapGeo = new THREE.SphereGeometry(
    R * 1.07,
    14,
    8,
    Math.PI * 1.05,
    Math.PI * 0.9,
    Math.PI * 0.24,
    Math.PI * 0.36
  );
  backCapGeo.scale(spec.headScaleX * 1.04, spec.headScaleY * 1.02, 0.98);
  backCapGeo.translate(hc.x, hc.y + R * 0.02, hc.z - R * 0.03);
  target.add(createSkinnedPart(backCapGeo, hairMat, 'head', rig, 'Hair_Nape'));

  switch (item.silhouette) {
    case 'short':
      break;
    case 'fade': {
      const topBox = new THREE.CylinderGeometry(R * 0.84, R * 0.92, R * 0.38, 10);
      topBox.scale(spec.headScaleX * 0.96, 1, 0.92);
      topBox.translate(hc.x, hc.y + R * 0.88, hc.z - R * 0.04);
      target.add(createSkinnedPart(topBox, hairMat, 'head', rig, 'Hair_FadeTop'));
      break;
    }
    case 'afro': {
      // Positioned above and behind the face plane so eyes, brows, nose & smile stay 100% clear
      const afroGeo = new THREE.IcosahedronGeometry(R * 1.18, 1);
      afroGeo.scale(1.2, 0.94, 1.0);
      afroGeo.translate(hc.x, hc.y + R * 0.62, hc.z - R * 0.42);
      target.add(createSkinnedPart(afroGeo, hairMat, 'head', rig, 'Hair_AfroCloud'));

      for (const side of [-1, 1] as const) {
        const sidePuff = new THREE.IcosahedronGeometry(R * 0.66, 1);
        sidePuff.scale(0.95, 1.05, 0.9);
        sidePuff.translate(hc.x + side * R * 0.86, hc.y + R * 0.22, hc.z - R * 0.38);
        target.add(
          createSkinnedPart(sidePuff, hairMat, 'head', rig, `Hair_AfroSide_${side > 0 ? 'L' : 'R'}`)
        );
      }
      break;
    }
    case 'curly': {
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const puff = new THREE.DodecahedronGeometry(R * 0.34, 0);
        puff.translate(
          hc.x + Math.sin(ang) * R * 0.72,
          hc.y + R * (0.68 + (i % 2) * 0.14),
          hc.z + Math.cos(ang) * R * 0.68 - R * 0.08
        );
        target.add(createSkinnedPart(puff, hairMat, 'head', rig, `Hair_Curl_${i}`));
      }
      const crownPuff = new THREE.DodecahedronGeometry(R * 0.45, 0);
      crownPuff.translate(hc.x, hc.y + R * 0.95, hc.z);
      target.add(createSkinnedPart(crownPuff, hairMat, 'head', rig, 'Hair_CurlCrown'));
      break;
    }
    case 'long': {
      const backCurtain = new THREE.CylinderGeometry(R * 0.95, R * 1.12, R * 1.45, 10, 1, false, Math.PI * 0.55, Math.PI * 0.9);
      backCurtain.translate(hc.x, hc.y - R * 0.22, hc.z - R * 0.06);
      target.add(createSkinnedPart(backCurtain, hairMat, 'head', rig, 'Hair_LongBack'));
      break;
    }
    case 'braids': {
      const beadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.3 });
      for (let i = -3; i <= 3; i++) {
        const ang = Math.PI + i * 0.36;
        const bx = hc.x + Math.sin(ang) * R * 0.95;
        const bz = hc.z + Math.cos(ang) * R * 0.88 - R * 0.04;
        const braidGeo = new THREE.CylinderGeometry(R * 0.11, R * 0.08, R * 1.55, 6);
        braidGeo.rotateZ(i * 0.06);
        braidGeo.translate(bx, hc.y - R * 0.25, bz);
        target.add(createSkinnedPart(braidGeo, hairMat, 'head', rig, `Hair_Braid_${i}`));

        const tipGeo = new THREE.SphereGeometry(R * 0.09, 5, 4);
        tipGeo.translate(bx, hc.y - R * 1.0, bz);
        target.add(createSkinnedPart(tipGeo, beadMat, 'head', rig, `Hair_BraidBead_${i}`));
      }
      break;
    }
    case 'cornrows': {
      for (let i = -2; i <= 2; i++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(hc.x + i * R * 0.28, hc.y + R * 0.55, hc.z + R * 0.68),
          new THREE.Vector3(hc.x + i * R * 0.32, hc.y + R * 1.02, hc.z),
          new THREE.Vector3(hc.x + i * R * 0.26, hc.y + R * 0.45, hc.z - R * 0.88),
        ]);
        const rowGeo = new THREE.TubeGeometry(curve, 8, R * 0.095, 5, false);
        target.add(createSkinnedPart(rowGeo, hairMat, 'head', rig, `Hair_Cornrow_${i}`));
      }
      break;
    }
    case 'bun': {
      const bunGeo = new THREE.SphereGeometry(R * 0.46, 10, 8);
      bunGeo.translate(hc.x, hc.y + R * 1.15, hc.z - R * 0.28);
      target.add(createSkinnedPart(bunGeo, hairMat, 'head', rig, 'Hair_Bun'));
      break;
    }
    case 'tied': {
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.6 });
      const ring = new THREE.TorusGeometry(R * 0.18, R * 0.05, 6, 10);
      ring.rotateX(Math.PI * 0.35);
      ring.translate(hc.x, hc.y + R * 0.65, hc.z - R * 0.92);
      target.add(createSkinnedPart(ring, tieMat, 'head', rig, 'Hair_TieRing'));

      const tail = new THREE.ConeGeometry(R * 0.26, R * 0.95, 7);
      tail.rotateX(-2.45);
      tail.translate(hc.x, hc.y + R * 0.32, hc.z - R * 1.25);
      target.add(createSkinnedPart(tail, hairMat, 'head', rig, 'Hair_Ponytail'));
      break;
    }
  }
}

function addAccessories(
  target: THREE.Group,
  loadout: CharacterLoadout,
  spec: BodySpec,
  rig: ChibiRig
) {
  const j = rig.joints;
  const R = spec.headRadius;
  const hc = new THREE.Vector3(0, j.headCenterY, j.headZ);

  const selectedIds = [
    loadout.headwearId,
    loadout.eyewearId,
    loadout.bagId,
    loadout.wristId,
    loadout.neckId,
    loadout.earId,
  ].filter(Boolean) as string[];

  for (const id of selectedIds) {
    const item = ACCESSORIES.find((a) => a.id === id);
    if (!item) continue;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(item.defaultColor),
      roughness: item.slot === 'wrist' || item.slot === 'neck' || item.slot === 'ear' ? 0.28 : 0.72,
      metalness: item.slot === 'wrist' || item.slot === 'neck' || item.slot === 'ear' ? 0.75 : 0.05,
    });

    switch (item.silhouette) {
      case 'cap': {
        const dome = new THREE.SphereGeometry(R * 1.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
        dome.translate(hc.x, hc.y + R * 0.25, hc.z);
        target.add(createSkinnedPart(dome, mat, 'head', rig, 'Acc_CapDome'));
        const brim = new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.018, 10, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
        brim.scale(1, 1, 1.35);
        brim.translate(hc.x, hc.y + R * 0.36, hc.z + R * 0.36);
        target.add(createSkinnedPart(brim, mat, 'head', rig, 'Acc_CapBrim'));
        break;
      }
      case 'beanie': {
        const dome = new THREE.SphereGeometry(R * 1.09, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
        dome.scale(1, 1.15, 1);
        dome.translate(hc.x, hc.y + R * 0.24, hc.z - R * 0.02);
        target.add(createSkinnedPart(dome, mat, 'head', rig, 'Acc_Beanie'));
        const cuff = new THREE.TorusGeometry(R * 1.04, R * 0.11, 6, 14);
        cuff.rotateX(Math.PI / 2);
        cuff.translate(hc.x, hc.y + R * 0.32, hc.z);
        target.add(createSkinnedPart(cuff, mat, 'head', rig, 'Acc_BeanieCuff'));
        break;
      }
      case 'hat': {
        const brim = new THREE.CylinderGeometry(R * 1.65, R * 1.68, 0.018, 14);
        brim.translate(hc.x, hc.y + R * 0.42, hc.z);
        target.add(createSkinnedPart(brim, mat, 'head', rig, 'Acc_HatBrim'));
        const crown = new THREE.CylinderGeometry(R * 0.85, R * 0.98, R * 0.45, 12);
        crown.translate(hc.x, hc.y + R * 0.65, hc.z);
        target.add(createSkinnedPart(crown, mat, 'head', rig, 'Acc_HatCrown'));
        break;
      }
      case 'glasses':
      case 'sunglasses': {
        const isSun = item.silhouette === 'sunglasses';
        const lensMat = new THREE.MeshStandardMaterial({
          color: isSun ? 0x09090b : 0xe0f2fe,
          roughness: 0.15,
          metalness: isSun ? 0.35 : 0.1,
          transparent: !isSun,
          opacity: isSun ? 1.0 : 0.35,
        });
        const eyeX = R * 0.38;
        const eyeY = hc.y - R * 0.02;
        const eyeZ = hc.z + R * 0.96;

        for (const side of [-1, 1] as const) {
          const frame = new THREE.TorusGeometry(R * 0.19, 0.01, 5, 10);
          frame.translate(hc.x + side * eyeX, eyeY, eyeZ);
          target.add(createSkinnedPart(frame, mat, 'head', rig, `Acc_GlassFrame_${side}`));

          const lens = new THREE.CircleGeometry(R * 0.18, 10);
          lens.translate(hc.x + side * eyeX, eyeY, eyeZ + 0.002);
          target.add(createSkinnedPart(lens, lensMat, 'head', rig, `Acc_GlassLens_${side}`));
        }
        const bridge = new THREE.BoxGeometry(R * 0.38, 0.016, 0.016);
        bridge.translate(hc.x, eyeY + 0.01, eyeZ);
        target.add(createSkinnedPart(bridge, mat, 'head', rig, 'Acc_GlassBridge'));
        break;
      }
      case 'backpack': {
        const pack = new THREE.BoxGeometry(spec.torsoTopWidth * 1.45, spec.torsoHeight * 0.72, 0.12);
        pack.translate(0, j.chestY - 0.02, -spec.torsoDepth - 0.075);
        target.add(createSkinnedPart(pack, mat, 'chestOnly', rig, 'Acc_Backpack'));
        const pocket = new THREE.BoxGeometry(spec.torsoTopWidth * 1.1, spec.torsoHeight * 0.34, 0.04);
        pocket.translate(0, j.spineY + 0.02, -spec.torsoDepth - 0.14);
        target.add(createSkinnedPart(pocket, mat, 'chestOnly', rig, 'Acc_BackpackPocket'));
        break;
      }
      case 'handbag': {
        const h = j.leftHand;
        const bag = new THREE.BoxGeometry(0.06, 0.14, 0.17);
        bag.translate(h.x + 0.03, h.y - 0.11, h.z);
        target.add(createSkinnedPart(bag, mat, 'leftHand', rig, 'Acc_Handbag'));
        const handle = new THREE.TorusGeometry(0.045, 0.009, 5, 10, Math.PI);
        handle.rotateY(Math.PI / 2);
        handle.translate(h.x + 0.03, h.y - 0.03, h.z);
        target.add(createSkinnedPart(handle, mat, 'leftHand', rig, 'Acc_HandbagHandle'));
        break;
      }
      case 'shopping_bag': {
        const h = j.rightHand;
        const bag = new THREE.BoxGeometry(0.08, 0.18, 0.16);
        bag.translate(h.x - 0.03, h.y - 0.13, h.z);
        target.add(createSkinnedPart(bag, mat, 'rightHand', rig, 'Acc_ShoppingBag'));
        break;
      }
      case 'basket': {
        const h = j.rightHand;
        const basket = new THREE.CylinderGeometry(0.11, 0.075, 0.14, 10);
        basket.translate(h.x - 0.04, h.y - 0.12, h.z);
        target.add(createSkinnedPart(basket, mat, 'rightHand', rig, 'Acc_Basket'));
        const arch = new THREE.TorusGeometry(0.09, 0.01, 5, 10, Math.PI);
        arch.rotateY(Math.PI / 2);
        arch.translate(h.x - 0.04, h.y - 0.04, h.z);
        target.add(createSkinnedPart(arch, mat, 'rightHand', rig, 'Acc_BasketHandle'));
        break;
      }
      case 'watch': {
        const wrist = new THREE.Vector3().lerpVectors(j.leftForeArm, j.leftHand, 0.82);
        const band = new THREE.CylinderGeometry(spec.armRadius * 0.85, spec.armRadius * 0.85, 0.028, 8);
        const dir = new THREE.Vector3().subVectors(j.leftHand, j.leftForeArm).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        band.applyQuaternion(quat);
        band.translate(wrist.x, wrist.y, wrist.z);
        target.add(createSkinnedPart(band, mat, 'leftArm', rig, 'Acc_Watch'));
        break;
      }
      case 'bracelet': {
        const wrist = new THREE.Vector3().lerpVectors(j.rightForeArm, j.rightHand, 0.82);
        const band = new THREE.TorusGeometry(spec.armRadius * 0.85, 0.008, 5, 10);
        const dir = new THREE.Vector3().subVectors(j.rightHand, j.rightForeArm).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        band.applyQuaternion(quat);
        band.translate(wrist.x, wrist.y, wrist.z);
        target.add(createSkinnedPart(band, mat, 'rightArm', rig, 'Acc_Bracelet'));
        break;
      }
      case 'necklace': {
        const ring = new THREE.TorusGeometry(spec.torsoTopWidth * 0.42, 0.01, 5, 12);
        ring.rotateX(Math.PI * 0.42);
        ring.translate(0, j.neckY - 0.02, j.headZ * 0.85 + 0.01);
        target.add(createSkinnedPart(ring, mat, 'chestOnly', rig, 'Acc_Necklace'));
        break;
      }
      case 'earrings': {
        for (const side of [-1, 1] as const) {
          const hoop = new THREE.TorusGeometry(R * 0.11, 0.008, 5, 10);
          hoop.rotateY(Math.PI / 2);
          hoop.translate(
            hc.x + side * (R * spec.headScaleX * 1.02),
            hc.y - R * 0.2,
            hc.z - R * 0.04
          );
          target.add(createSkinnedPart(hoop, mat, 'head', rig, `Acc_Earring_${side}`));
        }
        break;
      }
    }
  }
}

export interface AssembledCharacterStats {
  triangles: number;
  meshes: number;
  bones: number;
  heightMeters: number;
}

export function attachLoadoutToCharacter(
  characterGroup: THREE.Group,
  rig: ChibiRig,
  spec: BodySpec,
  loadout: CharacterLoadout,
  bareFeetMeshes: THREE.SkinnedMesh[]
): AssembledCharacterStats {
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.name = 'BLV_Wardrobe';

  // Hide bare feet when closed shoes are equipped so feet never poke out
  const shoeItem = SHOES.find((s) => s.id === loadout.shoeId);
  const showBareFeet = !shoeItem || shoeItem.silhouette === 'sandals' || shoeItem.silhouette === 'slides';
  bareFeetMeshes.forEach((m) => {
    m.visible = showBareFeet;
  });

  // 1. Hair
  const hairColorHex =
    loadout.hairColorId === 'hc_black'
      ? '#18181C'
      : loadout.hairColorId === 'hc_espresso'
        ? '#2D1D16'
        : loadout.hairColorId === 'hc_auburn'
          ? '#5A2B1D'
          : loadout.hairColorId === 'hc_honey'
            ? '#8B5E2E'
            : loadout.hairColorId === 'hc_burgundy'
              ? '#5C1E2C'
              : '#A3A8B0';

  addHairstyle(wardrobeGroup, loadout.hairId, hairColorHex, spec, rig);

  // 2. Clothing (Full Outfit OR Top + Bottom)
  if (loadout.fullOutfitId) {
    const full = GARMENTS.find((g) => g.id === loadout.fullOutfitId);
    if (full) {
      addFullOutfit(
        wardrobeGroup,
        full.silhouette,
        spec,
        rig,
        loadout.topColor,
        loadout.topSecondaryColor,
        loadout.topPattern
      );
    }
  } else {
    if (loadout.topId) {
      const top = GARMENTS.find((g) => g.id === loadout.topId);
      if (top) {
        addTopGarment(
          wardrobeGroup,
          top.silhouette,
          spec,
          rig,
          loadout.topColor,
          loadout.topSecondaryColor,
          loadout.topPattern
        );
      }
    }
    if (loadout.bottomId) {
      const bot = GARMENTS.find((g) => g.id === loadout.bottomId);
      if (bot) {
        addBottomGarment(
          wardrobeGroup,
          bot.silhouette,
          spec,
          rig,
          loadout.bottomColor,
          loadout.topSecondaryColor,
          loadout.bottomPattern
        );
      }
    }
  }

  // 3. Shoes
  addShoes(wardrobeGroup, loadout.shoeId, spec, rig, loadout.shoeColor);

  // 4. Accessories
  addAccessories(wardrobeGroup, loadout, spec, rig);

  characterGroup.add(wardrobeGroup);

  // Compute live triangle & mesh metrics
  let triangles = 0;
  let meshes = 0;
  characterGroup.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.visible) {
      meshes++;
      const geo = (obj as THREE.Mesh).geometry;
      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }
    }
  });

  return {
    triangles: Math.round(triangles),
    meshes,
    bones: rig.bones.length,
    heightMeters: spec.heightMeters,
  };
}
