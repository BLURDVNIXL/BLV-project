/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Garde-fou des collisions d'intérieur et des façades de maisons :
 * tout meuble ou volume visible au sol doit avoir un solide (`prop` / `building`),
 * et aucun solide ne doit gêner l'entrée, la sortie, les escaliers, le perron ou une zone d'action.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mesh } from 'three';
import type { CribUpgrades } from '../types/game';

/** Un personnage enjambe ce qui fait moins de 0,35 m (physics.cpp) : inutile d'y mettre un solide. */
const MIN_BLOCK_H = 0.35;
/** Dessous à partir de 1,5 m : décor suspendu ou mural haut (étagère, enseigne, plafonnier, auvent). */
const SUSPENDED_Y = 1.5;
/** Épaisseur ≤ 25 cm : décor collé au mur (tableau, affiche, ouvrant plat) ou poteau fin (potence). */
const THIN = 0.25;
/** Part minimale de l'emprise d'un meuble recouverte par des solides. */
const MIN_COVER = 0.6;
/** Un groupe d'au moins ce nombre de meshes est un PNJ (voir l'étape « PNJ d'intérieur »). */
const NPC_MESHES = 28;
/** Rayon d'un personnage (physics.cpp). */
const PLAYER_R = 0.35;

const ALL_UPGRADES: CribUpgrades = {
  splitClim: true,
  bafflesMaquis: true,
  tv4k: true,
  canapeCuir: true,
};

const noop = (): void => undefined;
const ctxStub = new Proxy({} as Record<string, unknown>, {
  get: (_t, p) => {
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (p === 'createPattern') return () => ({});
    return noop;
  },
  set: () => true,
});

function installDocumentStub() {
  Object.assign(globalThis, {
    document: { createElement: () => ({ getContext: () => ctxStub, width: 0, height: 0 }) },
  });
}

test('chaque meuble visible qui occupe le sol a un solide', async () => {
  installDocumentStub();
  const THREE = await import('three');
  const { INTERIORS } = await import('../world/interiors');
  const { createInteriorRig } = await import('./interiors');

  const violations: string[] = [];
  for (const def of Object.values(INTERIORS)) {
    const rig = createInteriorRig(def);
    rig.group.updateMatrixWorld(true);
    const props = def.boxes.filter((b) => b.kind === 'prop');
    const structure = def.boxes.filter((b) => b.kind !== 'prop');

    rig.group.children.forEach((child, i) => {
      const bb = new THREE.Box3().setFromObject(child);
      if (bb.isEmpty()) return;
      const cx = (bb.min.x + bb.max.x) / 2 - def.origin.x;
      const cz = (bb.min.z + bb.max.z) / 2 - def.origin.z;
      const hx = (bb.max.x - bb.min.x) / 2;
      const hz = (bb.max.z - bb.min.z) / 2;
      let meshes = 0;
      child.traverse((o) => { if ((o as Mesh).isMesh) meshes++; });

      const isStructure = structure.some(
        (b) => Math.abs(b.x - cx) < 0.02 && Math.abs(b.z - cz) < 0.02 && Math.abs(b.hx - hx) < 0.02 && Math.abs(b.hz - hz) < 0.02
      );
      if (isStructure || meshes >= NPC_MESHES) return;
      if (bb.max.y < MIN_BLOCK_H || bb.min.y >= SUSPENDED_Y || Math.min(hx, hz) * 2 <= THIN) return;

      let inside = 0;
      for (let a = 0; a < 5; a++) {
        for (let b = 0; b < 5; b++) {
          const px = cx - hx + ((a + 0.5) / 5) * 2 * hx;
          const pz = cz - hz + ((b + 0.5) / 5) * 2 * hz;
          if (props.some((p) => Math.abs(px - p.x) <= p.hx && Math.abs(pz - p.z) <= p.hz)) inside++;
        }
      }
      if (inside / 25 < MIN_COVER) {
        violations.push(`${def.id} : élément #${i} local (${cx.toFixed(2)}, ${cz.toFixed(2)}) demi (${hx.toFixed(2)}, ${hz.toFixed(2)}) y ${bb.min.y.toFixed(2)}–${bb.max.y.toFixed(2)} couvert à ${Math.round((inside / 25) * 100)} %`);
      }
    });
    rig.dispose();
  }

  assert.deepEqual(violations, [], `Meubles visibles sans solide :\n${violations.join('\n')}`);
});

