import * as THREE from 'three';
import type { AssetDefinition } from '../types';
import { BLVMaterials } from '../materials';
import { finalizeAssetGroup } from '../geometryHelpers';

export const URBAN_FURNITURE_ASSETS: AssetDefinition[] = [
  {
    id: 'uf_banc_bois',
    name: 'Banc Public en Bois',
    folder: 'Urban_Furniture',
    fileName: 'banc_public_bois',
    description: 'Banc public en lames de bois exotique iroko avec piètement en fonte sombre, adapté aux parcs et promenades.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'classique_iroko', label: 'Iroko & Accoudoirs', growthStage: 'Standard', swatch: '#8c532b' },
      { id: 'sans_accoudoirs', label: 'Banquette Sans Accoudoirs', growthStage: 'Standard', swatch: '#a36436' },
      { id: 'teck_clair', label: 'Bois Teck Clair', growthStage: 'Standard', swatch: '#b0743f' },
    ],
    build: (variantId = 'classique_iroko') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.wood(variantId === 'teck_clair' ? 'teak' : 'iroko', 0.65);
      const ironMat = BLVMaterials.metal('#22272e', 0.82, 0.38);

      const width = 1.8;
      // Legs & side brackets
      for (const sx of [-0.72, 0.72]) {
        const legFront = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.43, 0.06), ironMat);
        legFront.position.set(sx, 0.215, 0.2);
        group.add(legFront);
        const legBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.43, 0.06), ironMat);
        legBack.position.set(sx, 0.215, -0.2);
        group.add(legBack);
        const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.46), ironMat);
        crossbar.position.set(sx, 0.41, 0);
        group.add(crossbar);

        if (variantId !== 'sans_accoudoirs') {
          const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.045), ironMat);
          armPost.position.set(sx, 0.52, 0.19);
          group.add(armPost);
          const armTop = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.42), woodMat);
          armTop.position.set(sx, 0.63, 0.01);
          group.add(armTop);
        }
      }

      // 4 Wooden seat slats
      for (let i = 0; i < 4; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.036, 0.095), woodMat);
        slat.position.set(0, 0.45, -0.17 + i * 0.115);
        group.add(slat);
      }

      return finalizeAssetGroup(group, `Banc_Public_Bois_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_banc_metallique',
    name: 'Banc Métallique',
    folder: 'Urban_Furniture',
    fileName: 'banc_metallique',
    description: 'Banc urbain moderne en acier thermolaqué avec assise galbée et piètement tubulaire.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'acier_anthracite', label: 'Acier Anthracite', growthStage: 'Standard', swatch: '#2e353d' },
      { id: 'vert_parc', label: 'Vert Parc Abidjan', growthStage: 'Standard', swatch: '#2c6e49' },
      { id: 'bleu_lagune', label: 'Bleu Lagune', growthStage: 'Standard', swatch: '#2b6cb0' },
    ],
    build: (variantId = 'acier_anthracite') => {
      const group = new THREE.Group();
      const hex =
        variantId === 'vert_parc'
          ? '#2c6e49'
          : variantId === 'bleu_lagune'
            ? '#2b6cb0'
            : '#333b44';
      const paintMetal = BLVMaterials.metal(hex, 0.65, 0.34);
      const darkSteel = BLVMaterials.metal('#1d2228', 0.85, 0.3);

      // Tubular curved frame legs
      for (const sx of [-0.75, 0.75]) {
        const archCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 0, 0.24),
          new THREE.Vector3(sx, 0.44, 0.2),
          new THREE.Vector3(sx, 0.44, -0.2),
          new THREE.Vector3(sx, 0, -0.24),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(archCurve, 12, 0.028, 8, false), darkSteel));
      }

      // Contoured steel bench seat & backrest bars
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.024, 0.065), paintMetal);
        bar.position.set(0, 0.46, 0.2 - i * 0.085);
        group.add(bar);
      }
      for (let j = 0; j < 3; j++) {
        const backBar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.075, 0.024), paintMetal);
        backBar.position.set(0, 0.6 + j * 0.105, -0.24 - j * 0.02);
        backBar.rotation.x = -0.18;
        group.add(backBar);
      }
      // Backrest uprights
      for (const sx of [-0.75, 0.75]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), darkSteel);
        post.position.set(sx, 0.64, -0.24);
        post.rotation.x = -0.18;
        group.add(post);
      }

      return finalizeAssetGroup(group, `Banc_Metallique_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_banc_beton',
    name: 'Banc en Béton',
    folder: 'Urban_Furniture',
    fileName: 'banc_en_beton',
    description: 'Banc architectural massif en béton préfabriqué pour esplanades, places publiques et fronts lagunaires.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'monolithe_droit', label: 'Monolithe Droit', growthStage: 'Standard', swatch: '#9ca0a5' },
      { id: 'banc_courbe', label: 'Banc Courbe de Place', growthStage: 'Standard', swatch: '#a6a8ab' },
      { id: 'beton_bois', label: 'Béton & Assise Bois', growthStage: 'Standard', swatch: '#9c663b' },
    ],
    build: (variantId = 'monolithe_droit') => {
      const group = new THREE.Group();
      const concreteMat = BLVMaterials.stone('#a1a5aa', 0.85);
      const darkBase = BLVMaterials.stone('#6c7178', 0.9);
      const woodMat = BLVMaterials.wood('iroko', 0.65);

      if (variantId === 'banc_courbe') {
        const arcShape = new THREE.Shape();
        const rIn = 1.25;
        const rOut = 1.75;
        const a0 = -Math.PI * 0.28;
        const a1 = Math.PI * 0.28;
        arcShape.absarc(0, 0, rOut, a0, a1, false);
        arcShape.absarc(0, 0, rIn, a1, a0, true);
        arcShape.closePath();

        const seatGeo = new THREE.ExtrudeGeometry(arcShape, {
          depth: 0.14,
          bevelEnabled: true,
          bevelThickness: 0.015,
          bevelSize: 0.015,
          bevelSegments: 2,
        });
        seatGeo.rotateX(-Math.PI / 2);
        const seat = new THREE.Mesh(seatGeo, concreteMat);
        seat.position.y = 0.32;
        group.add(seat);

        for (const a of [-0.2, 0.2]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.26), darkBase);
          leg.position.set(Math.cos(a) * 1.5, 0.16, -Math.sin(a) * 1.5);
          leg.rotation.y = a;
          group.add(leg);
        }
      } else {
        for (const sx of [-0.66, 0.66]) {
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.46), darkBase);
          plinth.position.set(sx, 0.17, 0);
          group.add(plinth);
        }
        const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.52), concreteMat);
        slab.position.y = 0.4;
        group.add(slab);

        if (variantId === 'beton_bois') {
          for (let i = 0; i < 3; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.035, 0.11), woodMat);
            slat.position.set(0, 0.475, -0.14 + i * 0.14);
            group.add(slat);
          }
        }
      }

      return finalizeAssetGroup(group, `Banc_Beton_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_banc_dossier',
    name: 'Banc avec Dossier',
    folder: 'Urban_Furniture',
    fileName: 'banc_avec_dossier',
    description: 'Banc confortable à haut dossier ergonomique en bois verni et acier pour avenues et jardins.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'dossier_simple', label: 'Dossier Simple Avenue', growthStage: 'Standard', swatch: '#8c532b' },
      { id: 'dossier_double_face', label: 'Banc Double Face', growthStage: 'Standard', swatch: '#995c32' },
    ],
    build: (variantId = 'dossier_simple') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.wood('iroko', 0.6);
      const steelMat = BLVMaterials.metal('#262c34', 0.85, 0.32);

      if (variantId === 'dossier_double_face') {
        for (const sx of [-0.72, 0.72]) {
          const base = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.88), steelMat);
          base.position.set(sx, 0.21, 0);
          group.add(base);
          const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.08), steelMat);
          centerPost.position.set(sx, 0.66, 0);
          group.add(centerPost);
        }
        // Dual seats
        for (const side of [-1, 1]) {
          for (let s = 0; s < 3; s++) {
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.035, 0.1), woodMat);
            seat.position.set(0, 0.44, side * (0.14 + s * 0.12));
            group.add(seat);
          }
          for (let b = 0; b < 3; b++) {
            const back = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.09, 0.03), woodMat);
            back.position.set(0, 0.58 + b * 0.115, side * 0.045);
            group.add(back);
          }
        }
      } else {
        for (const sx of [-0.74, 0.74]) {
          const legF = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.43, 0.055), steelMat);
          legF.position.set(sx, 0.215, 0.21);
          group.add(legF);
          const legB = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.9, 0.055), steelMat);
          legB.position.set(sx, 0.44, -0.23);
          legB.rotation.x = -0.14;
          group.add(legB);
          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.46), steelMat);
          tie.position.set(sx, 0.41, 0);
          group.add(tie);
        }
        for (let s = 0; s < 4; s++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.034, 0.095), woodMat);
          slat.position.set(0, 0.45, -0.16 + s * 0.11);
          group.add(slat);
        }
        for (let b = 0; b < 3; b++) {
          const bSlat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.095, 0.034), woodMat);
          bSlat.position.set(0, 0.58 + b * 0.125, -0.24 - b * 0.018);
          bSlat.rotation.x = -0.14;
          group.add(bSlat);
        }
      }

      return finalizeAssetGroup(group, `Banc_Avec_Dossier_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_table_pique_nique',
    name: 'Table de Pique-Nique',
    folder: 'Urban_Furniture',
    fileName: 'table_pique_nique',
    description: 'Table de pique-nique robuste avec bancs intégrés pour parcs urbains (Banco, Cocody) et aires de détente.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'rectangulaire_bois', label: 'Table Rectangulaire', growthStage: 'Standard', swatch: '#995c32' },
      { id: 'circulaire_parc', label: 'Table Circulaire Parc', growthStage: 'Standard', swatch: '#b0743f' },
    ],
    build: (variantId = 'rectangulaire_bois') => {
      const group = new THREE.Group();
      const woodMat = BLVMaterials.wood(variantId === 'circulaire_parc' ? 'teak' : 'iroko', 0.68);
      const steelMat = BLVMaterials.metal('#2a3038', 0.8, 0.35);

      if (variantId === 'circulaire_parc') {
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.72, 8), steelMat);
        pedestal.position.y = 0.36;
        group.add(pedestal);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 16), woodMat);
        top.position.y = 0.74;
        group.add(top);

        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.05), steelMat);
          arm.position.set(Math.cos(a) * 0.52, 0.2, Math.sin(a) * 0.52);
          arm.rotation.y = -a + Math.PI / 2;
          group.add(arm);

          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 6), steelMat);
          post.position.set(Math.cos(a) * 1.02, 0.21, Math.sin(a) * 1.02);
          group.add(post);

          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.045, 0.32), woodMat);
          seat.position.set(Math.cos(a) * 1.02, 0.44, Math.sin(a) * 1.02);
          seat.rotation.y = -a + Math.PI / 2;
          group.add(seat);
        }
      } else {
        for (const sx of [-0.68, 0.68]) {
          // A-frame legs
          for (const side of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.06), steelMat);
            leg.position.set(sx, 0.37, side * 0.24);
            leg.rotation.x = side * 0.45;
            group.add(leg);
          }
          const seatBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.48), steelMat);
          seatBar.position.set(sx, 0.41, 0);
          group.add(seatBar);
        }

        // Tabletop planks
        for (let i = 0; i < 5; i++) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.14), woodMat);
          plank.position.set(0, 0.74, -0.32 + i * 0.16);
          group.add(plank);
        }
        // Attached bench planks
        for (const side of [-1, 1]) {
          for (let j = 0; j < 2; j++) {
            const bPlank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.13), woodMat);
            bPlank.position.set(0, 0.45, side * (0.58 + j * 0.145));
            group.add(bPlank);
          }
        }
      }

      return finalizeAssetGroup(group, `Table_Pique_Nique_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_poubelle',
    name: 'Poubelle Urbaine',
    folder: 'Urban_Furniture',
    fileName: 'poubelle_urbaine',
    description: 'Corbeille urbaine pour rues et espaces publics : modèle à lattes de bois, capot acier ou double flux.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'lattes_bois', label: 'Cylindrique Lattes Bois', growthStage: 'Standard', swatch: '#8c532b' },
      { id: 'moderne_capot', label: 'Moderne Capot Acier', growthStage: 'Standard', swatch: '#35404a' },
      { id: 'tri_double', label: 'Double Flux Tri', growthStage: 'Standard', swatch: '#2e8b57' },
    ],
    build: (variantId = 'lattes_bois') => {
      const group = new THREE.Group();
      const metalMat = BLVMaterials.metal('#282e36', 0.85, 0.34);
      const woodMat = BLVMaterials.wood('iroko', 0.68);
      const accentGreen = BLVMaterials.metal('#2f855a', 0.55, 0.4);
      const accentAmber = BLVMaterials.metal('#d97706', 0.55, 0.4);

      if (variantId === 'tri_double') {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.36), metalMat);
        post.position.y = 0.05;
        group.add(post);
        for (const [bx, mat] of [
          [-0.21, accentGreen],
          [0.21, accentAmber],
        ] as const) {
          const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.72, 10), metalMat);
          bin.position.set(bx, 0.46, 0);
          group.add(bin);
          const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 10), mat);
          hood.position.set(bx, 0.86, 0);
          group.add(hood);
        }
      } else if (variantId === 'moderne_capot') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.72, 14), metalMat);
        body.position.y = 0.38;
        group.add(body);
        // Side opening gap + domed hood
        for (const sa of [0, Math.PI]) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), metalMat);
          pillar.position.set(Math.cos(sa) * 0.19, 0.82, Math.sin(sa) * 0.19);
          group.add(pillar);
        }
        const roof = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), accentGreen);
        roof.position.y = 0.84;
        group.add(roof);
      } else {
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.68, 12), metalMat);
        core.position.y = 0.36;
        group.add(core);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.64, 0.025), woodMat);
          slat.position.set(Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22);
          slat.rotation.y = -a + Math.PI / 2;
          group.add(slat);
        }
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 16), metalMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.71;
        group.add(rim);
      }

      return finalizeAssetGroup(group, `Poubelle_Urbaine_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_pot_fleurs',
    name: 'Pot de Fleurs Décoratif',
    folder: 'Urban_Furniture',
    fileName: 'pot_fleurs_decoratif',
    description: 'Grand pot ou vase urbain décoratif en terre cuite, béton géométrique ou céramique turquoise.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'urne_terre_cuite', label: 'Urne Terre Cuite', growthStage: 'Standard', swatch: '#c4633e' },
      { id: 'geometrique_beton', label: 'Pot Géométrique Béton', growthStage: 'Standard', swatch: '#8f9499' },
      { id: 'ceramique_turquoise', label: 'Pot Émaillé Turquoise', growthStage: 'Standard', swatch: '#288f99' },
    ],
    build: (variantId = 'urne_terre_cuite') => {
      const group = new THREE.Group();
      const soilMat = BLVMaterials.stone('#4c3829', 0.95);

      if (variantId === 'geometrique_beton') {
        const mat = BLVMaterials.stone('#91969c', 0.8);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.26, 0.62, 6), mat);
        body.position.y = 0.31;
        group.add(body);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.4, 0.08, 6), mat);
        rim.position.y = 0.62;
        group.add(rim);
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 6), soilMat);
        soil.position.y = 0.63;
        group.add(soil);
      } else {
        const mat =
          variantId === 'ceramique_turquoise'
            ? BLVMaterials.ceramic('#288f99')
            : BLVMaterials.terracotta('#c4633e', '#ebd8be');
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.22, 0),
          new THREE.Vector2(0.36, 0.28),
          new THREE.Vector2(0.34, 0.56),
          new THREE.Vector2(0.4, 0.64),
          new THREE.Vector2(0.33, 0.64),
        ];
        group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 14), mat));
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 14), soilMat);
        soil.position.y = 0.59;
        group.add(soil);
      }

      return finalizeAssetGroup(group, `Pot_Fleurs_Decoratif_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_jardiniere',
    name: 'Jardinière Rectangulaire',
    folder: 'Urban_Furniture',
    fileName: 'jardiniere_rectangulaire',
    description: 'Jardinière urbaine rectangulaire pour alignements de trottoirs, façades et terrasses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'beton_architectural', label: 'Béton Architectural', growthStage: 'Standard', swatch: '#969a9e' },
      { id: 'bois_cercle_acier', label: 'Bois Exotique & Acier', growthStage: 'Standard', swatch: '#8c532b' },
    ],
    build: (variantId = 'beton_architectural') => {
      const group = new THREE.Group();
      const soilMat = BLVMaterials.stone('#4c3829', 0.95);
      const leafMat = BLVMaterials.foliage('#3d9142', true);

      if (variantId === 'bois_cercle_acier') {
        const woodMat = BLVMaterials.wood('iroko', 0.68);
        const steelMat = BLVMaterials.metal('#262c33', 0.85, 0.35);
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.55), woodMat);
        box.position.y = 0.25;
        group.add(box);
        for (const sx of [-0.74, 0.74]) {
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.58), steelMat);
          frame.position.set(sx, 0.26, 0);
          group.add(frame);
        }
      } else {
        const concrete = BLVMaterials.stone('#999da1', 0.84);
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 0.56), concrete);
        body.position.y = 0.24;
        group.add(body);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.07, 0.64), concrete);
        rim.position.y = 0.49;
        group.add(rim);
      }

      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.04, 0.44), soilMat);
      soil.position.y = 0.51;
      group.add(soil);

      // Subtle low ornamental shrub row inside planter
      for (let i = -1; i <= 1; i++) {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), leafMat);
        bush.scale.set(1.15, 0.8, 0.95);
        bush.position.set(i * 0.42, 0.64, 0);
        group.add(bush);
      }

      return finalizeAssetGroup(group, `Jardiniere_Rectangulaire_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_borne',
    name: 'Borne Décorative',
    folder: 'Urban_Furniture',
    fileName: 'borne_decorative',
    description: 'Borne anti-stationnement et de balisage piéton pour trottoirs, places et abords de jardins.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'dome_fonte', label: 'Borne Dôme Fonte', growthStage: 'Standard', swatch: '#2c333b' },
      { id: 'bande_jaune', label: 'Borne Urbaine Bande Jaune', growthStage: 'Standard', swatch: '#eab308' },
      { id: 'borne_anneaux', label: 'Borne avec Anneaux', growthStage: 'Standard', swatch: '#596169' },
    ],
    build: (variantId = 'dome_fonte') => {
      const group = new THREE.Group();
      const ironMat = BLVMaterials.metal('#282e36', 0.82, 0.35);
      const yellowMat = BLVMaterials.petal('#ebb31a', false);
      const brassMat = BLVMaterials.metal('#c79a43', 0.85, 0.28);

      if (variantId === 'bande_jaune') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.78, 12), ironMat);
        post.position.y = 0.39;
        group.add(post);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.1, 12), yellowMat);
        band.position.y = 0.66;
        group.add(band);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), ironMat);
        cap.position.y = 0.78;
        group.add(cap);
      } else {
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.14, 0),
          new THREE.Vector2(0.11, 0.16),
          new THREE.Vector2(0.09, 0.72),
          new THREE.Vector2(0.11, 0.76),
          new THREE.Vector2(0.07, 0.84),
          new THREE.Vector2(0, 0.88),
        ];
        group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 12), ironMat));

        if (variantId === 'borne_anneaux') {
          for (const side of [-1, 1]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), brassMat);
            ring.position.set(side * 0.105, 0.66, 0);
            ring.rotation.y = Math.PI / 2;
            group.add(ring);
          }
        }
      }

      return finalizeAssetGroup(group, `Borne_Decorative_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_lampadaire',
    name: 'Lampadaire',
    folder: 'Urban_Furniture',
    fileName: 'lampadaire',
    description: 'Lampadaire contemporain d’avenue abidjanaise, simple ou double crosse LED ou panneau solaire.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'simple_crosse', label: 'Simple Crosse LED', growthStage: 'Standard', swatch: '#4a5568' },
      { id: 'double_crosse', label: 'Double Crosse Avenue', growthStage: 'Standard', swatch: '#39424e' },
      { id: 'lampadaire_solaire', label: 'Lampadaire Solaire', growthStage: 'Standard', swatch: '#2b6cb0' },
    ],
    build: (variantId = 'simple_crosse') => {
      const group = new THREE.Group();
      const poleMat = BLVMaterials.metal('#3c444e', 0.82, 0.32);
      const bulbMat = BLVMaterials.emissive('#ffe299', 1.7);
      const solarMat = BLVMaterials.metal('#1e3a5f', 0.75, 0.18);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.55, 8), poleMat);
      base.position.y = 0.275;
      group.add(base);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 4.1, 8), poleMat);
      mast.position.y = 2.35;
      group.add(mast);

      const addArm = (dir: number) => {
        const armCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 4.2, 0),
          new THREE.Vector3(dir * 0.38, 4.55, 0),
          new THREE.Vector3(dir * 0.95, 4.6, 0),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 8, 0.032, 6, false), poleMat));

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.18), poleMat);
        head.position.set(dir * 1.08, 4.6, 0);
        group.add(head);

        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.13), bulbMat);
        diffuser.position.set(dir * 1.08, 4.56, 0);
        group.add(diffuser);
      };

      addArm(1);
      if (variantId === 'double_crosse') {
        addArm(-1);
      }

      if (variantId === 'lampadaire_solaire') {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.48), solarMat);
        panel.position.set(0, 4.52, 0);
        panel.rotation.z = 0.26;
        group.add(panel);
      }

      return finalizeAssetGroup(group, `Lampadaire_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_reverbere',
    name: 'Réverbère',
    folder: 'Urban_Furniture',
    fileName: 'reverbere',
    description: 'Réverbère classique en fonte moulurée avec lanterne hexagonale chaleureuse pour places et quartiers historiques.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'lanterne_simple', label: 'Lanterne Simple', growthStage: 'Standard', swatch: '#22282e' },
      { id: 'lanterne_double', label: 'Réverbère Double Bras', growthStage: 'Standard', swatch: '#2d3748' },
    ],
    build: (variantId = 'lanterne_simple') => {
      const group = new THREE.Group();
      const ironMat = BLVMaterials.metal('#1f242b', 0.85, 0.36);
      const glowMat = BLVMaterials.emissive('#ffd685', 1.6);

      const pedestal = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0.18, 0.2),
        new THREE.Vector2(0.11, 0.72),
        new THREE.Vector2(0.14, 0.8),
        new THREE.Vector2(0.06, 0.85),
      ];
      group.add(new THREE.Mesh(new THREE.LatheGeometry(pedestal, 10), ironMat));

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.7, 8), ironMat);
      shaft.position.y = 2.15;
      group.add(shaft);

      const addLantern = (x: number, y: number) => {
        const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.34, 6), glowMat);
        cage.position.set(x, y + 0.17, 0);
        group.add(cage);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 6), ironMat);
        cap.position.set(x, y + 0.43, 0);
        group.add(cap);
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), ironMat);
        finial.position.set(x, y + 0.54, 0);
        group.add(finial);
      };

      if (variantId === 'lanterne_double') {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.05), ironMat);
        cross.position.y = 3.48;
        group.add(cross);
        addLantern(-0.42, 3.5);
        addLantern(0.42, 3.5);
      } else {
        addLantern(0, 3.5);
      }

      return finalizeAssetGroup(group, `Reverbere_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_petite_barriere',
    name: 'Petite Barrière Décorative',
    folder: 'Urban_Furniture',
    fileName: 'petite_barriere_decorative',
    description: 'Garde-corps piéton urbain pour sécuriser trottoirs, traversées et abords de parcs.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'croix_acier', label: 'Barrière Croix Acier', growthStage: 'Standard', swatch: '#2e3640' },
      { id: 'arches_classique', label: 'Barrière à Arches', growthStage: 'Standard', swatch: '#2c5e43' },
      { id: 'bois_metal', label: 'Barrière Bois & Métal', growthStage: 'Standard', swatch: '#8c532b' },
    ],
    build: (variantId = 'croix_acier') => {
      const group = new THREE.Group();
      const steelMat = BLVMaterials.metal(
        variantId === 'arches_classique' ? '#2a5940' : '#2d343d',
        0.82,
        0.34
      );
      const woodMat = BLVMaterials.wood('iroko', 0.65);

      for (const sx of [-0.75, 0.75]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.95, 8), steelMat);
        post.position.set(sx, 0.475, 0);
        group.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), steelMat);
        cap.position.set(sx, 0.97, 0);
        group.add(cap);
      }

      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.045, 0.045),
        variantId === 'bois_metal' ? woodMat : steelMat
      );
      topRail.position.y = 0.88;
      group.add(topRail);

      const botRail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.035, 0.035), steelMat);
      botRail.position.y = 0.25;
      group.add(botRail);

      if (variantId === 'arches_classique') {
        for (let i = -2; i <= 2; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 6, 12), steelMat);
          ring.position.set(i * 0.27, 0.56, 0);
          group.add(ring);
        }
      } else if (variantId === 'bois_metal') {
        const mid = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.14, 0.03), woodMat);
        mid.position.y = 0.56;
        group.add(mid);
      } else {
        for (const angle of [0.52, -0.52]) {
          const diag = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.028, 0.028), steelMat);
          diag.position.y = 0.56;
          diag.rotation.z = angle;
          group.add(diag);
        }
      }

      return finalizeAssetGroup(group, `Petite_Barriere_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_pergola',
    name: 'Pergola',
    folder: 'Urban_Furniture',
    fileName: 'pergola',
    description: 'Pergola d’ombrage en bois exotique et acier pour places publiques, promenades et terrasses.',
    pivotType: 'bottom-center',
    variants: [
      { id: 'pergola_bois', label: 'Pergola Bois Traditionnelle', growthStage: 'Standard', swatch: '#8c532b' },
      { id: 'pergola_moderne', label: 'Pergola Acier & Lames', growthStage: 'Standard', swatch: '#353e47' },
    ],
    build: (variantId = 'pergola_bois') => {
      const group = new THREE.Group();
      const isModern = variantId === 'pergola_moderne';
      const postMat = isModern ? BLVMaterials.metal('#2e3640', 0.85, 0.34) : BLVMaterials.wood('iroko', 0.7);
      const beamMat = BLVMaterials.wood(isModern ? 'teak' : 'iroko', 0.65);

      const corners = [
        [-1.4, -1.0],
        [1.4, -1.0],
        [-1.4, 1.0],
        [1.4, 1.0],
      ];
      corners.forEach(([cx, cz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.55, 0.14), postMat);
        post.position.set(cx, 1.275, cz);
        group.add(post);
      });

      // Main longitudinal beams
      for (const cz of [-1.0, 1.0]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.16, 0.12), postMat);
        beam.position.set(0, 2.55, cz);
        group.add(beam);
      }

      // Cross shade louvers
      for (let i = 0; i < 8; i++) {
        const lx = -1.4 + i * 0.4;
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 2.45), beamMat);
        slat.position.set(lx, 2.68, 0);
        if (isModern) slat.rotation.z = 0.25;
        group.add(slat);
      }

      return finalizeAssetGroup(group, `Pergola_${variantId}`, 'bottom-center');
    },
  },
  {
    id: 'uf_abribus',
    name: 'Abribus Décoratif',
    folder: 'Urban_Furniture',
    fileName: 'abribus_decoratif',
    description: 'Abribus urbain stylisé avec auvent protecteur, paroi vitrée/ajourée et banc intégré (sans texte ni logo).',
    pivotType: 'bottom-center',
    variants: [
      { id: 'auvent_courbe', label: 'Abribus Auvent Courbe', growthStage: 'Standard', swatch: '#2b6cb0' },
      { id: 'bois_verre', label: 'Abribus Bois & Verre', growthStage: 'Standard', swatch: '#8c532b' },
    ],
    build: (variantId = 'auvent_courbe') => {
      const group = new THREE.Group();
      const frameMat = BLVMaterials.metal('#2a323b', 0.85, 0.32);
      const accentMat = BLVMaterials.metal(
        variantId === 'bois_verre' ? '#8c532b' : '#2563eb',
        variantId === 'bois_verre' ? 0.1 : 0.65,
        0.45
      );
      const glassMat = BLVMaterials.glass('#c7e6f0', 0.42);
      const woodMat = BLVMaterials.wood('iroko', 0.65);

      // Rear columns
      for (const sx of [-1.35, 0, 1.35]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.35, 0.09), frameMat);
        col.position.set(sx, 1.175, -0.55);
        group.add(col);
      }

      // Back glazed panels (no text/ads)
      for (const px of [-0.675, 0.675]) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.85, 0.03), glassMat);
        pane.position.set(px, 1.12, -0.55);
        group.add(pane);
      }

      // Side windscreen on left
      const sidePane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.85, 1.05), glassMat);
      sidePane.position.set(-1.35, 1.12, 0.02);
      group.add(sidePane);

      // Cantilevered roof canopy
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 1.55), frameMat);
      roof.position.set(0, 2.38, 0.05);
      roof.rotation.x = variantId === 'auvent_courbe' ? -0.07 : 0;
      group.add(roof);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.06, 1.58), accentMat);
      trim.position.set(0, 2.43, 0.05);
      trim.rotation.x = variantId === 'auvent_courbe' ? -0.07 : 0;
      group.add(trim);

      // Integrated bench inside shelter
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.42), woodMat);
      benchSeat.position.set(0.15, 0.45, -0.26);
      group.add(benchSeat);
      for (const bx of [-0.65, 0.95]) {
        const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.36), frameMat);
        bLeg.position.set(bx, 0.22, -0.26);
        group.add(bLeg);
      }

      return finalizeAssetGroup(group, `Abribus_Decoratif_${variantId}`, 'bottom-center');
    },
  },
];
