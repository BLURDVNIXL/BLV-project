/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * ACTEURS : les piétons les plus importants sont de vrais personnages chibi (.glb fusionnés : 1 mesh, 1 matériau,
 * animations BLV_Idle / BLV_Walk / BLV_Talk), choisis dans la table de profils de leur zone et du moment (jour / nuit).
 * Les autres PNJ restent dans la foule instanciée (`NpcCrowd`). Un PNJ est acteur pour toute sa vie : pas de changement
 * d'apparence en cours de route. Un modèle non encore chargé n'est jamais attendu : le PNJ reste dans la foule
 * et le chargement démarre pour la prochaine apparition. Fichiers attendus : `public/npcs/profiles.json` + `public/npcs/<zone>/*.glb`.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type Moment = 'day' | 'night';

/** Identifiant de district du jeu → dossier de zone des profils. Pas de profils pour le Banco. */
const ZONE_OF_DISTRICT: Record<string, string> = {
  plateau: 'plateau',
  adjame: 'adjame',
  attecoube: 'attecoube',
  yopougon: 'yopougon',
  abobo: 'abobo',
  cocody: 'cocody-deux-plateaux',
  riviera: 'cocody-riviera',
  treichville: 'treichville',
  marcory: 'marcory-zone4',
  koumassi: 'koumassi',
  port_bouet: 'port-bouet',
  grand_bassam: 'grand-bassam',
  vridi: 'vridi',
};

/** Les modèles chibi font ~1,32 m, les PNJ de la foule ~1,75 m : échelle d'appoint (À RÉGLER à l'écran). */
export const ACTOR_SCALE = 1.25;
/** Nombre maximal d'acteurs simultanés (un draw call chacun + un mixer). */
export const ACTOR_MAX = 12;
/** Au-delà (m) du joueur, l'acteur n'est plus animé ; au-delà de HIDE, il n'est plus dessiné. */
const ANIM_RANGE = 45;
const HIDE_RANGE = 100;
const FADE = 0.2;

interface ManifestEntry { file: string; zone: string; moment: Moment; loadout?: { bodyId?: string } }

/** Variation de taille (facteur de hauteur) selon le corps : [min, max]. Le reste varie de façon indépendante. */
const HEIGHT_VARIATION: Record<string, [number, number]> = {
  BODY_CHILD: [0.94, 1.06],
  BODY_TEEN: [0.92, 1.1],
  BODY_ELDERLY: [0.9, 1.04],
  BODY_CORPULENT: [0.92, 1.1],
};
const DEFAULT_VARIATION: [number, number] = [0.88, 1.14];
/** Variation de largeur (carrure) autour de 1, indépendante de la hauteur. */
const WIDTH_VARIATION: [number, number] = [0.93, 1.08];

/** Nombre pseudo-aléatoire stable [0,1) dérivé de la graine et d'un « sel » (même PNJ = même taille). */
function rand01(seed: number, salt: number): number {
  let h = (Math.imul(Math.floor(seed) ^ 0x9e3779b9, 2654435761) + Math.imul(salt, 40503)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 3266489917) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class NpcActor {
  ready = false;
  released = false;
  private root: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; talk?: THREE.AnimationAction } = {};
  private current: THREE.AnimationAction | null = null;

  constructor(private readonly owner: NpcActors, readonly file: string, template: GLTF, bodyId: string | undefined, seed: number) {
    const root = cloneSkinned(template.scene);
    root.traverse((o) => {
      o.frustumCulled = false;
      o.castShadow = false;
    });
    const [h0, h1] = (bodyId && HEIGHT_VARIATION[bodyId]) || DEFAULT_VARIATION;
    const height = ACTOR_SCALE * (h0 + rand01(seed, 1) * (h1 - h0));
    const width = ACTOR_SCALE * (WIDTH_VARIATION[0] + rand01(seed, 2) * (WIDTH_VARIATION[1] - WIDTH_VARIATION[0]));
    root.scale.set(width, height, width);
    root.visible = false;
    const mixer = new THREE.AnimationMixer(root);
    for (const clip of template.animations) {
      const a = mixer.clipAction(clip);
      if (clip.name === 'BLV_Idle') this.actions.idle = a;
      else if (clip.name === 'BLV_Walk') this.actions.walk = a;
      else if (clip.name === 'BLV_Talk') this.actions.talk = a;
    }
    this.root = root;
    this.mixer = mixer;
    owner.group.add(root);
    this.ready = true;
  }

  /** Pose et animation. `anim` : 'walk' | 'idle' | 'talk'. */
  pose(x: number, z: number, cap: number, tilt: number, anim: 'walk' | 'idle' | 'talk', speed: number, dt: number, distToPlayer: number): void {
    const root = this.root;
    if (!root || !this.mixer) return;
    root.visible = distToPlayer < HIDE_RANGE;
    if (!root.visible) return;
    root.position.set(x, 0, z);
    root.rotation.set(tilt, cap, 0, 'YXZ');
    if (distToPlayer > ANIM_RANGE) return;
    const next = (anim === 'walk' ? this.actions.walk : anim === 'talk' ? this.actions.talk : this.actions.idle) ?? this.actions.idle ?? null;
    if (next && next !== this.current) {
      next.reset().fadeIn(FADE).play();
      this.current?.fadeOut(FADE);
      this.current = next;
    }
    if (anim === 'walk' && this.actions.walk) this.actions.walk.timeScale = Math.min(1.8, Math.max(0.6, speed / 1.4));
    this.mixer.update(dt);
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    this.owner.onReleased(this);
    if (this.root) {
      this.owner.group.remove(this.root);
      this.mixer?.stopAllAction();
      this.mixer?.uncacheRoot(this.root);
    }
    this.root = null;
    this.mixer = null;
    this.ready = false;
  }
}

