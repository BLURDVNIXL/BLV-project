/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trafic lagunaire et maritime (Lagune Ébrié & littoral) :
 * - Bateaux-bus SOTRA (Plateau ↔ Treichville / Cocody / Marcory / Riviera)
 * - Pirogues traditionnelles de pêcheurs (baies du Banco & Cocody, ouest, littoral)
 * - Bouées de chenal lumineuses aux abords des ponts et du Port Autonome
 */

import * as THREE from 'three';

export type VesselKind = 'bateau_bus' | 'pirogue';

export interface WaterRoute {
  id: string;
  kind: VesselKind;
  speedMps: number;
  waypoints: ReadonlyArray<readonly [number, number]>;
}

export interface ChannelBuoy {
  id: string;
  x: number;
  z: number;
  channelSide: 'port' | 'starboard';
}

export const LAGOON_ROUTES: readonly WaterRoute[] = [
  {
    id: 'lagune_plateau_fhb',
    kind: 'bateau_bus',
    speedMps: 6.2,
    waypoints: [
      [-1015, 215],
      [-775, 215],
      [-775, 315],
      [-1015, 315],
    ],
  },
  {
    id: 'lagune_centre_est',
    kind: 'bateau_bus',
    speedMps: 7.0,
    waypoints: [
      [-660, 240],
      [115, 240],
      [115, 325],
      [-660, 325],
    ],
  },
  {
    id: 'lagune_riviera_marcory',
    kind: 'bateau_bus',
    speedMps: 7.4,
    waypoints: [
      [250, 180],
      [1550, 300],
      [1550, 440],
      [250, 420],
    ],
  },
  {
    id: 'lagune_ouest_port',
    kind: 'bateau_bus',
    speedMps: 6.0,
    waypoints: [
      [-1680, 210],
      [-1130, 220],
      [-1130, 340],
      [-1680, 340],
    ],
  },
  {
    id: 'baie_cocody_sud',
    kind: 'pirogue',
    speedMps: 3.1,
    waypoints: [
      [-260, -70],
      [-190, -70],
      [-190, 220],
      [-280, 220],
    ],
  },
  {
    id: 'baie_cocody_nord',
    kind: 'pirogue',
    speedMps: 2.8,
    waypoints: [
      [-220, -170],
      [-140, -170],
      [-110, -340],
      [-180, -340],
    ],
  },
  {
    id: 'baie_banco_sud',
    kind: 'pirogue',
    speedMps: 3.0,
    waypoints: [
      [-1290, -400],
      [-1215, -400],
      [-1215, -110],
      [-1290, -110],
    ],
  },
  {
    id: 'baie_banco_nord',
    kind: 'pirogue',
    speedMps: 2.7,
    waypoints: [
      [-1230, -750],
      [-1160, -750],
      [-1180, -540],
      [-1280, -540],
    ],
  },
  {
    id: 'ocean_bassam_pirogues',
    kind: 'pirogue',
    speedMps: 3.3,
    waypoints: [
      [120, 2560],
      [1780, 2660],
      [1780, 2740],
      [120, 2640],
    ],
  },
];

export const LAGOON_BUOYS: readonly ChannelBuoy[] = [
  { id: 'buoy_fhb_w1', x: -780, z: 205, channelSide: 'port' },
  { id: 'buoy_fhb_w2', x: -780, z: 330, channelSide: 'starboard' },
  { id: 'buoy_fhb_e1', x: -660, z: 215, channelSide: 'port' },
  { id: 'buoy_fhb_e2', x: -660, z: 335, channelSide: 'starboard' },
  { id: 'buoy_dg_w1', x: -1125, z: 215, channelSide: 'port' },
  { id: 'buoy_dg_w2', x: -1125, z: 345, channelSide: 'starboard' },
  { id: 'buoy_hkb_w1', x: 120, z: 205, channelSide: 'port' },
  { id: 'buoy_hkb_w2', x: 120, z: 385, channelSide: 'starboard' },
  { id: 'buoy_hkb_e1', x: 240, z: 165, channelSide: 'port' },
  { id: 'buoy_hkb_e2', x: 240, z: 435, channelSide: 'starboard' },
  { id: 'buoy_cocody_1', x: -230, z: -30, channelSide: 'port' },
  { id: 'buoy_banco_1', x: -1255, z: -260, channelSide: 'starboard' },
];

