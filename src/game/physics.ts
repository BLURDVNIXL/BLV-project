/**
 * GTA Abidjan - Vehicle, Player & World Physics
 * Pure mathematical simulation functions for GTA vehicle dynamics, character kinematics,
 * and collision detection.
 */

import { PlayerState, VehicleConfig, VehicleState } from './types';

export const VEHICLE_CONFIGS: Record<string, VehicleConfig> = {
  woro: {
    type: 'woro',
    name: 'Wôrô-wôrô 504 (Taxi)',
    topSpeed: 28, // ~100 km/h
    acceleration: 14,
    braking: 26,
    steeringSpeed: 2.8,
    handling: 0.85,
    mass: 1200,
    color: '#eab308', // iconic yellow
    secondaryColor: '#ca8a04',
  },
  gbaka: {
    type: 'gbaka',
    name: 'Gbaka 207 (Minibus)',
    topSpeed: 22, // ~80 km/h
    acceleration: 9,
    braking: 20,
    steeringSpeed: 2.0,
    handling: 0.7,
    mass: 2600,
    color: '#15803d', // iconic vibrant green
    secondaryColor: '#f8fafc', // white roof
  },
  police: {
    type: 'police',
    name: 'Police Nationale CI',
    topSpeed: 33, // ~120 km/h
    acceleration: 18,
    braking: 30,
    steeringSpeed: 3.2,
    handling: 0.95,
    mass: 1500,
    color: '#2563eb', // blue & white
    secondaryColor: '#ffffff',
  },
  suv: {
    type: 'suv',
    name: 'Babi Land Cruiser',
    topSpeed: 30,
    acceleration: 15,
    braking: 25,
    steeringSpeed: 2.6,
    handling: 0.88,
    mass: 2100,
    color: '#18181b', // sleek obsidian black
  },
  sports: {
    type: 'sports',
    name: 'Cocody GT Coupe',
    topSpeed: 38, // ~140 km/h
    acceleration: 22,
    braking: 34,
    steeringSpeed: 3.6,
    handling: 0.98,
    mass: 1350,
    color: '#dc2626', // racing red
  },
};

/**
 * Calculates terrain/bridge elevation at (x, z)
 * Plateau: y = 0..3 (gentle elevation)
 * Lagune: y = -2 (water level is y = -1.8)
 * Bridges (HKB & Houphouët-Boigny): y = 4.5..6.0 arching over lagoon
 * Cocody / Yopougon / Treichville: y = 0
 */
export function getElevationAt(x: number, z: number): number {
  // Check bridges first
  // Pont Henri Konan Bédié (HKB): x in [60, 110], z spans from -40 to 60
  if (x >= 75 && x <= 95 && z >= -45 && z <= 65) {
    // Arching bridge deck
    const progress = (z + 45) / 110;
    const arch = Math.sin(progress * Math.PI) * 2.2;
    return 4.2 + arch;
  }

  // Pont Général de Gaulle / Houphouët-Boigny: x in [-15, 10], z in [-35, 45]
  if (x >= -12 && x <= 8 && z >= -35 && z <= 45) {
    const progress = (z + 35) / 80;
    const arch = Math.sin(progress * Math.PI) * 1.5;
    return 3.5 + arch;
  }

  // Lagune Ebrié: broad lagoon strip running roughly east-west between z in [-30, 40] except bridges
  const inLagoonBand = z >= -25 && z <= 35 && (x < -15 || (x > 10 && x < 75) || x > 95);
  if (inLagoonBand) {
    return -2.5; // submerged in lagoon
  }

  // Plateau district (high ground): x in [-60, 40], z in [40, 140]
  if (x >= -60 && x <= 40 && z >= 40 && z <= 140) {
    return 1.0;
  }

  // Default ground elevation
  return 0.0;
}

/**
 * Simulates vehicle movement step based on inputs
 */
