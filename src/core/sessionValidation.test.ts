import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_DESTINIES } from './destinies';
import { createInitialPlayerState } from './simulation';
import { normalizeSessionState } from './sessionValidation';

const identity = {
  playerId: 'server-player',
  sessionToken: 'server-token',
  homeLotId: 'server-owned-lot',
};

function makeState() {
  return createInitialPlayerState(ALL_DESTINIES[0], 'client-player', 'client-token');
}

test('canonicalise le destin et réinjecte les identifiants détenus par le serveur', () => {
  const source = makeState();
  const incoming = {
    ...source,
    playerId: 'forged-player',
    sessionToken: 'forged-token',
    homeLotId: 'another-player-lot',
    destiny: { ...source.destiny, name: 'Destin falsifié' },
  };

  const normalized = normalizeSessionState(incoming, identity);

  assert.ok(normalized);
  assert.equal(normalized.playerId, identity.playerId);
  assert.equal(normalized.sessionToken, identity.sessionToken);
  assert.equal(normalized.homeLotId, identity.homeLotId);
  assert.deepEqual(normalized.destiny, ALL_DESTINIES[0]);
});

test('rejette les identifiants de destin inconnus et les valeurs numériques invalides', () => {
  const source = makeState();

  assert.equal(
    normalizeSessionState({ ...source, destiny: { ...source.destiny, id: 'destin-inconnu' } }, identity),
    null
  );
  assert.equal(normalizeSessionState({ ...source, cash: -1 }, identity), null);
  assert.equal(normalizeSessionState({ ...source, bankCash: Number.POSITIVE_INFINITY }, identity), null);
  assert.equal(
    normalizeSessionState({ ...source, needs: { ...source.needs, hunger: 101 } }, identity),
    null
  );
});

test('accepte les états initiaux de tous les destins du catalogue', () => {
  for (const destiny of ALL_DESTINIES) {
    const state = createInitialPlayerState(destiny, 'client-player', 'client-token');
    assert.ok(normalizeSessionState(state, identity), `État initial rejeté : ${destiny.id}`);
  }
});

test('rejette une progression de mission incompatible avec le destin', () => {
  const source = makeState();
  assert.equal(
    normalizeSessionState(
      { ...source, activeMission: { ...source.activeMission, missionId: 'mission-inconnue' } },
      identity
    ),
    null
  );
});
