/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * IA minimale du trafic : suit une voie est-ouest (poursuite de point), garde ses distances.
 */

import { PhysicsCore, VehicleState, createVehicleState } from './PhysicsCore';

export interface TrafficCar {
  vehId: number;
  laneZ: number;
  dir: 1 | -1;
  targetSpeed: number; // m/s
  stuckTimer: number;
}

const tmp: VehicleState = createVehicleState();
const other: VehicleState = createVehicleState();

const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Calcule les commandes de chaque voiture ; à appeler avant `physics.step`. */
export function updateTraffic(physics: PhysicsCore, cars: TrafficCar[], dt: number, edgeX = 112): void {
  for (const car of cars) {
    const s = physics.readVehicle(car.vehId, tmp);

    // Rebouclage aux bords de la carte
    if ((car.dir > 0 && s.x > edgeX) || (car.dir < 0 && s.x < -edgeX)) {
      physics.placeVehicle(car.vehId, -car.dir * edgeX, car.laneZ, car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      car.stuckTimer = 0;
      continue;
    }

    // Poursuite d'un point 14 m devant, sur l'axe de la voie
    const ang = Math.atan2(car.dir * 14, car.laneZ - s.z);
    const err = wrapAngle(ang - s.heading);
    const steer = clamp(-err * 1.4, -1, 1);

    // Distance de sécurité avec la voiture devant
    let target = car.targetSpeed;
    for (const o of cars) {
      if (o === car || o.dir !== car.dir || o.laneZ !== car.laneZ) continue;
      const os = physics.readVehicle(o.vehId, other);
      const gap = (os.x - s.x) * car.dir;
      if (gap > 0 && gap < 22) target = Math.min(target, Math.max(0, os.forwardSpeed - (22 - gap) * 0.4));
    }
    const accel = clamp((target - s.forwardSpeed) * 0.35, -0.8, 0.8);
    physics.vehicleInput(car.vehId, accel, steer, false);

    // Bloquée (accident) : retour sur la voie après quelques secondes
    if (s.speed < 0.5) car.stuckTimer += dt; else car.stuckTimer = 0;
    if (car.stuckTimer > 4) {
      physics.placeVehicle(car.vehId, s.x, car.laneZ, car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      car.stuckTimer = 0;
    }
  }
}
