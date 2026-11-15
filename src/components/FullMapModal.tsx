import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Map as MapIcon, Minus, Navigation, Plus, X } from 'lucide-react';
import type { RadarSnapshot } from '../3d/sceneManager';
import { districtAt, projected } from '../world/abidjanGeography';
import { ARTERIALS } from '../world/roads';
import { findRoute, type Route } from '../world/routing';
import { RoundIconButton } from './ui/Jelly';

interface FullMapModalProps {
  getSnapshot: () => RadarSnapshot | null;
  /** Itinéraire en cours (gardé par l'application pour qu'il survive à la fermeture de la carte). */
  route: Route | null;
  onRouteChange: (route: Route | null) => void;
  onClose: () => void;
}

interface Marker {
  id: string;
  x: number;
  z: number;
  icon: string;
  name: string;
  color: string;
  /** 0 = maison, 1 = lieu d'action, 2 = repère de la ville (priorité au toucher). */
  rank: number;
}

const LANDMARK_ICON: Record<string, string> = {
  airport: '✈️', port: '⚓', stadium: '🏟️', worship: '⛪', market: '🛒', tower: '🏙️', university: '🎓', hotel: '🏨',
};

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** « 🏥 Entrer — CHU de Cocody » → icône 🏥 et nom « CHU de Cocody ». */
function splitLabel(label: string): { icon: string; name: string } {
  const m = label.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u);
  const icon = m ? m[1] : '📍';
  const name = label.slice(m ? m[0].length : 0).replace(/^Entrer\s*—\s*/, '').replace(/\s*\(.*\)\s*$/, '').trim();
  return { icon, name: name || label };
}

