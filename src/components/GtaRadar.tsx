/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Mini-map Radar GTA San Andreas : lagune, baies, grands axes, ponts et repères d'Abidjan dessinés en vectoriel
 * (aucun échantillonnage : coût négligeable à 60 images/s).
 */

import React, { useEffect, useRef } from 'react';
import { projected } from '../world/abidjanGeography';
import { SPECIAL_FOOTPRINTS } from '../world/city';
import { ARTERIALS, BRIDGE_GEOMS } from '../world/roads';

interface GtaRadarProps {
  playerX: number;
  playerZ: number;
  playerRot: number;
  camYaw: number;
  energyPercent: number; // Barre verte/rouge autour du radar
  healthPercent?: number;
  currentDistrict: string;
  isDriving?: boolean;
  homeX?: number;
  homeZ?: number;
}

const SIZE = 128;            // résolution du canevas (px)
const SCALE = 0.33;          // px par mètre de jeu -> rayon visible ≈ 190 m
const LAND = '#2b3038';
const WATER = '#1f6b9e';

interface Blip { x: number; z: number; color: string }
const BLIPS: Blip[] = SPECIAL_FOOTPRINTS.map((f) => ({
  x: f.x,
  z: f.z,
  color: f.spec.id === 'lycee_caiman' ? '#f59e0b' : f.spec.id === 'lycee_alysma' ? '#ec4899' : f.spec.id === 'lycee_alex' ? '#06b6d4' : '#e2e8f0'
}));

// Baies : polygones construits une seule fois
const BAY_POLYS = projected.bays.map((bay) => {
  const L: Array<{ x: number; z: number }> = [];
  const R: Array<{ x: number; z: number }> = [];
  bay.pts.forEach((p, i) => {
    const a = bay.pts[Math.max(0, i - 1)];
    const b = bay.pts[Math.min(bay.pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    L.push({ x: p.x - (dz / l) * p.r, z: p.z + (dx / l) * p.r });
    R.push({ x: p.x + (dz / l) * p.r, z: p.z - (dx / l) * p.r });
  });
  return [...L, ...R.reverse()];
});

const fillPoly = (g: CanvasRenderingContext2D, pts: Array<{ x: number; z: number }>): void => {
  g.beginPath();
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.z) : g.lineTo(p.x, p.z)));
  g.closePath();
  g.fill();
};

export const GtaRadar: React.FC<GtaRadarProps> = ({
  playerX,
  playerZ,
  playerRot,
  camYaw,
  energyPercent,
  currentDistrict,
  isDriving = false,
  homeX,
  homeZ
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = LAND;
    g.fillRect(0, 0, SIZE, SIZE);

    g.save();
    g.translate(SIZE / 2, SIZE / 2);
    g.rotate(-camYaw);
    g.scale(SCALE, SCALE);
    g.translate(-playerX, -playerZ);

    g.fillStyle = WATER;
    fillPoly(g, projected.mainWater);
    fillPoly(g, projected.oceanWater);
    BAY_POLYS.forEach((poly) => fillPoly(g, poly));
    g.fillStyle = LAND;
    projected.islands.forEach((i) => { g.beginPath(); g.arc(i.x, i.z, i.r, 0, Math.PI * 2); g.fill(); });

    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#8a8470';
    g.lineWidth = 7;
    ARTERIALS.forEach((a) => { g.beginPath(); a.points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.z) : g.lineTo(p.x, p.z))); g.stroke(); });
    g.strokeStyle = '#f2f2f2';
    g.lineWidth = 9;
    BRIDGE_GEOMS.forEach((b) => { g.beginPath(); g.moveTo(b.a.x, b.a.z); g.lineTo(b.b.x, b.b.z); g.stroke(); });
    g.restore();

    // Repères (espace écran, collés au bord s'ils sont hors champ)
    const blips: Blip[] = [...BLIPS];
    if (homeX !== undefined && homeZ !== undefined) blips.push({ x: homeX, z: homeZ, color: '#22c55e' });
    const c = Math.cos(-camYaw);
    const s = Math.sin(-camYaw);
    blips.forEach((b) => {
      const dx = (b.x - playerX) * SCALE;
      const dz = (b.z - playerZ) * SCALE;
      let sx = dx * c - dz * s;
      let sy = dx * s + dz * c;
      const dist = Math.hypot(sx, sy);
      const maxR = SIZE / 2 - 8;
      if (dist > maxR) { sx = (sx / dist) * maxR; sy = (sy / dist) * maxR; }
      g.beginPath();
      g.arc(SIZE / 2 + sx, SIZE / 2 + sy, 4, 0, Math.PI * 2);
      g.fillStyle = b.color;
      g.fill();
      g.lineWidth = 1.2;
      g.strokeStyle = '#000';
      g.stroke();
    });
  }, [playerX, playerZ, camYaw, homeX, homeZ]);

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 sm:bottom-5 sm:left-5 z-40 flex flex-col items-start select-none">
      {/* BANNIÈRE QUARTIER GTA SAN ANDREAS */}
      <div className="mb-2 pl-1 animate-fade-in">
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-black/60 px-2 py-0.5 rounded border-l-2 border-amber-500">
          📍 {currentDistrict}
        </span>
      </div>

      {/* CADRE DU RADAR CIRCULAIRE */}
      <div className="relative flex items-center justify-center">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-slate-900 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-md">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full" />

          {/* FLÈCHE DU JOUEUR AU CENTRE (pointe dans sa direction) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
            style={{ transform: `translate(-50%, -50%) rotate(${playerRot - camYaw}rad)` }}
          >
            <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
              isDriving ? 'border-b-[14px] border-b-amber-400' : 'border-b-[12px] border-b-white drop-shadow-[0_0_6px_rgba(255,255,255,1)]'
            }`} />
          </div>

          {/* LETTRE DU NORD "N" GTA */}
          <div
            className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] font-black text-amber-400 font-mono"
            style={{ transform: `rotate(${-camYaw}rad) translateY(-2px)` }}
          >
            N
          </div>
        </div>

        {/* BARRE D'ÉNERGIE / SANTÉ (style GTA San Andreas HUD) */}
        <div className="absolute -bottom-1 w-24 sm:w-28 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-black">
          <div
            className={`h-full transition-all duration-300 ${
              energyPercent > 35 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500 animate-pulse'
            }`}
            style={{ width: `${energyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
