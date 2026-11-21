import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Deterministic Mulberry32 PRNG (zero Math.random).
 */
export function createRng(seed: number): () => number {
  let a = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Parses hex/CSS color into linear working space THREE.Color with optional shade factor.
 */
export function toColor(hex: string | number, shade = 1): THREE.Color {
  const c = new THREE.Color(hex);
  if (shade !== 1) {
    c.multiplyScalar(shade);
  }
  return c;
}

export function mixColors(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

/**
 * Ensures geometry has strictly [position, normal, color], no UVs, no groups,
 * and a Uint16Array index buffer.
 */
export function finalizePart(
  rawGeo: THREE.BufferGeometry,
  solidColor?: THREE.Color
): THREE.BufferGeometry {
  let geo = rawGeo;

  // Strip UVs and any non-allowed attributes
  const allowed = new Set(['position', 'normal', 'color']);
  for (const attrName of Object.keys(geo.attributes)) {
    if (!allowed.has(attrName)) {
      geo.deleteAttribute(attrName);
    }
  }
  geo.clearGroups();

  if (!geo.getAttribute('normal')) {
    geo.computeVertexNormals();
  }

  const posAttr = geo.getAttribute('position');
  if (!geo.getAttribute('color')) {
    const c = solidColor ?? new THREE.Color(0xffffff);
    const colors = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Ensure indexed geometry with merged duplicate vertices if originally non-indexed
  if (!geo.index) {
    const merged = mergeVertices(geo, 1e-5);
    if (merged !== geo) {
      geo.dispose();
      geo = merged;
    }
  }

  // Normalize index buffer to Uint16Array so every merged part uses identical index typing
  if (geo.index && !(geo.index.array instanceof Uint16Array)) {
    const src = geo.index.array;
    const u16 = new Uint16Array(src.length);
    for (let i = 0; i < src.length; i++) {
      u16[i] = src[i];
    }
    geo.setIndex(new THREE.BufferAttribute(u16, 1));
  }

  return geo;
}

/**
 * Merges multiple prepared parts into a single indexed BufferGeometry
 * with strictly [position, normal, color] attributes and 0 geometry groups.
 */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = parts.map((p) => finalizePart(p));
  const merged = mergeGeometries(prepared, false);

  for (const p of prepared) {
    p.dispose();
  }

  if (!merged) {
    throw new Error('mergeGeometries returned null');
  }

  merged.clearGroups();
  for (const attrName of Object.keys(merged.attributes)) {
    if (attrName !== 'position' && attrName !== 'normal' && attrName !== 'color') {
      merged.deleteAttribute(attrName);
    }
  }

  if (merged.index && !(merged.index.array instanceof Uint16Array)) {
    const src = merged.index.array;
    const u16 = new Uint16Array(src.length);
    for (let i = 0; i < src.length; i++) {
      u16[i] = src[i];
    }
    merged.setIndex(new THREE.BufferAttribute(u16, 1));
  }

  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function transformGeo(
  geo: THREE.BufferGeometry,
  opts: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number] | number;
  }
): THREE.BufferGeometry {
  if (opts.scale !== undefined) {
    if (typeof opts.scale === 'number') {
      geo.scale(opts.scale, opts.scale, opts.scale);
    } else {
      geo.scale(opts.scale[0], opts.scale[1], opts.scale[2]);
    }
  }
  if (opts.rot) {
    const [rx, ry, rz] = opts.rot;
    if (rx !== 0) geo.rotateX(rx);
    if (ry !== 0) geo.rotateY(ry);
    if (rz !== 0) geo.rotateZ(rz);
  }
  if (opts.pos) {
    geo.translate(opts.pos[0], opts.pos[1], opts.pos[2]);
  }
  return geo;
}

export interface LatheRing {
  r: number;
  y: number;
  color: THREE.Color;
  sx?: number; // squash X
  sz?: number; // squash Z
  ox?: number; // offset X
  oz?: number; // offset Z
  ribAmp?: number; // radial rib amplitude (fraction of r)
  ribFreq?: number; // radial rib frequency
  twist?: number; // angular offset in radians
  hardBreak?: boolean; // if true, skip connecting quads from previous ring
}

/**
 * Custom seamless indexed Lathe builder without UV seam duplication.
 * Supports elliptical squash, ribs, offsets, and hard color/normal break rings.
 */
export function buildLathe(
  rings: LatheRing[],
  radialSegments: number,
  opts: {
    closedBottom?: boolean;
    closedTop?: boolean;
    phaseOffset?: number;
  } = {}
): THREE.BufferGeometry {
  const closedBottom = opts.closedBottom ?? true;
  const closedTop = opts.closedTop ?? true;
  const phaseOffset = opts.phaseOffset ?? 0;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const ringStartVert: number[] = [];

  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const sx = ring.sx ?? 1;
    const sz = ring.sz ?? 1;
    const ox = ring.ox ?? 0;
    const oz = ring.oz ?? 0;
    const ribAmp = ring.ribAmp ?? 0;
    const ribFreq = ring.ribFreq ?? 0;
    const twist = ring.twist ?? 0;

    ringStartVert.push(positions.length / 3);
    for (let s = 0; s < radialSegments; s++) {
      const theta = phaseOffset + twist + (s / radialSegments) * Math.PI * 2;
      const rib = ribAmp !== 0 && ribFreq !== 0 ? 1 + ribAmp * Math.cos(theta * ribFreq) : 1;
      const rad = ring.r * rib;
      const x = ox + Math.cos(theta) * rad * sx;
      const z = oz - Math.sin(theta) * rad * sz;
      positions.push(x, ring.y, z);
      colors.push(ring.color.r, ring.color.g, ring.color.b);
    }
  }

  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    // Only skip zero-area quads when consecutive rings are geometrically coincident
    const isCoincident =
      Math.abs(a.y - b.y) < 1e-6 &&
      Math.abs(a.r - b.r) < 1e-6 &&
      Math.abs((a.sx ?? 1) - (b.sx ?? 1)) < 1e-6 &&
      Math.abs((a.sz ?? 1) - (b.sz ?? 1)) < 1e-6 &&
      Math.abs((a.ox ?? 0) - (b.ox ?? 0)) < 1e-6 &&
      Math.abs((a.oz ?? 0) - (b.oz ?? 0)) < 1e-6 &&
      Math.abs((a.ribAmp ?? 0) - (b.ribAmp ?? 0)) < 1e-6 &&
      Math.abs((a.twist ?? 0) - (b.twist ?? 0)) < 1e-6;
    if (isCoincident) {
      continue;
    }

    const vA = ringStartVert[i];
    const vB = ringStartVert[i + 1];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      const i0 = vA + s;
      const i1 = vA + sNext;
      const i2 = vB + sNext;
      const i3 = vB + s;
      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }
  }

  if (closedBottom && rings.length > 0 && rings[0].r > 1e-5) {
    const r0 = rings[0];
    const centerIdx = positions.length / 3;
    positions.push(r0.ox ?? 0, r0.y, r0.oz ?? 0);
    colors.push(r0.color.r, r0.color.g, r0.color.b);
    const v0 = ringStartVert[0];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      indices.push(centerIdx, v0 + sNext, v0 + s);
    }
  }

  if (closedTop && rings.length > 0 && rings[rings.length - 1].r > 1e-5) {
    const rLast = rings[rings.length - 1];
    const centerIdx = positions.length / 3;
    positions.push(rLast.ox ?? 0, rLast.y, rLast.oz ?? 0);
    colors.push(rLast.color.r, rLast.color.g, rLast.color.b);
    const vLast = ringStartVert[rings.length - 1];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      indices.push(centerIdx, vLast + s, vLast + sNext);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return finalizePart(geo);
}

