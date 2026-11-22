/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Livreurs moto : un cavalier du studio PNJ sur sa moto (4 meshes), qui roule dans le trafic routier comme les voitures
 * (voies, distances de sécurité, réapparition près du joueur : `roadTraffic.ts`). Les roues et le cavalier sont animés
 * par les clips du studio, dont la cadence suit la vitesse réelle de la moto.
 */

import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ACTOR_SCALE } from './npcActors';
import { deliveryRiderLoadout } from './studioNpc/deliveryRiderLoadout';
import {
  buildStudioActorTemplate,
  disposeStudioActorTemplate,
  type StudioActorTemplate,
} from './studioNpc/studioActorBuilder';

/** Vitesse de moto (m/s) à laquelle les roues font un tour par cycle de chaque clip (déduite des tours par seconde du studio). */
const WALK_REF_SPEED = 3.2;
const RUN_REF_SPEED = 6.1;
/** Au-delà de cette vitesse (m/s), on passe du clip « Walk » au clip « Run ». */
const RUN_FROM = 6;
const FADE = 0.25;

/** Cadence de lecture d'un clip pour une vitesse donnée ; 0 à l'arrêt (les roues et le cavalier se figent). */
export function riderClipTimeScale(speed: number, refSpeed: number): number {
  const v = Math.abs(speed);
  if (v < 0.3) return 0;
  return Math.min(3, Math.max(0.3, v / refSpeed));
}

/** Clip à jouer selon la vitesse. */
export function riderClipFor(speed: number): 'walk' | 'run' {
  return Math.abs(speed) > RUN_FROM ? 'run' : 'walk';
}

export class DeliveryRiderRig {
  readonly group = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions: Record<'walk' | 'run', THREE.AnimationAction>;
  private current: 'walk' | 'run' = 'walk';

  constructor(private readonly template: StudioActorTemplate) {
    const root = cloneSkinned(template.scene) as THREE.Group;
    root.scale.setScalar(ACTOR_SCALE);
    root.traverse((o) => {
      o.frustumCulled = false; // le cavalier skinné et la moto bougent hors de leur boîte d'origine
    });
    this.group.name = 'delivery-rider';
    this.group.add(root);
    this.mixer = new THREE.AnimationMixer(root);
    const find = (name: string) => template.animations.find((a) => a.name === name)!;
    this.actions = { walk: this.mixer.clipAction(find('BLV_Walk')), run: this.mixer.clipAction(find('BLV_Run')) };
    this.actions.walk.play();
    this.actions.run.play();
    this.actions.run.setEffectiveWeight(0);
  }

  /** `speed` : vitesse de la moto (m/s). Sans effet tant que le livreur est caché. */
  update(dt: number, speed: number): void {
    if (!this.group.visible) return;
    const want = riderClipFor(speed);
    if (want !== this.current) {
      this.actions[this.current].fadeOut(FADE);
      this.actions[want].reset().fadeIn(FADE).play();
      this.current = want;
    }
    this.actions.walk.timeScale = riderClipTimeScale(speed, WALK_REF_SPEED);
    this.actions.run.timeScale = riderClipTimeScale(speed, RUN_REF_SPEED);
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.group.parent?.remove(this.group);
    disposeStudioActorTemplate(this.template);
  }
}

/** Construit un livreur (visage, casque, moto) pour cette graine ; `null` si le studio ne peut pas le construire. */
export function createDeliveryRider(seed: number): DeliveryRiderRig | null {
  try {
    const template = buildStudioActorTemplate(deliveryRiderLoadout(seed));
    return template ? new DeliveryRiderRig(template) : null;
  } catch {
    return null;
  }
}
