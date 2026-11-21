import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  buildSphere,
  buildTube,
  createRng,
  mergeParts,
  mixColors,
  toColor,
  transformGeo,
} from '../../geometryBuilder';
import type { BlvAssetDefinition, BlvAssetParams, BlvDishAnchor } from '../../types';

function resolveBaseSpace(params: BlvAssetParams, anchor?: BlvDishAnchor) {
  const s = params.size;
  const cx = anchor ? anchor.stackCenter[0] : 0;
  const cy = anchor ? anchor.stackCenter[1] : 0;
  const cz = anchor ? anchor.stackCenter[2] : 0;
  const radius = anchor ? anchor.stackRadius : 0.068 * s;
  return { s, cx, cy, cz, radius };
}

export const BASES_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'attieke',
    name: 'Attiéké',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#F5E8C7',
      secondary: '#E2C992',
      accent: '#FFFDF5',
      size: 1.0,
      seed: 701,
    },
    presets: [
      { label: 'Attiéké frais ivoire', params: { primary: '#F5E8C7', secondary: '#E2C992', accent: '#FFFDF5', size: 1.0, seed: 701 } },
      { label: 'Attiéké à l’huile rouge', params: { primary: '#F3B36B', secondary: '#D97724', accent: '#FCE3B4', size: 1.0, seed: 702 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.030 * p.size, 0],
      stackRadius: 0.052 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const cream = toColor(p.primary);
      const warm = toColor(p.secondary);
      const light = toColor(p.accent);

      // Granular cassava mound
      const mound = buildLathe(
        [
          { r: radius * 0.96, y: 0.0, color: warm, ribFreq: 5, ribAmp: 0.06 },
          { r: radius * 0.86, y: 0.016 * s, color: cream, ribFreq: 6, ribAmp: 0.07 },
          { r: radius * 0.54, y: 0.031 * s, color: light, ribFreq: 5, ribAmp: 0.06 },
          { r: radius * 0.16, y: 0.038 * s, color: cream },
        ],
        10
      );

      const parts: THREE.BufferGeometry[] = [mound];
      // 7 fluffy attiéké clumps on top & perimeter
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + rng() * 0.35;
        const dist = i === 0 ? 0.006 * s : radius * (0.42 + rng() * 0.32);
        const h = i === 0 ? 0.035 * s : (0.014 + rng() * 0.014) * s;
        const clColor = mixColors(cream, light, rng());
        parts.push(
          buildSphere((0.013 + rng() * 0.005) * s, 4, 3, clColor, {
            pos: [Math.cos(ang) * dist, h, Math.sin(ang) * dist],
            scale: [1.15, 0.75, 1.05],
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'riz_blanc',
    name: 'Riz blanc',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#FAFAFA',
      secondary: '#E5E7EB',
      accent: '#FFFFFF',
      size: 1.0,
      seed: 711,
    },
    presets: [
      { label: 'Riz blanc parfumé', params: { primary: '#FAFAFA', secondary: '#E5E7EB', accent: '#FFFFFF', size: 1.0, seed: 711 } },
      { label: 'Riz cassé', params: { primary: '#F5F3EE', secondary: '#DDD8CE', accent: '#FFFDF9', size: 1.0, seed: 712 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.032 * p.size, 0],
      stackRadius: 0.052 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const white = toColor(p.primary);
      const shade = toColor(p.secondary);
      const highlight = toColor(p.accent);

      const dome = buildLathe(
        [
          { r: radius * 0.94, y: 0.0, color: shade },
          { r: radius * 0.84, y: 0.018 * s, color: white },
          { r: radius * 0.56, y: 0.034 * s, color: highlight },
          { r: radius * 0.18, y: 0.041 * s, color: highlight },
        ],
        10
      );

      const parts: THREE.BufferGeometry[] = [dome];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + rng() * 0.25;
        const dist = i < 2 ? radius * 0.18 : radius * (0.45 + rng() * 0.30);
        const h = i < 2 ? 0.037 * s : (0.014 + rng() * 0.014) * s;
        parts.push(
          buildSphere(0.011 * s, 4, 3, mixColors(white, highlight, rng()), {
            pos: [Math.cos(ang) * dist, h, Math.sin(ang) * dist],
            rot: [0, rng() * Math.PI, 0],
            scale: [1.35, 0.72, 0.85],
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'riz_exotique',
    name: 'Riz exotique',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#E89B3C',
      secondary: '#16A34A',
      accent: '#DC2626',
      size: 1.0,
      seed: 721,
    },
    presets: [
      { label: 'Riz gras ivoirien (Tchep)', params: { primary: '#DF7A35', secondary: '#15803D', accent: '#B91C1C', size: 1.0, seed: 721 } },
      { label: 'Riz cantonnais', params: { primary: '#F3D27A', secondary: '#22C55E', accent: '#EA580C', size: 1.0, seed: 722 } },
      { label: 'Riz curcuma-légumes', params: { primary: '#EAB308', secondary: '#16A34A', accent: '#F97316', size: 1.0, seed: 723 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.032 * p.size, 0],
      stackRadius: 0.052 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const rice = toColor(p.primary);
      const riceRich = mixColors(rice, toColor(p.accent), 0.25);
      const peas = toColor(p.secondary);
      const diced = toColor(p.accent);

      const dome = buildLathe(
        [
          { r: radius * 0.94, y: 0.0, color: riceRich },
          { r: radius * 0.84, y: 0.018 * s, color: rice },
          { r: radius * 0.56, y: 0.034 * s, color: rice },
          { r: radius * 0.18, y: 0.041 * s, color: mixColors(rice, toColor('#FFF3D6'), 0.2) },
        ],
        10
      );

      const parts: THREE.BufferGeometry[] = [dome];
      // 5 green pea / herb nuggets
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + rng() * 0.3;
        const dist = radius * (0.28 + rng() * 0.42);
        const h = (0.020 + (1 - dist / radius) * 0.018) * s;
        parts.push(
          buildSphere(0.0065 * s, 4, 3, peas, {
            pos: [Math.cos(ang) * dist, h, Math.sin(ang) * dist],
          })
        );
      }

      // 4 diced pepper / carrot cubes
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + 0.45 + rng() * 0.3;
        const dist = radius * (0.24 + rng() * 0.45);
        const h = (0.018 + (1 - dist / radius) * 0.018) * s;
        parts.push(
          buildBox(0.008 * s, 0.007 * s, 0.008 * s, diced, {
            pos: [Math.cos(ang) * dist, h, Math.sin(ang) * dist],
            rot: [rng() * 0.5, rng() * 1.5, rng() * 0.5],
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'frites',
    name: 'Frites',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#FACC15',
      secondary: '#D97706',
      accent: '#FEF08A',
      size: 1.0,
      seed: 731,
    },
    presets: [
      { label: 'Frites dorées', params: { primary: '#FACC15', secondary: '#D97706', accent: '#FEF08A', size: 1.0, seed: 731 } },
      { label: 'Frites bien cuites', params: { primary: '#EA9A1C', secondary: '#92400E', accent: '#FDE047', size: 1.0, seed: 732 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.030 * p.size, 0],
      stackRadius: 0.050 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const gold = toColor(p.primary);
      const crisp = toColor(p.secondary);
      const light = toColor(p.accent);

      // Subtle low crumb bed to anchor fries cleanly
      const bed = buildLathe(
        [
          { r: radius * 0.85, y: 0.0, color: crisp },
          { r: radius * 0.50, y: 0.012 * s, color: gold },
        ],
        6
      );

      const parts: THREE.BufferGeometry[] = [bed];
      // 15 criss-crossed golden fry batons (15 * 12 = 180 tris + 24 bed = 204 tris <= 250)
      for (let i = 0; i < 15; i++) {
        const layer = Math.floor(i / 5);
        const ang = (i / 5) * Math.PI * 2 + layer * 0.55 + (rng() - 0.5) * 0.35;
        const dist = radius * (0.14 + (i % 3) * 0.16);
        const len = (0.065 + rng() * 0.025) * s;
        const thick = (0.0085 + rng() * 0.002) * s;
        const fryCol = mixColors(gold, i % 3 === 0 ? crisp : light, rng() * 0.45);
        const tiltX = (layer === 2 ? 0.55 : 0.25 + rng() * 0.35) * (i % 2 === 0 ? 1 : -1);
        const tiltZ = (rng() - 0.5) * 0.45;
        parts.push(
          buildBox(thick, thick, len, fryCol, {
            pos: [
              Math.cos(ang) * dist * 0.65,
              (0.010 + layer * 0.009 + rng() * 0.004) * s,
              Math.sin(ang) * dist * 0.65,
            ],
            rot: [tiltX, ang + rng() * 0.4, tiltZ],
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'alloco',
    name: 'Alloco',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#F59E0B',
      secondary: '#92400E',
      accent: '#FDE047',
      size: 1.0,
      seed: 741,
    },
    presets: [
      { label: 'Alloco doré sucré', params: { primary: '#F59E0B', secondary: '#92400E', accent: '#FDE047', size: 1.0, seed: 741 } },
      { label: 'Alloco bien caramélisé', params: { primary: '#D97706', secondary: '#5C2408', accent: '#FBBF24', size: 1.0, seed: 742 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.026 * p.size, 0],
      stackRadius: 0.054 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const flesh = toColor(p.primary);
      const crust = toColor(p.secondary);
      const heart = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 9 diagonal-cut oval fried plantain slices (each 24 tris -> 216 tris <= 250)
      for (let i = 0; i < 9; i++) {
        const ring = i < 6 ? 1 : 0;
        const ang = ring === 1 ? (i / 6) * Math.PI * 2 + 0.2 : ((i - 6) / 3) * Math.PI * 2 + 0.5;
        const dist = ring === 1 ? radius * (0.46 + rng() * 0.14) : radius * 0.18;
        const yPos = ring === 1 ? (0.008 + (i % 2) * 0.004) * s : (0.018 + rng() * 0.006) * s;
        const sliceR = (0.015 + rng() * 0.003) * s;
        const sliceH = (0.009 + rng() * 0.002) * s;
        const topCol = mixColors(flesh, heart, rng() * 0.55);

        parts.push(
          buildCylinder(sliceR, sliceR, sliceH, 6, crust, {
            pos: [Math.cos(ang) * dist, yPos, Math.sin(ang) * dist],
            rot: [(rng() - 0.5) * 0.55, ang + rng() * 0.6, (rng() - 0.5) * 0.55],
            sx: 1.38,
            sz: 0.92,
            topColor: topCol,
            botColor: crust,
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'patate_douce_frite',
    name: 'Patate douce frite',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#EA580C',
      secondary: '#7C2D12',
      accent: '#FDBA74',
      size: 1.0,
      seed: 751,
    },
    presets: [
      { label: 'Patate douce orangée', params: { primary: '#EA580C', secondary: '#7C2D12', accent: '#FDBA74', size: 1.0, seed: 751 } },
      { label: 'Patate douce blanche', params: { primary: '#EAB308', secondary: '#854D0E', accent: '#FEF3C7', size: 1.0, seed: 752 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.028 * p.size, 0],
      stackRadius: 0.052 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const rng = createRng(p.seed);
      const flesh = toColor(p.primary);
      const skin = toColor(p.secondary);
      const light = toColor(p.accent);

      // Chunky 5-sided rustic fried sweet-potato wedges (10 * 20 = 200 tris)
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 10; i++) {
        const layer = i < 6 ? 0 : 1;
        const ang = layer === 0 ? (i / 6) * Math.PI * 2 : ((i - 6) / 4) * Math.PI * 2 + 0.4;
        const dist = layer === 0 ? radius * (0.42 + rng() * 0.14) : radius * 0.18;
        const yPos = layer === 0 ? (0.009 + (i % 2) * 0.003) * s : (0.021 + rng() * 0.005) * s;
        const col = mixColors(flesh, i % 3 === 0 ? light : skin, rng() * 0.45);

        parts.push(
          buildCylinder(0.009 * s, 0.012 * s, (0.044 + rng() * 0.012) * s, 5, col, {
            pos: [Math.cos(ang) * dist, yPos, Math.sin(ang) * dist],
            rot: [Math.PI * 0.45 + (rng() - 0.5) * 0.5, ang, (rng() - 0.5) * 0.4],
            sx: 1.1,
            sz: 0.72,
            topColor: light,
            botColor: skin,
          })
        );
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'spaghettis',
    name: 'Spaghettis',
    phase: 2,
    category: 'bases',
    maxTriangles: 250,
    defaultParams: {
      primary: '#FCD34D',
      secondary: '#D97706',
      accent: '#FEF3C7',
      size: 1.0,
      seed: 761,
    },
    presets: [
      { label: 'Spaghettis dorés', params: { primary: '#FCD34D', secondary: '#D97706', accent: '#FEF3C7', size: 1.0, seed: 761 } },
      { label: 'Spaghettis sautés kiosque', params: { primary: '#F59E0B', secondary: '#B45309', accent: '#FDE68A', size: 1.0, seed: 762 } },
    ],
    hold: {
      position: [0.015, 0.0, 0.06],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.032 * p.size, 0],
      stackRadius: 0.054 * p.size,
    }),
    build: (p, anchor) => {
      const { s, cx, cy, cz, radius } = resolveBaseSpace(p, anchor);
      const pasta = toColor(p.primary);
      const roasted = toColor(p.secondary);
      const light = toColor(p.accent);

      // Soft coiled base cushion
      const nest = buildLathe(
        [
          { r: radius * 0.92, y: 0.0, color: roasted },
          { r: radius * 0.80, y: 0.016 * s, color: pasta },
          { r: radius * 0.42, y: 0.028 * s, color: light },
        ],
        8
      );

      // 3 sweeping interwoven noodle strand coils on top
      const parts: THREE.BufferGeometry[] = [nest];
      for (let c = 0; c < 3; c++) {
        const baseAng = (c / 3) * Math.PI * 2;
        const frames = [];
        const steps = 7;
        for (let k = 0; k < steps; k++) {
          const t = k / (steps - 1);
          const ang = baseAng + t * Math.PI * 1.45;
          const r = radius * (0.78 - t * 0.48);
          const y = (0.010 + Math.sin(t * Math.PI) * 0.022 + c * 0.002) * s;
          frames.push({
            pos: [Math.cos(ang) * r, y, Math.sin(ang) * r] as [number, number, number],
            rx: 0.0055 * s,
            rz: 0.0055 * s,
            color: k % 2 === 0 ? pasta : light,
          });
        }
        parts.push(buildTube(frames, 4));
      }

      const merged = mergeParts(parts);
      return transformGeo(merged, { pos: [cx, cy, cz] });
    },
  },
];
