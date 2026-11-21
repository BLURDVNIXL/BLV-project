import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  mergeParts,
  mixColors,
  toColor,
  transformGeo,
} from '../../geometryBuilder';
import type { BlvAssetDefinition } from '../../types';

export const CONTENANTS_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'assiette',
    name: 'Assiette',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F8FAFC',
      secondary: '#1D4ED8',
      accent: '#E2E8F0',
      size: 1.0,
      seed: 601,
    },
    presets: [
      { label: 'Céramique blanche & bleue', params: { primary: '#F8FAFC', secondary: '#1D4ED8', accent: '#E2E8F0', size: 1.0, seed: 601 } },
      { label: 'Émaillée Abidjan (rouge)', params: { primary: '#FFFDF7', secondary: '#DC2626', accent: '#16A34A', size: 1.0, seed: 602 } },
      { label: 'Grès terre cuite', params: { primary: '#C97A4B', secondary: '#7C2D12', accent: '#E6B89C', size: 1.0, seed: 603 } },
    ],
    hold: {
      position: [0.02, 0.005, 0.08],
      rotation: [0.05, 0.0, -0.05],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.009 * p.size, 0],
      stackRadius: 0.072 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const plate = toColor(p.primary);
      const rimLine = toColor(p.secondary);
      const under = toColor(p.accent);
      const wellCenter = mixColors(plate, under, 0.25);

      // Diameter ~0.23m, palm supports center underside at (0,0,0)
      return buildLathe(
        [
          { r: 0.058 * s, y: 0.0, color: under },
          { r: 0.068 * s, y: 0.005 * s, color: under },
          { r: 0.114 * s, y: 0.022 * s, color: plate, hardBreak: true },
          { r: 0.116 * s, y: 0.025 * s, color: rimLine, hardBreak: true },
          { r: 0.098 * s, y: 0.022 * s, color: rimLine },
          { r: 0.074 * s, y: 0.009 * s, color: plate, hardBreak: true },
          { r: 0.036 * s, y: 0.008 * s, color: wellCenter },
        ],
        10
      );
    },
  },
  {
    id: 'bol',
    name: 'Bol',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#F3EAD8',
      secondary: '#B45309',
      accent: '#78350F',
      size: 1.0,
      seed: 611,
    },
    presets: [
      { label: 'Bol céramique ocre', params: { primary: '#F3EAD8', secondary: '#B45309', accent: '#78350F', size: 1.0, seed: 611 } },
      { label: 'Calebasse bois', params: { primary: '#8D5524', secondary: '#5C3317', accent: '#C68642', size: 1.06, seed: 612 } },
      { label: 'Bol émaillé bleu', params: { primary: '#F8FAFC', secondary: '#1E40AF', accent: '#93C5FD', size: 1.0, seed: 613 } },
    ],
    hold: {
      position: [0.015, -0.005, 0.045],
      rotation: [0.06, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.022 * p.size, 0],
      stackRadius: 0.056 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const body = toColor(p.primary);
      const band = toColor(p.secondary);
      const inner = toColor(p.accent);
      const foot = toColor(p.primary, 0.85);

      return buildLathe(
        [
          { r: 0.038 * s, y: -0.010 * s, color: foot },
          { r: 0.066 * s, y: 0.018 * s, color: body, hardBreak: true },
          { r: 0.078 * s, y: 0.046 * s, color: band },
          { r: 0.082 * s, y: 0.064 * s, color: band },
          { r: 0.075 * s, y: 0.064 * s, color: body, hardBreak: true },
          { r: 0.052 * s, y: 0.016 * s, color: inner },
        ],
        10
      );
    },
  },
  {
    id: 'barquette',
    name: 'Barquette',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#CBD5E1',
      secondary: '#94A3B8',
      accent: '#E2E8F0',
      size: 1.0,
      seed: 621,
    },
    presets: [
      { label: 'Barquette alu maquis', params: { primary: '#CBD5E1', secondary: '#94A3B8', accent: '#E2E8F0', size: 1.0, seed: 621 } },
      { label: 'Barquette kraft éco', params: { primary: '#C68B59', secondary: '#8C5A32', accent: '#E6CCB2', size: 1.0, seed: 622 } },
      { label: 'Barquette blanche', params: { primary: '#F8FAFC', secondary: '#CBD5E1', accent: '#E2E8F0', size: 1.0, seed: 623 } },
    ],
    hold: {
      position: [0.02, 0.005, 0.06],
      rotation: [0.06, 0.05, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.010 * p.size, 0],
      stackRadius: 0.055 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const tray = toColor(p.primary);
      const rim = toColor(p.secondary);
      const inner = toColor(p.accent);

      // Chamfered 8-sided oblong aluminum/kraft takeaway tray (18cm x 13cm)
      const base = buildLathe(
        [
          { r: 0.054 * s, y: 0.0, sx: 1.32, sz: 0.94, color: rim },
          { r: 0.068 * s, y: 0.036 * s, sx: 1.32, sz: 0.94, color: tray, hardBreak: true },
          { r: 0.074 * s, y: 0.040 * s, sx: 1.34, sz: 0.96, color: rim, hardBreak: true },
          { r: 0.064 * s, y: 0.038 * s, sx: 1.32, sz: 0.94, color: inner, hardBreak: true },
          { r: 0.050 * s, y: 0.008 * s, sx: 1.30, sz: 0.92, color: inner },
        ],
        8,
        { phaseOffset: Math.PI / 8 }
      );

      // Rolled side grip tabs on left/right
      const tabL = buildBox(0.012 * s, 0.005 * s, 0.042 * s, rim, {
        pos: [-0.098 * s, 0.039 * s, 0],
      });
      const tabR = buildBox(0.012 * s, 0.005 * s, 0.042 * s, rim, {
        pos: [0.098 * s, 0.039 * s, 0],
      });

      return mergeParts([base, tabL, tabR]);
    },
  },
  {
    id: 'cornet_plat',
    name: 'Cornet (à plat / frites)',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#D4A373',
      secondary: '#DC2626',
      accent: '#9C6644',
      size: 1.0,
      seed: 631,
    },
    presets: [
      { label: 'Cornet kraft maquis', params: { primary: '#D4A373', secondary: '#B07D4F', accent: '#7F5539', size: 1.0, seed: 631 } },
      { label: 'Cornet frites rouge-blanc', params: { primary: '#F8FAFC', secondary: '#DC2626', accent: '#991B1B', size: 1.0, seed: 632 } },
    ],
    hold: {
      position: [0.008, -0.01, 0.012],
      rotation: [0.12, 0.0, -0.05],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.036 * p.size, 0.004 * p.size],
      stackRadius: 0.044 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const paper = toColor(p.primary);
      const band = toColor(p.secondary);
      const inner = toColor(p.accent);

      const cone = buildLathe(
        [
          { r: 0.006 * s, y: -0.075 * s, color: inner },
          { r: 0.034 * s, y: 0.005 * s, color: paper },
          { r: 0.035 * s, y: 0.005 * s, color: band, hardBreak: true },
          { r: 0.052 * s, y: 0.052 * s, color: band },
          { r: 0.060 * s, y: 0.076 * s, color: paper, hardBreak: true },
          { r: 0.056 * s, y: 0.076 * s, color: inner, hardBreak: true },
          { r: 0.036 * s, y: 0.032 * s, color: inner },
        ],
        9
      );

      // Raise the -Z back rim vertices for the classic street-food scoop lip
      const pos = cone.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (y > 0.065 * s && z < 0) {
          const lift = (-z / (0.060 * s)) * 0.026 * s;
          pos.setY(i, y + lift);
        }
      }
      pos.needsUpdate = true;
      cone.computeVertexNormals();

      return cone;
    },
  },
  {
    id: 'pot_kedjenou',
    name: 'Pot de kédjénou en terre avec couvercle',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#A44A28',
      secondary: '#6B2D16',
      accent: '#C96A42',
      size: 1.0,
      seed: 641,
    },
    presets: [
      { label: 'Terre cuite traditionnelle', params: { primary: '#A44A28', secondary: '#5C2410', accent: '#C96A42', size: 1.0, seed: 641 } },
      { label: 'Canari noirci au feu', params: { primary: '#523428', secondary: '#2E1B14', accent: '#8A4A30', size: 1.0, seed: 642 } },
      { label: 'Terre ocre rouge', params: { primary: '#B84A27', secondary: '#7C2D12', accent: '#E07A5F', size: 1.0, seed: 643 } },
    ],
    hold: {
      position: [0.02, -0.01, 0.055],
      rotation: [0.06, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.044 * p.size, 0.006 * p.size],
      stackRadius: 0.046 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const clay = toColor(p.primary);
      const soot = toColor(p.secondary);
      const clayLight = toColor(p.accent);

      // Terracotta canari belly + flared neck + dark cooking well
      const pot = buildLathe(
        [
          { r: 0.040 * s, y: -0.022 * s, color: soot },
          { r: 0.072 * s, y: 0.018 * s, color: clay },
          { r: 0.050 * s, y: 0.066 * s, color: clayLight },
          { r: 0.062 * s, y: 0.084 * s, color: clayLight, hardBreak: true },
          { r: 0.052 * s, y: 0.082 * s, color: soot, hardBreak: true },
          { r: 0.044 * s, y: 0.036 * s, color: soot },
        ],
        8
      );

      // Matching domed clay lid with top pinch knob, propped tilted open at back rim (-Z)
      // so standalone pot showcases the lid AND assembled Kédjénou shows the chicken inside!
      const lid = buildLathe(
        [
          { r: 0.052 * s, y: 0.0, color: soot },
          { r: 0.056 * s, y: 0.008 * s, color: clayLight, hardBreak: true },
          { r: 0.024 * s, y: 0.028 * s, color: clay },
          { r: 0.011 * s, y: 0.040 * s, color: clayLight, hardBreak: true },
        ],
        6
      );
      transformGeo(lid, {
        rot: [-0.82, 0, 0],
        pos: [0, 0.094 * s, -0.058 * s],
      });

      return mergeParts([pot, lid]);
    },
  },
  {
    id: 'planche',
    name: 'Planche',
    phase: 2,
    category: 'contenants',
    maxTriangles: 150,
    defaultParams: {
      primary: '#9C6644',
      secondary: '#7F5539',
      accent: '#B08968',
      size: 1.0,
      seed: 651,
    },
    presets: [
      { label: 'Teck naturel', params: { primary: '#9C6644', secondary: '#7F5539', accent: '#B08968', size: 1.0, seed: 651 } },
      { label: 'Acajou foncé', params: { primary: '#582F0E', secondary: '#3D1E08', accent: '#7F4F24', size: 1.0, seed: 652 } },
      { label: 'Bambou clair', params: { primary: '#DDB892', secondary: '#B08968', accent: '#EDE0D4', size: 1.0, seed: 653 } },
    ],
    hold: {
      position: [0.02, 0.005, 0.09],
      rotation: [0.04, 0.0, -0.04],
      scale: 1.0,
    },
    getAnchors: (p) => ({
      stackCenter: [0, 0.011 * p.size, 0.015 * p.size],
      stackRadius: 0.072 * p.size,
    }),
    build: (p) => {
      const s = p.size;
      const wood = toColor(p.primary);
      const edge = toColor(p.secondary);
      const inlay = toColor(p.accent);

      // Chamfered wooden serving board (21cm x 15cm)
      const board = buildLathe(
        [
          { r: 0.076 * s, y: -0.007 * s, sx: 1.32, sz: 0.98, color: edge },
          { r: 0.080 * s, y: 0.007 * s, sx: 1.32, sz: 0.98, color: edge },
          { r: 0.076 * s, y: 0.010 * s, sx: 1.32, sz: 0.98, color: wood, hardBreak: true },
          { r: 0.062 * s, y: 0.010 * s, sx: 1.32, sz: 0.98, color: inlay },
        ],
        8,
        { phaseOffset: Math.PI / 8 }
      );

      // Paddle handle extending toward -Z (toward wrist/hand)
      const handle = buildBox(0.032 * s, 0.013 * s, 0.062 * s, wood, {
        pos: [0, 0.001 * s, -0.098 * s],
      });
      const collar = buildCylinder(0.009 * s, 0.009 * s, 0.015 * s, 6, edge, {
        pos: [0, 0.001 * s, -0.118 * s],
      });

      return mergeParts([board, handle, collar]);
    },
  },
];
