/**
 * GTA Abidjan - 3-12 Part Composite Procedural 3D Models
 * Follows Three.js architectural constitution:
 * 1) Primary silhouette, 2) Secondary read, 3) Accent details.
 * Bottom-center pivots, zero 404 dependencies.
 */

import * as THREE from 'three';
import {
  createWoroDecalTexture,
  createGbakaBannerTexture,
  createPoliceDecalTexture,
} from './textures';

// Reusable shared materials to minimize WebGL state changes
const rubberMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.9,
  metalness: 0.1,
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.15,
  metalness: 0.95,
});

const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  roughness: 0.1,
  metalness: 0.9,
  transparent: true,
  opacity: 0.65,
});

const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xfffbeb,
  emissiveIntensity: 0.8,
  roughness: 0.2,
});

const taillightMaterial = new THREE.MeshStandardMaterial({
  color: 0xb91c1c,
  emissive: 0xdc2626,
  emissiveIntensity: 0.8,
  roughness: 0.2,
});

/**
 * Creates Wôrô-wôrô yellow taxi (Peugeot 504/406 inspired)
 */
export function createWoroVehicleMesh(): THREE.Group {
  const group = new THREE.Group();

  // 1. Primary body
  const bodyGeo = new THREE.BoxGeometry(2.1, 0.75, 4.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xeab308, // Taxi yellow
    roughness: 0.35,
    metalness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);

  // Cabin roof / windows
  const cabinGeo = new THREE.BoxGeometry(1.85, 0.65, 2.2);
  const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
  cabin.position.set(0, 1.25, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Roof cap
  const roofGeo = new THREE.BoxGeometry(1.88, 0.1, 2.25);
  const roof = new THREE.Mesh(roofGeo, bodyMat);
  roof.position.set(0, 1.6, -0.2);
  group.add(roof);

  // Taxi roof sign box ("TAXI")
  const signGeo = new THREE.BoxGeometry(0.7, 0.25, 0.3);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 1.76, -0.2);
  group.add(sign);

  // 2. Secondary read: 4 Wheels with rims
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.02, 0.38, 1.3],
    [1.02, 0.38, 1.3],
    [-1.02, 0.38, -1.3],
    [1.02, 0.38, -1.3],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeo, rubberMaterial);
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.castShadow = true;

    // Rim hubcap
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, chromeMaterial);
    wheel.add(rim);

    group.add(wheel);
  });

  // 3. Accent details: Bumpers, Headlights, Decals
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.25, 0.2), chromeMaterial);
  frontBumper.position.set(0, 0.42, 2.25);
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.25, 0.2), chromeMaterial);
  rearBumper.position.set(0, 0.42, -2.25);
  group.add(rearBumper);

  // Headlights
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMaterial);
  hlLeft.position.set(-0.75, 0.72, 2.22);
  group.add(hlLeft);

  const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMaterial);
  hlRight.position.set(0.75, 0.72, 2.22);
  group.add(hlRight);

  // Taillights
  const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), taillightMaterial);
  tlLeft.position.set(-0.75, 0.72, -2.22);
  group.add(tlLeft);

  const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), taillightMaterial);
  tlRight.position.set(0.75, 0.72, -2.22);
  group.add(tlRight);

  // Side Decals ("TAXI ABIDJAN 225")
  const decalGeo = new THREE.PlaneGeometry(1.6, 0.6);
  const decalMat = new THREE.MeshBasicMaterial({
    map: createWoroDecalTexture(),
    transparent: true,
  });
  const decalLeft = new THREE.Mesh(decalGeo, decalMat);
  decalLeft.position.set(-1.06, 0.7, 0);
  decalLeft.rotation.y = -Math.PI / 2;
  group.add(decalLeft);

  const decalRight = new THREE.Mesh(decalGeo, decalMat);
  decalRight.position.set(1.06, 0.7, 0);
  decalRight.rotation.y = Math.PI / 2;
  group.add(decalRight);

  return group;
}

/**
 * Creates Gbaka minibus (Mercedes 207 green minibus)
 */
