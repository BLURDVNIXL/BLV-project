import { ALL_DESTINIES } from './destinies';
import { getMissionForDestiny } from './missions';
import type { PlayerState, SapeOutfitId, WeatherType } from '../types/game';

const OUTFIT_IDS: readonly SapeOutfitId[] = [
  'standard',
  'wax_bazin',
  'costume_italien',
  'madrid_25',
  'haillons',
];
const WEATHER_TYPES: readonly WeatherType[] = ['soleil', 'pluie', 'inondation', 'harmattan'];
const LOG_TYPES = ['neutral', 'success', 'danger', 'love', 'work', 'star'] as const;

export interface SessionStateIdentity {
  playerId: string;
  sessionToken: string;
  homeLotId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isSafeIntegerRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isOutfit(value: unknown): value is SapeOutfitId {
  return typeof value === 'string' && OUTFIT_IDS.includes(value as SapeOutfitId);
}

function isValidLog(value: unknown): boolean {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 128) &&
    isBoundedString(value.time, 16) &&
    isBoundedString(value.message, 512) &&
    (LOG_TYPES as readonly unknown[]).includes(value.type)
  );
}

/**
 * Vérifie une sauvegarde reçue du navigateur avant sa persistance.
 * Le destin est repris dans le catalogue serveur et les identifiants/parcelle
 * sont toujours réinjectés depuis le contexte de session détenu par le serveur.
 * Cette validation de schéma ne rend pas, à elle seule, l'économie anti-triche.
 */
