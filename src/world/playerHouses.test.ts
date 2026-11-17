/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV
 * Tests complets des maisons de destins (phase pilote : poignon + golden_boy) :
 * 1) Complétude des données, origines physiques, unicité du mobilier, 4 points d'action.
 * 2) Atteignabilité BFS sur grille fine 0,1 m (rayon 0,35 m), avec et sans améliorations.
 * 3) Façades fermées ≤ 13 × 11 m, accès depuis la rue/voiture et parcelles réelles.
 * 4) Test fumée sur le vrai moteur physique WASM (public/physics.wasm).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CribUpgrades } from '../types/game';
import { PhysicsCore, SolidFlag } from '../physics/PhysicsCore';
import { ALL_DESTINIES } from '../core/destinies';
import { INTERIORS } from './interiors';
import { carSpotForLot, findHouseLot } from './city';
import {
  HOUSE_FLOOR_ORIGINS,
  HOUSE_REQUIRED_ACTIONS,
  HOUSE_SPECS,
  buildHouseFloorDef,
  facadeWorldSolids,
  getHouseUpgradeBoxes,
  houseToWorld,
  resolveHouseSpec,
} from './playerHouses';

const PLAYER_R = 0.35;
const GRID_STEP = 0.1;

const NO_UPGRADES: CribUpgrades = {
  splitClim: false,
  bafflesMaquis: false,
  tv4k: false,
  canapeCuir: false,
};

const ALL_UPGRADES: CribUpgrades = {
  splitClim: true,
  bafflesMaquis: true,
  tv4k: true,
  canapeCuir: true,
};

function distToBox(x: number, z: number, bx: number, bz: number, hx: number, hz: number): number {
  const dx = Math.max(Math.abs(x - bx) - hx, 0);
  const dz = Math.max(Math.abs(z - bz) - hz, 0);
  return Math.hypot(dx, dz);
}

function isFreeInBoxes(
  x: number,
  z: number,
  boxes: ReadonlyArray<{ x: number; z: number; hx: number; hz: number }>,
  radius = PLAYER_R
): boolean {
  for (const b of boxes) {
    if (distToBox(x, z, b.x, b.z, b.hx, b.hz) < radius) return false;
  }
  return true;
}

/** Parcours en largeur sur grille fine 0,1 m dans une emprise locale rectangulaire. */
function bfsReachable(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  startX: number,
  startZ: number,
  boxes: ReadonlyArray<{ x: number; z: number; hx: number; hz: number }>,
  radius = PLAYER_R
): (tx: number, tz: number, tolRadius?: number) => boolean {
  const cols = Math.round((maxX - minX) / GRID_STEP) + 1;
  const rows = Math.round((maxZ - minZ) / GRID_STEP) + 1;
  const toIx = (x: number) => Math.round((x - minX) / GRID_STEP);
  const toIz = (z: number) => Math.round((z - minZ) / GRID_STEP);
  const cellX = (ix: number) => minX + ix * GRID_STEP;
  const cellZ = (iz: number) => minZ + iz * GRID_STEP;

  const free = new Uint8Array(cols * rows);
  for (let iz = 0; iz < rows; iz++) {
    for (let ix = 0; ix < cols; ix++) {
      if (isFreeInBoxes(cellX(ix), cellZ(iz), boxes, radius)) {
        free[iz * cols + ix] = 1;
      }
    }
  }

  const sx = Math.max(0, Math.min(cols - 1, toIx(startX)));
  const sz = Math.max(0, Math.min(rows - 1, toIz(startZ)));
  assert.equal(
    free[sz * cols + sx],
    1,
    `Point de départ BFS (${startX}, ${startZ}) bloqué par un solide`
  );

  const visited = new Uint8Array(cols * rows);
  const qx = new Int32Array(cols * rows);
  const qz = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  visited[sz * cols + sx] = 1;
  qx[tail] = sx;
  qz[tail] = sz;
  tail++;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < tail) {
    const cx = qx[head];
    const cz = qz[head];
    head++;
    for (const [dx, dz] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
      const idx = nz * cols + nx;
      if (visited[idx] || !free[idx]) continue;
      visited[idx] = 1;
      qx[tail] = nx;
      qz[tail] = nz;
      tail++;
    }
  }

  return (tx: number, tz: number, tolRadius = 0.25): boolean => {
    const minIx = Math.max(0, toIx(tx - tolRadius));
    const maxIx = Math.min(cols - 1, toIx(tx + tolRadius));
    const minIz = Math.max(0, toIz(tz - tolRadius));
    const maxIz = Math.min(rows - 1, toIz(tz + tolRadius));
    for (let iz = minIz; iz <= maxIz; iz++) {
      for (let ix = minIx; ix <= maxIx; ix++) {
        if (!visited[iz * cols + ix]) continue;
        if (Math.hypot(cellX(ix) - tx, cellZ(iz) - tz) <= tolRadius) return true;
      }
    }
    return false;
  };
}

