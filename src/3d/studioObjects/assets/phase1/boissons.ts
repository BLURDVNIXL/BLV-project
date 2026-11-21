import * as THREE from 'three';
import {
  buildBox,
  buildLathe,
  buildTube,
  createRng,
  mergeParts,
  mixColors,
  toColor,
} from '../../geometryBuilder';
import type { BlvAssetDefinition } from '../../types';

export const BOISSONS_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'bouteille_petite',
    name: 'Bouteille plastique (33/50 cl)',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#CBEBF7',
      secondary: '#1D6FD8',
      accent: '#E53935',
      size: 1.0,
      seed: 11,
    },
    presets: [
      { label: 'Eau minérale 50 cl', params: { primary: '#CBEBF7', secondary: '#1D6FD8', accent: '#1557B0', size: 1.0, seed: 11 } },
      { label: 'Soda cola 33 cl', params: { primary: '#3A1A14', secondary: '#D92626', accent: '#E62E2E', size: 0.86, seed: 22 } },
      { label: 'Gnamakoudji 33 cl', params: { primary: '#F3D26B', secondary: '#2E7D32', accent: '#F57C00', size: 0.9, seed: 33 } },
    ],
    hold: {
      position: [0.01, 0.0, 0.01],
      rotation: [0.08, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const bodyDark = toColor(p.primary, 0.84);
      const label = toColor(p.secondary);
      const cap = toColor(p.accent);

      // Height ~0.20m, 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.024 * s, y: -0.095 * s, color: bodyDark },
          { r: 0.031 * s, y: -0.086 * s, color: body, ribFreq: 5, ribAmp: 0.06 },
          { r: 0.031 * s, y: -0.042 * s, color: body },
          { r: 0.0315 * s, y: -0.040 * s, color: label },
          { r: 0.0305 * s, y: 0.012 * s, color: label },
          { r: 0.029 * s, y: 0.038 * s, color: body },
          { r: 0.014 * s, y: 0.072 * s, color: bodyDark },
          { r: 0.0145 * s, y: 0.098 * s, color: cap },
        ],
        8
      );
    },
  },
  {
    id: 'bouteille_grande',
    name: 'Bouteille plastique (1,5 L)',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#D4EFFA',
      secondary: '#0E7C6B',
      accent: '#0A5E52',
      size: 1.0,
      seed: 14,
    },
    presets: [
      { label: 'Eau 1,5 L', params: { primary: '#D4EFFA', secondary: '#0E7C6B', accent: '#0A5E52', size: 1.0, seed: 14 } },
      { label: 'Soda orange 1,5 L', params: { primary: '#F79D2B', secondary: '#1B5E20', accent: '#E65100', size: 1.0, seed: 25 } },
      { label: 'Jus bissap 1,5 L', params: { primary: '#8A1538', secondary: '#F4C430', accent: '#6B0F2B', size: 1.0, seed: 36 } },
    ],
    hold: {
      position: [0.015, -0.02, 0.01],
      rotation: [0.12, 0.0, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const bodyShade = toColor(p.primary, 0.85);
      const label = toColor(p.secondary);
      const labelTrim = mixColors(label, toColor('#FFFFFF'), 0.25);
      const cap = toColor(p.accent);

      // Height ~0.30m, 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.036 * s, y: -0.155 * s, color: bodyShade },
          { r: 0.045 * s, y: -0.140 * s, color: body, ribFreq: 5, ribAmp: 0.05 },
          { r: 0.044 * s, y: -0.068 * s, color: body },
          { r: 0.043 * s, y: -0.015 * s, color: labelTrim },
          { r: 0.039 * s, y: 0.015 * s, color: label },
          { r: 0.042 * s, y: 0.062 * s, color: body },
          { r: 0.016 * s, y: 0.118 * s, color: bodyShade },
          { r: 0.0165 * s, y: 0.146 * s, color: cap },
        ],
        8
      );
    },
  },
  {
    id: 'canette',
    name: 'Canette',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E63946',
      secondary: '#F8F9FA',
      accent: '#C4CBD4',
      size: 1.0,
      seed: 19,
    },
    presets: [
      { label: 'Cola rouge', params: { primary: '#D92626', secondary: '#FFFFFF', accent: '#C4CBD4', size: 1.0, seed: 19 } },
      { label: 'Soda agrumes', params: { primary: '#F59E0B', secondary: '#15803D', accent: '#D1D5DB', size: 1.0, seed: 28 } },
      { label: 'Énergisant', params: { primary: '#1E293B', secondary: '#38BDF8', accent: '#94A3B8', size: 1.05, seed: 42 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.005],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const stripe = toColor(p.secondary);
      const alu = toColor(p.accent);
      const aluDark = toColor(p.accent, 0.78);

      // 8 rings x 8 radial = 128 tris + 12 tab = 140 tris, watertight
      const can = buildLathe(
        [
          { r: 0.025 * s, y: -0.060 * s, color: aluDark },
          { r: 0.033 * s, y: -0.050 * s, color: body },
          { r: 0.033 * s, y: -0.012 * s, color: body },
          { r: 0.0332 * s, y: -0.010 * s, color: stripe },
          { r: 0.0332 * s, y: 0.018 * s, color: stripe },
          { r: 0.033 * s, y: 0.048 * s, color: body },
          { r: 0.027 * s, y: 0.059 * s, color: alu },
          { r: 0.024 * s, y: 0.056 * s, color: aluDark },
        ],
        8
      );

      const tab = buildBox(0.011 * s, 0.003 * s, 0.018 * s, aluDark, {
        pos: [0, 0.0585 * s, 0.005 * s],
      });

      return mergeParts([can, tab]);
    },
  },
  {
    id: 'brique_boisson',
    name: 'Brique de boisson',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#FF8C1A',
      secondary: '#FFF3D6',
      accent: '#E63946',
      size: 1.0,
      seed: 31,
    },
    presets: [
      { label: 'Jus de mangue', params: { primary: '#FF8C1A', secondary: '#FFF3D6', accent: '#E63946', size: 1.0, seed: 31 } },
      { label: 'Lait chocolaté', params: { primary: '#6B3E26', secondary: '#F5E6D3', accent: '#D97706', size: 1.0, seed: 44 } },
      { label: 'Jus d’ananas', params: { primary: '#F4C430', secondary: '#1B7A43', accent: '#FFFFFF', size: 1.0, seed: 55 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.005],
      rotation: [0.06, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const main = toColor(p.primary);
      const band = toColor(p.secondary);
      const strawC = toColor(p.accent);
      const topC = toColor(p.primary, 0.88);

      const carton = buildBox(0.056 * s, 0.125 * s, 0.042 * s, main, {
        bands: [
          { y0: 0.0, y1: 0.25, color: main },
          { y0: 0.25, y1: 0.72, color: band },
          { y0: 0.72, y1: 1.0, color: topC },
        ],
      });

      const flapL = buildBox(0.012 * s, 0.006 * s, 0.036 * s, topC, {
        pos: [-0.025 * s, 0.062 * s, 0],
        rot: [0, 0, -0.35],
      });
      const flapR = buildBox(0.012 * s, 0.006 * s, 0.036 * s, topC, {
        pos: [0.025 * s, 0.062 * s, 0],
        rot: [0, 0, 0.35],
      });

      const straw = buildTube(
        [
          { pos: [0.014 * s, 0.058 * s, 0.006 * s], rx: 0.003 * s, rz: 0.003 * s, color: strawC },
          { pos: [0.014 * s, 0.090 * s, 0.006 * s], rx: 0.003 * s, rz: 0.003 * s, color: strawC },
          { pos: [0.028 * s, 0.102 * s, 0.016 * s], rx: 0.003 * s, rz: 0.003 * s, color: strawC },
        ],
        5
      );

      return mergeParts([carton, flapL, flapR, straw]);
    },
  },
  {
    id: 'poche_eau',
    name: "Poche d'eau",
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#D9F2FF',
      secondary: '#7CC7EE',
      accent: '#1565C0',
      size: 1.0,
      seed: 41,
    },
    presets: [
      { label: 'Eau pure Abidjan', params: { primary: '#D9F2FF', secondary: '#7CC7EE', accent: '#1565C0', size: 1.0, seed: 41 } },
      { label: 'Sachet bissap', params: { primary: '#B71C46', secondary: '#8E1335', accent: '#FFE082', size: 0.96, seed: 52 } },
      { label: 'Sachet gingembre', params: { primary: '#F5DA81', secondary: '#D4B34C', accent: '#2E7D32', size: 0.96, seed: 63 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.012],
      rotation: [0.15, 0.05, -0.1],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const pouch = toColor(p.primary);
      const seal = toColor(p.secondary);
      const label = toColor(p.accent);
      const pouchShade = toColor(p.primary, 0.9);

      // 8 rings x 8 radial = 128 tris + 12 spout = 140 tris, watertight
      const bag = buildLathe(
        [
          { r: 0.044 * s, y: -0.068 * s, sx: 1.0, sz: 0.07, color: seal },
          { r: 0.044 * s, y: -0.056 * s, sx: 1.0, sz: 0.24, color: pouchShade },
          { r: 0.042 * s, y: -0.020 * s, sx: 1.02, sz: 0.48, color: pouch },
          { r: 0.0425 * s, y: -0.018 * s, sx: 1.02, sz: 0.49, color: label },
          { r: 0.0425 * s, y: 0.015 * s, sx: 1.02, sz: 0.49, color: label },
          { r: 0.042 * s, y: 0.017 * s, sx: 1.02, sz: 0.48, color: pouch },
          { r: 0.043 * s, y: 0.056 * s, sx: 1.0, sz: 0.24, color: pouchShade },
          { r: 0.044 * s, y: 0.068 * s, sx: 1.0, sz: 0.07, color: seal },
        ],
        8
      );

      const spout = buildBox(0.012 * s, 0.016 * s, 0.008 * s, seal, {
        pos: [0.036 * s, 0.062 * s, 0],
        rot: [0, 0, -0.55],
      });

      return mergeParts([bag, spout]);
    },
  },
  {
    id: 'verre_paille',
    name: 'Verre avec paille',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F4A261',
      secondary: '#FFF8EC',
      accent: '#E63946',
      size: 1.0,
      seed: 51,
    },
    presets: [
      { label: 'Smoothie mangue', params: { primary: '#F59E0B', secondary: '#FFF8EC', accent: '#DC2626', size: 1.0, seed: 51 } },
      { label: 'Café glacé', params: { primary: '#9C6644', secondary: '#EDE0D4', accent: '#1F2937', size: 1.0, seed: 62 } },
      { label: 'Bissap glacé', params: { primary: '#9B1B4B', secondary: '#FDF2F8', accent: '#16A34A', size: 1.0, seed: 73 } },
    ],
    hold: {
      position: [0.008, -0.01, 0.01],
      rotation: [0.06, 0.0, -0.04],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const drink = toColor(p.primary);
      const sleeve = toColor(p.secondary);
      const lid = toColor(p.secondary, 0.93);
      const strawC = toColor(p.accent);

      // 7 rings x 8 radial = 112 tris + 30 straw = 142 tris, watertight
      const cup = buildLathe(
        [
          { r: 0.025 * s, y: -0.068 * s, color: drink },
          { r: 0.029 * s, y: -0.028 * s, color: sleeve },
          { r: 0.034 * s, y: 0.024 * s, color: sleeve },
          { r: 0.038 * s, y: 0.056 * s, color: drink },
          { r: 0.041 * s, y: 0.060 * s, color: lid },
          { r: 0.039 * s, y: 0.068 * s, color: lid },
          { r: 0.024 * s, y: 0.088 * s, color: lid },
        ],
        8
      );

      const straw = buildTube(
        [
          { pos: [0.0, 0.072 * s, 0.0], rx: 0.0038 * s, rz: 0.0038 * s, color: strawC },
          { pos: [0.0, 0.118 * s, 0.0], rx: 0.0038 * s, rz: 0.0038 * s, color: strawC },
          { pos: [0.016 * s, 0.136 * s, 0.012 * s], rx: 0.0038 * s, rz: 0.0038 * s, color: strawC },
        ],
        5
      );

      return mergeParts([cup, straw]);
    },
  },
  {
    id: 'tasse',
    name: 'Tasse',
    category: 'boissons',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F3EFEA',
      secondary: '#D96B27',
      accent: '#3B2314',
      size: 1.0,
      seed: 61,
    },
    presets: [
      { label: 'Café Touba', params: { primary: '#F3EFEA', secondary: '#D96B27', accent: '#3B2314', size: 1.0, seed: 61 } },
      { label: 'Chocolat chaud', params: { primary: '#E5ECF4', secondary: '#2563EB', accent: '#4A2C1D', size: 1.0, seed: 72 } },
      { label: 'Thé vert menthe', params: { primary: '#2B3A42', secondary: '#E9C46A', accent: '#4C7A34', size: 1.0, seed: 83 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.01],
      rotation: [0.05, -0.35, 0.0],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const ceramic = toColor(p.primary);
      const band = toColor(p.secondary);
      const liquid = toColor(p.accent);
      const ceramicInner = toColor(p.primary, 0.9);

      // 7 rings x 7 radial = 98 tris + 40 handle = 138 tris, watertight
      const mug = buildLathe(
        [
          { r: 0.036 * s, y: -0.046 * s, color: ceramicInner },
          { r: 0.041 * s, y: -0.042 * s, color: ceramic },
          { r: 0.042 * s, y: 0.012 * s, color: ceramic },
          { r: 0.043 * s, y: 0.036 * s, color: band },
          { r: 0.043 * s, y: 0.046 * s, color: ceramic },
          { r: 0.037 * s, y: 0.046 * s, color: ceramicInner },
          { r: 0.036 * s, y: 0.032 * s, color: liquid },
        ],
        7
      );

      const handle = buildTube(
        [
          { pos: [-0.038 * s, 0.026 * s, 0], rx: 0.006 * s, rz: 0.008 * s, color: band },
          { pos: [-0.062 * s, 0.022 * s, 0], rx: 0.006 * s, rz: 0.008 * s, color: ceramic },
          { pos: [-0.066 * s, 0.0, 0], rx: 0.006 * s, rz: 0.008 * s, color: ceramic },
          { pos: [-0.060 * s, -0.024 * s, 0], rx: 0.006 * s, rz: 0.008 * s, color: ceramic },
          { pos: [-0.038 * s, -0.028 * s, 0], rx: 0.006 * s, rz: 0.008 * s, color: band },
        ],
        4
      );

      const rng = createRng(p.seed);
      void rng;
      return mergeParts([mug, handle]);
    },
  },
];
