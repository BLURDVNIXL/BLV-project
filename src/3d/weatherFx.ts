/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Effets atmosphériques 3D légers (2 appels de dessin au total) :
 * - Pluie tropicale / inondation : LineSegments recyclés autour de la caméra/du joueur
 * - Harmattan : poussière saharienne dorée en suspension
 * - Nuit calme : lucioles oscillantes (plus présentes vers Banco, Cocody, Riviera et le littoral)
 */

import * as THREE from 'three';
import type { WeatherType } from '../types/game';

export type WeatherFxMode = 'rain' | 'harmattan' | 'fireflies' | 'none';

const LUSH_DISTRICTS = new Set(['banco', 'cocody', 'riviera', 'grand_bassam', 'port_bouet']);

export function weatherFxMode(
  weather: WeatherType,
  isNight: boolean,
  _districtId = 'plateau'
): WeatherFxMode {
  if (weather === 'pluie' || weather === 'inondation') return 'rain';
  if (weather === 'harmattan') return 'harmattan';
  if (isNight) return 'fireflies';
  return 'none';
}

function makeSoftDotTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 32;
  cv.height = 32;
  const g = cv.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BOX_XZ = 90;
const RAIN_H = 34;
const PARTICLE_H = 18;

export class WeatherFxSystem {
  private rainLines: THREE.LineSegments;
  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.LineBasicMaterial;
  private rainPos: Float32Array;
  private rainVel: Float32Array;
  private rainCount: number;

  private particles: THREE.Points;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particleTex: THREE.CanvasTexture | null;
  private particlePos: Float32Array;
  private particleSeed: Float32Array;
  private particleCount: number;

  private lastCenterX = 0;
  private lastCenterZ = 0;
  private initialized = false;

