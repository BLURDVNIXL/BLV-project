import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISEASES,
  HOSPITALS,
  crashDamage,
  ensureHealth,
  fallDamage,
  hash01,
  hospitalBill,
  nearestHospital,
  rollDailyDisease,
  severityForHit,
  stayDays,
} from './health';
import {
  acknowledgeHospitalVisit,
  admitToHospital,
  advanceGameTime,
  createInitialPlayerState,
  damagePlayer,
  rollDestiny,
  treatDisease,
} from './simulation';
import { isWater } from '../world/abidjanGeography';
import type { PlayerState } from '../types/game';

const newPlayer = (id = 'eleve_inphb'): PlayerState => createInitialPlayerState(rollDestiny(id), 'test_joueur');

test('hash01 : déterministe et dans [0, 1[', () => {
  assert.equal(hash01('abc'), hash01('abc'));
  assert.notEqual(hash01('abc'), hash01('abd'));
  for (let i = 0; i < 500; i++) {
    const v = hash01(`x${i}`);
    assert.ok(v >= 0 && v < 1);
  }
});

test('maladies : la pluie et l’inondation en donnent plus que le soleil, jamais en double', () => {
  const count = (weather: 'soleil' | 'pluie' | 'inondation') => {
    let n = 0;
    for (let day = 1; day <= 3000; day++) {
      if (rollDailyDisease({ playerId: 'p', day, weather, hygiene: 80, hunger: 80, active: [] })) n++;
    }
    return n;
  };
  const sun = count('soleil');
  const rain = count('pluie');
  const flood = count('inondation');
  assert.ok(sun > 60 && sun < 260, `soleil : ${sun}`);
  assert.ok(rain > sun, 'pluie > soleil');
  assert.ok(flood > rain, 'inondation > pluie');

  for (let day = 1; day <= 500; day++) {
    const got = rollDailyDisease({ playerId: 'p', day, weather: 'pluie', hygiene: 10, hunger: 10, active: ['palu'] });
    assert.notEqual(got, 'palu');
  }
  assert.equal(
    rollDailyDisease({ playerId: 'p', day: 1, weather: 'inondation', hygiene: 0, hunger: 0, active: ['palu', 'grippe'] }),
    null,
    'jamais plus de deux maladies'
  );
});

test('le choléra guette surtout après une inondation', () => {
  const cholera = (weather: 'soleil' | 'inondation') => {
    let n = 0;
    for (let day = 1; day <= 6000; day++) {
      if (rollDailyDisease({ playerId: 'q', day, weather, hygiene: 20, hunger: 80, active: [] }) === 'cholera') n++;
    }
    return n;
  };
  assert.ok(cholera('inondation') > cholera('soleil') * 5);
});

test('gravité, durée et facture', () => {
  assert.equal(severityForHit(10), 'leger');
  assert.equal(severityForHit(30), 'moyen');
  assert.equal(severityForHit(59), 'moyen');
  assert.equal(severityForHit(60), 'grave');
  for (let day = 0; day < 200; day++) {
    const l = stayDays('leger', 'p', day);
    const m = stayDays('moyen', 'p', day);
    const g = stayDays('grave', 'p', day);
    assert.ok(l >= 1 && l <= 2, `léger ${l}`);
    assert.ok(m >= 3 && m <= 4, `moyen ${m}`);
    assert.ok(g >= 5 && g <= 7, `grave ${g}`);
  }
  assert.ok(hospitalBill('leger', 1) < hospitalBill('moyen', 3));
  assert.ok(hospitalBill('moyen', 3) < hospitalBill('grave', 5));
  assert.ok(hospitalBill('moyen', 4) > hospitalBill('moyen', 3), 'chaque jour est facturé');
});

test('dégâts : pas de dégât à basse vitesse, plafonnés à haute vitesse', () => {
  assert.equal(crashDamage(3), 0);
  assert.ok(crashDamage(12) > 0);
  assert.ok(crashDamage(20) > crashDamage(12));
  assert.equal(crashDamage(200), 80);
  assert.equal(fallDamage(8), 0);
  assert.ok(fallDamage(15) > 0);
  assert.equal(fallDamage(100), 70);
});

test('hôpitaux : le plus proche est choisi et le réveil n’est jamais dans l’eau', () => {
  for (const h of HOSPITALS) {
    const near = nearestHospital(0, 0);
    assert.ok(near.hospital && Number.isFinite(near.x) && Number.isFinite(near.z));
    const spawn = nearestHospital(near.x, near.z);
    assert.equal(isWater({ x: spawn.x, z: spawn.z }), false, `${h.name} : réveil dans l’eau`);
  }
  // Un joueur au nord (Abobo) est dirigé vers l'hôpital d'Abobo
  const north = nearestHospital(0, -9000);
  assert.equal(north.hospital.id, 'hg_abobo');
});

test('ensureHealth complète une ancienne sauvegarde sans toucher une partie récente', () => {
  const fresh = newPlayer();
  assert.equal(ensureHealth(fresh), fresh, 'même objet si déjà complet');
  const old = { ...fresh } as Partial<PlayerState>;
  delete old.health;
  delete old.diseases;
  delete old.hospitalizations;
  delete old.hospitalVisit;
  const fixed = ensureHealth(old as PlayerState);
  assert.equal(fixed.health, 100);
  assert.deepEqual(fixed.diseases, []);
  assert.equal(fixed.hospitalizations, 0);
  assert.equal(fixed.hospitalVisit, null);
});

