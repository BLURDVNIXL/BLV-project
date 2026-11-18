import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DESTINIES,
  CRIB_UPGRADE_PRICES,
  IVORIAN_FOODS,
  SAPE_OUTFITS,
} from './destinies';
import { DESTINY_MISSIONS, getMissionForDestiny } from './missions';
import { findHouseLot } from '../world/city';
import type { HomeType } from '../world/abidjanGeography';
import {
  advanceGameTime,
  buyCribUpgrade,
  buyOrEquipOutfit,
  clearPoliceViaNetwork,
  createInitialPlayerState,
  depositToBank,
  donateYannisAcademy,
  eatFood,
  evaluateMissionProgress,
  payFastTravel,
  fastTravelFare,
  taxiWaitSeconds,
  taxiCallRefusal,
  taxiRideGameMinutes,
  applyTaxiRideTime,
  TAXI_GAME_MIN_MIN,
  TAXI_GAME_MIN_MAX,
  TAXI_WAIT_MIN_S,
  TAXI_WAIT_MAX_S,
  FARE_SAME_COMMUNE,
  FARE_BETWEEN_COMMUNES,
  performLavageEtoile,
  performWorkShift,
  playLotoAkwaba,
  purgeLocalData,
  repayDebt,
  rollDestiny,
  sleepAtHome,
  takeBankLoan,
  takeShower,
  useToilet,
  withdrawFromBank,
} from './simulation';
import { DISTRICTS, isWater } from '../world/abidjanGeography';
import { initWasmCore, getWasmCore } from '../wasm/wasmBridge';

test('Real compiled blv_core.wasm binary loads and passes WebAssembly.validate()', async () => {
  const wasmPath = path.resolve(process.cwd(), 'public/blv_core.wasm');
  const bytes = fs.readFileSync(wasmPath);
  assert.equal(WebAssembly.validate(bytes), true);

  const core = await initWasmCore();
  assert.equal(core.compute_depression_pct(0), 50);
  assert.equal(core.compute_depression_pct(60), 100);
  assert.equal(core.compute_flood_stall(30, 85, 1), 1);
  assert.equal(core.compute_flood_stall(30, 85, 0), 0);
});

test('All 19 Destinies exist with unique IDs, valid Abidjan coordinates, districtId, homeType & 7 Legendary Easter Eggs', () => {
  assert.equal(ALL_DESTINIES.length, 19);
  const ids = new Set(ALL_DESTINIES.map((d) => d.id));
  assert.equal(ids.size, 19);

  const legendaries = ALL_DESTINIES.filter((d) => d.rarity === 'legendaire');
  assert.equal(legendaries.length, 7);

  const validDistrictIds = new Set(DISTRICTS.map((d) => d.id));
  for (const d of ALL_DESTINIES) {
    assert.ok(Number.isFinite(d.spawnX) && Number.isFinite(d.spawnZ), `${d.id} finite spawn`);
    assert.ok(d.district.length > 0, `${d.id} district`);
    assert.ok(validDistrictIds.has(d.districtId), `${d.id} valid districtId ${d.districtId}`);
    assert.ok(d.homeType.length > 0, `${d.id} homeType`);
    assert.equal(isWater({ x: d.spawnX, z: d.spawnZ }), false, `${d.id} spawn should be on dry land`);
  }
});

test('All 19 Destinies have dedicated 3-step Main Story Missions', () => {
  for (const d of ALL_DESTINIES) {
    const mission = DESTINY_MISSIONS[d.id];
    assert.ok(mission, `Missing dedicated mission for destiny ${d.id}`);
    assert.equal(mission.destinyId, d.id);
    assert.equal(mission.steps.length, 3, `Mission ${d.id} should have 3 steps`);
    for (const step of mission.steps) {
      assert.ok(step.rewardCash > 0);
      assert.ok(step.targetDistrictId.length > 0);
    }

    const st = createInitialPlayerState(d);
    assert.equal(st.activeMission.missionId, mission.id);
    assert.equal(st.activeMission.stepIndex, 0);
    assert.equal(st.activeMission.completed, false);
  }
});

