/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Transforme un chunk généré en objets Three.js : sol texturé, façades, toits et arbres fusionnés
 * (4 appels de dessin par chunk). Les façades utilisent une texture de fenêtres partagée.
 */

import * as THREE from 'three';
import { Building, ChunkData, CHUNK } from './city';

export interface ChunkMaterials {
  facade: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  trees: THREE.MeshLambertMaterial;
  dispose(): void;
}

function makeFacadeTextures(): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const W = 128;
  const H = 64;
  const draw = (lit: boolean): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d')!;
    g.fillStyle = lit ? '#000000' : '#f4f4f4';
    g.fillRect(0, 0, W, H);
    const pattern = [1, 0, 1, 1];
    for (let i = 0; i < 4; i++) {
      const x = i * 32 + 7;
      if (lit) {
        if (pattern[i]) { g.fillStyle = '#ffd68a'; g.fillRect(x, 12, 18, 30); }
      } else {
        g.fillStyle = '#c9ccd0'; g.fillRect(x - 2, 10, 22, 34);
        g.fillStyle = '#46607a'; g.fillRect(x, 12, 18, 30);
        g.fillStyle = '#6f8aa6'; g.fillRect(x, 12, 18, 8);
      }
    }
    return cv;
  };
  const mk = (cv: HTMLCanvasElement): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk(draw(false)), emissive: mk(draw(true)) };
}

export function createChunkMaterials(night: boolean): ChunkMaterials {
  const tex = makeFacadeTextures();
  const facade = new THREE.MeshStandardMaterial({ map: tex.map, vertexColors: true, roughness: 0.8, metalness: 0.05 });
  if (night) {
    facade.emissiveMap = tex.emissive;
    facade.emissive = new THREE.Color(0xffffff);
    facade.emissiveIntensity = 0.9;
  }
  const plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 });
  const trees = new THREE.MeshLambertMaterial({ vertexColors: true });
  return {
    facade, plain, trees,
    dispose: () => { tex.map.dispose(); tex.emissive.dispose(); facade.dispose(); plain.dispose(); trees.dispose(); }
  };
}