test("aucun solide ne gêne l'entrée, la sortie ni une zone d'action", async () => {
  const { INTERIORS } = await import('../world/interiors');
  const problems: string[] = [];

  for (const def of Object.values(INTERIORS)) {
    const points: Array<[string, number, number]> = [
      ['entrée', def.entry.x, def.entry.z],
      ['sortie', def.exit.x, def.exit.z],
      ...(def.actions ?? []).map((a): [string, number, number] => [`action ${a.id}`, a.x, a.z]),
    ];
    for (const [name, x, z] of points) {
      for (const b of def.boxes) {
        if (b.kind === 'wall') continue;
        const dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
        const dz = Math.max(Math.abs(z - b.z) - b.hz, 0);
        if (Math.hypot(dx, dz) < PLAYER_R) {
          problems.push(`${def.id} : ${name} (${x}, ${z}) touche ${b.kind} (${b.x}, ${b.z})`);
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('maisons des destins (étages) : parité mesh/solide et points clés dégagés', async () => {
  installDocumentStub();
  const THREE = await import('three');
  const { HOUSE_SPECS, buildHouseFloorDef } = await import('../world/playerHouses');
  const { createHouseFloorFurniture } = await import('./houseModels');
  const { createInteriorRig } = await import('./interiors');

  const violations: string[] = [];
  const blockages: string[] = [];

  for (const spec of Object.values(HOUSE_SPECS)) {
    if (!spec) continue;
    for (let floorIdx = 0; floorIdx < spec.floors.length; floorIdx++) {
      const floor = spec.floors[floorIdx];
      const def = buildHouseFloorDef(spec, floorIdx, ALL_UPGRADES);
      const furniture = createHouseFloorFurniture(floor, ALL_UPGRADES);
      const rig = createInteriorRig(def, furniture.build);
      rig.group.updateMatrixWorld(true);

      const props = def.boxes.filter((b) => b.kind === 'prop');
      const structure = def.boxes.filter((b) => b.kind !== 'prop');

      rig.group.children.forEach((child, i) => {
        if (!child.visible) return;
        const bb = new THREE.Box3().setFromObject(child);
        if (bb.isEmpty()) return;
        const cx = (bb.min.x + bb.max.x) / 2 - def.origin.x;
        const cz = (bb.min.z + bb.max.z) / 2 - def.origin.z;
        const hx = (bb.max.x - bb.min.x) / 2;
        const hz = (bb.max.z - bb.min.z) / 2;

        const isStructure = structure.some(
          (b) => Math.abs(b.x - cx) < 0.02 && Math.abs(b.z - cz) < 0.02 && Math.abs(b.hx - hx) < 0.02 && Math.abs(b.hz - hz) < 0.02
        );
        if (isStructure) return;
        if (bb.max.y < MIN_BLOCK_H || bb.min.y >= SUSPENDED_Y || Math.min(hx, hz) * 2 <= THIN) return;

        let inside = 0;
        for (let a = 0; a < 5; a++) {
          for (let b = 0; b < 5; b++) {
            const px = cx - hx + ((a + 0.5) / 5) * 2 * hx;
            const pz = cz - hz + ((b + 0.5) / 5) * 2 * hz;
            if (props.some((p) => Math.abs(px - p.x) <= p.hx && Math.abs(pz - p.z) <= p.hz)) inside++;
          }
        }
        if (inside / 25 < MIN_COVER) {
          violations.push(`${spec.destinyId}#${floorIdx} : élément #${i} local (${cx.toFixed(2)}, ${cz.toFixed(2)}) demi (${hx.toFixed(2)}, ${hz.toFixed(2)}) y ${bb.min.y.toFixed(2)}–${bb.max.y.toFixed(2)} couvert à ${Math.round((inside / 25) * 100)} %`);
        }
      });

      const points: Array<[string, number, number]> = [
        ['entrée', def.entry.x, def.entry.z],
        ...(def.hasStreetExit !== false ? [['sortie', def.exit.x, def.exit.z] as [string, number, number]] : []),
        ...(def.bed ? [['lit_spawn', def.bed.x, def.bed.z] as [string, number, number]] : []),
        ...(def.actions ?? []).map((a): [string, number, number] => [`action ${a.id}`, a.x, a.z]),
      ];
      // Vérifie aussi les points d'arrivée des escaliers provenant d'autres étages
      spec.floors.forEach((otherFloor, otherIdx) => {
        if (otherIdx === floorIdx) return;
        for (const a of otherFloor.actions) {
          if (a.type === 'interior_stairs' && a.targetFloor === floorIdx && a.arrival) {
            points.push([`arrivée_escalier_depuis_${otherIdx}`, a.arrival.x, a.arrival.z]);
          }
        }
      });

      for (const [name, x, z] of points) {
        for (const b of def.boxes) {
          const dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
          const dz = Math.max(Math.abs(z - b.z) - b.hz, 0);
          if (Math.hypot(dx, dz) < PLAYER_R) {
            blockages.push(`${spec.destinyId}#${floorIdx} : ${name} (${x}, ${z}) touche ${b.kind} (${b.x}, ${b.z})`);
          }
        }
      }

      rig.dispose();
    }
  }

  assert.deepEqual(violations, [], `Meubles de maison sans solide :\n${violations.join('\n')}`);
  assert.deepEqual(blockages, [], `Points bloqués dans une maison :\n${blockages.join('\n')}`);
});

test('façades extérieures des maisons : chaque volume visible au sol a un solide et perron/porte libres', async () => {
  installDocumentStub();
  const THREE = await import('three');
  const { HOUSE_SPECS, facadeWorldSolids } = await import('../world/playerHouses');
  const { createHouseFacadeRig } = await import('./houseModels');

  const violations: string[] = [];
  const blockages: string[] = [];

  for (const spec of Object.values(HOUSE_SPECS)) {
    if (!spec) continue;
    const rig = createHouseFacadeRig(spec);
    rig.group.updateMatrixWorld(true);
    const solids = facadeWorldSolids(spec, 0, 0, 0);

    rig.group.children.forEach((child, i) => {
      if (!child.visible) return;
      const bb = new THREE.Box3().setFromObject(child);
      if (bb.isEmpty()) return;
      const cx = (bb.min.x + bb.max.x) / 2;
      const cz = (bb.min.z + bb.max.z) / 2;
      const hx = (bb.max.x - bb.min.x) / 2;
      const hz = (bb.max.z - bb.min.z) / 2;
      if (bb.max.y < MIN_BLOCK_H || bb.min.y >= SUSPENDED_Y || Math.min(hx, hz) * 2 <= THIN) return;

      let inside = 0;
      for (let a = 0; a < 5; a++) {
        for (let b = 0; b < 5; b++) {
          const px = cx - hx + ((a + 0.5) / 5) * 2 * hx;
          const pz = cz - hz + ((b + 0.5) / 5) * 2 * hz;
          if (solids.some((s) => Math.abs(px - s.x) <= s.hx && Math.abs(pz - s.z) <= s.hz)) inside++;
        }
      }
      if (inside / 25 < MIN_COVER) {
        violations.push(`${spec.destinyId} façade volume #${i} (${cx.toFixed(2)}, ${cz.toFixed(2)}) y ${bb.min.y.toFixed(2)}–${bb.max.y.toFixed(2)} couvert à ${Math.round((inside / 25) * 100)} %`);
      }
    });

    const exteriorPoints: Array<[string, number, number]> = [
      ['porte-balise', 0, spec.facade.doorZ],
      ['perron', 0, spec.facade.porchZ],
    ];
    for (const [name, x, z] of exteriorPoints) {
      for (const s of solids) {
        const dx = Math.max(Math.abs(x - s.x) - s.hx, 0);
        const dz = Math.max(Math.abs(z - s.z) - s.hz, 0);
        if (Math.hypot(dx, dz) < PLAYER_R) {
          blockages.push(`${spec.destinyId} façade : ${name} (${x}, ${z}) touche ${s.flag} (${s.x}, ${s.z})`);
        }
      }
    }

    rig.dispose();
  }

  assert.deepEqual(violations, [], `Volumes de façade sans solide :\n${violations.join('\n')}`);
  assert.deepEqual(blockages, [], `Porte/perron bloqués :\n${blockages.join('\n')}`);
});