test('pilotes Poignon et Golden Boy : structure, origines, 4 actions et améliorations', () => {
  const poignon = HOUSE_SPECS.poignon;
  const golden = HOUSE_SPECS.golden_boy;
  assert.ok(poignon, 'poignon doit exister dans HOUSE_SPECS');
  assert.ok(golden, 'golden_boy doit exister dans HOUSE_SPECS');
  assert.equal(poignon.floors.length, 1);
  assert.equal(golden.floors.length, 2);

  // Vérifie resolveHouseSpec
  assert.equal(resolveHouseSpec('poignon', 'squat').destinyId, 'poignon');
  assert.equal(resolveHouseSpec('golden_boy', 'duplex_mer').destinyId, 'golden_boy');

  // Vérifie les origines dans la grille physique (±3072 m) et loin des lieux publics
  for (const org of HOUSE_FLOOR_ORIGINS) {
    assert.ok(Math.abs(org.x) < 3000 && Math.abs(org.z) < 3000, 'Origine maison hors limites monde');
    for (const pub of Object.values(INTERIORS)) {
      const d = Math.hypot(org.x - pub.origin.x, org.z - pub.origin.z);
      assert.ok(d >= 40, `Origine maison (${org.x}, ${org.z}) trop proche de ${pub.id}`);
    }
  }

  // Chaque maison possède les 4 points d'action obligatoires avec libellés exacts
  const required = Object.values(HOUSE_REQUIRED_ACTIONS);
  const signatures = new Set<string>();

  // Tous les 19 destins doivent disposer d’un plan dédié et distinct
  assert.equal(ALL_DESTINIES.length, 19, '19 destins attendus');
  for (const d of ALL_DESTINIES) {
    const spec = HOUSE_SPECS[d.id];
    assert.ok(spec, `Maison dédiée manquante pour le destin ${d.id}`);
    assert.equal(spec.homeType, d.homeType, `homeType incohérent pour ${d.id}`);
    assert.equal(resolveHouseSpec(d.id, d.homeType).destinyId, d.id);
  }
  const allSpecs = Object.values(HOUSE_SPECS).filter((s): s is NonNullable<typeof s> => s !== null);
  for (const spec of allSpecs) {
    const allActions = spec.floors.flatMap((f) => f.actions);
    for (const req of required) {
      const match = allActions.find((a) => a.id === req.id);
      assert.ok(match, `${spec.destinyId} : action ${req.id} manquante`);
      assert.equal(match.type, req.type);
      assert.equal(match.label, req.label);
    }
    assert.ok(spec.floors.some((f) => Boolean(f.bed)), `${spec.destinyId} : point de réveil lit manquant`);
    assert.equal(spec.floors[0].hasStreetExit, true);
    for (let i = 1; i < spec.floors.length; i++) {
      assert.equal(spec.floors[i].hasStreetExit, false);
    }
    const propSig = spec.floors.flatMap((f) => f.props.map((p) => p.kind)).join('|');
    assert.ok(!signatures.has(propSig), 'Deux destins partagent la même signature de meubles');
    signatures.add(propSig);

    // Améliorations : au moins canapeCuir et bafflesMaquis ajoutent des solides non vides
    const upgBoxes = spec.floors.flatMap((f) => getHouseUpgradeBoxes(f, ALL_UPGRADES));
    assert.ok(upgBoxes.length >= 2, `${spec.destinyId} : améliorations sans solide`);
  }
});