export function normalizeSessionState(
  value: unknown,
  identity: SessionStateIdentity
): PlayerState | null {
  if (
    !isRecord(value) ||
    !identity.playerId ||
    !isBoundedString(identity.playerId, 128) ||
    !identity.sessionToken ||
    !isBoundedString(identity.sessionToken, 4096) ||
    !(identity.homeLotId === null || (isBoundedString(identity.homeLotId, 128) && identity.homeLotId))
  ) {
    return null;
  }

  const rawDestiny = value.destiny;
  const destinyId = isRecord(rawDestiny) ? rawDestiny.id : undefined;
  const destiny =
    typeof destinyId === 'string'
      ? ALL_DESTINIES.find((candidate) => candidate.id === destinyId)
      : undefined;
  if (!destiny) return null;

  const needs = value.needs;
  const factions = value.factions;
  const upgrades = value.cribUpgrades;
  const mission = value.activeMission;

  if (
    !isSafeIntegerRange(value.cash, 0, Number.MAX_SAFE_INTEGER) ||
    !isSafeIntegerRange(value.bankCash, 0, Number.MAX_SAFE_INTEGER) ||
    !isSafeIntegerRange(value.debt, 0, Number.MAX_SAFE_INTEGER) ||
    !isFiniteRange(value.star, 0, 100) ||
    !isSafeIntegerRange(value.policeWanted, 0, 5) ||
    !isSafeIntegerRange(value.daysLived, 0, Number.MAX_SAFE_INTEGER) ||
    !isFiniteRange(value.gameTimeHours, 0, 24) ||
    value.gameTimeHours === 24 ||
    !isSafeIntegerRange(value.goldenBoyDaysLeft, 0, 30) ||
    !isSafeIntegerRange(value.cleanDaysStreak, 0, Number.MAX_SAFE_INTEGER) ||
    !isSafeIntegerRange(value.yannisAcademyLevel, 0, 3) ||
    typeof value.isDepressed !== 'boolean' ||
    typeof value.redemptionTrophyUnlocked !== 'boolean' ||
    typeof value.engineStalled !== 'boolean' ||
    typeof value.isDriving !== 'boolean' ||
    typeof value.isGameOver !== 'boolean' ||
    !isBoundedString(value.gameOverReason, 256) ||
    !isRecord(needs) ||
    !isFiniteRange(needs.hunger, 0, 100) ||
    !isFiniteRange(needs.energy, 0, 100) ||
    !isFiniteRange(needs.hygiene, 0, 100) ||
    !isFiniteRange(needs.bladder, 0, 100) ||
    !isFiniteRange(needs.envy, 0, 100) ||
    !isRecord(factions) ||
    !isFiniteRange(factions.syndicat, 0, 100) ||
    !isFiniteRange(factions.ordre, 0, 100) ||
    !isFiniteRange(factions.jetset, 0, 100) ||
    !isRecord(upgrades) ||
    typeof upgrades.splitClim !== 'boolean' ||
    typeof upgrades.bafflesMaquis !== 'boolean' ||
    typeof upgrades.tv4k !== 'boolean' ||
    typeof upgrades.canapeCuir !== 'boolean' ||
    !isRecord(mission)
  ) {
    return null;
  }

  const missionDefinition = getMissionForDestiny(destiny.id);
  if (
    mission.missionId !== missionDefinition.id ||
    !isSafeIntegerRange(mission.stepIndex, 0, missionDefinition.steps.length) ||
    !isSafeIntegerRange(mission.workCount, 0, Number.MAX_SAFE_INTEGER) ||
    !isSafeIntegerRange(mission.eatCount, 0, Number.MAX_SAFE_INTEGER) ||
    typeof mission.completed !== 'boolean'
  ) {
    return null;
  }

  const playerName = value.playerName;
  const gender = value.gender;
  const currentVehicleId = value.currentVehicleId;
  const ownedOutfits = value.ownedOutfits;
  const completedMissions = value.completedMissions;
  const logs = value.logs;

  if (
    (playerName !== undefined && !isBoundedString(playerName, 64)) ||
    (gender !== undefined && gender !== 'homme' && gender !== 'femme') ||
    (currentVehicleId !== null && !isBoundedString(currentVehicleId, 128)) ||
    !isOutfit(value.sapeOutfit) ||
    !Array.isArray(ownedOutfits) ||
    ownedOutfits.length > OUTFIT_IDS.length ||
    !ownedOutfits.every(isOutfit) ||
    !Array.isArray(completedMissions) ||
    completedMissions.length > 100 ||
    !completedMissions.every((id) => isBoundedString(id, 128)) ||
    !Array.isArray(logs) ||
    logs.length > 25 ||
    !logs.every(isValidLog) ||
    !WEATHER_TYPES.includes(value.weather as WeatherType) ||
    (value.language !== 'fr' && value.language !== 'en')
  ) {
    return null;
  }

  return {
    playerId: identity.playerId,
    ...(playerName === undefined ? {} : { playerName }),
    ...(gender === undefined ? {} : { gender }),
    sessionToken: identity.sessionToken,
    destiny,
    cash: value.cash as number,
    bankCash: value.bankCash as number,
    debt: value.debt as number,
    star: value.star as number,
    needs: {
      hunger: needs.hunger as number,
      energy: needs.energy as number,
      hygiene: needs.hygiene as number,
      bladder: needs.bladder as number,
      envy: needs.envy as number,
    },
    isDepressed: value.isDepressed as boolean,
    policeWanted: value.policeWanted as number,
    daysLived: value.daysLived as number,
    gameTimeHours: value.gameTimeHours as number,
    goldenBoyDaysLeft: value.goldenBoyDaysLeft as number,
    cleanDaysStreak: value.cleanDaysStreak as number,
    redemptionTrophyUnlocked: value.redemptionTrophyUnlocked as boolean,
    yannisAcademyLevel: value.yannisAcademyLevel as number,
    engineStalled: value.engineStalled as boolean,
    weather: value.weather as WeatherType,
    factions: {
      syndicat: factions.syndicat as number,
      ordre: factions.ordre as number,
      jetset: factions.jetset as number,
    },
    sapeOutfit: value.sapeOutfit,
    ownedOutfits,
    cribUpgrades: {
      splitClim: upgrades.splitClim,
      bafflesMaquis: upgrades.bafflesMaquis,
      tv4k: upgrades.tv4k,
      canapeCuir: upgrades.canapeCuir,
    },
    homeLotId: identity.homeLotId,
    activeMission: {
      missionId: mission.missionId as string,
      stepIndex: mission.stepIndex as number,
      workCount: mission.workCount as number,
      eatCount: mission.eatCount as number,
      completed: mission.completed as boolean,
    },
    completedMissions: completedMissions as string[],
    isDriving: value.isDriving as boolean,
    currentVehicleId: currentVehicleId as string | null,
    isGameOver: value.isGameOver as boolean,
    gameOverReason: value.gameOverReason as string,
    logs: logs as PlayerState['logs'],
    language: value.language as 'fr' | 'en',
  };
}
