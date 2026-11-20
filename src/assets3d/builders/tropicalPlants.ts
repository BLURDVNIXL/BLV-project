import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createBroadLeafMesh,
  createPalmFrondGroup,
  createTaperedBranchGeometry,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const TROPICAL_PLANT_ASSETS: AssetDefinition[] = [
  {
    id: 'plant_bananier',
    name: 'Bananier',
    folder: 'Tropical_Plants',
    fileName: 'bananier',
    description: 'Bananier tropical avec stipe tendre, larges feuilles arquées et régime de bananes pendant.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'regime_mur', label: 'Régime Mûr Jaune', growthStage: 'Adulte', swatch: '#f2c938' },
      { id: 'regime_vert', label: 'Régime Vert & Fleur', growthStage: 'Adulte', swatch: '#6ab04c' },
      { id: 'jeune_bananier', label: 'Jeune Bananier', growthStage: 'Jeune', swatch: '#78c257' },
    ],
    build: (variantId = 'regime_mur') => {
      const group = new THREE.Group();
      const stemMat = BLVMaterials.foliage('#6c9944', false);
      const leafMat = BLVMaterials.foliage('#4ca13e', true, true);
      const bananaMat = BLVMaterials.petal(
        variantId === 'regime_vert' ? '#7bc143' : '#f2c735',
        false
      );
      const budMat = BLVMaterials.petal('#7a2243', false);

      const isYoung = variantId === 'jeune_bananier';
      const h = isYoung ? 1.35 : 2.35;

      // Layered pseudostem
      const trunk = new THREE.Mesh(
        createTaperedBranchGeometry(
          [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, h * 0.5, 0), new THREE.Vector3(0, h, 0)],
          isYoung ? 0.1 : 0.16,
          isYoung ? 0.06 : 0.09,
          8,
          8
        ),
        stemMat
      );
      group.add(trunk);

      const leafCount = isYoung ? 6 : 9;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2 + i * 0.2;
        const tier = i % 3;
        const leaf = createBroadLeafMesh(
          isYoung ? 1.05 : 1.55 - tier * 0.15,
          isYoung ? 0.38 : 0.52,
          0.42 + tier * 0.15,
          leafMat
        );
        leaf.position.set(0, h - 0.15 + tier * 0.08, 0);
        leaf.rotation.y = a;
        leaf.rotation.x = -0.38 + tier * 0.2;
        group.add(leaf);
      }

      if (!isYoung) {
        // Hanging banana bunch (régime)
        const stalk = new THREE.Mesh(
          createTaperedBranchGeometry(
            [
              new THREE.Vector3(0, h - 0.1, 0),
              new THREE.Vector3(0.28, h - 0.02, 0.16),
              new THREE.Vector3(0.38, h - 0.58, 0.22),
            ],
            0.035,
            0.02,
            6,
            5
          ),
          stemMat
        );
        group.add(stalk);

        for (let tier = 0; tier < 3; tier++) {
          for (let b = 0; b < 5; b++) {
            const ba = (b / 5) * Math.PI * 1.4 - 0.5;
            const banana = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.11, 3, 5), bananaMat);
            banana.position.set(
              0.38 + Math.cos(ba) * 0.07,
              h - 0.28 - tier * 0.1,
              0.22 + Math.sin(ba) * 0.07
            );
            banana.rotation.z = Math.cos(ba) * 0.4;
            banana.rotation.x = Math.sin(ba) * 0.4;
            group.add(banana);
          }
        }

        // Purple banana flower bud at tip
        const bud = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), budMat);
        bud.rotation.x = Math.PI;
        bud.position.set(0.38, h - 0.7, 0.22);
        group.add(bud);
      }

      return finalizeAssetGroup(group, `Bananier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_papayer',
    name: 'Plant de Papayer',
    folder: 'Tropical_Plants',
    fileName: 'papayer',
    description: 'Papayer élancé à tronc annelé, couronne de feuilles palmées et grappe de papayes sous le houppier.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'papayer_productif', label: 'Papayer avec Fruits', growthStage: 'Adulte', swatch: '#e69b28' },
      { id: 'papayer_elance', label: 'Grand Papayer Élancé', growthStage: 'Adulte', swatch: '#59a644' },
      { id: 'jeune_papayer', label: 'Jeune Papayer', growthStage: 'Jeune', swatch: '#68b851' },
    ],
    build: (variantId = 'papayer_productif') => {
      const group = new THREE.Group();
      const trunkMat = BLVMaterials.bark('palm', '#9ea376');
      const leafMat = BLVMaterials.foliage('#4c9e3c', true, true);
      const stemMat = BLVMaterials.foliage('#71a84f', false);
      const fruitMat = BLVMaterials.petal('#e89425', false);
      const greenFruitMat = BLVMaterials.petal('#72ab3e', false);

      const isYoung = variantId === 'jeune_papayer';
      const h = isYoung ? 1.55 : variantId === 'papayer_elance' ? 3.8 : 3.1;

      group.add(
        new THREE.Mesh(
          createTaperedBranchGeometry(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, h * 0.5, 0), new THREE.Vector3(0, h, 0)],
            isYoung ? 0.08 : 0.14,
            isYoung ? 0.045 : 0.075,
            10,
            8
          ),
          trunkMat
        )
      );

      // Clustered papayas directly under the crown
      if (!isYoung) {
        const count = variantId === 'papayer_productif' ? 8 : 5;
        for (let f = 0; f < count; f++) {
          const a = (f / count) * Math.PI * 2;
          const row = f % 2;
          const papaya = new THREE.Mesh(
            new THREE.SphereGeometry(0.095, 7, 6),
            row === 0 ? fruitMat : greenFruitMat
          );
          papaya.scale.set(0.85, 1.45, 0.85);
          papaya.position.set(
            Math.cos(a) * 0.14,
            h - 0.18 - row * 0.16,
            Math.sin(a) * 0.14
          );
          papaya.rotation.z = -Math.cos(a) * 0.35;
          papaya.rotation.x = Math.sin(a) * 0.35;
          group.add(papaya);
        }
      }

      // Palmate leaves on long petioles
      const leafCount = isYoung ? 7 : 10;
      for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2 + i * 0.25;
        const petioleLen = isYoung ? 0.5 : 0.85;
        const petioleGroup = new THREE.Group();
        petioleGroup.position.set(0, h - (i % 2) * 0.08, 0);
        petioleGroup.rotation.y = a;

        const petiole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.024, petioleLen, 5),
          stemMat
        );
        petiole.rotation.x = Math.PI * 0.32;
        petiole.position.set(0, petioleLen * 0.22, petioleLen * 0.42);
        petioleGroup.add(petiole);

        // Star/palmate leaf disc made of 5 pointed lobes
        const blade = new THREE.Group();
        blade.position.set(0, petioleLen * 0.42, petioleLen * 0.84);
        blade.rotation.x = 0.28;
        for (let lobe = -2; lobe <= 2; lobe++) {
          const lMesh = createBroadLeafMesh(
            isYoung ? 0.32 : 0.48 - Math.abs(lobe) * 0.06,
            0.14,
            0.12,
            leafMat
          );
          lMesh.rotation.y = lobe * 0.48;
          blade.add(lMesh);
        }
        petioleGroup.add(blade);
        group.add(petioleGroup);
      }

      return finalizeAssetGroup(group, `Papayer_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_aloes',
    name: 'Aloès',
    folder: 'Tropical_Plants',
    fileName: 'aloes',
    description: 'Rosette succulente d’aloès aux feuilles charnues dentelées pour bordures et jardins secs.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'emeraude', label: 'Aloès Vert Émeraude', growthStage: 'Adulte', swatch: '#4a9b61' },
      { id: 'jade_bleute', label: 'Aloès Jade Bleuté', growthStage: 'Adulte', swatch: '#599c8c' },
      { id: 'touffe_aloes', label: 'Touffe Multi-Rosettes', growthStage: 'Adulte', swatch: '#418c58' },
    ],
    build: (variantId = 'emeraude') => {
      const group = new THREE.Group();
      const mat = BLVMaterials.foliage(
        variantId === 'jade_bleute' ? '#569c8b' : '#4a9b60',
        true
      );
      const tipMat = BLVMaterials.petal('#a3ba61', false);

      const buildRosette = (scale: number) => {
        const rGroup = new THREE.Group();
        const rings = [
          { count: 7, tilt: 0.98, len: 0.65, rad: 0.07 },
          { count: 6, tilt: 0.62, len: 0.56, rad: 0.06 },
          { count: 4, tilt: 0.24, len: 0.45, rad: 0.05 },
        ];
        rings.forEach((ring, ri) => {
          for (let i = 0; i < ring.count; i++) {
            const a = (i / ring.count) * Math.PI * 2 + ri * 0.45;
            const blade = new THREE.Mesh(
              new THREE.ConeGeometry(ring.rad * scale, ring.len * scale, 4),
              mat
            );
            blade.geometry.translate(0, (ring.len * scale) / 2, 0);
            blade.scale.set(1.2, 1, 0.45);
            blade.rotation.order = 'YXZ';
            blade.rotation.y = a;
            blade.rotation.x = ring.tilt;
            rGroup.add(blade);
          }
        });
        if (variantId === 'emeraude') {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.72, 5), mat);
          stalk.position.y = 0.36;
          rGroup.add(stalk);
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), tipMat);
          spike.position.y = 0.76;
          rGroup.add(spike);
        }
        return rGroup;
      };

      if (variantId === 'touffe_aloes') {
        group.add(buildRosette(1.0));
        const r2 = buildRosette(0.72);
        r2.position.set(0.36, 0, 0.2);
        group.add(r2);
        const r3 = buildRosette(0.65);
        r3.position.set(-0.32, 0, 0.24);
        group.add(r3);
      } else {
        group.add(buildRosette(1.05));
      }

      return finalizeAssetGroup(group, `Aloes_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_larges_feuilles',
    name: 'Plante à Larges Feuilles Tropicales',
    folder: 'Tropical_Plants',
    fileName: 'plante_larges_feuilles',
    description: 'Touffe luxuriante d’oreilles d’éléphant (Alocasia) et philodendrons tropicaux.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'oreille_elephant', label: 'Oreille d’Éléphant', growthStage: 'Adulte', swatch: '#2e8540' },
      { id: 'philodendron', label: 'Philodendron Tropical', growthStage: 'Adulte', swatch: '#3d994e' },
      { id: 'touffe_basse', label: 'Jeune Touffe Dense', growthStage: 'Jeune', swatch: '#4eab58' },
    ],
    build: (variantId = 'oreille_elephant') => {
      const group = new THREE.Group();
      const leafMat = BLVMaterials.foliage(
        variantId === 'philodendron' ? '#369449' : '#2c803d',
        true,
        true
      );
      const stemMat = BLVMaterials.foliage('#4f9442', false);

      const count = variantId === 'touffe_basse' ? 6 : 9;
      const maxH = variantId === 'touffe_basse' ? 0.7 : 1.35;

      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.22;
        const h = maxH * (0.62 + (i % 3) * 0.2);
        const reach = 0.3 + (i % 3) * 0.16;

        const stem = new THREE.Mesh(
          createTaperedBranchGeometry(
            [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * reach, h, Math.sin(a) * reach)],
            0.032,
            0.018,
            5,
            5
          ),
          stemMat
        );
        group.add(stem);

        const blade = createBroadLeafMesh(
          variantId === 'touffe_basse' ? 0.45 : 0.78,
          variantId === 'oreille_elephant' ? 0.48 : 0.36,
          0.24,
          leafMat
        );
        blade.position.set(Math.cos(a) * reach, h, Math.sin(a) * reach);
        blade.rotation.y = a - Math.PI * 0.5 + Math.PI * 0.5;
        // Orient outward from center
        blade.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
        blade.rotation.x = 0.28;
        group.add(blade);
      }

      return finalizeAssetGroup(group, `Plante_Larges_Feuilles_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_fougere',
    name: 'Fougère Tropicale',
    folder: 'Tropical_Plants',
    fileName: 'fougere',
    description: 'Fougère arborescente ou de sous-bois aux frondes plumeuses disposées en couronne radiale.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'grande_fougere', label: 'Grande Fougère Dense', growthStage: 'Adulte', swatch: '#3d9942' },
      { id: 'fougere_doree', label: 'Fougère Vert Doré', growthStage: 'Adulte', swatch: '#6cb346' },
      { id: 'jeune_fougere', label: 'Jeune Fougère', growthStage: 'Jeune', swatch: '#4ea850' },
    ],
    build: (variantId = 'grande_fougere') => {
      const group = new THREE.Group();
      const frondMat = BLVMaterials.foliage(
        variantId === 'fougere_doree' ? '#6db345' : '#3a9440',
        true,
        true
      );
      const stemMat = BLVMaterials.bark('smooth', '#4c7333');

      const count = variantId === 'jeune_fougere' ? 8 : 13;
      const len = variantId === 'jeune_fougere' ? 0.65 : 1.05;

      for (let i = 0; i < count; i++) {
        const ring = i < Math.floor(count * 0.55) ? 0 : 1;
        const a = (i / count) * Math.PI * 2 + ring * 0.4;
        const frond = createPalmFrondGroup(
          len * (ring === 0 ? 1 : 0.72),
          0.26,
          ring === 0 ? 0.42 : 0.16,
          frondMat,
          stemMat
        );
        frond.position.y = 0.05;
        frond.rotation.y = a;
        frond.rotation.x = ring === 0 ? 0.12 : -0.42;
        group.add(frond);
      }

      return finalizeAssetGroup(group, `Fougere_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_en_pot',
    name: 'Plante Ornementale en Pot',
    folder: 'Tropical_Plants',
    fileName: 'plante_ornementale_pot',
    description: 'Plante tropicale en pot décoratif pour terrasses, devantures de boutiques et cours d’habitations.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'dracaena_terre_cuite', label: 'Dracaena Terre Cuite', growthStage: 'Standard', swatch: '#c4633e' },
      { id: 'palmier_nain_emaille', label: 'Palmier Nain Émaillé', growthStage: 'Standard', swatch: '#2c8c99' },
      { id: 'sansevieria_moderne', label: 'Sansevieria Bac Gris', growthStage: 'Standard', swatch: '#59636e' },
    ],
    build: (variantId = 'dracaena_terre_cuite') => {
      const group = new THREE.Group();
      const soilMat = BLVMaterials.stone('#4d3828', 0.95);

      if (variantId === 'sansevieria_moderne') {
        const potMat = BLVMaterials.stone('#58626c', 0.78);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.48, 8), potMat);
        pot.position.y = 0.24;
        group.add(pot);
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 8), soilMat);
        soil.position.y = 0.46;
        group.add(soil);

        const bladeMat = BLVMaterials.foliage('#3f8a4c', true);
        const edgeMat = BLVMaterials.foliage('#91ba4e', true);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const dist = (i % 2) * 0.08 + 0.04;
          const h = 0.48 + (i % 3) * 0.14;
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.055, h, 4), i % 3 === 0 ? edgeMat : bladeMat);
          blade.scale.set(1.2, 1, 0.24);
          blade.position.set(Math.cos(a) * dist, 0.46 + h * 0.45, Math.sin(a) * dist);
          blade.rotation.y = a;
          blade.rotation.x = 0.08 * (i % 2 === 0 ? 1 : -1);
          group.add(blade);
        }
      } else if (variantId === 'palmier_nain_emaille') {
        const potMat = BLVMaterials.ceramic('#2b8b96');
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.22, 0),
          new THREE.Vector2(0.32, 0.36),
          new THREE.Vector2(0.28, 0.56),
          new THREE.Vector2(0.24, 0.56),
        ];
        group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 14), potMat));
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), soilMat);
        soil.position.y = 0.52;
        group.add(soil);

        const leafMat = BLVMaterials.foliage('#3e9445', true, true);
        const stemMat = BLVMaterials.foliage('#5f8a3c', false);
        for (let i = 0; i < 7; i++) {
          const frond = createPalmFrondGroup(0.85, 0.24, 0.26, leafMat, stemMat);
          frond.position.y = 0.54;
          frond.rotation.y = (i / 7) * Math.PI * 2;
          frond.rotation.x = -0.35;
          group.add(frond);
        }
      } else {
        const potMat = BLVMaterials.terracotta('#c4633e', '#ebd8be');
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.2, 0),
          new THREE.Vector2(0.3, 0.48),
          new THREE.Vector2(0.33, 0.54),
          new THREE.Vector2(0.27, 0.54),
        ];
        group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 12), potMat));
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12), soilMat);
        soil.position.y = 0.5;
        group.add(soil);

        const caneMat = BLVMaterials.bark('palm', '#8c765a');
        const leafMat = BLVMaterials.foliage('#459944', true, true);
        for (const [cx, cy, cz, ch] of [[0, 0.5, 0, 0.65], [0.09, 0.5, -0.05, 0.42]]) {
          const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, ch, 7), caneMat);
          cane.position.set(cx, cy + ch / 2, cz);
          group.add(cane);
          for (let l = 0; l < 7; l++) {
            const leaf = createBroadLeafMesh(0.42, 0.14, 0.16, leafMat);
            leaf.position.set(cx, cy + ch, cz);
            leaf.rotation.y = (l / 7) * Math.PI * 2;
            leaf.rotation.x = -0.18 + (l % 2) * 0.25;
            group.add(leaf);
          }
        }
      }

      return finalizeAssetGroup(group, `Plante_En_Pot_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_petit_arbuste',
    name: 'Petit Arbuste Tropical',
    folder: 'Tropical_Plants',
    fileName: 'petit_arbuste',
    description: 'Petit arbuste ornemental type croton panaché ou acalypha pour agrémenter allées et entrées.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'croton_panache', label: 'Croton Panaché', growthStage: 'Adulte', swatch: '#d98a2b' },
      { id: 'acalypha_pourpre', label: 'Feuillage Pourpre', growthStage: 'Adulte', swatch: '#8f304b' },
      { id: 'arbuste_vert', label: 'Arbuste Vert Tendre', growthStage: 'Jeune', swatch: '#59a649' },
    ],
    build: (variantId = 'croton_panache') => {
      const group = new THREE.Group();
      const stemMat = BLVMaterials.bark('smooth', '#6e5642');
      const leafMain = BLVMaterials.foliage(
        variantId === 'acalypha_pourpre'
          ? '#7d2a42'
          : variantId === 'arbuste_vert'
            ? '#52a346'
            : '#3e8c3a',
        true,
        true
      );
      const leafAccent = BLVMaterials.foliage(
        variantId === 'acalypha_pourpre'
          ? '#a83c54'
          : variantId === 'arbuste_vert'
            ? '#72bf58'
            : '#e09226',
        true,
        true
      );

      for (let b = 0; b < 5; b++) {
        const a = (b / 5) * Math.PI * 2;
        const tipX = Math.cos(a) * 0.25;
        const tipZ = Math.sin(a) * 0.25;
        const tipY = 0.45 + (b % 2) * 0.14;
        group.add(
          new THREE.Mesh(
            createTaperedBranchGeometry(
              [new THREE.Vector3(0, 0, 0), new THREE.Vector3(tipX, tipY, tipZ)],
              0.03,
              0.014,
              4,
              5
            ),
            stemMat
          )
        );
        for (let l = 0; l < 5; l++) {
          const la = (l / 5) * Math.PI * 2;
          const leaf = createBroadLeafMesh(0.32, 0.13, 0.1, l % 2 === 0 ? leafMain : leafAccent);
          leaf.position.set(tipX, tipY, tipZ);
          leaf.rotation.y = la;
          leaf.rotation.x = -0.25;
          group.add(leaf);
        }
      }

      return finalizeAssetGroup(group, `Petit_Arbuste_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'plant_rampante',
    name: 'Plante Rampante',
    folder: 'Tropical_Plants',
    fileName: 'plante_rampante',
    description: 'Liane couvre-sol rampante pour habiller murets, pieds d’arbres et bordures de jardins.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'lierre_tropical', label: 'Lierre Tropical Vert', growthStage: 'Adulte', swatch: '#429446' },
      { id: 'couvre_sol_fleuri', label: 'Couvre-Sol Fleuri', growthStage: 'En fleurs', swatch: '#e86894' },
    ],
    build: (variantId = 'lierre_tropical') => {
      const group = new THREE.Group();
      const stemMat = BLVMaterials.foliage('#4c853b', false);
      const leafMat = BLVMaterials.foliage('#439647', true, true);
      const flowerMat = BLVMaterials.petal('#eb6696', true);

      const runnerAngles = [0, 1.1, 2.3, 3.6, 4.9];
      runnerAngles.forEach((a, idx) => {
        const len = 0.95 + (idx % 2) * 0.35;
        const pts = [
          new THREE.Vector3(0, 0.04, 0),
          new THREE.Vector3(Math.cos(a + 0.25) * len * 0.5, 0.05, Math.sin(a + 0.25) * len * 0.5),
          new THREE.Vector3(Math.cos(a) * len, 0.03, Math.sin(a) * len),
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.012, 4, false), stemMat));

        for (let s = 1; s <= 5; s++) {
          const pt = curve.getPointAt(s / 5);
          const leaf = createBroadLeafMesh(0.18, 0.14, 0.03, leafMat);
          leaf.position.copy(pt);
          leaf.rotation.y = a + (s % 2 === 0 ? 0.9 : -0.9);
          leaf.rotation.x = 0.1;
          group.add(leaf);

          if (variantId === 'couvre_sol_fleuri' && s % 2 === 0) {
            const petal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), flowerMat);
            petal.position.set(pt.x, pt.y + 0.04, pt.z);
            group.add(petal);
          }
        }
      });

      return finalizeAssetGroup(group, `Plante_Rampante_${variantId}`, 'bottom-center');
    },
  },
];
