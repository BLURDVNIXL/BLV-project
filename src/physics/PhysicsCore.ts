/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Passerelle TypeScript vers le cœur physique WebAssembly (physics/physics.cpp).
 * Aucune donnée personnelle : le module ne manipule que des positions et des vitesses.
 */

export const SolidFlag = {
  SOLID: 1,
  WATER: 2,
  BUILDING: 4,
  PROP: 8
} as const;

export const VehiclePreset = {
  WORO_WORO: 0,
  GBAKA: 1,
  POLICE: 2,
  LAND_CRUISER: 3,
  COUPE_GT: 4
} as const;
export type VehiclePresetId = (typeof VehiclePreset)[keyof typeof VehiclePreset];

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  forwardSpeed: number;
  lateralSpeed: number;
  yawRate: number;
  steer: number;
  rpm: number;
  gear: number;
  wheelAngle: number;
  skid: number;
  pitch: number;
  roll: number;
  speed: number;
}

export interface CharacterState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  grounded: boolean;
  speed: number;
  stun: number;
}

export type PhysicsEventKind = 'vehicle-solid' | 'vehicle-vehicle' | 'vehicle-pedestrian';
export interface PhysicsEvent {
  kind: PhysicsEventKind;
  a: number;
  b: number;
  impulse: number;
  x: number;
  z: number;
  speed: number;
}

interface PhysicsExports {
  memory: WebAssembly.Memory;
  phys_version(): number;
  phys_init(): void;
  phys_add_box(cx: number, cz: number, hx: number, hz: number, angle: number, height: number, flags: number): number;
  phys_add_circle(cx: number, cz: number, r: number, height: number, flags: number): number;
  phys_set_solid_enabled(id: number, en: number): void;
  phys_remove_solid(id: number): void;
  phys_solid_count(): number;
  phys_solid_height(id: number): number;
  phys_veh_create(preset: number, x: number, z: number, heading: number): number;
  phys_veh_destroy(id: number): void;
  phys_veh_enable(id: number, en: number): void;
  phys_veh_input(id: number, accel: number, steer: number, handbrake: number): void;
  phys_veh_place(id: number, x: number, z: number, heading: number): void;
  phys_veh_set_velocity(id: number, vx: number, vz: number, w: number): void;
  phys_veh_ptr(id: number): number;
  phys_veh_stride(): number;
  phys_veh_half_extent(id: number, axis: number): number;
  phys_char_create(x: number, z: number, radius: number): number;
  phys_char_destroy(id: number): void;
  phys_char_enable(id: number, en: number): void;
  phys_char_input(id: number, dx: number, dz: number, speed: number, jump: number): void;
  phys_char_face(id: number, heading: number, use: number): void;
  phys_char_place(id: number, x: number, z: number): void;
  phys_char_ptr(id: number): number;
  phys_char_stride(): number;
  phys_step(dt: number): void;
  phys_event_count(): number;
  phys_event_ptr(): number;
  phys_event_clear(): void;
  phys_ray(ox: number, oz: number, dx: number, dz: number, maxDist: number, mask: number): number;
  phys_ray_id(): number;
}

const EVENT_KINDS: PhysicsEventKind[] = ['vehicle-solid', 'vehicle-solid', 'vehicle-vehicle', 'vehicle-pedestrian'];

export function createVehicleState(): VehicleState {
  return {
    x: 0, y: 0, z: 0, heading: 0, vx: 0, vz: 0, forwardSpeed: 0, lateralSpeed: 0, yawRate: 0,
    steer: 0, rpm: 900, gear: 0, wheelAngle: 0, skid: 0, pitch: 0, roll: 0, speed: 0
  };
}

export function createCharacterState(): CharacterState {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, heading: 0, grounded: true, speed: 0, stun: 0 };
}

export class PhysicsCore {
  private readonly api: PhysicsExports;
  private view: Float32Array;

  private constructor(api: PhysicsExports) {
    this.api = api;
    this.view = new Float32Array(api.memory.buffer);
  }

