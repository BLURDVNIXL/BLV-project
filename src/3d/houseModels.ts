/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Constructeurs 3D procéduraux des façades extérieures fermées et du mobilier intérieur des maisons.
 * Chaque meuble fusionne ses sous-boîtes (couleurs de sommet, 1 seul appel de dessin par meuble)
 * et reste exactement inscrit dans son emprise déclarée `(x, z, hx, hz, h)`.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CribUpgrades } from '../types/game';
import type { InteriorDef } from '../world/interiors';
import type { HouseFloorSpec, HousePropSpec, HouseSpec } from '../world/playerHouses';
import type { InteriorFurnitureBuilder } from './interiors';

// ───────────── Aides de géométrie fusionnée (couleurs de sommet) ─────────────

function colorBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  hex: number
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d));
  g.translate(x, y, z);
  const c = new THREE.Color(hex);
  const count = g.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function mergeColorParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('houseModels : fusion de géométries impossible');
  for (const p of parts) p.dispose();
  return merged;
}

function makePropGeometry(p: HousePropSpec): THREE.BufferGeometry {
  const W = p.hx * 2;
  const D = p.hz * 2;
  const H = p.h;
  const c1 = p.primaryColor;
  const c2 = p.secondaryColor ?? 0xe2e8f0;
  const c3 = p.accentColor ?? 0xf59e0b;
  const parts: THREE.BufferGeometry[] = [];

  switch (p.kind) {
    case 'bed': {
      const frameH = Math.min(0.24, H * 0.45);
      const mattH = Math.min(0.18, H * 0.35);
      parts.push(colorBox(W, frameH, D, 0, frameH / 2, 0, c1));
      parts.push(colorBox(W * 0.94, mattH, D * 0.92, 0, frameH + mattH / 2, 0, c2));
      parts.push(colorBox(W * 0.88, 0.08, D * 0.56, 0, frameH + mattH + 0.03, D * 0.14, c3));
      // Oreiller(s) et tête de lit côté nord par défaut
      const headH = Math.max(frameH + mattH + 0.14, H);
      parts.push(colorBox(W * 0.96, headH - frameH, Math.min(0.12, D * 0.12), 0, frameH + (headH - frameH) / 2, -D * 0.44, c1));
      parts.push(colorBox(W * 0.55, 0.1, D * 0.2, 0, frameH + mattH + 0.05, -D * 0.28, 0xffffff));
      break;
    }
    case 'fridge': {
      parts.push(colorBox(W, H * 0.94, D, 0, (H * 0.94) / 2, 0, c1));
      parts.push(colorBox(W * 0.96, H * 0.06, D * 0.94, 0, H * 0.97, 0, c2));
      // Poignées et bande congélateur
      parts.push(colorBox(W * 0.92, 0.04, 0.04, 0, H * 0.68, D * 0.5 - 0.01, c2));
      parts.push(colorBox(0.05, H * 0.32, 0.04, -W * 0.34, H * 0.46, D * 0.5 - 0.01, c3));
      parts.push(colorBox(0.05, H * 0.18, 0.04, -W * 0.34, H * 0.8, D * 0.5 - 0.01, c3));
      break;
    }
    case 'shower': {
      const trayH = 0.14;
      parts.push(colorBox(W, trayH, D, 0, trayH / 2, 0, c1));
      // Deux parois verticales + colonne douche + pommeau
      parts.push(colorBox(0.08, H, D, -W / 2 + 0.04, H / 2, 0, c2));
      parts.push(colorBox(W, H, 0.08, 0, H / 2, -D / 2 + 0.04, c2));
      parts.push(colorBox(0.12, H * 0.85, 0.12, W * 0.25, H * 0.45, -D * 0.25, c3));
      parts.push(colorBox(W * 0.24, 0.06, D * 0.24, 0, H - 0.06, 0, c3));
      break;
    }
    case 'desk_pc': {
      const topY = Math.min(0.76, H * 0.82);
      const topH = 0.07;
      parts.push(colorBox(W, topH, D, 0, topY, 0, c1));
      parts.push(colorBox(0.09, topY, D * 0.88, -W / 2 + 0.05, topY / 2, 0, c2));
      parts.push(colorBox(0.09, topY, D * 0.88, W / 2 - 0.05, topY / 2, 0, c2));
      // Écran PC et clavier posés dessus
      const monH = Math.max(0.28, H - topY - 0.04);
      parts.push(colorBox(Math.min(W * 0.68, 1.15), monH, 0.07, 0, topY + topH / 2 + monH / 2, -D * 0.18, c3));
      parts.push(colorBox(Math.min(W * 0.44, 0.55), 0.03, 0.18, 0, topY + topH / 2 + 0.02, D * 0.18, 0x334155));
      break;
    }
    case 'sofa': {
      const seatH = Math.min(0.42, H * 0.54);
      parts.push(colorBox(W, seatH, D, 0, seatH / 2, 0, c1));
      // Dossier et accoudoirs selon facing
      if (p.facing === 'W' || p.facing === 'E') {
        const backX = p.facing === 'W' ? W / 2 - 0.1 : -W / 2 + 0.1;
        parts.push(colorBox(0.2, H - seatH, D, backX, seatH + (H - seatH) / 2, 0, c1));
        parts.push(colorBox(W * 0.9, 0.18, 0.16, 0, seatH + 0.09, -D / 2 + 0.08, c2));
        parts.push(colorBox(W * 0.9, 0.18, 0.16, 0, seatH + 0.09, D / 2 - 0.08, c2));
      } else {
        const backZ = p.facing === 'N' ? D / 2 - 0.1 : -D / 2 + 0.1;
        parts.push(colorBox(W, H - seatH, 0.2, 0, seatH + (H - seatH) / 2, backZ, c1));
        parts.push(colorBox(0.16, 0.18, D * 0.9, -W / 2 + 0.08, seatH + 0.09, 0, c2));
        parts.push(colorBox(0.16, 0.18, D * 0.9, W / 2 - 0.08, seatH + 0.09, 0, c2));
      }
      break;
    }
    case 'kitchen_counter':
    case 'bar': {
      parts.push(colorBox(W * 0.96, H * 0.88, D * 0.92, 0, (H * 0.88) / 2, 0, c1));
      parts.push(colorBox(W, H * 0.12, D, 0, H * 0.94, 0, c2));
      parts.push(colorBox(W * 0.42, 0.05, D * 0.5, -W * 0.18, H + 0.01, 0, c3));
      break;
    }
    case 'toilet_unit': {
      parts.push(colorBox(W, H * 0.72, D, 0, (H * 0.72) / 2, 0, c1));
      parts.push(colorBox(W * 0.78, H * 0.28, D * 0.65, 0, H * 0.86, 0, c2));
      parts.push(colorBox(0.14, 0.18, 0.14, 0, H, -D * 0.2, c3));
      break;
    }
    case 'shelf':
    case 'wardrobe':
    case 'safe': {
      parts.push(colorBox(W, H, D, 0, H / 2, 0, c1));
      parts.push(colorBox(W * 0.92, 0.06, D * 0.94, 0, H * 0.35, 0, c2));
      parts.push(colorBox(W * 0.92, 0.06, D * 0.94, 0, H * 0.68, 0, c2));
      parts.push(colorBox(0.14, 0.22, 0.05, 0, H * 0.52, D / 2 - 0.01, c3));
      break;
    }
    case 'crates': {
      parts.push(colorBox(W, H * 0.58, D, 0, (H * 0.58) / 2, 0, c1));
      parts.push(colorBox(W * 0.68, H * 0.42, D * 0.68, -W * 0.12, H * 0.58 + (H * 0.42) / 2, 0, c2));
      parts.push(colorBox(W * 0.28, 0.16, D * 0.32, W * 0.24, H * 0.58 + 0.08, 0, c3));
      break;
    }
    case 'barrel': {
      parts.push(colorBox(W * 0.46, H, D * 0.94, -W * 0.25, H / 2, 0, c1));
      parts.push(colorBox(W * 0.46, H * 0.82, D * 0.94, W * 0.25, (H * 0.82) / 2, 0, c2));
      parts.push(colorBox(W * 0.96, 0.05, D * 0.98, 0, H * 0.42, 0, c3));
      break;
    }
    case 'stove': {
      parts.push(colorBox(W, H * 0.65, D, 0, (H * 0.65) / 2, 0, c1));
      parts.push(colorBox(W * 0.55, H * 0.35, D * 0.7, -W * 0.15, H * 0.65 + (H * 0.35) / 2, 0, c2));
      parts.push(colorBox(W * 0.28, 0.12, D * 0.4, W * 0.25, H * 0.71, 0, c3));
      break;
    }
    case 'stairs_up':
    case 'stairs_down': {
      const steps = 8;
      const stepD = D / steps;
      const dir = p.facing === 'S' ? -1 : 1;
      for (let i = 0; i < steps; i++) {
        const sh = ((i + 1) / steps) * H;
        const sz = (-D / 2 + (i + 0.5) * stepD) * dir;
        parts.push(colorBox(W * 0.86, sh, stepD * 0.96, 0, sh / 2, sz, i % 2 === 0 ? c1 : c2));
      }
      // Garde-corps latéral plein (ne gêne pas l'emprise)
      parts.push(colorBox(0.08, H * 0.92, D, -W / 2 + 0.04, (H * 0.92) / 2, 0, c3));
      break;
    }
    case 'coffee_table':
    case 'table': {
      parts.push(colorBox(W, 0.08, D, 0, H - 0.04, 0, c1));
      const legH = Math.max(0.08, H - 0.08);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          parts.push(colorBox(0.08, legH, 0.08, sx * (W / 2 - 0.06), legH / 2, sz * (D / 2 - 0.06), c2));
        }
      }
      parts.push(colorBox(W * 0.35, 0.04, D * 0.35, 0, H + 0.01, 0, c3));
      break;
    }
    case 'lounger': {
      parts.push(colorBox(W, H * 0.5, D, 0, H * 0.25, 0, c3));
      parts.push(colorBox(W * 0.94, 0.12, D * 0.94, 0, H * 0.55, 0, c1));
      parts.push(colorBox(W * 0.94, H * 0.42, D * 0.28, 0, H * 0.78, -D * 0.33, c2));
      break;
    }
    case 'plant': {
      parts.push(colorBox(W * 0.78, H * 0.42, D * 0.78, 0, H * 0.21, 0, c1));
      parts.push(colorBox(W, H * 0.58, D, 0, H * 0.71, 0, c2));
      break;
    }
    case 'speaker': {
      parts.push(colorBox(W, H, D, 0, H / 2, 0, c1));
      parts.push(colorBox(W * 0.72, H * 0.32, 0.04, 0, H * 0.32, D / 2 - 0.01, c3));
      parts.push(colorBox(W * 0.52, H * 0.24, 0.04, 0, H * 0.72, D / 2 - 0.01, c2));
      break;
    }
    case 'tv_screen': {
      parts.push(colorBox(W, H, D, 0, H / 2, 0, c1));
      parts.push(colorBox(W * 0.92, H * 0.86, D * 0.5, 0, H / 2, D * 0.25, c3));
      break;
    }
    case 'ac_split': {
      parts.push(colorBox(W, H, D, 0, H / 2, 0, c1));
      parts.push(colorBox(W * 0.86, H * 0.2, 0.04, 0, H * 0.22, D / 2 - 0.01, c3));
      break;
    }
    case 'carpet':
    case 'tarp': {
      parts.push(colorBox(W, H, D, 0, H / 2, 0, c1));
      parts.push(colorBox(W * 0.84, H * 0.3, D * 0.84, 0, H + 0.005, 0, c2));
      break;
    }
    default: {
      parts.push(colorBox(W, H * 0.75, D, 0, (H * 0.75) / 2, 0, c1));
      parts.push(colorBox(W * 0.8, H * 0.25, D * 0.8, 0, H * 0.875, 0, c2));
      break;
    }
  }

  return mergeColorParts(parts);
}

