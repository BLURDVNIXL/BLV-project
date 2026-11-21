/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * GARDE DE QUALITÉ DES LOD. Une simplification n'est acceptée que si la silhouette du modèle, vue de 7 directions et
 * rastérisée à la taille d'un demi-pixel, reste quasi identique à l'originale. Les feuillages sont de fines cartes
 * (palmes, fougères) : une erreur géométrique « sous le pixel » peut quand même en supprimer une ; ce test le détecte.
 * Module pur : aucune dépendance à Three.js ni au navigateur.
 */

export interface GuardMesh { pos: Float32Array; idx: Uint32Array }

/** Écart maximal toléré : part de la silhouette qui diffère (XOR / aire), pire des 7 vues. */
export const SILHOUETTE_TOLERANCE = 0.02;

const VIEWS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 1], [1, 0, -1], [0.6, 0.6, 0.5], [-0.5, 0.7, 0.5],
];

function basis(d: readonly [number, number, number]): { U: number[]; V: number[] } {
  const l = Math.hypot(d[0], d[1], d[2]);
  const n = [d[0] / l, d[1] / l, d[2] / l];
  const up = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]];
  const ul = Math.hypot(u[0], u[1], u[2]);
  const U = [u[0] / ul, u[1] / ul, u[2] / ul];
  const V = [n[1] * U[2] - n[2] * U[1], n[2] * U[0] - n[0] * U[2], n[0] * U[1] - n[1] * U[0]];
  return { U, V };
}

function raster(ms: GuardMesh[], U: number[], V: number[], cell: number, ox: number, oy: number, W: number, H: number): Uint8Array {
  const mask = new Uint8Array(W * H);
  for (const m of ms) {
    for (let t = 0; t < m.idx.length; t += 3) {
      const P: number[][] = [];
      for (let k = 0; k < 3; k++) {
        const i = m.idx[t + k] * 3;
        const x = m.pos[i], y = m.pos[i + 1], z = m.pos[i + 2];
        P.push([((U[0] * x + U[1] * y + U[2] * z) - ox) / cell, ((V[0] * x + V[1] * y + V[2] * z) - oy) / cell]);
      }
      const [a, b, c] = P;
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(den) < 1e-12) continue;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
      const x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      const y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den;
          const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den;
          if (l1 >= 0 && l2 >= 0 && 1 - l1 - l2 >= 0) mask[y * W + x] = 1;
        }
      }
    }
  }
  return mask;
}

/** Part de silhouette qui diffère entre `a` (référence) et `b`, au pire des 7 vues, pour des cellules de `cell` mètres. */
export function silhouetteDiff(a: GuardMesh[], b: GuardMesh[], cell: number): number {
  let worst = 0;
  for (const view of VIEWS) {
    const { U, V } = basis(view);
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const m of a) {
      for (let i = 0; i < m.pos.length; i += 3) {
        const x = m.pos[i], y = m.pos[i + 1], z = m.pos[i + 2];
        const u = U[0] * x + U[1] * y + U[2] * z;
        const w = V[0] * x + V[1] * y + V[2] * z;
        if (u < minx) minx = u; if (u > maxx) maxx = u; if (w < miny) miny = w; if (w > maxy) maxy = w;
      }
    }
    if (!Number.isFinite(minx)) return 0;
    const W = Math.ceil((maxx - minx) / cell) + 3;
    const H = Math.ceil((maxy - miny) / cell) + 3;
    const ma = raster(a, U, V, cell, minx - cell, miny - cell, W, H);
    const mb = raster(b, U, V, cell, minx - cell, miny - cell, W, H);
    let xor = 0, area = 0;
    for (let i = 0; i < ma.length; i++) { if (ma[i]) area++; if (ma[i] !== mb[i]) xor++; }
    worst = Math.max(worst, xor / Math.max(area, 1));
  }
  return worst;
}