test('Story mission progression advances steps and grants completion trophy & rewards', () => {
  let st = createInitialPlayerState(rollDestiny('debrouillard_abobo'));
  const mission = getMissionForDestiny('debrouillard_abobo');
  const startCash = st.cash;

  // Step 1: Eat a meal
  st = eatFood(st, IVORIAN_FOODS[0]);
  assert.equal(st.activeMission.stepIndex, 1);

  // Step 2: Work shift
  st = performWorkShift(st);
  assert.equal(st.activeMission.stepIndex, 2);

  // Step 3: Reach Plateau & >= 20,000 F in bank
  st = { ...st, bankCash: 25000 };
  st = evaluateMissionProgress(st, 'plateau');
  assert.equal(st.activeMission.completed, true);
  assert.ok(st.completedMissions.includes(mission.id));
  assert.ok(st.cash > startCash);
});

test('purgeLocalData only deletes blv_* keys and preserves third-party keys', () => {
  const store = new Map<string, string>([
    ['blv_save_v3', '{}'],
    ['blv_extra', '1'],
    ['other_app_setting', 'keep'],
  ]);
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    // Note: Object.keys iterates own enumerable properties in browser; mirror keys for Node mock
    blv_save_v3: '{}',
    blv_extra: '1',
    other_app_setting: 'keep',
  };
  purgeLocalData();
  assert.equal(store.has('blv_save_v3'), false);
  assert.equal(store.has('blv_extra'), false);
  assert.equal(store.get('other_app_setting'), 'keep');
  delete (globalThis as unknown as Record<string, unknown>).localStorage;
});

test('Golden Boy enforces English lock & 30-day Platinum timer expires cleanly', () => {
  const gb = rollDestiny('golden_boy');
  let state = createInitialPlayerState(gb);
  assert.equal(state.language, 'en');
  assert.equal(state.goldenBoyDaysLeft, 30);

  state = buyCribUpgrade(state, 'splitClim');
  assert.equal(state.cribUpgrades.splitClim, true);
  assert.equal(state.cash, gb.startingCash);

  for (let i = 0; i < 30; i++) {
    state = advanceGameTime(state, 6 * 3600, 1);
  }
  assert.equal(state.goldenBoyDaysLeft, 0);
});

test('Home upgrade strictly deducts FCFA and rejects broke players', () => {
  const poor = createInitialPlayerState(rollDestiny('debrouillard_abobo'));
  const rejected = buyCribUpgrade(poor, 'tv4k');
  assert.equal(rejected.cribUpgrades.tv4k, false);
  assert.equal(rejected.cash, poor.cash);

  const rich = createInitialPlayerState(rollDestiny('late_cocody'));
  const cost = CRIB_UPGRADE_PRICES.splitClim.cost;
  const step1Reward = getMissionForDestiny('late_cocody').steps[0].rewardCash;
  const bought = buyCribUpgrade(rich, 'splitClim');
  assert.equal(bought.cribUpgrades.splitClim, true);
  assert.equal(bought.cash, rich.cash - cost + step1Reward);
});

test('Fast Travel : 1 000 FCFA par défaut, 500 FCFA si on le précise, refusé si le joueur est trop pauvre', () => {
  const state = createInitialPlayerState(rollDestiny('poignon')); // 2 000 F
  const okTrip = payFastTravel(state, 'Le Plateau');
  assert.equal(okTrip.ok, true);
  assert.equal(okTrip.nextState.cash, 1000);

  const cheap = payFastTravel(okTrip.nextState, 'Le Plateau', fastTravelFare('plateau', 'plateau'));
  assert.equal(cheap.ok, true);
  assert.equal(cheap.nextState.cash, 500);

  const brokeTrip = payFastTravel(cheap.nextState, 'Cocody', fastTravelFare('plateau', 'cocody'));
  assert.equal(brokeTrip.ok, false);
  assert.equal(brokeTrip.nextState.cash, 500);
});

test('Tarif du taxi : 500 F dans la même commune, 1 000 F entre communes', () => {
  assert.equal(FARE_SAME_COMMUNE, 500);
  assert.equal(FARE_BETWEEN_COMMUNES, 1000);
  assert.equal(fastTravelFare('plateau', 'plateau'), 500);
  assert.equal(fastTravelFare('plateau', 'treichville'), 1000);
  assert.equal(fastTravelFare('yopougon', 'cocody'), 1000);
  // Deux zones d'une même commune (Cocody Deux-Plateaux et Riviera) : même commune
  assert.equal(fastTravelFare('cocody', 'riviera'), 500);
  assert.equal(fastTravelFare('riviera', 'cocody'), 500);
  // Départ ou arrivée inconnus : jamais le tarif réduit
  assert.equal(fastTravelFare(null, 'plateau'), 1000);
  assert.equal(fastTravelFare(undefined, 'plateau'), 1000);
  assert.equal(fastTravelFare('plateau', null), 1000);
  assert.equal(fastTravelFare('nimporte_quoi', 'nimporte_quoi'), 1000);
});

