import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { PlayerGender, SapeOutfitId } from '../types/game';
import { SAPE_OUTFITS } from '../core/destinies';
import type { TimedBodyActionKind } from '../core/timedActions';

/**
 * BLV — Avatars 3D selon le genre (GLB : squelette Mixamo, 6 matériaux nommés,
 * animations Idle / Walk / Run / Jump / Wave + poses d'actions chronométrées).
 * Chargement paresseux : seul le modèle utile est téléchargé, puis gardé en cache.
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

/** Angles/décalages de pose pour les actions chronométrées (repère Mixamo +Z devant, +X gauche). */
export interface ActionPose {
  rootPitchX: number;
  rootOffsetY: number;
  hipOffsetY: number;
  spineX: number;
  spineY: number;
  headX: number;
  headY: number;
  leftArmX: number;
  leftArmZ: number;
  leftForearmX: number;
  rightArmX: number;
  rightArmZ: number;
  rightForearmX: number;
  leftUpLegX: number;
  leftLegX: number;
  rightUpLegX: number;
  rightLegX: number;
}

const ZERO_POSE: ActionPose = {
  rootPitchX: 0,
  rootOffsetY: 0,
  hipOffsetY: 0,
  spineX: 0,
  spineY: 0,
  headX: 0,
  headY: 0,
  leftArmX: 0,
  leftArmZ: 0,
  leftForearmX: 0,
  rightArmX: 0,
  rightArmZ: 0,
  rightForearmX: 0,
  leftUpLegX: 0,
  leftLegX: 0,
  rightUpLegX: 0,
  rightLegX: 0,
};

/** Calcule la pose animée du personnage pour une action chronométrée (pur, testable). */
export function computeActionPose(kind: TimedBodyActionKind, elapsedSec: number): ActionPose {
  const t = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  switch (kind) {
    case 'eat': {
      const bite = Math.max(0, Math.sin(t * 3.4));
      return {
        ...ZERO_POSE,
        spineX: 0.08,
        headX: 0.14 + Math.sin(t * 9.5) * 0.05,
        leftArmX: -0.25,
        leftArmZ: -0.1,
        leftForearmX: -0.45,
        rightArmX: -0.78 - bite * 0.18,
        rightArmZ: 0.28,
        rightForearmX: -1.25 - bite * 0.45,
      };
    }
    case 'toilet': {
      return {
        ...ZERO_POSE,
        hipOffsetY: -0.18,
        spineX: 0.28,
        headX: 0.18,
        leftArmX: -0.42,
        leftArmZ: -0.14,
        leftForearmX: -0.58,
        rightArmX: -0.42,
        rightArmZ: 0.14,
        rightForearmX: -0.58,
        leftUpLegX: -1.12,
        leftLegX: 1.32,
        rightUpLegX: -1.12,
        rightLegX: 1.32,
      };
    }
    case 'loto': {
      const scratch = Math.sin(t * 14);
      return {
        ...ZERO_POSE,
        spineX: 0.12,
        headX: 0.34,
        leftArmX: -0.72,
        leftArmZ: -0.24,
        leftForearmX: -0.88,
        rightArmX: -0.78,
        rightArmZ: 0.26 + scratch * 0.11,
        rightForearmX: -0.96 + Math.cos(t * 14) * 0.2,
      };
    }
    case 'yannis_academy': {
      const cheer = Math.sin(t * 5.2);
      return {
        ...ZERO_POSE,
        headX: -0.06 + cheer * 0.08,
        leftArmX: -0.55,
        leftArmZ: -0.22,
        leftForearmX: -0.85,
        rightArmX: -1.42 - cheer * 0.2,
        rightArmZ: -0.32 + cheer * 0.18,
        rightForearmX: -0.42,
      };
    }
    case 'shower': {
      const scrub = Math.sin(t * 8.2);
      return {
        ...ZERO_POSE,
        spineY: Math.sin(t * 3.8) * 0.1,
        headX: -0.14 + Math.sin(t * 4.5) * 0.06,
        leftArmX: -1.25 + scrub * 0.24,
        leftArmZ: 0.2,
        leftForearmX: -1.52,
        rightArmX: -1.25 - scrub * 0.24,
        rightArmZ: -0.2,
        rightForearmX: -1.52,
      };
    }
    case 'repair_engine': {
      const wrenchL = Math.sin(t * 8.5);
      const wrenchR = Math.sin(t * 10.5);
      return {
        ...ZERO_POSE,
        hipOffsetY: -0.07,
        spineX: 0.56,
        headX: 0.2,
        leftArmX: -0.92 + wrenchL * 0.16,
        leftArmZ: -0.1,
        leftForearmX: -0.72 + Math.cos(t * 8.5) * 0.24,
        rightArmX: -1.04 - wrenchR * 0.22,
        rightArmZ: 0.1,
        rightForearmX: -0.84 - Math.cos(t * 10.5) * 0.26,
        leftUpLegX: -0.26,
        leftLegX: 0.34,
        rightUpLegX: -0.14,
        rightLegX: 0.2,
      };
    }
    case 'black_market': {
      return {
        ...ZERO_POSE,
        hipOffsetY: -0.14,
        spineX: 0.38,
        headX: 0.1,
        headY: Math.sin(t * 2.6) * 0.52,
        leftArmX: -0.64,
        leftArmZ: -0.22,
        leftForearmX: -0.94,
        rightArmX: -0.68 + Math.sin(t * 5.4) * 0.1,
        rightArmZ: 0.22,
        rightForearmX: -0.96,
        leftUpLegX: -0.62,
        leftLegX: 0.84,
        rightUpLegX: -0.62,
        rightLegX: 0.84,
      };
    }
    case 'vieux_sage': {
      const breath = Math.sin(t * 1.8);
      return {
        ...ZERO_POSE,
        spineX: 0.22 + breath * 0.04,
        headX: 0.26 + breath * 0.04,
        leftArmX: -0.56,
        leftArmZ: -0.34,
        leftForearmX: -1.14,
        rightArmX: -0.56,
        rightArmZ: 0.34,
        rightForearmX: -1.14,
      };
    }
    case 'sleep': {
      return {
        ...ZERO_POSE,
        rootPitchX: -Math.PI / 2,
        rootOffsetY: 0.2 + Math.sin(t * 1.8) * 0.008,
        headX: 0.14,
        headY: Math.sin(t * 0.7) * 0.05,
        leftArmX: -0.12,
        leftArmZ: 0.16,
        leftForearmX: -0.3,
        rightArmX: -0.12,
        rightArmZ: -0.16,
        rightForearmX: -0.3,
        leftUpLegX: -0.04,
        leftLegX: 0.08,
        rightUpLegX: -0.04,
        rightLegX: 0.08,
      };
    }
  }
}