export interface TubeFrame {
  pos: [number, number, number];
  rx: number;
  rz: number;
  color: THREE.Color;
  ribFreq?: number;
  ribAmp?: number;
  hardBreak?: boolean;
}

/**
 * Sweeps a closed ring along a 3D spine using Rotation Minimizing Frames.
 */
export function buildTube(
  frames: TubeFrame[],
  radialSegments: number,
  opts: {
    closedStart?: boolean;
    closedEnd?: boolean;
    phaseOffset?: number;
  } = {}
): THREE.BufferGeometry {
  const closedStart = opts.closedStart ?? true;
  const closedEnd = opts.closedEnd ?? true;
  const phaseOffset = opts.phaseOffset ?? 0;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const ringStarts: number[] = [];

  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < frames.length; i++) {
    const prev = new THREE.Vector3(...frames[Math.max(0, i - 1)].pos);
    const next = new THREE.Vector3(...frames[Math.min(frames.length - 1, i + 1)].pos);
    const t = next.sub(prev);
    if (t.lengthSq() < 1e-9) {
      t.set(0, 1, 0);
    } else {
      t.normalize();
    }
    tangents.push(t);
  }

  // Initial normal perpendicular to tangent[0]
  let normal = new THREE.Vector3(1, 0, 0);
  if (Math.abs(tangents[0].dot(normal)) > 0.9) {
    normal.set(0, 0, 1);
  }
  normal.crossVectors(tangents[0], normal).normalize();
  let binormal = new THREE.Vector3().crossVectors(tangents[0], normal).normalize();

  for (let i = 0; i < frames.length; i++) {
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(tangents[i - 1], tangents[i]);
      normal = normal.clone().applyQuaternion(q).normalize();
      binormal = new THREE.Vector3().crossVectors(tangents[i], normal).normalize();
    }

    const f = frames[i];
    const ribAmp = f.ribAmp ?? 0;
    const ribFreq = f.ribFreq ?? 0;
    ringStarts.push(positions.length / 3);

    for (let s = 0; s < radialSegments; s++) {
      const theta = phaseOffset + (s / radialSegments) * Math.PI * 2;
      const rib = ribAmp !== 0 && ribFreq !== 0 ? 1 + ribAmp * Math.cos(theta * ribFreq) : 1;
      const cx = Math.cos(theta) * f.rx * rib;
      const cz = Math.sin(theta) * f.rz * rib;
      const px = f.pos[0] + normal.x * cx + binormal.x * cz;
      const py = f.pos[1] + normal.y * cx + binormal.y * cz;
      const pz = f.pos[2] + normal.z * cx + binormal.z * cz;
      positions.push(px, py, pz);
      colors.push(f.color.r, f.color.g, f.color.b);
    }
  }

  for (let i = 0; i < frames.length - 1; i++) {
    if (frames[i + 1].hardBreak) continue;
    const pA = frames[i].pos;
    const pB = frames[i + 1].pos;
    const distSq =
      (pA[0] - pB[0]) ** 2 + (pA[1] - pB[1]) ** 2 + (pA[2] - pB[2]) ** 2;
    if (distSq < 1e-9 && Math.abs(frames[i].rx - frames[i + 1].rx) < 1e-6) continue;

    const vA = ringStarts[i];
    const vB = ringStarts[i + 1];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      const i0 = vA + s;
      const i1 = vA + sNext;
      const i2 = vB + sNext;
      const i3 = vB + s;
      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }
  }

  if (closedStart && frames.length > 0 && (frames[0].rx > 1e-5 || frames[0].rz > 1e-5)) {
    const f0 = frames[0];
    const cIdx = positions.length / 3;
    positions.push(f0.pos[0], f0.pos[1], f0.pos[2]);
    colors.push(f0.color.r, f0.color.g, f0.color.b);
    const v0 = ringStarts[0];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      indices.push(cIdx, v0 + sNext, v0 + s);
    }
  }

  if (
    closedEnd &&
    frames.length > 0 &&
    (frames[frames.length - 1].rx > 1e-5 || frames[frames.length - 1].rz > 1e-5)
  ) {
    const fL = frames[frames.length - 1];
    const cIdx = positions.length / 3;
    positions.push(fL.pos[0], fL.pos[1], fL.pos[2]);
    colors.push(fL.color.r, fL.color.g, fL.color.b);
    const vL = ringStarts[frames.length - 1];
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      indices.push(cIdx, vL + s, vL + sNext);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return finalizePart(geo);
}

