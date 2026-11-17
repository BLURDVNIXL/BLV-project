/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Modèles 3D des intérieurs et des hôpitaux. Les murs s'effacent côté caméra avec le même WallFader que la maison du joueur.
 * Les murs sont de simples boîtes ; seul un nombre fixe de matériaux est utilisé (pas de coût par bâtiment).
 */
import * as THREE from 'three';
import { InteriorDef, PublicInteriorId } from '../world/interiors';
import { FadeWall, WallFader } from './wallFader';

// ───────────── Aides de construction ─────────────

function std(color: number, o: { rough?: number; emissive?: number; glow?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.glow ?? 0
  });
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

function signTexture(text: string, bg: string, fg: string, w = 512, h = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 64;
  g.font = `bold ${size}px sans-serif`;
  while (g.measureText(text).width > w - 56 && size > 20) { size -= 4; g.font = `bold ${size}px sans-serif`; }
  g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sign(text: string, bg: string, fg: string, w: number, h: number, glow = 0.35): THREE.Mesh {
  const tex = signTexture(text, bg, fg);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: glow, roughness: 0.6 }));
  return m;
}

// ───────────── Hôpital : extérieur (bâtiment héros) ─────────────

/** Façade +z. Centre du modèle = centre de l'emprise, base à y = 0. */
export function createHospitalExterior(w: number, d: number, h: number, name: string): THREE.Group {
  const g = new THREE.Group();
  const wall = std(0xf2efe8, { rough: 0.8 });
  const trim = std(0xd9d5cb, { rough: 0.8 });
  const glass = std(0x7cc3e6, { rough: 0.2, metal: 0.1 });
  const red = std(0xdc2626, { rough: 0.5 });

  g.add(box(w, h, d, wall, 0, h / 2, 0));
  g.add(box(w + 0.8, 0.4, d + 0.8, trim, 0, h + 0.2, 0));
  g.add(box(w + 0.3, 0.5, d + 0.3, trim, 0, 0.25, 0, false)); // soubassement

  // Bandeaux de fenêtres (2 étages) sur les 4 faces
  for (const y of [h * 0.4, h * 0.72]) {
    g.add(box(w * 0.82, 1.25, 0.08, glass, 0, y, d / 2 + 0.04, false));
    g.add(box(w * 0.82, 1.25, 0.08, glass, 0, y, -d / 2 - 0.04, false));
    g.add(box(0.08, 1.25, d * 0.72, glass, w / 2 + 0.04, y, 0, false));
    g.add(box(0.08, 1.25, d * 0.72, glass, -w / 2 - 0.04, y, 0, false));
  }

  // Porte vitrée + auvent rouge + piliers
  g.add(box(2.8, 2.7, 0.12, std(0x1e3a5f, { rough: 0.2 }), 0, 1.5, d / 2 + 0.06, false));
  g.add(box(6, 0.3, 2.6, red, 0, 3.35, d / 2 + 1.3));
  for (const sx of [-2.8, 2.8]) g.add(box(0.28, 3.3, 0.28, trim, sx, 1.65, d / 2 + 2.4));

  // Enseigne
  const board = sign(name.toUpperCase(), '#ffffff', '#b91c1c', 8, 1.6);
  board.position.set(0, 4.7, d / 2 + 0.12);
  g.add(board);

  // Croix rouge sur le toit (repère visible de loin)
  g.add(box(1.4, 4.6, 0.6, red, 0, h + 2.7, d / 2 - 1.2));
  g.add(box(4.6, 1.4, 0.6, red, 0, h + 2.7, d / 2 - 1.2));
  return g;
}

// ───────────── Intérieurs ─────────────

export type InteriorFurnitureBuilder = (g: THREE.Group, def: InteriorDef) => ((nowSec: number, dt: number) => void) | void;

const FURNITURE_BUILDERS: Record<PublicInteriorId, InteriorFurnitureBuilder> = {
  hopital: buildHospitalFurniture,
  maquis: buildMaquisFurniture,
  marche_adjame: buildMarcheFurniture,
  mairie: buildMairieFurniture,
  lycee_caiman: buildLyceeCaimanFurniture,
  lycee_alysma: buildLyceeAlysmaFurniture,
  lycee_alex: buildLyceeAlexFurniture,
};

export interface InteriorRig {
  group: THREE.Group;
  fader: WallFader;
  exitRing?: THREE.Mesh;
  actionRings: THREE.Mesh[];
  animate?: (nowSec: number, dt: number) => void;
  dispose: () => void;
}

