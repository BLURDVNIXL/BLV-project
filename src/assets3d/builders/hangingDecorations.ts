import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import {
  createCatenaryPoints,
  createStylizedCanopyBlob,
  finalizeAssetGroup,
} from '../geometryHelpers';

export const HANGING_DECORATION_ASSETS: AssetDefinition[] = [
  {
    id: 'hd_chaine_decorative',
    name: 'Chaîne Décorative',
    folder: 'Hanging_Decorations',
    fileName: 'chaine_decorative',
    description: 'Chaîne décorative suspendue en feston entre deux anneaux d’ancrage pour façades, pergolas et allées.',
    pivotType: 'top-center',
    variants: [
      { id: 'bronze_patine', label: 'Chaîne Bronze Patiné', growthStage: 'Standard', swatch: '#9c7840' },
      { id: 'acier_noir', label: 'Chaîne Fer Forgé Noir', growthStage: 'Standard', swatch: '#22272e' },
    ],
    build: (variantId = 'bronze_patine') => {
      const group = new THREE.Group();
      const mat =
        variantId === 'acier_noir'
          ? BLVMaterials.metal('#22272e', 0.85, 0.36)
          : BLVMaterials.metal('#9c7840', 0.88, 0.28);

      const pts = createCatenaryPoints(
        new THREE.Vector3(-0.9, 0, 0),
        new THREE.Vector3(0.9, 0, 0),
        0.35,
        16
      );
      const curve = new THREE.CatmullRomCurve3(pts);

      // Anchor rings
      for (const sx of [-0.9, 0.9]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), mat);
        ring.position.set(sx, 0, 0);
        group.add(ring);
      }

      // Interlocking chain links along catenary
      const linkCount = 22;
      for (let i = 0; i < linkCount; i++) {
        const t = (i + 0.5) / linkCount;
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);

        const link = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.01, 5, 10), mat);
        link.scale.set(1.35, 0.85, 1);
        link.position.copy(pos);
        link.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
        if (i % 2 === 1) {
          link.rotateX(Math.PI / 2);
        }
        group.add(link);
      }

      return finalizeAssetGroup(group, `Chaine_Decorative_${variantId}`, 'top-center');
    },
  },
  {
    id: 'hd_chaine_delimitation',
    name: 'Chaîne Métallique de Délimitation',
    folder: 'Hanging_Decorations',
    fileName: 'chaine_metallique_delimitation',
    description: 'Potelets urbains reliés par une chaîne métallique de délimitation pour files d’attente, parvis et terrasses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'potelets_acier', label: 'Potelets Acier & Chaîne', growthStage: 'Standard', swatch: '#353e47' },
      { id: 'potelets_laiton', label: 'Potelets Laiton & Noir', growthStage: 'Standard', swatch: '#c99d42' },
    ],
    build: (variantId = 'potelets_acier') => {
      const group = new THREE.Group();
      const postMat = BLVMaterials.metal('#2a3038', 0.85, 0.3);
      const chainMat =
        variantId === 'potelets_laiton'
          ? BLVMaterials.metal('#cca043', 0.9, 0.24)
          : BLVMaterials.metal('#8f98a3', 0.88, 0.28);

      for (const sx of [-0.9, 0.9]) {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), postMat);
        base.position.set(sx, 0.025, 0);
        group.add(base);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.88, 10), postMat);
        pole.position.set(sx, 0.46, 0);
        group.add(pole);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), chainMat);
        finial.position.set(sx, 0.93, 0);
        group.add(finial);
      }

      const pts = createCatenaryPoints(
        new THREE.Vector3(-0.88, 0.82, 0),
        new THREE.Vector3(0.88, 0.82, 0),
        0.24,
        16
      );
      const curve = new THREE.CatmullRomCurve3(pts);
      for (let i = 0; i < 20; i++) {
        const t = (i + 0.5) / 20;
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 5, 10), chainMat);
        link.scale.set(1.3, 0.8, 1);
        link.position.copy(pos);
        link.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
        if (i % 2 === 1) link.rotateX(Math.PI / 2);
        group.add(link);
      }

      return finalizeAssetGroup(group, `Chaine_Delimitation_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'hd_guirlande_lumineuse',
    name: 'Guirlande Lumineuse',
    folder: 'Hanging_Decorations',
    fileName: 'guirlande_lumineuse',
    description: 'Guirlande guinguette chaleureuse avec ampoules suspendues sur câble caténaire pour maquis, rues et jardins.',
    pivotType: 'top-center',
    variants: [
      { id: 'ampoules_chaudes', label: 'Guirlande Ambre Chaude', growthStage: 'Standard', swatch: '#ffcf66' },
      { id: 'double_arc', label: 'Guirlande Double Arc', growthStage: 'Standard', swatch: '#ffe49e' },
    ],
    build: (variantId = 'ampoules_chaudes') => {
      const group = new THREE.Group();
      const wireMat = BLVMaterials.metal('#1d2226', 0.3, 0.7);
      const socketMat = BLVMaterials.metal('#282e34', 0.6, 0.4);
      const bulbMat = BLVMaterials.emissive('#ffd269', 1.9);

      const addStrand = (sag: number, zOff: number, bulbs: number) => {
        const pts = createCatenaryPoints(
          new THREE.Vector3(-1.4, 0, zOff),
          new THREE.Vector3(1.4, 0, zOff),
          sag,
          20
        );
        const curve = new THREE.CatmullRomCurve3(pts);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.01, 5, false), wireMat));

        for (let i = 1; i <= bulbs; i++) {
          const pt = curve.getPointAt(i / (bulbs + 1));
          const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 4), wireMat);
          drop.position.set(pt.x, pt.y - 0.025, pt.z);
          group.add(drop);

          const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.035, 6), socketMat);
          socket.position.set(pt.x, pt.y - 0.06, pt.z);
          group.add(socket);

          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), bulbMat);
          bulb.scale.set(1, 1.25, 1);
          bulb.position.set(pt.x, pt.y - 0.11, pt.z);
          group.add(bulb);
        }
      };

      addStrand(0.38, 0, 9);
      if (variantId === 'double_arc') {
        addStrand(0.58, 0.14, 11);
      }

      return finalizeAssetGroup(group, `Guirlande_Lumineuse_${variantId}`, 'top-center');
    },
  },
  {
    id: 'hd_guirlande_decorative',
    name: 'Guirlande Décorative',
    folder: 'Hanging_Decorations',
    fileName: 'guirlande_decorative',
    description: 'Guirlande festive de fanions triangulaires colorés pour animer ruelles, marchés et fêtes de quartier.',
    pivotType: 'top-center',
    variants: [
      { id: 'couleurs_vives', label: 'Fanions Couleurs Vives', growthStage: 'Standard', swatch: '#f59e0b' },
      { id: 'pastel_tropical', label: 'Fanions Pastel Tropical', growthStage: 'Standard', swatch: '#38bdf8' },
    ],
    build: (variantId = 'couleurs_vives') => {
      const group = new THREE.Group();
      const ropeMat = BLVMaterials.stone('#d4c3a3', 0.9);
      const colors =
        variantId === 'pastel_tropical'
          ? ['#38bdf8', '#fb7185', '#fde047', '#34d399']
          : ['#f59e0b', '#ef4444', '#10b981', '#2563eb'];
      const mats = colors.map((c) => BLVMaterials.fabric(c));

      const pts = createCatenaryPoints(
        new THREE.Vector3(-1.35, 0, 0),
        new THREE.Vector3(1.35, 0, 0),
        0.34,
        18
      );
      const curve = new THREE.CatmullRomCurve3(pts);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.008, 4, false), ropeMat));

      const count = 11;
      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        const pos = curve.getPointAt(t);
        const flagShape = new THREE.Shape();
        flagShape.moveTo(-0.075, 0);
        flagShape.lineTo(0.075, 0);
        flagShape.lineTo(0, -0.18);
        flagShape.closePath();

        const flagGeo = new THREE.ShapeGeometry(flagShape);
        const flag = new THREE.Mesh(flagGeo, mats[i % mats.length]);
        flag.position.copy(pos);
        group.add(flag);
      }

      return finalizeAssetGroup(group, `Guirlande_Decorative_${variantId}`, 'top-center');
    },
  },
  {
    id: 'hd_suspension_vegetale',
    name: 'Suspension Végétale',
    folder: 'Hanging_Decorations',
    fileName: 'suspension_vegetale',
    description: 'Pot suspendu en osier ou terre cuite garni de fougères tombantes et de fleurs tropicales.',
    pivotType: 'top-center',
    variants: [
      { id: 'osier_fougere', label: 'Panier Osier Fougère', growthStage: 'Adulte', swatch: '#459e48' },
      { id: 'terre_cuite_fleurie', label: 'Suspension Fleurie', growthStage: 'En fleurs', swatch: '#ec4899' },
    ],
    build: (variantId = 'osier_fougere') => {
      const group = new THREE.Group();
      const chainMat = BLVMaterials.metal('#2a3038', 0.85, 0.35);
      const potMat =
        variantId === 'terre_cuite_fleurie'
          ? BLVMaterials.terracotta('#c4633e')
          : BLVMaterials.wood('bamboo', 0.82);
      const leafMat = BLVMaterials.foliage('#3d9442', true);
      const bloomMat = BLVMaterials.petal('#ec4899', true);

      // Hanging hook & 3 suspension chains
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 10), chainMat);
      hook.position.y = -0.03;
      group.add(hook);

      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const p1 = new THREE.Vector3(0, -0.05, 0);
        const p2 = new THREE.Vector3(Math.cos(a) * 0.19, -0.45, Math.sin(a) * 0.19);
        const cord = new THREE.CatmullRomCurve3([p1, p2]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 4, 0.005, 4, false), chainMat));
      }

      // Basket / Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.12, 0.18, 12), potMat);
      bowl.position.y = -0.54;
      group.add(bowl);

      // Overflowing foliage mound + trailing vines
      const topBush = new THREE.Mesh(createStylizedCanopyBlob(0.23, 1, 880, 1.15, 0.72, 1.15), leafMat);
      topBush.position.y = -0.42;
      group.add(topBush);

      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI * 2;
        const trail = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.35 + (t % 2) * 0.12, 5),
          leafMat
        );
        trail.rotation.x = Math.PI;
        trail.position.set(Math.cos(a) * 0.21, -0.56, Math.sin(a) * 0.21);
        trail.rotation.z = -Math.cos(a) * 0.2;
        group.add(trail);

        if (variantId === 'terre_cuite_fleurie') {
          const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), bloomMat);
          flower.position.set(Math.cos(a) * 0.22, -0.43, Math.sin(a) * 0.22);
          group.add(flower);
        }
      }

      return finalizeAssetGroup(group, `Suspension_Vegetale_${variantId}`, 'top-center');
    },
  },
  {
    id: 'hd_petite_lanterne',
    name: 'Petite Lanterne',
    folder: 'Hanging_Decorations',
    fileName: 'petite_lanterne',
    description: 'Petite lanterne suspendue en métal ajouré ou bambou tressé avec lueur ambrée chaleureuse.',
    pivotType: 'top-center',
    variants: [
      { id: 'metal_ajoure', label: 'Lanterne Métal Sombre', growthStage: 'Standard', swatch: '#2a3038' },
      { id: 'bambou_tresse', label: 'Lanterne Bambou Tressé', growthStage: 'Standard', swatch: '#c6a265' },
    ],
    build: (variantId = 'metal_ajoure') => {
      const group = new THREE.Group();
      const glowMat = BLVMaterials.emissive('#ffca63', 1.8);
      const ringMat = BLVMaterials.metal('#22272e', 0.85, 0.35);

      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 5), ringMat);
      cord.position.y = -0.12;
      group.add(cord);

      if (variantId === 'bambou_tresse') {
        const bambooMat = BLVMaterials.wood('bamboo', 0.72);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.05, 10), bambooMat);
        cap.position.y = -0.25;
        group.add(cap);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), glowMat);
        core.position.y = -0.38;
        group.add(core);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.28, 0.016), bambooMat);
          rib.position.set(Math.cos(a) * 0.14, -0.38, Math.sin(a) * 0.14);
          group.add(rib);
        }
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.05, 10), bambooMat);
        bot.position.y = -0.51;
        group.add(bot);
      } else {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.11, 6), ringMat);
        cap.position.y = -0.28;
        group.add(cap);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 6), glowMat);
        glass.position.y = -0.44;
        group.add(glass);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const strut = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.016), ringMat);
          strut.position.set(Math.cos(a) * 0.11, -0.44, Math.sin(a) * 0.11);
          group.add(strut);
        }
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.05, 6), ringMat);
        base.position.y = -0.56;
        group.add(base);
      }

      return finalizeAssetGroup(group, `Petite_Lanterne_${variantId}`, 'top-center');
    },
  },
  {
    id: 'hd_decoration_murale',
    name: 'Décoration Murale Extérieure',
    folder: 'Hanging_Decorations',
    fileName: 'decoration_murale_exterieure',
    description: 'Ornement architectural de façade : rosace en fer forgé, panneau géométrique terre cuite ou treillis fleuri.',
    pivotType: 'back-center',
    variants: [
      { id: 'rosace_fer_forge', label: 'Rosace Fer Forgé', growthStage: 'Standard', swatch: '#282e36' },
      { id: 'panneau_terre_cuite', label: 'Relief Terre Cuite', growthStage: 'Standard', swatch: '#c4633e' },
      { id: 'treillis_fleuri', label: 'Treillis Mural Fleuri', growthStage: 'En fleurs', swatch: '#439647' },
    ],
    build: (variantId = 'rosace_fer_forge') => {
      const group = new THREE.Group();

      if (variantId === 'panneau_terre_cuite') {
        const terraMat = BLVMaterials.terracotta('#c4633e');
        const creamMat = BLVMaterials.stone('#e8d9c0', 0.8);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.06), creamMat);
        frame.position.z = 0.03;
        group.add(frame);
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.08), terraMat);
        plate.position.z = 0.05;
        group.add(plate);
        const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), creamMat);
        diamond.scale.set(1, 1, 0.32);
        diamond.position.z = 0.09;
        group.add(diamond);
      } else if (variantId === 'treillis_fleuri') {
        const woodMat = BLVMaterials.wood('iroko', 0.72);
        const leafMat = BLVMaterials.foliage('#3d9142', true);
        const flowerMat = BLVMaterials.petal('#e8437f', true);
        for (const sx of [-0.35, 0, 0.35]) {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.03), woodMat);
          v.position.set(sx, 0, 0.015);
          group.add(v);
        }
        for (const sy of [-0.42, 0, 0.42]) {
          const h = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.03), woodMat);
          h.position.set(0, sy, 0.035);
          group.add(h);
        }
        for (const [fx, fy] of [
          [-0.2, 0.25],
          [0.18, 0.08],
          [-0.12, -0.22],
          [0.24, -0.3],
        ]) {
          const tuft = new THREE.Mesh(createStylizedCanopyBlob(0.16, 0, 44, 1.2, 0.9, 0.5), leafMat);
          tuft.position.set(fx, fy, 0.08);
          group.add(tuft);
          const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05, 0), flowerMat);
          fl.position.set(fx + 0.05, fy + 0.04, 0.13);
          group.add(fl);
        }
      } else {
        const ironMat = BLVMaterials.metal('#262c34', 0.85, 0.32);
        const outer = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.028, 8, 24), ironMat);
        outer.position.z = 0.03;
        group.add(outer);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 6, 18), ironMat);
        inner.position.z = 0.03;
        group.add(inner);
        for (let i = 0; i < 8; i++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.02), ironMat);
          spoke.rotation.z = (i / 8) * Math.PI;
          spoke.position.z = 0.03;
          group.add(spoke);
        }
      }

      return finalizeAssetGroup(group, `Decoration_Murale_${variantId}`, 'back-center');
    },
  },
];
