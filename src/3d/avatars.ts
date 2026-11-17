import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PlayerGender, SapeOutfitId } from '../types/game';
import { SAPE_OUTFITS } from '../core/destinies';

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
      // Matériaux propres à chaque copie (la teinte des tenues ne doit pas déteindre sur les autres joueurs).
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
    }
  });
  return { root, animations: gltf.animations };
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

export type AvatarAnim = 'Idle' | 'Walk' | 'Run' | 'Jump';

/** Vitesse (m/s) à partir de laquelle le personnage est considéré en mouvement / en course. */
export const AVATAR_MOVE_SPEED = 0.35;
export const AVATAR_RUN_SPEED = 7.5;
/** Vitesse de marche pour laquelle le clip `Walk` est joué à sa cadence normale. */
const WALK_REF_SPEED = 3.5;
const RUN_REF_SPEED = 9;
const FADE_SECONDS = 0.18;

/** Choisit l'animation selon l'état physique du joueur (pur, testable). */
export function pickAvatarAnim(speed: number, grounded: boolean, knocked: boolean): AvatarAnim {
  if (knocked) return 'Idle';
  if (!grounded) return 'Jump';
  if (speed < AVATAR_MOVE_SPEED) return 'Idle';
  return speed >= AVATAR_RUN_SPEED ? 'Run' : 'Walk';
}

/** Cadence de lecture d'un clip de marche/course selon la vitesse réelle (évite le « moonwalk »). */
export function avatarTimeScale(anim: AvatarAnim, speed: number): number {
  if (anim === 'Walk') return Math.min(1.6, Math.max(0.6, speed / WALK_REF_SPEED));
  if (anim === 'Run') return Math.min(1.5, Math.max(0.8, speed / RUN_REF_SPEED));
  return 1;
}

/** Teinte à appliquer aux matériaux `haut` / `bas` pour une tenue (null = couleurs d'origine du modèle). */
export function avatarOutfitTint(outfitId: SapeOutfitId): { shirt: number; pants: number } | null {
  if (outfitId === 'standard') return null;
  const def = SAPE_OUTFITS.find((o) => o.id === outfitId);
  return def ? { shirt: def.shirtHex, pants: def.pantsHex } : null;
}

/** Pilote les animations et les tenues d'un avatar chargé. */
export class AvatarController {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<AvatarAnim, THREE.AnimationAction>();
  private current: AvatarAnim | null = null;
  private shirtMats: THREE.MeshStandardMaterial[] = [];
  private pantsMats: THREE.MeshStandardMaterial[] = [];
  private original = new Map<THREE.MeshStandardMaterial, { map: THREE.Texture | null; color: number }>();

  constructor(
    root: THREE.Object3D,
    clips: THREE.AnimationClip[]
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const name of ['Idle', 'Walk', 'Run', 'Jump'] as const) {
      const clip = THREE.AnimationClip.findByName(clips, name);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (name === 'Jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || !(o as THREE.Mesh).isMesh) return;
      if (m.name === 'haut') this.shirtMats.push(m);
      if (m.name === 'bas') this.pantsMats.push(m);
      this.original.set(m, { map: m.map, color: m.color.getHex() });
    });
    this.play('Idle');
  }

  private play(next: AvatarAnim) {
    if (next === this.current) return;
    const to = this.actions.get(next);
    if (!to) return;
    const from = this.current ? this.actions.get(this.current) : undefined;
    to.reset().fadeIn(FADE_SECONDS).play();
    from?.fadeOut(FADE_SECONDS);
    this.current = next;
  }

  /** À appeler à chaque image avec l'état du joueur. */
  update(dt: number, speed: number, grounded: boolean, knocked: boolean) {
    const anim = pickAvatarAnim(speed, grounded, knocked);
    this.play(anim);
    const action = this.actions.get(anim);
    if (action) action.timeScale = avatarTimeScale(anim, speed);
    this.mixer.update(dt);
  }

  /** Tenue de sape : couleur unie sur `haut` et `bas` ; « standard » rend le modèle d'origine. */
  applyOutfit(outfitId: SapeOutfitId) {
    const tint = avatarOutfitTint(outfitId);
    const paint = (mats: THREE.MeshStandardMaterial[], hex: number | null) => {
      for (const m of mats) {
        const o = this.original.get(m);
        if (hex === null && o) {
          m.map = o.map;
          m.color.setHex(o.color);
        } else if (hex !== null) {
          m.map = null;
          m.color.setHex(hex);
        }
        m.needsUpdate = true;
      }
    };
    paint(this.shirtMats, tint ? tint.shirt : null);
    paint(this.pantsMats, tint ? tint.pants : null);
  }
}