  constructor(private readonly scene: THREE.Scene, lowEnd = false) {
    this.rainCount = lowEnd ? 260 : 640;
    this.rainPos = new Float32Array(this.rainCount * 6);
    this.rainVel = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * BOX_XZ;
      const ry = Math.random() * RAIN_H;
      const rz = (Math.random() - 0.5) * BOX_XZ;
      this.rainVel[i] = 28 + Math.random() * 14;
      const idx = i * 6;
      this.rainPos[idx] = rx;
      this.rainPos[idx + 1] = ry;
      this.rainPos[idx + 2] = rz;
      this.rainPos[idx + 3] = rx - 0.28;
      this.rainPos[idx + 4] = ry + 1.55;
      this.rainPos[idx + 5] = rz - 0.14;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    this.particleCount = lowEnd ? 90 : 220;
    this.particlePos = new Float32Array(this.particleCount * 3);
    this.particleSeed = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      this.particlePos[i * 3] = (Math.random() - 0.5) * BOX_XZ;
      this.particlePos[i * 3 + 1] = 0.6 + Math.random() * PARTICLE_H;
      this.particlePos[i * 3 + 2] = (Math.random() - 0.5) * BOX_XZ;
      this.particleSeed[i] = Math.random() * Math.PI * 2;
    }
    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePos, 3));
    this.particleTex = makeSoftDotTexture();
    this.particleMat = new THREE.PointsMaterial({
      color: 0xe5c290,
      size: 0.55,
      map: this.particleTex ?? undefined,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(this.particleGeo, this.particleMat);
    this.particles.frustumCulled = false;
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  public update(
    dt: number,
    nowSec: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    mode: WeatherFxMode,
    visible: boolean,
    districtId = 'plateau'
  ): void {
    if (!visible || mode === 'none') {
      this.rainLines.visible = false;
      this.particles.visible = false;
      return;
    }

    const half = BOX_XZ * 0.5;
    if (!this.initialized) {
      this.lastCenterX = targetX;
      this.lastCenterZ = targetZ;
      this.initialized = true;
    }

    const shiftX = targetX - this.lastCenterX;
    const shiftZ = targetZ - this.lastCenterZ;
    this.lastCenterX = targetX;
    this.lastCenterZ = targetZ;

    if (mode === 'rain') {
      this.rainLines.visible = true;
      this.particles.visible = false;
      this.rainLines.position.set(targetX, Math.max(0, targetY), targetZ);
      const step = Math.min(dt, 0.05);

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let x = this.rainPos[idx] - shiftX - 4.8 * step;
        let y = this.rainPos[idx + 1] - this.rainVel[i] * step;
        let z = this.rainPos[idx + 2] - shiftZ - 2.2 * step;

        if (y < -1) {
          y += RAIN_H;
          x = (Math.random() - 0.5) * BOX_XZ;
          z = (Math.random() - 0.5) * BOX_XZ;
        }
        if (x < -half) x += BOX_XZ;
        else if (x > half) x -= BOX_XZ;
        if (z < -half) z += BOX_XZ;
        else if (z > half) z -= BOX_XZ;

        this.rainPos[idx] = x;
        this.rainPos[idx + 1] = y;
        this.rainPos[idx + 2] = z;
        this.rainPos[idx + 3] = x + 0.34;
        this.rainPos[idx + 4] = y + 1.65;
        this.rainPos[idx + 5] = z + 0.16;
      }
      (this.rainGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      return;
    }

    this.rainLines.visible = false;
    this.particles.visible = true;
    this.particles.position.set(targetX, Math.max(0, targetY), targetZ);
    const step = Math.min(dt, 0.05);

    if (mode === 'harmattan') {
      this.particleMat.color.setHex(0xe8c488);
      this.particleMat.size = 0.65;
      this.particleMat.opacity = 0.42;
      this.particleMat.blending = THREE.NormalBlending;

      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        const seed = this.particleSeed[i];
        let x = this.particlePos[idx] - shiftX - (6.5 + (seed % 3)) * step;
        let y = this.particlePos[idx + 1] + Math.sin(nowSec * 1.4 + seed) * 0.35 * step;
        let z = this.particlePos[idx + 2] - shiftZ + (2.4 + Math.cos(seed) * 1.1) * step;

        if (x < -half) x += BOX_XZ;
        else if (x > half) x -= BOX_XZ;
        if (z < -half) z += BOX_XZ;
        else if (z > half) z -= BOX_XZ;
        if (y < 0.4) y += PARTICLE_H - 0.5;
        else if (y > PARTICLE_H) y -= PARTICLE_H - 0.5;

        this.particlePos[idx] = x;
        this.particlePos[idx + 1] = y;
        this.particlePos[idx + 2] = z;
      }
    } else {
      // Lucioles nocturnes : scintillement doux doré/vert
      const lush = LUSH_DISTRICTS.has(districtId);
      this.particleMat.color.setHex(0xd9f99d);
      this.particleMat.size = lush ? 0.52 : 0.38;
      this.particleMat.opacity = (lush ? 0.65 : 0.36) + Math.sin(nowSec * 2.4) * 0.14;
      this.particleMat.blending = THREE.AdditiveBlending;

      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        const seed = this.particleSeed[i];
        let x = this.particlePos[idx] - shiftX + Math.sin(nowSec * 0.9 + seed) * 1.1 * step;
        let y = this.particlePos[idx + 1] + Math.cos(nowSec * 1.3 + seed * 1.7) * 0.65 * step;
        let z = this.particlePos[idx + 2] - shiftZ + Math.cos(nowSec * 0.8 + seed * 0.6) * 1.1 * step;

        if (x < -half) x += BOX_XZ;
        else if (x > half) x -= BOX_XZ;
        if (z < -half) z += BOX_XZ;
        else if (z > half) z -= BOX_XZ;
        if (y < 0.6) y = 0.8 + (seed % 3);
        else if (y > 9.5) y = 2.0 + (seed % 4);

        this.particlePos[idx] = x;
        this.particlePos[idx + 1] = y;
        this.particlePos[idx + 2] = z;
      }
    }

    (this.particleGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.rainLines);
    this.scene.remove(this.particles);
    this.rainGeo.dispose();
    this.rainMat.dispose();
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.particleTex?.dispose();
  }
}
