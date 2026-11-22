import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_DESTINIES } from './destinies';
import {
  POLICE_DECAY_SECONDS,
  POLICE_MAX_STARS,
  advanceGameTime,
  clearPoliceViaNetwork,
  createInitialPlayerState,
  policeStarsForSeverity,
  raisePoliceWanted,
  tickPoliceWanted,
} from './simulation';
import { normalizeSessionState } from './sessionValidation';

function fresh() {
  return { ...createInitialPlayerState(ALL_DESTINIES[0], 'p', 't'), policeWanted: 0 };
}

test('Recherché : la gravité 1 à 3 donne autant d\'étoiles, le reste est ramené dans la plage', () => {
  assert.equal(policeStarsForSeverity(1), 1);
  assert.equal(policeStarsForSeverity(2), 2);
  assert.equal(policeStarsForSeverity(3), 3);
  assert.equal(policeStarsForSeverity(0), 1);
  assert.equal(policeStarsForSeverity(99), 3);
  assert.equal(policeStarsForSeverity(Number.NaN), 1);
  assert.equal(policeStarsForSeverity(2.4), 2);
});

test('Recherché : un incident monte les étoiles, plafonnées à 5, et relance la redescente', () => {
  let s = raisePoliceWanted(fresh(), 1);
  assert.equal(s.policeWanted, 1);
  assert.equal(s.policeQuietSeconds, 0);
  s = raisePoliceWanted({ ...s, policeQuietSeconds: 40 }, 3);
  assert.equal(s.policeWanted, 4);
  assert.equal(s.policeQuietSeconds, 0);
  s = raisePoliceWanted(s, 3);
  assert.equal(s.policeWanted, POLICE_MAX_STARS);
  s = raisePoliceWanted(s, 3);
  assert.equal(s.policeWanted, POLICE_MAX_STARS);
});

test('Recherché : le premier incident et le niveau maximal sont consignés, pas chaque hausse', () => {
  const a = raisePoliceWanted(fresh(), 1);
  assert.equal(a.logs.length, fresh().logs.length + 1);
  const b = raisePoliceWanted(a, 1);
  assert.equal(b.logs.length, a.logs.length);
  const c = raisePoliceWanted({ ...b, policeWanted: 4 }, 2);
  assert.equal(c.logs.length, b.logs.length + 1);
});

test('Recherché : une partie terminée ne change plus', () => {
  const over = { ...fresh(), isGameOver: true };
  assert.equal(raisePoliceWanted(over, 3), over);
});

test('Recherché : une étoile de moins toutes les 60 s sans incident', () => {
  assert.deepEqual(tickPoliceWanted(3, 0, 59), { wanted: 3, quietSeconds: 59, cleared: false });
  assert.deepEqual(tickPoliceWanted(3, 59, 1), { wanted: 2, quietSeconds: 0, cleared: false });
  assert.deepEqual(tickPoliceWanted(3, 0, 130), { wanted: 1, quietSeconds: 10, cleared: false });
  assert.deepEqual(tickPoliceWanted(2, 30, 3000), { wanted: 0, quietSeconds: 0, cleared: true });
  assert.deepEqual(tickPoliceWanted(0, 50, 100), { wanted: 0, quietSeconds: 0, cleared: false });
});

test('Recherché : le temps de jeu fait redescendre les étoiles et le consigne à zéro', () => {
  let s: ReturnType<typeof fresh> = { ...fresh(), policeWanted: 2, policeQuietSeconds: 0 };
  for (let i = 0; i < POLICE_DECAY_SECONDS; i++) s = advanceGameTime(s, 1, 1);
  assert.equal(s.policeWanted, 1);
  const logsBefore = s.logs.length;
  for (let i = 0; i < POLICE_DECAY_SECONDS; i++) s = advanceGameTime(s, 1, 1);
  assert.equal(s.policeWanted, 0);
  assert.equal(s.logs.length, logsBefore + 1);
  assert.equal(s.policeQuietSeconds, 0);
});

test('Recherché : sans étoile, le temps de jeu ne change pas l\'état de recherche', () => {
  const s = advanceGameTime(fresh(), 5, 1);
  assert.equal(s.policeWanted, 0);
  assert.ok(!s.policeQuietSeconds);
});

test('Recherché : effacer la recherche (marché noir, politicien) reste possible', () => {
  const s = clearPoliceViaNetwork({ ...fresh(), policeWanted: 4, policeQuietSeconds: 30 });
  assert.equal(s.policeWanted, 0);
});

test('Recherché : la sauvegarde garde le compte à rebours et ignore une valeur absurde', () => {
  const identity = { playerId: 'p', sessionToken: 't', homeLotId: null as string | null };
  const ok = normalizeSessionState({ ...fresh(), policeWanted: 2, policeQuietSeconds: 25 }, identity);
  assert.ok(ok);
  assert.equal(ok.policeQuietSeconds, 25);
  const bad = normalizeSessionState({ ...fresh(), policeWanted: 2, policeQuietSeconds: -5 }, identity);
  assert.ok(bad);
  assert.equal(bad.policeQuietSeconds, undefined);
  const old = normalizeSessionState({ ...fresh(), policeWanted: 1 }, identity);
  assert.ok(old);
  assert.equal(old.policeWanted, 1);
});
