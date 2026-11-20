import * as THREE from 'three';
import type { PivotAlignment } from './types';

/**
 * Deterministic PRNG for reproducible organic silhouettes.
 */
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Aligns a THREE.Group so its origin (0,0,0) matches the requested pivot convention
 * and enables castShadow / receiveShadow on all child meshes.
 */
export function finalizeAssetGroup(
  group: THREE.Group,
  name: string,
  pivotType: PivotAlignment = 'bottom-center'
): THREE.Group {
  group.name = name;
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty()) {
    const center = new THREE.Vector3();
    box.getCenter(center);

    let offsetX = -center.x;
    let offsetY = -box.min.y;
    let offsetZ = -center.z;

    if (pivotType === 'top-center') {
      offsetY = -box.max.y;
    } else if (pivotType === 'back-center') {
      offsetY = -center.y;
      offsetZ = -box.min.z;
    }

    for (const child of group.children) {
      child.position.x += offsetX;
      child.position.y += offsetY;
      child.position.z += offsetZ;
    }
  }

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  group.updateMatrixWorld(true);
  return group;
}

/**
 * Creates a tapered, curved organic trunk/branch geometry along a CatmullRomCurve3.
 */
export function createTaperedBranchGeometry(
  points: THREE.Vector3[],
  radiusBottom: number,
  radiusTop: number,
  tubularSegments = 14,
  radialSegments = 8
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const p = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const radius = THREE.MathUtils.lerp(radiusBottom, radiusTop, t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      vertex.x = p.x + radius * normal.x;
      vertex.y = p.y + radius * normal.y;
      vertex.z = p.z + radius * normal.z;

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(j / radialSegments, t);
    }
  }

  for (let j = 1; j <= tubularSegments; j++) {
    for (let i = 1; i <= radialSegments; i++) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Bouchon du haut : sommets dédiés avec la normale axiale (éclairage correct)
  const topPt = curve.getPointAt(1);
  const topTangent = curve.getTangentAt(1);
  const capCenterIdx = positions.length / 3;
  positions.push(topPt.x, topPt.y, topPt.z);
  normals.push(topTangent.x, topTangent.y, topTangent.z);
  uvs.push(0.5, 1);
  const capRingStart = positions.length / 3;
  for (let j = 0; j <= radialSegments; j++) {
    const k = tubularSegments * (radialSegments + 1) + j;
    positions.push(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]);
    normals.push(topTangent.x, topTangent.y, topTangent.z);
    uvs.push(j / radialSegments, 1);
  }
  for (let i = 0; i < radialSegments; i++) {
    indices.push(capRingStart + i, capCenterIdx, capRingStart + i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Creates a stylized faceted foliage blob (never a sterile sphere).
 */
export function createStylizedCanopyBlob(
  radius: number,
  detail: number,
  seed: number,
  scaleX = 1,
  scaleY = 0.85,
  scaleZ = 1,
  jitterAmount = 0.16
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const rng = createSeededRng(seed);
  const offsets = new Map<string, number>();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Hash vertex coords so coincident seam vertices move identically
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let factor = offsets.get(key);
    if (factor === undefined) {
      factor = 1 + (rng() - 0.5) * 2 * jitterAmount;
      offsets.set(key, factor);
    }
    pos.setXYZ(i, x * scaleX * factor, y * scaleY * factor, z * scaleZ * factor);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a stylized curved palm frond with V-folded leaflet blade.
 */
export function createPalmFrondGroup(
  length: number,
  width: number,
  droop: number,
  mat: THREE.Material,
  stemMat: THREE.Material
): THREE.Group {
  const frond = new THREE.Group();

  // Central rachis stem
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length * 0.18, length * 0.35),
    new THREE.Vector3(0, length * 0.12 - droop * 0.35, length * 0.7),
    new THREE.Vector3(0, -droop, length),
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 8, 0.032, 5, false);
  frond.add(new THREE.Mesh(stemGeo, stemMat));

  // Segmented leaflet pairs along the rachis
  const segments = 7;
  for (let i = 1; i <= segments; i++) {
    const t = i / (segments + 0.5);
    const pt = stemCurve.getPointAt(t);
    const tangent = stemCurve.getTangentAt(t);
    const w = width * Math.sin(t * Math.PI * 0.92);
    const leafletLen = w * 0.85;

    for (const side of [-1, 1]) {
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(leafletLen * 0.5, 0.06, leafletLen, -0.08);
      leafShape.quadraticCurveTo(leafletLen * 0.45, -0.05, 0, -0.04);

      const leafGeo = new THREE.ShapeGeometry(leafShape, 3);
      const leafMesh = new THREE.Mesh(leafGeo, mat);
      leafMesh.position.copy(pt);

      // Angle outward and droop naturally
      leafMesh.rotation.y = side === 1 ? -Math.PI * 0.08 : Math.PI + Math.PI * 0.08;
      leafMesh.rotation.z = side === 1 ? -0.32 - t * 0.22 : 0.32 + t * 0.22;
      leafMesh.rotation.x = Math.atan2(-tangent.y, tangent.z) * 0.4;
      frond.add(leafMesh);
    }
  }

  return frond;
}

/**
 * Creates a stylized curved tropical broad leaf (for banana, monstera, elephant ear).
 */
export function createBroadLeafMesh(
  length: number,
  width: number,
  arch: number,
  mat: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.65, length * 0.22, width * 0.55, length * 0.78, 0, length);
  shape.bezierCurveTo(-width * 0.55, length * 0.78, -width * 0.65, length * 0.22, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 6);
  const pos = geo.attributes.position;

  // Bend along length (Y becomes Z forward, with graceful arch) and V-fold across X
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = y / length;
    const z = y * 0.92;
    const newY = Math.sin(t * Math.PI) * arch * 0.5 - t * t * arch + Math.abs(x) * 0.14;
    pos.setXYZ(i, x, newY, z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/**
 * Creates a 5-petal stylized flower head.
 */
export function createFlowerBlossom(
  radius: number,
  petalMat: THREE.Material,
  centerMat: THREE.Material,
  petalCount = 5
): THREE.Group {
  const flower = new THREE.Group();
  const petalGeo = new THREE.ConeGeometry(radius * 0.45, radius, 4);
  petalGeo.translate(0, radius * 0.5, 0);
  petalGeo.scale(1, 1, 0.28);

  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.rotation.y = a;
    p.rotation.x = 0.88;
    flower.add(p);
  }

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.22, 6, 5),
    centerMat
  );
  center.position.y = radius * 0.14;
  flower.add(center);

  return flower;
}

/**
 * Computes catenary curve points between p1 and p2 with sag.
 */
export function createCatenaryPoints(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  sag: number,
  segments = 14
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(p1, p2, t);
    pt.y -= 4 * sag * t * (1 - t);
    pts.push(pt);
  }
  return pts;
}