const shortDistrict = (name: string) => name.replace(/\s*\(.*$/, '').replace(/\s*·.*$/, '');

const bounds = projected.bounds;
const MAP_W = bounds.se.x - bounds.nw.x;
const MAP_H = bounds.se.z - bounds.nw.z;
const MAP_CX = (bounds.se.x + bounds.nw.x) / 2;
const MAP_CZ = (bounds.se.z + bounds.nw.z) / 2;

/** Carte plein écran d'Abidjan : toute la ville, lieux, maison, position ; déplacement et zoom au doigt. */
export function FullMapModal({ getSnapshot, route, onRouteChange, onClose }: FullMapModalProps) {
  const routeRef = useRef<Route | null>(route);
  routeRef.current = route;
  const [noRoute, setNoRoute] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const view = useRef({ cx: MAP_CX, cz: MAP_CZ, k: 0.05, kMin: 0.03, kMax: 0.6, w: 300, h: 200, fitted: false });
  const markers = useRef<Marker[]>([]);
  const rafRef = useRef(0);
  const [selected, setSelected] = useState<Marker | null>(null);
  const selectedRef = useRef<Marker | null>(null);
  selectedRef.current = selected;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const v = view.current;
    const dpr = canvas.width / v.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = (wx: number) => (wx - v.cx) * v.k + v.w / 2;
    const sy = (wz: number) => (wz - v.cz) * v.k + v.h / 2;
    const snap = getSnapshot();

    // Fond : hors carte sombre, terre dans les limites, eau
    ctx.fillStyle = '#141c12';
    ctx.fillRect(0, 0, v.w, v.h);
    ctx.fillStyle = '#2c3d29';
    ctx.fillRect(sx(bounds.nw.x), sy(bounds.nw.z), MAP_W * v.k, MAP_H * v.k);

    const fillPoly = (pts: Array<{ x: number; z: number }>) => {
      if (pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(sx(pts[0].x), sy(pts[0].z));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i].x), sy(pts[i].z));
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#0c4a6e';
    fillPoly(projected.mainWater);
    fillPoly(projected.oceanWater);
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineCap = 'round';
    for (const bay of projected.bays) {
      for (let i = 0; i < bay.pts.length - 1; i++) {
        const a = bay.pts[i];
        const b = bay.pts[i + 1];
        ctx.lineWidth = Math.max(2, (a.r + b.r) * v.k);
        ctx.beginPath();
        ctx.moveTo(sx(a.x), sy(a.z));
        ctx.lineTo(sx(b.x), sy(b.z));
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#3f6212';
    for (const isl of projected.islands) {
      ctx.beginPath();
      ctx.arc(sx(isl.x), sy(isl.z), Math.max(2, isl.r * v.k), 0, Math.PI * 2);
      ctx.fill();
    }

    // Communes : halo discret et nom
    for (const pd of projected.districts) {
      ctx.fillStyle = pd.d.id === 'plateau' ? 'rgba(148,163,184,0.28)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.arc(sx(pd.c.x), sy(pd.c.z), Math.max(6, pd.d.radiusM * 0.25 * v.k), 0, Math.PI * 2);
      ctx.fill();
    }

    // Grandes routes et ponts
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(226,203,150,0.75)';
    for (const art of ARTERIALS) {
      ctx.lineWidth = Math.max(1.2, art.width * v.k * 0.9);
      ctx.beginPath();
      art.points.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.z)) : ctx.lineTo(sx(p.x), sy(p.z))));
      ctx.stroke();
    }
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineCap = 'butt';
    for (const br of projected.bridges) {
      ctx.lineWidth = Math.max(2, 9 * v.k);
      ctx.beginPath();
      ctx.moveTo(sx(br.a.x), sy(br.a.z));
      ctx.lineTo(sx(br.z.x), sy(br.z.z));
      ctx.stroke();
    }

    // Noms de communes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(Math.min(14, Math.max(8, v.k * 70)))}px sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(9,13,22,0.75)';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (const pd of projected.districts) {
      const t = shortDistrict(pd.d.name).toUpperCase();
      ctx.strokeText(t, sx(pd.c.x), sy(pd.c.z));
      ctx.fillText(t, sx(pd.c.x), sy(pd.c.z));
    }

    // Itinéraire : trait surligné de toi à la destination
    const rt = routeRef.current;
    if (rt && rt.points.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const trace = () => {
        ctx.beginPath();
        rt.points.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.z)) : ctx.lineTo(sx(p.x), sy(p.z))));
        ctx.stroke();
      };
      ctx.strokeStyle = 'rgba(9,13,22,0.85)';
      ctx.lineWidth = 9;
      trace();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      trace();
      ctx.setLineDash([2, 10]);
      ctx.strokeStyle = '#fff7e0';
      ctx.lineWidth = 2;
      trace();
      ctx.setLineDash([]);
    }

    // Marqueurs : maison, lieux d'action, repères
    const list: Marker[] = [];
    for (const lm of projected.landmarks) {
      list.push({ id: `lm_${lm.l.id}`, x: lm.p.x, z: lm.p.z, icon: LANDMARK_ICON[lm.l.kind] || '📍', name: lm.l.name, color: '#64748b', rank: 2 });
    }
    if (snap) {
      for (const p of snap.places) {
        const { icon, name } = splitLabel(p.label);
        list.push({ id: p.id, x: p.x, z: p.z, icon, name, color: hex(p.color), rank: 1 });
      }
      if (snap.home) list.push({ id: 'home', x: snap.home.x, z: snap.home.z, icon: '🏠', name: 'Chez moi', color: '#f59e0b', rank: 0 });
    }
    markers.current = list;

    const showNames = v.k > 0.14;
    const ms = Math.min(1, Math.max(0.6, v.k / 0.12)); // marqueurs plus petits quand on voit toute la ville
    const sel = selectedRef.current;
    for (const m of [...list].sort((a, b) => b.rank - a.rank)) {
      const x = sx(m.x);
      const y = sy(m.z);
      if (x < -30 || x > v.w + 30 || y < -30 || y > v.h + 30) continue;
      const r = (m.rank === 0 ? 15 : m.rank === 1 ? 11 : 10) * ms;
      ctx.fillStyle = m.color;
      ctx.strokeStyle = sel && sel.id === m.id ? '#ffffff' : 'rgba(9,13,22,0.8)';
      ctx.lineWidth = sel && sel.id === m.id ? 3 : 1.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${Math.round(r * 1.1)}px sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(m.icon, x, y + 1);
      if (m.rank === 0 || showNames || (sel && sel.id === m.id)) {
        ctx.font = '700 11px sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(9,13,22,0.85)';
        ctx.fillStyle = '#fff';
        ctx.strokeText(m.name, x, y + r + 9);
        ctx.fillText(m.name, x, y + r + 9);
      }
    }

    if (snap) {
      // Autres joueurs
      ctx.fillStyle = '#22c55e';
      for (const r of snap.remotes) {
        ctx.beginPath();
        ctx.arc(sx(r.x), sy(r.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Toi : halo + flèche de cap (+z = sud, cap 0 vers le bas)
      const px = sx(snap.playerX);
      const py = sy(snap.playerZ);
      ctx.fillStyle = 'rgba(245,158,11,0.28)';
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI - snap.playerRotY);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(7, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [getSnapshot]);

  const requestDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  }, [draw]);

  const clampView = () => {
    const v = view.current;
    v.k = Math.min(v.kMax, Math.max(v.kMin, v.k));
    v.cx = Math.min(bounds.se.x, Math.max(bounds.nw.x, v.cx));
    v.cz = Math.min(bounds.se.z, Math.max(bounds.nw.z, v.cz));
  };

  const zoomAt = (factor: number, px: number, pz: number) => {
    const v = view.current;
    const wx = v.cx + (px - v.w / 2) / v.k;
    const wz = v.cz + (pz - v.h / 2) / v.k;
    v.k = Math.min(v.kMax, Math.max(v.kMin, v.k * factor));
    v.cx = wx - (px - v.w / 2) / v.k;
    v.cz = wz - (pz - v.h / 2) / v.k;
    clampView();
    requestDraw();
  };

  const goTo = (m: Marker) => {
    const snap = getSnapshot();
    if (!snap) return;
    const r = findRoute({ x: snap.playerX, z: snap.playerZ }, { x: m.x, z: m.z });
    setNoRoute(!r);
    onRouteChange(r ? { ...r, destName: m.name, destIcon: m.icon } : null);
    if (r) {
      // Cadre tout le trajet
      const xs = r.points.map((p) => p.x);
      const zs = r.points.map((p) => p.z);
      const v = view.current;
      const w = Math.max(...xs) - Math.min(...xs) + 400;
      const h = Math.max(...zs) - Math.min(...zs) + 400;
      v.cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      v.cz = (Math.max(...zs) + Math.min(...zs)) / 2;
      v.k = Math.min(v.w / w, v.h / h);
      clampView();
      requestDraw();
    }
  };

  const recenter = () => {
    const snap = getSnapshot();
    if (!snap) return;
    const v = view.current;
    v.cx = snap.playerX;
    v.cz = snap.playerZ;
    v.k = Math.max(v.k, 0.18);
    clampView();
    requestDraw();
  };

  // Taille du canvas (netteté écrans HD) + cadrage initial sur toute la ville
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const v = view.current;
      v.w = Math.max(100, r.width);
      v.h = Math.max(100, r.height);
      canvas.width = Math.round(v.w * dpr);
      canvas.height = Math.round(v.h * dpr);
      const fit = Math.min(v.w / MAP_W, v.h / MAP_H) * 0.96;
      v.kMin = fit * 0.8;
      v.kMax = 0.6;
      if (!v.fitted) {
        v.k = fit;
        v.cx = MAP_CX;
        v.cz = MAP_CZ;
        v.fitted = true;
      }
      clampView();
      requestDraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const timer = window.setInterval(requestDraw, 400); // suit ta position en direct
    return () => {
      ro.disconnect();
      window.clearInterval(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [requestDraw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    requestDraw();
  }, [selected, route, requestDraw]);

  // Gestes : un doigt déplace, deux doigts zooment, un appui court choisit un lieu
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startX: 0, startY: 0, pinchDist: 0 });

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { moved: 0, startX: p.x, startY: p.y, pinchDist: 0 };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = 99;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const v = view.current;
    if (pointers.current.size === 1) {
      gesture.current.moved = Math.max(gesture.current.moved, Math.hypot(p.x - gesture.current.startX, p.y - gesture.current.startY));
      if (gesture.current.moved > 6) {
        v.cx -= (p.x - prev.x) / v.k;
        v.cz -= (p.y - prev.y) / v.k;
        clampView();
        requestDraw();
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchDist > 0 && d > 0) zoomAt(d / gesture.current.pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      gesture.current.pinchDist = d;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (!wasSingle || gesture.current.moved > 6) return;
    // Appui court : lieu le plus proche dans 26 px
    const p = local(e);
    const v = view.current;
    let best: Marker | null = null;
    let bestD = 26;
    for (const m of markers.current) {
      const d = Math.hypot((m.x - v.cx) * v.k + v.w / 2 - p.x, (m.z - v.cz) * v.k + v.h / 2 - p.y) - (m.rank === 2 ? 0 : 3);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    setSelected(best);
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = local(e);
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  };

  return (
    <div className="fixed inset-0 z-[80] flex select-none items-center justify-center bg-ink-900/70 p-2 backdrop-blur-sm md:p-4" role="dialog" aria-modal="true" aria-label="Carte d’Abidjan">
      <div className="panel relative flex h-full max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b-2 border-cream-200 px-4 py-2 short:py-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-300 text-sun-600 short:h-7 short:w-7">
              <MapIcon className="h-4 w-4" />
            </span>
            <h2 className="truncate font-display text-lg font-semibold short:text-base">Carte d’Abidjan</h2>
          </div>
          <RoundIconButton tone="coral" size="sm" label="Fermer la carte" onClick={onClose}>
            <X className="h-4 w-4" />
          </RoundIconButton>
        </div>

        <div ref={wrapRef} className="relative min-h-0 flex-1 bg-ink-900">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
            onWheel={onWheel}
          />

          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <RoundIconButton tone="cream" size="sm" label="Zoomer" onClick={() => zoomAt(1.4, view.current.w / 2, view.current.h / 2)}>
              <Plus className="h-4 w-4" />
            </RoundIconButton>
            <RoundIconButton tone="cream" size="sm" label="Dézoomer" onClick={() => zoomAt(1 / 1.4, view.current.w / 2, view.current.h / 2)}>
              <Minus className="h-4 w-4" />
            </RoundIconButton>
            <RoundIconButton tone="sun" size="sm" label="Me retrouver" onClick={recenter}>
              <Crosshair className="h-4 w-4" />
            </RoundIconButton>
          </div>

          {selected && (
            <div className="absolute inset-x-2 bottom-2 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border-2 border-cream-200 bg-cream-50 px-3 py-2 shadow-lg">
              <span className="text-2xl">{selected.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink-800">{selected.name}</div>
                <div className="truncate text-xs text-ink-600">{shortDistrict(districtAt({ x: selected.x, z: selected.z }).name)}</div>
              </div>
              <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-sun-300 px-3 py-1.5 text-xs font-bold text-ink-900"
                  onClick={() => goTo(selected)}
                >
                  <Navigation className="h-3.5 w-3.5" /> Y aller
                </button>
              <button type="button" className="text-xs font-bold text-ink-400" onClick={() => setSelected(null)}>
                OK
              </button>
            </div>
          )}

          {noRoute && !route && (
            <div className="absolute inset-x-2 top-2 mx-auto max-w-xs rounded-2xl border-2 border-coral-300 bg-cream-50 px-3 py-1.5 text-center text-xs font-bold text-ink-800 shadow-lg">
              Pas de chemin trouvé vers ce lieu
            </div>
          )}
          {route && (
            <div className="absolute inset-x-2 top-2 mx-auto flex max-w-xs items-center gap-2 rounded-2xl border-2 border-sun-300 bg-cream-50 px-3 py-1.5 shadow-lg">
              <span className="text-xl">{route.destIcon ?? '📍'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink-800">{route.destName ?? 'Destination'}</div>
                <div className="truncate text-xs text-ink-600">
                  {route.distanceM >= 1000 ? `${(route.distanceM / 1000).toFixed(1)} km` : `${Math.round(route.distanceM)} m`}
                  {route.via.length > 0 ? ` · ${route.via.slice(0, 2).join(', ')}` : ''}
                </div>
              </div>
              <button type="button" className="text-xs font-bold text-coral-600" onClick={() => { onRouteChange(null); setNoRoute(false); }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
