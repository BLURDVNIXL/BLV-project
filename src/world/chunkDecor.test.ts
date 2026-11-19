/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { PhysicsCore, SolidFlag, VehiclePreset, createCharacterState, createVehicleState } from '../physics/PhysicsCore';
import { ChunkDecorPlan, ChunkSolid, collectChunkDecor, chunkDecorSolids } from './chunkDecor';
import { SPECIAL_FOOTPRINTS, carSpotForLot, chunkOf, findHouseLot, generateChunk } from './city';
import { DISTRICTS, HomeType, isWater } from './abidjanGeography';
import { project } from './geo';
import { bridgeAt, roadAt } from './roads';
import { exteriorSolidsFor } from './exteriorSolids';
import { RoadCar, updateRoadTraffic } from './roadTraffic';
import { StreetAnimSystem } from '../3d/streetAnim';

const wasmBytes = readFileSync(new URL('../../public/physics.wasm', import.meta.url));

function registerDecorSolid(core: PhysicsCore, s: ChunkSolid): number {
  return s.shape === 'box'
    ? core.addBox(s.x, s.z, s.hx, s.hz, s.angle, s.h, SolidFlag.PROP)
    : core.addCircle(s.x, s.z, s.r, s.h, SolidFlag.PROP);
}

/** Vérifie avec WASM qu'un piéton marchant vers (tx, tz) depuis un côté dégagé est arrêté avant d'atteindre le centre. */
async function assertSolidBlocksCharacter(solid: ChunkSolid, label: string): Promise<void> {
  const core = await PhysicsCore.fromBytes(wasmBytes);
  const id = registerDecorSolid(core, solid);
  assert.ok(id >= 0, `${label}: solide non inséré`);

  const angle = solid.shape === 'box' ? solid.angle : 0;
  // Approche perpendiculaire à l'axe e2 (ou radial pour un cercle)
  const dirX = Math.sin(angle);
  const dirZ = -Math.cos(angle);
  const extent = solid.shape === 'box' ? solid.hz : solid.r;
  const startDist = extent + 1.5;
  const sx = solid.x - dirX * startDist;
  const sz = solid.z - dirZ * startDist;

  const ch = core.createCharacter(sx, sz, 0.35);
  const st = createCharacterState();
  for (let i = 0; i < 90; i++) {
    core.characterInput(ch, dirX, dirZ, 4.5, false);
    core.step(1 / 60);
  }
  core.readCharacter(ch, st);
  const distToCenter = Math.hypot(st.x - solid.x, st.z - solid.z);
  assert.ok(
    distToCenter >= extent + 0.25,
    `${label}: piéton a traversé le solide (dist=${distToCenter.toFixed(2)}m < ${(extent + 0.25).toFixed(2)}m)`
  );
}

/** Cherche une occurrence réelle d'un décor dans les chunks autour de chaque commune. */
function findSampleInMap(
  districtIds: string[],
  predicate: (plan: ChunkDecorPlan) => boolean
): { plan: ChunkDecorPlan; cx: number; cz: number } | null {
  for (const id of districtIds) {
    const d = DISTRICTS.find((x) => x.id === id)!;
    const c = project(d.center.lat, d.center.lon);
    const ccx = chunkOf(c.x);
    const ccz = chunkOf(c.z);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const chunk = generateChunk(ccx + dx, ccz + dz);
        const plan = collectChunkDecor(chunk);
        if (predicate(plan)) return { plan, cx: ccx + dx, cz: ccz + dz };
      }
    }
  }
  return null;
}