export function stepVehiclePhysics(
  veh: VehicleState,
  inputs: { throttle: number; steer: number; brake: boolean; handbrake: boolean },
  dt: number,
  obstacles: Array<{ x: number; z: number; radius: number }> = []
): { updated: VehicleState; collisionOccurred: boolean; impactVelocity: number } {
  const config = VEHICLE_CONFIGS[veh.type] || VEHICLE_CONFIGS.woro;
  let { speed, steering, rotationY, x, z } = veh;
  let collisionOccurred = false;
  let impactVelocity = 0;

  // Steering response
  const targetSteer = inputs.steer * (Math.PI / 4.8); // max ~37 degrees
  steering += (targetSteer - steering) * Math.min(1, config.steeringSpeed * dt * 4);

  // Speed-dependent steering dampening (high speeds reduce turning lock)
  const speedFactor = Math.max(0.35, 1 - Math.abs(speed) / (config.topSpeed * 1.6));
  const effectiveSteer = steering * speedFactor;

  // Acceleration & Braking
  if (inputs.throttle > 0) {
    speed += inputs.throttle * config.acceleration * dt;
  } else if (inputs.throttle < 0) {
    // Reverse
    speed += inputs.throttle * (config.acceleration * 0.55) * dt;
  }

  if (inputs.brake) {
    const brakeDecel = config.braking * dt;
    if (speed > 0) {
      speed = Math.max(0, speed - brakeDecel);
    } else if (speed < 0) {
      speed = Math.min(0, speed + brakeDecel);
    }
  }

  // Handbrake drift / fast stop
  if (inputs.handbrake) {
    speed *= Math.max(0, 1 - 2.8 * dt);
    // Extra yaw rotation during handbrake turn
    rotationY += effectiveSteer * 2.2 * (speed / 10) * dt;
  }

  // Rolling resistance & air drag
  const dragCoeff = 0.0035;
  const rollingResist = 1.2;
  speed -= Math.sign(speed) * (rollingResist + dragCoeff * speed * speed) * dt;
  if (Math.abs(speed) < 0.1 && inputs.throttle === 0) {
    speed = 0;
  }

  // Top speed clamp
  speed = Math.max(-config.topSpeed * 0.45, Math.min(config.topSpeed, speed));

  // Turn vehicle based on speed and steer angle (Ackermann approximation)
  if (Math.abs(speed) > 0.05) {
    const wheelbase = 2.7;
    const turnRate = (speed / wheelbase) * Math.tan(effectiveSteer);
    rotationY += turnRate * dt;
  }

  // Translate position
  const forwardX = Math.sin(rotationY);
  const forwardZ = Math.cos(rotationY);

  const nextX = x + forwardX * speed * dt;
  const nextZ = z + forwardZ * speed * dt;

  // Obstacle collision resolution (circle against circular obstacle radius)
  const vehRadius = 2.1;
  let resolvedX = nextX;
  let resolvedZ = nextZ;

  for (const obs of obstacles) {
    const dx = resolvedX - obs.x;
    const dz = resolvedZ - obs.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = vehRadius + obs.radius;

    if (dist < minDist && dist > 0.001) {
      collisionOccurred = true;
      impactVelocity = Math.abs(speed);
      const pushOut = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      resolvedX += nx * pushOut;
      resolvedZ += nz * pushOut;
      // Bounce / slow down
      speed = -speed * 0.25;
    }
  }

  // Ground elevation
  const elevation = getElevationAt(resolvedX, resolvedZ);

  return {
    updated: {
      ...veh,
      x: resolvedX,
      y: elevation,
      z: resolvedZ,
      speed,
      steering,
      rotationY,
    },
    collisionOccurred,
    impactVelocity,
  };
}

/**
 * Step player kinematics (walking, sprinting, jumping)
 */