interface RigBones {
  hips?: THREE.Object3D;
  spine?: THREE.Object3D;
  head?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  leftForeArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  rightForeArm?: THREE.Object3D;
  rightHand?: THREE.Object3D;
  leftUpLeg?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightUpLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
}

/** Pilote les animations et les tenues d'un avatar chargé. */
export class AvatarController {
  private root: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<AvatarAnim, THREE.AnimationAction>();
  private current: AvatarAnim | null = null;
  private shirtMats: THREE.MeshStandardMaterial[] = [];
  private pantsMats: THREE.MeshStandardMaterial[] = [];
  private original = new Map<THREE.MeshStandardMaterial, { map: THREE.Texture | null; color: number }>();
  private bones: RigBones = {};
  /** Objet en main : enfant de la racine de l'avatar, replacé chaque image sur la paume de la main droite. */
  private held: { mesh: THREE.Object3D; hold: { position: [number, number, number]; rotation: [number, number, number]; scale: number } } | null = null;
  /** Temps restant (s) du coup de poing en cours ; 0 = pas de coup. */
  private punchLeft = 0;
  private static readonly PUNCH_DURATION = 0.4;
  private static readonly PALM_DISTANCE = 0.045;
  private static readonly tmpHand = new THREE.Vector3();
  private static readonly tmpFore = new THREE.Vector3();
  private static readonly tmpDir = new THREE.Vector3();

