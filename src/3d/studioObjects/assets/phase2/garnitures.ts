import * as THREE from 'three';
import {
  buildBox,
  buildCylinder,
  buildLathe,
  buildLeaf,
  buildTube,
  createRng,
  mergeParts,
  mixColors,
  toColor,
  transformGeo,
} from '../../geometryBuilder';
import type { BlvAssetDefinition, BlvAssetParams, BlvDishAnchor } from '../../types';

function resolveGarnishSpace(params: BlvAssetParams, anchor?: BlvDishAnchor) {
  const s = params.size;
  const cx = anchor ? anchor.stackCenter[0] : 0;
  const cy = anchor ? anchor.stackCenter[1] : 0;
  const cz = anchor ? anchor.stackCenter[2] : 0;
  const scaleFactor = anchor ? Math.min(1.15, Math.max(0.75, anchor.stackRadius / 0.045)) : 1.0;
  return { s: s * scaleFactor, cx, cy, cz };
}

export const GARNITURES_ASSETS: BlvAssetDefinition[] = [
  {
    id: 'oignons_tomates',
    name: 'Oignons-tomates',
    phase: 2,
    category: 'garnitures',
    maxTriangles: 80,
    defaultParams: {
      primary: '#DC2626',
      secondary: '#F5E6EA',
      accent: '#9D174D',
      size: 1.0,
      seed: 901,
    },
    presets: [
      {
        label: 'Oignon violet & tomate',
        params: { primary: '#DC2626', secondary: '#F5E6EA', accent: '#9D174D', size: 1.0, seed: 901 },
      },
      {
        label: 'Oignon blanc & tomate',
        params: { primary: '#EF4444', secondary: '#FAFAFA', accent: '#D6D3D1', size: 1.0, seed: 902 },
      },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveGarnishSpace(p, anchor);
      const rng = createRng(p.seed);
      const tomato = toColor(p.primary);
      const onionIn = toColor(p.secondary);
      const onionSkin = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];

      // 3 diced tomato cubes (3 * 12 = 36 tris)
      const diceOffsets: Array<[number, number, number]> = [
        [-0.016, 0.005, 0.010],
        [0.018, 0.005, -0.008],
        [-0.002, 0.006, -0.018],
      ];
      for (const [dx, dy, dz] of diceOffsets) {
        const dSize = (0.010 + rng() * 0.003) * s;
        parts.push(
          buildBox(
            dSize,
            dSize * 0.85,
            dSize,
            mixColors(tomato, toColor('#991B1B'), rng() * 0.3),
            {
              pos: [dx * s, dy * s, dz * s],
              rot: [rng() * 0.4, rng() * Math.PI, rng() * 0.4],
            }
          )
        );
      }

      // 2 curved onion crescent slices via 3-frame triangular tubes (2 * 18 = 36 tris -> total 72 tris)
      for (let i = 0; i < 2; i++) {
        const yaw = i === 0 ? 0.4 : -2.2;
        const ox = (i === 0 ? 0.006 : -0.014) * s;
        const oz = (i === 0 ? 0.012 : -0.004) * s;
        const rArc = 0.018 * s;
        const slice = buildTube(
          [
            { pos: [-rArc, 0.003 * s, 0], rx: 0.0025 * s, rz: 0.0025 * s, color: onionSkin },
            { pos: [0, 0.005 * s, rArc * 0.55], rx: 0.0032 * s, rz: 0.0032 * s, color: onionIn },
            { pos: [rArc, 0.003 * s, 0], rx: 0.0025 * s, rz: 0.0025 * s, color: onionSkin },
          ],
          3
        );
        parts.push(transformGeo(slice, { rot: [0, yaw + rng() * 0.3, 0], pos: [ox, 0, oz] }));
      }

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'piment',
    name: 'Piment',
    phase: 2,
    category: 'garnitures',
    maxTriangles: 80,
    defaultParams: {
      primary: '#DC2626',
      secondary: '#991B1B',
      accent: '#15803D',
      size: 1.0,
      seed: 911,
    },
    presets: [
      {
        label: 'Piment rouge',
        params: { primary: '#DC2626', secondary: '#991B1B', accent: '#15803D', size: 1.0, seed: 911 },
      },
      {
        label: 'Piment jaune antillais',
        params: { primary: '#F59E0B', secondary: '#B45309', accent: '#16A34A', size: 1.0, seed: 912 },
      },
      {
        label: 'Piment vert',
        params: { primary: '#16A34A', secondary: '#14532D', accent: '#65A30D', size: 1.0, seed: 913 },
      },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveGarnishSpace(p, anchor);
      const body = toColor(p.primary);
      const fold = toColor(p.secondary);
      const stemC = toColor(p.accent);

      // Ribbed Scotch bonnet / habanero pepper pod (5 rings, 6 segs -> 60 tris)
      const pod = buildLathe(
        [
          { r: 0.004 * s, y: 0.0, color: fold },
          { r: 0.014 * s, y: 0.008 * s, color: body, ribFreq: 3, ribAmp: 0.16 },
          { r: 0.017 * s, y: 0.020 * s, color: body, ribFreq: 3, ribAmp: 0.14 },
          { r: 0.011 * s, y: 0.028 * s, color: fold, ribFreq: 3, ribAmp: 0.10 },
          { r: 0.004 * s, y: 0.031 * s, color: stemC },
        ],
        6
      );

      // 4-sided green stem (16 tris -> total 76 tris)
      const stem = buildCylinder(0.0018 * s, 0.0034 * s, 0.012 * s, 4, stemC, {
        pos: [0.002 * s, 0.036 * s, 0],
        rot: [0, 0, -0.25],
      });

      const pepper = transformGeo(mergeParts([pod, stem]), {
        rot: [0.15, 0.2, 0.55],
        pos: [0, 0.012 * s, 0],
      });
      return transformGeo(pepper, { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'sauce',
    name: 'Sauce',
    phase: 2,
    category: 'garnitures',
    maxTriangles: 80,
    defaultParams: {
      primary: '#B91C1C',
      secondary: '#7F1D1D',
      accent: '#EF4444',
      size: 1.0,
      seed: 921,
    },
    presets: [
      {
        label: 'Sauce tomate / bolognaise',
        params: { primary: '#B91C1C', secondary: '#7F1D1D', accent: '#EF4444', size: 1.0, seed: 921 },
      },
      {
        label: 'Sauce graine / arachide',
        params: { primary: '#C2591B', secondary: '#7C2D12', accent: '#EA8C38', size: 1.0, seed: 922 },
      },
      {
        label: 'Sauce verte pimentée',
        params: { primary: '#4D7C0F', secondary: '#365314', accent: '#84CC16', size: 1.0, seed: 923 },
      },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveGarnishSpace(p, anchor);
      const rng = createRng(p.seed);
      const baseC = toColor(p.primary);
      const edgeC = toColor(p.secondary);
      const sheen = toColor(p.accent);

      // Organic sculpted sauce pool covering the top of a base (4 rings, 8 segs -> 64 tris)
      const nappe = buildLathe(
        [
          { r: 0.044 * s, y: 0.0, sx: 1.12, sz: 0.94, color: edgeC, ribFreq: 4, ribAmp: 0.14 },
          { r: 0.036 * s, y: 0.004 * s, sx: 1.08, sz: 0.96, color: baseC, ribFreq: 4, ribAmp: 0.10, twist: 0.25 },
          { r: 0.020 * s, y: 0.008 * s, sx: 1.04, sz: 0.95, color: sheen },
          { r: 0.005 * s, y: 0.0095 * s, color: baseC },
        ],
        8,
        { phaseOffset: rng() * Math.PI }
      );

      // Small sauce chunk / herb fleck on top (12 tris -> total 76 tris)
      const fleck = buildBox(0.008 * s, 0.005 * s, 0.008 * s, edgeC, {
        pos: [0.010 * s, 0.009 * s, -0.006 * s],
        rot: [0.2, rng() * Math.PI, 0.15],
      });

      return transformGeo(mergeParts([nappe, fleck]), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'salade_citron',
    name: 'Salade-citron',
    phase: 2,
    category: 'garnitures',
    maxTriangles: 80,
    defaultParams: {
      primary: '#22C55E',
      secondary: '#FACC15',
      accent: '#FEF9C3',
      size: 1.0,
      seed: 931,
    },
    presets: [
      {
        label: 'Laitue & citron jaune',
        params: { primary: '#22C55E', secondary: '#FACC15', accent: '#FEF9C3', size: 1.0, seed: 931 },
      },
      {
        label: 'Laitue & citron vert',
        params: { primary: '#16A34A', secondary: '#84CC16', accent: '#ECFCCB', size: 1.0, seed: 932 },
      },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveGarnishSpace(p, anchor);
      const rng = createRng(p.seed);
      const leafC = toColor(p.primary);
      const leafTip = mixColors(leafC, toColor('#BBF7D0'), 0.45);
      const rindC = toColor(p.secondary);
      const pulpC = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];

      // 4 crisp lettuce leaves fanned out (4 * 8 = 32 tris)
      for (let i = 0; i < 4; i++) {
        const ang = -0.8 + i * 0.55 + (rng() - 0.5) * 0.15;
        const leaf = buildLeaf(0.036 * s, 0.024 * s, 0.003 * s, leafC, leafTip);
        transformGeo(leaf, {
          rot: [1.05 + rng() * 0.18, ang, (rng() - 0.5) * 0.25],
          pos: [-0.012 * s, 0.002 * s, 0.002 * s],
        });
        parts.push(leaf);
      }

      // Curved lemon wedge (4 frames, 4 radial segs -> 3 * 4 * 2 + 8 = 32 tris -> total 64 tris)
      const lemon = buildTube(
        [
          { pos: [-0.018 * s, 0.004 * s, -0.004 * s], rx: 0.004 * s, rz: 0.004 * s, color: rindC },
          { pos: [-0.006 * s, 0.009 * s, 0.005 * s], rx: 0.008 * s, rz: 0.009 * s, color: pulpC },
          { pos: [0.008 * s, 0.009 * s, 0.005 * s], rx: 0.008 * s, rz: 0.009 * s, color: pulpC },
          { pos: [0.019 * s, 0.004 * s, -0.004 * s], rx: 0.004 * s, rz: 0.004 * s, color: rindC },
        ],
        4
      );
      parts.push(transformGeo(lemon, { pos: [0.018 * s, 0.004 * s, 0.010 * s], rot: [0.25, -0.4, 0] }));

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
  {
    id: 'persil',
    name: 'Persil',
    phase: 2,
    category: 'garnitures',
    maxTriangles: 80,
    defaultParams: {
      primary: '#15803D',
      secondary: '#14532D',
      accent: '#4ADE80',
      size: 1.0,
      seed: 941,
    },
    presets: [
      {
        label: 'Persil frais',
        params: { primary: '#15803D', secondary: '#14532D', accent: '#4ADE80', size: 1.0, seed: 941 },
      },
      {
        label: 'Cébette & herbes',
        params: { primary: '#16A34A', secondary: '#365314', accent: '#86EFAC', size: 1.0, seed: 942 },
      },
    ],
    hold: { position: [0.015, 0.0, 0.06], rotation: [0.05, 0.0, -0.04], scale: 1.0 },
    build: (p, anchor) => {
      const { s, cx, cy, cz } = resolveGarnishSpace(p, anchor);
      const rng = createRng(p.seed);
      const leafC = toColor(p.primary);
      const stemC = toColor(p.secondary);
      const tipC = toColor(p.accent);

      const parts: THREE.BufferGeometry[] = [];

      // 8 small arched parsley leaflets in 2 clusters (8 * 8 = 64 tris)
      const clusterCenters: Array<[number, number]> = [
        [-0.010, 0.008],
        [0.012, -0.008],
      ];
      for (let c = 0; c < 2; c++) {
        const [ox, oz] = clusterCenters[c];
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + c * 0.5 + rng() * 0.4;
          const leaf = buildLeaf(0.018 * s, 0.012 * s, 0.002 * s, leafC, tipC);
          transformGeo(leaf, {
            rot: [0.85 + rng() * 0.3, ang, (rng() - 0.5) * 0.25],
            pos: [ox * s, 0.002 * s, oz * s],
          });
          parts.push(leaf);
        }
      }

      // Fine green stem crossing between clusters (12 tris -> total 76 tris)
      parts.push(
        buildBox(0.026 * s, 0.0025 * s, 0.0025 * s, stemC, {
          pos: [0.001 * s, 0.003 * s, 0],
          rot: [0, 0.65, 0.1],
        })
      );

      return transformGeo(mergeParts(parts), { pos: [cx, cy, cz] });
    },
  },
];