/**
 * Construit les meubles d'un étage de maison et renvoie la callback d'animation/mise à jour
 * (dont la visibilité en direct des améliorations `CribUpgrades`).
 */
export function createHouseFloorFurniture(
  floor: HouseFloorSpec,
  initialUpgrades: CribUpgrades
): {
  build: InteriorFurnitureBuilder;
  updateUpgrades: (u: CribUpgrades) => void;
} {
  const upgradeMeshes: Record<keyof CribUpgrades, THREE.Mesh[]> = {
    splitClim: [],
    bafflesMaquis: [],
    tv4k: [],
    canapeCuir: [],
  };

  const build: InteriorFurnitureBuilder = (g: THREE.Group, _def: InteriorDef) => {
    const propMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.58,
      metalness: 0.08,
    });

    for (const p of floor.props) {
      const geo = makePropGeometry(p);
      const mesh = new THREE.Mesh(geo, propMat);
      const baseY = p.y ?? 0.1; // le sol intérieur culmine à y = 0,10 m
      mesh.position.set(p.x, baseY, p.z);
      mesh.castShadow = !p.walkable;
      mesh.receiveShadow = true;
      if (p.upgradeKey) {
        mesh.visible = Boolean(initialUpgrades[p.upgradeKey]);
        upgradeMeshes[p.upgradeKey].push(mesh);
      }
      g.add(mesh);
    }
  };

  const updateUpgrades = (u: CribUpgrades) => {
    (Object.keys(upgradeMeshes) as Array<keyof CribUpgrades>).forEach((k) => {
      for (const m of upgradeMeshes[k]) m.visible = Boolean(u[k]);
    });
  };

  return { build, updateUpgrades };
}

function facadeSignTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 54;
  ctx.font = `bold ${size}px sans-serif`;
  while (ctx.measureText(text).width > c.width - 52 && size > 20) {
    size -= 4;
    ctx.font = `bold ${size}px sans-serif`;
  }
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Construit le rig 3D fermé de la façade extérieure d'une maison (posé sur `HouseLot`).
 * Chaque volume `HouseFacadeBox` correspond 1-pour-1 aux solides renvoyés par `facadeWorldSolids`.
 */
export function createHouseFacadeRig(spec: HouseSpec): { group: THREE.Group; dispose: () => void } {
  const g = new THREE.Group();
  const matCache = new Map<string, THREE.MeshStandardMaterial>();

  const getMat = (
    color: number,
    roughness = 0.72,
    metalness = 0.05,
    emissive = 0,
    glow = 0,
    opacity?: number
  ) => {
    const key = `${color}|${roughness}|${metalness}|${emissive}|${glow}|${opacity ?? 1}`;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive,
        emissiveIntensity: glow,
        transparent: opacity !== undefined && opacity < 1,
        opacity: opacity ?? 1,
      });
      matCache.set(key, m);
    }
    return m;
  };

  for (const v of spec.facade.volumes) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(v.hx * 2, v.h, v.hz * 2),
      getMat(v.color, v.roughness, v.metalness, v.emissive, v.glow, v.opacity)
    );
    mesh.position.set(v.x, (v.y ?? 0) + v.h / 2, v.z);
    mesh.castShadow = v.kind !== 'decor' || (v.y ?? 0) >= 1.5;
    mesh.receiveShadow = true;
    g.add(mesh);
  }

  // Enseigne / plaque de la maison en façade (hauteur ≥ 1,5 m, épaisseur nulle → décor)
  const tex = facadeSignTexture(spec.facade.signText, spec.facade.signBg, spec.facade.signFg);
  const signMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.58), signMat);
  plaque.position.set(0, spec.facade.signY, spec.facade.signZ);
  g.add(plaque);

  const dispose = () => {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const m of matCache.values()) m.dispose();
    tex.dispose();
    signMat.dispose();
  };

  return { group: g, dispose };
}