/**
 * Clean indexed box builder with optional Y-color bands (12 tris for 1 band).
 */
export function buildBox(
  w: number,
  h: number,
  d: number,
  color: THREE.Color,
  opts: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    bands?: Array<{ y0: number; y1: number; color: THREE.Color }>;
  } = {}
): THREE.BufferGeometry {
  if (!opts.bands || opts.bands.length === 0) {
    const box = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    const geo = finalizePart(box, color);
    return transformGeo(geo, { pos: opts.pos, rot: opts.rot });
  }

  // Build stacked box segments so band transitions have zero extra hidden internal caps
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < opts.bands.length; i++) {
    const b = opts.bands[i];
    const bh = (b.y1 - b.y0) * h;
    const cy = (b.y0 + b.y1) * 0.5 * h - h * 0.5;
    const seg = finalizePart(new THREE.BoxGeometry(w, bh, d, 1, 1, 1), b.color);
    seg.translate(0, cy, 0);
    parts.push(seg);
  }
  const geo = mergeParts(parts);
  return transformGeo(geo, { pos: opts.pos, rot: opts.rot });
}

/**
 * Clean indexed cylinder with crisp top/bottom face normals via buildLathe.
 */
export function buildCylinder(
  rTop: number,
  rBot: number,
  height: number,
  radialSegs: number,
  color: THREE.Color,
  opts: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    sx?: number;
    sz?: number;
    topColor?: THREE.Color;
    botColor?: THREE.Color;
    phaseOffset?: number;
  } = {}
): THREE.BufferGeometry {
  const half = height * 0.5;
  const sx = opts.sx ?? 1;
  const sz = opts.sz ?? 1;
  const topC = opts.topColor ?? color;
  const botC = opts.botColor ?? color;

  const rings: LatheRing[] = [
    { r: rBot, y: -half, color: botC, sx, sz },
    { r: rBot, y: -half, color, sx, sz, hardBreak: true },
    { r: rTop, y: half, color, sx, sz },
    { r: rTop, y: half, color: topC, sx, sz, hardBreak: true },
  ];

  const geo = buildLathe(rings, radialSegs, {
    closedBottom: rBot > 1e-5,
    closedTop: rTop > 1e-5,
    phaseOffset: opts.phaseOffset ?? 0,
  });
  return transformGeo(geo, { pos: opts.pos, rot: opts.rot });
}