export function createInteriorRig(def: InteriorDef, customFurniture?: InteriorFurnitureBuilder): InteriorRig {
  const g = new THREE.Group();
  g.position.set(def.origin.x, 0, def.origin.z);
  const { theme } = def;
  const glow = theme.wallGlow ?? 0.3;
  const floorMat = std(theme.floorColor, { rough: 0.35, emissive: theme.floorColor, glow: theme.floorGlow ?? 0.18 });
  const wallColor = theme.wallColor;
  const mkWall = () => new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.75, emissive: wallColor, emissiveIntensity: glow, transparent: false });
  const divColor = theme.partitionColor ?? wallColor;
  const mats = { n: mkWall(), w: mkWall(), e: mkWall(), s: mkWall(), div: new THREE.MeshStandardMaterial({ color: divColor, roughness: 0.75, emissive: divColor, emissiveIntensity: glow }) };

  const W = def.halfW * 2, D = def.halfD * 2;
  g.add(box(W + 4, 0.1, D + 4, floorMat, 0, 0.05, 0, false)); // sol (déborde un peu sous les murs)
  if (theme.runnerColor !== undefined) {
    g.add(box(2.6, 0.02, D - 1, std(theme.runnerColor, { emissive: theme.runnerColor, glow: theme.runnerGlow ?? 0.25 }), 0, 0.11, 0, false));
  }

  // Plafond : face tournée vers le bas → visible de l'intérieur, transparent vu d'en haut
  const ceilColor = theme.ceilingColor ?? 0xffffff;
  const ceilMat = new THREE.MeshStandardMaterial({ color: ceilColor, roughness: 0.9, emissive: ceilColor, emissiveIntensity: theme.ceilingGlow ?? 0.25 });
  const czMin = def.ceilingZMin ?? -def.halfD;
  const czMax = def.ceilingZMax ?? def.halfD;
  const ceilD = Math.max(0.5, czMax - czMin);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, ceilD), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, def.wallH, (czMin + czMax) / 2);
  ceil.castShadow = true;
  g.add(ceil);

  const walls: FadeWall[] = [];
  const reg = (b: (typeof def.boxes)[number]) => {
    let m = mats.n, nx = 0, nz = -1;
    if (b.z >= def.halfD - 0.01) { m = mats.s; nz = 1; }
    else if (b.z > -def.halfD + 0.01) { m = b.x < 0 ? mats.w : mats.e; nx = b.x < 0 ? -1 : 1; nz = 0; }
    g.add(box(b.hx * 2, b.h, b.hz * 2, m, b.x, b.h / 2, b.z));
    walls.push({ mats: [m], lx: b.x, lz: b.z, nx, nz, mode: 'shell' });
  };
  def.boxes.filter((b) => b.kind === 'wall').forEach(reg);
  // Cloisons basses : ne cachent jamais la caméra, pas de fondu
  def.boxes.filter((b) => b.kind === 'partition').forEach((b) => g.add(box(b.hx * 2, b.h, b.hz * 2, mats.div, b.x, b.h / 2, b.z)));

  const built = customFurniture
    ? customFurniture(g, def)
    : def.id in FURNITURE_BUILDERS
      ? FURNITURE_BUILDERS[def.id as PublicInteriorId](g, def)
      : undefined;
  const animate = built || undefined;

  let ring: THREE.Mesh | undefined;
  if (def.hasStreetExit !== false) {
    // Linteau et enseigne « SORTIE » au-dessus de la porte
    const doorTop = 2.5;
    if (def.wallH > doorTop + 0.05) {
      g.add(box(def.doorWidth + 0.5, def.wallH - doorTop, 0.34, mats.s, 0, doorTop + (def.wallH - doorTop) / 2, def.halfD));
    }
    const sortie = sign('SORTIE', '#14532d', '#ffffff', 1.9, 0.5, 0.9);
    sortie.rotation.y = Math.PI;
    sortie.position.set(0, Math.min(doorTop - 0.3, def.wallH - 0.3), def.halfD - 0.2);
    g.add(sortie);

    // Anneau « Sortir »
    ring = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(def.exit.x, 0.14, def.exit.z);
    g.add(ring);
  }

  // Anneaux des éventuelles zones d'action internes
  const actionRings: THREE.Mesh[] = [];
  for (const act of def.actions ?? []) {
    const ar = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 24),
      new THREE.MeshBasicMaterial({ color: act.color, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    ar.rotation.x = -Math.PI / 2;
    ar.position.set(act.x, 0.14, act.z);
    g.add(ar);
    actionRings.push(ar);
  }

  const fader = new WallFader(walls);
  const disposeMat = (mat: THREE.Material) => {
    const stdMat = mat as THREE.MeshStandardMaterial;
    stdMat.map?.dispose();
    if (stdMat.emissiveMap && stdMat.emissiveMap !== stdMat.map) stdMat.emissiveMap.dispose();
    mat.dispose();
  };
  const dispose = () => {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mm = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mm)) mm.forEach(disposeMat); else if (mm) disposeMat(mm);
    });
  };
  return { group: g, fader, exitRing: ring, actionRings, animate, dispose };
}

