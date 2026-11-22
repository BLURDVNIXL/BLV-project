import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  ATLAS_CELLS,
  LUNAR_CYCLE_DAYS,
  SUN_SPRITE_MIN_Y,
  celestialState,
  moonPick,
  nightIndex,
  sunFramePosition,
  sunPick,
  sunRaysStrength,
  sunSpriteDirection,
} from './celestial';

test('soleil : image sombre au lever et au coucher, la plus éclatante vers midi', () => {
  assert.equal(sunFramePosition(5), 0);
  assert.equal(sunFramePosition(6), 0);
  assert.equal(sunFramePosition(19), 7);
  const noon = sunFramePosition(12.5);
  assert.ok(Math.abs(noon - 4.5) < 1e-9);
  let prev = -1;
  for (let h = 6; h <= 12.5; h += 0.1) {
    const p = sunFramePosition(h);
    assert.ok(p >= prev - 1e-9, 'croît jusqu\'à midi');
    prev = p;
  }
  for (let h = 0; h < 24; h += 0.25) {
    const { a, b, mix } = sunPick(h);
    assert.ok(a >= 0 && b < ATLAS_CELLS && b === a + 1 && mix >= 0 && mix <= 1, `case valide à ${h} h`);
  }
});

test('lune : une phase par tranche du cycle, cycle périodique, fondu seulement en fin de phase', () => {
  const seen = new Set<number>();
  for (let n = 0; n < LUNAR_CYCLE_DAYS; n++) {
    const p = moonPick(n);
    assert.ok(p.a >= 0 && p.a < ATLAS_CELLS && p.b === (p.a + 1) % ATLAS_CELLS && p.mix >= 0 && p.mix <= 1);
    seen.add(p.a);
  }
  assert.equal(seen.size, ATLAS_CELLS, 'les 8 phases apparaissent');
  assert.deepEqual(moonPick(3), moonPick(3 + LUNAR_CYCLE_DAYS));
  assert.deepEqual(moonPick(0), { a: 0, b: 1, mix: 0 }, 'départ : nouvelle lune');
  assert.equal(moonPick(LUNAR_CYCLE_DAYS / 2).a, 4, 'milieu du cycle : pleine lune');
  assert.equal(moonPick(-1).a, moonPick(LUNAR_CYCLE_DAYS - 1).a);
});

test('numéro de nuit : après minuit, on reste sur la nuit commencée la veille', () => {
  assert.equal(nightIndex(22, 5), 5);
  assert.equal(nightIndex(2, 5), 4);
  assert.equal(nightIndex(2, 0), 0);
  assert.equal(nightIndex(14, 7), 7);
  assert.equal(nightIndex(22, Number.NaN), 0);
});

test('soleil dessiné : va d\'est en ouest et frôle l\'horizon sans passer dessous', () => {
  const dawn = sunSpriteDirection(6);
  const noon = sunSpriteDirection(12.5);
  const dusk = sunSpriteDirection(19);
  assert.ok(dawn.x > 0.9 && dusk.x < -0.9);
  assert.ok(noon.y > 0.9);
  for (let h = 0; h < 24; h += 0.25) assert.ok(sunSpriteDirection(h).y >= SUN_SPRITE_MIN_Y * 0.9);
});

test('ciel : soleil le jour, lune la nuit, fondu entre les deux, météo qui voile', () => {
  const day = celestialState(12, 3);
  assert.equal(day.sunAlpha, 1);
  assert.equal(day.moonAlpha, 0);
  const night = celestialState(23, 3);
  assert.equal(night.sunAlpha, 0);
  assert.equal(night.moonAlpha, 1);
  const dusk = celestialState(19.8, 3);
  assert.ok(dusk.sunAlpha > 0 && dusk.moonAlpha > 0);
  assert.ok(Math.abs(dusk.sunAlpha + dusk.moonAlpha - 1) < 1e-9);
  const rain = celestialState(12, 3, 0.12);
  assert.ok(Math.abs(rain.sunAlpha - 0.12) < 1e-9);
  assert.equal(celestialState(12, 3, 5).sunAlpha, 1, 'visibilité bornée');
});

test('planches du ciel présentes dans public/sky', () => {
  assert.ok(existsSync('public/sky/sun_atlas.webp'));
  assert.ok(existsSync('public/sky/moon_atlas.webp'));
});

test('rayons de soleil : plus marqués quand le soleil est bas, toujours bornés', () => {
  let prev = Infinity;
  for (let y = 0; y <= 1.0001; y += 0.05) {
    const k = sunRaysStrength(y);
    assert.ok(k > 0 && k <= 0.45, `force hors limites à y=${y}`);
    assert.ok(k <= prev + 1e-9, 'décroît quand le soleil monte');
    prev = k;
  }
  assert.ok(sunRaysStrength(0.05) > 2 * sunRaysStrength(1));
  assert.ok(Number.isFinite(sunRaysStrength(-3)) && Number.isFinite(sunRaysStrength(9)));
});
