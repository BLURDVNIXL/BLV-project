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
import type { InteriorId } from '../world/interiors';
import type { NpcRole } from '../world/npcAppearance';
import { interiorNpcKey, interiorNpcLoadout } from './studioNpc/interiorLoadout';
import { isStreetActorProfile } from './streetProfiles';
import { pickStreetModel } from './actorPick';
import { buildStudioActorTemplate, disposeStudioActorTemplate, type StudioActorTemplate } from './studioNpc/studioActorBuilder';

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
/** Acteurs d'une salle (construits avec le studio, indépendants des 12 de la rue : la rue est désactivée à l'intérieur). */
export const INTERIOR_ACTOR_MAX = 16;
/** Au-delà (m) du joueur, l'acteur n'est plus animé ; au-delà de HIDE, il n'est plus dessiné. */
const ANIM_RANGE = 45;
const HIDE_RANGE = 100;
const FADE = 0.2;

interface ManifestEntry { file: string; zone: string; moment: Moment; loadout?: { fullOutfitId?: string | null } | null }

export class NpcActor {
  ready = false;
  released = false;
  private root: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; run?: THREE.AnimationAction; talk?: THREE.AnimationAction } = {};
  private current: THREE.AnimationAction | null = null;

  constructor(
    private readonly owner: NpcActors,
    readonly file: string,
    template: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
    readonly interior = false
  ) {
    const root = cloneSkinned(template.scene);
    root.traverse((o) => {
      o.frustumCulled = false;
      o.castShadow = false;
    });
    root.scale.setScalar(ACTOR_SCALE);
    root.visible = false;
    const mixer = new THREE.AnimationMixer(root);
    for (const clip of template.animations) {
      const a = mixer.clipAction(clip);
      if (clip.name === 'BLV_Idle') this.actions.idle = a;
      else if (clip.name === 'BLV_Walk') this.actions.walk = a;
      else if (clip.name === 'BLV_Run') this.actions.run = a;
      else if (clip.name === 'BLV_Talk') this.actions.talk = a;
    }
    this.root = root;
    this.mixer = mixer;
    owner.group.add(root);
    this.ready = true;
  }

  /** Pose et animation. `anim` : 'walk' | 'run' | 'idle' | 'talk' ('run' retombe sur la marche accélérée si le modèle n'a pas BLV_Run). */
  pose(x: number, z: number, cap: number, tilt: number, anim: 'walk' | 'run' | 'idle' | 'talk', speed: number, dt: number, distToPlayer: number): void {
    const root = this.root;
    if (!root || !this.mixer) return;
    root.visible = distToPlayer < HIDE_RANGE;
    if (!root.visible) return;
    root.position.set(x, 0, z);
    root.rotation.set(tilt, cap, 0, 'YXZ');
    if (distToPlayer > ANIM_RANGE) return;
    const next = (anim === 'run' ? this.actions.run ?? this.actions.walk : anim === 'walk' ? this.actions.walk : anim === 'talk' ? this.actions.talk : this.actions.idle) ?? this.actions.idle ?? null;
    if (next && next !== this.current) {
      next.reset().fadeIn(FADE).play();
      this.current?.fadeOut(FADE);
      this.current = next;
    }
    if ((anim === 'walk' || anim === 'run') && next === this.actions.walk && this.actions.walk) this.actions.walk.timeScale = Math.min(1.8, Math.max(0.6, speed / 1.4));
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
  private templates = new Map<string, GLTF | 'loading' | 'failed'>();
  private loader = new GLTFLoader();
  private base: string;
  private moment: Moment = 'day';
  private count = 0;
  private interiorCount = 0;
  /** Acteurs de rue actifs par fichier : sert à éviter deux fois le même modèle dans le quartier. */
  private streetUsage = new Map<string, number>();
  /** Modèles du studio de la salle courante (clé = profil) ; vidés au changement de salle. */
  private studioTemplates = new Map<string, StudioActorTemplate | 'failed'>();
  private studioRoom: InteriorId | null = null;
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
        if (!isStreetActorProfile(e)) continue; // ex. livreur moto : jamais comme piéton
        const k = `${e.zone}|${e.moment}`;
        const arr = this.files.get(k) ?? [];
        arr.push(e.file);
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
    const file = pickStreetModel(list, seed, this.streetUsage);
    const t = this.templates.get(file);
    if (t === undefined) { this.preload(file); return null; }
    if (t === 'loading' || t === 'failed') return null;
    this.count++;
    this.streetUsage.set(file, (this.streetUsage.get(file) ?? 0) + 1);
    return new NpcActor(this, file, t);
  }

  /**
   * Acteur d'un PNJ de salle, construit avec le studio (visage, coiffure, vêtements) ; la même salle montre les
   * mêmes personnes. `null` si la construction échoue ou si la limite de la salle est atteinte : l'appelant garde
   * alors le PNJ de la foule. Les modèles d'une salle sont libérés quand on entre dans une autre.
   */
  requestInterior(room: InteriorId, role: NpcRole, seed: number): NpcActor | null {
    if (this.disposed || this.interiorCount >= INTERIOR_ACTOR_MAX) return null;
    if (this.studioRoom !== room) {
      this.clearStudioTemplates();
      this.studioRoom = room;
    }
    const key = interiorNpcKey(room, role, seed);
    let t = this.studioTemplates.get(key);
    if (t === undefined) {
      try {
        t = buildStudioActorTemplate(interiorNpcLoadout(room, role, seed)) ?? 'failed';
      } catch {
        t = 'failed';
      }
      this.studioTemplates.set(key, t);
    }
    if (t === 'failed') return null;
    this.interiorCount++;
    return new NpcActor(this, `studio:${key}`, t, true);
  }

  private clearStudioTemplates(): void {
    for (const t of this.studioTemplates.values()) if (t !== 'failed') disposeStudioActorTemplate(t);
    this.studioTemplates.clear();
  }

  /** Appelé par un acteur qui se libère. */
  onReleased(a: NpcActor): void {
    if (a.interior) this.interiorCount = Math.max(0, this.interiorCount - 1);
    else {
      this.count = Math.max(0, this.count - 1);
      const u = (this.streetUsage.get(a.file) ?? 0) - 1;
      if (u > 0) this.streetUsage.set(a.file, u); else this.streetUsage.delete(a.file);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.group.parent?.remove(this.group);
    this.templates.clear();
    this.clearStudioTemplates();
  }
}