function buildHospitalFurniture(g: THREE.Group, def: InteriorDef): void {
  const white = std(0xffffff, { emissive: 0xffffff, glow: 0.2 });
  const wood = std(0xb08968);
  const teal = std(0x2a9d8f, { emissive: 0x2a9d8f, glow: 0.15 });
  const metal = std(0xcbd5e1, { metal: 0.5, rough: 0.35 });

  // Comptoir d'accueil (-4, 2.8)
  g.add(box(3.2, 1.0, 1.0, teal, -4, 0.55, 2.8));
  g.add(box(3.4, 0.1, 1.2, white, -4, 1.1, 2.8));
  g.add(box(0.7, 0.45, 0.06, std(0x0ea5e9, { emissive: 0x0284c7, glow: 0.6 }), -4.6, 1.38, 2.55)); // écran
  // Banc de la salle d'attente (5, 3.7)
  g.add(box(3.0, 0.1, 0.8, wood, 5, 0.45, 3.7));
  g.add(box(3.0, 0.5, 0.1, wood, 5, 0.75, 4.05));
  for (const sx of [-1.3, 1.3]) g.add(box(0.1, 0.4, 0.7, metal, 5 + sx, 0.22, 3.7, false));

  // Lits : cadre, matelas, oreiller, couverture (lit 1 en vert vif)
  const bed = (x: number, z: number, blanket: number) => {
    g.add(box(2.0, 0.4, 1.5, metal, x, 0.35, z));
    g.add(box(1.9, 0.2, 1.4, white, x, 0.62, z));
    g.add(box(0.55, 0.12, 1.1, white, x - 0.65, 0.78, z));
    g.add(box(1.2, 0.14, 1.36, std(blanket, { emissive: blanket, glow: 0.15 }), x + 0.3, 0.76, z));
    // potence de perfusion
    g.add(box(0.05, 1.8, 0.05, metal, x + 1.1, 0.9, z - 0.55, false));
    g.add(box(0.22, 0.3, 0.1, std(0xbfe9ff, { rough: 0.2 }), x + 1.1, 1.65, z - 0.55, false));
  };
  bed(-6.5, -3.9, 0x7dd3fc);
  bed(-2.5, -3.9, 0x7dd3fc);
  bed(6.2, -3.9, 0x4ade80);

  // Panneaux : accueil + flèche chambres sur la cloison (face sud), numéro du lit 1 au mur nord
  const acc = sign('ACCUEIL', '#0f766e', '#ffffff', 1.9, 0.48, 0.7);
  acc.position.set(-4, 0.62, 3.32);
  g.add(acc);
  const ch = sign('CHAMBRES →', '#1d4ed8', '#ffffff', 2.6, 0.6, 0.7);
  ch.position.set(-3, 0.7, -0.84);
  g.add(ch);
  const n1 = sign('LIT 1', '#ffffff', '#15803d', 1.4, 0.5, 0.5);
  n1.position.set(6.2, 2.0, -def.halfD + 0.2);
  g.add(n1);
  // Croix rouge murale au fond de l'accueil
  const cross = std(0xdc2626, { emissive: 0xdc2626, glow: 0.4 });
  g.add(box(0.08, 1.5, 0.5, cross, -8.8, 2.0, 2.0, false));
  g.add(box(0.08, 0.5, 1.5, cross, -8.8, 2.0, 2.0, false));
}

