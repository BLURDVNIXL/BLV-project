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
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import type { AssetDefinition } from '../assets3d/types';
import type { Buf } from './decorMeshes';
import { LOD_NEAR, MAX_MODEL_SCALE, lodModelError, type LodLevel } from './lod';
import { SILHOUETTE_TOLERANCE, silhouetteDiff, type GuardMesh } from './lodGuard';

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
  /** Parties lumineuses (ampoules, verre de lanterne…) → buffer `lamps` (émissif la nuit). */
  lamps: BakedMesh | null;
  /** Eau et verre (translucides) → buffer `puddles`. */
  puddles: BakedMesh | null;
  /** Hauteur naturelle du modèle (m), base posée à y = 0. */
  height: number;
  /** Rayon horizontal maximal (m) autour du pied. */
  radius: number;
  /** Étendue du modèle le long de son axe X local (m) — sert à étirer/répéter guirlandes et chaînes. */
  sizeX: number;
  /** Étendue du modèle le long de son axe Z local (m). */
  sizeZ: number;
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

type BakeTarget = 'plain' | 'trees' | 'lamps' | 'puddles';

function routeMaterial(mat: THREE.Material): BakeTarget {
  const kind = mat.userData?.kind as string | undefined;
  if (kind === 'emissive') return 'lamps';
  if (kind === 'water' || kind === 'glass') return 'puddles';
  if (kind === 'foliage' || kind === 'petal' || kind === 'fabric' || mat.side === THREE.DoubleSide) return 'trees';
  return 'plain';
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
  const accs: Record<BakeTarget, Acc> = { plain: newAcc(), trees: newAcc(), lamps: newAcc(), puddles: newAcc() };

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
        bakeGeometryInto(accs[routeMaterial(mat)], geo, mat, mesh.matrixWorld, g.start, g.count);
      }
    } else if (mesh.material) {
      bakeGeometryInto(accs[routeMaterial(mesh.material)], geo, mesh.material, mesh.matrixWorld, 0, total);
    }
  });

  const list = [accs.plain, accs.trees, accs.lamps, accs.puddles];

  // Recentrage sur le pied (le studio centre la boîte englobante, ce qui décale les troncs penchés)
  let minY = Infinity;
  for (const a of list) for (let i = 1; i < a.pos.length; i += 3) minY = Math.min(minY, a.pos[i]);
  if (!Number.isFinite(minY)) minY = 0;
  let sx = 0, sz = 0, cnt = 0;
  for (const a of list) {
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
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const a of list) {
    for (let i = 0; i < a.pos.length; i += 3) {
      a.pos[i] -= cx;
      a.pos[i + 1] -= minY;
      a.pos[i + 2] -= cz;
      maxY = Math.max(maxY, a.pos[i + 1]);
      radius = Math.max(radius, Math.hypot(a.pos[i], a.pos[i + 2]));
      minX = Math.min(minX, a.pos[i]);
      maxX = Math.max(maxX, a.pos[i]);
      minZ = Math.min(minZ, a.pos[i + 2]);
      maxZ = Math.max(maxZ, a.pos[i + 2]);
    }
  }

  const p = finishAcc(accs.plain);
  const t = finishAcc(accs.trees);
  const l = finishAcc(accs.lamps);
  const w = finishAcc(accs.puddles);
  return {
    plain: p,
    trees: t,
    lamps: l,
    puddles: w,
    height: maxY,
    radius,
    sizeX: Number.isFinite(minX) ? maxX - minX : 0,
    sizeZ: Number.isFinite(minZ) ? maxZ - minZ : 0,
    triangles: ((p?.idx.length ?? 0) + (t?.idx.length ?? 0) + (l?.idx.length ?? 0) + (w?.idx.length ?? 0)) / 3,
  };
}

const templateCache = new Map<string, BakedTemplate>();
const lodCache = new Map<string, BakedTemplate>();

// ── Niveaux de détail : simplification des gabarits (voir lod.ts) ─────────────────────────────────────────────────

let simplifierReady = false;
/** Niveau de détail courant des gabarits émis (fixé par buildChunkBuffers pour la durée d'une construction). */
let activeLod: LodLevel = 0;

