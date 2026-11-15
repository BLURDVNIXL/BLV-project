import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PlayerGender } from '../types/game';

/**
 * BLV — Avatars 3D selon le genre (GLB : squelette Mixamo, 6 matériaux nommés,
 * animations Idle / Walk / Run / Jump / Wave). Chargement paresseux : seul le
 * modèle utile est téléchargé, puis gardé en cache.
 */

const AVATAR_FILES: Record<PlayerGender, string> = {
  homme: 'models/avatar_homme.glb',
  femme: 'models/avatar_femme.glb',
};

/** Chemin du modèle pour un genre (testable sans navigateur). */
export function avatarPath(gender: PlayerGender): string {
  return AVATAR_FILES[gender];
}

export interface AvatarInstance {
  /** Copie indépendante du modèle (origine = centre des pieds, regard vers +Z, 1,50 m). */
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

const cache = new Map<PlayerGender, Promise<GLTF>>();

function baseUrl(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  return base ?? '/';
}

function fetchGltf(gender: PlayerGender): Promise<GLTF> {
  let p = cache.get(gender);
  if (!p) {
    p = new GLTFLoader().loadAsync(baseUrl() + avatarPath(gender));
    // Un échec ne reste pas en cache : une nouvelle tentative reste possible.
    p.catch(() => cache.delete(gender));
    cache.set(gender, p);
  }
  return p;
}

/** Charge (une seule fois) le modèle du genre demandé et renvoie une copie utilisable. */
export async function loadAvatar(gender: PlayerGender): Promise<AvatarInstance> {
  const gltf = await fetchGltf(gender);
  const root = cloneSkinned(gltf.scene);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      // Les maillages skinnés ont une boîte englobante figée en pose de repos :
      // on évite qu'ils disparaissent quand l'animation les déplace.
      mesh.frustumCulled = false;
    }
  });
  return { root, animations: gltf.animations };
}
