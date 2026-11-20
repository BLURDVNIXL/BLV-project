/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Convertisseur « studio 3D → jeu ».
 *
 * Les builders du studio (src/assets3d/builders/*) produisent des THREE.Group avec des textures
 * canvas. Le jeu, lui, fusionne tout par chunk de 64 m dans quelques buffers à couleurs par sommet
 * (~6 draw calls par chunk). Ce module :
 *   1. exécute UNE fois chaque variante du studio (cache) ;
 *   2. la « cuit » (bake) en géométrie monde + normales + couleurs par sommet
 *      (couleur de la texture × teinte du matériau) ;
 *   3. range les parties dans le bon buffer : `trees` (feuillages : double face + vent tropical)
 *      ou `plain` (troncs, pierre, bois, métal…) ;
 *   4. copie le gabarit à chaque emplacement avec échelle, rotation et légère variation de teinte.
 *
 * Aucun import de décor du jeu (pas de cycle) : seuls des types sont importés.
 */

import * as THREE from 'three';
import type { AssetDefinition } from '../assets3d/types';
import type { Buf } from './decorMeshes';

export interface BakedMesh {
  pos: Float32Array;
  nor: Float32Array;
  col: Float32Array;
  idx: Uint32Array;
}

export interface BakedTemplate {
  /** Parties opaques (troncs, pierre, bois, métal…) → buffer `plain` du chunk. */
  plain: BakedMesh | null;
  /** Feuillages & surfaces double face → buffer `trees` du chunk (vent tropical). */
  trees: BakedMesh | null;
  /** Hauteur naturelle du modèle (m), base posée à y = 0. */
  height: number;
  /** Rayon horizontal maximal (m) autour du pied. */
  radius: number;
  triangles: number;
}

interface Acc {
  pos: number[];
  nor: number[];
  col: number[];
  idx: number[];
}

const newAcc = (): Acc => ({ pos: [], nor: [], col: [], idx: [] });

function finishAcc(a: Acc): BakedMesh | null {
  if (a.idx.length === 0) return null;
  return {
    pos: new Float32Array(a.pos),
    nor: new Float32Array(a.nor),
    col: new Float32Array(a.col),
    idx: new Uint32Array(a.idx),
  };
}

const _c = new THREE.Color();

/** Couleur de sommet = couleur de base de la texture (mémorisée par le studio) × teinte du matériau. */
function materialBakeColor(mat: THREE.Material): THREE.Color {
  const m = mat as THREE.MeshStandardMaterial;
  const out = new THREE.Color(1, 1, 1);
  if (m.color) out.copy(m.color);
  const base = m.map?.userData?.baseHex as string | undefined;
  if (base) {
    _c.set(base);
    out.multiply(_c);
  }
  return out;
}

function routesToTrees(mat: THREE.Material): boolean {
  const kind = mat.userData?.kind as string | undefined;
  return kind === 'foliage' || kind === 'petal' || mat.side === THREE.DoubleSide;
}

function bakeGeometryInto(
  acc: Acc,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  matrix: THREE.Matrix4,
  groupStart: number,
  groupCount: number
): void {
  let geo = geometry;
  const flat = (mat as THREE.MeshStandardMaterial).flatShading === true;
  if (flat && geo.index) {
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
  } else if (!geo.getAttribute('normal')) {
    geo = geo.clone();
    geo.computeVertexNormals();
  }

  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const color = materialBakeColor(mat);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  const flip = matrix.determinant() < 0;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  const base = acc.pos.length / 3;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
    acc.pos.push(v.x, v.y, v.z);
    acc.nor.push(n.x, n.y, n.z);
    acc.col.push(color.r, color.g, color.b);
  }

  const index = geo.index;
  const total = index ? index.count : pos.count;
  const start = Math.max(0, groupStart);
  const end = Math.min(total, groupStart + groupCount);
  for (let t = start; t + 2 < end; t += 3) {
    const a = index ? index.getX(t) : t;
    const b = index ? index.getX(t + 1) : t + 1;
    const c = index ? index.getX(t + 2) : t + 2;
    if (flip) acc.idx.push(base + a, base + c, base + b);
    else acc.idx.push(base + a, base + b, base + c);
  }
}

