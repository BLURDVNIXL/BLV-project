import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createSeededRng,
  createStylizedCanopyBlob,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const BUSH_ASSETS: AssetDefinition[] = [
  {
    id: 'bush_gros_arrondi',
    name: 'Gros Buisson Arrondi',
    folder: 'Bushes',
    fileName: 'gros_buisson_arrondi',
    description: 'Buisson généreux et arrondi composé de lobes feuillus denses pour jardins et parcs.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'vert_profond', label: 'Vert Profond', growthStage: 'Adulte', swatch: '#2e7535' },
      { id: 'vert_tendre', label: 'Vert Tendre', growthStage: 'Adulte', swatch: '#4a9e48' },
      { id: 'buisson_double', label: 'Double Lobe', growthStage: 'Adulte', swatch: '#39883e' },
    ],
    build: (variantId = 'vert_profond') => {
      const group = new THREE.Group();
      const mainHex = variantId === 'vert_tendre' ? '#499c47' : '#2e7535';
      const subHex = variantId === 'vert_tendre' ? '#62b558' : '#3d8b41';
      const mainMat = BLVMaterials.foliage(mainHex, true);
      const subMat = BLVMaterials.foliage(subHex, true);

      if (variantId === 'buisson_double') {
        const b1 = new THREE.Mesh(createStylizedCanopyBlob(0.58, 1, 10, 1.1, 0.88, 1.1), mainMat);
        b1.position.set(-0.28, 0.48, 0);
        group.add(b1);
        const b2 = new THREE.Mesh(createStylizedCanopyBlob(0.45, 1, 11, 1.05, 0.85, 1.05), subMat);
        b2.position.set(0.32, 0.38, 0.14);
        group.add(b2);
      } else {
        const core = new THREE.Mesh(createStylizedCanopyBlob(0.62, 1, 15, 1.12, 0.88, 1.12), mainMat);
        core.position.y = 0.5;
        group.add(core);
        const top = new THREE.Mesh(createStylizedCanopyBlob(0.4, 1, 16, 1.05, 0.82, 1.05), subMat);
        top.position.set(0.18, 0.72, 0.12);
        group.add(top);
        const side = new THREE.Mesh(createStylizedCanopyBlob(0.36, 1, 17, 1.0, 0.85, 1.0), mainMat);
        side.position.set(-0.28, 0.36, -0.2);
        group.add(side);
      }

      return finalizeAssetGroup(group, `Gros_Buisson_Arrondi_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_sauvage',
    name: 'Buisson Sauvage',
    folder: 'Bushes',
    fileName: 'buisson_sauvage',
    description: 'Buisson sauvage irrégulier avec ramifications ligneuses apparentes et feuillage naturel.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'broussaille_verte', label: 'Broussaille Verte', growthStage: 'Adulte', swatch: '#4a853c' },
      { id: 'savane_doree', label: 'Buisson Savane Sec', growthStage: 'Adulte', swatch: '#7f8c3d' },
      { id: 'buisson_baies', label: 'Buisson à Baies', growthStage: 'En fleurs', swatch: '#d9483b' },
    ],
    build: (variantId = 'broussaille_verte') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.bark('smooth', '#694f3a');
      const leafHex = variantId === 'savane_doree' ? '#7b8a3b' : '#46823a';
      const leafMat = BLVMaterials.foliage(leafHex, true);
      const berryMat = BLVMaterials.petal('#dc4134', false);
      const rng = createSeededRng(variantId.length * 41);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng() * 0.4;
        const r = 0.25 + rng() * 0.3;
        const h = 0.35 + rng() * 0.38;
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, h, 5), woodMat);
        stick.position.set(Math.cos(a) * r * 0.4, h * 0.45, Math.sin(a) * r * 0.4);
        stick.rotation.z = -Math.cos(a) * 0.45;
        stick.rotation.x = Math.sin(a) * 0.45;
        group.add(stick);

        const tuft = new THREE.Mesh(
          createStylizedCanopyBlob(0.24 + rng() * 0.14, 1, 50 + i, 1.25, 0.78, 1.15, 0.24),
          leafMat
        );
        tuft.position.set(Math.cos(a) * r, h * 0.82, Math.sin(a) * r);
        group.add(tuft);

        if (variantId === 'buisson_baies') {
          for (let b = 0; b < 3; b++) {
            const berry = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), berryMat);
            berry.position.set(
              Math.cos(a) * r + (rng() - 0.5) * 0.22,
              h * 0.85 + rng() * 0.12,
              Math.sin(a) * r + (rng() - 0.5) * 0.22
            );
            group.add(berry);
          }
        }
      }

      return finalizeAssetGroup(group, `Buisson_Sauvage_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_haie_taillee',
    name: 'Haie Taillée',
    folder: 'Bushes',
    fileName: 'haie_taillee',
    description: 'Haie géométrique taillée au cordeau avec module droit, angle à 90° et extrémité arrondie.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'module_droit', label: 'Module Droit 2m', growthStage: 'Standard', swatch: '#2e7a36' },
      { id: 'module_angle', label: 'Angle 90°', growthStage: 'Standard', swatch: '#37873f' },
      { id: 'extremite_arrondie', label: 'Haie Extrémité Courbe', growthStage: 'Standard', swatch: '#429648' },
    ],
    build: (variantId = 'module_droit') => {
      const group = new THREE.Group();
      const hedgeMat = BLVMaterials.foliage('#2f7b37', true);
      const topMat = BLVMaterials.foliage('#3e8f44', true);
      const stemMat = BLVMaterials.bark('smooth', '#5a4332');

      const addBeveledBlock = (w: number, h: number, d: number, x: number, z: number) => {
        const shape = new THREE.Shape();
        const hw = w / 2;
        const hd = d / 2;
        shape.moveTo(-hw, -hd);
        shape.lineTo(hw, -hd);
        shape.lineTo(hw, hd);
        shape.lineTo(-hw, hd);
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: h - 0.08,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelSegments: 2,
        });
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, hedgeMat);
        mesh.position.set(x, 0.05, z);
        group.add(mesh);

        // Small woody base feet
        const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.06, d * 0.4), stemMat);
        base.position.set(x, 0.03, z);
        group.add(base);
      };

      if (variantId === 'module_angle') {
        addBeveledBlock(1.4, 0.9, 0.55, 0.42, 0);
        addBeveledBlock(0.55, 0.9, 1.4, 0, 0.42);
      } else if (variantId === 'extremite_arrondie') {
        addBeveledBlock(1.4, 0.85, 0.52, 0, 0);
        for (const sx of [-0.7, 0.7]) {
          const cap = new THREE.Mesh(createStylizedCanopyBlob(0.32, 1, 70 + sx, 0.9, 1.35, 0.9, 0.06), topMat);
          cap.position.set(sx, 0.48, 0);
          group.add(cap);
        }
      } else {
        addBeveledBlock(2.0, 0.95, 0.55, 0, 0);
        // Subtle organic top trim accents
        for (let i = -2; i <= 2; i++) {
          const tuft = new THREE.Mesh(createStylizedCanopyBlob(0.18, 0, 90 + i, 1.2, 0.5, 1.0, 0.12), topMat);
          tuft.position.set(i * 0.4, 0.92, 0);
          group.add(tuft);
        }
      }

      return finalizeAssetGroup(group, `Haie_Taillee_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_haie_separative',
    name: 'Haie Séparative',
    folder: 'Bushes',
    fileName: 'haie_separative',
    description: 'Haie séparative en bac bois ou béton pour délimiter terrasses de maquis, trottoirs et esplanades.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'socle_bois', label: 'Haie sur Bac Bois', growthStage: 'Standard', swatch: '#8c532b' },
      { id: 'socle_beton', label: 'Haie sur Bac Béton', growthStage: 'Standard', swatch: '#8a8d91' },
    ],
    build: (variantId = 'socle_bois') => {
      const group = new THREE.Group();
      const boxMat =
        variantId === 'socle_beton'
          ? BLVMaterials.stone('#8c8f94', 0.82)
          : BLVMaterials.wood('iroko', 0.7);
      const trimMat = BLVMaterials.metal('#2a3038', 0.8, 0.35);
      const hedgeMat = BLVMaterials.foliage('#36873e', true);

      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.48), boxMat);
      planter.position.y = 0.21;
      group.add(planter);

      // Corner steel straps
      for (const sx of [-0.88, 0.88]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.51), trimMat);
        strap.position.set(sx, 0.22, 0);
        group.add(strap);
      }

      // Lush separator hedge row on top
      for (let i = 0; i < 4; i++) {
        const lx = -0.62 + i * 0.41;
        const bush = new THREE.Mesh(
          createStylizedCanopyBlob(0.32, 1, 130 + i, 1.0, 1.25, 0.85, 0.12),
          hedgeMat
        );
        bush.position.set(lx, 0.72, 0);
        group.add(bush);
      }

      return finalizeAssetGroup(group, `Haie_Separative_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_massif_vegetal',
    name: 'Massif Végétal',
    folder: 'Bushes',
    fileName: 'massif_vegetal',
    description: 'Composition végétale étagée associant arbustes arrondis, feuillages contrastés et graminées.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'ilot_central', label: 'Massif Îlot Central', growthStage: 'Adulte', swatch: '#35853d' },
      { id: 'massif_angle', label: 'Massif d’Angle', growthStage: 'Adulte', swatch: '#4a9e48' },
    ],
    build: (variantId = 'ilot_central') => {
      const group = new THREE.Group();
      const darkLeaf = BLVMaterials.foliage('#2b6b32', true);
      const midLeaf = BLVMaterials.foliage('#439445', true);
      const limeLeaf = BLVMaterials.foliage('#72b346', true);

      const layout =
        variantId === 'massif_angle'
          ? [
              [-0.35, 0.48, -0.35, 0.48, darkLeaf],
              [0.32, 0.35, -0.3, 0.36, midLeaf],
              [-0.3, 0.36, 0.35, 0.35, midLeaf],
              [0.12, 0.24, 0.15, 0.28, limeLeaf],
            ]
          : [
              [0, 0.52, 0, 0.52, darkLeaf],
              [0.52, 0.34, 0.16, 0.36, midLeaf],
              [-0.48, 0.36, -0.14, 0.38, midLeaf],
              [0.14, 0.26, -0.45, 0.3, limeLeaf],
              [-0.18, 0.25, 0.46, 0.3, limeLeaf],
            ];

      layout.forEach(([x, y, z, r, mat], idx) => {
        const blob = new THREE.Mesh(
          createStylizedCanopyBlob(r as number, 1, 210 + idx, 1.15, 0.82, 1.15),
          mat as THREE.Material
        );
        blob.position.set(x as number, y as number, z as number);
        group.add(blob);
      });

      return finalizeAssetGroup(group, `Massif_Vegetal_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_herbes_hautes',
    name: 'Herbes Hautes',
    folder: 'Bushes',
    fileName: 'herbes_hautes',
    description: 'Graminées et roseaux ornementaux hauts pour bords de lagune, bassins et jardins tropicaux.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'roseaux_verts', label: 'Roseaux Verts', growthStage: 'Adulte', swatch: '#4a9942' },
      { id: 'herbes_dorees', label: 'Herbes Savane Dorées', growthStage: 'Adulte', swatch: '#c9a342' },
    ],
    build: (variantId = 'roseaux_verts') => {
      const group = new THREE.Group();
      const bladeHex = variantId === 'herbes_dorees' ? '#bfa043' : '#489640';
      const tipHex = variantId === 'herbes_dorees' ? '#e3cb7d' : '#73b856';
      const bladeMat = BLVMaterials.foliage(bladeHex, true, true);
      const plumeMat = BLVMaterials.petal(tipHex, false);
      const rng = createSeededRng(variantId === 'herbes_dorees' ? 301 : 109);

      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + rng() * 0.2;
        const dist = rng() * 0.18;
        const h = 0.85 + rng() * 0.55;
        const tilt = 0.14 + rng() * 0.35;

        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.032, h, 3), bladeMat);
        blade.geometry.translate(0, h / 2, 0);
        blade.scale.set(1, 1, 0.25);
        blade.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
        blade.rotation.order = 'YXZ';
        blade.rotation.y = a;
        blade.rotation.x = tilt;
        group.add(blade);

        if (i % 3 === 0) {
          const plume = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 5), plumeMat);
          plume.position.set(
            Math.cos(a) * (dist + Math.sin(tilt) * h),
            Math.cos(tilt) * h,
            Math.sin(a) * (dist + Math.sin(tilt) * h)
          );
          plume.rotation.order = 'YXZ';
          plume.rotation.y = a;
          plume.rotation.x = tilt * 1.1;
          group.add(plume);
        }
      }

      return finalizeAssetGroup(group, `Herbes_Hautes_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_touffe_herbes',
    name: 'Touffe d’Herbes',
    folder: 'Bushes',
    fileName: 'touffe_herbes',
    description: 'Petite touffe d’herbe stylisée pour casser la linéarité des trottoirs, rochers et pelouses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'touffe_triple', label: 'Touffe Triple', growthStage: 'Standard', swatch: '#59a845' },
      { id: 'touffe_simple', label: 'Touffe Simple Compacte', growthStage: 'Standard', swatch: '#68b851' },
    ],
    build: (variantId = 'touffe_triple') => {
      const group = new THREE.Group();
      const mat = BLVMaterials.foliage('#57a644', true, true);

      const addCluster = (cx: number, cz: number, scale: number) => {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const h = (0.24 + (i % 3) * 0.08) * scale;
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.028 * scale, h, 3), mat);
          blade.geometry.translate(0, h / 2, 0);
          blade.scale.set(1, 1, 0.3);
          blade.position.set(cx, 0, cz);
          blade.rotation.order = 'YXZ';
          blade.rotation.y = a;
          blade.rotation.x = 0.28 + (i % 2) * 0.22;
          group.add(blade);
        }
      };

      if (variantId === 'touffe_simple') {
        addCluster(0, 0, 1.0);
      } else {
        addCluster(0, 0, 1.15);
        addCluster(0.24, 0.14, 0.85);
        addCluster(-0.2, 0.18, 0.78);
      }

      return finalizeAssetGroup(group, `Touffe_Herbes_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'bush_petit_bosquet',
    name: 'Petit Bosquet',
    folder: 'Bushes',
    fileName: 'petit_bosquet',
    description: 'Petit bosquet tropical associant jeunes pousses, fougères basses et buissons d’ombrage.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'bosquet_dense', label: 'Bosquet Dense', growthStage: 'Adulte', swatch: '#2e7834' },
      { id: 'bosquet_clairiere', label: 'Bosquet Aéré', growthStage: 'Adulte', swatch: '#479644' },
    ],
    build: (variantId = 'bosquet_dense') => {
      const group = new THREE.Group();
      const barkMat = BLVMaterials.bark('smooth', '#694e3a');
      const darkLeaf = BLVMaterials.foliage('#2c7533', true);
      const midLeaf = BLVMaterials.foliage('#459442', true);
      const rng = createSeededRng(variantId === 'bosquet_clairiere' ? 77 : 22);

      const count = variantId === 'bosquet_clairiere' ? 4 : 6;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const dist = i === 0 ? 0 : 0.45 + rng() * 0.25;
        const h = i === 0 ? 1.45 : 0.75 + rng() * 0.45;
        const x = Math.cos(a) * dist;
        const z = Math.sin(a) * dist;

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h * 0.75, 5), barkMat);
        stem.position.set(x, h * 0.37, z);
        group.add(stem);

        const crown = new THREE.Mesh(
          createStylizedCanopyBlob(i === 0 ? 0.58 : 0.36 + rng() * 0.12, 1, 300 + i, 1.15, 0.85, 1.15),
          i % 2 === 0 ? darkLeaf : midLeaf
        );
        crown.position.set(x, h * 0.8, z);
        group.add(crown);
      }

      return finalizeAssetGroup(group, `Petit_Bosquet_${variantId}`, 'bottom-center');
    },
  },
];
