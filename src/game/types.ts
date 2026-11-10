/**
 * GTA Abidjan: Babi Stories - Core Types
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type WeaponType = 'fist' | 'machete' | 'pistol' | 'smg' | 'ak47' | 'rpg';

export interface WeaponInfo {
  type: WeaponType;
  name: string;
  damage: number;
  range: number;
  fireRate: number; // shots per sec
  ammo: number;
  maxAmmo: number;
  iconName: string;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  isGrounded: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  cash: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isJumping: boolean;
  isAttacking: boolean;
  attackCombo: number;
  currentWeapon: WeaponType;
  weapons: Record<WeaponType, WeaponInfo>;
  inVehicleId: string | null;
  wantedLevel: number; // 0 to 5
  wantedProgress: number; // crime score towards next star
  lastCrimeTime: number;
}

export type VehicleModelType = 'woro' | 'gbaka' | 'police' | 'suv' | 'sports';

export interface VehicleConfig {
  type: VehicleModelType;
  name: string;
  topSpeed: number;
  acceleration: number;
  braking: number;
  steeringSpeed: number;
  handling: number;
  mass: number;
  color: string;
  secondaryColor?: string;
}

export interface VehicleState {
  id: string;
  type: VehicleModelType;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  steering: number;
  health: number;
  maxHealth: number;
  isEngineOn: boolean;
  isSirenOn: boolean;
  isHonking: boolean;
  lightsOn: boolean;
  driverId: string | null; // player or ped
  isPolice: boolean;
  color: string;
}

export interface PedestrianState {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  health: number;
  speed: number;
  targetX: number;
  targetZ: number;
  isPanicking: boolean;
  dialogueText: string | null;
  dialogueTimer: number;
  shirtColor: string;
  pantsColor: string;
  gender: 'male' | 'female';
}

export type DistrictId = 'plateau' | 'lagune' | 'treichville' | 'cocody' | 'yopougon';

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  description: string;
  color: string;
  center: [number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface MissionStep {
  text: string;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRadius: number;
  requiredAction?: 'reach' | 'enter_vehicle' | 'defeat_enemies' | 'deliver_passengers';
  markerLabel: string;
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  district: DistrictId;
  rewardCash: number;
  rewardRespect: number;
  description: string;
  initialDialogue: string[];
  steps: MissionStep[];
  currentStepIndex: number;
  timeLimit?: number; // seconds
  isCompleted: boolean;
  isFailed: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  description: string;
}
