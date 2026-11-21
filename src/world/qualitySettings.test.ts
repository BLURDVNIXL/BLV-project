import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DistanceGovernor,
  parseDistancePref,
  renderDistanceParams,
  resolveLevels,
  serializeDistancePref,
  simDistanceScale,
  tierLevels,
  type DistanceLevels,
} from './qualitySettings';
import {
  ANIMAL_DESPAWN_DIST,
  NPC_DESPAWN_DIST,
  NPC_DESPAWN_HARD_DIST,
  NPC_FAR_AI_DIST,
  NPC_MARKET_DIST,
  NPC_SPAWN_MAX,
  NPC_SPAWN_MIN,
  npcActiveFraction,
  scaleAnimalDistances,
  scaleNpcDistances,
} from './budgets';

/** Fait tourner le régulateur à cadence constante ; renvoie chaque changement avec son instant. */
function run(
  gov: DistanceGovernor,
  fromMs: number,
  durationMs: number,
  frameMs: number
): { changes: Array<{ atMs: number; levels: DistanceLevels }>; endMs: number } {
  const changes: Array<{ atMs: number; levels: DistanceLevels }> = [];
  let t = fromMs;
  const end = fromMs + durationMs;
  while (t < end) {
    t += frameMs;
    const next = gov.push(t, frameMs);
    if (next) changes.push({ atMs: t, levels: next });
  }
  return { changes, endMs: t };
}

const HIGH = tierLevels('high');

function highGovernor(): DistanceGovernor {
  return new DistanceGovernor({ start: HIGH.base, floor: HIGH.floor, ceiling: HIGH.ceiling });
}

test('parseDistancePref : auto par défaut, niveaux 0..3 acceptés, le reste vaut auto', () => {
  assert.equal(parseDistancePref(null), 'auto');
  assert.equal(parseDistancePref(undefined), 'auto');
  assert.equal(parseDistancePref(''), 'auto');
  assert.equal(parseDistancePref('auto'), 'auto');
  assert.equal(parseDistancePref('0'), 0);
  assert.equal(parseDistancePref('3'), 3);
  assert.equal(parseDistancePref('4'), 'auto');
  assert.equal(parseDistancePref('-1'), 'auto');
  assert.equal(parseDistancePref('2.5'), 'auto');
  assert.equal(parseDistancePref('<script>'), 'auto');
  for (const p of ['auto', 0, 1, 2, 3] as const) assert.equal(parseDistancePref(serializeDistancePref(p)), p);
});

test('distance d’affichage : le niveau 2 reproduit le jeu d’origine (rayon 4, plan lointain 720, brouillard x1)', () => {
  const p = renderDistanceParams(2);
  assert.equal(p.radius, 4);
  assert.equal(p.far, 720);
  assert.equal(p.fogScale, 1);
});

test('distance d’affichage : rayon et plan lointain croissent, brouillard décroît, bord du monde toujours aussi noyé', () => {
  for (let l = 0; l < 3; l++) {
    const a = renderDistanceParams(l as 0 | 1 | 2);
    const b = renderDistanceParams((l + 1) as 1 | 2 | 3);
    assert.ok(b.radius > a.radius);
    assert.ok(b.far > a.far);
    assert.ok(b.fogScale < a.fogScale);
  }
  // Densité x distance du bord chargé constante : le bord se fond dans le brouillard comme au niveau de référence.
  const ref = renderDistanceParams(2).fogScale * (renderDistanceParams(2).radius + 0.5);
  for (const l of [0, 1, 2, 3] as const) {
    const p = renderDistanceParams(l);
    assert.ok(Math.abs(p.fogScale * (p.radius + 0.5) - ref) < 1e-9);
  }
});

test('distance de simulation : le niveau 2 est l’échelle d’origine, et l’échelle croît avec le niveau', () => {
  assert.equal(simDistanceScale(2), 1);
  for (let l = 0; l < 3; l++) assert.ok(simDistanceScale((l + 1) as 1 | 2 | 3) > simDistanceScale(l as 0 | 1 | 2));
});

test('échelle 1 : les distances PNJ et animaux sont exactement les budgets d’origine', () => {
  const n = scaleNpcDistances(1);
  assert.equal(n.despawn, NPC_DESPAWN_DIST);
  assert.equal(n.despawnHard, NPC_DESPAWN_HARD_DIST);
  assert.equal(n.market, NPC_MARKET_DIST);
  assert.equal(n.spawnMin, NPC_SPAWN_MIN);
  assert.equal(n.spawnMax, NPC_SPAWN_MAX);
  assert.equal(n.farAi, NPC_FAR_AI_DIST);
  assert.equal(npcActiveFraction(1), 1);
  assert.equal(scaleAnimalDistances(1).despawn, ANIMAL_DESPAWN_DIST);
});

