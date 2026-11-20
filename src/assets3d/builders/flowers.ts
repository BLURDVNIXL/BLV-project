import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createBroadLeafMesh,
  createFlowerBlossom,
  createSeededRng,
  createStylizedCanopyBlob,
  createTaperedBranchGeometry,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const FLOWER_ASSETS: AssetDefinition[] = [
  {
    id: 'flower_rosier',
    name: 'Rosier',
    folder: 'Flowers',
    fileName: 'rosier',
    description: 'Rosier fleuri en buisson ou en arche légère avec boutons et roses épanouies.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'rouge_velours', label: 'Rosier Rouge', growthStage: 'En fleurs', swatch: '#d62839' },
      { id: 'corail_rose', label: 'Rosier Rose Corail', growthStage: 'En fleurs', swatch: '#f06285' },
      { id: 'jaune_creme', label: 'Rosier Jaune Crème', growthStage: 'En fleurs', swatch: '#f5c242' },
    ],
    build: (variantId = 'rouge_velours') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage('#357d3b', true);
      const stemMat = BLVMaterials.bark('smooth', '#4c6e38');
      const roseHex =
        variantId === 'corail_rose'
          ? '#ef6386'
          : variantId === 'jaune_creme'
            ? '#f5c242'
            : '#d62839';
      const roseMat = BLVMaterials.petal(roseHex, true);
      const innerRoseMat = BLVMaterials.petal(
        variantId === 'jaune_creme' ? '#e8a220' : '#a81828',
        true
      );

      // Foliage base mound
      const mound1 = new THREE.Mesh(createStylizedCanopyBlob(0.38, 1, 10, 1.1, 0.85, 1.1), leafMat);
      mound1.position.y = 0.34;
      group.add(mound1);

      const mound2 = new THREE.Mesh(createStylizedCanopyBlob(0.28, 1, 11, 1.0, 0.9, 1.0), leafMat);
      mound2.position.set(0.18, 0.45, 0.1);
      group.add(mound2);

      // Stems + layered roses
      const rng = createSeededRng(variantId.length * 73);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
        const r = 0.16 + rng() * 0.24;
        const y = 0.48 + rng() * 0.26;
        const rx = Math.cos(a) * r;
        const rz = Math.sin(a) * r;

        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(
              [new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(rx, y, rz)],
              0.015,
              0.008,
              4,
              4
            ),
            stemMat
          )
        );

        const rose = new THREE.Group();
        rose.position.set(rx, y + 0.03, rz);
        const outerCup = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), roseMat);
        outerCup.scale.set(1, 0.78, 1);
        rose.add(outerCup);
        const bud = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.07, 5), innerRoseMat);
        bud.position.y = 0.035;
        rose.add(bud);
        group.add(rose);
      }

      return finalizeAssetGroup(group, `Rosier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'flower_bougainvillier',
    name: 'Bougainvillier',
    folder: 'Flowers',
    fileName: 'bougainvillier',
    description: 'Bougainvillier tropical exubérant couvert de bractées colorées, emblème des façades et murets d’Abidjan.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'magenta', label: 'Bougainvillier Magenta', growthStage: 'En fleurs', swatch: '#d61e7a' },
      { id: 'violet_royal', label: 'Bougainvillier Violet', growthStage: 'En fleurs', swatch: '#8b2fc9' },
      { id: 'corail_orange', label: 'Bougainvillier Orangé', growthStage: 'En fleurs', swatch: '#eb5e28' },
    ],
    build: (variantId = 'magenta') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.bark('smooth', '#6b513e');
      const leafMat = BLVMaterials.foliage('#347a38', true);
      const bractHex =
        variantId === 'violet_royal'
          ? '#8a2cc9'
          : variantId === 'corail_orange'
            ? '#eb5d28'
            : '#d91c78';
      const bractMat = BLVMaterials.petal(bractHex, false);

      // Gnarled climbing woody stems
      const stems = [
        [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.22, 0.7, 0.1), new THREE.Vector3(-0.35, 1.35, 0.15)],
        [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 0.85, -0.1), new THREE.Vector3(0.4, 1.55, -0.2)],
      ];
      stems.forEach((pts) => {
        group.add(new THREE.Mesh(createTaperedBranchGeometry(pts, 0.06, 0.02, 7, 5), woodMat));
      });

      // Cascading greenery & dense bract clusters
      const masses = [
        [-0.32, 1.15, 0.14, 0.42, true],
        [0.35, 1.35, -0.15, 0.44, true],
        [0.05, 1.5, 0.05, 0.46, true],
        [-0.1, 0.72, 0.05, 0.38, false],
        [0.24, 0.92, 0.15, 0.34, true],
        [-0.42, 0.88, -0.1, 0.3, true],
      ] as const;

      masses.forEach(([x, y, z, r, isFlower], idx) => {
        const blob = new THREE.Mesh(
          createStylizedCanopyBlob(r, 1, 220 + idx, 1.15, 0.85, 1.15),
          isFlower ? bractMat : leafMat
        );
        blob.position.set(x, y, z);
        group.add(blob);
      });

      return finalizeAssetGroup(group, `Bougainvillier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'flower_hibiscus',
    name: 'Hibiscus',
    folder: 'Flowers',
    fileName: 'hibiscus',
    description: 'Arbuste d’hibiscus tropical orné de grandes fleurs en trompette à cinq pétales.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'rouge_ecarlate', label: 'Hibiscus Rouge', growthStage: 'En fleurs', swatch: '#e02424' },
      { id: 'rose_tropical', label: 'Hibiscus Rose', growthStage: 'En fleurs', swatch: '#f25792' },
      { id: 'jaune_soleil', label: 'Hibiscus Jaune', growthStage: 'En fleurs', swatch: '#f5b81d' },
    ],
    build: (variantId = 'rouge_ecarlate') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage('#2e7d34', true);
      const petalHex =
        variantId === 'rose_tropical'
          ? '#f25792'
          : variantId === 'jaune_soleil'
            ? '#f5b81d'
            : '#e02424';
      const petalMat = BLVMaterials.petal(petalHex, true);
      const stamenMat = BLVMaterials.petal('#ffdf59', false);

      const bush1 = new THREE.Mesh(createStylizedCanopyBlob(0.45, 1, 310, 1.1, 0.9, 1.1), leafMat);
      bush1.position.y = 0.48;
      group.add(bush1);
      const bush2 = new THREE.Mesh(createStylizedCanopyBlob(0.35, 1, 311, 1.1, 0.85, 1.1), leafMat);
      bush2.position.set(-0.22, 0.65, 0.16);
      group.add(bush2);

      const flowerCoords = [
        [0.32, 0.72, 0.25, 0.6, 0.4],
        [-0.36, 0.82, 0.18, -0.5, 0.3],
        [0.08, 0.92, -0.26, 0.2, -0.5],
        [-0.12, 0.56, 0.38, 0.1, 0.6],
        [0.26, 0.86, -0.14, 0.4, -0.2],
        [0.0, 0.96, 0.12, -0.2, 0.2],
      ];

      flowerCoords.forEach(([x, y, z, rz, rx]) => {
        const blossom = createFlowerBlossom(0.11, petalMat, stamenMat, 5);
        blossom.position.set(x, y, z);
        blossom.rotation.set(rx, 0, rz);
        // Long hibiscus pistil accent
        const pistil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.1, 4), stamenMat);
        pistil.position.y = 0.05;
        blossom.add(pistil);
        group.add(blossom);
      });

      return finalizeAssetGroup(group, `Hibiscus_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'flower_tropicales',
    name: 'Fleurs Tropicales',
    folder: 'Flowers',
    fileName: 'fleurs_tropicales',
    description: 'Fleurs exotiques sculpturales : Oiseau de Paradis (Strelitzia) et Balisier (Heliconia).',
    pivotType: 'bottom-center',
    variants: [
      { id: 'oiseau_paradis', label: 'Oiseau de Paradis', growthStage: 'En fleurs', swatch: '#f2781d' },
      { id: 'heliconia', label: 'Balisier Heliconia', growthStage: 'En fleurs', swatch: '#d92626' },
      { id: 'bouquet_mixte', label: 'Massif Exotique Mixte', growthStage: 'En fleurs', swatch: '#e85d28' },
    ],
    build: (variantId = 'oiseau_paradis') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage('#358245', true, true);
      const stemMat = BLVMaterials.foliage('#4b8c3f', false);
      const orangeMat = BLVMaterials.petal('#f27a1a', false);
      const blueMat = BLVMaterials.petal('#2e52b2', false);
      const redMat = BLVMaterials.petal('#d92626', false);
      const yellowTip = BLVMaterials.petal('#f5c927', false);

      // Tall radiating paddle leaves
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = createBroadLeafMesh(0.75, 0.18, 0.18, leafMat);
        leaf.position.y = 0.08;
        leaf.rotation.y = a;
        leaf.rotation.x = -0.78;
        group.add(leaf);
      }

      const addStrelitzia = (x: number, z: number, h: number, rotY: number) => {
        const s = new THREE.Group();
        s.position.set(x, 0, z);
        s.rotation.y = rotY;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, h, 5), stemMat);
        stalk.position.y = h / 2;
        s.add(stalk);

        const boat = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), stemMat);
        boat.rotation.z = -Math.PI * 0.42;
        boat.position.set(0.09, h, 0);
        s.add(boat);

        for (let c = 0; c < 3; c++) {
          const crest = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 4), orangeMat);
          crest.position.set(0.04 + c * 0.04, h + 0.06, 0);
          crest.rotation.z = -0.25 - c * 0.15;
          s.add(crest);
        }
        const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.11, 4), blueMat);
        tongue.position.set(0.11, h + 0.05, 0.01);
        tongue.rotation.z = -0.65;
        s.add(tongue);
        group.add(s);
      };

      const addHeliconia = (x: number, z: number, h: number, rotY: number) => {
        const s = new THREE.Group();
        s.position.set(x, 0, z);
        s.rotation.y = rotY;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, h, 5), stemMat);
        stalk.position.y = h / 2;
        s.add(stalk);

        for (let b = 0; b < 5; b++) {
          const side = b % 2 === 0 ? 1 : -1;
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), redMat);
          claw.position.set(side * 0.045, h - 0.1 + b * 0.08, 0);
          claw.rotation.z = -side * 0.85;
          s.add(claw);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), yellowTip);
          tip.position.set(side * 0.11, h - 0.07 + b * 0.08, 0);
          tip.rotation.z = -side * 0.85;
          s.add(tip);
        }
        group.add(s);
      };

      if (variantId === 'heliconia') {
        addHeliconia(0.08, 0.05, 1.05, 0.3);
        addHeliconia(-0.12, -0.06, 0.92, 2.4);
        addHeliconia(0.02, -0.14, 1.15, 4.1);
      } else if (variantId === 'bouquet_mixte') {
        addStrelitzia(0.12, 0.06, 1.05, 0.4);
        addHeliconia(-0.12, -0.05, 1.12, 2.1);
        addStrelitzia(-0.04, 0.12, 0.92, 4.3);
      } else {
        addStrelitzia(0.08, 0.05, 1.08, 0.2);
        addStrelitzia(-0.1, -0.04, 0.94, 2.4);
        addStrelitzia(0.02, -0.1, 1.16, 4.5);
      }

      return finalizeAssetGroup(group, `Fleurs_Tropicales_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'flower_massif_multicolore',
    name: 'Massif de Fleurs Multicolores',
    folder: 'Flowers',
    fileName: 'massif_fleurs_multicolores',
    description: 'Massif floral multicolore dense pour ronds-points, parcs et bordures urbaines.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'massif_rond', label: 'Massif Rond Multicolore', growthStage: 'En fleurs', swatch: '#f25c7a' },
      { id: 'massif_bordure', label: 'Massif Allongé Bordure', growthStage: 'En fleurs', swatch: '#f5b027' },
    ],
    build: (variantId = 'massif_rond') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage('#3c8a3e', true);
      const centerMat = BLVMaterials.petal('#ffe14d', false);
      const palette = ['#e83f6f', '#ffbe0b', '#fb5607', '#ff6fa3', '#f7f7ff'].map((c) =>
        BLVMaterials.petal(c, true)
      );
      const rng = createSeededRng(variantId === 'massif_bordure' ? 88 : 44);

      const isLong = variantId === 'massif_bordure';
      const mound = new THREE.Mesh(
        createStylizedCanopyBlob(0.55, 1, 410, isLong ? 1.85 : 1.15, 0.36, isLong ? 0.78 : 1.15),
        leafMat
      );
      mound.position.y = 0.18;
      group.add(mound);

      const flowerCount = 22;
      for (let i = 0; i < flowerCount; i++) {
        const a = rng() * Math.PI * 2;
        const rad = Math.sqrt(rng()) * 0.48;
        const fx = Math.cos(a) * rad * (isLong ? 1.75 : 1.05);
        const fz = Math.sin(a) * rad * (isLong ? 0.72 : 1.05);
        const fy = 0.25 + (1 - rad / 0.55) * 0.12;

        const f = createFlowerBlossom(0.065, palette[i % palette.length], centerMat, 5);
        f.position.set(fx, fy, fz);
        f.rotation.set((rng() - 0.5) * 0.3, rng() * Math.PI, (rng() - 0.5) * 0.3);
        group.add(f);
      }

      return finalizeAssetGroup(group, `Massif_Fleurs_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'flower_petites_fleurs',
    name: 'Petites Fleurs Décoratives',
    folder: 'Flowers',
    fileName: 'petites_fleurs_decoratives',
    description: 'Petites touffes de fleurs décoratives (pervenches, œillets d’Inde) pour trottoirs et pelouses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'oeillets_orange', label: 'Œillets Orangés', growthStage: 'En fleurs', swatch: '#f5841f' },
      { id: 'pervenches_roses', label: 'Pervenches Roses', growthStage: 'En fleurs', swatch: '#eb5e9b' },
      { id: 'fleurs_blanches', label: 'Fleurs Blanches', growthStage: 'En fleurs', swatch: '#f5f2eb' },
    ],
    build: (variantId = 'oeillets_orange') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage('#469644', true);
      const hex =
        variantId === 'pervenches_roses'
          ? '#eb5e9b'
          : variantId === 'fleurs_blanches'
            ? '#f5f2eb'
            : '#f5841f';
      const petalMat = BLVMaterials.petal(hex, true);
      const centerMat = BLVMaterials.petal('#ffd23f', false);

      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.14;
        const lx = Math.cos(a) * r;
        const lz = Math.sin(a) * r;

        const base = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 5), leafMat);
        base.position.set(lx, 0.07, lz);
        group.add(base);

        const f = createFlowerBlossom(0.055, petalMat, centerMat, 5);
        f.position.set(lx, 0.16 + (i % 2) * 0.04, lz);
        f.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.15;
        group.add(f);
      }

      return finalizeAssetGroup(group, `Petites_Fleurs_${variantId}`, 'bottom-center');
    },
  },
];