test('chaque type de décor ajouté possède un solide bloquant réellement dans PhysicsCore', async () => {
  const streetDistricts = ['abobo', 'yopougon', 'adjame'];
  const poleSample = findSampleInMap(streetDistricts, (p) => p.poles.length > 0);
  const stallSample = findSampleInMap(streetDistricts, (p) => p.stalls.length > 0);
  const binSample = findSampleInMap(streetDistricts, (p) => p.bins.length > 0);
  const carSample = findSampleInMap(streetDistricts, (p) => p.parkedCars.length > 0);
  const puddleSample = findSampleInMap(streetDistricts, (p) => p.puddles.length > 0);
  assert.ok(poleSample && stallSample && binSample && carSample && puddleSample, 'échantillon rue locale introuvable');

  const arterialSample = findSampleInMap(['plateau', 'treichville', 'marcory'], (p) =>
    p.streetlamps.length > 0 && p.shelters.length > 0
  );
  assert.ok(arterialSample, 'échantillon grand axe introuvable');

  const villaSample = findSampleInMap(['cocody', 'riviera'], (p) =>
    p.buildingShrubs.length > 0 && p.buildingBoxes.some((b) => b.y0 === 0 && b.h === 1.35)
  );
  assert.ok(villaSample, 'échantillon villa clôturée introuvable');

  const shackSample = findSampleInMap(['attecoube'], (p) =>
    p.buildingBoxes.some((b) => b.y0 === 0 && b.h === 0.52)
  );
  assert.ok(shackSample, 'échantillon cour/bidon introuvable');

  function findSampleNearPoints(
    pts: Array<{ lat: number; lon: number }>,
    predicate: (plan: ChunkDecorPlan) => boolean
  ): { plan: ChunkDecorPlan; cx: number; cz: number } | null {
    for (const pt of pts) {
      const c = project(pt.lat, pt.lon);
      const ccx = chunkOf(c.x);
      const ccz = chunkOf(c.z);
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          const chunk = generateChunk(ccx + dx, ccz + dz);
          const plan = collectChunkDecor(chunk);
          if (predicate(plan)) return { plan, cx: ccx + dx, cz: ccz + dz };
        }
      }
    }
    return null;
  }

  const coastPts = [
    { lat: 5.238, lon: -3.96 },
    { lat: 5.233, lon: -3.915 },
    { lat: 5.243, lon: -4.0 },
  ];
  const pirogueSample = findSampleNearPoints(coastPts, (p) => p.pirogues.length > 0);
  const parasolSample = findSampleNearPoints(coastPts, (p) => p.parasols.length > 0);
  assert.ok(pirogueSample && parasolSample, 'échantillon plage introuvable');

  const bancoSample = findSampleInMap(['banco'], (p) =>
    p.shrubs.length > 0
  );
  assert.ok(bancoSample, 'échantillon sous-bois Banco introuvable');

  // Vérification physique réelle sur chaque solide représentatif
  const pole = poleSample.plan.poles[0];
  const poleSolid = poleSample.plan.solids.find((s) => Math.hypot(s.x - pole.x, s.z - pole.z) < 0.05)!;
  assert.ok(poleSolid, 'solide poteau électrique manquant');
  await assertSolidBlocksCharacter(poleSolid, 'poteau électrique');

  const stall = stallSample.plan.stalls[0];
  const stallSolid = stallSample.plan.solids.find((s) => s.shape === 'box' && Math.hypot(s.x - stall.x, s.z - stall.z) < 0.05)!;
  assert.ok(stallSolid, 'solide micro-étal manquant');
  await assertSolidBlocksCharacter(stallSolid, 'micro-étal');

  const bin = binSample.plan.bins[0];
  const binSolid = binSample.plan.solids.find((s) => s.shape === 'box' && Math.hypot(s.x - bin.x, s.z - bin.z) < 0.05)!;
  assert.ok(binSolid, 'solide poubelle manquant');
  await assertSolidBlocksCharacter(binSolid, 'poubelle');

  const parked = carSample.plan.parkedCars[0];
  const carSolid = carSample.plan.solids.find((s) => s.shape === 'box' && Math.hypot(s.x - parked.x, s.z - parked.z) < 0.05)!;
  assert.ok(carSolid, 'solide voiture garée manquant');
  await assertSolidBlocksCharacter(carSolid, 'voiture garée');

  const lamp = arterialSample.plan.streetlamps[0];
  const lampSolid = arterialSample.plan.solids.find((s) => Math.hypot(s.x - lamp.poleX, s.z - lamp.poleZ) < 0.05)!;
  assert.ok(lampSolid, 'solide lampadaire manquant');
  await assertSolidBlocksCharacter(lampSolid, 'lampadaire grand axe');

  const shelter = arterialSample.plan.shelters[0];
  const shelterBackSolid = arterialSample.plan.solids.find((s) => Math.hypot(s.x - shelter.backX, s.z - shelter.backZ) < 0.05)!;
  assert.ok(shelterBackSolid, 'solide abribus SOTRA manquant');
  await assertSolidBlocksCharacter(shelterBackSolid, 'abribus SOTRA');

  const muret = villaSample.plan.buildingBoxes.find((b) => b.y0 === 0 && b.h === 1.35)!;
  const muretSolid = villaSample.plan.solids.find((s) => Math.hypot(s.x - muret.x, s.z - muret.z) < 0.05)!;
  assert.ok(muretSolid, 'solide muret villa manquant');
  await assertSolidBlocksCharacter(muretSolid, 'muret villa');

  const boug = villaSample.plan.buildingShrubs[0];
  const bougSolid = villaSample.plan.solids.find((s) => s.shape === 'circle' && Math.hypot(s.x - boug.x, s.z - boug.z) < 0.05)!;
  assert.ok(bougSolid, 'solide bougainvillier manquant');
  await assertSolidBlocksCharacter(bougSolid, 'bougainvillier');

  const bidon = shackSample.plan.buildingBoxes.find((b) => b.y0 === 0 && b.h === 0.52)!;
  const bidonSolid = shackSample.plan.solids.find((s) => Math.hypot(s.x - bidon.x, s.z - bidon.z) < 0.05)!;
  assert.ok(bidonSolid, 'solide bidon bleu manquant');
  await assertSolidBlocksCharacter(bidonSolid, 'bidon bleu');

  const pirogue = pirogueSample.plan.pirogues[0];
  const pirSolid = pirogueSample.plan.solids.find((s) => Math.hypot(s.x - pirogue.x, s.z - pirogue.z) < 0.05)!;
  assert.ok(pirSolid, 'solide pirogue échouée manquant');
  await assertSolidBlocksCharacter(pirSolid, 'pirogue échouée');

  const parasol = parasolSample.plan.parasols[0];
  const parSolid = parasolSample.plan.solids.find((s) => Math.hypot(s.x - parasol.x, s.z - parasol.z) < 0.05)!;
  assert.ok(parSolid, 'solide parasol plage manquant');
  await assertSolidBlocksCharacter(parSolid, 'parasol plage');

  const bush = bancoSample.plan.shrubs[0];
  const bushSolid = bancoSample.plan.solids.find((s) => s.shape === 'circle' && Math.hypot(s.x - bush.x, s.z - bush.z) < 0.05)!;
  assert.ok(bushSolid, 'solide sous-bois Banco manquant');
  await assertSolidBlocksCharacter(bushSolid, 'sous-bois Banco');

  // Touffes d'herbe et flaques ne génèrent pas de solide bloquant
  const pud = puddleSample.plan.puddles[0];
  assert.ok(!puddleSample.plan.solids.some((s) => Math.hypot(s.x - pud.x, s.z - pud.z) < 0.5), 'flaque ne doit pas bloquer');
});

