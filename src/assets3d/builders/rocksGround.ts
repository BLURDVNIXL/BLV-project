import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createSeededRng,
  createStylizedCanopyBlob,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const ROCK_AND_GROUND_ASSETS: AssetDefinition[] = [
  {
    id: 'rg_rocher',
    name: 'Rocher Décoratif',
    folder: 'Rocks_And_Ground_Decorations',
    fileName: 'rocher_decoratif',
    description: 'Rocher paysager stylisé en granit gris ou latérite ocre ivoirienne pour parcs, bassins et massifs.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'granit_gris', label: 'Rocher Granit Gris', growthStage: 'Standard', swatch: '#7e8388' },
      { id: 'laterite_ocre', label: 'Rocher Latérite Ocre', growthStage: 'Standard', swatch: '#a85a3a' },
      { id: 'groupe_rochers', label: 'Groupe de Rochers', growthStage: 'Standard', swatch: '#8b8378' },
    ],
    build: (variantId = 'granit_gris') => {
      const group = new THREE.Group();
      const hex =
        variantId === 'laterite_ocre'
          ? '#a85a3a'
          : variantId === 'groupe_rochers'
            ? '#88827a'
            : '#7c8187';
      const rockMat = BLVMaterials.stone(hex, 0.9, true);
      const subRockMat = BLVMaterials.stone(
        variantId === 'laterite_ocre' ? '#8c472c' : '#656a70',
        0.92,
        true
      );

      if (variantId === 'groupe_rochers') {
        const specs = [
          [0, 0.36, 0, 0.56, 1.2, 0.72, 1.0, 41],
          [0.52, 0.22, 0.26, 0.34, 1.1, 0.68, 0.95, 42],
          [-0.45, 0.16, 0.3, 0.24, 1.0, 0.65, 1.1, 43],
        ] as const;
        specs.forEach(([x, y, z, r, sx, sy, sz, seed], i) => {
          const rock = new THREE.Mesh(
            createStylizedCanopyBlob(r, 1, seed, sx, sy, sz, 0.24),
            i === 1 ? subRockMat : rockMat
          );
          rock.position.set(x, y, z);
          group.add(rock);
        });
      } else {
        const main = new THREE.Mesh(
          createStylizedCanopyBlob(0.62, 1, variantId === 'laterite_ocre' ? 19 : 11, 1.25, 0.74, 1.05, 0.24),
          rockMat
        );
        main.position.y = 0.42;
        group.add(main);
      }

      return finalizeAssetGroup(group, `Rocher_Decoratif_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'rg_galets',
    name: 'Galets',
    folder: 'Rocks_And_Ground_Decorations',
    fileName: 'galets',
    description: 'Amas de galets lisses de rivière ou de lagune pour abords de bassins, pieds d’arbres et allées.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'galets_mixtes', label: 'Galets Mixtes Lagune', growthStage: 'Standard', swatch: '#999288' },
      { id: 'galets_blancs', label: 'Galets Blancs Décoratifs', growthStage: 'Standard', swatch: '#dedbd4' },
    ],
    build: (variantId = 'galets_mixtes') => {
      const group = new THREE.Group();
      const colors =
        variantId === 'galets_blancs'
          ? ['#e2dfd8', '#d2cfc7', '#c8c4bc']
          : ['#8f8980', '#a69c8e', '#756f68'];
      const mats = colors.map((c) => BLVMaterials.stone(c, 0.55));
      const rng = createSeededRng(variantId === 'galets_blancs' ? 99 : 33);

      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rng() * 0.4;
        const dist = rng() * 0.45;
        const rad = 0.08 + rng() * 0.08;
        const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), mats[i % mats.length]);
        pebble.scale.set(1.2 + rng() * 0.3, 0.48 + rng() * 0.16, 0.95 + rng() * 0.25);
        pebble.position.set(Math.cos(a) * dist, rad * 0.42, Math.sin(a) * dist);
        pebble.rotation.y = rng() * Math.PI;
        group.add(pebble);
      }

      return finalizeAssetGroup(group, `Galets_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'rg_dalles',
    name: 'Dalles Décoratives',
    folder: 'Rocks_And_Ground_Decorations',
    fileName: 'dalles_decoratives',
    description: 'Dalles de cheminement et pas japonais pour jardins, parcs et accès piétons.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'pas_japonais', label: 'Pas Japonais Irréguliers', growthStage: 'Standard', swatch: '#9e978b' },
      { id: 'dalles_carrees', label: 'Dalles Carrées Béton', growthStage: 'Standard', swatch: '#b3b7bc' },
      { id: 'dalles_ardoise', label: 'Dalles Ardoise Sombre', growthStage: 'Standard', swatch: '#4a525c' },
    ],
    build: (variantId = 'pas_japonais') => {
      const group = new THREE.Group();

      if (variantId === 'dalles_carrees' || variantId === 'dalles_ardoise') {
        const mat = BLVMaterials.stone(
          variantId === 'dalles_ardoise' ? '#4c545e' : '#b5b9be',
          0.78
        );
        for (let i = 0; i < 3; i++) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.055, 0.54), mat);
          slab.position.set((i % 2 === 0 ? -0.06 : 0.06), 0.0275, -0.68 + i * 0.68);
          group.add(slab);
        }
      } else {
        const mat = BLVMaterials.stone('#9c9487', 0.85, true);
        const offsets = [
          [-0.08, -0.65, 0.28, 0.1],
          [0.12, -0.15, 0.25, 0.6],
          [-0.06, 0.35, 0.3, 1.1],
          [0.1, 0.82, 0.24, 0.3],
        ];
        offsets.forEach(([x, z, r, rot]) => {
          const stone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.055, 7), mat);
          stone.scale.set(1.2, 1, 0.9);
          stone.position.set(x, 0.0275, z);
          stone.rotation.y = rot;
          group.add(stone);
        });
      }

      return finalizeAssetGroup(group, `Dalles_Decoratives_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'rg_paves',
    name: 'Pavés',
    folder: 'Rocks_And_Ground_Decorations',
    fileName: 'paves',
    description: 'Grappe modulaire de pavés urbains hexagonaux ou autobloquants pour places et trottoirs.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'paves_hexagones', label: 'Pavés Hexagonaux', growthStage: 'Standard', swatch: '#b89f82' },
      { id: 'paves_autobloquants', label: 'Pavés Autobloquants', growthStage: 'Standard', swatch: '#8f949a' },
    ],
    build: (variantId = 'paves_hexagones') => {
      const group = new THREE.Group();

      if (variantId === 'paves_autobloquants') {
        const mats = [
          BLVMaterials.stone('#94999e', 0.84),
          BLVMaterials.stone('#7e8388', 0.84),
          BLVMaterials.stone('#b57552', 0.84),
        ];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 4; c++) {
            const paver = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.12), mats[(r + c) % 3]);
            paver.position.set(
              -0.36 + c * 0.24 + (r % 2) * 0.11,
              0.025,
              -0.14 + r * 0.14
            );
            group.add(paver);
          }
        }
      } else {
        const mats = [
          BLVMaterials.stone('#bfae95', 0.82),
          BLVMaterials.stone('#a6967e', 0.82),
          BLVMaterials.stone('#c98e63', 0.82),
        ];
        const coords = [
          [0, 0],
          [0.34, 0],
          [-0.34, 0],
          [0.17, 0.29],
          [-0.17, 0.29],
          [0.17, -0.29],
          [-0.17, -0.29],
        ];
        coords.forEach(([x, z], i) => {
          const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.185, 0.055, 6), mats[i % 3]);
          hex.position.set(x, 0.0275, z);
          group.add(hex);
        });
      }

      return finalizeAssetGroup(group, `Paves_${variantId}`, 'bottom-center');
    },
  },
];
