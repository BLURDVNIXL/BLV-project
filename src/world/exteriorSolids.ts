/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Solides des structures extérieures visibles (étals du marché, paillote du maquis, portiques des lycées,
 * mât de la mairie, Pyramide, Tour Postel). Module PUR (ni Three ni moteur) : les dimensions sont celles
 * relues dans `src/3d/models.ts`. Les corps des bâtiments (halle, salles, hôpitaux…) ont déjà leur solide
 * `BUILDING` via `WorldStreamer` : ils ne sont PAS repris ici.
 * Les portes (zones `interior_door`, rayon 3,4 m centrées à d/2 + 2,4 m) et l'allée centrale du marché
 * (|x| < 8,5 m) restent libres.
 */

export type ExteriorSolidId = 'marche_adjame' | 'maquis' | 'lycee' | 'hopital' | 'mairie' | 'commissariat' | 'pyramide' | 'postel';

/** Solide en coordonnées MONDE, prêt pour `addBox` / `addCircle` (angle de boîte = −rotation.y de Three.js). */
export type ExteriorSolid =
  | { shape: 'box'; x: number; z: number; hx: number; hz: number; angle: number; h: number }
  | { shape: 'circle'; x: number; z: number; r: number; h: number };

/** Solide dans le repère LOCAL du groupe (avant rotation et translation du groupe). */
type LocalSolid =
  | { shape: 'box'; x: number; z: number; hx: number; hz: number; rotY: number; h: number }
  | { shape: 'circle'; x: number; z: number; r: number; h: number };

/** Position monde d'un point local (même convention que `houseToWorld` : rotation.y de Three.js = φ). */
export function localToWorld(cx: number, cz: number, rotationY: number, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}

// ───────────── Marché d'Adjamé (createMarketStallCluster) ─────────────

/** Table (3,4 × 1,7 × 0,88), caisse (0,65 × 0,55 × 0,45) et sacs empilés (0,58 × 0,44 × 0,60) d'un étal. */
function stallSolids(sx: number, sz: number, rotY: number): LocalSolid[] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const at = (a: number, b: number): { x: number; z: number } => ({ x: sx + a * c + b * s, z: sz - a * s + b * c });
  const crate = at(1.15, 1.05);
  const sacks = at(-1.18, 1.02);
  return [
    { shape: 'box', x: sx, z: sz, hx: 1.7, hz: 0.85, rotY, h: 0.88 },
    { shape: 'box', x: crate.x, z: crate.z, hx: 0.325, hz: 0.275, rotY, h: 0.45 },
    { shape: 'box', x: sacks.x, z: sacks.z, hx: 0.30, hz: 0.23, rotY, h: 0.60 },
  ];
}

function marketLocal(w: number, d: number): LocalSolid[] {
  const out: LocalSolid[] = [];
  // Parvis sud : 2 rangées de part et d'autre de l'allée centrale (mêmes positions que le rendu)
  for (const sz of [d / 2 + 6.8, d / 2 + 12.8]) {
    for (const sx of [-26, -18, -10.5, 10.5, 18, 26]) out.push(...stallSolids(sx, sz, 0));
  }
  // Ailes ouest et est : étals perpendiculaires
  for (const sx of [-(w / 2 + 5.8), w / 2 + 5.8]) {
    for (const sz of [-4.2, 3.8]) out.push(...stallSolids(sx, sz, Math.PI / 2));
  }
  return out;
}

// ───────────── Maquis Le Temple (createMaquisStructure) ─────────────

function maquisLocal(w: number, d: number): LocalSolid[] {
  const patioD = 5.2;
  const patioW = Math.min(13.6, w - 2.4);
  const postX = patioW / 2 - 0.6;
  const out: LocalSolid[] = [];
  // 4 poteaux de la paillote (passage central libre)
  for (const px of [-postX, postX]) {
    for (const pz of [d / 2 + 0.5, d / 2 + patioD - 0.5]) out.push({ shape: 'circle', x: px, z: pz, r: 0.18, h: 3.9 });
  }
  // 2 baffles géantes encadrant la façade
  for (const sx of [-4.4, 4.4]) out.push({ shape: 'box', x: sx, z: d / 2 + 0.48, hx: 0.55, hz: 0.45, rotY: 0, h: 2.1 });
  // 2 mange-debout (plateau r 0,65 à 0,95 m) + 4 tabourets colorés
  for (const tx of [-4.6, 4.6]) {
    out.push({ shape: 'circle', x: tx, z: d / 2 + 3.2, r: 0.65, h: 0.95 });
    const sideDir = tx < 0 ? -1 : 1;
    out.push({ shape: 'circle', x: tx + sideDir * 0.95, z: d / 2 + 2.85, r: 0.28, h: 0.48 });
    out.push({ shape: 'circle', x: tx + sideDir * 0.95, z: d / 2 + 3.65, r: 0.28, h: 0.48 });
  }
  // Brasero à charbon incandescent (côté droit de la terrasse)
  out.push({ shape: 'box', x: postX - 0.9, z: d / 2 + 1.9, hx: 0.575, hz: 0.325, rotY: 0, h: 0.81 });
  return out;
}