test('atteignabilité BFS intérieure (grille 0,1 m, rayon 0,35 m, sans et avec améliorations)', () => {
  for (const spec of Object.values(HOUSE_SPECS)) {
    if (!spec) continue;
    for (const [tag, upgrades] of [
      ['base', NO_UPGRADES],
      ['améliorations', ALL_UPGRADES],
    ] as const) {
      for (let floorIdx = 0; floorIdx < spec.floors.length; floorIdx++) {
        const floor = spec.floors[floorIdx];
        const def = buildHouseFloorDef(spec, floorIdx, upgrades);
        const reach = bfsReachable(
          -floor.halfW,
          floor.halfW,
          -floor.halfD,
          floor.halfD,
          def.entry.x,
          def.entry.z,
          def.boxes
        );

        if (def.hasStreetExit !== false) {
          assert.ok(
            reach(def.exit.x, def.exit.z, 0.2),
            `${spec.destinyId}#${floorIdx} (${tag}) : sortie (${def.exit.x}, ${def.exit.z}) inatteignable depuis l'entrée`
          );
        }
        if (def.bed) {
          assert.ok(
            reach(def.bed.x, def.bed.z, 0.25),
            `${spec.destinyId}#${floorIdx} (${tag}) : spawn lit (${def.bed.x}, ${def.bed.z}) inatteignable`
          );
        }
        for (const act of def.actions ?? []) {
          assert.ok(
            reach(act.x, act.z, 0.2),
            `${spec.destinyId}#${floorIdx} (${tag}) : action ${act.id} (${act.x}, ${act.z}) inatteignable depuis l'entrée`
          );
          if (act.type === 'interior_stairs') {
            assert.ok(act.targetFloor !== undefined && act.arrival, 'Escalier sans étage cible ou arrivée');
            const targetDef = buildHouseFloorDef(spec, act.targetFloor, upgrades);
            assert.ok(
              isFreeInBoxes(act.arrival.x, act.arrival.z, targetDef.boxes),
              `${spec.destinyId}#${act.targetFloor} (${tag}) : arrivée d'escalier (${act.arrival.x}, ${act.arrival.z}) bloquée`
            );
          }
        }
      }
    }
  }
});

test('façades extérieures : emprise ≤ 13 × 11 m, fermeture des murs, accès depuis rue et voiture', () => {
  for (const spec of Object.values(HOUSE_SPECS)) {
    if (!spec) continue;
    const solids = facadeWorldSolids(spec, 0, 0, 0);
    assert.ok(solids.some((s) => s.flag === 'building'), `${spec.destinyId} : aucun solide bâtiment`);

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of solids) {
      minX = Math.min(minX, s.x - s.hx);
      maxX = Math.max(maxX, s.x + s.hx);
      minZ = Math.min(minZ, s.z - s.hz);
      maxZ = Math.max(maxZ, s.z + s.hz);
    }
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    assert.ok(spanX <= 13.0, `${spec.destinyId} : largeur façade ${spanX.toFixed(2)} m > 13 m`);
    assert.ok(spanZ <= 11.0, `${spec.destinyId} : profondeur façade ${spanZ.toFixed(2)} m > 11 m`);

    // Le centre du bâtiment est fermé : le joueur ne peut ni apparaître ni marcher dedans
    assert.ok(
      !isFreeInBoxes(0, -0.6, solids),
      `${spec.destinyId} : le centre du bâtiment doit être bloqué de l'extérieur`
    );

    // Atteignabilité depuis le côté rue (z = 8,5 m) jusqu'au perron et à la porte-balise
    const reach = bfsReachable(-8, 8, -7, 10, 0, 8.5, solids);
    assert.ok(reach(0, spec.facade.porchZ, 0.2), `${spec.destinyId} : perron inaccessible depuis la rue`);
    assert.ok(reach(0, spec.facade.doorZ, 0.2), `${spec.destinyId} : porte-balise inaccessible depuis le perron`);

    // Vérification sur une parcelle réelle de la ville et sa place de voiture
    const lot = findHouseLot(spec.homeType, 4242);
    assert.ok(lot, `${spec.destinyId} : aucune parcelle trouvée pour ${spec.homeType}`);
    const curb = carSpotForLot(lot);
    // Transforme le point de voiture en repère local de la parcelle
    const dx = curb.x - lot.x;
    const dz = curb.z - lot.z;
    const c = Math.cos(lot.rotationY);
    const s = Math.sin(lot.rotationY);
    const curbLocalX = dx * c - dz * s;
    const curbLocalZ = dx * s + dz * c;
    assert.ok(
      isFreeInBoxes(curbLocalX, curbLocalZ, solids, 1.0),
      `${spec.destinyId} : la façade empiète sur carSpotForLot (${curbLocalX.toFixed(2)}, ${curbLocalZ.toFixed(2)})`
    );
    const porchWorld = houseToWorld(lot.x, lot.z, lot.rotationY, 0, spec.facade.porchZ);
    assert.ok(Number.isFinite(porchWorld.x) && Number.isFinite(porchWorld.z));
  }
});

