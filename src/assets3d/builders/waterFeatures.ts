import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import { finalizeAssetGroup } from '../geometryHelpers';

export const WATER_FEATURE_ASSETS: AssetDefinition[] = [
  {
    id: 'wf_fontaine_decorative',
    name: 'Fontaine à Eau Décorative',
    folder: 'Water_Features',
    fileName: 'fontaine_decorative',
    description: 'Fontaine monumentale à vasques superposées et jets d’eau arqués pour places centrales et ronds-points.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'pierre_2_vasques', label: 'Pierre 2 Vasques', growthStage: 'Standard', swatch: '#c4b8a5' },
      { id: 'bronze_3_vasques', label: 'Bronze 3 Vasques', growthStage: 'Standard', swatch: '#6e5c45' },
    ],
    build: (variantId = 'pierre_2_vasques') => {
      const group = new THREE.Group();
      const isBronze = variantId === 'bronze_3_vasques';
      const stoneMat = BLVMaterials.stone(isBronze ? '#7d7a75' : '#cfc3b0', 0.78);
      const tierMat = isBronze ? BLVMaterials.metal('#6b5a44', 0.75, 0.35) : stoneMat;
      const waterMat = BLVMaterials.water('#38b6d4');

      // Outer octagonal/circular basin rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.16, 8, 24), stoneMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.24;
      group.add(rim);

      const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.62, 0.36, 24, 1, true), stoneMat);
      basinWall.position.y = 0.18;
      group.add(basinWall);

      const basinFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.06, 24), stoneMat);
      basinFloor.position.y = 0.03;
      group.add(basinFloor);

      // Basin water surface
      const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, 0.04, 24), waterMat);
      waterPool.position.y = 0.25;
      group.add(waterPool);

      // Central pedestal
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.05, 12), tierMat);
      pedestal.position.y = 0.55;
      group.add(pedestal);

      // Main lower bowl
      const bowl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.28, 0.24, 16), tierMat);
      bowl1.position.y = 1.05;
      group.add(bowl1);
      const water1 = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.03, 16), waterMat);
      water1.position.y = 1.16;
      group.add(water1);

      // Upper tier
      const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 10), tierMat);
      col2.position.y = 1.48;
      group.add(col2);
      const bowl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.16, 0.18, 14), tierMat);
      bowl2.position.y = 1.78;
      group.add(bowl2);

      if (isBronze) {
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), tierMat);
        finial.position.y = 2.08;
        group.add(finial);
      }

      // Stylized parabolic water arcs
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const arc = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(a) * 0.12, 1.92, Math.sin(a) * 0.12),
          new THREE.Vector3(Math.cos(a) * 0.55, 2.05, Math.sin(a) * 0.55),
          new THREE.Vector3(Math.cos(a) * 1.02, 0.28, Math.sin(a) * 1.02),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 10, 0.02, 5, false), waterMat));
      }

      return finalizeAssetGroup(group, `Fontaine_Decorative_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'wf_petite_fontaine',
    name: 'Petite Fontaine Circulaire',
    folder: 'Water_Features',
    fileName: 'petite_fontaine_circulaire',
    description: 'Petite fontaine circulaire de quartier ou de patio avec jet central et margelle basse.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'vasque_pierre', label: 'Vasque Pierre Ocre', growthStage: 'Standard', swatch: '#c9a982' },
      { id: 'carrelage_azur', label: 'Margelle Azur', growthStage: 'Standard', swatch: '#2e86ab' },
    ],
    build: (variantId = 'vasque_pierre') => {
      const group = new THREE.Group();
      const rimMat =
        variantId === 'carrelage_azur'
          ? BLVMaterials.ceramic('#2b82a6')
          : BLVMaterials.stone('#cbb08c', 0.8);
      const stoneMat = BLVMaterials.stone('#b8ad9e', 0.85);
      const waterMat = BLVMaterials.water('#3ec4e0');

      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 0.34, 18), stoneMat);
      basin.position.y = 0.17;
      group.add(basin);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 8, 20), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.35;
      group.add(rim);

      const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.79, 0.04, 18), waterMat);
      pool.position.y = 0.33;
      group.add(pool);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.42, 10), stoneMat);
      nozzle.position.y = 0.42;
      group.add(nozzle);

      // Vertical plume + splash ring
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.52, 8), waterMat);
      jet.position.y = 0.85;
      group.add(jet);

      return finalizeAssetGroup(group, `Petite_Fontaine_Circulaire_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'wf_fontaine_moderne',
    name: 'Fontaine Moderne',
    folder: 'Water_Features',
    fileName: 'fontaine_moderne',
    description: 'Fontaine contemporaine à lame d’eau sur stèle de basalte ou béton lissé pour quartiers modernes.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'stele_basalte', label: 'Stèle Basalte & Lame d’Eau', growthStage: 'Standard', swatch: '#4a525a' },
      { id: 'double_mur', label: 'Double Mur Cascade', growthStage: 'Standard', swatch: '#7c828a' },
    ],
    build: (variantId = 'stele_basalte') => {
      const group = new THREE.Group();
      const stoneMat = BLVMaterials.stone(
        variantId === 'double_mur' ? '#7b8087' : '#434a52',
        0.72
      );
      const metalMat = BLVMaterials.metal('#a0aab4', 0.9, 0.25);
      const waterMat = BLVMaterials.water('#3ac2de');

      // Rectangular receiving basin
      const basin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 1.1), stoneMat);
      basin.position.y = 0.14;
      group.add(basin);

      const pool = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.05, 0.94), waterMat);
      pool.position.y = 0.27;
      group.add(pool);

      if (variantId === 'double_mur') {
        const wall1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.16), stoneMat);
        wall1.position.set(-0.22, 0.72, -0.18);
        group.add(wall1);
        const wall2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.88, 0.16), stoneMat);
        wall2.position.set(0.32, 0.54, 0.12);
        group.add(wall2);

        const sheet1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.92, 0.02), waterMat);
        sheet1.position.set(-0.22, 0.72, -0.09);
        group.add(sheet1);
        const sheet2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.02), waterMat);
        sheet2.position.set(0.32, 0.56, 0.21);
        group.add(sheet2);
      } else {
        const monolith = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.24), stoneMat);
        monolith.position.set(0, 0.84, -0.2);
        group.add(monolith);
        const spout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.14), metalMat);
        spout.position.set(0, 1.32, -0.04);
        group.add(spout);
        const cascade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.04, 0.02), waterMat);
        cascade.position.set(0, 0.8, 0.02);
        group.add(cascade);
      }

      return finalizeAssetGroup(group, `Fontaine_Moderne_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'wf_bassin_ornemental',
    name: 'Bassin Ornemental',
    folder: 'Water_Features',
    fileName: 'bassin_ornemental',
    description: 'Bassin ornemental de jardin ou d’esplanade avec margelle sculptée et nénuphars tropicaux.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'bassin_octogonal', label: 'Bassin Octogonal', growthStage: 'Standard', swatch: '#35b4cf' },
      { id: 'bassin_rectangulaire', label: 'Bassin Miroir Rectangulaire', growthStage: 'Standard', swatch: '#2da8c4' },
    ],
    build: (variantId = 'bassin_octogonal') => {
      const group = new THREE.Group();
      const stoneMat = BLVMaterials.stone('#b5aba0', 0.82);
      const waterMat = BLVMaterials.water('#35b4cf');
      const padMat = BLVMaterials.foliage('#3d8c40', true);
      const lotusMat = BLVMaterials.petal('#f279a6', true);

      if (variantId === 'bassin_rectangulaire') {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.4), stoneMat);
        wall.position.y = 0.15;
        group.add(wall);
        const water = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.04, 1.16), waterMat);
        water.position.y = 0.29;
        group.add(water);
      } else {
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.4, 0.32, 8), stoneMat);
        wall.position.y = 0.16;
        group.add(wall);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.04, 8), waterMat);
        water.position.y = 0.31;
        group.add(water);
      }

      // Floating lily pads & lotus blooms
      const pads = [
        [-0.45, -0.2, 0.16],
        [0.42, 0.24, 0.14],
        [-0.22, 0.3, 0.12],
        [0.52, -0.22, 0.15],
      ];
      pads.forEach(([px, pz, pr], idx) => {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.015, 8), padMat);
        pad.position.set(px, 0.33, pz);
        group.add(pad);
        if (idx % 2 === 0) {
          const flower = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 5), lotusMat);
          flower.rotation.x = Math.PI;
          flower.position.set(px, 0.36, pz);
          group.add(flower);
        }
      });

      return finalizeAssetGroup(group, `Bassin_Ornemental_${variantId}`, 'bottom-center');
    },
  },
];