function buildMaquisFurniture(g: THREE.Group, def: InteriorDef): void {
  const darkWood = std(0x451a03, { rough: 0.78 });
  const wood = std(0x9a3412, { rough: 0.72 });
  const amber = std(0xf59e0b, { emissive: 0xd97706, glow: 0.28, rough: 0.4 });
  const orange = std(0xea580c, { emissive: 0xea580c, glow: 0.16 });
  const spkBody = std(0x09090b, { rough: 0.55 });
  const spkCone = std(0x27272a, { rough: 0.4 });
  const neonPink = std(0xf43f5e, { emissive: 0xf43f5e, glow: 0.85 });
  const bulbMat = std(0xfde047, { emissive: 0xfbbf24, glow: 0.95 });
  const glass = std(0xbef264, { emissive: 0x84cc16, glow: 0.25, rough: 0.2 });

  // Comptoir-bar principal au nord (0, -4.2)
  g.add(box(6.6, 1.05, 1.2, darkWood, 0, 0.57, -4.2));
  g.add(box(6.9, 0.12, 1.45, amber, 0, 1.15, -4.2));
  // Étagère à bouteilles contre le mur nord derrière le bar
  g.add(box(5.4, 0.12, 0.45, wood, 0, 1.65, -def.halfD + 0.42));
  for (let i = -4; i <= 4; i++) {
    g.add(box(0.16, 0.42, 0.16, i % 2 === 0 ? glass : orange, i * 0.52, 1.92, -def.halfD + 0.42, false));
  }

  // Enseignes courtes (lisibles quel que soit le destin)
  const barSign = sign('BAR', '#7c2d12', '#fde047', 1.6, 0.48, 0.8);
  barSign.position.set(0, 0.65, -3.56);
  g.add(barSign);

  const templeSign = sign('TEMPLE', '#451a03', '#fbbf24', 3.4, 0.72, 0.75);
  templeSign.position.set(0, 2.75, -def.halfD + 0.18);
  g.add(templeSign);

  // Tables conviviales + 4 tabourets (alignées sur les props de MAQUIS_INTERIOR)
  const tablePositions: Array<[number, number]> = [
    [-5.5, 2.4],
    [5.5, 2.4],
    [-5.6, -3.4],
    [5.6, -2.6],
  ];
  for (const [tx, tz] of tablePositions) {
    g.add(box(1.5, 0.1, 1.1, wood, tx, 0.78, tz));
    g.add(box(0.24, 0.72, 0.24, darkWood, tx, 0.4, tz));
    for (const [sx, sz] of [[-0.9, 0], [0.9, 0], [0, -0.7], [0, 0.7]]) {
      g.add(box(0.36, 0.1, 0.36, orange, tx + sx, 0.48, tz + sz, false));
      g.add(box(0.12, 0.42, 0.12, darkWood, tx + sx, 0.24, tz + sz, false));
    }
    // Assiettes / boissons posées sur la table
    g.add(box(0.32, 0.06, 0.32, amber, tx - 0.3, 0.86, tz, false));
    g.add(box(0.14, 0.22, 0.14, glass, tx + 0.3, 0.94, tz + 0.1, false));
  }

  // Deux enceintes DJ dans les coins nord
  for (const sx of [-8.1, 8.1]) {
    g.add(box(1.0, 1.9, 1.0, spkBody, sx, 1.0, -5.1));
    g.add(box(0.62, 0.62, 0.08, spkCone, sx, 1.35, -4.58, false));
    g.add(box(0.7, 0.08, 0.08, neonPink, sx, 1.85, -4.58, false));
  }

  // Guirlande festive sous le plafond
  for (const gx of [-4.5, -1.5, 1.5, 4.5]) {
    g.add(box(0.18, 0.18, 0.18, bulbMat, gx, def.wallH - 0.28, -0.4, false));
  }
}