/**
 * Clean indexed sphere with optional vertex color shader function.
 */
export function buildSphere(
  radius: number,
  widthSegs: number,
  heightSegs: number,
  color: THREE.Color,
  opts: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
    colorFn?: (nx: number, ny: number, nz: number) => THREE.Color;
  } = {}
): THREE.BufferGeometry {
  const raw = new THREE.SphereGeometry(radius, widthSegs, heightSegs);
  const geo = finalizePart(raw, color);

  if (opts.colorFn) {
    const pos = geo.getAttribute('position');
    const col = geo.getAttribute('color');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const len = Math.hypot(x, y, z) || 1;
      const c = opts.colorFn(x / len, y / len, z / len);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  return transformGeo(geo, { pos: opts.pos, rot: opts.rot, scale: opts.scale });
}

/**
 * Builds a triangular/curved leaf blade (4 triangles, 5 vertices, double-sided feel via thin prism or single curved diamond).
 * Uses a thin double-faced prism (6 vertices, 6 triangles) so it's visible from all angles without DoubleSide!
 */
export function buildLeaf(
  length: number,
  width: number,
  thickness: number,
  color: THREE.Color,
  tipColor?: THREE.Color
): THREE.BufferGeometry {
  const tipC = tipColor ?? color;
  const midC = mixColors(color, tipC, 0.45);
  const hw = width * 0.5;
  const ht = thickness * 0.5;

  // 6 vertices: base (0), left-mid (1), right-mid (2), tip (3), top ridge (4), bottom ridge (5)
  const positions = new Float32Array([
    0, 0, 0,                    // 0 base
    -hw, length * 0.42, 0,      // 1 left
    hw, length * 0.42, 0,       // 2 right
    0, length, -length * 0.14,  // 3 tip (gently arched)
    0, length * 0.42, ht,       // 4 front ridge
    0, length * 0.42, -ht,      // 5 back ridge
  ]);

  const colors = new Float32Array([
    color.r, color.g, color.b,
    midC.r, midC.g, midC.b,
    midC.r, midC.g, midC.b,
    tipC.r, tipC.g, tipC.b,
    midC.r, midC.g, midC.b,
    midC.r, midC.g, midC.b,
  ]);

  const indices = new Uint16Array([
    // Front faces
    0, 4, 1,
    0, 2, 4,
    1, 4, 3,
    4, 2, 3,
    // Back faces
    0, 1, 5,
    0, 5, 2,
    1, 3, 5,
    5, 3, 2,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return finalizePart(geo);
}