test('échelles extrêmes : la zone d’apparition garde de l’épaisseur et le retrait reste au-delà de l’apparition', () => {
  for (const s of [0, 0.1, 0.3, 0.6, 0.8, 1, 1.25, 2, 10, NaN]) {
    const n = scaleNpcDistances(s);
    assert.ok(n.spawnMax >= n.spawnMin + 10);
    assert.ok(n.despawn > n.spawnMax);
    assert.ok(n.despawnHard >= n.despawn);
    const a = scaleAnimalDistances(s);
    assert.ok(a.spawnMax >= a.spawnMin + 10);
    assert.ok(a.despawn > a.spawnMax);
    assert.ok(npcActiveFraction(s) > 0 && npcActiveFraction(s) <= 1);
  }
});

test('profils : bases, plafonds du mode Auto et limites manuelles cohérents', () => {
  for (const tier of ['high', 'mobile', 'low'] as const) {
    const t = tierLevels(tier);
    for (const dim of ['render', 'sim'] as const) {
      assert.ok(t.floor[dim] <= t.base[dim], `${tier}.${dim} : base sous le plancher`);
      assert.ok(t.base[dim] <= t.ceiling[dim], `${tier}.${dim} : base au-dessus du plafond`);
      assert.ok(t.ceiling[dim] <= t.cap[dim], `${tier}.${dim} : plafond Auto au-dessus de la limite manuelle`);
    }
  }
  assert.deepEqual(tierLevels('high').base, { render: 2, sim: 2 });
  // Le jeu d'origine sur mobile chargeait 3 chunks : le niveau de départ mobile garde ce rayon.
  assert.equal(renderDistanceParams(tierLevels('mobile').base.render).radius, 3);
});

test('resolveLevels : niveau fixe respecté mais plafonné par l’appareil, Auto prend la valeur fournie', () => {
  assert.deepEqual(resolveLevels(3, 3, 'high'), { render: 3, sim: 3 });
  assert.deepEqual(resolveLevels(3, 3, 'low'), { render: 1, sim: 1 });
  assert.deepEqual(resolveLevels('auto', 'auto', 'mobile'), tierLevels('mobile').base);
  assert.deepEqual(resolveLevels('auto', 0, 'high', { render: 1, sim: 2 }), { render: 1, sim: 0 });
});

test('régulateur : une cadence fluide ne change jamais rien', () => {
  const g = highGovernor();
  const { changes } = run(g, 0, 10 * 60_000, 16.7);
  assert.equal(changes.length, 0);
  assert.deepEqual(g.levels, { render: 2, sim: 2 });
});

test('régulateur : une cadence 120 Hz fluide ne change rien non plus', () => {
  const { changes } = run(highGovernor(), 0, 120_000, 8.3);
  assert.equal(changes.length, 0);
});

test('régulateur : une cadence lente baisse d’un cran à la fois (affichage, simulation, simulation) puis s’arrête au plancher', () => {
  const g = highGovernor();
  const { changes } = run(g, 0, 10 * 60_000, 40);
  const seq = changes.map((c) => c.levels);
  assert.deepEqual(seq, [
    { render: 1, sim: 2 },
    { render: 1, sim: 1 },
    { render: 1, sim: 0 },
  ]);
  assert.deepEqual(g.levels, { render: 1, sim: 0 });
  // Jamais sous le plancher, quelle que soit la durée.
  assert.ok(g.levels.render >= HIGH.floor.render && g.levels.sim >= HIGH.floor.sim);
});

test('régulateur : la première fenêtre après un changement est ignorée (chargement de chunks en cours)', () => {
  const { changes } = run(highGovernor(), 0, 60_000, 40);
  // Baisse n°1 à la 2e fenêtre lente (8 s) ; la suivante ne peut pas arriver avant 2 nouvelles fenêtres lentes après 1 ignorée (>= 12 s).
  assert.ok(changes.length >= 2);
  assert.ok(changes[1].atMs - changes[0].atMs >= 12_000, `${changes[1].atMs - changes[0].atMs} ms entre deux baisses`);
});

test('régulateur : un effondrement (images de 60 ms) baisse dès la première fenêtre', () => {
  const g = highGovernor();
  // Première fenêtre ignorée (démarrage), la deuxième est mesurée.
  const { changes } = run(g, 0, 9000, 60);
  assert.ok(changes.length >= 1);
  assert.ok(changes[0].atMs <= 8500, `baisse à ${changes[0].atMs} ms`);
});

