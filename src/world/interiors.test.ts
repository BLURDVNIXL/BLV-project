import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERIORS, hitsInteriorBox, insideInterior, interiorToWorld } from './interiors';
import { HOSPITAL_SITES } from './hospitals';
import { SPECIAL_FOOTPRINTS, generateChunk, chunkOf } from './city';
import { DISTRICTS, districtAt, isOutsideMap, isWater } from './abidjanGeography';
import { COMMISSARIAT_SITES, HOTEL_SITES, MAIRIE_SITES } from './civicSites';
import { collectChunkDecor } from './chunkDecor';
import { project } from './geo';
import { exteriorSolidsFor } from './exteriorSolids';

const PHYS_HALF = 3072; // WORLD_HALF du moteur physique (physics.cpp)

function reachableFromEntry(d: (typeof INTERIORS)[keyof typeof INTERIORS]): Set<string> {
  const step = 0.25;
  const key = (i: number, j: number) => `${i},${j}`;
  const start = [Math.round(d.entry.x / step), Math.round(d.entry.z / step)];
  const seen = new Set([key(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [i, j] = queue.shift()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      const x = ni * step, z = nj * step;
      if (seen.has(key(ni, nj)) || !insideInterior(d, x, z) || hitsInteriorBox(d, x, z)) continue;
      seen.add(key(ni, nj));
      queue.push([ni, nj]);
    }
  }
  return seen;
}

test('les intérieurs sont hors de la carte, dans la grille physique et sans chevauchement (marge ≥ 10 m)', () => {
  const defs = Object.values(INTERIORS);
  for (const def of defs) {
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => interiorToWorld(def, sx * def.halfW, sz * def.halfD));
    for (const c of corners) {
      assert.ok(isOutsideMap(c), `${def.id} : coin dans la carte`);
      assert.ok(Math.abs(c.x) < PHYS_HALF - 10 && Math.abs(c.z) < PHYS_HALF - 10, `${def.id} : hors de la grille physique`);
    }
  }
  for (let i = 0; i < defs.length; i++) {
    for (let j = i + 1; j < defs.length; j++) {
      const a = defs[i], b = defs[j];
      const dx = Math.abs(a.origin.x - b.origin.x) - (a.halfW + b.halfW);
      const dz = Math.abs(a.origin.z - b.origin.z) - (a.halfD + b.halfD);
      assert.ok(dx >= 10 || dz >= 10, `${a.id} et ${b.id} trop proches`);
    }
  }
});

function interiorTargetPoints(d: (typeof INTERIORS)[keyof typeof INTERIORS]): Array<[string, { x: number; z: number }]> {
  return [
    ['entrée', d.entry],
    ['sortie', d.exit],
    ...(d.bed ? [['lit', d.bed] as [string, { x: number; z: number }]] : []),
    ...(d.actions ?? []).map((a) => [a.id, a] as [string, { x: number; z: number }]),
  ];
}

test('tous les intérieurs : porte ≥ 1,8 m, entrée, sortie et points utiles sont dans la salle et libres', () => {
  for (const d of Object.values(INTERIORS)) {
    for (const [name, p] of interiorTargetPoints(d)) {
      assert.ok(insideInterior(d, p.x, p.z), `${d.id}.${name} hors de la salle`);
      assert.ok(!hitsInteriorBox(d, p.x, p.z), `${d.id}.${name} dans un meuble ou un mur`);
    }
    // La zone « Sortir » ne doit pas se déclencher dès l'apparition
    assert.ok(Math.hypot(d.entry.x - d.exit.x, d.entry.z - d.exit.z) > d.exit.radius + 0.3, `${d.id} : sortie trop proche de l’entrée`);
    // La porte est assez large pour passer (≥ 1,8 m) : les deux pans du mur sud laissent un jour de doorWidth
    const south = d.boxes.filter((b) => b.kind === 'wall' && b.z === d.halfD);
    const gap = Math.min(...south.map((b) => Math.abs(b.x) - b.hx)) * 2;
    assert.ok(Math.abs(gap - d.doorWidth) < 1e-6 && gap >= 1.8, `${d.id} : porte de ${gap} m`);
  }
});