export function createGbakaVehicleMesh(): THREE.Group {
  const group = new THREE.Group();

  // 1. Primary body
  const bodyGeo = new THREE.BoxGeometry(2.3, 1.4, 5.2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Gbaka green
    roughness: 0.4,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  // White raised roof
  const roofGeo = new THREE.BoxGeometry(2.25, 0.4, 4.8);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.2,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 1.95, -0.15);
  roof.castShadow = true;
  group.add(roof);

  // Front cabin windshield
  const windshieldGeo = new THREE.BoxGeometry(2.1, 0.7, 0.1);
  const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
  windshield.position.set(0, 1.35, 2.58);
  group.add(windshield);

  // Open passenger side door aperture (classic Gbaka conductor spot)
  const openDoorGeo = new THREE.BoxGeometry(0.1, 1.1, 1.2);
  const openDoorMat = new THREE.MeshStandardMaterial({ color: 0x052e16 });
  const openDoor = new THREE.Mesh(openDoorGeo, openDoorMat);
  openDoor.position.set(1.16, 1.05, 0);
  group.add(openDoor);

  // 2. Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.15, 0.42, 1.6],
    [1.15, 0.42, 1.6],
    [-1.15, 0.42, -1.6],
    [1.15, 0.42, -1.6],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeo, rubberMaterial);
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.37, 12).rotateZ(Math.PI / 2), chromeMaterial);
    wheel.add(rim);
    group.add(wheel);
  });

  // 3. Side Banner: "YOPOUGON ➔ TREICHVILLE"
  const bannerGeo = new THREE.PlaneGeometry(3.2, 0.7);
  const bannerMat = new THREE.MeshBasicMaterial({
    map: createGbakaBannerTexture(),
    transparent: true,
  });
  const bannerLeft = new THREE.Mesh(bannerGeo, bannerMat);
  bannerLeft.position.set(-1.16, 1.25, 0);
  bannerLeft.rotation.y = -Math.PI / 2;
  group.add(bannerLeft);

  // Headlights & Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.1), chromeMaterial);
  grille.position.set(0, 0.75, 2.62);
  group.add(grille);

  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.1), headlightMaterial);
  hlLeft.position.set(-0.85, 0.85, 2.62);
  group.add(hlLeft);

  const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.1), headlightMaterial);
  hlRight.position.set(0.85, 0.85, 2.62);
  group.add(hlRight);

  return group;
}

/**
 * Creates Police Nationale squad car with flashing LED lightbar
 */
export function createPoliceVehicleMesh(): { group: THREE.Group; lightbar: THREE.Group } {
  const group = new THREE.Group();

  // Primary body
  const bodyGeo = new THREE.BoxGeometry(2.15, 0.78, 4.5);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb, // Police blue
    roughness: 0.3,
    metalness: 0.5,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.68;
  body.castShadow = true;
  group.add(body);

  // White hood & roof
  const hoodRoofGeo = new THREE.BoxGeometry(1.9, 0.72, 2.3);
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.3,
  });
  const hoodRoof = new THREE.Mesh(hoodRoofGeo, whiteMat);
  hoodRoof.position.set(0, 1.28, -0.2);
  group.add(hoodRoof);

  // Police Flashing Lightbar
  const lightbar = new THREE.Group();
  lightbar.position.set(0, 1.72, -0.2);

  const barMount = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.2), chromeMaterial);
  lightbar.add(barMount);

  const blueLedGeo = new THREE.BoxGeometry(0.55, 0.16, 0.25);
  const blueLedMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x3b82f6,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });
  const blueLed = new THREE.Mesh(blueLedGeo, blueLedMat);
  blueLed.position.x = -0.38;
  lightbar.add(blueLed);

  const redLedGeo = new THREE.BoxGeometry(0.55, 0.16, 0.25);
  const redLedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    emissive: 0xef4444,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });
  const redLed = new THREE.Mesh(redLedGeo, redLedMat);
  redLed.position.x = 0.38;
  lightbar.add(redLed);

  group.add(lightbar);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.34, 16).rotateZ(Math.PI / 2);
  [
    [-1.04, 0.39, 1.35],
    [1.04, 0.39, 1.35],
    [-1.04, 0.39, -1.35],
    [1.04, 0.39, -1.35],
  ].forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeo, rubberMaterial);
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.castShadow = true;
    group.add(wheel);
  });

  // Police door decals
  const decalGeo = new THREE.PlaneGeometry(1.8, 0.65);
  const decalMat = new THREE.MeshBasicMaterial({
    map: createPoliceDecalTexture(),
    transparent: true,
  });
  const decalLeft = new THREE.Mesh(decalGeo, decalMat);
  decalLeft.position.set(-1.09, 0.72, 0);
  decalLeft.rotation.y = -Math.PI / 2;
  group.add(decalLeft);

  const decalRight = new THREE.Mesh(decalGeo, decalMat);
  decalRight.position.set(1.09, 0.72, 0);
  decalRight.rotation.y = Math.PI / 2;
  group.add(decalRight);

  return { group, lightbar };
}

