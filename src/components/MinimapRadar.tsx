import { useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import { RadarSnapshot } from '../3d/sceneManager';
import { districtAt, projected } from '../world/abidjanGeography';
import { ARTERIALS, GRIDS, frameFor } from '../world/roads';
import type { Route } from '../world/routing';

interface MinimapRadarProps {
  getSnapshot: () => RadarSnapshot | null;
  district: string;
  /** Itinéraire GPS actif (affiché en orange sur la minimap zoomée). */
  route?: Route | null;
  /** Toucher le radar ouvre la grande carte. */
  onOpen?: () => void;
}

/**
 * 2D Canvas Minimap Radar zoomée sur le quartier autour du joueur :
 * rues locales, grands axes, ponts, lagune, maison, points d'intérêt et cap du joueur.
 */
export function MinimapRadar({ getSnapshot, district, route, onOpen }: MinimapRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const routeRef = useRef<Route | null>(route ?? null);
  routeRef.current = route ?? null;

  useEffect(() => {
    let timer = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const snap = getSnapshot();
      if (canvas && snap) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          // Zoom quartier (~330 m × 250 m visibles) pour repérer immédiatement rues, intersections et repères
          const scale = 0.42;
          const mapX = (wx: number) => (wx - snap.playerX) * scale + w / 2;
          const mapY = (wz: number) => (wz - snap.playerZ) * scale + h / 2;
          const halfSpan = Math.hypot(w, h) / (2 * scale) + 60;

          ctx.clearRect(0, 0, w, h);

          // 1. Fond terrain
          ctx.fillStyle = '#2c3d29';
          ctx.fillRect(0, 0, w, h);

          // 2. Rues locales de la commune courante (et voisines proches)
          const px = snap.playerX;
          const pz = snap.playerZ;
          const curDistrict = districtAt({ x: px, z: pz });
          const nearbyDistricts = projected.districts.filter(
            (pd) => pd.d.id === curDistrict.id || Math.hypot(pd.c.x - px, pd.c.z - pz) < pd.d.radiusM + halfSpan
          );
          ctx.lineCap = 'butt';
          for (const pd of nearbyDistricts) {
            const g = GRIDS[pd.d.id];
            if (!g || g.style === 'none' || g.street <= 0) continue;
            const f = frameFor(pd.d.id);
            const dx = px - f.ox;
            const dz = pz - f.oz;
            const uP = dx * f.c + dz * f.s;
            const vP = -dx * f.s + dz * f.c;
            const uMin = uP - halfSpan;
            const uMax = uP + halfSpan;
            const vMin = vP - halfSpan;
            const vMax = vP + halfSpan;
            const i0 = Math.floor(uMin / f.pitch);
            const i1 = Math.ceil(uMax / f.pitch);
            const j0 = Math.floor(vMin / f.pitch);
            const j1 = Math.ceil(vMax / f.pitch);

            ctx.strokeStyle = '#5f6f7d';
            ctx.lineWidth = Math.max(2.2, f.street * scale);
            ctx.beginPath();
            for (let i = i0; i <= i1; i++) {
              const u = i * f.pitch;
              const x1 = f.ox + u * f.c - vMin * f.s;
              const z1 = f.oz + u * f.s + vMin * f.c;
              const x2 = f.ox + u * f.c - vMax * f.s;
              const z2 = f.oz + u * f.s + vMax * f.c;
              ctx.moveTo(mapX(x1), mapY(z1));
              ctx.lineTo(mapX(x2), mapY(z2));
            }
            for (let j = j0; j <= j1; j++) {
              const v = j * f.pitch;
              const x1 = f.ox + uMin * f.c - v * f.s;
              const z1 = f.oz + uMin * f.s + v * f.c;
              const x2 = f.ox + uMax * f.c - v * f.s;
              const z2 = f.oz + uMax * f.s + v * f.c;
              ctx.moveTo(mapX(x1), mapY(z1));
              ctx.lineTo(mapX(x2), mapY(z2));
            }
            ctx.stroke();
          }

          // 3. Lagune, océan et baies par-dessus la grille (les rues ne traversent pas l'eau)
          const fillWaterPoly = (pts: Array<{ x: number; z: number }>) => {
            if (pts.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(mapX(pts[0].x), mapY(pts[0].z));
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(mapX(pts[i].x), mapY(pts[i].z));
            }
            ctx.closePath();
            ctx.fill();
          };

          ctx.fillStyle = '#0c4a6e';
          fillWaterPoly(projected.mainWater);
          fillWaterPoly(projected.oceanWater);

          for (const bay of projected.bays) {
            for (let i = 0; i < bay.pts.length - 1; i++) {
              const a = bay.pts[i];
              const b = bay.pts[i + 1];
              ctx.strokeStyle = '#0c4a6e';
              ctx.lineWidth = Math.max(2, (a.r + b.r) * scale);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(mapX(a.x), mapY(a.z));
              ctx.lineTo(mapX(b.x), mapY(b.z));
              ctx.stroke();
            }
          }

          ctx.fillStyle = '#3f6212';
          for (const isl of projected.islands) {
            ctx.beginPath();
            ctx.arc(mapX(isl.x), mapY(isl.z), Math.max(2, isl.r * scale), 0, Math.PI * 2);
            ctx.fill();
          }

          // 4. Grands boulevards (artères) et ponts
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(241, 219, 165, 0.92)';
          for (const art of ARTERIALS) {
            ctx.lineWidth = Math.max(3.5, art.width * scale);
            ctx.beginPath();
            art.points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(mapX(p.x), mapY(p.z)) : ctx.lineTo(mapX(p.x), mapY(p.z))));
            ctx.stroke();
          }

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineCap = 'butt';
          for (const br of projected.bridges) {
            ctx.lineWidth = Math.max(4, 9 * scale);
            ctx.beginPath();
            ctx.moveTo(mapX(br.a.x), mapY(br.a.z));
            ctx.lineTo(mapX(br.z.x), mapY(br.z.z));
            ctx.stroke();
          }

          // 5. Itinéraire GPS actif (si défini)
          const rt = routeRef.current;
          if (rt && rt.points.length > 1) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            rt.points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(mapX(p.x), mapY(p.z)) : ctx.lineTo(mapX(p.x), mapY(p.z))));
            ctx.stroke();
          }

          // 6. Points d'intérêt à proximité
          for (const hs of snap.hotspots) {
            const hx = mapX(hs.x);
            const hy = mapY(hs.z);
            if (hx >= 2 && hx <= w - 2 && hy >= 2 && hy <= h - 2) {
              ctx.fillStyle = `#${hs.color.toString(16).padStart(6, '0')}`;
              ctx.strokeStyle = 'rgba(255,255,255,0.85)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(hx, hy, 2.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          }

          // 7. Maison du joueur (carré crème bordé orange s'il est dans la vue)
          const home = snap.homePorch ?? snap.home;
          if (home) {
            const hx = mapX(home.x);
            const hy = mapY(home.z);
            if (hx >= 3 && hx <= w - 3 && hy >= 3 && hy <= h - 3) {
              ctx.fillStyle = '#fffaf1';
              ctx.strokeStyle = '#f98a1c';
              ctx.lineWidth = 1.8;
              ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
              ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7);
            }
          }

          // 8. Repère Nord discret
          ctx.font = '700 8px sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillText('N', w - 4, 3);

          // 9. Flèche de cap du joueur au centre
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(Math.PI - snap.playerRotY);
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(4.5, 5);
          ctx.lineTo(0, 2.5);
          ctx.lineTo(-4.5, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      timer = window.setTimeout(draw, 140);
    };
    draw();
    return () => clearTimeout(timer);
  }, [getSnapshot]);

  return (
    <div
      className={`panel pointer-events-auto w-28 shrink-0 overflow-hidden rounded-2xl p-1 md:w-32 short:w-20 short:p-0.5 ${onOpen ? 'cursor-pointer' : ''}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? 'Ouvrir la carte' : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); } : undefined}
    >
      <canvas ref={canvasRef} width={144} height={108} className="block aspect-[4/3] w-full rounded-xl object-cover short:aspect-[16/10]" />
      <div className="flex items-center justify-between gap-1 px-1 pt-0.5 text-[10px] leading-tight short:px-0.5">
        <span className="truncate font-display text-[11px] font-semibold text-ink-800 short:text-[10px]">{district}</span>
        <span className="flex shrink-0 items-center gap-0.5 font-semibold text-ink-400">
          <Maximize2 className="h-2.5 w-2.5" />
        </span>
      </div>
    </div>
  );
}