class Buf {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  quad(a: number[], b: number[], c: number[], d: number[], n: number[], uvs: number[], color: THREE.Color): void {
    const base = this.pos.length / 3;
    for (const v of [a, b, c, d]) { this.pos.push(v[0], v[1], v[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(color.r, color.g, color.b); }
    this.uv.push(...uvs);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  tri(a: number[], b: number[], c: number[], n: number[], color: THREE.Color): void {
    const base = this.pos.length / 3;
    for (const v of [a, b, c]) { this.pos.push(v[0], v[1], v[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(color.r, color.g, color.b); this.uv.push(0, 0); }
    this.idx.push(base, base + 1, base + 2);
  }
  geometry(): THREE.BufferGeometry | null {
    if (this.pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    return g;
  }
}

const TILE_W = 12;
const TILE_H = 3.4;
const PLAIN_KINDS = new Set(['shack', 'container', 'warehouse']);

function addBox(facade: Buf, plain: Buf, b: Building, y0 = 0): void {
  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);
  const e1 = [c, 0, s];
  const e2 = [-s, 0, c];
  const color = new THREE.Color(b.color);
  const roofColor = b.kind === 'house' ? new THREE.Color(0x9a3f2b) : b.kind === 'shack' ? new THREE.Color(0x6b6f73) : color.clone().multiplyScalar(0.62);
  const walls = PLAIN_KINDS.has(b.kind) ? plain : facade;
  const h = b.h;
  const faces: Array<{ n: number[]; half: number; len: number }> = [
    { n: e1, half: b.w / 2, len: b.d },
    { n: [-e1[0], 0, -e1[2]], half: b.w / 2, len: b.d },
    { n: e2, half: b.d / 2, len: b.w },
    { n: [-e2[0], 0, -e2[2]], half: b.d / 2, len: b.w }
  ];
  for (const f of faces) {
    const t = [f.n[2], 0, -f.n[0]];
    const bx = b.x + f.n[0] * f.half;
    const bz = b.z + f.n[2] * f.half;
    const v0 = [bx - (t[0] * f.len) / 2, y0, bz - (t[2] * f.len) / 2];
    const v1 = [bx + (t[0] * f.len) / 2, y0, bz + (t[2] * f.len) / 2];
    const v2 = [v1[0], y0 + h, v1[2]];
    const v3 = [v0[0], y0 + h, v0[2]];
    const u1 = f.len / TILE_W;
    const vv = h / TILE_H;
    walls.quad(v0, v1, v2, v3, f.n, [0, 0, u1, 0, u1, vv, 0, vv], color);
  }
  // Toit
  const corner = (sa: number, sb: number): number[] => [
    b.x + sa * (b.w / 2) * e1[0] + sb * (b.d / 2) * e2[0], y0 + h, b.z + sa * (b.w / 2) * e1[2] + sb * (b.d / 2) * e2[2]
  ];
  const up = [0, 1, 0];
  plain.tri(corner(-1, -1), corner(1, 1), corner(1, -1), up, roofColor);
  plain.tri(corner(-1, -1), corner(-1, 1), corner(1, 1), up, roofColor);
}

function addTree(buf: Buf, x: number, z: number, h: number, hash: number): void {
  const trunk = new THREE.Color(0x5b4128);
  const crown = new THREE.Color().setHSL(0.27 + ((hash % 7) - 3) * 0.008, 0.45, 0.28 + ((hash % 5) - 2) * 0.015);
  const tw = 0.22;
  const th = h * 0.45;
  // tronc : 4 faces
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const [dx, dz] of dirs) {
    const tx = dz;
    const tz = -dx;
    const bx = x + dx * tw;
    const bz = z + dz * tw;
    buf.quad([bx - tx * tw, 0, bz - tz * tw], [bx + tx * tw, 0, bz + tz * tw], [bx + tx * tw, th, bz + tz * tw], [bx - tx * tw, th, bz - tz * tw], [dx, 0, dz], [0, 0, 1, 0, 1, 1, 0, 1], trunk);
  }
  // houppier : cône à 6 faces
  const r = 1.2 + h * 0.16;
  const apex = [x, h, z];
  const N = 6;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const p0 = [x + Math.cos(a0) * r, th * 0.8, z + Math.sin(a0) * r];
    const p1 = [x + Math.cos(a1) * r, th * 0.8, z + Math.sin(a1) * r];
    const am = (a0 + a1) / 2;
    buf.tri(p0, apex, p1, [Math.cos(am) * 0.7, 0.7, Math.sin(am) * 0.7], crown);
  }
}

export interface ChunkObjects { group: THREE.Group; dispose(): void }

/** Construit les objets Three.js d'un chunk (sol + bâtiments + arbres). `ground` : RGBA n × n, rangée 0 = nord. */
export function buildChunkObjects(data: ChunkData, ground: Uint8Array, groundSize: number, mats: ChunkMaterials): ChunkObjects {
  const group = new THREE.Group();
  const disposables: Array<{ dispose(): void }> = [];

  // Sol
  const x0 = data.cx * CHUNK;
  const z0 = data.cz * CHUNK;
  const x1 = x0 + CHUNK;
  const z1 = z0 + CHUNK;
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute([x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0], 3));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  gg.setIndex([0, 1, 2, 0, 2, 3]);
  const tex = new THREE.DataTexture(ground, groundSize, groundSize, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const gmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
  const gmesh = new THREE.Mesh(gg, gmat);
  gmesh.receiveShadow = true;
  group.add(gmesh);
  disposables.push(gg, tex, gmat);

  // Bâtiments
  const facade = new Buf();
  const plain = new Buf();
  for (const b of data.buildings) {
    if (b.landmark === 'port_collider') continue;
    addBox(facade, plain, b);
  }
  const fg = facade.geometry();
  if (fg) { const m = new THREE.Mesh(fg, mats.facade); m.castShadow = true; m.receiveShadow = true; group.add(m); disposables.push(fg); }
  const pg = plain.geometry();
  if (pg) { const m = new THREE.Mesh(pg, mats.plain); m.castShadow = true; m.receiveShadow = true; group.add(m); disposables.push(pg); }

  // Arbres
  const tb = new Buf();
  data.trees.forEach((t, i) => addTree(tb, t.x, t.z, t.h, Math.abs(Math.floor(t.x * 7 + t.z * 13 + i)) | 0));
  const tg = tb.geometry();
  if (tg) { const m = new THREE.Mesh(tg, mats.trees); m.castShadow = true; group.add(m); disposables.push(tg); }

  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}