test('tous les intérieurs : tous les points utiles sont atteignables à pied depuis l’entrée', () => {
  const step = 0.25;
  const key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
  for (const d of Object.values(INTERIORS)) {
    const seen = reachableFromEntry(d);
    for (const [name, p] of interiorTargetPoints(d)) {
      if (name === 'entrée') continue;
      assert.ok(seen.has(key(p.x, p.z)), `${d.id}.${name} inaccessible depuis l’entrée`);
    }
  }
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

test('Maquis Le Temple a une emprise sur la carte et une porte libre hors de l’eau et hors des autres bâtiments', () => {
  const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'maquis');
  assert.ok(fp, 'maquis : pas d’emprise dans SPECIAL_FOOTPRINTS');
  assert.ok(fp.w >= 14 && fp.d >= 10, `maquis : emprise trop petite (${fp.w}×${fp.d})`);
  assert.ok(!isWater({ x: fp.x, z: fp.z }), 'maquis : dans l’eau');
  const door = { x: fp.x - Math.sin(fp.angle) * (fp.d / 2 + 2.4), z: fp.z + Math.cos(fp.angle) * (fp.d / 2 + 2.4) };
  const out = { x: fp.x - Math.sin(fp.angle) * (fp.d / 2 + 3.8), z: fp.z + Math.cos(fp.angle) * (fp.d / 2 + 3.8) };
  for (const p of [door, out]) {
    assert.ok(!isWater(p), 'maquis : porte ou sortie dans l’eau');
    const cx = chunkOf(p.x), cz = chunkOf(p.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const b of generateChunk(cx + dx, cz + dz).buildings) {
        if (!b.solid || b.landmark === 'maquis') continue;
        const c = Math.cos(b.angle), s = Math.sin(b.angle);
        const ox = p.x - b.x, oz = p.z - b.z;
        const lx = ox * c + oz * s, lz = -ox * s + oz * c;
        assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `maquis : passage bloqué par ${b.id}`);
      }
    }
  }
});

test('Marché d’Adjamé a une grande halle, une porte libre et un poste commerce extérieur accessible hors du bâtiment', () => {
  const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame');
  assert.ok(fp, 'marche_adjame : pas d’emprise dans SPECIAL_FOOTPRINTS');
  assert.ok(fp.w >= 24 && fp.d >= 14, `marche_adjame : halle trop petite (${fp.w}×${fp.d})`);
  assert.ok(!isWater({ x: fp.x, z: fp.z }), 'marche_adjame : dans l’eau');
  const vx = -Math.sin(fp.angle), vz = Math.cos(fp.angle);
  const door = { x: fp.x + vx * (fp.d / 2 + 2.4), z: fp.z + vz * (fp.d / 2 + 2.4) };
  const out = { x: fp.x + vx * (fp.d / 2 + 3.8), z: fp.z + vz * (fp.d / 2 + 3.8) };
  const workOut = { x: fp.x + vx * (fp.d / 2 + 10.5), z: fp.z + vz * (fp.d / 2 + 10.5) };
  for (const [name, p] of [['porte', door], ['sortie', out], ['commerce extérieur', workOut]] as const) {
    assert.ok(!isWater(p), `marche_adjame.${name} dans l’eau`);
    const cx = chunkOf(p.x), cz = chunkOf(p.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const b of generateChunk(cx + dx, cz + dz).buildings) {
        if (!b.solid) continue;
        const c = Math.cos(b.angle), s = Math.sin(b.angle);
        const ox = p.x - b.x, oz = p.z - b.z;
        const lx = ox * c + oz * s, lz = -ox * s + oz * c;
        assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `marche_adjame.${name} bloqué par ${b.id}`);
      }
    }
  }
});

