import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  buildSphere,
  createRng,
  mergeParts,
  mixColors,
  toColor,
} from '../../geometryBuilder';
import type { BlvAssetDefinition } from '../../types';

export const SNACKS_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'sachet_snack',
    name: 'Sachet / Paquet (Chips)',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E63946',
      secondary: '#F4C430',
      accent: '#FFF8E7',
      size: 1.0,
      seed: 101,
    },
    presets: [
      { label: 'Chips Alloco piment', params: { primary: '#E63946', secondary: '#F4C430', accent: '#FFF8E7', size: 1.0, seed: 101 } },
      { label: 'Chips nature', params: { primary: '#1D4ED8', secondary: '#FACC15', accent: '#FFFFFF', size: 1.0, seed: 102 } },
      { label: 'Arachides grillées', params: { primary: '#15803D', secondary: '#F97316', accent: '#FEF3C7', size: 0.94, seed: 103 } },
    ],
    hold: {
      position: [0.005, -0.01, 0.015],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const bag = toColor(p.primary);
      const seal = toColor(p.secondary);
      const stripe = toColor(p.accent);
      const bagShade = toColor(p.primary, 0.86);

      // 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.056 * s, y: -0.088 * s, sx: 1.0, sz: 0.08, color: seal },
          { r: 0.054 * s, y: -0.072 * s, sx: 1.0, sz: 0.25, color: bagShade },
          { r: 0.052 * s, y: -0.025 * s, sx: 1.02, sz: 0.56, color: bag },
          { r: 0.053 * s, y: -0.022 * s, sx: 1.02, sz: 0.58, color: stripe },
          { r: 0.053 * s, y: 0.022 * s, sx: 1.02, sz: 0.58, color: stripe },
          { r: 0.052 * s, y: 0.025 * s, sx: 1.02, sz: 0.56, color: bag },
          { r: 0.054 * s, y: 0.072 * s, sx: 1.0, sz: 0.25, color: bagShade },
          { r: 0.056 * s, y: 0.088 * s, sx: 1.0, sz: 0.08, color: seal },
        ],
        8
      );
    },
  },
  {
    id: 'cornet_papier',
    name: 'Cornet de papier',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#D4A373',
      secondary: '#B07D4F',
      accent: '#C67D3B',
      size: 1.0,
      seed: 111,
    },
    presets: [
      { label: 'Arachides en cornet', params: { primary: '#D4A373', secondary: '#B07D4F', accent: '#B86B2B', size: 1.0, seed: 111 } },
      { label: 'Beignets chauds', params: { primary: '#F3EAD8', secondary: '#D97706', accent: '#CA7A2C', size: 1.05, seed: 112 } },
      { label: 'Pop-corn sucré', params: { primary: '#FFFFFF', secondary: '#DC2626', accent: '#FCE8A6', size: 1.1, seed: 113 } },
    ],
    hold: {
      position: [0.005, -0.015, 0.01],
      rotation: [0.12, 0.0, -0.06],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const rng = createRng(p.seed);
      const paper = toColor(p.primary);
      const paperFold = toColor(p.secondary);
      const snack = toColor(p.accent);

      // 5 rings x 8 radial = 80 tris + 3 nuggets (48 tris) = 128 tris, watertight
      const cone = buildLathe(
        [
          { r: 0.004 * s, y: -0.088 * s, color: paperFold },
          { r: 0.036 * s, y: 0.010 * s, color: paper },
          { r: 0.052 * s, y: 0.052 * s, color: paper },
          { r: 0.055 * s, y: 0.062 * s, color: paperFold },
          { r: 0.048 * s, y: 0.054 * s, color: paperFold },
        ],
        8
      );

      const parts: THREE.BufferGeometry[] = [cone];
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + rng() * 0.4;
        const rad = i === 0 ? 0.004 * s : 0.020 * s;
        const yOff = i === 0 ? 0.070 * s : 0.058 * s;
        const nuggetColor = mixColors(snack, toColor('#FFE4B5'), rng() * 0.28);
        parts.push(
          buildSphere(0.021 * s, 4, 3, nuggetColor, {
            pos: [Math.cos(ang) * rad, yOff, Math.sin(ang) * rad],
            scale: [1.1, 0.85, 0.95],
          })
        );
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'barre_tablette',
    name: 'Barre / Tablette',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#C81E1E',
      secondary: '#4A2511',
      accent: '#F59E0B',
      size: 1.0,
      seed: 121,
    },
    presets: [
      { label: 'Chocolat noir', params: { primary: '#C81E1E', secondary: '#3B1E10', accent: '#F59E0B', size: 1.0, seed: 121 } },
      { label: 'Barre caramel', params: { primary: '#1E40AF', secondary: '#6E3B1A', accent: '#FBBF24', size: 1.0, seed: 122 } },
      { label: 'Chocolat blanc', params: { primary: '#047857', secondary: '#F3E5AB', accent: '#FDE047', size: 1.0, seed: 123 } },
    ],
    hold: {
      position: [0.005, -0.01, 0.012],
      rotation: [0.15, 0.05, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const wrap = toColor(p.primary);
      const choc = toColor(p.secondary);
      const chocHighlight = mixColors(choc, toColor('#FFFFFF'), 0.16);
      const stripe = toColor(p.accent);

      const wrapper = buildBox(0.048 * s, 0.084 * s, 0.016 * s, wrap, {
        pos: [0, -0.022 * s, 0],
        bands: [
          { y0: 0, y1: 0.78, color: wrap },
          { y0: 0.78, y1: 1.0, color: stripe },
        ],
      });

      const barBase = buildBox(0.044 * s, 0.046 * s, 0.013 * s, choc, {
        pos: [0, 0.042 * s, 0],
      });

      const sq1 = buildBox(0.017 * s, 0.017 * s, 0.004 * s, chocHighlight, {
        pos: [-0.010 * s, 0.052 * s, 0.0075 * s],
      });
      const sq2 = buildBox(0.017 * s, 0.017 * s, 0.004 * s, chocHighlight, {
        pos: [0.010 * s, 0.052 * s, 0.0075 * s],
      });
      const sq3 = buildBox(0.017 * s, 0.017 * s, 0.004 * s, chocHighlight, {
        pos: [-0.010 * s, 0.032 * s, 0.0075 * s],
      });
      const sq4 = buildBox(0.017 * s, 0.017 * s, 0.004 * s, chocHighlight, {
        pos: [0.010 * s, 0.032 * s, 0.0075 * s],
      });

      return mergeParts([wrapper, barBase, sq1, sq2, sq3, sq4]);
    },
  },
  {
    id: 'sachet_bonbons',
    name: 'Sachet de bonbons',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#EC4899',
      secondary: '#FDE047',
      accent: '#38BDF8',
      size: 1.0,
      seed: 131,
    },
    presets: [
      { label: 'Fruits tropicaux', params: { primary: '#EC4899', secondary: '#FDE047', accent: '#38BDF8', size: 1.0, seed: 131 } },
      { label: 'Menthe fraîche', params: { primary: '#10B981', secondary: '#ECFDF5', accent: '#047857', size: 1.0, seed: 132 } },
      { label: 'Caramels lait', params: { primary: '#D97706', secondary: '#FEF3C7', accent: '#78350F', size: 1.0, seed: 133 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.014],
      rotation: [0.1, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const pouch = toColor(p.primary);
      const band = toColor(p.secondary);
      const candy = toColor(p.accent);

      // 8 rings x 7 radial = 112 tris + 2 bulges (32 tris) = 144 tris, watertight
      const bag = buildLathe(
        [
          { r: 0.044 * s, y: -0.072 * s, sx: 1.0, sz: 0.08, color: band },
          { r: 0.038 * s, y: -0.056 * s, sx: 1.0, sz: 0.14, color: pouch },
          { r: 0.042 * s, y: -0.015 * s, sx: 1.0, sz: 0.50, color: pouch },
          { r: 0.0425 * s, y: -0.013 * s, sx: 1.0, sz: 0.50, color: band },
          { r: 0.0425 * s, y: 0.018 * s, sx: 1.0, sz: 0.50, color: band },
          { r: 0.040 * s, y: 0.020 * s, sx: 1.0, sz: 0.46, color: pouch },
          { r: 0.036 * s, y: 0.056 * s, sx: 1.0, sz: 0.14, color: pouch },
          { r: 0.046 * s, y: 0.072 * s, sx: 1.0, sz: 0.08, color: band },
        ],
        7
      );

      const bulge1 = buildSphere(0.017 * s, 4, 3, candy, {
        pos: [-0.013 * s, -0.025 * s, 0.012 * s],
        scale: [1.0, 0.85, 0.65],
      });
      const bulge2 = buildSphere(0.016 * s, 4, 3, candy, {
        pos: [0.014 * s, 0.026 * s, -0.010 * s],
        scale: [1.0, 0.85, 0.65],
      });

      return mergeParts([bag, bulge1, bulge2]);
    },
  },
  {
    id: 'sucette',
    name: 'Sucette',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E11D48',
      secondary: '#F8FAFC',
      accent: '#FACC15',
      size: 1.0,
      seed: 141,
    },
    presets: [
      { label: 'Fraise-vanille', params: { primary: '#E11D48', secondary: '#F8FAFC', accent: '#FDE047', size: 1.0, seed: 141 } },
      { label: 'Cola-citron', params: { primary: '#78350F', secondary: '#F8FAFC', accent: '#F59E0B', size: 1.0, seed: 142 } },
      { label: 'Menthe-pomme', params: { primary: '#16A34A', secondary: '#F8FAFC', accent: '#86EFAC', size: 1.0, seed: 143 } },
    ],
    hold: {
      position: [0.004, 0.01, 0.008],
      rotation: [0.18, 0.0, -0.08],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const headC = toColor(p.primary);
      const stickC = toColor(p.secondary);
      const ringC = toColor(p.accent);

      const stick = buildCylinder(0.0032 * s, 0.0032 * s, 0.105 * s, 5, stickC, {
        pos: [0, -0.005 * s, 0],
      });

      const collar = buildCylinder(0.009 * s, 0.005 * s, 0.014 * s, 6, ringC, {
        pos: [0, 0.044 * s, 0],
      });

      // 6 rings x 8 radial = 96 tris + 20 stick + 24 collar = 140 tris, watertight
      const candy = buildLathe(
        [
          { r: 0.005 * s, y: 0.048 * s, color: headC },
          { r: 0.022 * s, y: 0.056 * s, color: headC },
          { r: 0.026 * s, y: 0.068 * s, color: ringC },
          { r: 0.026 * s, y: 0.075 * s, color: ringC },
          { r: 0.022 * s, y: 0.087 * s, color: headC },
          { r: 0.006 * s, y: 0.095 * s, color: headC },
        ],
        8
      );

      return mergeParts([stick, collar, candy]);
    },
  },
  {
    id: 'plaquette_chewing_gum',
    name: 'Plaquette de chewing-gum',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#0EA5E9',
      secondary: '#F1F5F9',
      accent: '#10B981',
      size: 1.0,
      seed: 151,
    },
    presets: [
      { label: 'Menthe glaciale', params: { primary: '#0EA5E9', secondary: '#F1F5F9', accent: '#10B981', size: 1.0, seed: 151 } },
      { label: 'Fraise-pastèque', params: { primary: '#F43F5E', secondary: '#FFF1F2', accent: '#22C55E', size: 1.0, seed: 152 } },
      { label: 'Eucalyptus', params: { primary: '#065F46', secondary: '#ECFDF5', accent: '#34D399', size: 1.0, seed: 153 } },
    ],
    hold: {
      position: [0.004, 0.0, 0.012],
      rotation: [0.22, 0.1, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const sleeve = toColor(p.primary);
      const gum = toColor(p.secondary);
      const strip = toColor(p.accent);

      const base = buildBox(0.056 * s, 0.092 * s, 0.008 * s, sleeve, {
        bands: [
          { y0: 0.0, y1: 0.82, color: sleeve },
          { y0: 0.82, y1: 1.0, color: strip },
        ],
      });

      const parts: THREE.BufferGeometry[] = [base];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const x = (col === 0 ? -0.013 : 0.013) * s;
          const y = (-0.026 + row * 0.022) * s;
          parts.push(
            buildBox(0.018 * s, 0.013 * s, 0.005 * s, gum, {
              pos: [x, y, 0.005 * s],
            })
          );
        }
      }

      return mergeParts(parts);
    },
  },
  {
    id: 'paquet_biscuits',
    name: 'Paquet de biscuits',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#E07A2F',
      secondary: '#FEF3C7',
      accent: '#7C2D12',
      size: 1.0,
      seed: 161,
    },
    presets: [
      { label: 'Biscuits beurre', params: { primary: '#D97706', secondary: '#FEF3C7', accent: '#92400E', size: 1.0, seed: 161 } },
      { label: 'Biscuits chocolat', params: { primary: '#5C3317', secondary: '#F59E0B', accent: '#FDE68A', size: 1.0, seed: 162 } },
      { label: 'Sablés vanille', params: { primary: '#2563EB', secondary: '#FFFFFF', accent: '#FACC15', size: 1.0, seed: 163 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.01],
      rotation: [0.08, 0.0, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const wrap = toColor(p.primary);
      const band = toColor(p.secondary);
      const trim = toColor(p.accent);
      const crimp = toColor(p.primary, 0.78);

      // 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.028 * s, y: -0.084 * s, sx: 1.0, sz: 0.16, color: crimp },
          { r: 0.031 * s, y: -0.070 * s, color: wrap },
          { r: 0.031 * s, y: -0.040 * s, color: trim },
          { r: 0.032 * s, y: -0.032 * s, color: band },
          { r: 0.032 * s, y: 0.032 * s, color: band },
          { r: 0.031 * s, y: 0.040 * s, color: trim },
          { r: 0.031 * s, y: 0.070 * s, color: wrap },
          { r: 0.028 * s, y: 0.084 * s, sx: 1.0, sz: 0.16, color: crimp },
        ],
        8
      );
    },
  },
  {
    id: 'boite_conserve',
    name: 'Boîte ronde (conserve)',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#DC2626',
      secondary: '#CBD5E1',
      accent: '#FACC15',
      size: 1.0,
      seed: 171,
    },
    presets: [
      { label: 'Concentré de tomate', params: { primary: '#DC2626', secondary: '#CBD5E1', accent: '#FACC15', size: 1.0, seed: 171 } },
      { label: 'Maïs doux', params: { primary: '#EAB308', secondary: '#CBD5E1', accent: '#15803D', size: 1.0, seed: 172 } },
      { label: 'Lait concentré', params: { primary: '#F8FAFC', secondary: '#CBD5E1', accent: '#1D4ED8', size: 0.92, seed: 173 } },
    ],
    hold: {
      position: [0.008, 0.0, 0.008],
      rotation: [0.04, 0.0, -0.04],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const label = toColor(p.primary);
      const tin = toColor(p.secondary);
      const tinDark = toColor(p.secondary, 0.78);
      const trim = toColor(p.accent);

      // 8 rings x 8 radial = 128 tris, watertight
      return buildLathe(
        [
          { r: 0.035 * s, y: -0.052 * s, color: tinDark },
          { r: 0.039 * s, y: -0.046 * s, color: tin },
          { r: 0.0375 * s, y: -0.036 * s, color: trim },
          { r: 0.0375 * s, y: -0.022 * s, color: label },
          { r: 0.0375 * s, y: 0.024 * s, color: label },
          { r: 0.0375 * s, y: 0.036 * s, color: trim },
          { r: 0.039 * s, y: 0.048 * s, color: tin },
          { r: 0.035 * s, y: 0.050 * s, color: tinDark },
        ],
        8
      );
    },
  },
  {
    id: 'boite_sardines',
    name: 'Boîte plate (sardines)',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#1D4ED8',
      secondary: '#CBD5E1',
      accent: '#F59E0B',
      size: 1.0,
      seed: 181,
    },
    presets: [
      { label: 'Sardines huile', params: { primary: '#1D4ED8', secondary: '#CBD5E1', accent: '#F59E0B', size: 1.0, seed: 181 } },
      { label: 'Sardines tomate', params: { primary: '#DC2626', secondary: '#CBD5E1', accent: '#FDE047', size: 1.0, seed: 182 } },
      { label: 'Sardines piment', params: { primary: '#047857', secondary: '#CBD5E1', accent: '#EF4444', size: 1.0, seed: 183 } },
    ],
    hold: {
      position: [0.005, 0.0, 0.012],
      rotation: [0.25, 0.1, -0.05],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const lid = toColor(p.primary);
      const tin = toColor(p.secondary);
      const tinDark = toColor(p.secondary, 0.8);
      const accent = toColor(p.accent);

      const body = buildLathe(
        [
          { r: 0.032 * s, y: -0.014 * s, sx: 1.0, sz: 1.65, color: tinDark },
          { r: 0.034 * s, y: -0.012 * s, sx: 1.0, sz: 1.65, color: tin },
          { r: 0.034 * s, y: 0.011 * s, sx: 1.0, sz: 1.65, color: tin },
          { r: 0.0355 * s, y: 0.014 * s, sx: 1.0, sz: 1.65, color: tinDark },
          { r: 0.032 * s, y: 0.0145 * s, sx: 1.0, sz: 1.65, color: lid },
        ],
        10
      );

      const band = buildBox(0.044 * s, 0.003 * s, 0.028 * s, accent, {
        pos: [0, 0.0155 * s, -0.008 * s],
      });
      const pullKey = buildCylinder(0.008 * s, 0.008 * s, 0.004 * s, 6, tinDark, {
        pos: [0, 0.016 * s, 0.034 * s],
      });

      return mergeParts([body, band, pullKey]);
    },
  },
  {
    id: 'pot_yaourt',
    name: 'Pot de yaourt',
    category: 'snacks',
    maxTriangles: 150,
    defaultParams: {
      primary: '#FAFAFA',
      secondary: '#F43F5E',
      accent: '#E2E8F0',
      size: 1.0,
      seed: 191,
    },
    presets: [
      { label: 'Yaourt fraise', params: { primary: '#FAFAFA', secondary: '#F43F5E', accent: '#E2E8F0', size: 1.0, seed: 191 } },
      { label: 'Yaourt vanille', params: { primary: '#FFFBEB', secondary: '#EAB308', accent: '#FDE68A', size: 1.0, seed: 192 } },
      { label: 'Yaourt nature sucré', params: { primary: '#FFFFFF', secondary: '#2563EB', accent: '#CBD5E1', size: 1.0, seed: 193 } },
    ],
    hold: {
      position: [0.006, 0.0, 0.008],
      rotation: [0.05, 0.0, -0.04],
      scale: 1.0,
    },
    build: (p) => {
      const s = p.size;
      const cup = toColor(p.primary);
      const band = toColor(p.secondary);
      const foil = toColor(p.accent);
      const cupShade = toColor(p.primary, 0.88);

      // 7 rings x 8 radial = 112 tris + 12 tab = 124 tris, watertight
      const pot = buildLathe(
        [
          { r: 0.025 * s, y: -0.036 * s, color: cupShade },
          { r: 0.029 * s, y: -0.012 * s, color: cup },
          { r: 0.0305 * s, y: -0.008 * s, color: band },
          { r: 0.034 * s, y: 0.022 * s, color: band },
          { r: 0.037 * s, y: 0.030 * s, color: cup },
          { r: 0.039 * s, y: 0.034 * s, color: cup },
          { r: 0.0395 * s, y: 0.036 * s, color: foil },
        ],
        8
      );

      const tab = buildBox(0.014 * s, 0.002 * s, 0.012 * s, foil, {
        pos: [0, 0.036 * s, 0.042 * s],
      });

      return mergeParts([pot, tab]);
    },
  },
];