test('Maquis, Marché d Adjamé et feux tricolores : nouvelles collisions présentes et portes libres', async () => {
  // Maquis : tabourets + brasero
  const maquis = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'maquis')!;
  const maquisSolids = exteriorSolidsFor('maquis', maquis.x, maquis.z, -maquis.angle, maquis.w, maquis.d);
  assert.ok(maquisSolids.length >= 13, `maquis devrait avoir >= 13 solides (poteaux, baffles, tables, tabourets, brasero), reçu ${maquisSolids.length}`);
  await assertSolidBlocksCharacter(maquisSolids[maquisSolids.length - 1], 'brasero maquis');

  // Porte du Maquis et allée centrale du Marché libres
  const vxM = -Math.sin(maquis.angle);
  const vzM = Math.cos(maquis.angle);
  const maquisDoor = { x: maquis.x + vxM * (maquis.d / 2 + 2.4), z: maquis.z + vzM * (maquis.d / 2 + 2.4) };
  for (const s of maquisSolids) {
    const d = Math.hypot(s.x - maquisDoor.x, s.z - maquisDoor.z);
    const r = s.shape === 'circle' ? s.r : Math.hypot(s.hx, s.hz);
    assert.ok(d > r + 0.4, `solide maquis trop proche de la porte (${d.toFixed(2)}m)`);
  }

  // Marché d'Adjamé : sacs ajoutés sur les 16 étals (3 solides par étal = 48)
  const marche = SPECIAL_FOOTPRINTS.find((f) => f.spec.id === 'marche_adjame')!;
  const marcheSolids = exteriorSolidsFor('marche_adjame', marche.x, marche.z, -marche.angle, marche.w, marche.d);
  assert.equal(marcheSolids.length, 48, '16 étals × 3 solides (table, caisse, sacs)');
  await assertSolidBlocksCharacter(marcheSolids[2], 'sacs marché');

  // Feux tricolores : hors voirie / eau et dotés de collisions
  const scene = new THREE.Scene();
  const streetAnim = new StreetAnimSystem(scene, false);
  const signals = streetAnim.getSignalPositions();
  assert.ok(signals.length >= 6);
  for (const sig of signals) {
    assert.equal(isWater(sig), false, 'feu tricolore dans l eau');
    assert.equal(roadAt(sig), 'none', 'feu tricolore sur la chaussée');
    assert.equal(bridgeAt(sig, 2.5), null, 'feu tricolore sur un pont');
  }
  await assertSolidBlocksCharacter({ shape: 'circle', x: signals[0].x, z: signals[0].z, r: 0.14, h: 4.4 }, 'feu tricolore');
  streetAnim.dispose();
});