function buildMarcheFurniture(g: THREE.Group, def: InteriorDef): void {
  const wood = std(0x92400e, { rough: 0.82 });
  const darkWood = std(0x451a03, { rough: 0.78 });
  const ochre = std(0xf59e0b, { emissive: 0xd97706, glow: 0.18, rough: 0.55 });
  const cream = std(0xfef3c7, { rough: 0.75 });
  const emerald = std(0x10b981, { emissive: 0x059669, glow: 0.2 });
  const canopyPalette = [0xf97316, 0x16a34a, 0x2563eb, 0xeab308, 0xdc2626, 0x9333ea].map((c) => std(c, { rough: 0.7 }));
  const goodsPalette = [0xef4444, 0xfacc15, 0x22c55e, 0xec4899, 0x3b82f6].map((c) => std(c, { rough: 0.6 }));

  // Comptoir des grossistes (Commerce) au nord (0, -6.4)
  g.add(box(7.0, 1.05, 1.4, darkWood, 0, 0.57, -6.4));
  g.add(box(7.3, 0.12, 1.6, ochre, 0, 1.15, -6.4));
  g.add(box(0.8, 0.55, 0.45, emerald, -1.8, 1.48, -6.4));
  g.add(box(1.1, 0.35, 0.7, cream, 1.6, 1.38, -6.4));

  const commerceSign = sign('COMMERCE', '#065f46', '#ffffff', 2.4, 0.52, 0.75);
  commerceSign.position.set(0, 0.65, -5.68);
  g.add(commerceSign);

  const hallSign = sign('ADJAMÉ', '#9a3412', '#fef08a', 4.2, 0.82, 0.75);
  hallSign.position.set(0, 3.2, -def.halfD + 0.22);
  g.add(hallSign);

  // 6 îlots d'étals intérieurs (alignés sur MARCHE_INTERIOR.boxes)
  const stalls: Array<[number, number]> = [
    [-8.6, 3.0],
    [-8.6, -1.4],
    [-8.6, -5.6],
    [8.6, 3.0],
    [8.6, -1.4],
    [8.6, -5.6],
  ];
  stalls.forEach(([sx, sz], i) => {
    const inward = sx < 0 ? 1 : -1;
    g.add(box(3.5, 0.88, 1.9, wood, sx, 0.46, sz));
    g.add(box(3.7, 0.14, 2.2, canopyPalette[i % canopyPalette.length], sx, 2.65, sz));
    for (const pz of [-0.8, 0.8]) {
      g.add(box(0.12, 2.5, 0.12, darkWood, sx - inward * 1.5, 1.35, sz + pz, false));
    }
    // Marchandises colorées (pagnes, fruits, épices) sur la table et caisses devant
    for (let k = -1; k <= 1; k++) {
      g.add(box(0.85, 0.34, 0.65, goodsPalette[(i + k + 5) % goodsPalette.length], sx + k * 0.95, 1.08, sz + 0.15, false));
    }
    g.add(box(0.75, 0.42, 0.65, cream, sx + inward * 0.9, 0.25, sz + 1.2, false));
  });

  // Les vendeurs et les clients sont déclarés dans `InteriorDef.npcs` (animés par `NpcSystem`).
}

function buildMairieFurniture(g: THREE.Group, def: InteriorDef): void {
  const marble = std(0xf1f5f9, { rough: 0.45 });
  const mahogany = std(0x5c2c16, { rough: 0.65 });
  const brass = std(0xfbbf24, { emissive: 0xd97706, glow: 0.22, rough: 0.35, metal: 0.3 });
  const civicTeal = std(0x0f766e, { emissive: 0x0f766e, glow: 0.16 });
  const metal = std(0xcbd5e1, { metal: 0.45, rough: 0.35 });

  // Tribune / bureau d'honneur du maire au nord (0, -5.0)
  g.add(box(6.6, 1.0, 1.6, mahogany, 0, 0.55, -5.0));
  g.add(box(6.9, 0.12, 1.85, marble, 0, 1.11, -5.0));
  g.add(box(1.1, 0.14, 0.7, brass, 0, 1.24, -5.0, false));
  g.add(box(0.85, 0.3, 0.6, std(0xffffff, { rough: 0.7 }), -2.0, 1.32, -5.0, false));

  // Colonnes d'apparat et étendards tricolores ivoiriens visibles au mur nord (entre MAIRIE et les colonnes)
  for (const sx of [-4.8, 4.8]) {
    g.add(box(0.9, 3.0, 0.9, marble, sx, 1.55, -5.4));
    g.add(box(1.1, 0.25, 1.1, brass, sx, 3.05, -5.4));
  }
  for (const fx of [-3.1, 3.1]) {
    [0xf97316, 0xffffff, 0x16a34a].forEach((c, idx) => {
      g.add(box(0.32, 2.0, 0.08, std(c, { emissive: c, glow: 0.22 }), fx - 0.32 + idx * 0.32, 2.25, -def.halfD + 0.22, false));
    });
  }

  // Enseignes courtes lisibles quel que soit le destin
  const mairieBoard = sign('MAIRIE', '#0f766e', '#ffffff', 3.4, 0.72, 0.7);
  mairieBoard.position.set(0, 2.75, -def.halfD + 0.22);
  g.add(mairieBoard);

  const tribuneBoard = sign('PLATEAU', '#451a03', '#fef08a', 2.2, 0.48, 0.65);
  tribuneBoard.position.set(0, 0.62, -4.16);
  g.add(tribuneBoard);

  // Guichet état civil à l'ouest (-6.8, 2.2)
  g.add(box(3.1, 1.0, 1.3, civicTeal, -6.8, 0.55, 2.2));
  g.add(box(3.3, 0.12, 1.5, marble, -6.8, 1.11, 2.2));
  g.add(box(0.68, 0.44, 0.08, std(0x0ea5e9, { emissive: 0x0284c7, glow: 0.5 }), -7.5, 1.39, 1.9, false));
  const accueilSign = sign('ACCUEIL', '#0f766e', '#ffffff', 1.9, 0.46, 0.7);
  accueilSign.position.set(-6.8, 0.62, 2.88);
  g.add(accueilSign);

  // Bancs d'attente à l'est (6.6, 1.4) et (6.6, 3.4)
  for (const bz of [1.4, 3.4]) {
    g.add(box(2.9, 0.12, 0.85, mahogany, 6.6, 0.48, bz));
    g.add(box(2.9, 0.46, 0.12, mahogany, 6.6, 0.76, bz + 0.36));
    for (const sx of [-1.2, 1.2]) g.add(box(0.12, 0.42, 0.75, metal, 6.6 + sx, 0.24, bz, false));
  }

  // Appliques dorées sur les murs est/ouest (sans couper la vue centrale vers MAIRIE)
  for (const wx of [-def.halfW + 0.22, def.halfW - 0.22]) {
    for (const lz of [-3.2, 0.8, 4.2]) {
      g.add(box(0.12, 0.55, 0.22, brass, wx, 2.55, lz, false));
    }
  }

  // Les agents et les administrés sont déclarés dans `InteriorDef.npcs` (animés par `NpcSystem`).
}