test('régulateur : un ralentissement bref (une seule fenêtre) ne baisse pas', () => {
  const g = highGovernor();
  let t = 0;
  t = run(g, t, 4000, 16.7).endMs; // fenêtre de démarrage ignorée
  t = run(g, t, 4000, 33).endMs; // une fenêtre lente (p90 33 ms : sous le seuil d'effondrement)
  const { changes } = run(g, t, 60_000, 16.7);
  assert.equal(changes.length, 0);
});

test('régulateur : les pauses (onglet masqué, > 250 ms) ne sont pas des mesures', () => {
  const g = highGovernor();
  let t = 0;
  let changed: DistanceLevels | null = null;
  for (let i = 0; i < 2000; i++) {
    // 1 image sur 5 est une « pause » de 400 ms : doit être ignorée et réinitialiser la fenêtre.
    const dt = i % 5 === 4 ? 400 : 16.7;
    t += dt;
    changed = g.push(t, dt) ?? changed;
  }
  assert.equal(changed, null);
});

test('régulateur : remonte après une longue période fluide, jamais au-delà du plafond, et pas avant la pause de remontée', () => {
  const g = highGovernor();
  let r = run(g, 0, 20_000, 40); // baisse
  assert.ok(g.levels.render < 2 || g.levels.sim < 2);
  const downAt = r.changes[0].atMs;
  r = run(g, r.endMs, 20_000, 12);
  // Pas de remontée avant 60 s après la première baisse.
  for (const c of r.changes) assert.ok(c.atMs - downAt >= 60_000 || c.levels.render <= 1);
  r = run(g, r.endMs, 30 * 60_000, 12);
  assert.deepEqual(g.levels, HIGH.ceiling, 'doit revenir au plafond de l’appareil');
  const more = run(g, r.endMs, 10 * 60_000, 8);
  assert.equal(more.changes.length, 0, 'ne dépasse jamais le plafond Auto');
});

test('régulateur : une remontée aussitôt regrettée est annulée et ce niveau n’est plus retenté', () => {
  const g = new DistanceGovernor({ start: { render: 1, sim: 2 }, floor: HIGH.floor, ceiling: HIGH.ceiling });
  // Démarre fluide : remonte l'affichage au niveau 2 après 6 fenêtres fluides (la première est ignorée), soit vers 28 s.
  let r = run(g, 0, 30_000, 12);
  assert.deepEqual(g.levels, { render: 2, sim: 2 });
  assert.equal(r.changes.length, 1);
  // Le niveau 2 est trop lourd : l'appareil s'effondre aussitôt (dans la fenêtre de regret de 45 s).
  r = run(g, r.endMs, 30_000, 60);
  assert.ok(r.changes.length >= 1);
  assert.equal(g.levels.render, 1, 'la remontée est annulée');
  // Ensuite tout redevient fluide, très longtemps : le niveau 2 d'affichage n'est plus retenté.
  r = run(g, r.endMs, 30 * 60_000, 12);
  assert.equal(g.levels.render, 1);
});

test('régulateur : une dimension réglée à la main (plancher = plafond) ne bouge jamais', () => {
  const g = new DistanceGovernor({
    start: { render: 3, sim: 2 },
    floor: { render: 3, sim: HIGH.floor.sim },
    ceiling: { render: 3, sim: HIGH.ceiling.sim },
  });
  const { changes } = run(g, 0, 10 * 60_000, 40);
  assert.ok(changes.length >= 2);
  for (const c of changes) assert.equal(c.levels.render, 3);
  assert.equal(g.levels.sim, 0, 'seule la simulation a baissé');
});

test('régulateur : plancher = plafond = départ, il ne fait rien', () => {
  const lv: DistanceLevels = { render: 2, sim: 1 };
  const g = new DistanceGovernor({ start: lv, floor: lv, ceiling: lv });
  assert.equal(run(g, 0, 5 * 60_000, 60).changes.length, 0);
  assert.equal(run(g, 5 * 60_000, 5 * 60_000, 10).changes.length, 0);
});

test('régulateur : niveaux de départ hors bornes ramenés dans [plancher, plafond]', () => {
  const g = new DistanceGovernor({ start: { render: 3, sim: 0 }, floor: { render: 1, sim: 1 }, ceiling: { render: 2, sim: 2 } });
  assert.deepEqual(g.levels, { render: 2, sim: 1 });
});

test('régulateur : valeurs de durée invalides (NaN, 0, négatif) ignorées sans planter', () => {
  const g = highGovernor();
  assert.equal(g.push(100, NaN), null);
  assert.equal(g.push(200, 0), null);
  assert.equal(g.push(300, -5), null);
  assert.deepEqual(g.levels, { render: 2, sim: 2 });
});
