import { useEffect, useRef } from 'react';
import { RadarSnapshot } from '../3d/sceneManager';
import { projected } from '../world/abidjanGeography';

interface MinimapRadarProps {
  getSnapshot: () => RadarSnapshot | null;
  district: string;
}

/**
 * 2D Canvas Minimap Radar using the exact projected Abidjan geography
 * (North/South shores, Cocody & Banco bays, Île Boulay, Océan Atlantique, and all 5 bridges).
 */
export function MinimapRadar({ getSnapshot, district }: MinimapRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
          const scale = 0.095; // ~1600m span visible around player on 160px radar
          const mapX = (wx: number) => (wx - snap.playerX) * scale + w / 2;
          const mapY = (wz: number) => (wz - snap.playerZ) * scale + h / 2;

          ctx.clearRect(0, 0, w, h);

          // 1. Land base backdrop
          ctx.fillStyle = '#2c3d29';
          ctx.fillRect(0, 0, w, h);

          // 2. Real Lagoon & Ocean water polygons from abidjanGeography.ts
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

          // Bays (Banco & Cocody)
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

          // Île Boulay island
          ctx.fillStyle = '#3f6212';
          for (const isl of projected.islands) {
            ctx.beginPath();
            ctx.arc(mapX(isl.x), mapY(isl.z), Math.max(2, isl.r * scale), 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. District zones subtle markers
          for (const pd of projected.districts) {
            const dx = mapX(pd.c.x);
            const dy = mapY(pd.c.z);
            if (dx > -40 && dx < w + 40 && dy > -40 && dy < h + 40) {
              ctx.fillStyle = pd.d.id === 'plateau' ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.08)';
              ctx.beginPath();
              ctx.arc(dx, dy, Math.max(4, pd.d.radiusM * 0.12 * scale), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 4. All 5 Real Abidjan Bridges
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'butt';
          for (const br of projected.bridges) {
            ctx.beginPath();
            ctx.moveTo(mapX(br.a.x), mapY(br.a.z));
            ctx.lineTo(mapX(br.z.x), mapY(br.z.z));
            ctx.stroke();
          }

          // 5. Hotspots
          for (const hs of snap.hotspots) {
            const hx = mapX(hs.x);
            const hy = mapY(hs.z);
            if (hx >= 3 && hx <= w - 3 && hy >= 3 && hy <= h - 3) {
              ctx.fillStyle = `#${hs.color.toString(16).padStart(6, '0')}`;
              ctx.beginPath();
              ctx.arc(hx, hy, 2.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 6. Remote online players
          for (const r of snap.remotes) {
            const rx = mapX(r.x);
            const ry = mapY(r.z);
            if (rx >= 2 && rx <= w - 2 && ry >= 2 && ry <= h - 2) {
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // 7. Center Player Heading Arrow (+z = South => heading 0 points down)
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(Math.PI - snap.playerRotY);
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.5;
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
    <div className="panel pointer-events-auto w-40 shrink-0 overflow-hidden p-1.5 md:w-52 short:w-36">
      <canvas ref={canvasRef} width={208} height={156} className="block aspect-[4/3] w-full rounded-xl" />
      <div className="flex items-center justify-between px-1.5 pt-1 text-xs">
        <span className="truncate font-display text-sm font-semibold text-ink-800">{district}</span>
        <span className="font-semibold text-ink-400">GPS</span>
      </div>
    </div>
  );
}
