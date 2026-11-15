/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Modèles 3D des intérieurs et des hôpitaux. Les murs s'effacent côté caméra avec le même WallFader que la maison du joueur.
 * Les murs sont de simples boîtes ; seul un nombre fixe de matériaux est utilisé (pas de coût par bâtiment).
 */
import * as THREE from 'three';
import { InteriorDef, InteriorId } from '../world/interiors';
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

export type InteriorFurnitureBuilder = (g: THREE.Group, def: InteriorDef) => void;

const FURNITURE_BUILDERS: Record<InteriorId, InteriorFurnitureBuilder> = {
  hopital: buildHospitalFurniture,
  maquis: buildMaquisFurniture,
};

export interface InteriorRig {
  group: THREE.Group;
  fader: WallFader;
  exitRing: THREE.Mesh;
  actionRings: THREE.Mesh[];
  dispose: () => void;
}

export function createInteriorRig(def: InteriorDef): InteriorRig {
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
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = def.wallH;
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

  FURNITURE_BUILDERS[def.id]?.(g, def);

  // Linteau et enseigne « SORTIE » au-dessus de la porte
  const doorTop = 2.5;
  g.add(box(def.doorWidth + 0.5, def.wallH - doorTop, 0.34, mats.s, 0, doorTop + (def.wallH - doorTop) / 2, def.halfD));
  const sortie = sign('SORTIE', '#14532d', '#ffffff', 1.9, 0.5, 0.9);
  sortie.rotation.y = Math.PI;
  sortie.position.set(0, doorTop - 0.3, def.halfD - 0.2);
  g.add(sortie);

  // Anneau « Sortir »
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.4, 28),
    new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(def.exit.x, 0.14, def.exit.z);
  g.add(ring);

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
  return { group: g, fader, exitRing: ring, actionRings, dispose };
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