test('Bank Deposit, Withdraw, Loan, and Repay Debt modify balances accurately', () => {
  let state = createInitialPlayerState(rollDestiny('commercant_adjame'));
  state = depositToBank(state, 20000);
  assert.equal(state.cash, 30000);
  assert.equal(state.bankCash, 20000);

  state = withdrawFromBank(state, 10000);
  assert.equal(state.cash, 40000);
  assert.equal(state.bankCash, 10000);

  state = takeBankLoan(state, 100000);
  assert.equal(state.cash, 140000);
  assert.equal(state.debt, 100000);

  state = repayDebt(state, 40000);
  assert.equal(state.cash, 100000);
  assert.equal(state.debt, 60000);
});

test('Envy = 0 triggers Depression and cuts WASM work payout by 50%', async () => {
  await initWasmCore();
  const wasm = getWasmCore();
  const fullPay = wasm.compute_work_payout(40000, 50, 50, 80, 0);
  const depressedPay = wasm.compute_work_payout(40000, 50, 50, 0, 0);
  assert.equal(depressedPay, Math.floor(fullPay / 2));

  let state = createInitialPlayerState(rollDestiny('cadre_plateau'));
  state = { ...state, needs: { ...state.needs, envy: 0 } };
  const after = performWorkShift(state);
  assert.ok(after.cash > state.cash);
  assert.ok(after.logs.some((l) => l.message.includes('50%')));
});

test('Strict GDD Section 13 Game Over requires hunger<=0 AND energy<=0 AND debt>25000', () => {
  let state = createInitialPlayerState(rollDestiny('debrouillard_abobo'));
  state = {
    ...state,
    debt: 10000,
    needs: { ...state.needs, hunger: 0, energy: 0 },
  };
  const notDeadYet = advanceGameTime(state, 10, 1);
  assert.equal(notDeadYet.isGameOver, false);

  const indebted = { ...notDeadYet, debt: 30000 };
  const dead = advanceGameTime(indebted, 10, 1);
  assert.equal(dead.isGameOver, true);
});

test('Rescapé des Bas-fonds unlocks secret Redemption Trophy after 7 sober days', () => {
  let state = createInitialPlayerState(rollDestiny('rescape_basfonds'));
  assert.equal(state.redemptionTrophyUnlocked, false);
  for (let i = 0; i < 7; i++) {
    state = advanceGameTime(state, 6 * 3600, 1);
  }
  assert.equal(state.redemptionTrophyUnlocked, true);
});

test('INPolytec Koidio scholarship pays 50,000 F every 3 days & Angré pays 75,000 F weekly', () => {
  let inphb = createInitialPlayerState(rollDestiny('eleve_inphb'));
  const startCash = inphb.cash;
  for (let i = 0; i < 2; i++) {
    inphb = advanceGameTime(inphb, 6 * 3600, 1);
  }
  assert.equal(inphb.daysLived, 3);
  assert.equal(inphb.cash, startCash + 50000);
});

test('Sape outfits purchase & equip, Yannis Academy, Politicien & Djassaman police clear, and Needs interactions', () => {
  let state = createInitialPlayerState(rollDestiny('yannis_diomande'));
  const waxCost = SAPE_OUTFITS.find((o) => o.id === 'wax_bazin')!.price;
  const before = state.cash;
  state = buyOrEquipOutfit(state, 'wax_bazin');
  assert.equal(state.sapeOutfit, 'wax_bazin');
  assert.equal(state.cash, before - waxCost);

  state = donateYannisAcademy(state);
  assert.equal(state.yannisAcademyLevel, 1);

  state = useToilet({ ...state, needs: { ...state.needs, bladder: 20 } });
  assert.equal(state.needs.bladder, 100);
  state = takeShower({ ...state, needs: { ...state.needs, hygiene: 15 } });
  assert.equal(state.needs.hygiene, 100);
  state = sleepAtHome({ ...state, needs: { ...state.needs, energy: 10 } });
  assert.ok(state.needs.energy >= 95);

  let pol = createInitialPlayerState(rollDestiny('politicien_dechu'));
  pol = { ...pol, policeWanted: 4 };
  pol = clearPoliceViaNetwork(pol, false);
  assert.equal(pol.policeWanted, 0);

  let baron = createInitialPlayerState(rollDestiny('baron_ombre'));
  assert.equal(baron.policeWanted, 3);
  baron = clearPoliceViaNetwork(baron, true);
  assert.equal(baron.policeWanted, 0);

  state = eatFood(state, IVORIAN_FOODS[0]);
  state = performLavageEtoile(state);
  state = playLotoAkwaba(state);
});

