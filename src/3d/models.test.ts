import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createExtrudedProfileMesh, createVehicleModel } from './models';
import { computeVehicleAccel } from '../physics/controls';
import type { VehicleModelType } from '../types/game';

/** Calcule les bornes Z des sommets d'une géométrie dont Y >= minY. */
function zRangeAboveY(mesh: THREE.Mesh, minY: number): { minZ: number; maxZ: number } {
  const pos = mesh.geometry.getAttribute('position');
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) >= minY) {
      const z = pos.getZ(i);
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  return { minZ, maxZ };
}

test('createExtrudedProfileMesh oriente +X du profil 2D vers +Z (avant véhicule)', () => {
  // Profil asymétrique : nez pointu loin en +X (+3), arrière vertical en -X (-1)
  const mat = new THREE.MeshBasicMaterial();
  const mesh = createExtrudedProfileMesh(
    [
      [-1, 0],
      [3, 0],
      [3, 0.5],
      [-1, 1],
    ],
    1.6,
    mat
  );
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox!;
  // Centré en X
  assert.ok(Math.abs((box.min.x + box.max.x) / 2) < 1e-4, 'centré sur X');
  // +X du profil (+3) doit se retrouver à +Z (et non -Z)
  assert.ok(box.max.z > 2.9, `max.z=${box.max.z} doit correspondre au nez (+3)`);
  assert.ok(box.min.z > -1.2 && box.min.z < -0.9, `min.z=${box.min.z} doit correspondre à l arrière (-1)`);
});

const VEHICLE_TYPES: VehicleModelType[] = [
  'gbaka',
  'woro_woro',
  'police_plcc',
  'rolls_royce_phantom',
  'supercar_madrid',
  'berline_citadine',
  'bmw_m_series',
];

for (const type of VEHICLE_TYPES) {
  test(`${type} : coque, roues directrices et phares alignés vers +Z (avant)`, () => {
    const rig = createVehicleModel(type);
    // Les pivots des roues avant directrices sont côté +Z
    assert.equal(rig.frontWheelSteerPivots.length, 2);
    for (const p of rig.frontWheelSteerPivots) {
      assert.ok(p.position.z > 1.0, `roue avant à z=${p.position.z} doit être > 1.0`);
    }
    // Premier enfant de bodyGroup = la carrosserie extrudée
    const hull = rig.bodyGroup.children[0] as THREE.Mesh;
    assert.ok(hull.isMesh);
    // La partie haute (cabine/toit) est toujours décalée vers l arrière (-Z) par rapport à un long capot avant (+Z),
    // sauf le gbaka dont le pare-brise avant est incliné vers l arrière (maxZ du toit ~1.8 < nez ~2.3).
    hull.geometry.computeBoundingBox();
    const box = hull.geometry.boundingBox!;
    const topZ = zRangeAboveY(hull, box.max.y - 0.15);
    if (type === 'gbaka') {
      // Sur le gbaka, le pare-brise avant penche vers l arrière : le haut s arrête vers +1.75 tandis que le bas va à +2.25
      assert.ok(topZ.maxZ < box.max.z - 0.35, `gbaka toit maxZ=${topZ.maxZ} < pare-chocs maxZ=${box.max.z}`);
    } else if (type === 'police_plcc') {
      // SUV : long toit à l arrière (minZ ~ -1.95), capot devant (topZ.maxZ ~ +0.8 < box.max.z ~ +2.2)
      assert.ok(topZ.maxZ < box.max.z - 1.0, `police_plcc toit maxZ=${topZ.maxZ} < nez=${box.max.z}`);
    } else if (type === 'rolls_royce_phantom') {
      // Long capot avant (+Z) : le toit s arrête à +0.75 alors que la calandre va à +2.55
      assert.ok(topZ.maxZ < 0.9 && box.max.z > 2.4, `rolls toit maxZ=${topZ.maxZ}, nez=${box.max.z}`);
    } else {
      // Berlines & supercar : capot avant plus long/bas que le haut du toit -> le toit est en retrait par rapport à max.z
      assert.ok(box.max.z - topZ.maxZ > topZ.minZ - box.min.z, `${type}: capot avant (+Z) plus long que coffre (-Z)`);
    }
  });
}

test('computeVehicleAccel ne renverse pas les commandes Avant/Arrière', () => {
  assert.equal(computeVehicleAccel(1, false), 1);
  assert.equal(computeVehicleAccel(-1, false), -1);
  assert.equal(computeVehicleAccel(0, false), 0);
  assert.equal(computeVehicleAccel(1, true), 0);
});
