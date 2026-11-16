/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * Garde-fou des collisions d'intérieur : tout meuble visible qui occupe le sol doit avoir un solide (`prop`),
 * et aucun solide ne doit gêner l'entrée, la sortie ou une zone d'action.
 * Le rig 3D est construit sous Node avec un faux canevas (seules les enseignes en ont besoin).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mesh } from 'three';

/** Un personnage enjambe ce qui fait moins de 0,35 m (physics.cpp) : inutile d'y mettre un solide. */
const MIN_BLOCK_H = 0.35;
/** Dessous à partir de 1,5 m : décor suspendu ou mural haut (étagère, enseigne, plafonnier). */
const SUSPENDED_Y = 1.5;
/** Épaisseur ≤ 25 cm : décor collé au mur (tableau, affiche) ou poteau fin (potence). */
const THIN = 0.25;
/** Part minimale de l'emprise d'un meuble recouverte par des solides. */
const MIN_COVER = 0.6;
/** Un groupe d'au moins ce nombre de meshes est un PNJ (voir l'étape « PNJ d'intérieur »). */
const NPC_MESHES = 28;

const noop = (): void => undefined;
const ctxStub = new Proxy({} as Record<string, unknown>, {
  get: (_t, p) => {
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (p === 'createPattern') return () => ({});
    return noop;
  },
  set: () => true
});

test('chaque meuble visible qui occupe le sol a un solide', async () => {
  Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => ctxStub, width: 0, height: 0 }) } });
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
      // Ignorés : murs et cloisons déjà déclarés, PNJ, sol, décor suspendu, décor fin
      const isStructure = structure.some((b) => Math.abs(b.x - cx) < 0.02 && Math.abs(b.z - cz) < 0.02 && Math.abs(b.hx - hx) < 0.02 && Math.abs(b.hz - hz) < 0.02);
      if (isStructure || meshes >= NPC_MESHES) return;
      if (bb.max.y < MIN_BLOCK_H || bb.min.y >= SUSPENDED_Y || Math.min(hx, hz) * 2 <= THIN) return;
      // Part de l'emprise (grille 5 × 5) recouverte par l'union des solides
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

test('aucun solide ne gêne l\'entrée, la sortie ni une zone d\'action', async () => {
  const { INTERIORS } = await import('../world/interiors');
  const R = 0.35; // rayon d'un personnage
  const problems: string[] = [];
  for (const def of Object.values(INTERIORS)) {
    const points: Array<[string, number, number]> = [
      ['entrée', def.entry.x, def.entry.z],
      ['sortie', def.exit.x, def.exit.z],
      ...(def.actions ?? []).map((a): [string, number, number] => [`action ${a.id}`, a.x, a.z])
    ];
    for (const [name, x, z] of points) {
      for (const b of def.boxes) {
        if (b.kind === 'wall') continue;
        const dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
        const dz = Math.max(Math.abs(z - b.z) - b.hz, 0);
        if (Math.hypot(dx, dz) < R) problems.push(`${def.id} : ${name} (${x}, ${z}) touche ${b.kind} (${b.x}, ${b.z})`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
