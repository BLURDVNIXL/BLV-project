/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BLV — Babi Life Vibes
 * PNJ d'intérieur : chaque position de départ et chaque point de trajet est dans la salle, libre de solides,
 * hors de l'arrivée du joueur et de la sortie ; les trajets sont libres de bout en bout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERIORS, hitsInteriorBox, insideInterior } from './interiors';

test('PNJ d\'intérieur : positions de départ et trajets libres de solides', () => {
  for (const d of Object.values(INTERIORS)) {
    const npcs = d.npcs ?? [];
    assert.ok(npcs.length >= 7 && npcs.length <= 14, `${d.id} : ${npcs.length} PNJ`);
    assert.ok(npcs.filter((n) => n.behavior.kind === 'walk').length <= 6, `${d.id} : trop de marcheurs pour le pool`);
    const seeds = new Set<number>();
    for (const n of npcs) {
      assert.ok(!seeds.has(n.seed), `${d.id} : graine ${n.seed} en double`);
      seeds.add(n.seed);
      const pts = n.behavior.kind === 'walk' ? n.behavior.points : [{ x: n.x, z: n.z }];
      assert.ok(pts.length >= 1 && (n.behavior.kind !== 'walk' || pts.length >= 2), `${d.id}/${n.seed} : trajet trop court`);
      assert.deepEqual({ x: pts[0].x, z: pts[0].z }, { x: n.x, z: n.z }, `${d.id}/${n.seed} : départ ≠ premier point`);
      for (let i = 0; i < pts.length; i++) {
        // On échantillonne le segment vers le point suivant (boucle fermée) tous les 25 cm.
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const steps = Math.max(1, Math.ceil(len / 0.25));
        for (let k = 0; k <= steps; k++) {
          const x = a.x + ((b.x - a.x) * k) / steps;
          const z = a.z + ((b.z - a.z) * k) / steps;
          assert.ok(insideInterior(d, x, z), `${d.id}/${n.seed} : (${x.toFixed(1)}, ${z.toFixed(1)}) hors de la salle`);
          assert.ok(!hitsInteriorBox(d, x, z, 0.35), `${d.id}/${n.seed} : (${x.toFixed(1)}, ${z.toFixed(1)}) dans un solide`);
        }
      }
      // Ni sur l'arrivée du joueur ni sur la sortie
      assert.ok(Math.hypot(n.x - d.entry.x, n.z - d.entry.z) > 1.5, `${d.id}/${n.seed} : trop près de l'arrivée`);
      assert.ok(Math.hypot(n.x - d.exit.x, n.z - d.exit.z) > d.exit.radius, `${d.id}/${n.seed} : dans la zone de sortie`);
    }
    // Deux PNJ de départ ne se chevauchent pas
    for (let i = 0; i < npcs.length; i++) {
      for (let j = i + 1; j < npcs.length; j++) {
        assert.ok(Math.hypot(npcs[i].x - npcs[j].x, npcs[i].z - npcs[j].z) >= 0.7, `${d.id} : ${npcs[i].seed} et ${npcs[j].seed} se chevauchent`);
      }
    }
  }
});
