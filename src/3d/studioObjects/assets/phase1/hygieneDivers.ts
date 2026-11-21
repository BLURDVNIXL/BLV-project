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

export const HYGIENE_DIVERS_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'pain_savon',
    name: 'Pain de savon',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F3EAD8',
      secondary: '#D9C5A0',
      accent: '#15803D',
      size: 1.0,
      seed: 501,
    },
    presets: [
      { label: 'Savon crème', params: { primary: '#F3EAD8', secondary: '#D9C5A0', accent: '#15803D', size: 1.0, seed: 501 } },
      { label: 'Savon noir naturel', params: { primary: '#3B281E', secondary: '#261811', accent: '#A16207', size: 1.0, seed: 502 } },
      { label: 'Savon fraîcheur bleu', params: { primary: '#38BDF8', secondary: '#0284C7', accent: '#FFFFFF', size: 0.95, seed: 503 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.012],
      rotation: [0.18, 0.1, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const soap = toColor(p.primary);
      const bevel = toColor(p.secondary);
      const stamp = toColor(p.accent);

      // Ergonomic slightly waisted soap bar via squashed lathe
      const bar = buildLathe(
        [
          { r: 0.022 * s, y: -0.048 * s, sx: 1.25, sz: 0.62, color: bevel },
          { r: 0.029 * s, y: -0.038 * s, sx: 1.25, sz: 0.65, color: soap },
          { r: 0.027 * s, y: 0.0, sx: 1.20, sz: 0.65, color: soap },
          { r: 0.029 * s, y: 0.038 * s, sx: 1.25, sz: 0.65, color: soap },
          { r: 0.022 * s, y: 0.048 * s, sx: 1.25, sz: 0.62, color: bevel },
        ],
        10
      );

      // Embossed oval stamp on front (+Z) & back (-Z)
      const plaque = buildBox(0.028 * s, 0.036 * s, 0.038 * s, stamp, {
        pos: [0, 0, 0],
      });

      return mergeParts([bar, plaque]);
    },
  },
  {
    id: 'flacon',
    name: 'Flacon (Gel douche / Shampooing / Bain de bouche)',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#0EA5E9',
      secondary: '#FFFFFF',
      accent: '#0369A1',
      size: 1.0,
      seed: 511,
    },
    presets: [
      { label: 'Gel douche océan', params: { primary: '#0EA5E9', secondary: '#FFFFFF', accent: '#0369A1', size: 1.0, seed: 511 } },
      { label: 'Shampooing karité', params: { primary: '#D97706', secondary: '#FEF3C7', accent: '#78350F', size: 1.04, seed: 512 } },
      { label: 'Bain de bouche menthe', params: { primary: '#10B981', secondary: '#ECFDF5', accent: '#047857', size: 0.96, seed: 513 } },
    ],
    hold: {
      position: [0.008, -0.01, 0.012],
      rotation: [0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const label = toColor(p.secondary);
      const cap = toColor(p.accent);
      const bodyDark = toColor(p.primary, 0.84);

      // 8 rings x 8 radial = 128 tris + 12 hinge = 140 tris, watertight
      const bottle = buildLathe(
        [
          { r: 0.032 * s, y: -0.095 * s, sx: 1.15, sz: 0.65, color: bodyDark },
          { r: 0.036 * s, y: -0.056 * s, sx: 1.15, sz: 0.65, color: body },
          { r: 0.0365 * s, y: -0.052 * s, sx: 1.15, sz: 0.66, color: label },
          { r: 0.034 * s, y: 0.024 * s, sx: 1.12, sz: 0.66, color: label },
          { r: 0.030 * s, y: 0.056 * s, sx: 1.08, sz: 0.65, color: body },
          { r: 0.016 * s, y: 0.074 * s, sx: 1.0, sz: 1.0, color: bodyDark },
          { r: 0.017 * s, y: 0.076 * s, sx: 1.0, sz: 1.0, color: cap },
          { r: 0.017 * s, y: 0.102 * s, sx: 1.0, sz: 1.0, color: cap },
        ],
        8
      );

      // Flip-top cap lip on front (+Z)
      const hinge = buildBox(0.014 * s, 0.008 * s, 0.010 * s, label, {
        pos: [0, 0.098 * s, 0.015 * s],
      });

      return mergeParts([bottle, hinge]);
    },
  },
  {
    id: 'tube_dentifrice',
    name: 'Tube de dentifrice',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F8FAFC',
      secondary: '#DC2626',
      accent: '#2563EB',
      size: 1.0,
      seed: 521,
    },
    presets: [
      { label: 'Menthe classique', params: { primary: '#F8FAFC', secondary: '#DC2626', accent: '#2563EB', size: 1.0, seed: 521 } },
      { label: 'Fraîcheur verte', params: { primary: '#ECFDF5', secondary: '#10B981', accent: '#047857', size: 1.0, seed: 522 } },
      { label: 'Charbon actif', params: { primary: '#1E293B', secondary: '#94A3B8', accent: '#0F172A', size: 1.0, seed: 523 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.012],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const tube = toColor(p.primary);
      const stripe = toColor(p.secondary);
      const cap = toColor(p.accent);

      // 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.025 * s, y: -0.078 * s, sx: 1.1, sz: 0.14, color: stripe },
          { r: 0.024 * s, y: -0.066 * s, sx: 1.08, sz: 0.32, color: tube },
          { r: 0.022 * s, y: -0.025 * s, sx: 1.05, sz: 0.58, color: tube },
          { r: 0.022 * s, y: -0.022 * s, sx: 1.05, sz: 0.60, color: stripe },
          { r: 0.021 * s, y: 0.018 * s, sx: 1.02, sz: 0.82, color: stripe },
          { r: 0.019 * s, y: 0.048 * s, sx: 1.0, sz: 1.0, color: tube },
          { r: 0.012 * s, y: 0.056 * s, sx: 1.0, sz: 1.0, color: cap },
          { r: 0.012 * s, y: 0.078 * s, sx: 1.0, sz: 1.0, color: cap },
        ],
        8
      );
    },
  },
  {
    id: 'brosse_dents',
    name: 'Brosse à dents',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#0284C7',
      secondary: '#E2E8F0',
      accent: '#38BDF8',
      size: 1.0,
      seed: 531,
    },
    presets: [
      { label: 'Brosse bleue', params: { primary: '#0284C7', secondary: '#F8FAFC', accent: '#38BDF8', size: 1.0, seed: 531 } },
      { label: 'Brosse corail', params: { primary: '#E11D48', secondary: '#FFF1F2', accent: '#FB7185', size: 1.0, seed: 532 } },
      { label: 'Brosse bambou', params: { primary: '#D4A373', secondary: '#FAEDCD', accent: '#1F2937', size: 1.0, seed: 533 } },
    ],
    hold: {
      position: [0.005, -0.01, 0.008],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const handleC = toColor(p.primary);
      const gripC = toColor(p.accent);
      const bristleC = toColor(p.secondary);

      const handle = buildTube(
        [
          { pos: [0, -0.088 * s, 0.002 * s], rx: 0.006 * s, rz: 0.004 * s, color: handleC },
          { pos: [0, -0.030 * s, 0.0], rx: 0.008 * s, rz: 0.005 * s, color: gripC },
          { pos: [0, 0.020 * s, -0.002 * s], rx: 0.007 * s, rz: 0.0045 * s, color: handleC },
          { pos: [0, 0.058 * s, 0.004 * s], rx: 0.005 * s, rz: 0.0035 * s, color: handleC },
          { pos: [0, 0.090 * s, 0.006 * s], rx: 0.007 * s, rz: 0.004 * s, color: handleC },
        ],
        6
      );

      // Bristle tufts on +Z face at top head
      const tuftMain = buildBox(0.010 * s, 0.028 * s, 0.011 * s, bristleC, {
        pos: [0, 0.076 * s, 0.012 * s],
      });
      const tuftTip = buildBox(0.008 * s, 0.008 * s, 0.012 * s, gripC, {
        pos: [0, 0.088 * s, 0.0125 * s],
      });

      return mergeParts([handle, tuftMain, tuftTip]);
    },
  },
  {
    id: 'deodorant',
    name: 'Déodorant',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#1E293B',
      secondary: '#F97316',
      accent: '#E2E8F0',
      size: 1.0,
      seed: 541,
    },
    presets: [
      { label: 'Spray sport', params: { primary: '#1E293B', secondary: '#F97316', accent: '#E2E8F0', size: 1.0, seed: 541 } },
      { label: 'Spray fraîcheur', params: { primary: '#0F766E', secondary: '#5EEAD4', accent: '#F8FAFC', size: 1.0, seed: 542 } },
      { label: 'Stick doré', params: { primary: '#D97706', secondary: '#1F2937', accent: '#FDE68A', size: 0.92, seed: 543 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.01],
      rotation: [0.06, 0.0, -0.04],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const band = toColor(p.secondary);
      const cap = toColor(p.accent);
      const capDark = toColor(p.accent, 0.8);

      // 8 rings x 8 radial = 128 tris + 12 nozzle = 140 tris, watertight
      const spray = buildLathe(
        [
          { r: 0.024 * s, y: -0.078 * s, color: capDark },
          { r: 0.025 * s, y: -0.074 * s, color: body },
          { r: 0.025 * s, y: 0.005 * s, color: body },
          { r: 0.0255 * s, y: 0.008 * s, color: band },
          { r: 0.024 * s, y: 0.032 * s, color: band },
          { r: 0.020 * s, y: 0.047 * s, color: cap },
          { r: 0.019 * s, y: 0.076 * s, color: cap },
          { r: 0.015 * s, y: 0.080 * s, color: capDark },
        ],
        8
      );

      // Spray nozzle button facing +Z
      const nozzle = buildBox(0.008 * s, 0.008 * s, 0.008 * s, band, {
        pos: [0, 0.070 * s, 0.016 * s],
      });

      return mergeParts([spray, nozzle]);
    },
  },
  {
    id: 'flacon_parfum',
    name: 'Flacon de parfum',
    category: 'hygiene_divers',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F59E0B',
      secondary: '#FDE68A',
      accent: '#1E1B18',
      size: 1.0,
      seed: 551,
    },
    presets: [
      { label: 'Ambre doré', params: { primary: '#F59E0B', secondary: '#FDE68A', accent: '#1E1B18', size: 1.0, seed: 551 } },
      { label: 'Eau de rose', params: { primary: '#FB7185', secondary: '#E2E8F0', accent: '#881337', size: 1.0, seed: 552 } },
      { label: 'Nuit bleue', params: { primary: '#1D4ED8', secondary: '#CBD5E1', accent: '#0F172A', size: 1.0, seed: 553 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.012],
      rotation: [0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const glass = toColor(p.primary);
      const glassLight = mixColors(glass, toColor('#FFFFFF'), 0.3);
      const collar = toColor(p.secondary);
      const cap = toColor(p.accent);

      // Faceted octagonal glass bottle + metallic collar
      const bottle = buildLathe(
        [
          { r: 0.026 * s, y: -0.052 * s, sx: 1.25, sz: 0.72, color: glassLight },
          { r: 0.032 * s, y: -0.044 * s, sx: 1.25, sz: 0.72, color: glass, hardBreak: true },
          { r: 0.032 * s, y: 0.010 * s, sx: 1.25, sz: 0.72, color: glass },
          { r: 0.022 * s, y: 0.020 * s, sx: 1.18, sz: 0.72, color: glassLight },
          { r: 0.011 * s, y: 0.022 * s, sx: 1.0, sz: 1.0, color: collar, hardBreak: true },
          { r: 0.011 * s, y: 0.034 * s, sx: 1.0, sz: 1.0, color: collar },
        ],
        8
      );

      // Sculptural heavy geometric perfume cap
      const capGeo = buildBox(0.032 * s, 0.028 * s, 0.028 * s, cap, {
        pos: [0, 0.048 * s, 0],
      });

      const rng = createRng(p.seed);
      void rng;
      return mergeParts([bottle, capGeo]);
    },
  },
  {
    id: 'parapluie',
    name: 'Parapluie',
    category: 'hygiene_divers',
    maxTriangles: 250,
    defaultParams: {
      primary: '#1D4ED8',
      secondary: '#F8FAFC',
      accent: '#78350F',
      size: 1.0,
      seed: 561,
    },
    presets: [
      { label: 'Parapluie Abidjan bleu-blanc', params: { primary: '#1D4ED8', secondary: '#F8FAFC', accent: '#78350F', size: 1.0, seed: 561 } },
      { label: 'Parapluie rouge-jaune', params: { primary: '#DC2626', secondary: '#FACC15', accent: '#451A03', size: 1.0, seed: 562 } },
      { label: 'Parapluie noir classique', params: { primary: '#1F2937', secondary: '#4B5563', accent: '#92400E', size: 1.0, seed: 563 } },
    ],
    hold: {
      position: [0.008, 0.0, 0.015],
      rotation: [-0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const goreA = toColor(p.primary);
      const goreB = toColor(p.secondary);
      const handleC = toColor(p.accent);
      const metalC = toColor('#94A3B8');

      // Grip (0,0,0) on lower shaft just above J-handle
      const shaft = buildCylinder(0.006 * s, 0.006 * s, 0.56 * s, 6, metalC, {
        pos: [0, 0.27 * s, 0],
      });

      // Classic wooden J-hook handle below (0,0,0)
      const handle = buildTube(
        [
          { pos: [0, 0.015 * s, 0], rx: 0.010 * s, rz: 0.010 * s, color: handleC },
          { pos: [0, -0.055 * s, 0], rx: 0.010 * s, rz: 0.010 * s, color: handleC },
          { pos: [0, -0.085 * s, -0.018 * s], rx: 0.010 * s, rz: 0.010 * s, color: handleC },
          { pos: [0, -0.082 * s, -0.044 * s], rx: 0.010 * s, rz: 0.010 * s, color: handleC },
          { pos: [0, -0.056 * s, -0.052 * s], rx: 0.010 * s, rz: 0.010 * s, color: handleC },
        ],
        6
      );

      // Top ferrule spike
      const tip = buildCylinder(0.002 * s, 0.008 * s, 0.055 * s, 6, handleC, {
        pos: [0, 0.565 * s, 0],
      });

      // Double-walled watertight 8-panel open umbrella canopy dome (with alternating radial vertex colors)
      const canopy = buildLathe(
        [
          { r: 0.002 * s, y: 0.535 * s, color: toColor(p.primary, 0.65) },
          { r: 0.19 * s, y: 0.50 * s, color: toColor(p.primary, 0.68) },
          { r: 0.34 * s, y: 0.42 * s, color: toColor(p.primary, 0.72) },
          { r: 0.34 * s, y: 0.426 * s, color: goreB },
          { r: 0.19 * s, y: 0.510 * s, color: goreA },
          { r: 0.002 * s, y: 0.545 * s, color: goreA },
        ],
        8,
        { closedBottom: true, closedTop: true }
      );

      // Paint alternating gore columns on the outer surface for crisp umbrella panels
      const posAttr = canopy.getAttribute('position');
      const colAttr = canopy.getAttribute('color');
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        if (y > 0.422 * s) {
          const ang = Math.atan2(-posAttr.getZ(i), posAttr.getX(i));
          const sector = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / ((Math.PI * 2) / 8)) % 8;
          const c = sector % 2 === 0 ? goreA : goreB;
          colAttr.setXYZ(i, c.r, c.g, c.b);
        }
      }
      colAttr.needsUpdate = true;

      return mergeParts([shaft, handle, tip, canopy]);
    },
  },
];
