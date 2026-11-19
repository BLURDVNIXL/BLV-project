import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANUAL_CAM_COOLDOWN_S,
  adaptCameraYaw,
  normalizeAngle,
  stepManualCamCooldown,
} from './cameraFollow';

test('normalizeAngle ramène tout angle dans (-π, π]', () => {
  assert.ok(Math.abs(normalizeAngle(0)) < 1e-9);
  assert.ok(Math.abs(normalizeAngle(2 * Math.PI)) < 1e-9);
  assert.ok(Math.abs(normalizeAngle(3 * Math.PI) - Math.PI) < 1e-9);
  assert.ok(Math.abs(normalizeAngle(-3 * Math.PI / 2) - Math.PI / 2) < 1e-9);
});

test('adaptCameraYaw ne bouge pas quand le joueur est immobile ou en cours de drag manuel', () => {
  const idle = adaptCameraYaw({
    camYaw: 0.4,
    dt: 0.016,
    driving: false,
    heading: 1.5,
    speed: 0,
    knocked: false,
    isDragging: false,
    manualCooldownS: 0,
    indoor: false,
  });
  assert.equal(idle, 0.4);

  const dragging = adaptCameraYaw({
    camYaw: 0.4,
    dt: 0.016,
    driving: false,
    heading: 1.5,
    speed: 6.2,
    knocked: false,
    isDragging: true,
    manualCooldownS: 0,
    indoor: false,
  });
  assert.equal(dragging, 0.4);

  const coolingDown = adaptCameraYaw({
    camYaw: 0.4,
    dt: 0.016,
    driving: true,
    heading: 1.5,
    speed: 12,
    knocked: false,
    isDragging: false,
    manualCooldownS: 0.5,
    indoor: false,
  });
  assert.equal(coolingDown, 0.4);
});

test('à pied : la caméra pivote progressivement derrière un déplacement latéral ou diagonal', () => {
  // Caméra regarde vers -Z (camYaw = 0), joueur court vers +X (heading = PI/2 -> targetYaw = -PI/2)
  let yaw = 0;
  const heading = Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    yaw = adaptCameraYaw({
      camYaw: yaw,
      dt: 1 / 60,
      driving: false,
      heading,
      speed: 6.2,
      knocked: false,
      isDragging: false,
      manualCooldownS: 0,
      indoor: false,
    });
  }
  const err = Math.abs(normalizeAngle(heading + Math.PI - yaw));
  assert.ok(err < 0.35, `camYaw (${yaw.toFixed(3)}) doit converger vers ${(heading + Math.PI).toFixed(3)}, err=${err.toFixed(3)}`);
});

test('à pied : marcher droit vers la caméra (touche S) ne retourne pas la caméra à 180°', () => {
  // camYaw = 0 (caméra au +Z regardant -Z), joueur marche vers +Z (heading = 0 -> targetYaw = PI)
  const next = adaptCameraYaw({
    camYaw: 0,
    dt: 0.05,
    driving: false,
    heading: 0,
    speed: 6.2,
    knocked: false,
    isDragging: false,
    manualCooldownS: 0,
    indoor: false,
  });
  assert.equal(next, 0);
});

test('en véhicule : la caméra suit les virages en marche avant mais pas en marche arrière', () => {
  let yaw = 0;
  const vehicleHeading = Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    yaw = adaptCameraYaw({
      camYaw: yaw,
      dt: 1 / 60,
      driving: true,
      heading: vehicleHeading,
      speed: 10,
      knocked: false,
      isDragging: false,
      manualCooldownS: 0,
      indoor: false,
    });
  }
  const err = Math.abs(normalizeAngle(vehicleHeading + Math.PI - yaw));
  assert.ok(err < 0.12, `caméra voiture doit s aligner derrière le véhicule, err=${err.toFixed(3)}`);

  // Marche arrière : la caméra reste stable
  const rev = adaptCameraYaw({
    camYaw: 0.2,
    dt: 0.05,
    driving: true,
    heading: 1.4,
    speed: -4,
    knocked: false,
    isDragging: false,
    manualCooldownS: 0,
    indoor: false,
  });
  assert.equal(rev, 0.2);
});

test('stepManualCamCooldown maintient le délai pendant le drag puis décrémente', () => {
  const held = stepManualCamCooldown(0, true, 0.016);
  assert.equal(held, MANUAL_CAM_COOLDOWN_S);
  const after = stepManualCamCooldown(held, false, 0.5);
  assert.ok(Math.abs(after - (MANUAL_CAM_COOLDOWN_S - 0.5)) < 1e-6);
  assert.equal(stepManualCamCooldown(0.1, false, 0.5), 0);
});
