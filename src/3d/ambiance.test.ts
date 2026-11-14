import test from 'node:test';
import assert from 'node:assert/strict';
import { AMBIENT_KEYS, MIN_SUN_Y, daylight, sampleAmbient, sunDirection, wrapHours } from './ambiance';

const dist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

test('les images clés couvrent 0 h → 24 h, dans l\'ordre', () => {
  assert.equal(AMBIENT_KEYS[0].h, 0);
  assert.equal(AMBIENT_KEYS[AMBIENT_KEYS.length - 1].h, 24);
  for (let i = 1; i < AMBIENT_KEYS.length; i++) assert.ok(AMBIENT_KEYS[i].h > AMBIENT_KEYS[i - 1].h);
});

test('une image clé retombe exactement sur sa couleur d\'horizon', () => {
  for (const k of AMBIENT_KEYS) {
    const s = sampleAmbient(k.h === 24 ? 0 : k.h);
    assert.equal(s.horizon.getHex(), k.horizon, `heure ${k.h}`);
  }
});

test('l\'ambiance est continue : aucun saut de couleur ou de lumière sur 0,05 h', () => {
  let prev = sampleAmbient(0);
  for (let h = 0.05; h <= 24; h += 0.05) {
    const cur = sampleAmbient(h);
    assert.ok(dist(prev.horizon, cur.horizon) < 0.08, `horizon saute à ${h.toFixed(2)} h`);
    assert.ok(dist(prev.zenith, cur.zenith) < 0.08, `zénith saute à ${h.toFixed(2)} h`);
    assert.ok(Math.abs(prev.sunIntensity - cur.sunIntensity) < 0.12, `soleil saute à ${h.toFixed(2)} h`);
    prev = cur;
  }
});

test('minuit et 24 h sont identiques ; les heures hors plage sont ramenées dans [0, 24[', () => {
  assert.equal(wrapHours(25), 1);
  assert.equal(wrapHours(-1), 23);
  assert.equal(sampleAmbient(24).horizon.getHex(), sampleAmbient(0).horizon.getHex());
  assert.equal(sampleAmbient(36).horizon.getHex(), sampleAmbient(12).horizon.getHex());
});

test('le jour est plus lumineux que la nuit, et le coucher plus chaud que midi', () => {
  assert.ok(sampleAmbient(12).sunIntensity > sampleAmbient(2).sunIntensity * 3);
  const noon = sampleAmbient(12).horizon;
  const dusk = sampleAmbient(18).horizon;
  assert.ok(dusk.r > dusk.b, 'horizon du coucher chaud (rouge > bleu)');
  assert.ok(dusk.r - dusk.b > noon.r - noon.b, 'plus chaud qu\'à midi');
  assert.equal(sampleAmbient(3).skyGlow, 0, 'pas de halo solaire la nuit');
});

test('le soleil se lève à l\'est, culmine, se couche à l\'ouest', () => {
  const morning = sunDirection(6.5);
  const noon = sunDirection(12.5);
  const evening = sunDirection(18.5);
  assert.ok(morning.x > 0.5, 'matin à l\'est (+x)');
  assert.ok(Math.abs(noon.x) < 0.25 && noon.y > 0.9, 'midi à la verticale');
  assert.ok(evening.x < -0.5, 'soir à l\'ouest (-x)');
});

test('la direction est unitaire et ne passe jamais sous l\'élévation minimale', () => {
  for (let h = 0; h < 24; h += 0.25) {
    const d = sunDirection(h);
    assert.ok(Math.abs(d.length() - 1) < 1e-9, `non unitaire à ${h} h`);
    assert.ok(d.y >= MIN_SUN_Y * 0.9, `trop bas à ${h} h : ${d.y.toFixed(3)}`);
  }
});

test('la lune prend le relais sans saut brutal', () => {
  let prev = sunDirection(0);
  for (let h = 0.05; h <= 24; h += 0.05) {
    const cur = sunDirection(h);
    assert.ok(prev.distanceTo(cur) < 0.12, `la direction saute à ${h.toFixed(2)} h`);
    prev = cur;
  }
});

test('daylight : 0 la nuit, 1 en journée, progressif à l\'aube et au crépuscule', () => {
  assert.equal(daylight(2), 0);
  assert.equal(daylight(12), 1);
  assert.ok(daylight(6.2) > 0 && daylight(6.2) < 1);
  assert.ok(daylight(19) > 0 && daylight(19) < 1);
});