interface RouteSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  len: number;
  cumStart: number;
}

interface ActiveVessel {
  group: THREE.Group;
  paddle?: THREE.Mesh;
  segments: RouteSegment[];
  totalLen: number;
  speedMps: number;
  progress: number;
  bobPhase: number;
}

interface ActiveBuoy {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  phase: number;
  x: number;
  z: number;
}

function buildRouteSegments(waypoints: ReadonlyArray<readonly [number, number]>): {
  segments: RouteSegment[];
  totalLen: number;
} {
  const segments: RouteSegment[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const [ax, az] = waypoints[i];
    const [bx, bz] = waypoints[(i + 1) % waypoints.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len > 0.1) {
      segments.push({ ax, az, bx, bz, len, cumStart: totalLen });
      totalLen += len;
    }
  }
  return { segments, totalLen };
}

function sampleRoute(segments: RouteSegment[], totalLen: number, dist: number): { x: number; z: number; yaw: number } {
  const d = ((dist % totalLen) + totalLen) % totalLen;
  for (const s of segments) {
    if (d <= s.cumStart + s.len) {
      const t = (d - s.cumStart) / s.len;
      return {
        x: s.ax + (s.bx - s.ax) * t,
        z: s.az + (s.bz - s.az) * t,
        yaw: Math.atan2(s.bx - s.ax, s.bz - s.az),
      };
    }
  }
  const last = segments[segments.length - 1];
  return { x: last.bx, z: last.bz, yaw: Math.atan2(last.bx - last.ax, last.bz - last.az) };
}

export class WaterTrafficSystem {
  private vessels: ActiveVessel[] = [];
  private buoys: ActiveBuoy[] = [];
  private disposables: Array<{ dispose(): void }> = [];
  private nightMaterials: THREE.MeshStandardMaterial[] = [];
  private isNight = false;

