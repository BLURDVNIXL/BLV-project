import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  buildLeaf,
  buildSphere,
  buildTube,
  createRng,
  mergeParts,
  mixColors,
  toColor,
  transformGeo,
} from '../../geometryBuilder';
import type { BlvAssetDefinition } from '../../types';

export const FRUITS_LEGUMES_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'banane',
    name: 'Banane',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#FACC15',
      secondary: '#6B4423',
      accent: '#3F2712',
      size: 1.0,
      seed: 301,
    },
    presets: [
      { label: 'Banane douce mûre', params: { primary: '#FACC15', secondary: '#784E24', accent: '#3F2712', size: 1.0, seed: 301 } },
      { label: 'Banane plantain verte', params: { primary: '#65A30D', secondary: '#3F6212', accent: '#365314', size: 1.18, seed: 302 } },
      { label: 'Banane plantain mûre', params: { primary: '#EAB308', secondary: '#451A03', accent: '#271203', size: 1.18, seed: 303 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.012],
      rotation: [0.1, 0.25, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const stem = toColor(p.secondary);
      const tip = toColor(p.accent);
      const greenTint = mixColors(body, stem, 0.22);

      // 5-ribbed curved banana silhouette
      return buildTube(
        [
          { pos: [0.0, -0.086 * s, 0.022 * s], rx: 0.005 * s, rz: 0.005 * s, color: tip },
          { pos: [0.0, -0.062 * s, 0.006 * s], rx: 0.016 * s, rz: 0.016 * s, color: body, ribFreq: 5, ribAmp: 0.08 },
          { pos: [0.0, -0.018 * s, -0.008 * s], rx: 0.020 * s, rz: 0.020 * s, color: body, ribFreq: 5, ribAmp: 0.08 },
          { pos: [0.0, 0.026 * s, -0.006 * s], rx: 0.020 * s, rz: 0.020 * s, color: body, ribFreq: 5, ribAmp: 0.08 },
          { pos: [0.0, 0.068 * s, 0.010 * s], rx: 0.014 * s, rz: 0.014 * s, color: greenTint, ribFreq: 5, ribAmp: 0.06 },
          { pos: [0.0, 0.095 * s, 0.024 * s], rx: 0.006 * s, rz: 0.006 * s, color: stem },
        ],
        5
      );
    },
  },
  {
    id: 'fruit_rond',
    name: 'Fruit rond (Orange / Mandarine / Pomme)',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F97316',
      secondary: '#6B4423',
      accent: '#22C55E',
      size: 1.0,
      seed: 311,
    },
    presets: [
      { label: 'Orange', params: { primary: '#F97316', secondary: '#6B4423', accent: '#22C55E', size: 1.0, seed: 311 } },
      { label: 'Mandarine', params: { primary: '#FB923C', secondary: '#4D7C0F', accent: '#16A34A', size: 0.84, seed: 312 } },
      { label: 'Pomme rouge', params: { primary: '#DC2626', secondary: '#5C3A21', accent: '#65A30D', size: 0.96, seed: 313 } },
      { label: 'Pomme verte', params: { primary: '#84CC16', secondary: '#5C3A21', accent: '#4D7C0F', size: 0.96, seed: 314 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.01],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const rng = createRng(p.seed);
      const skin = toColor(p.primary);
      const skinHighlight = mixColors(skin, toColor('#FFF3B0'), 0.2);
      const skinShade = toColor(p.primary, 0.82);
      const stemC = toColor(p.secondary);
      const leafC = toColor(p.accent);

      // Subtle oblate/apple variation driven deterministically by seed
      const topRadiusFactor = (p.seed % 3 === 0) ? 0.92 : 1.0; // pomme-like taper on seed%3===0
      const oblateY = 0.88 + rng() * 0.1;

      const fruit = buildLathe(
        [
          { r: 0.008 * s, y: -0.036 * s * oblateY, color: skinShade },
          { r: 0.032 * s * topRadiusFactor, y: -0.025 * s * oblateY, color: skinShade },
          { r: 0.042 * s, y: 0.0, color: skin },
          { r: 0.037 * s, y: 0.026 * s * oblateY, color: skinHighlight },
          { r: 0.010 * s, y: 0.036 * s * oblateY, color: skin },
        ],
        10
      );

      const stem = buildCylinder(0.0028 * s, 0.0032 * s, 0.018 * s, 5, stemC, {
        pos: [0, 0.042 * s * oblateY, 0],
        rot: [0.15, 0, -0.15],
      });

      const leaf = transformGeo(buildLeaf(0.028 * s, 0.014 * s, 0.003 * s, leafC), {
        pos: [0.002 * s, 0.044 * s * oblateY, 0],
        rot: [0.35, 0.4, -0.95],
      });

      return mergeParts([fruit, stem, leaf]);
    },
  },
  {
    id: 'poire',
    name: 'Poire',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#A3C639',
      secondary: '#6B4423',
      accent: '#EAB308',
      size: 1.0,
      seed: 321,
    },
    presets: [
      { label: 'Poire Williams jaune', params: { primary: '#EAB308', secondary: '#6B4423', accent: '#CA8A04', size: 1.0, seed: 321 } },
      { label: 'Poire verte', params: { primary: '#84CC16', secondary: '#6B4423', accent: '#4D7C0F', size: 1.0, seed: 322 } },
      { label: 'Poire rouge', params: { primary: '#B91C1C', secondary: '#5C3A21', accent: '#EA580C', size: 1.0, seed: 323 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.01],
      rotation: [0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const skin = toColor(p.primary);
      const blush = toColor(p.accent);
      const stemC = toColor(p.secondary);
      const shade = toColor(p.primary, 0.85);

      const body = buildLathe(
        [
          { r: 0.012 * s, y: -0.048 * s, color: shade },
          { r: 0.039 * s, y: -0.026 * s, color: skin },
          { r: 0.036 * s, y: 0.005 * s, color: mixColors(skin, blush, 0.35) },
          { r: 0.021 * s, y: 0.032 * s, color: blush },
          { r: 0.014 * s, y: 0.050 * s, color: skin },
          { r: 0.005 * s, y: 0.058 * s, color: shade },
        ],
        9
      );

      const stem = buildCylinder(0.0025 * s, 0.003 * s, 0.018 * s, 5, stemC, {
        pos: [0, 0.065 * s, 0],
        rot: [0.1, 0, -0.2],
      });

      const leaf = transformGeo(buildLeaf(0.024 * s, 0.012 * s, 0.003 * s, toColor('#4D7C0F')), {
        pos: [0.002 * s, 0.066 * s, 0],
        rot: [0.25, 0.2, -0.9],
      });

      return mergeParts([body, stem, leaf]);
    },
  },
  {
    id: 'mangue',
    name: 'Mangue',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F59E0B',
      secondary: '#22C55E',
      accent: '#E11D48',
      size: 1.0,
      seed: 331,
    },
    presets: [
      { label: 'Mangue Kent', params: { primary: '#F59E0B', secondary: '#15803D', accent: '#DC2626', size: 1.0, seed: 331 } },
      { label: 'Mangue Amélie', params: { primary: '#FB923C', secondary: '#65A30D', accent: '#FACC15', size: 1.0, seed: 332 } },
      { label: 'Mangue verte', params: { primary: '#65A30D', secondary: '#365314', accent: '#A3E635', size: 0.96, seed: 333 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.012],
      rotation: [0.12, 0.1, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const main = toColor(p.primary);
      const shoulder = toColor(p.secondary);
      const blush = toColor(p.accent);
      const mid = mixColors(main, blush, 0.45);

      // Asymmetric curved kidney-oval mango silhouette
      const body = buildLathe(
        [
          { r: 0.009 * s, y: -0.060 * s, sx: 0.85, sz: 0.72, ox: 0.008 * s, color: main },
          { r: 0.032 * s, y: -0.038 * s, sx: 0.9, sz: 0.75, ox: 0.003 * s, color: mid },
          { r: 0.043 * s, y: 0.0, sx: 0.92, sz: 0.78, ox: -0.004 * s, color: blush },
          { r: 0.040 * s, y: 0.034 * s, sx: 0.92, sz: 0.78, ox: -0.002 * s, color: mixColors(main, shoulder, 0.45) },
          { r: 0.022 * s, y: 0.056 * s, sx: 0.9, sz: 0.76, ox: 0.002 * s, color: shoulder },
          { r: 0.005 * s, y: 0.064 * s, sx: 0.9, sz: 0.76, ox: 0.003 * s, color: shoulder },
        ],
        9
      );

      const stem = buildCylinder(0.003 * s, 0.0035 * s, 0.012 * s, 5, toColor('#5C3A21'), {
        pos: [0.003 * s, 0.068 * s, 0],
      });

      return mergeParts([body, stem]);
    },
  },
  {
    id: 'papaye',
    name: 'Papaye',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F97316',
      secondary: '#65A30D',
      accent: '#5C3A21',
      size: 1.0,
      seed: 341,
    },
    presets: [
      { label: 'Papaye Solo mûre', params: { primary: '#F97316', secondary: '#84CC16', accent: '#5C3A21', size: 1.0, seed: 341 } },
      { label: 'Papaye verte', params: { primary: '#4D7C0F', secondary: '#365314', accent: '#3F2712', size: 1.0, seed: 342 } },
    ],
    hold: {
      position: [0.01, 0.0, 0.015],
      rotation: [0.1, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const ripe = toColor(p.primary);
      const green = toColor(p.secondary);
      const stemC = toColor(p.accent);
      const mid = mixColors(ripe, green, 0.32);

      // 5-lobed elongated pear-shaped papaye
      const body = buildLathe(
        [
          { r: 0.012 * s, y: -0.095 * s, color: ripe, ribFreq: 5, ribAmp: 0.06 },
          { r: 0.048 * s, y: -0.055 * s, color: ripe, ribFreq: 5, ribAmp: 0.07 },
          { r: 0.054 * s, y: -0.005 * s, color: ripe, ribFreq: 5, ribAmp: 0.07 },
          { r: 0.044 * s, y: 0.048 * s, color: mid, ribFreq: 5, ribAmp: 0.07 },
          { r: 0.025 * s, y: 0.084 * s, color: green, ribFreq: 5, ribAmp: 0.05 },
          { r: 0.008 * s, y: 0.098 * s, color: green },
        ],
        10
      );

      const stem = buildCylinder(0.004 * s, 0.006 * s, 0.014 * s, 5, stemC, {
        pos: [0, 0.104 * s, 0],
      });

      return mergeParts([body, stem]);
    },
  },
  {
    id: 'ananas',
    name: 'Ananas',
    category: 'fruits_legumes',
    maxTriangles: 250,
    defaultParams: {
      primary: '#EAB308',
      secondary: '#B45309',
      accent: '#15803D',
      size: 1.0,
      seed: 351,
    },
    presets: [
      { label: 'Ananas Cayenne', params: { primary: '#EAB308', secondary: '#B45309', accent: '#15803D', size: 1.0, seed: 351 } },
      { label: 'Ananas Pain de sucre', params: { primary: '#84CC16', secondary: '#CA8A04', accent: '#166534', size: 1.04, seed: 352 } },
    ],
    hold: {
      position: [0.015, -0.02, 0.02],
      rotation: [0.12, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const gold = toColor(p.primary);
      const amber = toColor(p.secondary);
      const leafC = toColor(p.accent);
      const leafTip = mixColors(leafC, toColor('#A3E635'), 0.25);

      // Ribbed faceted pineapple body (10 radial x 5 vertical bands = 120 tris)
      const body = buildLathe(
        [
          { r: 0.024 * s, y: -0.095 * s, color: amber },
          { r: 0.052 * s, y: -0.064 * s, color: gold, ribFreq: 5, ribAmp: 0.09 },
          { r: 0.058 * s, y: -0.024 * s, color: amber, ribFreq: 5, ribAmp: 0.09, twist: 0.3 },
          { r: 0.058 * s, y: 0.016 * s, color: gold, ribFreq: 5, ribAmp: 0.09 },
          { r: 0.048 * s, y: 0.056 * s, color: amber, ribFreq: 5, ribAmp: 0.08, twist: 0.3 },
          { r: 0.024 * s, y: 0.076 * s, color: mixColors(amber, leafC, 0.5) },
        ],
        10
      );

      const parts: THREE.BufferGeometry[] = [body];

      // Lower crown ring: 6 outward spiky leaves (6 * 8 = 48 tris)
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const leaf = buildLeaf(0.085 * s, 0.026 * s, 0.004 * s, leafC, leafTip);
        leaf.rotateX(0.65);
        leaf.rotateY(ang);
        leaf.translate(Math.sin(ang) * 0.012 * s, 0.072 * s, Math.cos(ang) * 0.012 * s);
        parts.push(leaf);
      }

      // Upper crown ring: 5 upright inner leaves (5 * 8 = 40 tris) -> total 208 tris <= 250!
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + 0.3;
        const leaf = buildLeaf(0.098 * s, 0.022 * s, 0.004 * s, leafC, leafTip);
        leaf.rotateX(0.28);
        leaf.rotateY(ang);
        leaf.translate(Math.sin(ang) * 0.006 * s, 0.076 * s, Math.cos(ang) * 0.006 * s);
        parts.push(leaf);
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'tranche_pasteque',
    name: 'Tranche de pastèque',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#EF4444',
      secondary: '#15803D',
      accent: '#1E1B18',
      size: 1.0,
      seed: 361,
    },
    presets: [
      { label: 'Pastèque rouge', params: { primary: '#EF4444', secondary: '#15803D', accent: '#1E1B18', size: 1.0, seed: 361 } },
      { label: 'Pastèque jaune', params: { primary: '#FACC15', secondary: '#166534', accent: '#292524', size: 1.0, seed: 362 } },
    ],
    hold: {
      position: [0.005, 0.02, 0.01],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const flesh = toColor(p.primary);
      const rind = toColor(p.secondary);
      const pith = toColor('#ECFCCB');
      const seedC = toColor(p.accent);

      // Wedge arc built manually as clean indexed prism (rind + pith + red flesh)
      const R = 0.095 * s;
      const Rpith = 0.086 * s;
      const Rrind = 0.080 * s;
      const halfThick = 0.019 * s;
      const segs = 6;
      const startA = -Math.PI * 0.36;
      const endA = Math.PI * 0.36;

      // Build crescent wedge using 3 layered arcs: rind -> pith -> flesh apex
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      const pushVert = (x: number, y: number, z: number, c: THREE.Color) => {
        const idx = positions.length / 3;
        positions.push(x, y, z);
        colors.push(c.r, c.g, c.b);
        return idx;
      };

      const apexY = 0.072 * s;
      const rindCy = 0.072 * s;

      // Front (+z) and Back (-z) rings
      for (const zSign of [1, -1]) {
        const z = zSign * halfThick * 0.72;
        const zApex = zSign * halfThick * 0.28;
        const apexIdx = pushVert(0, apexY, zApex, flesh);

        const pithPts: number[] = [];
        const fleshRimPts: number[] = [];
        const outerPts: number[] = [];

        for (let i = 0; i <= segs; i++) {
          const a = startA + (i / segs) * (endA - startA);
          const sinA = Math.sin(a);
          const cosA = Math.cos(a);
          outerPts.push(pushVert(sinA * R, rindCy - cosA * R, z, rind));
          pithPts.push(pushVert(sinA * Rpith, rindCy - cosA * Rpith, z, pith));
          fleshRimPts.push(pushVert(sinA * Rrind, rindCy - cosA * Rrind, z, flesh));
        }

        for (let i = 0; i < segs; i++) {
          if (zSign === 1) {
            indices.push(apexIdx, fleshRimPts[i], fleshRimPts[i + 1]);
            indices.push(fleshRimPts[i], pithPts[i], pithPts[i + 1]);
            indices.push(fleshRimPts[i], pithPts[i + 1], fleshRimPts[i + 1]);
            indices.push(pithPts[i], outerPts[i], outerPts[i + 1]);
            indices.push(pithPts[i], outerPts[i + 1], pithPts[i + 1]);
          } else {
            indices.push(apexIdx, fleshRimPts[i + 1], fleshRimPts[i]);
            indices.push(fleshRimPts[i], pithPts[i + 1], pithPts[i]);
            indices.push(fleshRimPts[i], fleshRimPts[i + 1], pithPts[i + 1]);
            indices.push(pithPts[i], outerPts[i + 1], outerPts[i]);
            indices.push(pithPts[i], pithPts[i + 1], outerPts[i + 1]);
          }
        }
      }

      // Connect outer rind rim & side edges (outerPts is pushed at offset +0 of each triplet)
      const frontBase = 1; // after apex
      const stride = 1 + (segs + 1) * 3;
      const backBase = stride + 1;
      for (let i = 0; i < segs; i++) {
        const f0 = frontBase + i * 3;
        const f1 = frontBase + (i + 1) * 3;
        const b0 = backBase + i * 3;
        const b1 = backBase + (i + 1) * 3;
        indices.push(f0, b0, b1);
        indices.push(f0, b1, f1);
      }

      // Left and right cut edges: stitch full radial chain [apex, fleshRim, pith, outer]
      const fApex = 0;
      const bApex = stride;
      const fLeftChain = [fApex, frontBase + 2, frontBase + 1, frontBase + 0];
      const bLeftChain = [bApex, backBase + 2, backBase + 1, backBase + 0];
      for (let k = 0; k < fLeftChain.length - 1; k++) {
        indices.push(fLeftChain[k], bLeftChain[k], bLeftChain[k + 1]);
        indices.push(fLeftChain[k], bLeftChain[k + 1], fLeftChain[k + 1]);
      }

      const rightOff = segs * 3;
      const fRightChain = [
        fApex,
        frontBase + rightOff + 2,
        frontBase + rightOff + 1,
        frontBase + rightOff + 0,
      ];
      const bRightChain = [
        bApex,
        backBase + rightOff + 2,
        backBase + rightOff + 1,
        backBase + rightOff + 0,
      ];
      for (let k = 0; k < fRightChain.length - 1; k++) {
        indices.push(fRightChain[k], fRightChain[k + 1], bRightChain[k + 1]);
        indices.push(fRightChain[k], bRightChain[k + 1], bRightChain[k]);
      }

      const wedge = new THREE.BufferGeometry();
      wedge.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      wedge.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      wedge.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      wedge.computeVertexNormals();

      // 4 dark seed pips protruding slightly on front & back
      const parts: THREE.BufferGeometry[] = [wedge];
      const seedCoords: Array<[number, number]> = [
        [-0.025, 0.026],
        [0.025, 0.026],
        [0.0, 0.012],
      ];
      for (const [sx, sy] of seedCoords) {
        parts.push(
          buildBox(0.005 * s, 0.008 * s, halfThick * 1.38, seedC, {
            pos: [sx * s, sy * s, 0],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'avocat',
    name: 'Avocat',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#2D4F1E',
      secondary: '#6B4423',
      accent: '#4E7A30',
      size: 1.0,
      seed: 371,
    },
    presets: [
      { label: 'Avocat beurre lisse', params: { primary: '#3A6B24', secondary: '#6B4423', accent: '#65A30D', size: 1.0, seed: 371 } },
      { label: 'Avocat Hass foncé', params: { primary: '#23301A', secondary: '#5C3A21', accent: '#3B5226', size: 0.94, seed: 372 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.01],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const skin = toColor(p.primary);
      const stemC = toColor(p.secondary);
      const highlight = toColor(p.accent);

      const body = buildLathe(
        [
          { r: 0.012 * s, y: -0.056 * s, color: skin },
          { r: 0.039 * s, y: -0.030 * s, color: skin, ribFreq: 6, ribAmp: 0.03 },
          { r: 0.039 * s, y: 0.005 * s, color: mixColors(skin, highlight, 0.45), ribFreq: 6, ribAmp: 0.03 },
          { r: 0.027 * s, y: 0.036 * s, color: highlight },
          { r: 0.016 * s, y: 0.056 * s, color: skin },
          { r: 0.006 * s, y: 0.062 * s, color: stemC },
        ],
        9
      );

      const stem = buildCylinder(0.004 * s, 0.005 * s, 0.008 * s, 5, stemC, {
        pos: [0, 0.065 * s, 0],
      });

      return mergeParts([body, stem]);
    },
  },
  {
    id: 'noix_coco',
    name: 'Noix de coco',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#6B4423',
      secondary: '#4A2E16',
      accent: '#27170A',
      size: 1.0,
      seed: 381,
    },
    presets: [
      { label: 'Coco brun sec', params: { primary: '#6B4423', secondary: '#4A2E16', accent: '#27170A', size: 1.0, seed: 381 } },
      { label: 'Coco vert frais', params: { primary: '#4D7C0F', secondary: '#365314', accent: '#FEF3C7', size: 1.12, seed: 382 } },
    ],
    hold: {
      position: [0.01, 0.0, 0.015],
      rotation: [0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const shell = toColor(p.primary);
      const fiber = toColor(p.secondary);
      const eye = toColor(p.accent);

      const nut = buildLathe(
        [
          { r: 0.018 * s, y: -0.062 * s, color: fiber },
          { r: 0.050 * s, y: -0.038 * s, color: shell, ribFreq: 3, ribAmp: 0.04 },
          { r: 0.058 * s, y: 0.0, color: shell, ribFreq: 3, ribAmp: 0.04 },
          { r: 0.048 * s, y: 0.042 * s, color: fiber, ribFreq: 3, ribAmp: 0.03 },
          { r: 0.018 * s, y: 0.062 * s, color: fiber },
        ],
        9
      );

      // 3 signature coconut eyes arranged near top crown
      const parts: THREE.BufferGeometry[] = [nut];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        parts.push(
          buildSphere(0.008 * s, 4, 3, eye, {
            pos: [Math.sin(a) * 0.020 * s, 0.052 * s, Math.cos(a) * 0.020 * s],
            scale: [1, 0.65, 1],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'grappe_raisin',
    name: 'Grappe de raisin',
    category: 'fruits_legumes',
    maxTriangles: 250,
    defaultParams: {
      primary: '#6D28D9',
      secondary: '#5C3A21',
      accent: '#22C55E',
      size: 1.0,
      seed: 391,
    },
    presets: [
      { label: 'Raisin noir', params: { primary: '#4C1D95', secondary: '#5C3A21', accent: '#16A34A', size: 1.0, seed: 391 } },
      { label: 'Raisin vert muscat', params: { primary: '#84CC16', secondary: '#6B4423', accent: '#4D7C0F', size: 1.0, seed: 392 } },
      { label: 'Raisin rosé', params: { primary: '#DB2777', secondary: '#5C3A21', accent: '#22C55E', size: 1.0, seed: 393 } },
    ],
    hold: {
      position: [0.005, -0.025, 0.012],
      rotation: [0.1, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const rng = createRng(p.seed);
      const grapeC = toColor(p.primary);
      const stemC = toColor(p.secondary);
      const leafC = toColor(p.accent);

      // Grip at upper stem around (0,0,0), cluster hangs below
      const stem = buildCylinder(0.0035 * s, 0.003 * s, 0.055 * s, 5, stemC, {
        pos: [0, 0.012 * s, 0],
      });
      const twig = buildCylinder(0.0028 * s, 0.0028 * s, 0.036 * s, 5, stemC, {
        pos: [0.012 * s, 0.034 * s, 0],
        rot: [0, 0, -1.3],
      });
      const leaf = transformGeo(buildLeaf(0.042 * s, 0.028 * s, 0.003 * s, leafC), {
        pos: [0.012 * s, 0.024 * s, 0.006 * s],
        rot: [0.55, 0.3, -1.05],
      });

      const parts: THREE.BufferGeometry[] = [stem, twig, leaf];

      // 11 tiered grapes (11 * 16 = 176 tris + 48 stem/leaf = 224 tris <= 250)
      const grapeCoords: Array<[number, number, number, number]> = [
        // Top tier (4)
        [-0.022, -0.016, 0.012, 0.017],
        [0.022, -0.016, 0.012, 0.017],
        [-0.018, -0.018, -0.018, 0.017],
        [0.018, -0.018, -0.018, 0.017],
        // Mid tier (4)
        [0.0, -0.034, 0.022, 0.017],
        [-0.020, -0.040, 0.0, 0.016],
        [0.020, -0.040, 0.0, 0.016],
        [0.0, -0.042, -0.018, 0.016],
        // Lower tier (2) + tip (1)
        [-0.012, -0.064, 0.008, 0.015],
        [0.012, -0.064, -0.006, 0.015],
        [0.0, -0.086, 0.0, 0.014],
      ];

      for (const [gx, gy, gz, gr] of grapeCoords) {
        const shade = 0.86 + rng() * 0.24;
        parts.push(
          buildSphere(gr * s, 4, 3, mixColors(grapeC, toColor('#FFFFFF'), (shade - 0.86) * 0.5), {
            pos: [gx * s, gy * s, gz * s],
            scale: [0.95, 1.08, 0.95],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'legume_allonge',
    name: 'Légume allongé (Concombre / Carotte)',
    category: 'fruits_legumes',
    maxTriangles: 150,
    defaultParams: {
      primary: '#15803D',
      secondary: '#4ADE80',
      accent: '#14532D',
      size: 1.0,
      seed: 401,
    },
    presets: [
      { label: 'Concombre', params: { primary: '#15803D', secondary: '#86EFAC', accent: '#14532D', size: 1.0, seed: 401 } },
      { label: 'Carotte', params: { primary: '#EA580C', secondary: '#FB923C', accent: '#16A34A', size: 0.94, seed: 402 } },
      { label: 'Courgette', params: { primary: '#166534', secondary: '#65A30D', accent: '#365314', size: 1.02, seed: 403 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.01],
      rotation: [0.1, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const bodyC = toColor(p.primary);
      const ridgeC = toColor(p.secondary);
      const topC = toColor(p.accent);
      const isCarrot = p.seed % 2 === 0;

      if (isCarrot) {
        // Conical carrot with 3 leafy green fronds
        const root = buildLathe(
          [
            { r: 0.003 * s, y: -0.092 * s, color: ridgeC },
            { r: 0.012 * s, y: -0.045 * s, color: bodyC, ribFreq: 4, ribAmp: 0.04 },
            { r: 0.020 * s, y: 0.015 * s, color: bodyC, ribFreq: 4, ribAmp: 0.04 },
            { r: 0.025 * s, y: 0.064 * s, color: mixColors(bodyC, topC, 0.25) },
            { r: 0.011 * s, y: 0.075 * s, color: topC },
          ],
          8
        );

        const parts: THREE.BufferGeometry[] = [root];
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2;
          const frond = buildLeaf(0.048 * s, 0.015 * s, 0.003 * s, topC);
          frond.rotateX(0.32);
          frond.rotateY(ang);
          frond.translate(0, 0.074 * s, 0);
          parts.push(frond);
        }
        return mergeParts(parts);
      }

      // Cucumber / Zucchini gently bowed ribbed cylinder
      const body = buildTube(
        [
          { pos: [0, -0.095 * s, 0.006 * s], rx: 0.010 * s, rz: 0.010 * s, color: topC },
          { pos: [0, -0.060 * s, 0.0], rx: 0.024 * s, rz: 0.024 * s, color: bodyC, ribFreq: 6, ribAmp: 0.05 },
          { pos: [0, 0.0, -0.004 * s], rx: 0.025 * s, rz: 0.025 * s, color: mixColors(bodyC, ridgeC, 0.2), ribFreq: 6, ribAmp: 0.05 },
          { pos: [0, 0.060 * s, 0.0], rx: 0.024 * s, rz: 0.024 * s, color: bodyC, ribFreq: 6, ribAmp: 0.05 },
          { pos: [0, 0.095 * s, 0.006 * s], rx: 0.010 * s, rz: 0.010 * s, color: topC },
        ],
        8
      );
      const stem = buildCylinder(0.004 * s, 0.006 * s, 0.012 * s, 5, topC, {
        pos: [0, 0.100 * s, 0.006 * s],
      });

      return mergeParts([body, stem]);
    },
  },
];
