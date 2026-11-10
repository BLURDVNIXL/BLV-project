import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getElevationAt,
  stepVehiclePhysics,
  stepPlayerKinematics,
  calculateWantedDecay,
  calculateWeaponDamage,
  VEHICLE_CONFIGS,
} from './physics';
import { PlayerState, VehicleState } from './types';

test('getElevationAt correctly identifies bridges and ground', () => {
  // Center of Pont Henri Konan Bédié (HKB)
  const hkbHeight = getElevationAt(85, 10);
  assert.ok(hkbHeight > 4.0, `HKB bridge deck should be elevated: ${hkbHeight}`);

  // Plateau district
  const plateauHeight = getElevationAt(0, 80);
  assert.equal(plateauHeight, 1.0);

  // Normal ground
  const groundHeight = getElevationAt(120, 120);
  assert.equal(groundHeight, 0.0);
});

test('stepVehiclePhysics accelerates forward on throttle input', () => {
  const initialVeh: VehicleState = {
    id: 'veh_test_1',
    type: 'woro',
    name: 'Wôrô-wôrô 504',
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    speed: 0,
    steering: 0,
    health: 1000,
    maxHealth: 1000,
    isEngineOn: true,
    isSirenOn: false,
    isHonking: false,
    lightsOn: true,
    driverId: 'player',
    isPolice: false,
    color: '#eab308',
  };

  const { updated } = stepVehiclePhysics(
    initialVeh,
    { throttle: 1.0, steer: 0, brake: false, handbrake: false },
    0.1
  );

  assert.ok(updated.speed > 0, `Vehicle speed should increase on throttle: ${updated.speed}`);
  assert.ok(updated.z > 0, `Vehicle should move forward in Z direction: ${updated.z}`);
});

test('stepVehiclePhysics handles braking and obstacle collision', () => {
  const movingVeh: VehicleState = {
    id: 'veh_test_2',
    type: 'police',
    name: 'Police',
    x: 0,
    y: 0,
    z: 10,
    rotationY: 0,
    speed: 20,
    steering: 0,
    health: 1000,
    maxHealth: 1000,
    isEngineOn: true,
    isSirenOn: true,
    isHonking: false,
    lightsOn: true,
    driverId: 'police_officer',
    isPolice: true,
    color: '#2563eb',
  };

  const obstacles = [{ x: 0, z: 12, radius: 2.0 }];
  const { updated, collisionOccurred } = stepVehiclePhysics(
    movingVeh,
    { throttle: 0, steer: 0, brake: true, handbrake: false },
    0.1,
    obstacles
  );

  assert.ok(collisionOccurred, 'Collision should be detected with obstacle in front');
  assert.ok(updated.speed < 20, 'Vehicle speed should drop upon collision/braking');
});

test('stepPlayerKinematics handles sprint and stamina drain', () => {
  const mockWeapons = {
    fist: { type: 'fist' as const, name: 'Poings', damage: 15, range: 2.2, fireRate: 2, ammo: 1, maxAmmo: 1, iconName: 'fist' },
    machete: { type: 'machete' as const, name: 'Machette', damage: 45, range: 2.6, fireRate: 1.5, ammo: 1, maxAmmo: 1, iconName: 'machete' },
    pistol: { type: 'pistol' as const, name: 'Pistolet 9mm', damage: 32, range: 45, fireRate: 3, ammo: 30, maxAmmo: 120, iconName: 'pistol' },
    smg: { type: 'smg' as const, name: 'Micro-SMG', damage: 24, range: 40, fireRate: 8, ammo: 90, maxAmmo: 300, iconName: 'smg' },
    ak47: { type: 'ak47' as const, name: 'AK-47', damage: 55, range: 65, fireRate: 6, ammo: 120, maxAmmo: 400, iconName: 'ak47' },
    rpg: { type: 'rpg' as const, name: 'Lance-Roquette RPG', damage: 180, range: 80, fireRate: 0.5, ammo: 4, maxAmmo: 12, iconName: 'rpg' },
  };

  const initialPlayer: PlayerState = {
    x: 10,
    y: 0,
    z: 10,
    rotationY: 0,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    isGrounded: true,
    health: 100,
    maxHealth: 100,
    armor: 50,
    cash: 3500,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isJumping: false,
    isAttacking: false,
    attackCombo: 0,
    currentWeapon: 'fist',
    weapons: mockWeapons,
    inVehicleId: null,
    wantedLevel: 0,
    wantedProgress: 0,
    lastCrimeTime: 0,
  };

  const updatedPlayer = stepPlayerKinematics(
    initialPlayer,
    { moveX: 0, moveZ: 1, sprint: true, jump: false },
    0, // camera angle
    0.1
  );

  assert.ok(updatedPlayer.isSprinting, 'Player should be in sprinting state');
  assert.ok(updatedPlayer.stamina < 100, 'Stamina should decrease when sprinting');
  assert.ok(updatedPlayer.z > initialPlayer.z, 'Player should advance in Z direction');
});

test('calculateWantedDecay decays stars when player evades police', () => {
  // Police far away (70m), crime committed 25 seconds ago -> should decay
  const decayed = calculateWantedDecay(2, 25, 75);
  assert.equal(decayed, 1);

  // Police close by -> should not decay
  const stayed = calculateWantedDecay(2, 25, 20);
  assert.equal(stayed, 2);
});

test('calculateWeaponDamage calculates range and damage accurately', () => {
  const closeFist = calculateWeaponDamage('fist', 1.5);
  assert.equal(closeFist.hit, true);
  assert.equal(closeFist.damage, 15);

  const farFist = calculateWeaponDamage('fist', 3.5);
  assert.equal(farFist.hit, false);

  const akHit = calculateWeaponDamage('ak47', 40);
  assert.equal(akHit.hit, true);
  assert.equal(akHit.damage, 55);
});