export function stepPlayerKinematics(
  player: PlayerState,
  inputs: { moveX: number; moveZ: number; sprint: boolean; jump: boolean },
  cameraAngleY: number,
  dt: number,
  obstacles: Array<{ x: number; z: number; radius: number }> = []
): PlayerState {
  let { x, y, z, velocityY, stamina, isGrounded, rotationY } = player;

  // Calculate move direction relative to camera
  const inputMagnitude = Math.sqrt(inputs.moveX * inputs.moveX + inputs.moveZ * inputs.moveZ);
  let speed = 0;
  let moveDirX = 0;
  let moveDirZ = 0;

  let isSprinting = false;
  if (inputMagnitude > 0.05) {
    const rawDirX = inputs.moveX / inputMagnitude;
    const rawDirZ = inputs.moveZ / inputMagnitude;

    // Rotate input by camera heading
    const sinCam = Math.sin(cameraAngleY);
    const cosCam = Math.cos(cameraAngleY);
    moveDirX = rawDirX * cosCam + rawDirZ * sinCam;
    moveDirZ = -rawDirX * sinCam + rawDirZ * cosCam;

    // Face walking direction
    rotationY = Math.atan2(moveDirX, moveDirZ);

    if (inputs.sprint && stamina > 5) {
      isSprinting = true;
      speed = 8.5; // sprint
      stamina = Math.max(0, stamina - 22 * dt);
    } else {
      speed = 4.5; // jog/walk
      stamina = Math.min(player.maxStamina, stamina + 8 * dt);
    }
  } else {
    // Rest stamina
    stamina = Math.min(player.maxStamina, stamina + 16 * dt);
  }

  // Jump
  const isJumping = inputs.jump && isGrounded;
  if (isJumping) {
    velocityY = 7.0; // upward jump impulse
    isGrounded = false;
  }

  // Gravity
  const gravity = -18.0;
  velocityY += gravity * dt;
  y += velocityY * dt;

  // Translation
  let nextX = x + moveDirX * speed * dt;
  let nextZ = z + moveDirZ * speed * dt;

  // Collisions with world objects
  const playerRadius = 0.55;
  for (const obs of obstacles) {
    const dx = nextX - obs.x;
    const dz = nextZ - obs.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = playerRadius + obs.radius;
    if (dist < minDist && dist > 0.001) {
      const pushOut = minDist - dist;
      nextX += (dx / dist) * pushOut;
      nextZ += (dz / dist) * pushOut;
    }
  }

  // Ground elevation check
  const groundElevation = getElevationAt(nextX, nextZ);
  if (y <= groundElevation) {
    y = groundElevation;
    velocityY = 0;
    isGrounded = true;
  } else {
    isGrounded = false;
  }

  return {
    ...player,
    x: nextX,
    y,
    z: nextZ,
    velocityY,
    rotationY,
    stamina,
    isSprinting,
    isJumping,
    isGrounded,
  };
}

/**
 * Wanted level system calculations
 */
export function calculateWantedDecay(
  currentWanted: number,
  timeSinceLastCrime: number,
  distanceToPolice: number
): number {
  if (currentWanted === 0) return 0;
  // If player stays far from police for > 18 seconds, wanted stars decay
  if (distanceToPolice > 65 && timeSinceLastCrime > 18) {
    return Math.max(0, currentWanted - 1);
  }
  return currentWanted;
}

/**
 * Calculate damage inflicted by weapon
 */
export function calculateWeaponDamage(
  weaponType: string,
  distance: number
): { hit: boolean; damage: number } {
  switch (weaponType) {
    case 'fist':
      return { hit: distance <= 2.2, damage: 15 };
    case 'machete':
      return { hit: distance <= 2.6, damage: 45 };
    case 'pistol':
      return { hit: distance <= 45, damage: 32 };
    case 'smg':
      return { hit: distance <= 40, damage: 24 };
    case 'ak47':
      return { hit: distance <= 65, damage: 55 };
    case 'rpg':
      return { hit: distance <= 80, damage: 180 };
    default:
      return { hit: distance <= 2.0, damage: 10 };
  }
}