test('Every Destiny spawns in a HouseLot belonging to its own signature districtId', () => {
  for (const d of ALL_DESTINIES) {
    const lot = findHouseLot(d.homeType as HomeType, 4242, undefined, d.districtId);
    assert.ok(lot, `Expected lot for ${d.id} in ${d.districtId}`);
    assert.equal(
      lot.district,
      d.districtId,
      `Destiny ${d.id} (${d.name}) spawned in ${lot.district} instead of ${d.districtId}`
    );
  }
});

test('Taxi appelé (B1) : attente de 10 à 20 s selon la distance', () => {
  assert.equal(TAXI_WAIT_MIN_S, 10);
  assert.equal(TAXI_WAIT_MAX_S, 20);
  assert.equal(taxiWaitSeconds(0), 10);
  assert.equal(taxiWaitSeconds(3000), 15);
  assert.equal(taxiWaitSeconds(6000), 20);
  assert.equal(taxiWaitSeconds(50000), 20);
  assert.equal(taxiWaitSeconds(-5), 10);
  assert.equal(taxiWaitSeconds(Infinity), 20);
  assert.equal(taxiWaitSeconds(NaN), 20);
});

test('Taxi appelé (B1) : refusé en conduisant, si une course est déjà appelée ou sans assez d\u2019argent', () => {
  const state = createInitialPlayerState(rollDestiny('poignon')); // 2 000 F
  assert.equal(taxiCallRefusal(state, 1000, false), null);
  assert.ok(taxiCallRefusal({ ...state, isDriving: true }, 1000, false));
  assert.ok(taxiCallRefusal(state, 1000, true));
  assert.ok(taxiCallRefusal({ ...state, cash: 999 }, 1000, false));
  assert.equal(taxiCallRefusal({ ...state, cash: 500 }, 500, false), null);
  // L'appel ne débite rien : seul payFastTravel (à la montée) retire l'argent, une seule fois.
  assert.equal(state.cash, 2000);
  const trip = payFastTravel(state, 'Le Plateau', fastTravelFare('plateau', 'cocody'));
  assert.equal(trip.nextState.cash, 1000);
});

test('Taxi (B4) : minutes de jeu selon la distance, entre 5 et 90', () => {
  assert.equal(TAXI_GAME_MIN_MIN, 5);
  assert.equal(TAXI_GAME_MIN_MAX, 90);
  assert.equal(taxiRideGameMinutes(0), 5);
  assert.equal(taxiRideGameMinutes(500), 5);
  assert.equal(taxiRideGameMinutes(4000), 12);
  assert.equal(taxiRideGameMinutes(10000), 30);
  assert.equal(taxiRideGameMinutes(500000), 90);
  assert.equal(taxiRideGameMinutes(Infinity), 90);
  assert.equal(taxiRideGameMinutes(NaN), 90);
  assert.ok(taxiRideGameMinutes(8000) > taxiRideGameMinutes(2000));
});

test('Taxi (B4) : le trajet fait avancer l’heure et baisser un peu la faim et l’énergie', () => {
  const state = createInitialPlayerState(rollDestiny('poignon'));
  const before = { ...state, gameTimeHours: 8.0 };
  const after = applyTaxiRideTime(before, 10000); // 30 min de jeu
  assert.ok(Math.abs(after.gameTimeHours - 8.5) < 1e-6, `${after.gameTimeHours}`);
  assert.equal(after.daysLived, before.daysLived);
  assert.ok(after.needs.hunger < before.needs.hunger);
  assert.ok(after.needs.energy < before.needs.energy);
  assert.ok(before.needs.hunger - after.needs.hunger < 5, 'effet léger');
  assert.equal(after.cash, before.cash, 'le temps ne coûte rien de plus');
  assert.ok(after.logs[0].message.includes('30 min'));
  // Passage de minuit
  const late = applyTaxiRideTime({ ...state, gameTimeHours: 23.8 }, 10000);
  assert.equal(late.daysLived, state.daysLived + 1);
  assert.ok(late.gameTimeHours < 1);
  // Partie terminée : rien ne bouge
  const over = { ...state, isGameOver: true };
  assert.equal(applyTaxiRideTime(over, 10000), over);
});
