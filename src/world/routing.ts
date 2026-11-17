/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Itinéraire : plus court chemin sur le réseau des grands axes et des ponts (Dijkstra).
 * Le départ et l'arrivée se raccordent au point le plus proche d'un axe (tronçon « dernier mètre » en ligne droite).
 */

import { Vec2, distanceToSegment, realDistance } from './geo';
import { ARTERIALS } from './roads';

export interface Route {
  /** Points du chemin, du départ à l'arrivée. */
  points: Vec2[];
  /** Longueur réelle (m), échelle 1:1. */
  distanceM: number;
  /** Noms des axes empruntés, dans l'ordre (sans doublon consécutif). */
  via: string[];
  /** Renseignés par l'écran de la carte : nom et icône de la destination. */
  destName?: string;
  destIcon?: string;
}

interface Edge { to: number; w: number; name: string }

const nodes: Vec2[] = [];
const adj: Edge[][] = [];
const segments: Array<{ a: number; b: number; name: string }> = [];

const SNAP = 1; // m de jeu : deux points plus proches que ça sont le même carrefour

function nodeAt(p: Vec2): number {
  for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - p.x, nodes[i].z - p.z) < SNAP) return i;
  nodes.push({ x: p.x, z: p.z });
  adj.push([]);
  return nodes.length - 1;
}

const len = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

for (const art of ARTERIALS) {
  for (let i = 0; i < art.points.length - 1; i++) {
    const a = nodeAt(art.points[i]);
    const b = nodeAt(art.points[i + 1]);
    if (a === b) continue;
    const w = len(nodes[a], nodes[b]);
    adj[a].push({ to: b, w, name: art.name });
    adj[b].push({ to: a, w, name: art.name });
    segments.push({ a, b, name: art.name });
  }
}

/** Les axes qui se croisent en plein milieu de tronçon sont reliés par un nœud commun. */
function connectCrossings() {
  const orig = segments.slice();
  for (let i = 0; i < orig.length; i++) {
    for (let j = i + 1; j < orig.length; j++) {
      const s = orig[i];
      const t = orig[j];
      if (s.a === t.a || s.a === t.b || s.b === t.a || s.b === t.b) continue;
      const p = intersect(nodes[s.a], nodes[s.b], nodes[t.a], nodes[t.b]);
      if (!p) continue;
      const n = nodeAt(p);
      for (const seg of [s, t]) {
        for (const end of [seg.a, seg.b]) {
          if (end === n) continue;
          const w = len(nodes[end], nodes[n]);
          if (w < SNAP) continue;
          adj[end].push({ to: n, w, name: seg.name });
          adj[n].push({ to: end, w, name: seg.name });
        }
      }
    }
  }
}

function intersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const d = (p2.x - p1.x) * (p4.z - p3.z) - (p2.z - p1.z) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3.x - p1.x) * (p4.z - p3.z) - (p3.z - p1.z) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.z - p1.z) - (p3.z - p1.z) * (p2.x - p1.x)) / d;
  if (t <= 0.001 || t >= 0.999 || u <= 0.001 || u >= 0.999) return null;
  return { x: p1.x + t * (p2.x - p1.x), z: p1.z + t * (p2.z - p1.z) };
}
connectCrossings();

/** Point du réseau le plus proche de p : tronçon, position sur le tronçon et distance. */
function nearestOnNetwork(p: Vec2): { seg: number; t: number; dist: number; at: Vec2 } {
  let best = { seg: 0, t: 0, dist: Infinity, at: nodes[0] };
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const { dist, t } = distanceToSegment(p, nodes[s.a], nodes[s.b]);
    if (dist < best.dist) {
      best = { seg: i, t, dist, at: { x: nodes[s.a].x + (nodes[s.b].x - nodes[s.a].x) * t, z: nodes[s.a].z + (nodes[s.b].z - nodes[s.a].z) * t } };
    }
  }
  return best;
}

/** Point du réseau des grands axes (et ponts) le plus proche de p ; sert à déposer un joueur sur la route. */
export function nearestRoadPoint(p: Vec2): { at: Vec2; dist: number } {
  const q = nearestOnNetwork(p);
  return { at: { x: q.at.x, z: q.at.z }, dist: q.dist };
}

/** Itinéraire de `from` à `to` ; null si les deux points sont identiques ou si aucun chemin n'existe. */
export function findRoute(from: Vec2, to: Vec2): Route | null {
  if (len(from, to) < 2) return null;
  const n = nodes.length;
  const S = n; // départ virtuel
  const T = n + 1; // arrivée virtuelle
  const extra = new Map<number, Edge[]>();
  const link = (u: number, v: number, w: number, name: string) => {
    if (!extra.has(u)) extra.set(u, []);
    if (!extra.has(v)) extra.set(v, []);
    extra.get(u)!.push({ to: v, w, name });
    extra.get(v)!.push({ to: u, w, name });
  };
  const pos = (i: number): Vec2 => (i === S ? a0.at : i === T ? b0.at : nodes[i]);

  const a0 = nearestOnNetwork(from);
  const b0 = nearestOnNetwork(to);
  const attach = (v: number, q: ReturnType<typeof nearestOnNetwork>) => {
    const s = segments[q.seg];
    link(v, s.a, len(q.at, nodes[s.a]), s.name);
    link(v, s.b, len(q.at, nodes[s.b]), s.name);
  };
  attach(S, a0);
  attach(T, b0);
  if (a0.seg === b0.seg) link(S, T, len(a0.at, b0.at), segments[a0.seg].name);

  const dist = new Array<number>(n + 2).fill(Infinity);
  const prev = new Array<{ from: number; name: string } | null>(n + 2).fill(null);
  const done = new Array<boolean>(n + 2).fill(false);
  dist[S] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n + 2; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === T) break;
    done[u] = true;
    const edges = [...(u < n ? adj[u] : []), ...(extra.get(u) ?? [])];
    for (const e of edges) {
      if (dist[u] + e.w < dist[e.to]) {
        dist[e.to] = dist[u] + e.w;
        prev[e.to] = { from: u, name: e.name };
      }
    }
  }
  if (!isFinite(dist[T])) return null;

  const chain: number[] = [];
  const names: string[] = [];
  for (let c = T; c !== S; ) {
    chain.push(c);
    const p = prev[c]!;
    names.push(p.name);
    c = p.from;
  }
  chain.push(S);
  chain.reverse();
  names.reverse();

  const points: Vec2[] = [{ x: from.x, z: from.z }, ...chain.map(pos), { x: to.x, z: to.z }];
  const clean = points.filter((p, i) => i === 0 || len(p, points[i - 1]) > 0.01);
  let total = 0;
  for (let i = 1; i < clean.length; i++) total += realDistance(clean[i - 1], clean[i]);
  const via = names.filter((nm, i) => i === 0 || nm !== names[i - 1]);
  return { points: clean, distanceM: total, via };
}

/** Distance à vol d'oiseau (m de jeu) entre p et l'arrivée ; sert à savoir si l'on est arrivé. */
export function distanceToRouteEnd(p: Vec2, route: Route): number {
  const end = route.points[route.points.length - 1];
  return len(p, end);
}