export class NpcActors {
  readonly group = new THREE.Group();
  private files = new Map<string, string[]>(); // `${zone}|${moment}` → fichiers
  private bodies = new Map<string, string>(); // fichier → corps
  private templates = new Map<string, GLTF | 'loading' | 'failed'>();
  private loader = new GLTFLoader();
  private base: string;
  private moment: Moment = 'day';
  private count = 0;
  private disposed = false;
  private manifestState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';

  constructor(scene: THREE.Scene) {
    this.group.name = 'npc-actors';
    scene.add(this.group);
    this.base = `${import.meta.env.BASE_URL ?? '/'}npcs/`;
    void this.loadManifest();
  }

  get activeCount(): number { return this.count; }

  setMoment(night: boolean): void { this.moment = night ? 'night' : 'day'; }

  private async loadManifest(): Promise<void> {
    this.manifestState = 'loading';
    try {
      const res = await fetch(`${this.base}profiles.json`);
      if (!res.ok) throw new Error(String(res.status));
      const list = (await res.json()) as ManifestEntry[];
      for (const e of list) {
        const k = `${e.zone}|${e.moment}`;
        const arr = this.files.get(k) ?? [];
        arr.push(e.file);
        if (e.loadout?.bodyId) this.bodies.set(e.file, e.loadout.bodyId);
        this.files.set(k, arr);
      }
      this.manifestState = 'ready';
    } catch {
      this.manifestState = 'failed'; // pas de profils : tout reste dans la foule
    }
  }

  private preload(file: string): void {
    if (this.templates.has(file)) return;
    this.templates.set(file, 'loading');
    this.loader.loadAsync(this.base + file).then(
      (gltf) => { if (!this.disposed) this.templates.set(file, gltf); },
      () => { this.templates.set(file, 'failed'); }
    );
  }

  /**
   * Demande un acteur pour un PNJ de ce district (graine = identité stable). `null` si pas de profils, trop d'acteurs
   * ou modèle pas encore chargé (le chargement démarre : le PNJ reste dans la foule pour cette fois).
   */
  request(districtId: string | undefined, seed: number): NpcActor | null {
    if (this.disposed || this.manifestState !== 'ready' || !districtId || this.count >= ACTOR_MAX) return null;
    const zone = ZONE_OF_DISTRICT[districtId];
    if (!zone) return null;
    const list = this.files.get(`${zone}|${this.moment}`);
    if (!list || list.length === 0) return null;
    const file = list[Math.abs(Math.floor(seed)) % list.length];
    const t = this.templates.get(file);
    if (t === undefined) { this.preload(file); return null; }
    if (t === 'loading' || t === 'failed') return null;
    this.count++;
    return new NpcActor(this, file, t, this.bodies.get(file), seed);
  }

  /** Appelé par un acteur qui se libère. */
  onReleased(_a: NpcActor): void { this.count = Math.max(0, this.count - 1); }

  dispose(): void {
    this.disposed = true;
    this.group.parent?.remove(this.group);
    this.templates.clear();
  }
}