/** Charge le simplificateur (WASM). Tant qu'il n'est pas prêt, tous les gabarits restent au niveau 0 (jamais d'erreur). */
export async function initSimplifier(): Promise<boolean> {
  try {
    await MeshoptSimplifier.ready;
    simplifierReady = MeshoptSimplifier.supported;
  } catch {
    simplifierReady = false;
  }
  return simplifierReady;
}

export const isSimplifierReady = (): boolean => simplifierReady;
export const getBakeLod = (): LodLevel => activeLod;
/** Niveau réellement applicable : 0 tant que le simplificateur n'est pas prêt. */
export const setBakeLod = (level: LodLevel): void => {
  activeLod = simplifierReady ? level : 0;
};

/** Soude les sommets identiques (position + normale + couleur) pour que le simplificateur voie les arêtes partagées. */
function weld(m: BakedMesh): { pos: Float32Array; att: Float32Array; idx: Uint32Array } {
  const map = new Map<string, number>();
  const pos: number[] = [];
  const att: number[] = [];
  const idx: number[] = [];
  const n = m.pos.length / 3;
  const remap = new Uint32Array(n);
  for (let v = 0; v < n; v++) {
    const o = v * 3;
    const k = `${m.pos[o]},${m.pos[o + 1]},${m.pos[o + 2]}|${m.nor[o]},${m.nor[o + 1]},${m.nor[o + 2]}|${m.col[o]},${m.col[o + 1]},${m.col[o + 2]}`;
    let id = map.get(k);
    if (id === undefined) {
      id = pos.length / 3;
      map.set(k, id);
      pos.push(m.pos[o], m.pos[o + 1], m.pos[o + 2]);
      att.push(m.nor[o], m.nor[o + 1], m.nor[o + 2], m.col[o], m.col[o + 1], m.col[o + 2]);
    }
    remap[v] = id;
  }
  for (let i = 0; i < m.idx.length; i += 3) {
    const a = remap[m.idx[i]], b = remap[m.idx[i + 1]], c = remap[m.idx[i + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  return { pos: new Float32Array(pos), att: new Float32Array(att), idx: new Uint32Array(idx) };
}

/** Simplifie un maillage avec une erreur absolue maximale (m, repère du modèle). Renvoie l'original s'il n'y a rien à gagner. */
function simplifyMesh(m: BakedMesh | null, error: number): BakedMesh | null {
  if (!m) return null;
  const w = weld(m);
  if (w.idx.length === 0) return m;
  const [res] = MeshoptSimplifier.simplifyWithAttributes(
    w.idx, w.pos, 3, w.att, 6, [0.3, 0.3, 0.3, 0.3, 0.3, 0.3], null, 0, error, ['ErrorAbsolute']
  );
  if (res.length >= m.idx.length * 0.9) return m; // gain < 10 % : on garde le modèle d'origine, intact
  // Compacte : ne garde que les sommets utilisés
  const used = new Map<number, number>();
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  const idx = new Uint32Array(res.length);
  for (let i = 0; i < res.length; i++) {
    let id = used.get(res[i]);
    if (id === undefined) {
      id = used.size;
      used.set(res[i], id);
      const v = res[i];
      pos.push(w.pos[v * 3], w.pos[v * 3 + 1], w.pos[v * 3 + 2]);
      nor.push(w.att[v * 6], w.att[v * 6 + 1], w.att[v * 6 + 2]);
      col.push(w.att[v * 6 + 3], w.att[v * 6 + 4], w.att[v * 6 + 5]);
    }
    idx[i] = id;
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), idx };
}

const guardParts = (t: BakedTemplate): GuardMesh[] =>
  [t.plain, t.trees, t.lamps, t.puddles].filter((m): m is BakedMesh => m !== null);

/**
 * Gabarit simplifié d'un niveau ≥ 1. Hauteur, rayon et étendues restent ceux du modèle d'origine (placement identique).
 * Garde de qualité : on essaie l'erreur cible puis des erreurs 2×, 4×, 8× plus petites, puis les niveaux plus fins déjà
 * acceptés ; le premier dont la silhouette reste à moins de SILHOUETTE_TOLERANCE de l'original (mesurée à la taille d'un
 * demi-pixel de CE niveau) est retenu, et à défaut le modèle d'origine. Un modèle fragile (palmes, fougères) reste donc
 * intact plutôt qu'abîmé.
 */
function simplifyTemplate(base: BakedTemplate, finer: BakedTemplate[], level: LodLevel): BakedTemplate {
  const cell = (0.000985 * LOD_NEAR[level - 1]) / MAX_MODEL_SCALE;
  const ref = guardParts(base);
  const ok = (t: BakedTemplate): boolean => t === base || silhouetteDiff(ref, guardParts(t), cell) <= SILHOUETTE_TOLERANCE;
  const floor = finer.length > 0 ? finer[finer.length - 1].triangles : base.triangles;
  for (const f of [1, 0.5, 0.25, 0.125]) {
    const e = lodModelError(level) * f;
    const plain = simplifyMesh(base.plain, e);
    const trees = simplifyMesh(base.trees, e);
    const triangles = ((plain?.idx.length ?? 0) + (trees?.idx.length ?? 0) + (base.lamps?.idx.length ?? 0) + (base.puddles?.idx.length ?? 0)) / 3;
    if (triangles >= floor) break; // plus rien à gagner par rapport aux niveaux plus fins
    const cand: BakedTemplate = { ...base, plain, trees, triangles };
    if (ok(cand)) return cand;
  }
  for (let i = finer.length - 1; i >= 0; i--) if (ok(finer[i])) return finer[i];
  return base;
}

/** Soudure SANS PERTE : fusionne les sommets strictement identiques (position, normale, couleur). Mêmes triangles, même ordre. */
function weldMesh(m: BakedMesh | null): BakedMesh | null {
  if (!m) return null;
  const w = weld(m);
  if (w.idx.length !== m.idx.length) return m; // triangles dégénérés présents : on ne touche à rien
  const n = w.pos.length / 3;
  const nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    nor[v * 3] = w.att[v * 6]; nor[v * 3 + 1] = w.att[v * 6 + 1]; nor[v * 3 + 2] = w.att[v * 6 + 2];
    col[v * 3] = w.att[v * 6 + 3]; col[v * 3 + 1] = w.att[v * 6 + 4]; col[v * 3 + 2] = w.att[v * 6 + 5];
  }
  return { pos: w.pos, nor, col, idx: w.idx };
}

/** Gabarit d'une variante du studio (généré à la demande, puis mis en cache), au niveau de détail demandé (défaut : courant). */
export function getBakedTemplate(asset: AssetDefinition, variantId: string, level: LodLevel = activeLod): BakedTemplate {
  const key = `${asset.id}:${variantId}`;
  let tpl = templateCache.get(key);
  if (!tpl) {
    const raw = bakeGroup(asset.build(variantId));
    tpl = { ...raw, plain: weldMesh(raw.plain), trees: weldMesh(raw.trees), lamps: weldMesh(raw.lamps), puddles: weldMesh(raw.puddles) };
    templateCache.set(key, tpl);
  }
  if (level === 0 || !simplifierReady) return tpl;
  const lk = `${key}:L${level}`;
  let lt = lodCache.get(lk);
  if (!lt) {
    const finer: BakedTemplate[] = [];
    for (let l = 1; l < level; l++) finer.push(getBakedTemplate(asset, variantId, l as LodLevel));
    lt = simplifyTemplate(tpl, finer, level);
    lodCache.set(lk, lt);
  }
  return lt;
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
  /** Étirement supplémentaire le long de l'axe X local (guirlandes, chaînes), défaut 1. */
  scaleX?: number;
  /** Décalage le long de l'axe X local avant rotation (segments répétés), défaut 0. */
  offsetX?: number;
}

/** Copie un gabarit dans un buffer du chunk. */
export function emitBaked(mesh: BakedMesh | null, dst: Buf, o: EmitOptions): void {
  if (!mesh) return;
  const s = o.scale ?? 1;
  const y0 = o.y ?? 0;
  const tint = o.tint ?? 1;
  const sxs = o.scaleX ?? 1;
  const ox = o.offsetX ?? 0;
  const c = Math.cos(o.rot ?? 0);
  const sn = Math.sin(o.rot ?? 0);
  const base = dst.pos.length / 3;
  const count = mesh.pos.length / 3;
  for (let i = 0; i < count; i++) {
    const px = mesh.pos[i * 3] * sxs + ox / s;
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