// ───────────── Lycées classiques (createClassicLyceeStructure) ─────────────

/** 2 piliers du portique à (±2,4 ; d/2 + 2,0) : 0,36 × 0,36 × 3,5. L'auvent (3,6 m) ne bloque pas. */
function lyceeLocal(d: number): LocalSolid[] {
  return [-2.4, 2.4].map((px): LocalSolid => ({ shape: 'box', x: px, z: d / 2 + 2.0, hx: 0.18, hz: 0.18, rotY: 0, h: 3.5 }));
}

// ───────────── Hôpitaux (createHospitalExterior, src/3d/interiors.ts) ─────────────

/** 2 piliers de l'auvent à (±2,8 ; d/2 + 2,4) : 0,28 × 0,28 × 3,3. Le passage central (≈ 5,3 m) reste libre. */
function hopitalLocal(d: number): LocalSolid[] {
  return [-2.8, 2.8].map((px): LocalSolid => ({ shape: 'box', x: px, z: d / 2 + 2.4, hx: 0.14, hz: 0.14, rotY: 0, h: 3.3 }));
}

// ───────────── Mairie du Plateau (createMairiePlateauLandmark) ─────────────

/** Mât du drapeau. Le perron (0,44 m) et les colonnes (dans l'emprise solide du corps) ne sont pas repris. */
function mairieLocal(): LocalSolid[] {
  return [{ shape: 'circle', x: 7.2, z: 6.2, r: 0.12, h: 11 }];
}

// ───────────── Commissariats (createCommissariatExterior, src/3d/interiors.ts) ─────────────
/** 2 piliers du portique (±2,6 ; d/2 + 2,0), mât de drapeau à droite (6,2 ; 5,4) et 2 bornes latérales (±4,5 ; d/2 + 1,8). */
function commissariatLocal(d: number): LocalSolid[] {
  return [
    { shape: 'box', x: -2.6, z: d / 2 + 2.0, hx: 0.16, hz: 0.16, rotY: 0, h: 3.4 },
    { shape: 'box', x: 2.6, z: d / 2 + 2.0, hx: 0.16, hz: 0.16, rotY: 0, h: 3.4 },
    { shape: 'circle', x: 6.2, z: 5.4, r: 0.10, h: 9.5 },
    { shape: 'circle', x: -4.5, z: d / 2 + 1.8, r: 0.22, h: 0.85 },
    { shape: 'circle', x: 4.5, z: d / 2 + 1.8, r: 0.22, h: 0.85 },
  ];
}

// ───────────── Repères hors `SPECIALS` ─────────────

/** Pyramide : soubassement 16 × 16 × 4 (les gradins sont au-dessus). */
function pyramideLocal(): LocalSolid[] {
  return [{ shape: 'box', x: 0, z: 0, hx: 8, hz: 8, rotY: 0, h: 4 }];
}

/** Tour Postel : noyau 12 × 12 × 42. */
function postelLocal(): LocalSolid[] {
  return [{ shape: 'box', x: 0, z: 0, hx: 6, hz: 6, rotY: 0, h: 42 }];
}

/**
 * Solides monde d'une structure posée en (cx, cz) avec la rotation Three.js `rotationY` (celle du groupe).
 * `w`, `d` : emprise du repère (celle passée au constructeur de modèle).
 */
export function exteriorSolidsFor(id: ExteriorSolidId, cx: number, cz: number, rotationY: number, w: number, d: number): ExteriorSolid[] {
  let local: LocalSolid[];
  switch (id) {
    case 'marche_adjame': local = marketLocal(w, d); break;
    case 'maquis': local = maquisLocal(w, d); break;
    case 'lycee': local = lyceeLocal(d); break;
    case 'hopital': local = hopitalLocal(d); break;
    case 'mairie': local = mairieLocal(); break;
    case 'commissariat': local = commissariatLocal(d); break;
    case 'pyramide': local = pyramideLocal(); break;
    case 'postel': local = postelLocal(); break;
  }
  return local.map((l): ExteriorSolid => {
    const p = localToWorld(cx, cz, rotationY, l.x, l.z);
    if (l.shape === 'circle') return { shape: 'circle', x: p.x, z: p.z, r: l.r, h: l.h };
    return { shape: 'box', x: p.x, z: p.z, hx: l.hx, hz: l.hz, angle: -(rotationY + l.rotY), h: l.h };
  });
}