/**
 * Creates Player Character (GTA San Andreas style streetwear with orange/green jersey)
 */
export function createPlayerMesh(): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Head
  const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21, // warm deep skin tone
    roughness: 0.8,
  });
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // Sunglasses
  const shadesGeo = new THREE.BoxGeometry(0.3, 0.08, 0.12);
  const shades = new THREE.Mesh(shadesGeo, new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 }));
  shades.position.set(0, 1.72, 0.18);
  group.add(shades);

  // Torso (Ivorian Orange Jersey with green trim)
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.68, 0.32);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: 0xea580c, // Cote d'Ivoire orange
    roughness: 0.6,
  });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.14, 0.58, 0.14);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.36, 1.25, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.36, 1.25, 0);
  group.add(rightArm);

  // Legs (Jeans)
  const legGeo = new THREE.BoxGeometry(0.18, 0.78, 0.2);
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // dark denim
    roughness: 0.8,
  });

  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.16, 0.48, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.16, 0.48, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Sneakers
  const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.32);
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.16, 0.06, 0.05);
  group.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.16, 0.06, 0.05);
  group.add(rightShoe);

  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

/**
 * Creates Royal Palm Tree (Cocody & Plateau boulevards)
 */
export function createPalmTree(): THREE.Group {
  const group = new THREE.Group();

  // Curved segmented trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, 3.5, 0.2),
    new THREE.Vector3(0.7, 7.5, 0.5),
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 12, 0.35, 8, false);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.95,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  group.add(trunk);

  // Palm fronds (8 curved fan leaves)
  const frondGeo = new THREE.ConeGeometry(1.6, 4.5, 5);
  frondGeo.translate(0, 2.25, 0);
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  const topPoint = new THREE.Vector3(0.7, 7.5, 0.5);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.copy(topPoint);
    frond.rotation.y = angle;
    frond.rotation.z = 0.9 + Math.random() * 0.2;
    frond.scale.set(0.8, 1, 0.15);
    frond.castShadow = true;
    group.add(frond);
  }

  // Coconuts
  const coconutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  for (let c = 0; c < 4; c++) {
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), coconutMat);
    coconut.position.set(topPoint.x + Math.sin(c * 1.5) * 0.4, topPoint.y - 0.25, topPoint.z + Math.cos(c * 1.5) * 0.4);
    group.add(coconut);
  }

  return group;
}

/**
 * Creates Streetlight with warm illumination fixture
 */
export function createStreetlight(): THREE.Group {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 6.5, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3.25;
  group.add(pole);

  // Arched horizontal lamp arm
  const armGeo = new THREE.BoxGeometry(1.4, 0.1, 0.1);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.6, 6.4, 0);
  group.add(arm);

  // Lamp housing & emissive bulb
  const lampGeo = new THREE.BoxGeometry(0.4, 0.15, 0.25);
  const lamp = new THREE.Mesh(lampGeo, poleMat);
  lamp.position.set(1.2, 6.35, 0);
  group.add(lamp);

  const bulbGeo = new THREE.BoxGeometry(0.3, 0.05, 0.2);
  const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.0,
  }));
  bulb.position.set(1.2, 6.27, 0);
  group.add(bulb);

  return group;
}