test('un petit choc enlève de la vie sans hospitaliser', () => {
  const s = damagePlayer(newPlayer(), 25, 'Petit accrochage');
  assert.equal(s.health, 75);
  assert.equal(s.hospitalVisit, null);
  assert.equal(s.hospitalizations, 0);
});

test('un coup fatal hospitalise : jours qui passent, facture payée, réveil à 8 h, soigné', () => {
  const start = { ...newPlayer(), cash: 500000, diseases: [{ id: 'palu' as const, daysLeft: 3 }] };
  const s = damagePlayer(start, 100, 'Accident de la route', { x: 0, z: 0 });
  const v = s.hospitalVisit;
  assert.ok(v, 'séjour en attente');
  assert.equal(v.severity, 'grave');
  assert.ok(v.days >= 5 && v.days <= 7);
  assert.equal(s.daysLived, start.daysLived + v.days);
  assert.equal(s.gameTimeHours, 8);
  assert.equal(s.hospitalizations, 1);
  assert.deepEqual(s.diseases, [], 'les maladies sont soignées');
  assert.ok(s.health >= 75);
  assert.equal(v.paidCash, v.bill);
  assert.equal(v.addedDebt, 0);
  assert.ok(s.cash < start.cash, 'la facture est payée en espèces');
  assert.equal(s.isDriving, false);
  assert.equal(s.isGameOver, false, 'mort NON définitive');
  assert.equal(acknowledgeHospitalVisit(s).hospitalVisit, null);
});

test('sans argent, la facture d’hôpital s’ajoute aux dettes', () => {
  const start = { ...newPlayer(), cash: 1000, debt: 0 };
  const s = admitToHospital(start, 'moyen', 'Malaise', { x: 0, z: 0 });
  const v = s.hospitalVisit!;
  assert.equal(v.paidCash, 1000);
  assert.ok(v.addedDebt > 0);
  assert.equal(v.paidCash + v.addedDebt, v.bill);
  assert.ok(s.debt >= v.addedDebt, 'la dette a augmenté (les intérêts hebdomadaires peuvent s’y ajouter)');
});

test('l’hospitalisation est reproductible', () => {
  const a = admitToHospital(newPlayer(), 'moyen', 'Test', { x: 10, z: 10 });
  const b = admitToHospital(newPlayer(), 'moyen', 'Test', { x: 10, z: 10 });
  assert.equal(a.hospitalVisit!.days, b.hospitalVisit!.days);
  assert.equal(a.hospitalVisit!.bill, b.hospitalVisit!.bill);
  assert.equal(a.daysLived, b.daysLived);
});

test('la faim fait perdre de la vie, puis mène à l’hôpital (sans fin de partie)', () => {
  let s: PlayerState = { ...newPlayer(), cash: 400000, debt: 0, needs: { ...newPlayer().needs, hunger: 0, energy: 90 } };
  const before = s.health;
  s = advanceGameTime(s, 600, 1, {}); // 40 min de jeu à jeun
  assert.ok(s.health < before, 'la vie baisse quand on a faim');
  // Plusieurs jours à jeun : hospitalisation
  let hospitalised = false;
  for (let i = 0; i < 40 && !hospitalised; i++) {
    s = advanceGameTime({ ...s, needs: { ...s.needs, hunger: 0, energy: 90 } }, 1800, 1, {});
    if (s.hospitalVisit) hospitalised = true;
  }
  assert.ok(hospitalised, 'la faim prolongée mène à l’hôpital');
  assert.equal(s.isGameOver, false);
});

test('manger et dormir assez permet de récupérer de la vie', () => {
  const hurt: PlayerState = { ...newPlayer(), health: 40, needs: { ...newPlayer().needs, hunger: 90, energy: 90 } };
  const healed = advanceGameTime(hurt, 600, 1, {});
  assert.ok(healed.health > 40, 'récupération naturelle');
});

test('une maladie active fait perdre de la vie et fatigue plus vite', () => {
  const base: PlayerState = { ...newPlayer(), needs: { ...newPlayer().needs, hunger: 90, energy: 90 } };
  const sick: PlayerState = { ...base, diseases: [{ id: 'cholera', daysLeft: 4 }] };
  const a = advanceGameTime(sick, 900, 1, {});
  const b = advanceGameTime(base, 900, 1, {});
  assert.ok(a.health < sick.health, 'le choléra fait mal');
  assert.ok(a.needs.energy < b.needs.energy, 'la maladie fatigue');
});

test('traitement en pharmacie : guérison immédiate contre paiement', () => {
  const sick: PlayerState = { ...newPlayer(), cash: 50000, diseases: [{ id: 'grippe', daysLeft: 2 }] };
  const ok = treatDisease(sick, 'grippe');
  assert.equal(ok.ok, true);
  assert.equal(ok.nextState.cash, 50000 - DISEASES.grippe.treatCost);
  assert.deepEqual(ok.nextState.diseases, []);

  const poor = treatDisease({ ...sick, cash: 100 }, 'grippe');
  assert.equal(poor.ok, false);
  assert.equal(poor.nextState.diseases.length, 1);

  assert.equal(treatDisease(newPlayer(), 'palu').ok, false, 'on ne soigne pas une maladie qu’on n’a pas');
});