test('moteur WASM réel : façade fermée infranchissable et parcours intérieur entrée → lit / escalier', async () => {
  const wasm = readFileSync(resolve(process.cwd(), 'public/physics.wasm'));
  const core = await PhysicsCore.fromBytes(wasm);

  const stepChar = (
    charId: number,
    dirX: number,
    dirZ: number,
    seconds: number,
    speed = 4.6
  ) => {
    const frames = Math.ceil(seconds * 60);
    const len = Math.hypot(dirX, dirZ) || 1;
    for (let i = 0; i < frames; i++) {
      core.characterInput(charId, dirX / len, dirZ / len, speed, false);
      core.step(1 / 60);
    }
    return core.readCharacter(charId);
  };

  const walkTo = (charId: number, tx: number, tz: number, maxSeconds: number, arriveDist = 0.25) => {
    const frames = Math.ceil(maxSeconds * 60);
    let st = core.readCharacter(charId);
    for (let i = 0; i < frames; i++) {
      const dx = tx - st.x;
      const dz = tz - st.z;
      const d = Math.hypot(dx, dz);
      if (d <= arriveDist) {
        core.characterInput(charId, 0, 0, 0, false);
        core.step(1 / 60);
        return core.readCharacter(charId);
      }
      core.characterInput(charId, dx / d, dz / d, 4.6, false);
      core.step(1 / 60);
      st = core.readCharacter(charId);
    }
    return st;
  };

  // 1. Extérieurs tournés (rotationY = Math.PI / 2) : mur avant fermé arrête le personnage
  const allSpecs = Object.values(HOUSE_SPECS).filter((s): s is NonNullable<typeof s> => s !== null);
  for (const spec of allSpecs) {
    core.reset();
    const rotY = Math.PI / 2;
    const cx = 100;
    const cz = -60;
    for (const s of facadeWorldSolids(spec, cx, cz, rotY)) {
      core.addBox(s.x, s.z, s.hx, s.hz, s.angle, s.h, s.flag === 'building' ? SolidFlag.BUILDING : SolidFlag.PROP);
    }
    const porch = houseToWorld(cx, cz, rotY, 0, spec.facade.porchZ);
    const doorWall = houseToWorld(cx, cz, rotY, 0, -0.6);
    const ch = core.createCharacter(porch.x, porch.z, PLAYER_R);
    const res = stepChar(ch, doorWall.x - porch.x, doorWall.z - porch.z, 2.0);
    // Transforme la position atteinte en repère local de la façade : z_local reste devant la façade sud
    const building = spec.facade.volumes.find((v) => v.kind === 'building')!;
    const frontWallZ = building.z + building.hz;
    const dx = res.x - cx;
    const dz = res.z - cz;
    const localZ = dx * Math.sin(rotY) + dz * Math.cos(rotY);
    assert.ok(
      localZ >= frontWallZ + PLAYER_R - 0.05,
      `${spec.destinyId} : le joueur a traversé la façade fermée (localZ=${localZ.toFixed(2)}, mur=${frontWallZ.toFixed(2)})`
    );
  }

  // 2. Intérieur Poignon : entrée → lit en marchant + poussée dans les meubles et murs
  {
    core.reset();
    const def = buildHouseFloorDef(HOUSE_SPECS.poignon!, 0, ALL_UPGRADES);
    for (const b of def.boxes) {
      core.addBox(def.origin.x + b.x, def.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const ox = def.origin.x;
    const oz = def.origin.z;
    const sleepAct = def.actions!.find((a) => a.id === 'home_bed')!;
    const ch = core.createCharacter(ox + def.entry.x, oz + def.entry.z, PLAYER_R);
    const st = walkTo(ch, ox + sleepAct.x, oz + sleepAct.z, 2.0, 0.25);
    const distSleep = Math.hypot(st.x - (ox + sleepAct.x), st.z - (oz + sleepAct.z));
    assert.ok(distSleep <= sleepAct.radius, `Poignon : lit hors de portée (d=${distSleep.toFixed(2)})`);

    // Poussée volontaire dans le lit (-2.0, -1.55) : le joueur ne doit pas entrer dans le solide du lit
    const afterPush = stepChar(ch, -2.0 - (st.x - ox), -1.55 - (st.z - oz), 1.5);
    const lx = afterPush.x - ox;
    const lz = afterPush.z - oz;
    const bedSolid = def.boxes.find((b) => Math.abs(b.x - -2.0) < 0.05 && Math.abs(b.z - -1.55) < 0.05)!;
    const dBed = distToBox(lx, lz, bedSolid.x, bedSolid.z, bedSolid.hx, bedSolid.hz);
    assert.ok(dBed >= PLAYER_R - 0.04, `Poignon : personnage entré dans le lit (d=${dBed.toFixed(3)})`);

    // Poussée contre le mur nord (z = -2.5)
    const wallPush = stepChar(ch, 0, -1, 1.5);
    assert.ok(wallPush.z - oz >= -2.5 + 0.15 + PLAYER_R - 0.05, 'Poignon : traversée du mur nord');
  }

  // 2bis. Vérification WASM entrée -> sortie -> mur sud sur toutes les maisons enregistrées
  for (const spec of allSpecs) {
    core.reset();
    const def = buildHouseFloorDef(spec, 0, ALL_UPGRADES);
    for (const b of def.boxes) {
      core.addBox(def.origin.x + b.x, def.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const ox = def.origin.x;
    const oz = def.origin.z;
    const ch = core.createCharacter(ox + def.entry.x, oz + def.entry.z, PLAYER_R);
    const atExit = walkTo(ch, ox + def.exit.x, oz + def.exit.z, 2.0, 0.25);
    const dExit = Math.hypot(atExit.x - (ox + def.exit.x), atExit.z - (oz + def.exit.z));
    assert.ok(
      dExit <= def.exit.radius,
      `${spec.destinyId} RDC : sortie hors de portée WASM (d=${dExit.toFixed(2)})`
    );
    // Poussée contre un mur latéral est (x = +halfW)
    core.placeCharacter(ch, ox, oz);
    const eastPush = stepChar(ch, 1, 0, 2.0);
    assert.ok(
      eastPush.x - ox <= def.halfW - 0.15 - PLAYER_R + 0.05,
      `${spec.destinyId} RDC : traversée du mur est`
    );
  }

  // 2ter. Vérification WASM multi-étages sur toutes les maisons à 2 étages
  for (const spec of allSpecs.filter((s) => s.floors.length > 1)) {
    core.reset();
    const def0 = buildHouseFloorDef(spec, 0, ALL_UPGRADES);
    for (const b of def0.boxes) {
      core.addBox(def0.origin.x + b.x, def0.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const stairsUp = def0.actions!.find((a) => a.type === 'interior_stairs')!;
    const ch0 = core.createCharacter(def0.origin.x + def0.entry.x, def0.origin.z + def0.entry.z, PLAYER_R);
    const st0 = walkTo(ch0, def0.origin.x + stairsUp.x, def0.origin.z + stairsUp.z, 2.5, 0.25);
    assert.ok(
      Math.hypot(st0.x - (def0.origin.x + stairsUp.x), st0.z - (def0.origin.z + stairsUp.z)) <= stairsUp.radius,
      `${spec.destinyId} RDC : escalier inatteignable en WASM`
    );

    core.reset();
    const def1 = buildHouseFloorDef(spec, 1, ALL_UPGRADES);
    for (const b of def1.boxes) {
      core.addBox(def1.origin.x + b.x, def1.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const arr = stairsUp.arrival!;
    const bedAct = def1.actions!.find((a) => a.id === 'home_bed')!;
    const ch1 = core.createCharacter(def1.origin.x + arr.x, def1.origin.z + arr.z, PLAYER_R);
    const hasVerticalNorthPartition = def1.boxes.some(
      (b) => b.kind === 'partition' && Math.abs(b.x) < 0.5 && b.z < -0.5
    );
    if (hasVerticalNorthPartition) {
      walkTo(ch1, def1.origin.x + bedAct.x, def1.origin.z + 0.85, 2.5, 0.25);
    } else {
      walkTo(ch1, def1.origin.x, def1.origin.z + arr.z, 2.0, 0.25);
      walkTo(ch1, def1.origin.x, def1.origin.z - 0.85, 2.0, 0.25);
    }
    const atBed = walkTo(ch1, def1.origin.x + bedAct.x, def1.origin.z + bedAct.z, 2.5, 0.25);
    const dBedAct = Math.hypot(atBed.x - (def1.origin.x + bedAct.x), atBed.z - (def1.origin.z + bedAct.z));
    assert.ok(dBedAct <= bedAct.radius, `${spec.destinyId} R+1 : lit hors de portée WASM (d=${dBedAct.toFixed(2)})`);
  }

  // 3. Intérieur Golden Boy (2 étages) : RDC escalier -> R+1 lit + rambarde terrasse solide
  {
    core.reset();
    const def0 = buildHouseFloorDef(HOUSE_SPECS.golden_boy!, 0, ALL_UPGRADES);
    for (const b of def0.boxes) {
      core.addBox(def0.origin.x + b.x, def0.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const stairs = def0.actions!.find((a) => a.id === 'stairs_to_1')!;
    const ch0 = core.createCharacter(def0.origin.x + def0.entry.x, def0.origin.z + def0.entry.z, PLAYER_R);
    const st0 = walkTo(ch0, def0.origin.x + stairs.x, def0.origin.z + stairs.z, 2.0, 0.25);
    assert.ok(
      Math.hypot(st0.x - (def0.origin.x + stairs.x), st0.z - (def0.origin.z + stairs.z)) <= stairs.radius,
      'Golden Boy RDC : escalier inatteignable'
    );

    // Étage R+1 : spawn à l'arrivée de l'escalier -> marche vers le lit puis test rambarde terrasse sud
    core.reset();
    const def1 = buildHouseFloorDef(HOUSE_SPECS.golden_boy!, 1, ALL_UPGRADES);
    for (const b of def1.boxes) {
      core.addBox(def1.origin.x + b.x, def1.origin.z + b.z, b.hx, b.hz, 0, b.h, SolidFlag.PROP);
    }
    const arr = stairs.arrival!;
    const bedAct = def1.actions!.find((a) => a.id === 'home_bed')!;
    const ch1 = core.createCharacter(def1.origin.x + arr.x, def1.origin.z + arr.z, PLAYER_R);
    // Passage par le couloir central (0, -0.5) puis vers le lit (-1.35, -2.45)
    walkTo(ch1, def1.origin.x, def1.origin.z - 0.5, 2.5, 0.25);
    const atBed = walkTo(ch1, def1.origin.x + bedAct.x, def1.origin.z + bedAct.z, 2.5, 0.25);
    const dBedAct = Math.hypot(atBed.x - (def1.origin.x + bedAct.x), atBed.z - (def1.origin.z + bedAct.z));
    assert.ok(dBedAct <= bedAct.radius, `Golden Boy R+1 : lit hors de portée (d=${dBedAct.toFixed(2)})`);

    // Test rambarde terrasse sud (z = 4.5, hx = 5.5, hz = 0.15) depuis le milieu de la terrasse (x = 0, z = 2.0)
    core.placeCharacter(ch1, def1.origin.x, def1.origin.z + 2.0);
    const atRail = stepChar(ch1, 0, 1, 1.5);
    assert.ok(
      atRail.z - def1.origin.z <= 4.5 - 0.15 - PLAYER_R + 0.05,
      `Golden Boy R+1 : traversée de la rambarde de terrasse (z=${(atRail.z - def1.origin.z).toFixed(2)})`
    );
  }
});