test('voitures garées et mobilier ne bloquent ni carSpotForLot ni le trafic IA', async () => {
  const homes: HomeType[] = ['squat', 'chambre_cour', 'studio', 'deux_pieces', 'trois_pieces', 'duplex_mer', 'villa_ambassade', 'bunker'];
  for (const h of homes) {
    const lot = findHouseLot(h, 4242);
    assert.ok(lot, `parcelle manquante pour ${h}`);
    const spot = carSpotForLot(lot);
    const chunk = generateChunk(chunkOf(spot.x), chunkOf(spot.z), { reservedLots: new Set([lot.id]) });
    const solids = chunkDecorSolids(chunk);
    for (const s of solids) {
      const d = Math.hypot(s.x - spot.x, s.z - spot.z);
      const r = s.shape === 'circle' ? s.r : Math.hypot(s.hx, s.hz);
      assert.ok(d > r + 1.1, `carSpotForLot(${h}) gêné par décor (${d.toFixed(2)}m)`);
    }
  }

  // Simulation trafic IA 20 s en ville (Abobo + Plateau) avec TOUS les solides de décor actifs
  const core = await PhysicsCore.fromBytes(wasmBytes);
  const abobo = project(5.415, -4.02);
  const acx = chunkOf(abobo.x);
  const acz = chunkOf(abobo.z);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const ch = generateChunk(acx + dx, acz + dz);
      for (const b of ch.buildings) if (b.solid) core.addBox(b.x, b.z, b.w / 2, b.d / 2, b.angle, b.h, SolidFlag.BUILDING);
      for (const t of ch.trees) core.addCircle(t.x, t.z, t.r, t.h, SolidFlag.PROP);
      for (const s of chunkDecorSolids(ch)) registerDecorSolid(core, s);
      for (const w of ch.water) core.addBox(w.x, w.z, w.hx, w.hz, 0, 3, SolidFlag.WATER);
    }
  }

  const cars: RoadCar[] = [];
  for (let i = 0; i < 6; i++) {
    const vehId = core.createVehicle(VehiclePreset.WORO_WORO, 0, 0, 0);
    core.setVehicleEnabled(vehId, false);
    cars.push({ vehId, art: 0, dir: 1, targetSpeed: 10, stuckTimer: 0, wait: 0.01 });
  }
  const vs = createVehicleState();
  let speedSum = 0;
  let speedSamples = 0;
  let nanCount = 0;
  for (let step = 0; step < 20 * 60; step++) {
    updateRoadTraffic(core, cars, abobo.x, abobo.z, 1 / 60, []);
    core.step(1 / 60);
    if (step > 120 && step % 10 === 0) {
      for (const c of cars) {
        if (c.wait > 0) continue;
        core.readVehicle(c.vehId, vs);
        if (!Number.isFinite(vs.x + vs.z + vs.speed)) nanCount++;
        speedSum += vs.speed;
        speedSamples++;
      }
    }
  }
  assert.equal(nanCount, 0, 'NaN détecté dans trafic IA');
  assert.ok(speedSamples > 0 && speedSum / speedSamples > 4.0, `trafic bloqué par décor: vitesse moy=${(speedSum / Math.max(1, speedSamples)).toFixed(2)} m/s`);
});

test('budget MAX_SOLIDS respecté dans les fenêtres 11×11 les plus denses', () => {
  for (const id of ['abobo', 'yopougon', 'cocody', 'banco']) {
    const d = DISTRICTS.find((x) => x.id === id)!;
    const c = project(d.center.lat, d.center.lon);
    const ccx = chunkOf(c.x);
    const ccz = chunkOf(c.z);
    let totalSolids = 0;
    for (let dx = -5; dx <= 5; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        const ch = generateChunk(ccx + dx, ccz + dz);
        totalSolids += ch.buildings.filter((b) => b.solid).length + ch.trees.length + ch.water.length + chunkDecorSolids(ch).length;
      }
    }
    assert.ok(totalSolids < 24000, `${id}: fenêtre 11×11 trop chargée (${totalSolids} solides / 32768 max)`);
  }
});
