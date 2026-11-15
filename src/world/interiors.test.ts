import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERIORS, hitsInteriorBox, insideInterior, interiorToWorld } from './interiors';
import { HOSPITAL_SITES } from './hospitals';
import { SPECIAL_FOOTPRINTS, generateChunk, chunkOf } from './city';
import { isOutsideMap, isWater } from './abidjanGeography';

const PHYS_HALF = 3072; // WORLD_HALF du moteur physique (physics.cpp)

test('les intérieurs sont hors de la carte mais dans la grille physique', () => {
  for (const def of Object.values(INTERIORS)) {
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => interiorToWorld(def, sx * def.halfW, sz * def.halfD));
    for (const c of corners) {
      assert.ok(isOutsideMap(c), `${def.id} : coin dans la carte`);
      assert.ok(Math.abs(c.x) < PHYS_HALF && Math.abs(c.z) < PHYS_HALF, `${def.id} : hors de la grille physique`);
    }
  }
});

test('hôpital : entrée, sortie et lit sont dans la salle et libres de meubles', () => {
  const d = INTERIORS.hopital;
  for (const [name, p] of [['entrée', d.entry], ['sortie', d.exit], ['lit', d.bed]] as const) {
    assert.ok(insideInterior(d, p.x, p.z), `${name} hors de la salle`);
    assert.ok(!hitsInteriorBox(d, p.x, p.z), `${name} dans un meuble ou un mur`);
  }
  // La zone « Sortir » ne doit pas se déclencher dès l'apparition
  assert.ok(Math.hypot(d.entry.x - d.exit.x, d.entry.z - d.exit.z) > d.exit.radius + 0.3);
  // La porte est assez large pour passer (≥ 1,8 m) : les deux pans du mur sud laissent un jour de doorWidth
  const south = d.boxes.filter((b) => b.kind === 'wall' && b.z === d.halfD);
  const gap = Math.min(...south.map((b) => Math.abs(b.x) - b.hx)) * 2;
  assert.ok(Math.abs(gap - d.doorWidth) < 1e-6 && gap >= 1.8, `porte de ${gap} m`);
});

test('hôpital : on peut aller de l’entrée au lit 1 (passage à l’est de la cloison)', () => {
  const d = INTERIORS.hopital;
  // grille de 0,25 m, rayon 0,35 : remplissage 4-voisins
  const step = 0.25;
  const key = (i: number, j: number) => `${i},${j}`;
  const start = [Math.round(d.entry.x / step), Math.round(d.entry.z / step)];
  const goal = [Math.round(d.bed.x / step), Math.round(d.bed.z / step)];
  const seen = new Set([key(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [i, j] = queue.shift()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      const x = ni * step, z = nj * step;
      if (seen.has(key(ni, nj)) || !insideInterior(d, x, z) || hitsInteriorBox(d, x, z)) continue;
      seen.add(key(ni, nj)); queue.push([ni, nj]);
    }
  }
  assert.ok(seen.has(key(goal[0], goal[1])), 'le lit 1 est inaccessible depuis l’entrée');
});

test('chaque hôpital a une emprise sur la carte, une porte accessible hors de l’eau et hors des autres bâtiments', () => {
  for (const site of HOSPITAL_SITES) {
    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === site.id);
    assert.ok(fp, `${site.id} : pas d'emprise`);
    assert.ok(fp.w >= 14 && fp.d >= 10, `${site.id} : emprise trop petite (${fp.w}×${fp.d})`);
    assert.ok(!isWater({ x: fp.x, z: fp.z }), `${site.id} : dans l'eau`);
    const door = { x: fp.x - Math.sin(fp.angle) * (fp.d / 2 + 2.2), z: fp.z + Math.cos(fp.angle) * (fp.d / 2 + 2.2) };
    assert.ok(!isWater(door), `${site.id} : porte dans l'eau`);
    const cx = chunkOf(door.x), cz = chunkOf(door.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const b of generateChunk(cx + dx, cz + dz).buildings) {
        if (!b.solid || b.landmark === site.id) continue;
        const c = Math.cos(b.angle), s = Math.sin(b.angle);
        const ox = door.x - b.x, oz = door.z - b.z;
        const lx = ox * c + oz * s, lz = -ox * s + oz * c;
        assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `${site.id} : porte bloquée par ${b.id}`);
      }
    }
  }
});
