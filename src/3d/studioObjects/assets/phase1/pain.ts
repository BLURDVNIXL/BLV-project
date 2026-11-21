import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  buildTube,
  createRng,
  mergeParts,
  mixColors,
  toColor,
} from '../../geometryBuilder';
import type { BlvAssetDefinition } from '../../types';

export const PAIN_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'baguette',
    name: 'Baguette',
    category: 'pain',
    maxTriangles: 150,
    defaultParams: {
      primary: '#D48A3B',
      secondary: '#F5D59B',
      accent: '#9C5418',
      size: 1.0,
      seed: 201,
    },
    presets: [
      { label: 'Baguette dorée', params: { primary: '#D48A3B', secondary: '#F5D59B', accent: '#9C5418', size: 1.0, seed: 201 } },
      { label: 'Baguette bien cuite', params: { primary: '#A85B1C', secondary: '#E8B872', accent: '#6E350B', size: 1.0, seed: 202 } },
      { label: 'Pain complet', params: { primary: '#8D5B32', secondary: '#C99E6C', accent: '#5C381B', size: 0.96, seed: 203 } },
    ],
    hold: {
      position: [0.01, -0.04, 0.015],
      rotation: [0.22, 0.0, -0.14],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const rng = createRng(p.seed);
      const crust = toColor(p.primary);
      const score = toColor(p.secondary);
      const tip = toColor(p.accent);
      const bow = (rng() - 0.5) * 0.012 * s;

      // Tapered gentle-bow baguette (~0.34 m)
      const loaf = buildTube(
        [
          { pos: [0, -0.165 * s, 0], rx: 0.009 * s, rz: 0.008 * s, color: tip },
          { pos: [bow * 0.3, -0.130 * s, 0.002 * s], rx: 0.026 * s, rz: 0.022 * s, color: crust },
          { pos: [bow * 0.8, -0.055 * s, 0.005 * s], rx: 0.031 * s, rz: 0.025 * s, color: crust },
          { pos: [bow, 0.025 * s, 0.005 * s], rx: 0.031 * s, rz: 0.025 * s, color: crust },
          { pos: [bow * 0.6, 0.115 * s, 0.002 * s], rx: 0.026 * s, rz: 0.022 * s, color: crust },
          { pos: [0, 0.165 * s, 0], rx: 0.009 * s, rz: 0.008 * s, color: tip },
        ],
        7
      );

      // 3 angled pale-flour slash scores along the front (+Z)
      const parts: THREE.BufferGeometry[] = [loaf];
      for (let i = 0; i < 3; i++) {
        const y = (-0.07 + i * 0.07) * s;
        parts.push(
          buildBox(0.024 * s, 0.034 * s, 0.006 * s, score, {
            pos: [bow * 0.6, y, 0.023 * s],
            rot: [0, 0, -0.55],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'sachet_pain_mie',
    name: 'Sachet de pain de mie',
    category: 'pain',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F8FAFC',
      secondary: '#E63946',
      accent: '#2563EB',
      size: 1.0,
      seed: 211,
    },
    presets: [
      { label: 'Pain de mie nature', params: { primary: '#F8FAFC', secondary: '#E63946', accent: '#2563EB', size: 1.0, seed: 211 } },
      { label: 'Pain de mie complet', params: { primary: '#E8D5B7', secondary: '#15803D', accent: '#F59E0B', size: 1.0, seed: 212 } },
    ],
    hold: {
      position: [0.015, -0.02, 0.02],
      rotation: [0.1, 0.0, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const bag = toColor(p.primary);
      const stripe = toColor(p.secondary);
      const clip = toColor(p.accent);
      const crumb = mixColors(toColor('#D99B52'), bag, 0.35);

      const loaf = buildBox(0.095 * s, 0.165 * s, 0.090 * s, bag, {
        pos: [0, -0.015 * s, 0],
        bands: [
          { y0: 0.0, y1: 0.25, color: crumb },
          { y0: 0.25, y1: 0.55, color: stripe },
          { y0: 0.55, y1: 1.0, color: bag },
        ],
      });

      // Gathered twisted plastic neck + clip + flared top tail
      const neck = buildCylinder(0.012 * s, 0.032 * s, 0.024 * s, 7, bag, {
        pos: [0, 0.078 * s, 0],
      });
      const clipRing = buildCylinder(0.016 * s, 0.016 * s, 0.010 * s, 6, clip, {
        pos: [0, 0.091 * s, 0],
      });
      const flare = buildCylinder(0.032 * s, 0.012 * s, 0.026 * s, 7, stripe, {
        pos: [0, 0.108 * s, 0],
      });

      return mergeParts([loaf, neck, clipRing, flare]);
    },
  },
  {
    id: 'pain_au_lait',
    name: 'Pain au lait',
    category: 'pain',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E09A48',
      secondary: '#F8DFB0',
      accent: '#B4651D',
      size: 1.0,
      seed: 221,
    },
    presets: [
      { label: 'Pain au lait doré', params: { primary: '#E09A48', secondary: '#F8DFB0', accent: '#B4651D', size: 1.0, seed: 221 } },
      { label: 'Brioche sucrée', params: { primary: '#D47B2B', secondary: '#FCE5B4', accent: '#9A4810', size: 1.08, seed: 222 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.01],
      rotation: [0.15, 0.0, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const topCrust = toColor(p.primary);
      const belly = toColor(p.secondary);
      const score = toColor(p.accent);

      const bun = buildLathe(
        [
          { r: 0.014 * s, y: -0.072 * s, sx: 1.15, sz: 0.85, color: belly },
          { r: 0.027 * s, y: -0.044 * s, sx: 1.18, sz: 0.88, color: topCrust },
          { r: 0.031 * s, y: 0.0, sx: 1.18, sz: 0.88, color: topCrust },
          { r: 0.027 * s, y: 0.044 * s, sx: 1.18, sz: 0.88, color: topCrust },
          { r: 0.014 * s, y: 0.072 * s, sx: 1.15, sz: 0.85, color: belly },
        ],
        8
      );

      // 3 crisp bake slash marks on front/top face
      const parts: THREE.BufferGeometry[] = [bun];
      for (let i = 0; i < 3; i++) {
        parts.push(
          buildBox(0.026 * s, 0.007 * s, 0.006 * s, score, {
            pos: [0, (-0.032 + i * 0.032) * s, 0.025 * s],
            rot: [0, 0, -0.35],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'croissant',
    name: 'Croissant',
    category: 'pain',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E09238',
      secondary: '#F7D294',
      accent: '#A95514',
      size: 1.0,
      seed: 231,
    },
    presets: [
      { label: 'Croissant au beurre', params: { primary: '#E09238', secondary: '#F7D294', accent: '#A95514', size: 1.0, seed: 231 } },
      { label: 'Croissant fourré cacao', params: { primary: '#C97828', secondary: '#5C3317', accent: '#8B4513', size: 1.0, seed: 232 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.015],
      rotation: [0.2, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const crust = toColor(p.primary);
      const fold = toColor(p.secondary);
      const tip = toColor(p.accent);

      // Crescent horn with alternating layered flaky ridges
      return buildTube(
        [
          { pos: [-0.068 * s, -0.026 * s, 0.010 * s], rx: 0.007 * s, rz: 0.007 * s, color: tip },
          { pos: [-0.052 * s, -0.004 * s, 0.006 * s], rx: 0.016 * s, rz: 0.015 * s, color: fold },
          { pos: [-0.034 * s, 0.016 * s, 0.002 * s], rx: 0.023 * s, rz: 0.020 * s, color: crust },
          { pos: [-0.016 * s, 0.028 * s, 0.0], rx: 0.020 * s, rz: 0.018 * s, color: fold },
          { pos: [0.0, 0.032 * s, 0.0], rx: 0.028 * s, rz: 0.024 * s, color: crust },
          { pos: [0.016 * s, 0.028 * s, 0.0], rx: 0.020 * s, rz: 0.018 * s, color: fold },
          { pos: [0.034 * s, 0.016 * s, 0.002 * s], rx: 0.023 * s, rz: 0.020 * s, color: crust },
          { pos: [0.052 * s, -0.004 * s, 0.006 * s], rx: 0.016 * s, rz: 0.015 * s, color: fold },
          { pos: [0.068 * s, -0.026 * s, 0.010 * s], rx: 0.007 * s, rz: 0.007 * s, color: tip },
        ],
        7
      );
    },
  },
];