test('Mairie du Plateau a une emprise sur la carte et une porte libre hors de l’eau et hors des autres bâtiments', () => {
  const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'mairie');
  assert.ok(fp, 'mairie : pas d’emprise dans SPECIAL_FOOTPRINTS');
  assert.ok(fp.w >= 14 && fp.d >= 10, `mairie : emprise trop petite (${fp.w}×${fp.d})`);
  assert.ok(!isWater({ x: fp.x, z: fp.z }), 'mairie : dans l’eau');
  const vx = -Math.sin(fp.angle), vz = Math.cos(fp.angle);
  const door = { x: fp.x + vx * (fp.d / 2 + 2.4), z: fp.z + vz * (fp.d / 2 + 2.4) };
  const out = { x: fp.x + vx * (fp.d / 2 + 3.8), z: fp.z + vz * (fp.d / 2 + 3.8) };
  for (const [name, p] of [['porte', door], ['sortie', out]] as const) {
    assert.ok(!isWater(p), `mairie.${name} dans l’eau`);
    const cx = chunkOf(p.x), cz = chunkOf(p.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const b of generateChunk(cx + dx, cz + dz).buildings) {
        if (!b.solid) continue;
        const c = Math.cos(b.angle), s = Math.sin(b.angle);
        const ox = p.x - b.x, oz = p.z - b.z;
        const lx = ox * c + oz * s, lz = -ox * s + oz * c;
        assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `mairie.${name} bloqué par ${b.id}`);
      }
    }
  }
});

test('les 3 lycées ont une emprise sur la carte et une porte libre hors de l’eau et hors des autres bâtiments', () => {
  for (const id of ['lycee_caiman', 'lycee_alysma', 'lycee_alex'] as const) {
    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === id);
    assert.ok(fp, `${id} : pas d’emprise dans SPECIAL_FOOTPRINTS`);
    assert.ok(fp.w >= 18 && fp.d >= 10, `${id} : emprise trop petite (${fp.w}×${fp.d})`);
    assert.ok(!isWater({ x: fp.x, z: fp.z }), `${id} : dans l’eau`);
    const vx = -Math.sin(fp.angle), vz = Math.cos(fp.angle);
    const door = { x: fp.x + vx * (fp.d / 2 + 2.4), z: fp.z + vz * (fp.d / 2 + 2.4) };
    const out = { x: fp.x + vx * (fp.d / 2 + 3.8), z: fp.z + vz * (fp.d / 2 + 3.8) };
    for (const [name, p] of [['porte', door], ['sortie', out]] as const) {
      assert.ok(!isWater(p), `${id}.${name} dans l’eau`);
      const cx = chunkOf(p.x), cz = chunkOf(p.z);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        for (const b of generateChunk(cx + dx, cz + dz).buildings) {
          if (!b.solid) continue;
          const c = Math.cos(b.angle), s = Math.sin(b.angle);
          const ox = p.x - b.x, oz = p.z - b.z;
          const lx = ox * c + oz * s, lz = -ox * s + oz * c;
          assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `${id}.${name} bloqué par ${b.id}`);
        }
      }
    }
  }
});