  constructor(
    root: THREE.Object3D,
    clips: THREE.AnimationClip[]
  ) {
    this.root = root;
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
      const n = o.name.replace(/^mixamorig:/, '');
      if (n === 'Hips') this.bones.hips = o;
      else if (n === 'Spine') this.bones.spine = o;
      else if (n === 'Head') this.bones.head = o;
      else if (n === 'LeftArm') this.bones.leftArm = o;
      else if (n === 'LeftForeArm') this.bones.leftForeArm = o;
      else if (n === 'RightArm') this.bones.rightArm = o;
      else if (n === 'RightForeArm') this.bones.rightForeArm = o;
      else if (n === 'RightHand') this.bones.rightHand = o;
      else if (n === 'LeftUpLeg') this.bones.leftUpLeg = o;
      else if (n === 'LeftLeg') this.bones.leftLeg = o;
      else if (n === 'RightUpLeg') this.bones.rightUpLeg = o;
      else if (n === 'RightLeg') this.bones.rightLeg = o;

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

  /** À appeler à chaque image avec l'état du joueur (et l'éventuelle action chronométrée en cours). */
  update(
    dt: number,
    speed: number,
    grounded: boolean,
    knocked: boolean,
    activeAction: TimedBodyActionKind | null = null,
    actionElapsedSec = 0
  ) {
    if (activeAction && !knocked) {
      this.play('Idle');
      const idleAction = this.actions.get('Idle');
      if (idleAction) idleAction.timeScale = 1;
      this.mixer.update(dt);

      const p = computeActionPose(activeAction, actionElapsedSec);
      this.root.rotation.x = p.rootPitchX;
      this.root.position.y = p.rootOffsetY;
      if (this.bones.hips) this.bones.hips.position.y += p.hipOffsetY * 0.72;
      if (this.bones.spine) {
        this.bones.spine.rotation.x += p.spineX;
        this.bones.spine.rotation.y += p.spineY;
      }
      if (this.bones.head) {
        this.bones.head.rotation.x += p.headX;
        this.bones.head.rotation.y += p.headY;
      }
      if (this.bones.leftArm) {
        this.bones.leftArm.rotation.x += p.leftArmX;
        this.bones.leftArm.rotation.z += p.leftArmZ;
      }
      if (this.bones.leftForeArm) {
        this.bones.leftForeArm.rotation.x += p.leftForearmX;
      }
      if (this.bones.rightArm) {
        this.bones.rightArm.rotation.x += p.rightArmX;
        this.bones.rightArm.rotation.z += p.rightArmZ;
      }
      if (this.bones.rightForeArm) {
        this.bones.rightForeArm.rotation.x += p.rightForearmX;
      }
      if (this.bones.leftUpLeg) {
        this.bones.leftUpLeg.rotation.x += p.leftUpLegX;
      }
      if (this.bones.leftLeg) {
        this.bones.leftLeg.rotation.x += p.leftLegX;
      }
      if (this.bones.rightUpLeg) {
        this.bones.rightUpLeg.rotation.x += p.rightUpLegX;
      }
      if (this.bones.rightLeg) {
        this.bones.rightLeg.rotation.x += p.rightLegX;
      }
      this.syncHeld();
      return;
    }

    this.root.rotation.x = 0;
    this.root.position.y = 0;
    const anim = pickAvatarAnim(speed, grounded, knocked);
    this.play(anim);
    const action = this.actions.get(anim);
    if (action) action.timeScale = avatarTimeScale(anim, speed);
    this.mixer.update(dt);
    if (this.punchLeft > 0) {
      this.punchLeft = Math.max(0, this.punchLeft - dt);
      // Coup de poing droit : le bras part vers l'avant et revient (courbe en cloche).
      const swing = Math.sin(Math.PI * (1 - this.punchLeft / AvatarController.PUNCH_DURATION));
      if (this.bones.rightArm) this.bones.rightArm.rotation.x -= 1.45 * swing;
      if (this.bones.rightForeArm) this.bones.rightForeArm.rotation.x -= 0.25 * swing;
      if (this.bones.spine) this.bones.spine.rotation.y += 0.18 * swing;
    }
    this.syncHeld();
  }

  /** Déclenche un coup de poing (animation du bras droit, ~0,4 s). Sans effet pendant une action chronométrée. */
  punch() {
    if (this.punchLeft <= 0) this.punchLeft = AvatarController.PUNCH_DURATION;
  }

  /**
   * Place l'objet tenu (ou le retire avec null). L'objet reste droit par rapport au personnage
   * (+Y vers le haut, +Z devant) et suit la paume de la main droite : le squelette n'a pas de doigts.
   */
  setHeldObject(mesh: THREE.Object3D | null, hold?: { position: [number, number, number]; rotation: [number, number, number]; scale: number }) {
    if (this.held) this.root.remove(this.held.mesh);
    this.held = null;
    if (!mesh || !hold) return;
    this.root.add(mesh);
    this.held = { mesh, hold };
    this.syncHeld();
  }

  private syncHeld() {
    const held = this.held;
    const hand = this.bones.rightHand;
    if (!held || !hand) return;
    const { tmpHand, tmpFore, tmpDir } = AvatarController;
    hand.getWorldPosition(tmpHand);
    // Paume = un peu après le poignet, dans le prolongement de l'avant-bras (indépendant des axes de l'os).
    if (this.bones.rightForeArm) {
      this.bones.rightForeArm.getWorldPosition(tmpFore);
      tmpDir.subVectors(tmpHand, tmpFore).normalize();
      tmpHand.addScaledVector(tmpDir, AvatarController.PALM_DISTANCE * this.root.getWorldScale(tmpFore).x);
    }
    this.root.worldToLocal(tmpHand);
    const m = held.mesh;
    const h = held.hold;
    m.position.set(tmpHand.x + h.position[0], tmpHand.y + h.position[1], tmpHand.z + h.position[2]);
    m.rotation.set(h.rotation[0], h.rotation[1], h.rotation[2]);
    m.scale.setScalar(h.scale);
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