/** Cuit un THREE.Group du studio en gabarit réutilisable (pivot = centre du pied, base à y = 0). */
export function bakeGroup(group: THREE.Group): BakedTemplate {
  group.updateMatrixWorld(true);
  const plain = newAcc();
  const trees = newAcc();

  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry;
    const total = geo.index ? geo.index.count : geo.getAttribute('position').count;
    if (Array.isArray(mesh.material)) {
      const groups = geo.groups.length > 0 ? geo.groups : [{ start: 0, count: total, materialIndex: 0 }];
      for (const g of groups) {
        const mat = mesh.material[g.materialIndex ?? 0];
        if (!mat) continue;
        bakeGeometryInto(routesToTrees(mat) ? trees : plain, geo, mat, mesh.matrixWorld, g.start, g.count);
      }
    } else if (mesh.material) {
      bakeGeometryInto(routesToTrees(mesh.material) ? trees : plain, geo, mesh.material, mesh.matrixWorld, 0, total);
    }
  });

  // Recentrage sur le pied (le studio centre la boîte englobante, ce qui décale les troncs penchés)
  let minY = Infinity;
  for (const a of [plain, trees]) for (let i = 1; i < a.pos.length; i += 3) minY = Math.min(minY, a.pos[i]);
  if (!Number.isFinite(minY)) minY = 0;
  let sx = 0, sz = 0, cnt = 0;
  for (const a of [plain, trees]) {
    for (let i = 0; i < a.pos.length; i += 3) {
      if (a.pos[i + 1] - minY <= 0.25) {
        sx += a.pos[i];
        sz += a.pos[i + 2];
        cnt++;
      }
    }
  }
  const cx = cnt > 0 ? sx / cnt : 0;
  const cz = cnt > 0 ? sz / cnt : 0;
  let maxY = 0;
  let radius = 0;
  for (const a of [plain, trees]) {
    for (let i = 0; i < a.pos.length; i += 3) {
      a.pos[i] -= cx;
      a.pos[i + 1] -= minY;
      a.pos[i + 2] -= cz;
      maxY = Math.max(maxY, a.pos[i + 1]);
      radius = Math.max(radius, Math.hypot(a.pos[i], a.pos[i + 2]));
    }
  }

  const p = finishAcc(plain);
  const t = finishAcc(trees);
  return {
    plain: p,
    trees: t,
    height: maxY,
    radius,
    triangles: ((p?.idx.length ?? 0) + (t?.idx.length ?? 0)) / 3,
  };
}

const templateCache = new Map<string, BakedTemplate>();

/** Gabarit d'une variante du studio (généré à la demande, puis mis en cache). */
export function getBakedTemplate(asset: AssetDefinition, variantId: string): BakedTemplate {
  const key = `${asset.id}:${variantId}`;
  let tpl = templateCache.get(key);
  if (!tpl) {
    tpl = bakeGroup(asset.build(variantId));
    templateCache.set(key, tpl);
  }
  return tpl;
}

export interface EmitOptions {
  x: number;
  z: number;
  /** Altitude de la base (défaut 0). */
  y?: number;
  scale?: number;
  /** Rotation autour de Y (rad). */
  rot?: number;
  /** Multiplicateur de luminosité par instance (variété), défaut 1. */
  tint?: number;
}

/** Copie un gabarit dans un buffer du chunk. */
export function emitBaked(mesh: BakedMesh | null, dst: Buf, o: EmitOptions): void {
  if (!mesh) return;
  const s = o.scale ?? 1;
  const y0 = o.y ?? 0;
  const tint = o.tint ?? 1;
  const c = Math.cos(o.rot ?? 0);
  const sn = Math.sin(o.rot ?? 0);
  const base = dst.pos.length / 3;
  const count = mesh.pos.length / 3;
  for (let i = 0; i < count; i++) {
    const px = mesh.pos[i * 3];
    const py = mesh.pos[i * 3 + 1];
    const pz = mesh.pos[i * 3 + 2];
    dst.pos.push(o.x + (c * px + sn * pz) * s, y0 + py * s, o.z + (-sn * px + c * pz) * s);
    const nx = mesh.nor[i * 3];
    const nz = mesh.nor[i * 3 + 2];
    dst.nor.push(c * nx + sn * nz, mesh.nor[i * 3 + 1], -sn * nx + c * nz);
    dst.col.push(mesh.col[i * 3] * tint, mesh.col[i * 3 + 1] * tint, mesh.col[i * 3 + 2] * tint);
    dst.uv.push(0, 0);
  }
  for (let i = 0; i < mesh.idx.length; i++) dst.idx.push(base + mesh.idx[i]);
}