  /** Charge et instancie le module WASM (compilé par physics/build.sh). */
  static async load(url: string): Promise<PhysicsCore> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Moteur physique introuvable (${response.status}) : ${url}`);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const api = instance.exports as unknown as PhysicsExports;
    if (typeof api.phys_version !== 'function') throw new Error('Module physique invalide');
    api.phys_init();
    return new PhysicsCore(api);
  }

  /** Instancie depuis des octets déjà chargés (tests Node). */
  static async fromBytes(bytes: BufferSource): Promise<PhysicsCore> {
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const api = instance.exports as unknown as PhysicsExports;
    api.phys_init();
    return new PhysicsCore(api);
  }

  private f32(): Float32Array {
    if (this.view.buffer !== this.api.memory.buffer) this.view = new Float32Array(this.api.memory.buffer);
    return this.view;
  }

  get version(): number { return this.api.phys_version(); }

  /** Vide le monde (décor, véhicules, personnages). */
  reset(): void { this.api.phys_init(); }

  addBox(cx: number, cz: number, halfX: number, halfZ: number, angle: number, height: number, flags: number = SolidFlag.SOLID): number {
    return this.api.phys_add_box(cx, cz, halfX, halfZ, angle, height, flags | SolidFlag.SOLID);
  }
  addCircle(cx: number, cz: number, radius: number, height: number, flags: number = SolidFlag.SOLID): number {
    return this.api.phys_add_circle(cx, cz, radius, height, flags | SolidFlag.SOLID);
  }
  setSolidEnabled(id: number, enabled: boolean): void { this.api.phys_set_solid_enabled(id, enabled ? 1 : 0); }
  /** Retire définitivement un solide (déchargement d'une zone) ; l'emplacement est recyclé. */
  removeSolid(id: number): void { this.api.phys_remove_solid(id); }
  /** Nombre de solides actuellement présents. */
  get solidCount(): number { return this.api.phys_solid_count(); }
  solidHeight(id: number): number { return this.api.phys_solid_height(id); }

  createVehicle(preset: VehiclePresetId, x: number, z: number, heading: number): number {
    return this.api.phys_veh_create(preset, x, z, heading);
  }
  destroyVehicle(id: number): void { this.api.phys_veh_destroy(id); }
  setVehicleEnabled(id: number, enabled: boolean): void { this.api.phys_veh_enable(id, enabled ? 1 : 0); }
  /** accel ∈ [-1, 1] (avant/arrière-frein), steer ∈ [-1, 1] (+ = droite), handbrake ∈ {0, 1}. */
  vehicleInput(id: number, accel: number, steer: number, handbrake: boolean): void {
    this.api.phys_veh_input(id, accel, steer, handbrake ? 1 : 0);
  }
  placeVehicle(id: number, x: number, z: number, heading: number): void { this.api.phys_veh_place(id, x, z, heading); }
  setVehicleVelocity(id: number, vx: number, vz: number, yawRate: number): void { this.api.phys_veh_set_velocity(id, vx, vz, yawRate); }
  vehicleHalfLength(id: number): number { return this.api.phys_veh_half_extent(id, 0); }
  vehicleHalfWidth(id: number): number { return this.api.phys_veh_half_extent(id, 1); }

  readVehicle(id: number, out: VehicleState = createVehicleState()): VehicleState {
    const p = this.api.phys_veh_ptr(id) >> 2;
    const f = this.f32();
    out.x = f[p]; out.y = f[p + 1]; out.z = f[p + 2]; out.heading = f[p + 3];
    out.vx = f[p + 4]; out.vz = f[p + 5]; out.forwardSpeed = f[p + 6]; out.lateralSpeed = f[p + 7];
    out.yawRate = f[p + 8]; out.steer = f[p + 9]; out.rpm = f[p + 10]; out.gear = f[p + 11];
    out.wheelAngle = f[p + 12]; out.skid = f[p + 13]; out.pitch = f[p + 14]; out.roll = f[p + 15]; out.speed = f[p + 16];
    return out;
  }

  createCharacter(x: number, z: number, radius = 0.35): number { return this.api.phys_char_create(x, z, radius); }
  destroyCharacter(id: number): void { this.api.phys_char_destroy(id); }
  setCharacterEnabled(id: number, enabled: boolean): void { this.api.phys_char_enable(id, enabled ? 1 : 0); }
  /** Direction monde (x, z) de norme ≤ 1, vitesse cible en m/s, saut (impulsion unique). */
  characterInput(id: number, dirX: number, dirZ: number, speed: number, jump = false): void {
    this.api.phys_char_input(id, dirX, dirZ, speed, jump ? 1 : 0);
  }
  faceCharacter(id: number, heading: number, enabled = true): void { this.api.phys_char_face(id, heading, enabled ? 1 : 0); }
  placeCharacter(id: number, x: number, z: number): void { this.api.phys_char_place(id, x, z); }

  readCharacter(id: number, out: CharacterState = createCharacterState()): CharacterState {
    const p = this.api.phys_char_ptr(id) >> 2;
    const f = this.f32();
    out.x = f[p]; out.y = f[p + 1]; out.z = f[p + 2]; out.vx = f[p + 3]; out.vy = f[p + 4]; out.vz = f[p + 5];
    out.heading = f[p + 6]; out.grounded = f[p + 7] > 0.5; out.speed = f[p + 8]; out.stun = f[p + 9];
    return out;
  }

  /** Avance la simulation (pas fixe interne de 1/120 s). */
  step(dt: number): void { this.api.phys_step(dt); }

  /** Lit puis vide la file d'événements (collisions, piétons renversés). */
  drainEvents(handler: (event: PhysicsEvent) => void): void {
    const n = this.api.phys_event_count();
    if (n === 0) return;
    const f = this.f32();
    const base = this.api.phys_event_ptr() >> 2;
    for (let i = 0; i < n; i++) {
      const o = base + i * 8;
      handler({
        kind: EVENT_KINDS[Math.max(0, Math.min(3, f[o] | 0))],
        a: f[o + 1] | 0, b: f[o + 2] | 0, impulse: f[o + 3], x: f[o + 4], z: f[o + 5], speed: f[o + 6]
      });
    }
    this.api.phys_event_clear();
  }

  /** Rayon 2D : distance du premier solide dont les drapeaux contiennent `mask`, ou -1. */
  ray(ox: number, oz: number, dx: number, dz: number, maxDist: number, mask: number = SolidFlag.SOLID): number {
    return this.api.phys_ray(ox, oz, dx, dz, maxDist, mask);
  }
  get lastRayHitId(): number { return this.api.phys_ray_id(); }
}

let sharedPromise: Promise<PhysicsCore> | null = null;

/** Instance partagée (une seule compilation WASM par session). */
export function loadPhysics(): Promise<PhysicsCore> {
  if (!sharedPromise) {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    sharedPromise = PhysicsCore.load(`${base}physics.wasm`).catch((err) => {
      sharedPromise = null;
      throw err;
    });
  }
  return sharedPromise;
}
