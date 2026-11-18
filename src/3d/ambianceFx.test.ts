import test from 'node:test';
import assert from 'node:assert/strict';
import { LAGOON_BUOYS, LAGOON_ROUTES } from './waterTraffic';
import { weatherFxMode } from './weatherFx';
import { createMaquisStructure, createMarketStallCluster } from './models';
import { isOpenWater } from '../world/roads';
import { bakeGround, groundColor, prepareTerrain } from '../world/terrain';
import { chunkOf, generateChunk } from '../world/city';
import { project } from '../world/geo';

test('toutes les routes lagunaires et bouées restent en eau libre (hors ponts et terre)', () => {
  assert.ok(LAGOON_ROUTES.length >= 6);
  assert.ok(LAGOON_BUOYS.length >= 8);
  for (const r of LAGOON_ROUTES) {
    for (let i = 0; i < r.waypoints.length; i++) {
      const [ax, az] = r.waypoints[i];
      const [bx, bz] = r.waypoints[(i + 1) % r.waypoints.length];
      for (let s = 0; s <= 24; s++) {
        const t = s / 24;
        const p = { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
        assert.ok(isOpenWater(p), `route ${r.id} hors eau libre à (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
      }
    }
  }
  for (const b of LAGOON_BUOYS) {
    assert.ok(isOpenWater({ x: b.x, z: b.z }), `bouée ${b.id} hors eau libre`);
  }
});

test('weatherFxMode sélectionne pluie, harmattan, lucioles nocturnes ou repos', () => {
  assert.equal(weatherFxMode('pluie', false, 'plateau'), 'rain');
  assert.equal(weatherFxMode('pluie', true, 'banco'), 'rain');
  assert.equal(weatherFxMode('inondation', false, 'koumassi'), 'rain');
  assert.equal(weatherFxMode('harmattan', false, 'abobo'), 'harmattan');
  assert.equal(weatherFxMode('harmattan', true, 'cocody'), 'harmattan');
  assert.equal(weatherFxMode('soleil', true, 'banco'), 'fireflies');
  assert.equal(weatherFxMode('soleil', true, 'plateau'), 'fireflies');
  assert.equal(weatherFxMode('soleil', false, 'plateau'), 'none');
});

test('terrain : trottoirs, terre-pleins, forêt du Banco et plage produisent des RGB valides', () => {
  const spots = [
    project(5.3258, -4.0185), // Plateau
    project(5.385, -4.05),    // Banco
    project(5.235, -3.91),    // Grand-Bassam littoral
  ];
  for (const pt of spots) {
    const cx = chunkOf(pt.x);
    const cz = chunkOf(pt.z);
    const ctx = prepareTerrain(cx, cz);
    const rgb = groundColor(ctx, pt);
    assert.equal(rgb.length, 3);
    for (const c of rgb) assert.ok(Number.isFinite(c) && c >= 0 && c <= 255);
    const baked = bakeGround(cx, cz, 32);
    assert.equal(baked.length, 32 * 32 * 4);
    const chunk = generateChunk(cx, cz);
    assert.equal(chunk.cx, cx);
    assert.equal(chunk.cz, cz);
  }
});

test('maquis et marché d Adjamé incluent le mobilier enrichi (brasero, tabourets, sacs)', () => {
  const maquis = createMaquisStructure();
  // Ancien compte : ~19 meshes ; enrichi avec 4 tabourets + brasero (socle, braises, grille) >= 26
  assert.ok(maquis.children.length >= 26, `maquis enfants=${maquis.children.length}`);
  const market = createMarketStallCluster();
  assert.ok(market.children.length >= 24, `marché enfants=${market.children.length}`);
});

import * as THREE from 'three';
import { StreetAnimSystem } from './streetAnim';

test('StreetAnimSystem crée oiseaux, papillons et feux tricolores sans erreur', () => {
  const scene = new THREE.Scene();
  const sys = new StreetAnimSystem(scene, false);
  assert.ok(scene.children.length >= 16, `enfants StreetAnimSystem=${scene.children.length}`);
  sys.update(3.5, 0, 0, true, false, false);
  sys.update(8.2, 0, 0, true, true, true);
  sys.dispose();
  assert.equal(scene.children.length, 0);
});

test('terrain Abobo rue locale : trottoir, bordure et passage piéton distincts', () => {
  const abobo = project(5.415, -4.02);
  const ctx = prepareTerrain(chunkOf(abobo.x), chunkOf(abobo.z));
  const colors = new Set<string>();
  for (let dx = -30; dx <= 30; dx += 2) {
    for (let dz = -30; dz <= 30; dz += 2) {
      const rgb = groundColor(ctx, { x: abobo.x + dx, z: abobo.z + dz });
      colors.add(rgb.map((c) => Math.round(c / 20)).join(','));
    }
  }
  assert.ok(colors.size >= 3, `variété de couleurs sol Abobo=${colors.size}`);
});
