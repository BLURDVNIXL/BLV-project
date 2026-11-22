/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Construit un PNJ du studio (visage, coiffure, vêtements) et le FUSIONNE en un seul mesh skinné, comme les .glb
 * fusionnés de `public/npcs` : 1 mesh, 1 matériau (couleurs de sommets), 1 squelette de 20 os, animations
 * BLV_Idle / BLV_Walk / BLV_Run / BLV_Combat / BLV_Talk. Un personnage brut du studio fait ~50 meshes et ~14 matériaux : trop de draw calls.
 * Les motifs de tissu sont aplatis en leur couleur principale (comme dans les .glb existants).
 * Nécessite `document.createElement('canvas')` (textures de motifs) : à appeler sur le fil principal.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BODY_SPECS, GARMENTS, SKIN_TONES, type CharacterLoadout } from './blvCatalog';
import { buildChibiBaseBody } from './chibiBodyBuilder';
import { attachLoadoutToCharacter } from './chibiGarmentBuilder';
import { createChibiAnimations, createChibiSkeleton } from './chibiRig';

export interface StudioActorTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/** Attributs conservés pour la fusion (les autres sont supprimés). */
const KEEP = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];

/** Prépare la géométrie d'un mesh : indexée, mêmes attributs partout, couleur de sommet = couleur du matériau. */
function prepared(mesh: THREE.SkinnedMesh): THREE.BufferGeometry | null {
  const g = mesh.geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  g.clearGroups();
  if (!g.getAttribute('skinIndex') || !g.getAttribute('skinWeight')) {
    g.dispose();
    return null;
  }
  const count = g.getAttribute('position').count;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.index) {
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
  const flat = mat.userData?.flatColor as string | undefined;
  const c = flat ? new THREE.Color(flat) : (mat.color ?? new THREE.Color(0xffffff));
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Construit le personnage du studio pour ce profil et le fusionne en un seul mesh. `null` si la fusion échoue. */
export function buildStudioActorTemplate(loadout: CharacterLoadout): StudioActorTemplate | null {
  // Livreur moto : la moto n'est pas un mesh skinné et serait perdue à la fusion ; pas pris en charge ici.
  if (loadout.fullOutfitId && GARMENTS.find((g) => g.id === loadout.fullOutfitId)?.isMotoRider) return null;
  const spec = BODY_SPECS[loadout.bodyId];
  const rig = createChibiSkeleton(spec);
  const skin = SKIN_TONES.find((s) => s.id === loadout.skinToneId) ?? SKIN_TONES[2];
  const body = buildChibiBaseBody(spec, skin.hex, rig);
  attachLoadoutToCharacter(body.group, rig, spec, loadout, body.bareFeetMeshes);
  const animations = createChibiAnimations(rig);

  body.group.updateMatrixWorld(true);
  const skinned: THREE.SkinnedMesh[] = [];
  body.group.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
  });
  if (skinned.length === 0) return null;

  const geos: THREE.BufferGeometry[] = [];
  for (const m of skinned) {
    // Verres de lunettes (matériau transparent) : écartés, des sommets opaques masqueraient les yeux (la monture reste).
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
    if (mat.transparent) continue;
    const g = prepared(m);
    if (g) geos.push(g);
  }
  const merged = geos.length ? mergeGeometries(geos, false) : null;
  for (const g of geos) g.dispose();
  if (!merged) return null;

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02 });
  const mesh = new THREE.SkinnedMesh(merged, material);
  mesh.name = 'BLV_StudioNpc';
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // Libère les meshes d'origine (le squelette `rig` est conservé).
  for (const m of skinned) {
    m.parent?.remove(m);
    m.geometry.dispose();
  }

  const group = new THREE.Group();
  group.name = loadout.bodyId;
  group.add(rig.rootBone);
  group.add(mesh);
  mesh.bind(rig.skeleton, skinned[0].bindMatrix);
  return { scene: group, animations };
}

/** Libère la géométrie et le matériau d'un modèle (aucune instance ne doit encore l'utiliser). */
export function disposeStudioActorTemplate(t: StudioActorTemplate): void {
  t.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    }
  });
}