function addBookcase(
  g: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  wood: THREE.Material,
  bookPalette: THREE.Material[]
): void {
  const inward = x < 0 ? 1 : -1;
  g.add(box(w * 0.72, h, d, wood, x - inward * (w * 0.14), h / 2 + 0.05, z));
  const shelves = [0.65, 1.25, 1.85];
  shelves.forEach((sy, rowIdx) => {
    g.add(box(w * 0.96, 0.06, d * 0.96, wood, x, sy - 0.18, z, false));
    for (let k = -1; k <= 1; k++) {
      g.add(box(w * 0.36, 0.34, d * 0.25, bookPalette[(rowIdx + k + 4) % bookPalette.length], x + inward * (w * 0.24), sy, z + k * (d * 0.28), false));
    }
  });
}

function buildLyceeCaimanFurniture(g: THREE.Group, def: InteriorDef): void {
  const oak = std(0x92400e, { rough: 0.72 });
  const deskTop = std(0xd97706, { rough: 0.58 });
  const darkWood = std(0x451a03, { rough: 0.78 });
  const boardMat = std(0x14532d, { emissive: 0x166534, glow: 0.18, rough: 0.55 });
  const chalkMat = std(0xfefce8, { emissive: 0xfefce8, glow: 0.25, rough: 0.6 });
  const brass = std(0xf59e0b, { emissive: 0xd97706, glow: 0.25, rough: 0.35 });
  const books = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706].map((c) => std(c, { rough: 0.65 }));

  // Tableau noir encadré de bois au mur nord
  g.add(box(6.4, 1.65, 0.12, darkWood, 0, 1.95, -def.halfD + 0.18, false));
  g.add(box(6.0, 1.38, 0.14, boardMat, 0, 1.95, -def.halfD + 0.2, false));
  g.add(box(2.8, 0.06, 0.16, chalkMat, -0.8, 2.2, -def.halfD + 0.22, false));
  g.add(box(3.4, 0.06, 0.16, chalkMat, 0.4, 1.85, -def.halfD + 0.22, false));

  const caimanSign = sign('CAÏMAN', '#78350f', '#fef08a', 3.4, 0.7, 0.7);
  caimanSign.position.set(0, 3.22, -def.halfD + 0.22);
  g.add(caimanSign);

  // Bureau du professeur au nord (0, -4.6)
  g.add(box(5.4, 0.96, 1.35, oak, 0, 0.53, -4.6));
  g.add(box(5.7, 0.1, 1.55, deskTop, 0, 1.06, -4.6));
  g.add(box(0.85, 0.24, 0.6, chalkMat, -1.4, 1.22, -4.6, false));
  const classeSign = sign('CLASSE', '#92400e', '#fffbeb', 1.9, 0.44, 0.65);
  classeSign.position.set(0, 0.58, -3.89);
  g.add(classeSign);

  // 6 rangées de pupitres en bois (ailes ouest et est)
  for (const dx of [-4.6, 4.6]) {
    for (const dz of [-2.2, -0.2, 1.8]) {
      g.add(box(2.9, 0.08, 0.95, deskTop, dx, 0.76, dz));
      g.add(box(2.7, 0.55, 0.12, oak, dx, 0.45, dz - 0.35));
      for (const lx of [-1.25, 1.25]) g.add(box(0.12, 0.7, 0.8, darkWood, dx + lx, 0.38, dz, false));
      g.add(box(2.7, 0.08, 0.4, oak, dx, 0.46, dz + 0.42, false));
      g.add(box(0.55, 0.06, 0.4, chalkMat, dx - 0.65, 0.83, dz - 0.05, false));
      g.add(box(0.55, 0.06, 0.4, chalkMat, dx + 0.65, 0.83, dz - 0.05, false));
    }
  }

  // Armoires à livres aux coins nord
  addBookcase(g, -8.6, -4.8, 1.3, 2.3, 2.2, darkWood, books);
  addBookcase(g, 8.6, -4.8, 1.3, 2.3, 2.2, darkWood, books);

  // Appliques chaudes sur les murs latéraux
  for (const wx of [-def.halfW + 0.22, def.halfW - 0.22]) {
    for (const lz of [-3.0, 0.5, 4.0]) {
      g.add(box(0.12, 0.5, 0.22, brass, wx, 2.55, lz, false));
    }
  }

  // Enseignant et élèves : déclarés dans `InteriorDef.npcs` (animés par `NpcSystem`).
}

