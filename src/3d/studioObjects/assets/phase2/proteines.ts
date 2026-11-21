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
import type { BlvAssetDefinition, BlvAssetParams, BlvDishAnchor } from '../../types';

function resolveProteinSpace(params: BlvAssetParams, anchor?: BlvDishAnchor) {
  const s = params.size;
  const cx = anchor ? anchor.stackCenter[0] : 0;
  const cy = anchor ? anchor.stackCenter[1] : 0;
  const cz = anchor ? anchor.stackCenter[2] : 0;
  const scaleFactor = anchor ? Math.min(1.15, Math.max(0.75, anchor.stackRadius / 0.052)) : 1.0;
  return { s: s * scaleFactor, cx, cy, cz };
}

function buildDrumstick(s: number, skin: THREE.Color, bone: THREE.Color, sear: THREE.Color) {
  return buildLathe(
    [
      { r: 0.004 * s, y: 0.0, color: bone },
      { r: 0.005 * s, y: 0.012 * s, color: bone },
      { r: 0.006 * s, y: 0.014 * s, color: sear, hardBreak: true },
      { r: 0.015 * s, y: 0.036 * s, color: skin },
      { r: 0.013 * s, y: 0.054 * s, color: skin },
    ],
    6
  );
}

export const PROTEINES_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'poulet_entier',
    name: 'Poulet entier',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#C96A22',
      secondary: '#7C320B',
      accent: '#F5E6CC',
      size: 1.0,
      seed: 801,
    },
    presets: [
      { label: 'Poulet braisé doré', params: { primary: '#C96A22', secondary: '#7C320B', accent: '#F5E6CC', size: 1.0, seed: 801 } },
      { label: 'Poulet kédjénou mijoté', params: { primary: '#B45309', secondary: '#991B1B', accent: '#FDE68A', size: 0.96, seed: 802 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.044 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const sear = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Plump roasted bird torso lying along Z
      const torso = transformGeo(
        buildLathe(
          [
            { r: 0.016 * s, y: -0.048 * s, sx: 1.1, sz: 0.9, color: sear },
            { r: 0.033 * s, y: -0.022 * s, sx: 1.15, sz: 0.95, color: skin },
            { r: 0.035 * s, y: 0.014 * s, sx: 1.12, sz: 0.95, color: skin },
            { r: 0.020 * s, y: 0.044 * s, sx: 1.0, sz: 0.9, color: sear },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0, 0], pos: [0, 0.026 * s, 0] }
      );

      const legL = transformGeo(buildDrumstick(s, skin, bone, sear), {
        rot: [-1.15, 0.25, 0],
        pos: [-0.026 * s, 0.020 * s, -0.016 * s],
      });
      const legR = transformGeo(buildDrumstick(s, skin, bone, sear), {
        rot: [-1.15, -0.25, 0],
        pos: [0.026 * s, 0.020 * s, -0.016 * s],
      });
      const wingL = buildBox(0.012 * s, 0.018 * s, 0.038 * s, sear, {
        pos: [-0.036 * s, 0.024 * s, 0.014 * s],
        rot: [0.2, 0.15, 0.2],
      });
      const wingR = buildBox(0.012 * s, 0.018 * s, 0.038 * s, sear, {
        pos: [0.036 * s, 0.024 * s, 0.014 * s],
        rot: [0.2, -0.15, -0.2],
      });

      return transformGeo(mergeParts([torso, legL, legR, wingL, wingR]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'demi_poulet',
    name: 'Demi-poulet',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#D4732A',
      secondary: '#5C2208',
      accent: '#F5E6CC',
      size: 1.0,
      seed: 811,
    },
    presets: [
      { label: 'Demi-poulet braisé', params: { primary: '#D4732A', secondary: '#5C2208', accent: '#F5E6CC', size: 1.0, seed: 811 } },
      { label: 'Demi-poulet rôti épicé', params: { primary: '#B91C1C', secondary: '#450A0A', accent: '#FDE68A', size: 1.0, seed: 812 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.032 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const char = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Flattened split half-chicken breast/rib section
      const halfBody = transformGeo(
        buildLathe(
          [
            { r: 0.014 * s, y: -0.042 * s, sx: 1.25, sz: 0.55, color: char },
            { r: 0.030 * s, y: -0.010 * s, sx: 1.25, sz: 0.58, color: skin },
            { r: 0.026 * s, y: 0.024 * s, sx: 1.15, sz: 0.55, color: skin },
            { r: 0.012 * s, y: 0.042 * s, sx: 1.0, sz: 0.5, color: char },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0.25, 0], pos: [-0.008 * s, 0.016 * s, 0] }
      );

      const thighLeg = transformGeo(buildDrumstick(s * 1.05, skin, bone, char), {
        rot: [-1.25, -0.4, 0.15],
        pos: [0.024 * s, 0.018 * s, -0.018 * s],
      });

      const wing = buildBox(0.014 * s, 0.015 * s, 0.034 * s, mixColors(skin, char, 0.4), {
        pos: [-0.028 * s, 0.018 * s, 0.016 * s],
        rot: [0.15, -0.35, 0.2],
      });

      // 2 dark charcoal grill marks on top
      const mark1 = buildBox(0.036 * s, 0.004 * s, 0.006 * s, char, {
        pos: [-0.005 * s, 0.031 * s, 0.006 * s],
        rot: [0, 0.35, 0],
      });
      const mark2 = buildBox(0.034 * s, 0.004 * s, 0.006 * s, char, {
        pos: [-0.005 * s, 0.030 * s, -0.010 * s],
        rot: [0, 0.35, 0],
      });

      return transformGeo(mergeParts([halfBody, thighLeg, wing, mark1, mark2]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'poulet_morceaux',
    name: 'Morceaux de poulet',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#C25E1A',
      secondary: '#6B2B09',
      accent: '#F5E6CC',
      size: 1.0,
      seed: 821,
    },
    presets: [
      { label: 'Morceaux braisés', params: { primary: '#C25E1A', secondary: '#6B2B09', accent: '#F5E6CC', size: 1.0, seed: 821 } },
      { label: 'Poulet frit croustillant', params: { primary: '#E0922B', secondary: '#92400E', accent: '#FEF3C7', size: 1.0, seed: 822 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.030 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const sear = toColor(p.secondary);
      const bone = toColor(p.accent);

      const leg = transformGeo(buildDrumstick(s, skin, bone, sear), {
        rot: [-1.2, 0.6, 0],
        pos: [-0.022 * s, 0.014 * s, -0.012 * s],
      });

      const thigh = buildSphere(0.022 * s, 6, 4, mixColors(skin, sear, 0.25), {
        pos: [0.018 * s, 0.016 * s, -0.010 * s],
        scale: [1.15, 0.72, 0.95],
      });

      const breastChunk = buildBox(0.032 * s, 0.022 * s, 0.026 * s, skin, {
        pos: [0.002 * s, 0.018 * s, 0.022 * s],
        rot: [0.1, 0.4, -0.1],
      });

      const wingChunk = buildBox(0.028 * s, 0.015 * s, 0.018 * s, sear, {
        pos: [-0.018 * s, 0.026 * s, 0.012 * s],
        rot: [-0.25, -0.5, 0.2],
      });

      return transformGeo(mergeParts([leg, thigh, breastChunk, wingChunk]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'pintade',
    name: 'Pintade',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#9C4215',
      secondary: '#4A1B07',
      accent: '#EED6B3',
      size: 1.0,
      seed: 831,
    },
    presets: [
      { label: 'Pintade braisée', params: { primary: '#9C4215', secondary: '#4A1B07', accent: '#EED6B3', size: 1.0, seed: 831 } },
      { label: 'Pintade fumée', params: { primary: '#78350F', secondary: '#3B1806', accent: '#D6B88D', size: 1.0, seed: 832 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.038 * p.size, 0], stackRadius: 0.040 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const dark = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Leaner, longer gamebird silhouette compared to poulet_entier
      const body = transformGeo(
        buildLathe(
          [
            { r: 0.012 * s, y: -0.054 * s, sx: 0.92, sz: 0.85, color: dark },
            { r: 0.027 * s, y: -0.022 * s, sx: 0.96, sz: 0.88, color: skin },
            { r: 0.029 * s, y: 0.016 * s, sx: 0.94, sz: 0.88, color: skin },
            { r: 0.015 * s, y: 0.048 * s, sx: 0.88, sz: 0.82, color: dark },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0, 0], pos: [0, 0.022 * s, 0] }
      );

      const legL = transformGeo(buildDrumstick(s * 0.95, skin, bone, dark), {
        rot: [-1.1, 0.35, 0],
        pos: [-0.022 * s, 0.018 * s, -0.014 * s],
      });
      const legR = transformGeo(buildDrumstick(s * 0.95, skin, bone, dark), {
        rot: [-1.1, -0.35, 0],
        pos: [0.022 * s, 0.018 * s, -0.014 * s],
      });
      const wingL = buildBox(0.010 * s, 0.016 * s, 0.040 * s, dark, {
        pos: [-0.029 * s, 0.020 * s, 0.014 * s],
        rot: [0.18, 0.15, 0.25],
      });
      const wingR = buildBox(0.010 * s, 0.016 * s, 0.040 * s, dark, {
        pos: [0.029 * s, 0.020 * s, 0.014 * s],
        rot: [0.18, -0.15, -0.25],
      });

      return transformGeo(mergeParts([body, legL, legR, wingL, wingR]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'lapin_agouti',
    name: 'Lapin / Agouti',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#8C431C',
      secondary: '#4B1F0A',
      accent: '#E6CCB2',
      size: 1.0,
      seed: 841,
    },
    presets: [
      { label: 'Agouti braisé (gibier)', params: { primary: '#7C3816', secondary: '#3D1907', accent: '#DEC1A2', size: 1.0, seed: 841 } },
      { label: 'Lapin rôti aux herbes', params: { primary: '#B8622A', secondary: '#6E3210', accent: '#F2E0C8', size: 1.0, seed: 842 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.032 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const meat = toColor(p.primary);
      const sear = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Elongated roasted saddle / râble + muscular haunches
      const saddle = transformGeo(
        buildLathe(
          [
            { r: 0.018 * s, y: -0.048 * s, sx: 1.1, sz: 0.72, color: sear },
            { r: 0.026 * s, y: -0.015 * s, sx: 1.15, sz: 0.76, color: meat },
            { r: 0.024 * s, y: 0.022 * s, sx: 1.1, sz: 0.76, color: meat },
            { r: 0.016 * s, y: 0.048 * s, sx: 1.0, sz: 0.72, color: sear },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0.15, 0], pos: [0, 0.016 * s, 0] }
      );

      const haunchL = buildSphere(0.022 * s, 5, 4, mixColors(meat, sear, 0.25), {
        pos: [-0.026 * s, 0.016 * s, -0.020 * s],
        scale: [0.85, 0.85, 1.3],
      });
      const haunchR = buildSphere(0.022 * s, 5, 4, mixColors(meat, sear, 0.25), {
        pos: [0.026 * s, 0.016 * s, -0.020 * s],
        scale: [0.85, 0.85, 1.3],
      });
      const boneTip = buildCylinder(0.004 * s, 0.005 * s, 0.022 * s, 5, bone, {
        pos: [0.026 * s, 0.018 * s, -0.046 * s],
        rot: [Math.PI / 2, 0, 0],
      });

      return transformGeo(mergeParts([saddle, haunchL, haunchR, boneTip]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'steak_entrecote',
    name: 'Steak / Entrecôte',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#7A2E1E',
      secondary: '#38130B',
      accent: '#E8C5A5',
      size: 1.0,
      seed: 851,
    },
    presets: [
      { label: 'Entrecôte grillée', params: { primary: '#7A2E1E', secondary: '#38130B', accent: '#E8C5A5', size: 1.0, seed: 851 } },
      { label: 'Steak saignant', params: { primary: '#992820', secondary: '#4A130F', accent: '#F3D4BA', size: 1.0, seed: 852 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.022 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const meat = toColor(p.primary);
      const sear = toColor(p.secondary);
      const fat = toColor(p.accent);

      // Thick organic kidney-oval steak slab
      const slab = buildLathe(
        [
          { r: 0.042 * s, y: 0.0, sx: 1.25, sz: 0.85, ox: 0.004 * s, color: sear },
          { r: 0.046 * s, y: 0.010 * s, sx: 1.25, sz: 0.86, ox: 0, color: sear },
          { r: 0.044 * s, y: 0.020 * s, sx: 1.25, sz: 0.85, ox: 0, color: meat, hardBreak: true },
          { r: 0.024 * s, y: 0.021 * s, sx: 1.2, sz: 0.8, ox: 0, color: meat },
        ],
        9
      );

      // Marbling fat edge cap + 3 criss-cross grill sear stripes
      const fatStrip = buildBox(0.018 * s, 0.016 * s, 0.014 * s, fat, {
        pos: [0.044 * s, 0.011 * s, -0.012 * s],
        rot: [0, 0.4, 0],
      });
      const g1 = buildBox(0.066 * s, 0.003 * s, 0.006 * s, sear, {
        pos: [0, 0.0215 * s, -0.014 * s],
        rot: [0, 0.4, 0],
      });
      const g2 = buildBox(0.068 * s, 0.003 * s, 0.006 * s, sear, {
        pos: [0, 0.0215 * s, 0.0],
        rot: [0, 0.4, 0],
      });
      const g3 = buildBox(0.060 * s, 0.003 * s, 0.006 * s, sear, {
        pos: [0, 0.0215 * s, 0.014 * s],
        rot: [0, -0.45, 0],
      });

      return transformGeo(mergeParts([slab, fatStrip, g1, g2, g3]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'cotelette',
    name: 'Côtelette',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#8B3A22',
      secondary: '#451A0D',
      accent: '#F5EFE6',
      size: 1.0,
      seed: 861,
    },
    presets: [
      { label: 'Côtelette d’agneau', params: { primary: '#8B3A22', secondary: '#451A0D', accent: '#F5EFE6', size: 1.0, seed: 861 } },
      { label: 'Côtelette de porc grillée', params: { primary: '#B86636', secondary: '#5C2C12', accent: '#FFFDF7', size: 1.06, seed: 862 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.020 * p.size, 0], stackRadius: 0.038 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const meat = toColor(p.primary);
      const sear = toColor(p.secondary);
      const boneC = toColor(p.accent);

      const chop = buildLathe(
        [
          { r: 0.032 * s, y: 0.0, sx: 1.15, sz: 0.82, color: sear },
          { r: 0.034 * s, y: 0.010 * s, sx: 1.15, sz: 0.82, color: sear },
          { r: 0.032 * s, y: 0.018 * s, sx: 1.15, sz: 0.82, color: meat, hardBreak: true },
        ],
        8
      );
      transformGeo(chop, { pos: [-0.010 * s, 0, 0] });

      // Curved white rib bone extending cleanly out the side
      const bone = buildTube(
        [
          { pos: [0.014 * s, 0.010 * s, 0], rx: 0.005 * s, rz: 0.004 * s, color: boneC },
          { pos: [0.036 * s, 0.012 * s, -0.008 * s], rx: 0.0045 * s, rz: 0.0038 * s, color: boneC },
          { pos: [0.056 * s, 0.016 * s, -0.022 * s], rx: 0.004 * s, rz: 0.0035 * s, color: boneC },
        ],
        5
      );

      const sear1 = buildBox(0.042 * s, 0.003 * s, 0.006 * s, sear, {
        pos: [-0.010 * s, 0.019 * s, -0.006 * s],
        rot: [0, 0.45, 0],
      });
      const sear2 = buildBox(0.042 * s, 0.003 * s, 0.006 * s, sear, {
        pos: [-0.010 * s, 0.019 * s, 0.008 * s],
        rot: [0, 0.45, 0],
      });

      return transformGeo(mergeParts([chop, bone, sear1, sear2]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'mouton_braise',
    name: 'Mouton braisé (Choukouya)',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#7D3518',
      secondary: '#3A1508',
      accent: '#C46A28',
      size: 1.0,
      seed: 871,
    },
    presets: [
      { label: 'Choukouya d’Abidjan', params: { primary: '#7D3518', secondary: '#3A1508', accent: '#C46A28', size: 1.0, seed: 871 } },
      { label: 'Dibiterie fumée', params: { primary: '#632812', secondary: '#290E05', accent: '#A85524', size: 1.0, seed: 872 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.032 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const rng = createRng(p.seed);
      const meat = toColor(p.primary);
      const char = toColor(p.secondary);
      const spice = toColor(p.accent);

      // Mound of 8 charred, spiced grilled mutton chunks
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 8; i++) {
        const layer = i < 5 ? 0 : 1;
        const ang = layer === 0 ? (i / 5) * Math.PI * 2 : ((i - 5) / 3) * Math.PI * 2 + 0.5;
        const dist = layer === 0 ? 0.024 * s : 0.012 * s;
        const y = layer === 0 ? 0.012 * s : 0.026 * s;
        const col = i % 3 === 0 ? char : mixColors(meat, spice, rng() * 0.5);
        parts.push(
          buildBox((0.022 + rng() * 0.008) * s, (0.018 + rng() * 0.006) * s, (0.020 + rng() * 0.008) * s, col, {
            pos: [Math.cos(ang) * dist, y, Math.sin(ang) * dist],
            rot: [rng() * 0.5, ang + rng(), rng() * 0.5],
          })
        );
      }

      // 1 rib bone tip peeking out for readability
      parts.push(
        buildCylinder(0.004 * s, 0.004 * s, 0.026 * s, 5, toColor('#EDE0D4'), {
          pos: [0.032 * s, 0.018 * s, 0.008 * s],
          rot: [0.2, 0, -1.1],
        })
      );

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'brochette',
    name: 'Brochette',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#8A381B',
      secondary: '#42180A',
      accent: '#E2B887',
      size: 1.0,
      seed: 881,
    },
    presets: [
      { label: 'Brochette bœuf-oignon', params: { primary: '#8A381B', secondary: '#42180A', accent: '#E2B887', size: 1.0, seed: 881 } },
      { label: 'Brochette poulet-poivron', params: { primary: '#D97724', secondary: '#16A34A', accent: '#F3D299', size: 1.0, seed: 882 } },
    ],
    hold: { position: [0.01, 0.0, 0.04], rotation: [0.1, 0.25, -0.05], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.026 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const meat = toColor(p.primary);
      const sear = toColor(p.secondary);
      const skewerC = toColor(p.accent);
      const onionC = toColor('#F5EFE6');

      // Bamboo skewer running diagonally across plate
      const skewer = buildCylinder(0.0022 * s, 0.0018 * s, 0.145 * s, 5, skewerC, {
        pos: [0, 0.016 * s, 0],
        rot: [Math.PI / 2, 0.35, 0],
      });

      const parts: THREE.BufferGeometry[] = [skewer];
      const cosA = Math.cos(0.35);
      const sinA = Math.sin(0.35);

      // 4 grilled meat cubes + 3 onion/pepper spacers along skewer
      for (let i = 0; i < 4; i++) {
        const d = (-0.039 + i * 0.026) * s;
        parts.push(
          buildBox(0.021 * s, 0.020 * s, 0.018 * s, i % 2 === 0 ? meat : mixColors(meat, sear, 0.45), {
            pos: [sinA * d, 0.016 * s, cosA * d],
            rot: [0.15, 0.35 + i * 0.3, 0.1],
          })
        );
        if (i < 3) {
          const dv = (-0.026 + i * 0.026) * s;
          parts.push(
            buildCylinder(0.011 * s, 0.011 * s, 0.006 * s, 6, i === 1 ? sear : onionC, {
              pos: [sinA * dv, 0.016 * s, cosA * dv],
              rot: [Math.PI / 2, 0.35, 0],
            })
          );
        }
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'merguez_saucisse',
    name: 'Merguez / Saucisse',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#B92B1D',
      secondary: '#5E130B',
      accent: '#E06038',
      size: 1.0,
      seed: 891,
    },
    presets: [
      { label: 'Merguez grillées', params: { primary: '#B92B1D', secondary: '#5E130B', accent: '#E06038', size: 1.0, seed: 891 } },
      { label: 'Saucisses fumées', params: { primary: '#9C4828', secondary: '#4A1F0E', accent: '#C6734B', size: 1.12, seed: 892 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.022 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const link = toColor(p.primary);
      const char = toColor(p.secondary);
      const shine = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 3 curved plump grilled sausages side-by-side
      const offsets: Array<[number, number, number]> = [
        [-0.020 * s, 0.010 * s, 0.15],
        [0.0, 0.016 * s, -0.08],
        [0.020 * s, 0.010 * s, -0.22],
      ];

      for (const [ox, oy, yaw] of offsets) {
        const sausage = buildTube(
          [
            { pos: [-0.006 * s, oy, -0.046 * s], rx: 0.004 * s, rz: 0.004 * s, color: char },
            { pos: [0.0, oy, -0.032 * s], rx: 0.010 * s, rz: 0.010 * s, color: link },
            { pos: [0.004 * s, oy + 0.002 * s, 0.0], rx: 0.0105 * s, rz: 0.0105 * s, color: shine },
            { pos: [0.0, oy, 0.032 * s], rx: 0.010 * s, rz: 0.010 * s, color: link },
            { pos: [-0.006 * s, oy, 0.046 * s], rx: 0.004 * s, rz: 0.004 * s, color: char },
          ],
          5
        );
        transformGeo(sausage, { rot: [0, yaw, 0], pos: [ox, 0, 0] });
        parts.push(sausage);
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'gesiers',
    name: 'Gésiers',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#782E1C',
      secondary: '#42160C',
      accent: '#B8562C',
      size: 1.0,
      seed: 901,
    },
    presets: [
      { label: 'Gésiers sautés pimentés', params: { primary: '#782E1C', secondary: '#42160C', accent: '#B8562C', size: 1.0, seed: 901 } },
      { label: 'Gésiers confits', params: { primary: '#9C4B26', secondary: '#59250E', accent: '#D47B46', size: 1.0, seed: 902 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.026 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const rng = createRng(p.seed);
      const main = toColor(p.primary);
      const dark = toColor(p.secondary);
      const glaze = toColor(p.accent);

      // 7 plump bean-shaped sautéed gizzard morsels (7 * 24 = 168 tris)
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) {
        const layer = i < 5 ? 0 : 1;
        const ang = layer === 0 ? (i / 5) * Math.PI * 2 : ((i - 5) / 2) * Math.PI + 0.4;
        const dist = layer === 0 ? 0.025 * s : 0.011 * s;
        const y = layer === 0 ? 0.011 * s : 0.022 * s;
        const col = mixColors(main, i % 2 === 0 ? glaze : dark, rng() * 0.55);

        parts.push(
          buildSphere(0.014 * s, 5, 3, col, {
            pos: [Math.cos(ang) * dist, y, Math.sin(ang) * dist],
            rot: [rng() * 0.4, ang, rng() * 0.4],
            scale: [1.3, 0.72, 0.95],
          })
        );
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'poisson_ovale',
    name: 'Poisson ovale (Carpe / Tilapia)',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#B86A2B',
      secondary: '#4A240C',
      accent: '#E8CFA8',
      size: 1.0,
      seed: 911,
    },
    presets: [
      { label: 'Carpe braisée', params: { primary: '#B86A2B', secondary: '#4A240C', accent: '#E8CFA8', size: 1.0, seed: 911 } },
      { label: 'Tilapia frit doré', params: { primary: '#D98A2B', secondary: '#7C3E0E', accent: '#FDE68A', size: 1.0, seed: 912 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.026 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const sear = toColor(p.secondary);
      const belly = toColor(p.accent);

      // Deep-bodied oval fish lying on its side (+Y up is thickness, XZ is silhouette)
      const body = transformGeo(
        buildLathe(
          [
            { r: 0.008 * s, y: -0.056 * s, sx: 0.72, sz: 1.25, color: sear }, // tail peduncle
            { r: 0.026 * s, y: -0.024 * s, sx: 0.55, sz: 1.48, color: skin },
            { r: 0.031 * s, y: 0.014 * s, sx: 0.52, sz: 1.45, color: belly },
            { r: 0.016 * s, y: 0.048 * s, sx: 0.55, sz: 1.15, color: sear },
            { r: 0.004 * s, y: 0.058 * s, sx: 0.55, sz: 0.9, color: sear }, // snout
          ],
          8
        ),
        { rot: [0, 0, Math.PI / 2], pos: [0, 0.016 * s, 0] }
      );
      //Wait: rotate Z PI/2 puts Y axis along -X (tail at +X, head at -X). Scale sx along X (thickness? wait: after Z rot, X->Y, Y->-X!).
      // So sx=0.52 becomes vertical Y thickness (flat fish lying on plate!) and sz=1.48 stays deep Z body!

      // Forked V-tail fin at +X
      const tailTop = buildBox(0.026 * s, 0.005 * s, 0.018 * s, sear, {
        pos: [0.066 * s, 0.016 * s, 0.012 * s],
        rot: [0, 0.45, 0],
      });
      const tailBot = buildBox(0.026 * s, 0.005 * s, 0.018 * s, sear, {
        pos: [0.066 * s, 0.016 * s, -0.012 * s],
        rot: [0, -0.45, 0],
      });
      // Dorsal fin along +Z ridge
      const dorsal = buildBox(0.042 * s, 0.005 * s, 0.014 * s, sear, {
        pos: [0.0, 0.016 * s, 0.044 * s],
      });
      // 3 crisp grill score slashes on top flank (+Y)
      const s1 = buildBox(0.005 * s, 0.004 * s, 0.036 * s, sear, { pos: [-0.018 * s, 0.030 * s, 0], rot: [0, 0.25, 0] });
      const s2 = buildBox(0.005 * s, 0.004 * s, 0.042 * s, sear, { pos: [0.002 * s, 0.031 * s, 0], rot: [0, 0.25, 0] });
      const s3 = buildBox(0.005 * s, 0.004 * s, 0.036 * s, sear, { pos: [0.022 * s, 0.030 * s, 0], rot: [0, 0.25, 0] });

      return transformGeo(mergeParts([body, tailTop, tailBot, dorsal, s1, s2, s3]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'poisson_plat',
    name: 'Poisson plat (Sole)',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#C48A47',
      secondary: '#6B421A',
      accent: '#F5E6CC',
      size: 1.0,
      seed: 921,
    },
    presets: [
      { label: 'Sole meunière', params: { primary: '#C48A47', secondary: '#6B421A', accent: '#F5E6CC', size: 1.0, seed: 921 } },
      { label: 'Sole braisée épicée', params: { primary: '#9C4820', secondary: '#451A0A', accent: '#FDE68A', size: 1.0, seed: 922 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.016 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const edge = toColor(p.secondary);
      const pale = toColor(p.accent);

      // Very flat diamond-oval sole body
      const body = transformGeo(
        buildLathe(
          [
            { r: 0.008 * s, y: -0.062 * s, sx: 0.25, sz: 1.35, color: edge },
            { r: 0.030 * s, y: -0.025 * s, sx: 0.26, sz: 1.65, color: skin },
            { r: 0.034 * s, y: 0.015 * s, sx: 0.28, sz: 1.68, color: mixColors(skin, pale, 0.25) },
            { r: 0.018 * s, y: 0.052 * s, sx: 0.25, sz: 1.15, color: skin },
          ],
          8
        ),
        { rot: [0, 0, Math.PI / 2], pos: [0, 0.009 * s, 0] }
      );

      // Fan tail fin
      const tail = buildBox(0.022 * s, 0.004 * s, 0.028 * s, edge, {
        pos: [0.068 * s, 0.008 * s, 0],
      });
      // Characteristic twin eyes on upper side near head
      const eye1 = buildSphere(0.0035 * s, 4, 3, edge, { pos: [-0.040 * s, 0.015 * s, 0.007 * s] });
      const eye2 = buildSphere(0.0035 * s, 4, 3, edge, { pos: [-0.038 * s, 0.015 * s, -0.005 * s] });

      return transformGeo(mergeParts([body, tail, eye1, eye2]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'poisson_allonge',
    name: 'Poisson allongé (Maquereau / Capitaine)',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#64748B',
      secondary: '#9E5824',
      accent: '#E2E8F0',
      size: 1.0,
      seed: 931,
    },
    presets: [
      { label: 'Maquereau / Garba fumé', params: { primary: '#784824', secondary: '#3E220E', accent: '#D6B899', size: 1.0, seed: 931 } },
      { label: 'Capitaine braisé', params: { primary: '#B87236', secondary: '#522C12', accent: '#F1E2CC', size: 1.0, seed: 932 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.024 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const back = toColor(p.primary);
      const sear = toColor(p.secondary);
      const belly = toColor(p.accent);

      // Slender torpedo-shaped elongated fish
      const body = transformGeo(
        buildLathe(
          [
            { r: 0.006 * s, y: -0.068 * s, sx: 0.72, sz: 0.9, color: sear },
            { r: 0.018 * s, y: -0.030 * s, sx: 0.72, sz: 1.0, color: back },
            { r: 0.022 * s, y: 0.018 * s, sx: 0.72, sz: 1.0, color: belly },
            { r: 0.016 * s, y: 0.052 * s, sx: 0.72, sz: 0.95, color: back },
            { r: 0.004 * s, y: 0.068 * s, sx: 0.7, sz: 0.85, color: sear },
          ],
          8
        ),
        { rot: [0, 0, Math.PI / 2], pos: [0, 0.015 * s, 0] }
      );

      const tailTop = buildBox(0.024 * s, 0.004 * s, 0.014 * s, sear, {
        pos: [0.075 * s, 0.015 * s, 0.010 * s],
        rot: [0, 0.55, 0],
      });
      const tailBot = buildBox(0.024 * s, 0.004 * s, 0.014 * s, sear, {
        pos: [0.075 * s, 0.015 * s, -0.010 * s],
        rot: [0, -0.55, 0],
      });
      const dorsal = buildBox(0.030 * s, 0.004 * s, 0.012 * s, sear, {
        pos: [0.006 * s, 0.015 * s, 0.028 * s],
      });

      return transformGeo(mergeParts([body, tailTop, tailBot, dorsal]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'crevettes_gambas',
    name: 'Crevettes / Gambas / Écrevisses',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#F97316',
      secondary: '#DC2626',
      accent: '#FED7AA',
      size: 1.0,
      seed: 941,
    },
    presets: [
      { label: 'Gambas grillées', params: { primary: '#F97316', secondary: '#DC2626', accent: '#FED7AA', size: 1.0, seed: 941 } },
      { label: 'Crevettes roses', params: { primary: '#FB7185', secondary: '#E11D48', accent: '#FFE4E6', size: 0.92, seed: 942 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.024 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const shell = toColor(p.primary);
      const stripe = toColor(p.secondary);
      const belly = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 2 plump C-curled gambas with tail fans & feelers
      for (let idx = 0; idx < 2; idx++) {
        const sign = idx === 0 ? -1 : 1;
        const shrimp = buildTube(
          [
            { pos: [0.024 * s, 0.010 * s, 0.018 * s], rx: 0.005 * s, rz: 0.004 * s, color: stripe },
            { pos: [0.010 * s, 0.015 * s, 0.024 * s], rx: 0.009 * s, rz: 0.008 * s, color: shell },
            { pos: [-0.012 * s, 0.017 * s, 0.012 * s], rx: 0.012 * s, rz: 0.010 * s, color: belly },
            { pos: [-0.020 * s, 0.015 * s, -0.012 * s], rx: 0.013 * s, rz: 0.011 * s, color: shell },
            { pos: [-0.004 * s, 0.013 * s, -0.028 * s], rx: 0.012 * s, rz: 0.010 * s, color: stripe },
          ],
          5
        );
        const tailFan = buildBox(0.016 * s, 0.003 * s, 0.012 * s, stripe, {
          pos: [0.028 * s, 0.010 * s, 0.018 * s],
          rot: [0, 0.6, 0],
        });
        const feeler = buildBox(0.026 * s, 0.002 * s, 0.002 * s, stripe, {
          pos: [0.014 * s, 0.013 * s, -0.034 * s],
          rot: [0, -0.35, 0],
        });

        const unit = mergeParts([shrimp, tailFan, feeler]);
        transformGeo(unit, {
          rot: [0, idx * 2.8, 0],
          pos: [sign * 0.018 * s, idx * 0.004 * s, sign * 0.006 * s],
        });
        parts.push(unit);
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'langouste',
    name: 'Langouste',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#DC2626',
      secondary: '#991B1B',
      accent: '#FDBA74',
      size: 1.0,
      seed: 951,
    },
    presets: [
      { label: 'Langouste grillée', params: { primary: '#DC2626', secondary: '#991B1B', accent: '#FDBA74', size: 1.0, seed: 951 } },
      { label: 'Langouste royale orangée', params: { primary: '#EA580C', secondary: '#7C2D12', accent: '#FEF3C7', size: 1.06, seed: 952 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.028 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const shell = toColor(p.primary);
      const dark = toColor(p.secondary);
      const meat = toColor(p.accent);

      // Segmented spiny lobster carapace + arched tail
      const body = buildTube(
        [
          { pos: [0, 0.012 * s, -0.056 * s], rx: 0.008 * s, rz: 0.007 * s, color: dark },
          { pos: [0, 0.016 * s, -0.028 * s], rx: 0.018 * s, rz: 0.014 * s, color: shell },
          { pos: [0, 0.020 * s, 0.0], rx: 0.023 * s, rz: 0.017 * s, color: meat },
          { pos: [0, 0.022 * s, 0.028 * s], rx: 0.022 * s, rz: 0.016 * s, color: shell },
          { pos: [0, 0.018 * s, 0.054 * s], rx: 0.015 * s, rz: 0.012 * s, color: dark },
        ],
        6
      );

      // Wide 3-lobed tail fan at -Z
      const fanC = buildBox(0.022 * s, 0.004 * s, 0.020 * s, shell, { pos: [0, 0.011 * s, -0.068 * s] });
      const fanL = buildBox(0.014 * s, 0.004 * s, 0.018 * s, dark, { pos: [-0.016 * s, 0.011 * s, -0.064 * s], rot: [0, 0.4, 0] });
      const fanR = buildBox(0.014 * s, 0.004 * s, 0.018 * s, dark, { pos: [0.016 * s, 0.011 * s, -0.064 * s], rot: [0, -0.4, 0] });

      // Two sweeping forward antennae from +Z head
      const antL = buildBox(0.003 * s, 0.003 * s, 0.048 * s, dark, {
        pos: [-0.016 * s, 0.020 * s, 0.074 * s],
        rot: [0, -0.35, 0],
      });
      const antR = buildBox(0.003 * s, 0.003 * s, 0.048 * s, dark, {
        pos: [0.016 * s, 0.020 * s, 0.074 * s],
        rot: [0, 0.35, 0],
      });

      return transformGeo(mergeParts([body, fanC, fanL, fanR, antL, antR]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'escargots',
    name: 'Escargots',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#78350F',
      secondary: '#D6B88D',
      accent: '#291D14',
      size: 1.0,
      seed: 961,
    },
    presets: [
      { label: 'Escargots géants braisés', params: { primary: '#78350F', secondary: '#D6B88D', accent: '#291D14', size: 1.0, seed: 961 } },
      { label: 'Escargots persillade', params: { primary: '#92400E', secondary: '#E7D3B0', accent: '#15803D', size: 1.0, seed: 962 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.030 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const shell = toColor(p.primary);
      const band = toColor(p.secondary);
      const meat = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 3 conical-spiral achatina shells with dark snail meat at opening
      const spots: Array<[number, number, number]> = [
        [-0.024 * s, 0.014 * s, 0.2],
        [0.024 * s, 0.012 * s, 2.3],
        [0.0, -0.022 * s, 4.4],
      ];

      for (const [sx, sz, yaw] of spots) {
        const spiral = buildLathe(
          [
            { r: 0.004 * s, y: 0.034 * s, color: band },
            { r: 0.014 * s, y: 0.018 * s, color: shell },
            { r: 0.020 * s, y: 0.002 * s, color: band },
            { r: 0.018 * s, y: -0.014 * s, color: shell },
            { r: 0.008 * s, y: -0.018 * s, color: meat },
          ],
          6
        );
        transformGeo(spiral, { rot: [0.85, yaw, 0], pos: [sx, 0.014 * s, sz] });
        const opening = buildSphere(0.010 * s, 4, 3, meat, {
          pos: [sx + Math.sin(yaw) * 0.008 * s, 0.012 * s, sz + Math.cos(yaw) * 0.008 * s],
        });
        parts.push(spiral, opening);
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'accras',
    name: 'Accras',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#E0922B',
      secondary: '#9C4B12',
      accent: '#FDE68A',
      size: 1.0,
      seed: 971,
    },
    presets: [
      { label: 'Accras de morue / haricot', params: { primary: '#E0922B', secondary: '#9C4B12', accent: '#FDE68A', size: 1.0, seed: 971 } },
      { label: 'Beignets gbofloto', params: { primary: '#F59E0B', secondary: '#B45309', accent: '#FEF3C7', size: 1.08, seed: 972 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.032 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const rng = createRng(p.seed);
      const crust = toColor(p.primary);
      const crisp = toColor(p.secondary);
      const light = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 6 plump oval crispy fritters stacked in a pyramid (6 * 24 = 144 tris)
      const coords: Array<[number, number, number]> = [
        [-0.022, 0.011, 0.016],
        [0.022, 0.011, 0.016],
        [-0.020, 0.011, -0.020],
        [0.020, 0.011, -0.020],
        [-0.008, 0.026, 0.002],
        [0.012, 0.028, -0.004],
      ];

      for (let i = 0; i < coords.length; i++) {
        const [ax, ay, az] = coords[i];
        const col = mixColors(crust, i % 2 === 0 ? crisp : light, rng() * 0.45);
        parts.push(
          buildSphere(0.017 * s, 5, 3, col, {
            pos: [ax * s, ay * s, az * s],
            rot: [rng() * 0.4, rng() * 3.14, rng() * 0.4],
            scale: [1.22, 0.78, 0.95],
          })
        );
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'gigot',
    name: 'Gigot',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#9C421C',
      secondary: '#4A1B0A',
      accent: '#F5EFE6',
      size: 1.0,
      seed: 981,
    },
    presets: [
      { label: 'Gigot rôti', params: { primary: '#9C421C', secondary: '#4A1B0A', accent: '#F5EFE6', size: 1.0, seed: 981 } },
      { label: 'Gigot braisé aux épices', params: { primary: '#7C2D12', secondary: '#3B1206', accent: '#E6D5B8', size: 1.0, seed: 982 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.038 * p.size, 0], stackRadius: 0.042 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const meat = toColor(p.primary);
      const sear = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Large teardrop roast leg with protruding white shank bone
      const leg = transformGeo(
        buildLathe(
          [
            { r: 0.006 * s, y: -0.058 * s, color: bone },
            { r: 0.007 * s, y: -0.036 * s, color: bone },
            { r: 0.015 * s, y: -0.032 * s, color: sear, hardBreak: true },
            { r: 0.032 * s, y: -0.004 * s, sx: 1.15, sz: 0.88, color: meat },
            { r: 0.034 * s, y: 0.028 * s, sx: 1.15, sz: 0.88, color: meat },
            { r: 0.018 * s, y: 0.052 * s, sx: 1.0, sz: 0.82, color: sear },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0.35, 0], pos: [0, 0.024 * s, 0] }
      );

      const boneKnob = buildSphere(0.008 * s, 4, 3, bone, {
        pos: [-0.022 * s, 0.024 * s, -0.058 * s],
      });

      return transformGeo(mergeParts([leg, boneKnob]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'cochon_de_lait',
    name: 'Cochon de lait',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#C96A2B',
      secondary: '#6B2B0E',
      accent: '#F2C18D',
      size: 1.0,
      seed: 991,
    },
    presets: [
      { label: 'Cochon de lait laqué', params: { primary: '#C96A2B', secondary: '#6B2B0E', accent: '#F2C18D', size: 1.0, seed: 991 } },
      { label: 'Porcelet grillé', params: { primary: '#9C4218', secondary: '#451A07', accent: '#E6B89C', size: 1.0, seed: 992 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.040 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const skin = toColor(p.primary);
      const crisp = toColor(p.secondary);
      const snoutC = toColor(p.accent);

      // Compact whole roasted suckling pig with snout & perky ears
      const body = transformGeo(
        buildLathe(
          [
            { r: 0.016 * s, y: -0.048 * s, sx: 1.0, sz: 0.88, color: crisp },
            { r: 0.032 * s, y: -0.020 * s, sx: 1.05, sz: 0.92, color: skin },
            { r: 0.030 * s, y: 0.018 * s, sx: 1.02, sz: 0.92, color: skin },
            { r: 0.022 * s, y: 0.040 * s, sx: 0.92, sz: 0.88, color: crisp },
            { r: 0.011 * s, y: 0.056 * s, sx: 0.85, sz: 0.82, color: snoutC },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0, 0], pos: [0, 0.024 * s, 0] }
      );

      const earL = transformGeo(buildLeaf(0.020 * s, 0.014 * s, 0.004 * s, crisp), {
        pos: [-0.014 * s, 0.034 * s, 0.032 * s],
        rot: [-0.4, -0.25, 0.3],
      });
      const earR = transformGeo(buildLeaf(0.020 * s, 0.014 * s, 0.004 * s, crisp), {
        pos: [0.014 * s, 0.034 * s, 0.032 * s],
        rot: [-0.4, 0.25, -0.3],
      });

      const leg1 = buildBox(0.011 * s, 0.016 * s, 0.014 * s, crisp, { pos: [-0.024 * s, 0.010 * s, -0.026 * s] });
      const leg2 = buildBox(0.011 * s, 0.016 * s, 0.014 * s, crisp, { pos: [0.024 * s, 0.010 * s, -0.026 * s] });
      const leg3 = buildBox(0.010 * s, 0.015 * s, 0.014 * s, crisp, { pos: [-0.022 * s, 0.010 * s, 0.022 * s] });
      const leg4 = buildBox(0.010 * s, 0.015 * s, 0.014 * s, crisp, { pos: [0.022 * s, 0.010 * s, 0.022 * s] });

      return transformGeo(mergeParts([body, earL, earR, leg1, leg2, leg3, leg4]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'mechoui',
    name: 'Méchoui',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#A4481D',
      secondary: '#4A1D09',
      accent: '#EEDCC5',
      size: 1.0,
      seed: 1001,
    },
    presets: [
      { label: 'Méchoui d’agneau rôti', params: { primary: '#A4481D', secondary: '#4A1D09', accent: '#EEDCC5', size: 1.0, seed: 1001 } },
      { label: 'Méchoui aux herbes', params: { primary: '#8F4018', secondary: '#365314', accent: '#F5E6D3', size: 1.0, seed: 1002 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.036 * p.size, 0], stackRadius: 0.044 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const crust = toColor(p.primary);
      const sear = toColor(p.secondary);
      const bone = toColor(p.accent);

      // Arched roasted rack/shoulder of lamb with 3 protruding rib bone tips
      const rack = transformGeo(
        buildLathe(
          [
            { r: 0.022 * s, y: -0.044 * s, sx: 1.18, sz: 0.82, color: sear },
            { r: 0.032 * s, y: -0.012 * s, sx: 1.22, sz: 0.86, color: crust },
            { r: 0.030 * s, y: 0.020 * s, sx: 1.18, sz: 0.84, color: crust },
            { r: 0.020 * s, y: 0.044 * s, sx: 1.05, sz: 0.78, color: sear },
          ],
          8
        ),
        { rot: [Math.PI / 2, 0.15, 0], pos: [0, 0.022 * s, 0] }
      );

      const parts: THREE.BufferGeometry[] = [rack];
      for (let i = 0; i < 3; i++) {
        const z = (-0.022 + i * 0.022) * s;
        parts.push(
          buildCylinder(0.0038 * s, 0.0045 * s, 0.024 * s, 5, bone, {
            pos: [0.032 * s, 0.034 * s, z],
            rot: [0, 0, -0.65],
          })
        );
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'canapes',
    name: 'Canapés',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#E8C98A',
      secondary: '#F4EBD8',
      accent: '#5E9C3A',
      size: 1.0,
      seed: 991,
    },
    presets: [
      { label: 'Canapés froids', params: { primary: '#E8C98A', secondary: '#F4EBD8', accent: '#5E9C3A', size: 1.0, seed: 991 } },
      { label: 'Canapés chauds', params: { primary: '#D9A441', secondary: '#F2C14E', accent: '#B8321F', size: 1.0, seed: 992 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.02 * p.size, 0], stackRadius: 0.045 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const rng = createRng(p.seed);
      const bread = toColor(p.primary);
      const spread = toColor(p.secondary);
      const topping = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 6 petits toasts carrés (2 rangées de 3) : tranche de pain, couche claire, garniture colorée
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const x = (col - 1) * 0.036 * s;
          const z = (row - 0.5) * 0.036 * s;
          const yaw = (rng() - 0.5) * 0.35;
          parts.push(buildBox(0.03 * s, 0.008 * s, 0.03 * s, bread, { pos: [x, 0.004 * s, z], rot: [0, yaw, 0] }));
          parts.push(buildBox(0.026 * s, 0.004 * s, 0.026 * s, spread, { pos: [x, 0.01 * s, z], rot: [0, yaw, 0] }));
          parts.push(buildSphere(0.007 * s, 5, 3, mixColors(topping, spread, rng() * 0.3), { pos: [x, 0.015 * s, z] }));
        }
      }
      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'mini_patisserie',
    name: 'Mini-pâtisserie',
    phase: 2,
    category: 'proteines',
    maxTriangles: 300,
    defaultParams: {
      primary: '#F2B8C6',
      secondary: '#8A4B2A',
      accent: '#C0182B',
      size: 1.0,
      seed: 993,
    },
    presets: [
      { label: 'Petits gâteaux roses', params: { primary: '#F2B8C6', secondary: '#8A4B2A', accent: '#C0182B', size: 1.0, seed: 993 } },
      { label: 'Petits gâteaux au chocolat', params: { primary: '#5A3220', secondary: '#E8C98A', accent: '#F5EFE6', size: 1.0, seed: 994 } },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    getAnchors: (p) => ({ stackCenter: [0, 0.022 * p.size, 0], stackRadius: 0.045 * p.size }),
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveProteinSpace(p, anchor);
      const rng = createRng(p.seed);
      const glaze = toColor(p.primary);
      const sponge = toColor(p.secondary);
      const top = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];
      // 6 petits gâteaux ronds (2 rangées de 3) : corps cannelé, glaçage plat, perle ou cerise au sommet
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const x = (col - 1) * 0.036 * s;
          const z = (row - 0.5) * 0.036 * s;
          parts.push(buildCylinder(0.014 * s, 0.011 * s, 0.014 * s, 6, sponge, { pos: [x, 0.007 * s, z] }));
          parts.push(buildCylinder(0.0145 * s, 0.0145 * s, 0.005 * s, 6, mixColors(glaze, top, rng() * 0.15), { pos: [x, 0.0165 * s, z] }));
          parts.push(buildSphere(0.0045 * s, 4, 3, top, { pos: [x, 0.022 * s, z] }));
        }
      }
      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
];