test('chaque commune urbaine possède 1 mairie et 2 commissariats accessibles (hors eau, routes, autres bâtiments et solides extérieurs)', () => {
  const urbanDistricts = DISTRICTS.filter((d) => d.id !== 'banco').map((d) => d.id);
  const allMairies = [
    { id: 'mairie', districtId: 'plateau', name: 'Mairie du Plateau', solidId: 'mairie' as const },
    ...MAIRIE_SITES.map((s) => ({ ...s, solidId: 'mairie' as const })),
  ];
  assert.equal(allMairies.length, urbanDistricts.length);
  assert.equal(COMMISSARIAT_SITES.length, urbanDistricts.length * 2);

  for (const distId of urbanDistricts) {
    assert.equal(allMairies.filter((m) => m.districtId === distId).length, 1, `${distId} : 1 mairie`);
    assert.equal(COMMISSARIAT_SITES.filter((c) => c.districtId === distId).length, 2, `${distId} : 2 commissariats`);
  }

  const allCivic = [
    ...allMairies,
    ...COMMISSARIAT_SITES.map((s) => ({ ...s, solidId: 'commissariat' as const })),
  ];
  for (const site of allCivic) {
    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === site.id);
    assert.ok(fp, `${site.id} : pas d’emprise dans SPECIAL_FOOTPRINTS`);
    assert.equal(districtAt({ x: fp.x, z: fp.z }).id, site.districtId, `${site.id} : mauvaise commune`);
    assert.ok(fp.w >= 14 && fp.d >= 10, `${site.id} : emprise trop petite (${fp.w}×${fp.d})`);
    assert.ok(!isWater({ x: fp.x, z: fp.z }), `${site.id} : dans l’eau`);
    const vx = -Math.sin(fp.angle), vz = Math.cos(fp.angle);
    const door = { x: fp.x + vx * (fp.d / 2 + 2.4), z: fp.z + vz * (fp.d / 2 + 2.4) };
    const out = { x: fp.x + vx * (fp.d / 2 + 3.8), z: fp.z + vz * (fp.d / 2 + 3.8) };
    const solids = exteriorSolidsFor(site.solidId, fp.x, fp.z, -fp.angle, fp.w, fp.d);
    for (const [name, p] of [['porte', door], ['sortie', out]] as const) {
      assert.ok(!isWater(p), `${site.id}.${name} dans l’eau`);
      for (const s of solids) {
        if (s.shape === 'circle') {
          assert.ok(Math.hypot(p.x - s.x, p.z - s.z) >= s.r + 0.45, `${site.id}.${name} bloqué par solide extérieur`);
        } else {
          const c = Math.cos(-s.angle), sn = Math.sin(-s.angle);
          const ox = p.x - s.x, oz = p.z - s.z;
          const lx = ox * c + oz * sn, lz = -ox * sn + oz * c;
          assert.ok(!(Math.abs(lx) < s.hx + 0.45 && Math.abs(lz) < s.hz + 0.45), `${site.id}.${name} bloqué par pilier`);
        }
      }
      const cx = chunkOf(p.x), cz = chunkOf(p.z);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        for (const b of generateChunk(cx + dx, cz + dz).buildings) {
          if (!b.solid) continue;
          const c = Math.cos(b.angle), s = Math.sin(b.angle);
          const ox = p.x - b.x, oz = p.z - b.z;
          const lx = ox * c + oz * s, lz = -ox * s + oz * c;
          assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `${site.id}.${name} bloqué par ${b.id}`);
        }
      }
    }
  }
});