function buildLyceeAlysmaFurniture(g: THREE.Group, def: InteriorDef): void {
  const cherry = std(0x881337, { rough: 0.62 });
  const ivory = std(0xfff1f2, { rough: 0.48 });
  const wood = std(0x5c2c16, { rough: 0.68 });
  const rose = std(0xbe123c, { emissive: 0xbe123c, glow: 0.18 });
  const gold = std(0xfbbf24, { emissive: 0xd97706, glow: 0.25, rough: 0.3 });
  const pages = std(0xfefce8, { rough: 0.7 });
  const metal = std(0xcbd5e1, { metal: 0.4, rough: 0.35 });
  const books = [0xbe123c, 0xf59e0b, 0x0f766e, 0x1d4ed8].map((c) => std(c, { rough: 0.6 }));

  // Panneau académique bordeaux + pilastres sur le mur nord
  g.add(box(6.4, 1.8, 0.14, cherry, 0, 1.95, -def.halfD + 0.18, false));
  for (const px of [-3.6, 3.6]) {
    g.add(box(0.45, 3.4, 0.3, ivory, px, 1.75, -def.halfD + 0.22, false));
  }
  const alysmaSign = sign('ALYSMA', '#9f1239', '#fff1f2', 3.4, 0.72, 0.72);
  alysmaSign.position.set(0, 3.22, -def.halfD + 0.22);
  g.add(alysmaSign);

  // Chaire du professeur au nord (0, -4.8)
  g.add(box(5.4, 0.98, 1.35, cherry, 0, 0.54, -4.8));
  g.add(box(5.7, 0.1, 1.55, ivory, 0, 1.08, -4.8));
  g.add(box(0.75, 0.24, 0.55, pages, 0.8, 1.24, -4.8, false));
  const lettresSign = sign('LETTRES', '#881337', '#fef08a', 2.0, 0.46, 0.65);
  lettresSign.position.set(0, 0.6, -4.09);
  g.add(lettresSign);

  // Deux grandes tables de séminaire (ouest et est) avec livres et lampes dorées
  for (const tx of [-5.2, 5.2]) {
    g.add(box(2.6, 0.12, 4.4, wood, tx, 0.76, -1.4));
    for (const sz of [-1.7, 1.7]) g.add(box(2.1, 0.66, 0.2, cherry, tx, 0.4, -1.4 + sz));
    for (const lz of [-2.4, 0, 2.4]) {
      g.add(box(0.24, 0.32, 0.24, gold, tx, 0.98, -1.4 + lz * 0.6, false));
      g.add(box(0.6, 0.14, 0.46, pages, tx + (tx < 0 ? 0.5 : -0.5), 0.88, -1.4 + lz * 0.55, false));
    }
  }

  // Bibliothèques et bancs d'étude
  addBookcase(g, -8.6, -4.8, 1.3, 2.6, 2.3, wood, books);
  addBookcase(g, 8.6, -4.8, 1.3, 2.6, 2.3, wood, books);
  for (const bx of [-6.2, 6.2]) {
    g.add(box(2.9, 0.14, 0.9, rose, bx, 0.48, 4.0));
    g.add(box(2.9, 0.44, 0.12, wood, bx, 0.74, 4.4));
    for (const lx of [-1.2, 1.2]) g.add(box(0.12, 0.42, 0.75, metal, bx + lx, 0.24, 4.0, false));
  }

  // Appliques sur les murs latéraux
  for (const wx of [-def.halfW + 0.22, def.halfW - 0.22]) {
    for (const lz of [-3.0, 0.5, 4.0]) {
      g.add(box(0.12, 0.52, 0.22, gold, wx, 2.55, lz, false));
    }
  }

  // Enseignante et élèves : déclarés dans `InteriorDef.npcs` (animés par `NpcSystem`).
}

