/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Trafic sur les grands axes d'Abidjan : des voitures apparaissent autour du joueur, suivent l'axe
 * (conduite à droite), gardent leurs distances et disparaissent quand elles s'éloignent.
 * Le trafic est local à chaque client (décor vivant) : il n'est pas synchronisé en multijoueur.
 */

import { PhysicsCore, VehicleState, createVehicleState } from '../physics/PhysicsCore';
import { ARTERIALS, Arterial } from './roads';
import { Vec2 } from './geo';
import { mulberry32 } from './rng';

export interface RoadCar {
  vehId: number;
  art: number;
  dir: 1 | -1;
  targetSpeed: number;
  stuckTimer: number;
  wait: number;
}

interface Poly { art: Arterial; cum: number[]; total: number }
const POLYS: Poly[] = ARTERIALS.map((art) => {
  const cum = [0];
  for (let i = 1; i < art.points.length; i++) cum.push(cum[i - 1] + Math.hypot(art.points[i].x - art.points[i - 1].x, art.points[i].z - art.points[i - 1].z));
  return { art, cum, total: cum[cum.length - 1] };
});

const LANE_OFFSET = 3.4;
const tmp: VehicleState = createVehicleState();
const tmp2: VehicleState = createVehicleState();

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

function pointAt(poly: Poly, s: number): { p: Vec2; dx: number; dz: number } {
  const sc = clamp(s, 0, poly.total);
  let i = 1;
  while (i < poly.cum.length - 1 && poly.cum[i] < sc) i++;
  const a = poly.art.points[i - 1];
  const b = poly.art.points[i];
  const L = poly.cum[i] - poly.cum[i - 1] || 1;
  const t = (sc - poly.cum[i - 1]) / L;
  return { p: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, dx: (b.x - a.x) / L, dz: (b.z - a.z) / L };
}

/** Abscisse curviligne du point de l'axe le plus proche de (x, z). */
function project(poly: Poly, x: number, z: number): number {
  let best = Infinity;
  let bestS = 0;
  for (let i = 1; i < poly.art.points.length; i++) {
    const a = poly.art.points[i - 1];
    const b = poly.art.points[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const L2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
    const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (d < best) { best = d; bestS = poly.cum[i - 1] + t * Math.sqrt(L2); }
  }
  return bestS;
}

let seedCounter = 1;
const rnd = mulberry32(0xb1b1b1b1);

/** Place la voiture sur un axe à 70–200 m du joueur, voie de droite. Renvoie false si aucun axe n'est assez proche. */
export function respawnNear(physics: PhysicsCore, car: RoadCar, px: number, pz: number): boolean {
  for (let attempt = 0; attempt < 24; attempt++) {
    const ai = Math.floor(rnd() * POLYS.length);
    const poly = POLYS[ai];
    const s = rnd() * poly.total;
    const { p, dx, dz } = pointAt(poly, s);
    const d = Math.hypot(p.x - px, p.z - pz);
    if (d < 70 || d > 200) continue;
    const dir: 1 | -1 = rnd() < 0.5 ? 1 : -1;
    const fx = dx * dir;
    const fz = dz * dir;
    const heading = Math.atan2(fx, fz);
    const rx = -fz;
    const rz = fx; // droite de la marche = (-cos h, sin h) = (-fz, fx)
    physics.placeVehicle(car.vehId, p.x + rx * LANE_OFFSET, p.z + rz * LANE_OFFSET, heading);
    car.art = ai; car.dir = dir; car.stuckTimer = 0; car.wait = 0;
    car.targetSpeed = 10 + rnd() * 7;
    physics.setVehicleEnabled(car.vehId, true);
    seedCounter++;
    return true;
  }
  return false;
}

/** Calcule les commandes de toutes les voitures du trafic ; à appeler avant `physics.step`. */
export function updateRoadTraffic(physics: PhysicsCore, cars: RoadCar[], px: number, pz: number, dt: number, others: Array<{ x: number; z: number }>): void {
  for (const car of cars) {
    if (car.wait > 0) { car.wait -= dt; if (car.wait <= 0) respawnNear(physics, car, px, pz); continue; }
    const s = physics.readVehicle(car.vehId, tmp);
    const dToPlayer = Math.hypot(s.x - px, s.z - pz);
    if (dToPlayer > 260) { physics.vehicleInput(car.vehId, 0, 0, true); if (!respawnNear(physics, car, px, pz)) car.wait = 1.5; continue; }
    const poly = POLYS[car.art];
    const along = project(poly, s.x, s.z);
    if ((car.dir > 0 && along > poly.total - 14) || (car.dir < 0 && along < 14)) { if (!respawnNear(physics, car, px, pz)) car.wait = 1.5; continue; }

    const look = pointAt(poly, along + car.dir * 16);
    const fx = look.dx * car.dir;
    const fz = look.dz * car.dir;
    const tx = look.p.x + -fz * LANE_OFFSET;
    const tz = look.p.z + fx * LANE_OFFSET;
    const err = wrap(Math.atan2(tx - s.x, tz - s.z) - s.heading);
    const steer = clamp(-err * 1.6, -1, 1);

    // Distance de sécurité : voitures du trafic, voiture du joueur
    let target = car.targetSpeed;
    const hx = Math.sin(s.heading);
    const hz = Math.cos(s.heading);
    const consider = (ox: number, oz: number, ospeed: number): void => {
      const dx = ox - s.x;
      const dz = oz - s.z;
      const ahead = dx * hx + dz * hz;
      const side = Math.abs(dx * -hz + dz * hx);
      if (ahead > 0 && ahead < 22 && side < 2.6) target = Math.min(target, Math.max(0, ospeed - (22 - ahead) * 0.5));
    };
    for (const o of cars) {
      if (o === car) continue;
      const os = physics.readVehicle(o.vehId, tmp2);
      consider(os.x, os.z, os.forwardSpeed);
    }
    for (const o of others) consider(o.x, o.z, 0);
    const accel = clamp((target - s.forwardSpeed) * 0.4, -0.9, 0.8);
    physics.vehicleInput(car.vehId, accel, steer, false);

    if (s.speed < 0.6 && target > 1) car.stuckTimer += dt; else car.stuckTimer = 0;
    if (car.stuckTimer > 5) { if (!respawnNear(physics, car, px, pz)) car.wait = 1.5; }
  }
}