test('Grand Hôtel Ivoire, 13 petits hôtels (1 par commune), Cathédrale, Palais de la Culture et Aéroport ont une porte dégagée', () => {
  const urbanDistricts = DISTRICTS.filter((d) => d.id !== 'banco').map((d) => d.id);
  assert.equal(HOTEL_SITES.length, urbanDistricts.length);
  for (const distId of urbanDistricts) {
    assert.equal(HOTEL_SITES.filter((h) => h.districtId === distId).length, 1, `${distId} : 1 petit hôtel`);
  }

  const sites: Array<{ id: string; districtId?: string; solidId: 'hotel_ivoire' | 'petit_hotel' | 'palais_culture' | 'aeroport' | null }> = [
    { id: 'hotel_ivoire', districtId: 'cocody', solidId: 'hotel_ivoire' },
    { id: 'cathedrale', districtId: 'plateau', solidId: null },
    { id: 'palais_culture', districtId: 'treichville', solidId: 'palais_culture' },
    { id: 'aeroport', solidId: 'aeroport' },
    ...HOTEL_SITES.map((s) => ({ id: s.id, districtId: s.districtId, solidId: 'petit_hotel' as const })),
  ];

  for (const site of sites) {
    const fp = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === site.id);
    assert.ok(fp, `${site.id} : pas d’emprise dans SPECIAL_FOOTPRINTS`);
    if (site.districtId) {
      assert.equal(districtAt({ x: fp.x, z: fp.z }).id, site.districtId, `${site.id} : mauvaise commune`);
    }
    assert.ok(!isWater({ x: fp.x, z: fp.z }), `${site.id} : dans l’eau`);
    const vx = -Math.sin(fp.angle), vz = Math.cos(fp.angle);
    const door = { x: fp.x + vx * (fp.d / 2 + 2.4), z: fp.z + vz * (fp.d / 2 + 2.4) };
    const out = { x: fp.x + vx * (fp.d / 2 + 3.8), z: fp.z + vz * (fp.d / 2 + 3.8) };
    const solids = site.solidId ? exteriorSolidsFor(site.solidId, fp.x, fp.z, -fp.angle, fp.w, fp.d) : [];

    for (const [name, p] of [['porte', door], ['sortie', out]] as const) {
      assert.ok(!isWater(p), `${site.id}.${name} dans l’eau`);
      for (const s of solids) {
        if (s.shape === 'circle') {
          assert.ok(Math.hypot(p.x - s.x, p.z - s.z) >= s.r + 0.45, `${site.id}.${name} bloqué par solide extérieur`);
        } else {
          const c = Math.cos(-s.angle), sn = Math.sin(-s.angle);
          const ox = p.x - s.x, oz = p.z - s.z;
          const lx = ox * c + oz * sn, lz = -ox * sn + oz * c;
          assert.ok(!(Math.abs(lx) < s.hx + 0.45 && Math.abs(lz) < s.hz + 0.45), `${site.id}.${name} bloqué par pilier`);
        }
      }
      const cx = chunkOf(p.x), cz = chunkOf(p.z);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        for (const b of generateChunk(cx + dx, cz + dz).buildings) {
          if (!b.solid) continue;
          const c = Math.cos(b.angle), s = Math.sin(b.angle);
          const ox = p.x - b.x, oz = p.z - b.z;
          const lx = ox * c + oz * s, lz = -ox * s + oz * c;
          assert.ok(!(Math.abs(lx) < b.w / 2 + 0.6 && Math.abs(lz) < b.d / 2 + 0.6), `${site.id}.${name} bloqué par ${b.id}`);
        }
      }
    }
  }
});

test('les boutiques, supérettes, salons de coiffure et maquis de quartier exposent une porte libre', () => {
  const seenKinds = new Set<string>();
  for (const distId of ['yopougon', 'adjame', 'cocody', 'treichville', 'abobo']) {
    const d = DISTRICTS.find((x) => x.id === distId)!;
    const c = project(d.center.lat, d.center.lon);
    const ccx = chunkOf(c.x), ccz = chunkOf(c.z);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const plan = collectChunkDecor(generateChunk(ccx + dx, ccz + dz));
      for (const v of plan.venues) {
        if (v.kind !== 'boutique' && v.kind !== 'superette' && v.kind !== 'coiffure' && v.kind !== 'maquis_quartier') continue;
        seenKinds.add(v.kind);
        assert.ok(v.doorX !== undefined && v.doorZ !== undefined && v.outX !== undefined && v.outZ !== undefined && v.outRotY !== undefined, `${v.kind} : porte manquante`);
        for (const [label, pt] of [['door', { x: v.doorX!, z: v.doorZ! }], ['out', { x: v.outX!, z: v.outZ! }]] as const) {
          assert.ok(!isWater(pt), `${v.kind}.${label} dans l’eau`);
          for (const s of plan.solids) {
            if (s.shape === 'circle') {
              assert.ok(Math.hypot(pt.x - s.x, pt.z - s.z) >= s.r + 0.35, `${v.kind}.${label} bloqué par solide circulaire`);
            } else {
              const cs = Math.cos(-s.angle), sn = Math.sin(-s.angle);
              const ox = pt.x - s.x, oz = pt.z - s.z;
              const lx = ox * cs + oz * sn, lz = -ox * sn + oz * cs;
              assert.ok(!(Math.abs(lx) < s.hx + 0.35 && Math.abs(lz) < s.hz + 0.35), `${v.kind}.${label} bloqué par solide boîte`);
            }
          }
        }
      }
    }
  }
  for (const k of ['boutique', 'superette', 'coiffure', 'maquis_quartier']) {
    assert.ok(seenKinds.has(k), `${k} : aucun échantillon trouvé`);
  }
});