function buildLyceeAlexFurniture(g: THREE.Group, def: InteriorDef): void {
  const whiteLab = std(0xf8fafc, { rough: 0.35 });
  const silver = std(0x94a3b8, { metal: 0.45, rough: 0.3 });
  const slate = std(0x1e293b, { rough: 0.55 });
  const azure = std(0x0284c7, { emissive: 0x0284c7, glow: 0.28, rough: 0.25 });
  const cyanScreen = std(0x38bdf8, { emissive: 0x0ea5e9, glow: 0.72, rough: 0.15 });
  const emeraldLed = std(0x4ade80, { emissive: 0x22c55e, glow: 0.75 });

  // Écran interactif géant au mur nord
  g.add(box(7.2, 2.0, 0.14, slate, 0, 2.15, -def.halfD + 0.18, false));
  g.add(box(6.7, 1.65, 0.16, cyanScreen, 0, 2.15, -def.halfD + 0.2, false));

  const bassamSign = sign('BASSAM', '#0369a1', '#ffffff', 3.6, 0.74, 0.75);
  bassamSign.position.set(0, 3.55, -def.halfD + 0.22);
  g.add(bassamSign);

  // Estrade numérique au nord (0, -5.6)
  g.add(box(6.2, 0.98, 1.55, slate, 0, 0.54, -5.6));
  g.add(box(6.5, 0.12, 1.75, whiteLab, 0, 1.09, -5.6));
  g.add(box(6.3, 0.14, 0.12, azure, 0, 0.95, -4.78, false));
  const laboSign = sign('SCIENCES', '#0284c7', '#ffffff', 2.2, 0.48, 0.7);
  laboSign.position.set(0, 0.58, -4.75);
  g.add(laboSign);

  // 4 paillasses / stations informatiques avec écrans lumineux
  for (const bx of [-5.8, 5.8]) {
    for (const bz of [-2.0, 1.0]) {
      g.add(box(3.8, 0.1, 1.65, whiteLab, bx, 0.85, bz));
      g.add(box(3.5, 0.65, 1.25, silver, bx, 0.45, bz));
      for (const mx of [-1.15, 0, 1.15]) {
        g.add(box(0.68, 0.44, 0.08, cyanScreen, bx + mx, 1.16, bz - 0.18, false));
        g.add(box(0.14, 0.2, 0.12, slate, bx + mx, 0.94, bz - 0.18, false));
        g.add(box(0.45, 0.04, 0.2, slate, bx + mx, 0.92, bz + 0.25, false));
      }
    }
  }

  // Bornes serveurs / robotique aux coins nord (±9.2, -5.6)
  for (const sx of [-9.2, 9.2]) {
    g.add(box(1.3, 2.35, 1.3, slate, sx, 1.22, -5.6));
    g.add(box(0.14, 1.85, 0.08, cyanScreen, sx - 0.32, 1.25, -4.92, false));
    g.add(box(0.14, 1.85, 0.08, emeraldLed, sx + 0.32, 1.25, -4.92, false));
  }

  // Bandeaux lumineux sur les murs est et ouest
  for (const wx of [-def.halfW + 0.22, def.halfW - 0.22]) {
    for (const lz of [-3.4, 0.4, 4.2]) {
      g.add(box(0.12, 0.55, 0.24, cyanScreen, wx, 2.7, lz, false));
    }
  }

  // Enseignant et étudiants : déclarés dans `InteriorDef.npcs` (animés par `NpcSystem`).
}
