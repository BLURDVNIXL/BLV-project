import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createSeededRng,
  createStylizedCanopyBlob,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const GARDEN_DECORATION_ASSETS: AssetDefinition[] = [
  {
    id: 'gd_statue',
    name: 'Statue Décorative',
    folder: 'Garden_Decorations',
    fileName: 'statue_decorative',
    description: 'Statue ornementale de jardin et de rond-point : totem sculptural bois/bronze ou vase sculpté sur socle (sans personnage).',
    pivotType: 'bottom-center',
    variants: [
      { id: 'totem_bronze', label: 'Totem Sculpté Bronze', growthStage: 'Standard', swatch: '#735b3c' },
      { id: 'stelae_terracotta', label: 'Stèle Terre Cuite', growthStage: 'Standard', swatch: '#c4633e' },
    ],
    build: (variantId = 'totem_bronze') => {
      const group = new THREE.Group();
      const plinthMat = BLVMaterials.stone('#9e988e', 0.85);
      const artMat =
        variantId === 'stelae_terracotta'
          ? BLVMaterials.terracotta('#c4633e', '#e3c79e')
          : BLVMaterials.metal('#7a6242', 0.82, 0.32);

      // Stepped stone pedestal
      const base1 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.76), plinthMat);
      base1.position.y = 0.08;
      group.add(base1);
      const base2 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.65, 0.56), plinthMat);
      base2.position.y = 0.485;
      group.add(base2);

      if (variantId === 'stelae_terracotta') {
        const amphoraProfile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.14, 0),
          new THREE.Vector2(0.26, 0.35),
          new THREE.Vector2(0.18, 0.75),
          new THREE.Vector2(0.22, 0.92),
          new THREE.Vector2(0.14, 0.95),
          new THREE.Vector2(0, 0.92),
        ];
        const sculpt = new THREE.Mesh(new THREE.LatheGeometry(amphoraProfile, 14), artMat);
        sculpt.position.y = 0.81;
        group.add(sculpt);
      } else {
        // Stylized geometric totem column with interlocking diamond reliefs
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.15, 8), artMat);
        col.position.y = 1.38;
        group.add(col);
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 6, 8), artMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 1.02 + i * 0.34;
          group.add(ring);
        }
        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), artMat);
        crest.scale.set(1, 1.4, 1);
        crest.position.y = 2.12;
        group.add(crest);
      }

      return finalizeAssetGroup(group, `Statue_Decorative_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_sculpture_abstraite',
    name: 'Sculpture Abstraite',
    folder: 'Garden_Decorations',
    fileName: 'sculpture_abstraite',
    description: 'Sculpture urbaine contemporaine pour esplanades, ronds-points et jardins paysagers d’Abidjan.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'ruban_infini', label: 'Ruban Infini Bronze', growthStage: 'Standard', swatch: '#b08642' },
      { id: 'arches_pierre', label: 'Arches Géométriques', growthStage: 'Standard', swatch: '#d6cfc2' },
      { id: 'monolithe_dore', label: 'Monolithe Doré', growthStage: 'Standard', swatch: '#d49b35' },
    ],
    build: (variantId = 'ruban_infini') => {
      const group = new THREE.Group();
      const baseMat = BLVMaterials.stone('#4d5259', 0.8);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.22, 16), baseMat);
      plinth.position.y = 0.11;
      group.add(plinth);

      if (variantId === 'arches_pierre') {
        const stoneMat = BLVMaterials.stone('#dbd4c8', 0.72);
        for (let i = 0; i < 3; i++) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(0.55 - i * 0.1, 0.08, 8, 20, Math.PI),
            stoneMat
          );
          arch.position.set(0, 0.22, -0.18 + i * 0.18);
          arch.rotation.y = (i - 1) * 0.28;
          group.add(arch);
        }
      } else if (variantId === 'monolithe_dore') {
        const goldMat = BLVMaterials.metal('#d49b35', 0.9, 0.22);
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.55, 0.24), goldMat);
        s1.position.set(-0.14, 0.98, 0);
        s1.rotation.z = -0.12;
        group.add(s1);
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.25, 0.2), goldMat);
        s2.position.set(0.16, 0.84, 0.08);
        s2.rotation.z = 0.16;
        group.add(s2);
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), goldMat);
        orb.position.set(0.02, 1.85, 0.04);
        group.add(orb);
      } else {
        const bronzeMat = BLVMaterials.metal('#b08642', 0.88, 0.24);
        const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.1, 64, 10, 2, 3), bronzeMat);
        knot.position.y = 0.92;
        group.add(knot);
      }

      return finalizeAssetGroup(group, `Sculpture_Abstraite_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_grande_jarre',
    name: 'Grande Jarre',
    folder: 'Garden_Decorations',
    fileName: 'grande_jarre',
    description: 'Grande jarre décorative (canari traditionnel revisité) en terre cuite ou céramique émaillée.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'canari_terre_cuite', label: 'Jarre Canari Terre Cuite', growthStage: 'Standard', swatch: '#c4633e' },
      { id: 'jarre_indigo', label: 'Jarre Émaillée Indigo', growthStage: 'Standard', swatch: '#2b4c7e' },
      { id: 'trio_jarres', label: 'Trio de Jarres', growthStage: 'Standard', swatch: '#b55635' },
    ],
    build: (variantId = 'canari_terre_cuite') => {
      const group = new THREE.Group();
      const mat =
        variantId === 'jarre_indigo'
          ? BLVMaterials.ceramic('#2b4c7e')
          : BLVMaterials.terracotta('#c4633e', '#e8d5b7');
      const altMat = BLVMaterials.terracotta('#9e492b');

      const buildJar = (scale: number, material: THREE.Material) => {
        const pts = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.18 * scale, 0),
          new THREE.Vector2(0.36 * scale, 0.34 * scale),
          new THREE.Vector2(0.34 * scale, 0.62 * scale),
          new THREE.Vector2(0.19 * scale, 0.82 * scale),
          new THREE.Vector2(0.24 * scale, 0.92 * scale),
          new THREE.Vector2(0.18 * scale, 0.92 * scale),
        ];
        return new THREE.Mesh(new THREE.LatheGeometry(pts, 16), material);
      };

      if (variantId === 'trio_jarres') {
        const j1 = buildJar(1.0, mat);
        j1.position.set(0, 0, 0);
        group.add(j1);
        const j2 = buildJar(0.72, altMat);
        j2.position.set(0.45, 0, 0.18);
        group.add(j2);
        const j3 = buildJar(0.58, mat);
        j3.position.set(-0.38, 0, 0.22);
        group.add(j3);
      } else {
        group.add(buildJar(1.05, mat));
      }

      return finalizeAssetGroup(group, `Grande_Jarre_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_pot_terre_cuite',
    name: 'Pot en Terre Cuite',
    folder: 'Garden_Decorations',
    fileName: 'pot_terre_cuite',
    description: 'Pots en terre cuite côtelés ou évasés pour terrasses, cours d’habitations et jardins.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'pot_evase', label: 'Grand Pot Évasé', growthStage: 'Standard', swatch: '#c96842' },
      { id: 'ensemble_3_pots', label: 'Ensemble 3 Pots', growthStage: 'Standard', swatch: '#b85a37' },
    ],
    build: (variantId = 'pot_evase') => {
      const group = new THREE.Group();
      const terraMat = BLVMaterials.terracotta('#c96842');
      const soilMat = BLVMaterials.stone('#4d3828', 0.95);

      const makePot = (s: number) => {
        const p = new THREE.Group();
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.16 * s, 0),
          new THREE.Vector2(0.24 * s, 0.36 * s),
          new THREE.Vector2(0.27 * s, 0.42 * s),
          new THREE.Vector2(0.22 * s, 0.42 * s),
        ];
        p.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 14), terraMat));
        const soil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.21 * s, 0.21 * s, 0.03, 12),
          soilMat
        );
        soil.position.y = 0.38 * s;
        p.add(soil);
        return p;
      };

      if (variantId === 'ensemble_3_pots') {
        const p1 = makePot(1.05);
        group.add(p1);
        const p2 = makePot(0.75);
        p2.position.set(0.36, 0, 0.14);
        group.add(p2);
        const p3 = makePot(0.58);
        p3.position.set(-0.28, 0, 0.2);
        group.add(p3);
      } else {
        group.add(makePot(1.15));
      }

      return finalizeAssetGroup(group, `Pot_Terre_Cuite_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_petite_cloture',
    name: 'Petite Clôture',
    folder: 'Garden_Decorations',
    fileName: 'petite_cloture',
    description: 'Petite clôture modulaire de jardin en bois peint, bambou tressé ou fer forgé bas.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'piquets_bois', label: 'Clôture Piquets Bois', growthStage: 'Standard', swatch: '#9c663b' },
      { id: 'bambou_tresse', label: 'Clôture Bambou Tropical', growthStage: 'Standard', swatch: '#c6a265' },
      { id: 'fer_forge_basse', label: 'Clôture Fer Forgé', growthStage: 'Standard', swatch: '#22282e' },
    ],
    build: (variantId = 'piquets_bois') => {
      const group = new THREE.Group();

      if (variantId === 'fer_forge_basse') {
        const ironMat = BLVMaterials.metal('#22282e', 0.85, 0.35);
        for (const sx of [-0.75, 0.75]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), ironMat);
          post.position.set(sx, 0.375, 0);
          group.add(post);
        }
        for (const ry of [0.16, 0.62]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.03), ironMat);
          rail.position.y = ry;
          group.add(rail);
        }
        for (let i = -5; i <= 5; i++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.66, 6), ironMat);
          bar.position.set(i * 0.13, 0.4, 0);
          group.add(bar);
          const spear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), ironMat);
          spear.position.set(i * 0.13, 0.75, 0);
          group.add(spear);
        }
      } else if (variantId === 'bambou_tresse') {
        const bambooMat = BLVMaterials.wood('bamboo', 0.62);
        const tieMat = BLVMaterials.stone('#4c3a28', 0.9);
        for (let i = -5; i <= 5; i++) {
          const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.72, 6), bambooMat);
          cane.position.set(i * 0.14, 0.36, 0);
          group.add(cane);
        }
        for (const ry of [0.22, 0.56]) {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.56, 6), tieMat);
          rail.rotation.z = Math.PI / 2;
          rail.position.set(0, ry, 0.03);
          group.add(rail);
        }
      } else {
        const woodMat = BLVMaterials.wood('iroko', 0.7);
        for (const ry of [0.2, 0.52]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.04), woodMat);
          rail.position.set(0, ry, -0.03);
          group.add(rail);
        }
        for (let i = -4; i <= 4; i++) {
          const picket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.03), woodMat);
          picket.position.set(i * 0.18, 0.34, 0);
          group.add(picket);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 4), woodMat);
          tip.rotation.y = Math.PI / 4;
          tip.position.set(i * 0.18, 0.71, 0);
          group.add(tip);
        }
      }

      return finalizeAssetGroup(group, `Petite_Cloture_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_muret',
    name: 'Muret Décoratif',
    folder: 'Garden_Decorations',
    fileName: 'muret_decoratif',
    description: 'Muret bas d’aménagement urbain en pierre sèche ou enduit ocre coiffé d’un chaperon.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'enduit_ocre', label: 'Muret Enduit Ocre', growthStage: 'Standard', swatch: '#d99b66' },
      { id: 'pierre_seche', label: 'Muret Pierre Sèche', growthStage: 'Standard', swatch: '#9c9284' },
    ],
    build: (variantId = 'enduit_ocre') => {
      const group = new THREE.Group();
      const capMat = BLVMaterials.stone('#c9bfb0', 0.78);

      if (variantId === 'pierre_seche') {
        const stoneA = BLVMaterials.stone('#948a7c', 0.9, true);
        const stoneB = BLVMaterials.stone('#7d7467', 0.9, true);
        const core = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.54, 0.34), stoneB);
        core.position.y = 0.27;
        group.add(core);
        const rng = createSeededRng(42);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 5; col++) {
            const block = new THREE.Mesh(
              new THREE.BoxGeometry(0.32 + rng() * 0.06, 0.16, 0.4),
              (row + col) % 2 === 0 ? stoneA : stoneB
            );
            block.position.set(-0.7 + col * 0.35, 0.1 + row * 0.17, 0);
            group.add(block);
          }
        }
      } else {
        const stuccoMat = BLVMaterials.stone('#d99b66', 0.85);
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.56, 0.36), stuccoMat);
        body.position.y = 0.28;
        group.add(body);
        for (const px of [-0.88, 0.88]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 0.44), stuccoMat);
          pillar.position.set(px, 0.33, 0);
          group.add(pillar);
        }
      }

      const coping = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.08, 0.46), capMat);
      coping.position.y = 0.62;
      group.add(coping);

      return finalizeAssetGroup(group, `Muret_Decoratif_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_bordure_jardin',
    name: 'Bordure de Jardin',
    folder: 'Garden_Decorations',
    fileName: 'bordure_jardin',
    description: 'Bordure modulaire basse pour délimiter massifs fleuris, allées gravillonnées et pelouses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'bordure_pierre', label: 'Bordure Pierre Taillée', growthStage: 'Standard', swatch: '#a8a298' },
      { id: 'bordure_rondins', label: 'Bordure Rondins Bois', growthStage: 'Standard', swatch: '#8c532b' },
    ],
    build: (variantId = 'bordure_pierre') => {
      const group = new THREE.Group();

      if (variantId === 'bordure_rondins') {
        const woodMat = BLVMaterials.wood('iroko', 0.78);
        for (let i = 0; i < 10; i++) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.26 + (i % 2) * 0.04, 7), woodMat);
          log.position.set(-0.54 + i * 0.12, 0.13, 0);
          group.add(log);
        }
      } else {
        const stoneMat = BLVMaterials.stone('#a6a095', 0.86);
        for (let i = 0; i < 4; i++) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.12), stoneMat);
          block.position.set(-0.51 + i * 0.34, 0.09, 0);
          group.add(block);
        }
      }

      return finalizeAssetGroup(group, `Bordure_Jardin_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'gd_pergola_vegetalisee',
    name: 'Pergola Végétalisée',
    folder: 'Garden_Decorations',
    fileName: 'pergola_vegetalisee',
    description: 'Pergola de jardin recouverte de lianes verdoyantes et de bougainvilliers grimpants fleuris.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'bougainvillier_magenta', label: 'Pergola Bougainvillier', growthStage: 'En fleurs', swatch: '#d61e7a' },
      { id: 'feuillage_tropical', label: 'Pergola Feuillage Vert', growthStage: 'Adulte', swatch: '#388e3c' },
    ],
    build: (variantId = 'bougainvillier_magenta') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.wood('iroko', 0.72);
      const leafMat = BLVMaterials.foliage('#35853b', true);
      const flowerMat = BLVMaterials.petal('#d91c78', false);

      for (const [cx, cz] of [
        [-1.35, -0.9],
        [1.35, -0.9],
        [-1.35, 0.9],
        [1.35, 0.9],
      ]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), woodMat);
        post.position.set(cx, 1.25, cz);
        group.add(post);
      }

      for (const cz of [-0.9, 0.9]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.15, 0.12), woodMat);
        beam.position.set(0, 2.5, cz);
        group.add(beam);
      }
      for (let i = 0; i < 7; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 2.2), woodMat);
        slat.position.set(-1.2 + i * 0.4, 2.62, 0);
        group.add(slat);
      }

      // Climbing greenery & floral canopy draped across top & columns
      const vineSpots = [
        [-1.35, 1.4, 0.9, 0.28, false],
        [1.35, 1.6, -0.9, 0.26, false],
        [-0.95, 2.74, 0.2, 0.48, false],
        [0.05, 2.78, -0.15, 0.56, false],
        [0.95, 2.72, 0.25, 0.46, false],
        [-0.45, 2.86, 0.55, 0.36, true],
        [0.55, 2.84, -0.45, 0.38, true],
        [-1.1, 2.66, -0.5, 0.32, true],
      ] as const;

      vineSpots.forEach(([x, y, z, r, isBloom], idx) => {
        const mat =
          isBloom && variantId === 'bougainvillier_magenta' ? flowerMat : leafMat;
        const blob = new THREE.Mesh(
          createStylizedCanopyBlob(r, 1, 710 + idx, 1.35, 0.55, 1.25),
          mat
        );
        blob.position.set(x, y, z);
        group.add(blob);
      });

      return finalizeAssetGroup(group, `Pergola_Vegetalisee_${variantId}`, 'bottom-center');
    },
  },
];
