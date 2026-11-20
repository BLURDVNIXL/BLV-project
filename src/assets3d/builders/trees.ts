import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createPalmFrondGroup,
  createSeededRng,
  createStylizedCanopyBlob,
  createTaperedBranchGeometry,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const TREE_ASSETS: AssetDefinition[] = [
  {
    id: 'tree_cocotier',
    name: 'Cocotier',
    folder: 'Trees',
    fileName: 'cocotier',
    description: 'Cocotier côtier emblématique d’Abidjan et de Grand-Bassam avec stipe courbé, noix de coco et palmes souples.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'grand_courbe', label: 'Grand Courbé', growthStage: 'Adulte', swatch: '#3d8b40' },
      { id: 'double_stipe', label: 'Double Stipe', growthStage: 'Adulte', swatch: '#4a9848' },
      { id: 'jeune_compact', label: 'Jeune Cocotier', growthStage: 'Jeune', swatch: '#59a84f' },
    ],
    build: (variantId = 'grand_courbe') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('palm', '#c2a78f');
      const frondMat = BLVMaterials.foliage(
        variantId === 'jeune_compact' ? '#52a346' : '#3a8c3f',
        true,
        true
      );
      const stemMat = BLVMaterials.bark('smooth', '#6e7c3e');
      const nutMat = BLVMaterials.stone('#6c4b2d', 0.65);

      const buildSinglePalm = (
        height: number,
        leanX: number,
        leanZ: number,
        rBot: number,
        rTop: number,
        frondCount: number,
        frondLen: number,
        hasNuts: boolean
      ) => {
        const sub = new THREE.Group();
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(leanX * 0.25, height * 0.35, leanZ * 0.2),
          new THREE.Vector3(leanX * 0.72, height * 0.72, leanZ * 0.65),
          new THREE.Vector3(leanX, height, leanZ),
        ];
        const trunk = new THREE.Mesh(
          createTaperedBranchGeometry(pts, rBot, rTop, 16, 8),
          barkMat
        );
        sub.add(trunk);

        const top = pts[pts.length - 1];

        if (hasNuts) {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + 0.4;
            const nut = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), nutMat);
            nut.position.set(
              top.x + Math.cos(a) * 0.2,
              top.y - 0.16,
              top.z + Math.sin(a) * 0.2
            );
            sub.add(nut);
          }
        }

        for (let i = 0; i < frondCount; i++) {
          const ring = i < Math.floor(frondCount * 0.5) ? 0 : 1;
          const a = (i / frondCount) * Math.PI * 2 + ring * 0.32;
          const frond = createPalmFrondGroup(
            frondLen * (ring === 0 ? 1 : 0.78),
            0.55,
            ring === 0 ? 1.05 : 0.48,
            frondMat,
            stemMat
          );
          frond.position.copy(top);
          frond.rotation.y = a;
          frond.rotation.x = ring === 0 ? 0.18 : -0.35;
          sub.add(frond);
        }
        return sub;
      };

      if (variantId === 'double_stipe') {
        group.add(buildSinglePalm(7.2, 1.35, 0.4, 0.24, 0.12, 9, 2.25, true));
        const secondary = buildSinglePalm(5.3, -1.05, -0.35, 0.2, 0.1, 8, 1.85, true);
        secondary.position.set(-0.22, 0, -0.1);
        group.add(secondary);
      } else if (variantId === 'jeune_compact') {
        group.add(buildSinglePalm(3.4, 0.45, 0.15, 0.18, 0.09, 7, 1.65, false));
      } else {
        group.add(buildSinglePalm(7.8, 1.45, 0.3, 0.26, 0.12, 10, 2.45, true));
      }

      return finalizeAssetGroup(group, `Cocotier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_palmier_decoratif',
    name: 'Palmier Décoratif',
    folder: 'Trees',
    fileName: 'palmier_decoratif',
    description: 'Palmier ornemental des boulevards d’Abidjan : palmier royal élancé ou palmier éventail à large couronne.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'palmier_royal', label: 'Palmier Royal', growthStage: 'Adulte', swatch: '#2e7d32' },
      { id: 'palmier_eventail', label: 'Palmier Éventail', growthStage: 'Adulte', swatch: '#4a934a' },
      { id: 'jeune_palmier', label: 'Jeune Palmier', growthStage: 'Jeune', swatch: '#62aa5a' },
    ],
    build: (variantId = 'palmier_royal') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('palm', '#b8b0a4');
      const crownShaftMat = BLVMaterials.foliage('#438c3e', false, false);
      const leafMat = BLVMaterials.foliage('#2f7c34', true, true);
      const stemMat = BLVMaterials.bark('smooth', '#5c7c3b');

      if (variantId === 'palmier_eventail') {
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.08, 2.5, -0.05),
          new THREE.Vector3(0.15, 5.2, 0.05),
        ];
        group.add(new THREE.Mesh(createTaperedBranchGeometry(pts, 0.28, 0.18, 12, 9), barkMat));
        const top = pts[2];
        // Sculpted pleated fan blades
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          const pitch = i % 2 === 0 ? 0.45 : 0.85;
          const fanGroup = new THREE.Group();
          fanGroup.position.copy(top);
          fanGroup.rotation.y = a;

          const petiole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 5), stemMat);
          petiole.rotation.x = pitch;
          petiole.position.set(0, Math.cos(pitch) * 0.55, Math.sin(pitch) * 0.55);
          fanGroup.add(petiole);

          const fanGeo = new THREE.CircleGeometry(0.75, 7, -Math.PI * 0.38, Math.PI * 0.76);
          const fanMesh = new THREE.Mesh(fanGeo, leafMat);
          fanMesh.position.set(0, Math.cos(pitch) * 1.05, Math.sin(pitch) * 1.05);
          fanMesh.rotation.x = -Math.PI * 0.35 + pitch * 0.5;
          fanMesh.rotation.z = Math.PI * 0.5;
          fanGroup.add(fanMesh);
          group.add(fanGroup);
        }
      } else {
        const isYoung = variantId === 'jeune_palmier';
        const h = isYoung ? 3.2 : 7.4;
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.05, h * 0.5, 0),
          new THREE.Vector3(0, h, 0),
        ];
        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(pts, isYoung ? 0.2 : 0.34, isYoung ? 0.14 : 0.2, 12, 10),
            barkMat
          )
        );
        // Smooth green crownshaft characteristic of Royal Palm
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(isYoung ? 0.13 : 0.19, isYoung ? 0.16 : 0.23, isYoung ? 0.7 : 1.15, 9),
          crownShaftMat
        );
        shaft.position.set(0, h + (isYoung ? 0.3 : 0.5), 0);
        group.add(shaft);

        const topY = h + (isYoung ? 0.65 : 1.05);
        const count = isYoung ? 8 : 12;
        for (let i = 0; i < count; i++) {
          const tier = i % 2;
          const a = (i / count) * Math.PI * 2;
          const frond = createPalmFrondGroup(
            isYoung ? 1.45 : 2.35,
            0.52,
            tier === 0 ? 0.75 : 0.3,
            leafMat,
            stemMat
          );
          frond.position.set(0, topY, 0);
          frond.rotation.y = a;
          frond.rotation.x = tier === 0 ? 0.08 : -0.45;
          group.add(frond);
        }
      }

      return finalizeAssetGroup(group, `Palmier_Decoratif_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_manguier',
    name: 'Manguier',
    folder: 'Trees',
    fileName: 'manguier',
    description: 'Manguier généreux à feuillage dense, branches ramifiées et grappes de mangues tropicales.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'dome_dense', label: 'Dôme Dense Adulte', growthStage: 'Adulte', swatch: '#2b6e30' },
      { id: 'asymmetrique', label: 'Couronne Asymétrique', growthStage: 'Adulte', swatch: '#357a38' },
      { id: 'jeune_manguier', label: 'Jeune Manguier', growthStage: 'Jeune', swatch: '#4a9345' },
    ],
    build: (variantId = 'dome_dense') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#6f5340');
      const leafDark = BLVMaterials.foliage('#2a6c2f', true);
      const leafMid = BLVMaterials.foliage('#3b843b', true);
      const fruitMat = BLVMaterials.stone('#f39c2b', 0.45);
      const rng = createSeededRng(variantId === 'asymmetrique' ? 402 : variantId === 'jeune_manguier' ? 911 : 107);

      if (variantId === 'jeune_manguier') {
        const trunk = new THREE.Mesh(
          createTaperedBranchGeometry(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 1.1, 0), new THREE.Vector3(0, 2.0, 0.05)],
            0.14,
            0.07,
            8,
            7
          ),
          barkMat
        );
        group.add(trunk);
        const blobs = [
          [0, 2.55, 0, 0.95],
          [-0.45, 2.25, 0.35, 0.68],
          [0.48, 2.3, -0.3, 0.65],
          [0.1, 3.05, 0.1, 0.65],
        ];
        blobs.forEach(([x, y, z, r], idx) => {
          const m = new THREE.Mesh(createStylizedCanopyBlob(r, 1, 50 + idx, 1.05, 0.9, 1.05), idx % 2 === 0 ? leafMid : leafDark);
          m.position.set(x, y, z);
          group.add(m);
        });
      } else if (variantId === 'asymmetrique') {
        // Multi-forked leaning silhouette
        const mainPts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-0.18, 1.5, 0.1),
          new THREE.Vector3(-0.32, 2.7, 0.2),
        ];
        group.add(new THREE.Mesh(createTaperedBranchGeometry(mainPts, 0.34, 0.19, 10, 8), barkMat));

        const limbs = [
          [new THREE.Vector3(-0.22, 2.1, 0.12), new THREE.Vector3(-1.35, 3.3, 0.5)],
          [new THREE.Vector3(-0.28, 2.5, 0.16), new THREE.Vector3(1.15, 3.6, -0.4)],
          [new THREE.Vector3(-0.3, 2.6, 0.18), new THREE.Vector3(-0.2, 4.1, -0.9)],
        ];
        limbs.forEach(([a, b]) => {
          group.add(new THREE.Mesh(createTaperedBranchGeometry([a, b], 0.15, 0.07, 6, 6), barkMat));
        });

        const clusters = [
          [-1.35, 3.55, 0.55, 1.35],
          [1.25, 3.85, -0.45, 1.25],
          [-0.15, 4.45, -0.85, 1.3],
          [-0.2, 3.7, 0.6, 1.45],
          [0.45, 3.35, 0.7, 1.05],
          [-0.85, 4.25, -0.1, 1.15],
        ];
        clusters.forEach(([x, y, z, r], i) => {
          const blob = new THREE.Mesh(
            createStylizedCanopyBlob(r, 1, 200 + i, 1.12, 0.85, 1.08),
            i % 2 === 0 ? leafDark : leafMid
          );
          blob.position.set(x, y, z);
          group.add(blob);

          // Hanging mangoes
          for (let f = 0; f < 2; f++) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), fruitMat);
            fruit.scale.set(0.85, 1.25, 0.85);
            fruit.position.set(x + (rng() - 0.5) * r, y - r * 0.72, z + (rng() - 0.5) * r);
            group.add(fruit);
          }
        });
      } else {
        // Dense broad dome adult mango tree
        const trunkPts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.06, 1.3, 0.04),
          new THREE.Vector3(0, 2.5, 0),
        ];
        group.add(new THREE.Mesh(createTaperedBranchGeometry(trunkPts, 0.38, 0.22, 10, 8), barkMat));

        for (let b = 0; b < 4; b++) {
          const angle = (b / 4) * Math.PI * 2 + 0.3;
          const bPts = [
            new THREE.Vector3(0, 2.2, 0),
            new THREE.Vector3(Math.cos(angle) * 1.15, 3.45, Math.sin(angle) * 1.15),
          ];
          group.add(new THREE.Mesh(createTaperedBranchGeometry(bPts, 0.16, 0.07, 6, 6), barkMat));
        }

        const domeCenters = [
          [0, 4.1, 0, 1.85],
          [1.25, 3.65, 0.4, 1.35],
          [-1.2, 3.7, -0.35, 1.35],
          [0.35, 3.6, -1.25, 1.3],
          [-0.4, 3.55, 1.2, 1.32],
          [0, 5.05, 0, 1.35],
        ];
        domeCenters.forEach(([x, y, z, r], i) => {
          const blob = new THREE.Mesh(
            createStylizedCanopyBlob(r, 1, 77 + i, 1.15, 0.82, 1.15),
            i % 2 === 0 ? leafDark : leafMid
          );
          blob.position.set(x, y, z);
          group.add(blob);
        });

        for (let m = 0; m < 10; m++) {
          const a = (m / 10) * Math.PI * 2;
          const dist = 1.1 + rng() * 0.9;
          const mango = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), fruitMat);
          mango.scale.set(0.85, 1.25, 0.85);
          mango.position.set(Math.cos(a) * dist, 2.95 + rng() * 0.4, Math.sin(a) * dist);
          group.add(mango);
        }
      }

      return finalizeAssetGroup(group, `Manguier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_baobab',
    name: 'Baobab Africain',
    folder: 'Trees',
    fileName: 'baobab_africain',
    description: 'Baobab africain majestueux à tronc bouteille massif, branches noueuses et couronne clairsemée.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'millenaire', label: 'Baobab Millénaire', growthStage: 'Adulte', swatch: '#5f8d4e' },
      { id: 'evase', label: 'Baobab Évasé', growthStage: 'Adulte', swatch: '#729e58' },
      { id: 'jeune_baobab', label: 'Jeune Baobab', growthStage: 'Jeune', swatch: '#81aa63' },
    ],
    build: (variantId = 'millenaire') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('baobab', '#9e8877');
      const leafMat = BLVMaterials.foliage('#5b8e49', true);

      const isYoung = variantId === 'jeune_baobab';
      const isEvase = variantId === 'evase';

      // Sculpted Lathe bottle trunk
      const h = isYoung ? 3.2 : isEvase ? 4.8 : 5.6;
      const baseR = isYoung ? 0.36 : isEvase ? 1.05 : 0.92;
      const bellyR = isYoung ? 0.3 : isEvase ? 0.88 : 1.02;
      const topR = isYoung ? 0.16 : 0.52;

      const lathePts = [
        new THREE.Vector2(baseR * 1.18, 0),
        new THREE.Vector2(baseR, h * 0.12),
        new THREE.Vector2(bellyR, h * 0.48),
        new THREE.Vector2(bellyR * 0.88, h * 0.78),
        new THREE.Vector2(topR, h),
      ];
      const trunkGeo = new THREE.LatheGeometry(lathePts, 10);
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      group.add(trunk);

      // Root flares
      const flareCount = isYoung ? 4 : 6;
      for (let i = 0; i < flareCount; i++) {
        const a = (i / flareCount) * Math.PI * 2 + 0.2;
        const flare = new THREE.Mesh(
          createTaperedBranchGeometry(
            [
              new THREE.Vector3(Math.cos(a) * baseR * 0.8, h * 0.2, Math.sin(a) * baseR * 0.8),
              new THREE.Vector3(Math.cos(a) * baseR * 1.45, 0.05, Math.sin(a) * baseR * 1.45),
            ],
            baseR * 0.28,
            baseR * 0.1,
            5,
            6
          ),
          barkMat
        );
        group.add(flare);
      }

      // Gnarled spreading limbs & sparse wide leaf tufts
      const limbCount = isYoung ? 4 : 6;
      for (let i = 0; i < limbCount; i++) {
        const a = (i / limbCount) * Math.PI * 2 + (isEvase ? 0.4 : 0.1);
        const reach = (isYoung ? 1.1 : isEvase ? 2.6 : 2.2) * (0.85 + (i % 2) * 0.25);
        const tipY = h + (isYoung ? 0.85 : 1.55) + (i % 3) * 0.35;
        const midX = Math.cos(a) * reach * 0.55;
        const midZ = Math.sin(a) * reach * 0.55;
        const tipX = Math.cos(a) * reach;
        const tipZ = Math.sin(a) * reach;

        const branch = new THREE.Mesh(
          createTaperedBranchGeometry(
            [
              new THREE.Vector3(Math.cos(a) * topR * 0.6, h * 0.92, Math.sin(a) * topR * 0.6),
              new THREE.Vector3(midX, h + 0.6, midZ),
              new THREE.Vector3(tipX, tipY, tipZ),
            ],
            topR * 0.38,
            topR * 0.12,
            7,
            6
          ),
          barkMat
        );
        group.add(branch);

        // Flat-ish stylized leaf pad on tip
        const pad = new THREE.Mesh(
          createStylizedCanopyBlob(isYoung ? 0.55 : 0.95, 1, 300 + i, 1.35, 0.52, 1.3),
          leafMat
        );
        pad.position.set(tipX, tipY + 0.15, tipZ);
        group.add(pad);
      }

      // Central top canopy tuft
      const centerPad = new THREE.Mesh(
        createStylizedCanopyBlob(isYoung ? 0.65 : 1.15, 1, 399, 1.25, 0.58, 1.25),
        leafMat
      );
      centerPad.position.set(0, h + (isYoung ? 1.1 : 1.85), 0);
      group.add(centerPad);

      return finalizeAssetGroup(group, `Baobab_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_flamboyant',
    name: 'Flamboyant',
    folder: 'Trees',
    fileName: 'flamboyant',
    description: 'Arbre flamboyant à couronne parasol étalée et grappes de fleurs rouge-orangé éclatantes.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'rouge_ecarlate', label: 'Flamboyant Rouge', growthStage: 'En fleurs', swatch: '#d93829' },
      { id: 'orange_solaire', label: 'Flamboyant Orangé', growthStage: 'En fleurs', swatch: '#f06424' },
      { id: 'jeune_flamboyant', label: 'Jeune Flamboyant', growthStage: 'Jeune', swatch: '#4f9c46' },
    ],
    build: (variantId = 'rouge_ecarlate') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#7b6454');
      const leafMat = BLVMaterials.foliage('#4c9442', true);
      const bloomHex = variantId === 'orange_solaire' ? '#f26b21' : '#dc3427';
      const bloomMat = BLVMaterials.petal(bloomHex, false);

      const isYoung = variantId === 'jeune_flamboyant';
      const trunkH = isYoung ? 2.1 : 3.1;

      const trunk = new THREE.Mesh(
        createTaperedBranchGeometry(
          [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.12, trunkH * 0.5, -0.05),
            new THREE.Vector3(0.05, trunkH, 0.05),
          ],
          isYoung ? 0.14 : 0.28,
          isYoung ? 0.09 : 0.18,
          10,
          7
        ),
        barkMat
      );
      group.add(trunk);

      const armCount = isYoung ? 4 : 6;
      const spread = isYoung ? 1.35 : 2.95;
      const crownY = isYoung ? 2.9 : 4.35;

      for (let i = 0; i < armCount; i++) {
        const a = (i / armCount) * Math.PI * 2 + 0.25;
        const endX = Math.cos(a) * spread;
        const endZ = Math.sin(a) * spread;
        const endY = crownY + (i % 2) * 0.28;

        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(
              [
                new THREE.Vector3(0.05, trunkH * 0.88, 0.05),
                new THREE.Vector3(endX * 0.55, trunkH + 0.7, endZ * 0.55),
                new THREE.Vector3(endX, endY, endZ),
              ],
              isYoung ? 0.07 : 0.13,
              0.04,
              7,
              5
            ),
            barkMat
          )
        );

        // Wide flat parasol foliage disc
        const pad = new THREE.Mesh(
          createStylizedCanopyBlob(isYoung ? 0.72 : 1.35, 1, 510 + i, 1.45, 0.36, 1.45),
          leafMat
        );
        pad.position.set(endX * 0.88, endY + 0.15, endZ * 0.88);
        group.add(pad);

        // Vivid red/orange flower clusters sitting atop the umbrella canopy
        if (!isYoung || i % 2 === 0) {
          const flowerCluster = new THREE.Mesh(
            createStylizedCanopyBlob(isYoung ? 0.38 : 0.85, 1, 610 + i, 1.35, 0.34, 1.35),
            bloomMat
          );
          flowerCluster.position.set(endX * 0.92, endY + 0.38, endZ * 0.92);
          group.add(flowerCluster);
        }
      }

      // Central top parasol + floral crown
      const centerGreen = new THREE.Mesh(
        createStylizedCanopyBlob(isYoung ? 0.8 : 1.55, 1, 599, 1.5, 0.38, 1.5),
        leafMat
      );
      centerGreen.position.set(0, crownY + 0.35, 0);
      group.add(centerGreen);

      if (!isYoung) {
        const centerBloom = new THREE.Mesh(
          createStylizedCanopyBlob(1.05, 1, 699, 1.4, 0.34, 1.4),
          bloomMat
        );
        centerBloom.position.set(0.15, crownY + 0.58, -0.1);
        group.add(centerBloom);
      }

      return finalizeAssetGroup(group, `Flamboyant_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_acacia',
    name: 'Acacia',
    folder: 'Trees',
    fileName: 'acacia',
    description: 'Acacia africain à ramure tabulaire étagée et silhouette élancée pour parcs et avenues.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'tabulaire', label: 'Acacia Tabulaire', growthStage: 'Adulte', swatch: '#5f8b3e' },
      { id: 'double_etage', label: 'Double Étage', growthStage: 'Adulte', swatch: '#6d9946' },
      { id: 'jeune_acacia', label: 'Jeune Acacia', growthStage: 'Jeune', swatch: '#7ca853' },
    ],
    build: (variantId = 'tabulaire') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#644d3c');
      const leafMat = BLVMaterials.foliage('#5d8d3f', true);

      const isDouble = variantId === 'double_etage';
      const isYoung = variantId === 'jeune_acacia';

      const h = isYoung ? 2.8 : 4.6;
      const trunk = new THREE.Mesh(
        createTaperedBranchGeometry(
          [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-0.18, h * 0.45, 0.1),
            new THREE.Vector3(0.08, h * 0.85, -0.06),
            new THREE.Vector3(0, h, 0),
          ],
          isYoung ? 0.12 : 0.22,
          isYoung ? 0.06 : 0.1,
          10,
          7
        ),
        barkMat
      );
      group.add(trunk);

      const addTier = (yBase: number, tierRadius: number, branches: number, seedOffset: number) => {
        for (let i = 0; i < branches; i++) {
          const a = (i / branches) * Math.PI * 2 + seedOffset * 0.3;
          const bx = Math.cos(a) * tierRadius;
          const bz = Math.sin(a) * tierRadius;
          const by = yBase + 0.65;

          group.add(
            new THREE.Mesh(
              createTaperedBranchGeometry(
                [new THREE.Vector3(0, yBase - 0.3, 0), new THREE.Vector3(bx, by, bz)],
                0.08,
                0.035,
                5,
                5
              ),
              barkMat
            )
          );

          const pad = new THREE.Mesh(
            createStylizedCanopyBlob(tierRadius * 0.56, 1, seedOffset + i, 1.65, 0.26, 1.55),
            leafMat
          );
          pad.position.set(bx, by + 0.14, bz);
          group.add(pad);
        }
      };

      if (isDouble) {
        addTier(h * 0.65, 1.85, 4, 710);
        addTier(h * 0.96, 2.45, 5, 730);
      } else if (isYoung) {
        addTier(h * 0.85, 1.15, 4, 750);
      } else {
        addTier(h * 0.92, 2.75, 6, 770);
        const cap = new THREE.Mesh(
          createStylizedCanopyBlob(1.75, 1, 799, 1.6, 0.24, 1.6),
          leafMat
        );
        cap.position.set(0, h + 0.85, 0);
        group.add(cap);
      }

      return finalizeAssetGroup(group, `Acacia_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_fromager',
    name: 'Fromager',
    folder: 'Trees',
    fileName: 'fromager',
    description: 'Grand fromager (kapokier) d’Afrique de l’Ouest avec imposants contreforts racinaires et étages élevés.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'contreforts', label: 'Grand à Contreforts', growthStage: 'Adulte', swatch: '#2d6d34' },
      { id: 'elance', label: 'Fromager Élancé', growthStage: 'Adulte', swatch: '#397b3f' },
      { id: 'jeune_fromager', label: 'Jeune Fromager', growthStage: 'Jeune', swatch: '#4f944d' },
    ],
    build: (variantId = 'contreforts') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('baobab', '#9c9288');
      const leafMat = BLVMaterials.foliage('#2f7236', true);
      const leafTopMat = BLVMaterials.foliage('#3d8542', true);

      const isYoung = variantId === 'jeune_fromager';
      const isElance = variantId === 'elance';
      const height = isYoung ? 4.4 : isElance ? 10.2 : 9.4;
      const rBot = isYoung ? 0.22 : isElance ? 0.48 : 0.6;

      // Straight towering columnar trunk
      group.add(
        new THREE.Mesh(
          createTaperedBranchGeometry(
            [
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(0.08, height * 0.5, 0),
              new THREE.Vector3(0, height, 0),
            ],
            rBot,
            rBot * 0.36,
            12,
            9
          ),
          barkMat
        )
      );

      // Iconic buttress roots (contreforts)
      const buttressCount = isYoung ? 4 : 6;
      const buttressH = isYoung ? 0.9 : 2.4;
      const buttressSpan = isYoung ? 0.55 : 1.55;
      for (let i = 0; i < buttressCount; i++) {
        const a = (i / buttressCount) * Math.PI * 2 + 0.15;
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(buttressSpan, 0);
        finShape.quadraticCurveTo(buttressSpan * 0.35, buttressH * 0.35, 0, buttressH);
        finShape.closePath();

        const finGeo = new THREE.ExtrudeGeometry(finShape, {
          depth: isYoung ? 0.08 : 0.18,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.03,
          bevelSegments: 2,
        });
        finGeo.translate(0, 0, isYoung ? -0.04 : -0.09);
        const fin = new THREE.Mesh(finGeo, barkMat);
        fin.rotation.y = a;
        group.add(fin);
      }

      // Horizontal whorled upper branches (characteristic of Ceiba pentandra)
      const tiers = isYoung ? 2 : 3;
      for (let t = 0; t < tiers; t++) {
        const tierY = height * (0.64 + t * 0.16);
        const tierReach = (isYoung ? 1.15 : 2.6) * (1 - t * 0.18);
        const branchCount = 4 + (t % 2);
        for (let b = 0; b < branchCount; b++) {
          const a = (b / branchCount) * Math.PI * 2 + t * 0.55;
          const bx = Math.cos(a) * tierReach;
          const bz = Math.sin(a) * tierReach;
          group.add(
            new THREE.Mesh(
              createTaperedBranchGeometry(
                [new THREE.Vector3(0, tierY, 0), new THREE.Vector3(bx, tierY + 0.35, bz)],
                0.14,
                0.05,
                5,
                6
              ),
              barkMat
            )
          );
          const pad = new THREE.Mesh(
            createStylizedCanopyBlob(tierReach * 0.54, 1, 820 + t * 10 + b, 1.35, 0.48, 1.35),
            t === tiers - 1 ? leafTopMat : leafMat
          );
          pad.position.set(bx, tierY + 0.55, bz);
          group.add(pad);
        }
      }

      const crown = new THREE.Mesh(
        createStylizedCanopyBlob(isYoung ? 0.85 : 1.75, 1, 899, 1.3, 0.55, 1.3),
        leafTopMat
      );
      crown.position.set(0, height + (isYoung ? 0.45 : 0.9), 0);
      group.add(crown);

      return finalizeAssetGroup(group, `Fromager_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_badamier',
    name: 'Arbre Tropical à Larges Feuilles',
    folder: 'Trees',
    fileName: 'arbre_tropical_larges_feuilles',
    description: 'Badamier tropical (Terminalia catappa) à étages horizontaux et larges feuilles vernissées.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'vert_tropical', label: 'Feuillage Vert Étagé', growthStage: 'Adulte', swatch: '#368a41' },
      { id: 'teinte_cuivre', label: 'Teinte Cuivrée', growthStage: 'Adulte', swatch: '#c45b2c' },
      { id: 'jeune_badamier', label: 'Jeune Plant', growthStage: 'Jeune', swatch: '#52a352' },
    ],
    build: (variantId = 'vert_tropical') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#725c4b');
      const mainLeaf = BLVMaterials.foliage(
        variantId === 'teinte_cuivre' ? '#4a853c' : '#358840',
        true
      );
      const accentLeaf = BLVMaterials.foliage(
        variantId === 'teinte_cuivre' ? '#cc582a' : '#4fa64a',
        true
      );

      const isYoung = variantId === 'jeune_badamier';
      const h = isYoung ? 3.1 : 6.2;

      group.add(
        new THREE.Mesh(
          createTaperedBranchGeometry(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h, 0)],
            isYoung ? 0.13 : 0.24,
            0.07,
            8,
            7
          ),
          barkMat
        )
      );

      const whorls = isYoung ? 2 : 4;
      for (let w = 0; w < whorls; w++) {
        const y = h * (0.38 + (w / whorls) * 0.58);
        const radius = (isYoung ? 1.15 : 2.45) * (1 - w * 0.18);
        const count = 5;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + w * 0.62;
          const bx = Math.cos(a) * radius;
          const bz = Math.sin(a) * radius;
          group.add(
            new THREE.Mesh(
              createTaperedBranchGeometry(
                [new THREE.Vector3(0, y, 0), new THREE.Vector3(bx, y + 0.12, bz)],
                0.08,
                0.03,
                4,
                5
              ),
              barkMat
            )
          );
          const pad = new THREE.Mesh(
            createStylizedCanopyBlob(radius * 0.48, 1, 910 + w * 10 + i, 1.35, 0.3, 1.35),
            (w + i) % 3 === 0 ? accentLeaf : mainLeaf
          );
          pad.position.set(bx * 0.85, y + 0.22, bz * 0.85);
          group.add(pad);
        }
      }

      const top = new THREE.Mesh(
        createStylizedCanopyBlob(isYoung ? 0.55 : 0.95, 1, 999, 1.3, 0.35, 1.3),
        accentLeaf
      );
      top.position.set(0, h + 0.25, 0);
      group.add(top);

      return finalizeAssetGroup(group, `Arbre_Larges_Feuilles_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_ornemental_urbain',
    name: 'Arbre Ornemental Urbain',
    folder: 'Trees',
    fileName: 'arbre_ornemental_urbain',
    description: 'Arbre d’alignement taillé pour trottoirs, boulevards et esplanades modernes d’Abidjan.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'houppier_rond', label: 'Houppier Rond Taillé', growthStage: 'Adulte', swatch: '#3d9148' },
      { id: 'houppier_ovale', label: 'Houppier Ovale Avenue', growthStage: 'Adulte', swatch: '#4a9e52' },
      { id: 'jeune_urbain', label: 'Jeune Arbre Tuteuré', growthStage: 'Jeune', swatch: '#65b35e' },
    ],
    build: (variantId = 'houppier_rond') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#755a45');
      const stakeMat = BLVMaterials.wood('iroko', 0.8);
      const leafMat = BLVMaterials.foliage(
        variantId === 'jeune_urbain' ? '#58ad52' : '#3a8f45',
        true
      );
      const leafHighlight = BLVMaterials.foliage('#52a858', true);

      if (variantId === 'jeune_urbain') {
        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(
              [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.3, 0)],
              0.08,
              0.04,
              6,
              6
            ),
            barkMat
          )
        );
        // Wooden tree stakes (tuteurs)
        for (const sx of [-0.2, 0.2]) {
          const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 1.5, 6), stakeMat);
          stake.position.set(sx, 0.75, 0);
          group.add(stake);
        }
        const tie = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.015, 5, 12), BLVMaterials.metal('#2a2a2a', 0.2, 0.8));
        tie.rotation.x = Math.PI / 2;
        tie.position.y = 1.35;
        group.add(tie);

        const crown = new THREE.Mesh(createStylizedCanopyBlob(0.72, 1, 101, 1.0, 1.15, 1.0), leafMat);
        crown.position.y = 2.65;
        group.add(crown);
      } else {
        const isOval = variantId === 'houppier_ovale';
        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(
              [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.6, 0)],
              0.18,
              0.11,
              8,
              8
            ),
            barkMat
          )
        );

        const sy = isOval ? 1.5 : 1.02;
        const main = new THREE.Mesh(
          createStylizedCanopyBlob(1.35, 1, 102, 1.0, sy, 1.0, 0.09),
          leafMat
        );
        main.position.y = isOval ? 4.2 : 3.7;
        group.add(main);

        const accent = new THREE.Mesh(
          createStylizedCanopyBlob(0.85, 1, 103, 1.0, sy * 0.9, 1.0, 0.1),
          leafHighlight
        );
        accent.position.set(0.45, isOval ? 4.6 : 4.05, 0.35);
        group.add(accent);
      }

      return finalizeAssetGroup(group, `Arbre_Ornemental_Urbain_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'tree_ficus_urbain',
    name: 'Ficus Ombragé',
    folder: 'Trees',
    fileName: 'ficus_ombrage',
    description: 'Ficus urbain au houppier large et racines aériennes décoratives, prisé sur les places abidjanaises.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'grand_ficus', label: 'Grand Ficus de Place', growthStage: 'Adulte', swatch: '#286631' },
      { id: 'ficus_compact', label: 'Ficus Compact', growthStage: 'Jeune', swatch: '#3d8242' },
    ],
    build: (variantId = 'grand_ficus') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('baobab', '#8b7768');
      const leafMat = BLVMaterials.foliage('#2a6b32', true);
      const leafLight = BLVMaterials.foliage('#3d8540', true);

      const isCompact = variantId === 'ficus_compact';
      const scale = isCompact ? 0.65 : 1.0;

      // Braided multi-stem trunk + aerial roots
      for (let s = 0; s < 3; s++) {
        const a = (s / 3) * Math.PI * 2;
        const pts = [
          new THREE.Vector3(Math.cos(a) * 0.25 * scale, 0, Math.sin(a) * 0.25 * scale),
          new THREE.Vector3(Math.cos(a + 0.5) * 0.15 * scale, 1.4 * scale, Math.sin(a + 0.5) * 0.15 * scale),
          new THREE.Vector3(Math.cos(a + 0.2) * 0.6 * scale, 2.7 * scale, Math.sin(a + 0.2) * 0.6 * scale),
        ];
        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(pts, 0.18 * scale, 0.08 * scale, 8, 6),
            barkMat
          )
        );
      }

      // Hanging aerial roots
      if (!isCompact) {
        for (let r = 0; r < 4; r++) {
          const a = (r / 4) * Math.PI * 2 + 0.4;
          const root = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.8, 5), barkMat);
          root.position.set(Math.cos(a) * 1.15, 1.4, Math.sin(a) * 1.15);
          group.add(root);
        }
      }

      const canopySpots = [
        [0, 3.6, 0, 1.7],
        [1.3, 3.2, 0.5, 1.25],
        [-1.3, 3.25, -0.4, 1.25],
        [0.3, 3.3, -1.3, 1.2],
        [-0.35, 3.25, 1.25, 1.2],
      ];
      canopySpots.forEach(([x, y, z, r], i) => {
        const blob = new THREE.Mesh(
          createStylizedCanopyBlob(r * scale, 1, 1120 + i, 1.2, 0.78, 1.2),
          i % 2 === 0 ? leafMat : leafLight
        );
        blob.position.set(x * scale, y * scale, z * scale);
        group.add(blob);
      });

      return finalizeAssetGroup(group, `Ficus_Ombrage_${variantId}`, 'bottom-center');
    },
  },
];