  constructor(private readonly scene: THREE.Scene, lowEnd = false) {
    // Shared materials for vessels
    const ferryHullMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 });
    const ferryStripeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const ferryCabinMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const ferryGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0xfde047,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
    const fisherMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5c3824, roughness: 0.75 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.15,
      roughness: 0.3,
    });

    this.nightMaterials.push(ferryGlassMat, lanternMat);
    this.disposables.push(
      ferryHullMat,
      ferryStripeMat,
      ferryCabinMat,
      ferryGlassMat,
      wakeMat,
      woodMat,
      trimMat,
      fisherMat,
      skinMat,
      lanternMat
    );

    const ferryHullGeo = new THREE.BoxGeometry(2.5, 0.9, 8.2);
    const ferryBowGeo = new THREE.ConeGeometry(1.28, 2.0, 4);
    const ferryStripeGeo = new THREE.BoxGeometry(2.58, 0.26, 7.6);
    const ferryCabinGeo = new THREE.BoxGeometry(2.05, 1.35, 5.4);
    const ferryGlassGeo = new THREE.BoxGeometry(2.12, 0.52, 4.6);
    const ferryRoofGeo = new THREE.BoxGeometry(2.2, 0.16, 5.8);
    const ferryWakeGeo = new THREE.PlaneGeometry(2.2, 4.8);

    const pirogueHullGeo = new THREE.BoxGeometry(0.84, 0.44, 4.4);
    const pirogueTipGeo = new THREE.ConeGeometry(0.42, 0.95, 4);
    const pirogueStripeGeo = new THREE.BoxGeometry(0.88, 0.12, 3.6);
    const fisherTorsoGeo = new THREE.BoxGeometry(0.42, 0.55, 0.32);
    const fisherHeadGeo = new THREE.SphereGeometry(0.18, 8, 6);
    const paddleGeo = new THREE.BoxGeometry(0.08, 1.3, 0.22);
    const lanternGeo = new THREE.BoxGeometry(0.2, 0.24, 0.2);
    const pirogueWakeGeo = new THREE.PlaneGeometry(0.85, 2.4);

    this.disposables.push(
      ferryHullGeo,
      ferryBowGeo,
      ferryStripeGeo,
      ferryCabinGeo,
      ferryGlassGeo,
      ferryRoofGeo,
      ferryWakeGeo,
      pirogueHullGeo,
      pirogueTipGeo,
      pirogueStripeGeo,
      fisherTorsoGeo,
      fisherHeadGeo,
      paddleGeo,
      lanternGeo,
      pirogueWakeGeo
    );

    const routesToSpawn = lowEnd ? LAGOON_ROUTES.slice(0, 6) : LAGOON_ROUTES;
    routesToSpawn.forEach((route, idx) => {
      const { segments, totalLen } = buildRouteSegments(route.waypoints);
      if (segments.length === 0 || totalLen <= 0) return;

      const group = new THREE.Group();
      let paddle: THREE.Mesh | undefined;

      if (route.kind === 'bateau_bus') {
        const hull = new THREE.Mesh(ferryHullGeo, ferryHullMat);
        hull.position.set(0, 0.32, 0);
        const bow = new THREE.Mesh(ferryBowGeo, ferryHullMat);
        bow.rotation.x = Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.position.set(0, 0.32, 5.05);
        const stripe = new THREE.Mesh(ferryStripeGeo, ferryStripeMat);
        stripe.position.set(0, 0.65, 0);
        const cabin = new THREE.Mesh(ferryCabinGeo, ferryCabinMat);
        cabin.position.set(0, 1.35, -0.35);
        const glass = new THREE.Mesh(ferryGlassGeo, ferryGlassMat);
        glass.position.set(0, 1.5, -0.2);
        const roof = new THREE.Mesh(ferryRoofGeo, ferryStripeMat);
        roof.position.set(0, 2.08, -0.35);
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(0, 2.25, 2.2);
        const wake = new THREE.Mesh(ferryWakeGeo, wakeMat);
        wake.rotation.x = -Math.PI / 2;
        wake.position.set(0, 0.06, -6.2);
        group.add(hull, bow, stripe, cabin, glass, roof, lantern, wake);
      } else {
        const hull = new THREE.Mesh(pirogueHullGeo, woodMat);
        hull.position.set(0, 0.16, 0);
        const bow = new THREE.Mesh(pirogueTipGeo, woodMat);
        bow.rotation.x = Math.PI / 2;
        bow.rotation.y = Math.PI / 4;
        bow.position.set(0, 0.2, 2.65);
        const stern = new THREE.Mesh(pirogueTipGeo, woodMat);
        stern.rotation.x = -Math.PI / 2;
        stern.rotation.y = Math.PI / 4;
        stern.position.set(0, 0.2, -2.65);
        const stripe = new THREE.Mesh(pirogueStripeGeo, trimMat);
        stripe.position.set(0, 0.32, 0);
        const torso = new THREE.Mesh(fisherTorsoGeo, fisherMat);
        torso.position.set(0, 0.62, -0.45);
        const head = new THREE.Mesh(fisherHeadGeo, skinMat);
        head.position.set(0, 1.04, -0.45);
        paddle = new THREE.Mesh(paddleGeo, trimMat);
        paddle.position.set(0.45, 0.45, -0.25);
        paddle.rotation.z = 0.25;
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(0, 0.48, 1.75);
        const wake = new THREE.Mesh(pirogueWakeGeo, wakeMat);
        wake.rotation.x = -Math.PI / 2;
        wake.position.set(0, 0.05, -3.9);
        group.add(hull, bow, stern, stripe, torso, head, paddle, lantern, wake);
      }

      this.scene.add(group);
      this.vessels.push({
        group,
        paddle,
        segments,
        totalLen,
        speedMps: route.speedMps,
        progress: (idx * 0.27 * totalLen) % totalLen,
        bobPhase: idx * 1.1,
      });
    });

    // Bouées de chenal
    const buoyBaseGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.45, 8);
    const buoyConeGeo = new THREE.ConeGeometry(0.32, 1.05, 8);
    const buoyTipGeo = new THREE.SphereGeometry(0.14, 8, 6);
    const portMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 });
    const starboardMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
    this.disposables.push(buoyBaseGeo, buoyConeGeo, buoyTipGeo, portMat, starboardMat);

    LAGOON_BUOYS.forEach((b, idx) => {
      const mat = b.channelSide === 'port' ? portMat : starboardMat;
      const beaconMat = new THREE.MeshStandardMaterial({
        color: b.channelSide === 'port' ? 0xf87171 : 0x4ade80,
        emissive: b.channelSide === 'port' ? 0xef4444 : 0x22c55e,
        emissiveIntensity: 0.35,
        roughness: 0.25,
      });
      this.disposables.push(beaconMat);
      const group = new THREE.Group();
      const base = new THREE.Mesh(buoyBaseGeo, mat);
      base.position.y = 0.15;
      const cone = new THREE.Mesh(buoyConeGeo, mat);
      cone.position.y = 0.88;
      const tip = new THREE.Mesh(buoyTipGeo, beaconMat);
      tip.position.y = 1.48;
      group.add(base, cone, tip);
      group.position.set(b.x, 0, b.z);
      this.scene.add(group);
      this.buoys.push({ group, beaconMat, phase: idx * 0.9, x: b.x, z: b.z });
    });
  }

  public setNight(night: boolean): void {
    this.isNight = night;
    this.nightMaterials[0].emissiveIntensity = night ? 0.95 : 0.0;
    this.nightMaterials[1].emissiveIntensity = night ? 1.25 : 0.15;
  }

  public update(dt: number, nowSec: number, focusX: number, focusZ: number, visible: boolean): void {
    const step = Math.min(dt, 0.05);
    const maxDist = 520;

    for (const v of this.vessels) {
      v.progress = (v.progress + v.speedMps * step) % v.totalLen;
      const s = sampleRoute(v.segments, v.totalLen, v.progress);
      const near = visible && Math.hypot(s.x - focusX, s.z - focusZ) < maxDist;
      v.group.visible = near;
      if (!near) continue;

      v.group.position.set(s.x, Math.sin(nowSec * 1.9 + v.bobPhase) * 0.07, s.z);
      v.group.rotation.y = s.yaw;
      v.group.rotation.z = Math.sin(nowSec * 1.6 + v.bobPhase) * 0.035;
      if (v.paddle) {
        v.paddle.rotation.x = Math.sin(nowSec * 3.8 + v.bobPhase) * 0.55;
      }
    }

    for (const b of this.buoys) {
      const near = visible && Math.hypot(b.x - focusX, b.z - focusZ) < maxDist;
      b.group.visible = near;
      if (!near) continue;
      b.group.position.y = Math.sin(nowSec * 2.1 + b.phase) * 0.08;
      b.group.rotation.z = Math.sin(nowSec * 1.5 + b.phase) * 0.06;
      const pulse = Math.sin(nowSec * 3.0 + b.phase) > 0.35 ? 1.4 : 0.25;
      b.beaconMat.emissiveIntensity = this.isNight ? pulse : 0.2;
    }
  }

  public dispose(): void {
    for (const v of this.vessels) this.scene.remove(v.group);
    for (const b of this.buoys) this.scene.remove(b.group);
    this.disposables.forEach((d) => d.dispose());
    this.vessels = [];
    this.buoys = [];
  }
}
