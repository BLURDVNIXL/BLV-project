import {
  Destiny,
  PlayerState,
  FoodItem,
  SapeOutfitId,
  HomeAccessMode,
  PlayerProfile,
} from '../types/game';
import { DISTRICTS } from '../world/abidjanGeography';
import {
  ALL_DESTINIES,
  CRIB_UPGRADE_PRICES,
  SAPE_OUTFITS,
} from './destinies';
import { getMissionForDestiny, isMissionStepSatisfied } from './missions';
import { getWasmCore } from '../wasm/wasmBridge';

const STORAGE_KEY = 'blv_save_v3';

export function hasUnlimitedPlatinum(state: PlayerState): boolean {
  return Boolean(state.destiny.englishLock && state.goldenBoyDaysLeft > 0);
}

export function rollDestiny(forcedId?: string): Destiny {
  if (forcedId) {
    const found = ALL_DESTINIES.find((d) => d.id === forcedId);
    if (found) return found;
  }

  // Exact weights specified in GDD:
  // Commune: 35%, Rare: 25%, Epique: 25%, Légendaire: 15%
  const roll = Math.random() * 100;
  let category: 'commune' | 'rare' | 'epique' | 'legendaire';

  if (roll < 35) {
    category = 'commune';
  } else if (roll < 60) {
    category = 'rare';
  } else if (roll < 85) {
    category = 'epique';
  } else {
    category = 'legendaire';
  }

  const pool = ALL_DESTINIES.filter((d) => d.rarity === category);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || ALL_DESTINIES[0];
}

export function createInitialPlayerState(
  destiny: Destiny,
  playerId?: string,
  sessionToken?: string,
  profile?: PlayerProfile
): PlayerState {
  const language = destiny.englishLock ? 'en' : 'fr';
  const startingPolice = destiny.shadowBaron ? 3 : destiny.blackMarketAccess ? 1 : 0;
  const startingOutfit: SapeOutfitId =
    destiny.id === 'poignon'
      ? 'haillons'
      : destiny.id === 'yannis_diomande'
      ? 'madrid_25'
      : destiny.id === 'cadre_plateau'
      ? 'costume_italien'
      : 'standard';

  const mission = getMissionForDestiny(destiny.id);

  return {
    playerId: playerId || `babi_${Math.random().toString(36).slice(2, 10)}`,
    sessionToken,
    playerName: profile?.name,
    gender: profile?.gender,
    destiny,
    cash: destiny.startingCash,
    bankCash: destiny.id === 'golden_boy' ? 50000000 : destiny.id === 'yannis_diomande' ? 100000000 : 0,
    debt: 0,
    star: destiny.startingStar,
    needs: {
      hunger: 85,
      energy: 90,
      hygiene: 80,
      bladder: 85,
      envy: 75,
    },
    isDepressed: false,
    policeWanted: startingPolice,
    daysLived: 1,
    gameTimeHours: 8.0,
    goldenBoyDaysLeft: destiny.englishLock ? 30 : 0,
    cleanDaysStreak: 0,
    redemptionTrophyUnlocked: false,
    yannisAcademyLevel: 0,
    engineStalled: false,
    weather: 'soleil',
    factions: {
      syndicat: destiny.id.includes('woro') || destiny.id.includes('abobo') ? 65 : 50,
      ordre: destiny.id === 'cadre_plateau' || destiny.id === 'eleve_inphb' ? 65 : 50,
      jetset: destiny.id === 'golden_boy' || destiny.id === 'yannis_diomande' ? 75 : 50,
    },
    // Real multiplayer Tontine: ZERO fake NPC participants or fake pot cash
    tontine: {
      joined: false,
      weeklyDues: 50000,
      currentPot: 0,
      roundNumber: 1,
      members: [],
      currentTurnIndex: 0,
      history: [],
    },
    sapeOutfit: startingOutfit,
    ownedOutfits: [startingOutfit],
    cribUpgrades: {
      splitClim: false,
      bafflesMaquis: false,
      tv4k: false,
      canapeCuir: false,
    },
    homeLotId: null,
    homeAccess: 'open',
    friendsIds: [],
    activeMission: {
      missionId: mission.id,
      stepIndex: 0,
      workCount: 0,
      eatCount: 0,
      completed: false,
    },
    completedMissions: [],
    isDriving: false,
    currentVehicleId: destiny.vehicle,
    isGameOver: false,
    gameOverReason: '',
    logs: [
      {
        id: 'start_log',
        time: '08:00',
        message: destiny.englishLock
          ? `Welcome to Abidjan! You rolled: ${destiny.name}. Your 30-day Platinum card is active in ${destiny.district}!`
          : `Bienvenue à Babi ! Destin : ${destiny.name} (${destiny.district}). Fais briller ton Étoile !`,
        type: 'star',
      },
    ],
    language,
  };
}

/**
 * Evaluate and advance active story mission step if satisfied.
 */
export function evaluateMissionProgress(state: PlayerState, currentDistrictId?: string): PlayerState {
  if (state.activeMission.completed) return state;
  const mission = getMissionForDestiny(state.destiny.id);
  const step = mission.steps[state.activeMission.stepIndex];
  if (!step) return state;

  if (!isMissionStepSatisfied(state, step, currentDistrictId)) {
    return state;
  }

  let next: PlayerState = {
    ...state,
    cash: state.cash + step.rewardCash,
    star: Math.min(100, state.star + step.rewardStar),
    needs: {
      ...state.needs,
      envy: Math.min(100, state.needs.envy + step.rewardEnvy),
    },
    isDepressed: false,
  };

  const nextIndex = state.activeMission.stepIndex + 1;
  if (nextIndex >= mission.steps.length) {
    next = {
      ...next,
      activeMission: {
        ...state.activeMission,
        stepIndex: nextIndex,
        completed: true,
      },
      completedMissions: state.completedMissions.includes(mission.id)
        ? state.completedMissions
        : [...state.completedMissions, mission.id],
    };
    return addLog(
      next,
      `🏆 MISSION PRINCIPALE TERMINÉE (« ${mission.title} ») ! Trophée : ${mission.finalTrophy} (+${step.rewardCash.toLocaleString('fr-FR')} F, +${step.rewardStar} ★)`,
      'star'
    );
  }

  next = {
    ...next,
    activeMission: {
      ...state.activeMission,
      stepIndex: nextIndex,
    },
  };
  const upcoming = mission.steps[nextIndex];
  return addLog(
    next,
    `✅ Étape validée (${step.title}) : +${step.rewardCash.toLocaleString('fr-FR')} F ! Suivant : ${upcoming.title}.`,
    'success'
  );
}

export function setHomeAccessMode(state: PlayerState, mode: HomeAccessMode): PlayerState {
  const labels: Record<HomeAccessMode, string> = {
    open: 'Ouverte (visiteurs libres)',
    friends: 'Amis uniquement',
    closed: 'Fermée (frapper à la porte)',
  };
  return addLog({ ...state, homeAccess: mode }, `🏠 Accès maison réglé sur : ${labels[mode]}.`, 'neutral');
}

/**
 * 1 real hour = 4 in-game hours.
 */
export function advanceGameTime(
  state: PlayerState,
  realSecondsElapsed: number,
  speedMultiplier: number = 1
): PlayerState {
  if (state.isGameOver) return state;

  const gameHoursAdded = (realSecondsElapsed * 4 * speedMultiplier) / 3600;
  let newHours = state.gameTimeHours + gameHoursAdded;
  let newDays = state.daysLived;
  let newCash = state.cash;
  let newBankCash = state.bankCash;
  let newDebt = state.debt;
  let newGoldenBoyDays = state.goldenBoyDaysLeft;
  let newCleanStreak = state.cleanDaysStreak;
  let newRedemption = state.redemptionTrophyUnlocked;
  let newStar = state.star;
  const newLogs = [...state.logs];

  while (newHours >= 24) {
    newHours -= 24;
    newDays += 1;

    // 1. Golden Boy 30-day Platinum countdown
    if (state.destiny.englishLock && newGoldenBoyDays > 0) {
      newGoldenBoyDays -= 1;
      if (newGoldenBoyDays === 0) {
        newLogs.unshift({
          id: `gb_exp_${newDays}`,
          time: '08:00',
          message: '💳 Your 30-day Platinum Card has expired! Papa cut off unlimited spending — time to manage your bank!',
          type: 'danger',
        });
      }
    }

    // 2. INPolytec Koidio scholarship every 3 in-game days
    if (state.destiny.koidioBonus && newDays % 3 === 0) {
      newCash += 50000;
      newLogs.unshift({
        id: `koidio_${newDays}`,
        time: '08:00',
        message: '🎓 Bourse « Koidio » de l\'INPolytec reçue ! +50 000 FCFA versés.',
        type: 'success',
      });
    }

    // 3. Rescapé des Bas-fonds daily sobriety streak -> 7 days = Redemption Trophy
    if (state.destiny.rehabJourney && !newRedemption) {
      newCleanStreak += 1;
      if (newCleanStreak >= 7) {
        newRedemption = true;
        newStar = Math.min(100, newStar + 25);
        newLogs.unshift({
          id: `redemption_${newDays}`,
          time: '08:00',
          message: '🏆 TROPHÉE SECRET DÉBLOQUÉ : Rédemption Héroïque après 7 jours sobres ! (+25 Étoile)',
          type: 'star',
        });
      }
    }

    // 4. Weekly cycle (every 7 days): Guaranteed Salary + Weekly Rent + Debt Interest
    if (newDays % 7 === 0) {
      if (state.destiny.weeklyGuaranteedSalary) {
        newCash += state.destiny.weeklyGuaranteedSalary;
        newLogs.unshift({
          id: `sal_${newDays}`,
          time: '09:00',
          message: `💼 Salaire hebdomadaire garanti reçu : +${state.destiny.weeklyGuaranteedSalary.toLocaleString('fr-FR')} FCFA.`,
          type: 'success',
        });
      }

      if (newBankCash > 0) {
        const rate = 0.02;
        const interest = Math.round(newBankCash * rate);
        newBankCash += interest;
        newLogs.unshift({
          id: `int_${newDays}`,
          time: '09:00',
          message: `🏦 Intérêts bancaires hebdomadaires : +${interest.toLocaleString('fr-FR')} FCFA.`,
          type: 'success',
        });
      }

      // Weekly Rent (free for Poignon on cardboard, Laté de Cocody, or active Golden Boy)
      const isRentExempt =
        state.destiny.id === 'poignon' ||
        state.destiny.id === 'late_cocody' ||
        (state.destiny.englishLock && newGoldenBoyDays > 0);

      if (!isRentExempt) {
        const rent = state.destiny.rarity === 'epique' ? 45000 : state.destiny.rarity === 'rare' ? 25000 : 12000;
        if (newCash >= rent) {
          newCash -= rent;
          newLogs.unshift({
            id: `rent_${newDays}`,
            time: '10:00',
            message: `🏠 Loyer hebdomadaire réglé à Babi : -${rent.toLocaleString('fr-FR')} FCFA.`,
            type: 'neutral',
          });
        } else {
          const unpaid = rent - newCash;
          newCash = 0;
          newDebt += unpaid;
          newLogs.unshift({
            id: `rent_debt_${newDays}`,
            time: '10:00',
            message: `⚠️ Loyer impayé ! +${unpaid.toLocaleString('fr-FR')} FCFA ajoutés à ta dette.`,
            type: 'danger',
          });
        }
      }

      // Debt interest (10% weekly)
      if (newDebt > 0) {
        newDebt = Math.round(newDebt * 1.1);
      }
    }
  }

  // Needs decay
  const hungerDecay = gameHoursAdded * 3.0;
  const climFactor = state.cribUpgrades.splitClim ? 0.85 : 1.0;
  const energyDecay =
    gameHoursAdded *
    (state.destiny.perk.includes('Résistance à la fatigue') ? 1.8 : 2.5) *
    climFactor;
  const hygieneDecay = gameHoursAdded * 2.2;
  const bladderDecay = gameHoursAdded * 2.0;
  const bafflesBonus = state.cribUpgrades.bafflesMaquis ? 1.0 : 2.5;
  const envyDecay = gameHoursAdded * (state.destiny.id === 'gerant_maquis' ? 1.0 : bafflesBonus);

  const newNeeds = {
    hunger: Math.max(0, Math.min(100, state.needs.hunger - hungerDecay)),
    energy: Math.max(0, Math.min(100, state.needs.energy - energyDecay)),
    hygiene: Math.max(0, Math.min(100, state.needs.hygiene - hygieneDecay)),
    bladder: Math.max(0, Math.min(100, state.needs.bladder - bladderDecay)),
    envy: Math.max(
      state.destiny.id === 'gerant_maquis' ? 30 : 0,
      Math.min(100, state.needs.envy - envyDecay)
    ),
  };

  // WASM Depression check (Envy <= 0 -> 50% efficiency)
  const wasm = getWasmCore();
  const isDepressed = wasm.compute_depression_pct(Math.round(newNeeds.envy)) <= 50;

  // STRICT GDD Section 13 Game Over Condition ONLY:
  // hunger <= 0 && energy <= 0 && debt > 25000
  let isGameOver: boolean = state.isGameOver;
  let gameOverReason: string = state.gameOverReason;

  if (newNeeds.hunger <= 0 && newNeeds.energy <= 0 && newDebt > 25000) {
    isGameOver = true;
    gameOverReason =
      'Épuisement total (faim et énergie à 0) sous le poids des dettes (> 25 000 FCFA) à Abidjan.';
  }

  return evaluateMissionProgress({
    ...state,
    gameTimeHours: newHours,
    daysLived: newDays,
    cash: newCash,
    bankCash: newBankCash,
    debt: newDebt,
    goldenBoyDaysLeft: newGoldenBoyDays,
    cleanDaysStreak: newCleanStreak,
    redemptionTrophyUnlocked: newRedemption,
    star: newStar,
    needs: newNeeds,
    isDepressed,
    isGameOver,
    gameOverReason,
    logs: newLogs.slice(0, 25),
  });
}

export function spendCash(state: PlayerState, amount: number): { ok: boolean; nextCash: number } {
  if (hasUnlimitedPlatinum(state)) {
    return { ok: true, nextCash: state.cash };
  }
  if (state.cash < amount) {
    return { ok: false, nextCash: state.cash };
  }
  return { ok: true, nextCash: state.cash - amount };
}

export function eatFood(state: PlayerState, food: FoodItem): PlayerState {
  const payment = spendCash(state, food.price);
  if (!payment.ok) {
    return addLog(state, `Fonds insuffisants pour acheter ${food.name} (${food.price.toLocaleString('fr-FR')} FCFA).`, 'danger');
  }

  const wasm = getWasmCore();
  const roll = Math.floor(Math.random() * 100);
  const envyBonus = wasm.compute_envy_boost(food.envyRestore, Math.round(state.star), roll);
  const isBadPepper = envyBonus < food.envyRestore;
  const isMasterpiece = envyBonus > food.envyRestore;

  const logMsg = isBadPepper
    ? `🌶️ Piment trop violent sur le ${food.name} ! Légère indigestion (+${envyBonus}% Envie).`
    : isMasterpiece
    ? `✨ Étoile brillante ! Le ${food.name} est un chef-d'œuvre ! Extase Culinaire (+${envyBonus}% Envie) !`
    : `🍛 Savouré : ${food.name} ! Buff « ${food.buffName} » (+${envyBonus}% Envie).`;

  const updated = addLog(
    {
      ...state,
      cash: payment.nextCash,
      activeMission: {
        ...state.activeMission,
        eatCount: state.activeMission.eatCount + 1,
      },
      needs: {
        ...state.needs,
        hunger: Math.min(100, state.needs.hunger + food.hungerRestore + (isMasterpiece ? 10 : 0)),
        envy: Math.min(100, state.needs.envy + envyBonus),
        bladder: Math.max(0, state.needs.bladder - 12),
      },
      isDepressed: false,
    },
    logMsg,
    isBadPepper ? 'danger' : 'success'
  );
  return evaluateMissionProgress(updated);
}

export function depositToBank(state: PlayerState, amount: number): PlayerState {
  if (amount <= 0 || state.cash < amount) {
    return addLog(state, 'Montant liquide insuffisant pour déposer à la banque.', 'danger');
  }
  const updated = addLog(
    {
      ...state,
      cash: state.cash - amount,
      bankCash: state.bankCash + amount,
    },
    `🏦 Dépôt effectué : ${amount.toLocaleString('fr-FR')} FCFA transférés vers votre compte bancaire.`,
    'success'
  );
  return evaluateMissionProgress(updated);
}

export function withdrawFromBank(state: PlayerState, amount: number): PlayerState {
  if (amount <= 0 || state.bankCash < amount) {
    return addLog(state, 'Solde bancaire insuffisant pour ce retrait.', 'danger');
  }
  return addLog(
    {
      ...state,
      cash: state.cash + amount,
      bankCash: state.bankCash - amount,
    },
    `💵 Retrait effectué : ${amount.toLocaleString('fr-FR')} FCFA retirés en liquide.`,
    'neutral'
  );
}

export function takeBankLoan(state: PlayerState, amount: number): PlayerState {
  const maxLoan = 500000;
  if (amount <= 0 || state.debt + amount > maxLoan) {
    return addLog(state, `Plafond d'emprunt atteint (${maxLoan.toLocaleString('fr-FR')} FCFA max).`, 'danger');
  }
  return addLog(
    {
      ...state,
      cash: state.cash + amount,
      debt: state.debt + amount,
    },
    `💳 Prêt bancaire accordé : +${amount.toLocaleString('fr-FR')} FCFA (Dette totale : ${(state.debt + amount).toLocaleString('fr-FR')} F).`,
    'work'
  );
}

export function repayDebt(state: PlayerState, amount: number): PlayerState {
  if (state.debt <= 0 || amount <= 0) return state;
  const toPay = Math.min(amount, state.debt);
  const payment = spendCash(state, toPay);
  if (!payment.ok) {
    return addLog(state, 'Liquide insuffisant pour rembourser cette tranche de dette.', 'danger');
  }
  const updated = addLog(
    {
      ...state,
      cash: payment.nextCash,
      debt: state.debt - toPay,
      star: Math.min(100, state.star + 2),
    },
    `✅ Dette remboursée de ${toPay.toLocaleString('fr-FR')} FCFA ! Ton Étoile brille (+2).`,
    'success'
  );
  return evaluateMissionProgress(updated);
}

export function buyCribUpgrade(
  state: PlayerState,
  key: 'splitClim' | 'bafflesMaquis' | 'tv4k' | 'canapeCuir'
): PlayerState {
  if (state.cribUpgrades[key]) return state;
  const item = CRIB_UPGRADE_PRICES[key];
  const payment = spendCash(state, item.cost);
  if (!payment.ok) {
    return addLog(
      state,
      `❌ Fonds insuffisants pour acheter « ${item.name} » (${item.cost.toLocaleString('fr-FR')} FCFA requis).`,
      'danger'
    );
  }
  const updated = addLog(
    {
      ...state,
      cash: payment.nextCash,
      cribUpgrades: {
        ...state.cribUpgrades,
        [key]: true,
      },
      needs: {
        ...state.needs,
        envy: Math.min(100, state.needs.envy + 25),
      },
      isDepressed: false,
    },
    `🛋️ Babi Cribs : « ${item.name} » acheté et installé chez toi (-${item.cost.toLocaleString('fr-FR')} F) !`,
    'success'
  );
  return evaluateMissionProgress(updated);
}

export function buyOrEquipOutfit(state: PlayerState, outfitId: SapeOutfitId): PlayerState {
  const outfit = SAPE_OUTFITS.find((o) => o.id === outfitId);
  if (!outfit) return state;

  if (state.ownedOutfits.includes(outfitId)) {
    return addLog(
      { ...state, sapeOutfit: outfitId },
      `👔 Tenue équipée : ${outfit.name} (+${outfit.charismaBonus}% charisme).`,
      'neutral'
    );
  }

  const payment = spendCash(state, outfit.price);
  if (!payment.ok) {
    return addLog(
      state,
      `❌ Fonds insuffisants pour acheter « ${outfit.name} » (${outfit.price.toLocaleString('fr-FR')} FCFA).`,
      'danger'
    );
  }

  return addLog(
    {
      ...state,
      cash: payment.nextCash,
      sapeOutfit: outfitId,
      ownedOutfits: [...state.ownedOutfits, outfitId],
      factions: {
        ...state.factions,
        jetset: Math.min(100, state.factions.jetset + 8),
      },
      needs: {
        ...state.needs,
        envy: Math.min(100, state.needs.envy + 15),
      },
    },
    `✨ Sape « ${outfit.name} » achetée et portée (-${outfit.price.toLocaleString('fr-FR')} F) !`,
    'success'
  );
}

/** Tarif du taxi express : dans sa commune, ou d'une commune à une autre. */
export const FARE_SAME_COMMUNE = 500;
export const FARE_BETWEEN_COMMUNES = 1000;

/** Nom de la commune d'une zone (« Cocody · Riviera » et « Cocody · Deux-Plateaux » → « Cocody »), null si inconnue. */
function communeOfDistrict(districtId: string | null | undefined): string | null {
  const d = DISTRICTS.find((x) => x.id === districtId);
  return d ? d.name.replace(/\s*\(.*$/, '').replace(/\s*·.*$/, '').trim() : null;
}

/**
 * Prix de la course : 500 FCFA si le départ et l'arrivée sont dans la même commune, 1 000 FCFA sinon.
 * Départ inconnu ou zone inconnue : tarif entre communes (jamais le tarif réduit par défaut).
 */
export function fastTravelFare(fromDistrictId: string | null | undefined, toDistrictId: string | null | undefined): number {
  const from = communeOfDistrict(fromDistrictId);
  const to = communeOfDistrict(toDistrictId);
  return from !== null && from === to ? FARE_SAME_COMMUNE : FARE_BETWEEN_COMMUNES;
}

/**
 * Temps de jeu passé dans le taxi (étape B4) : environ 3 min de jeu par km de trajet réel (circulation d'Abidjan),
 * au moins 5 min et au plus 90 min.
 */
export const TAXI_GAME_MIN_PER_KM = 3;
export const TAXI_GAME_MIN_MIN = 5;
export const TAXI_GAME_MIN_MAX = 90;

export function taxiRideGameMinutes(distanceM: number): number {
  const d = Number.isFinite(distanceM) ? Math.max(0, distanceM) : 30000;
  const raw = Math.round((d / 1000) * TAXI_GAME_MIN_PER_KM);
  return Math.min(TAXI_GAME_MIN_MAX, Math.max(TAXI_GAME_MIN_MIN, raw));
}

/**
 * Fait passer le temps du trajet : l'heure de jeu avance (minuit, loyer et intérêts compris, comme le temps normal)
 * et la faim, l'énergie, l'hygiène et la vessie baissent d'autant. 1 h réelle = 4 h de jeu, soit 900 s réelles par heure de jeu.
 */
export function applyTaxiRideTime(state: PlayerState, distanceM: number): PlayerState {
  if (state.isGameOver) return state;
  const minutes = taxiRideGameMinutes(distanceM);
  const next = advanceGameTime(state, (minutes / 60) * 900, 1);
  return addLog(next, `🚖 Trajet en taxi : ${minutes} min de jeu.`, 'neutral');
}

/** Attente du taxi appelé : 10 s au minimum, 20 s au maximum, plus longue quand la destination est loin. */
export const TAXI_WAIT_MIN_S = 10;
export const TAXI_WAIT_MAX_S = 20;
const TAXI_WAIT_FULL_DISTANCE_M = 6000;

export function taxiWaitSeconds(distanceM: number): number {
  const d = Number.isFinite(distanceM) ? Math.max(0, distanceM) : TAXI_WAIT_FULL_DISTANCE_M;
  const ratio = Math.min(1, d / TAXI_WAIT_FULL_DISTANCE_M);
  return Math.round(TAXI_WAIT_MIN_S + ratio * (TAXI_WAIT_MAX_S - TAXI_WAIT_MIN_S));
}

/**
 * Motif de refus d'un appel de taxi (null si l'appel est accepté) :
 * en conduisant, déjà une course en cours, ou pas assez d'argent (le paiement n'a lieu qu'à la montée).
 */
export function taxiCallRefusal(state: PlayerState, fare: number, alreadyCalled: boolean): string | null {
  if (state.isDriving) return '🚖 Tu ne peux pas appeler un taxi en conduisant.';
  if (alreadyCalled) return '🚖 Un taxi est déjà en route.';
  if (state.cash < fare) return `❌ Il faut ${fare.toLocaleString('fr-FR')} FCFA pour appeler un taxi.`;
  return null;
}

export function payFastTravel(
  state: PlayerState,
  districtName: string,
  fare: number = FARE_BETWEEN_COMMUNES
): { ok: boolean; nextState: PlayerState } {
  const payment = spendCash(state, fare);
  if (!payment.ok) {
    return {
      ok: false,
      nextState: addLog(state, `❌ Il faut ${fare} FCFA pour payer le taxi express vers ${districtName}.`, 'danger'),
    };
  }
  return {
    ok: true,
    nextState: addLog(
      { ...state, cash: payment.nextCash },
      `🚖 Taxi express arrivé à ${districtName} (-${fare} FCFA).`,
      'neutral'
    ),
  };
}

export function useToilet(state: PlayerState): PlayerState {
  return addLog(
    {
      ...state,
      needs: { ...state.needs, bladder: 100 },
    },
    '🚽 Passage aux toilettes : jauge Vessie entièrement soulagée (100%).',
    'neutral'
  );
}

export function takeShower(state: PlayerState): PlayerState {
  return addLog(
    {
      ...state,
      needs: { ...state.needs, hygiene: 100, envy: Math.min(100, state.needs.envy + 10) },
    },
    '🚿 Douche fraîche de Babi : Hygiène à 100% et moral rafraîchi !',
    'success'
  );
}

export function sleepAtHome(state: PlayerState): PlayerState {
  const extraEnergy = state.cribUpgrades.canapeCuir ? 100 : 95;
  return addLog(
    {
      ...state,
      gameTimeHours: (state.gameTimeHours + 6) % 24,
      daysLived: state.gameTimeHours + 6 >= 24 ? state.daysLived + 1 : state.daysLived,
      needs: {
        ...state.needs,
        energy: extraEnergy,
        hunger: Math.max(0, state.needs.hunger - 15),
      },
    },
    '🛏️ Sommeil réparateur (+6h) : Énergie rechargée à bloc !',
    'success'
  );
}

export function performWorkShift(state: PlayerState): PlayerState {
  const basePay = state.destiny.id === 'yannis_diomande' ? 500000 : state.destiny.rarity === 'epique' ? 55000 : 30000;
  const energyCost = 22;
  if (state.needs.energy < energyCost) {
    return addLog(state, '⚡ Trop fatigué pour travailler ! Va dormir ou bois un café.', 'danger');
  }

  let bonusPct = 0;
  if (state.destiny.id === 'etudiant_ufhb') bonusPct += 25;
  if (state.sapeOutfit === 'costume_italien') bonusPct += 25;
  if (state.destiny.id === 'commercant_adjame') bonusPct += 15;

  const wasm = getWasmCore();
  const roll = Math.floor(Math.random() * 100);
  const payout = wasm.compute_work_payout(basePay, Math.round(state.star), roll, Math.round(state.needs.envy), bonusPct);

  const depressionNote = state.needs.envy <= 0 ? ' (⚠️ Réduit de 50% par ta Dépression !)' : '';

  const updated = addLog(
    {
      ...state,
      cash: state.cash + payout,
      factions: { ...state.factions, ordre: Math.min(100, state.factions.ordre + 6) },
      activeMission: {
        ...state.activeMission,
        workCount: state.activeMission.workCount + 1,
      },
      needs: {
        ...state.needs,
        energy: Math.max(0, state.needs.energy - energyCost),
        hunger: Math.max(0, state.needs.hunger - 15),
        envy: Math.min(100, state.needs.envy + 15),
      },
    },
    `💼 Journée de travail terminée : +${payout.toLocaleString('fr-FR')} FCFA${depressionNote}.`,
    'work'
  );
  return evaluateMissionProgress(updated);
}

export function playLotoAkwaba(state: PlayerState): PlayerState {
  const ticketCost = 2000;
  const payment = spendCash(state, ticketCost);
  if (!payment.ok) {
    return addLog(state, 'Un ticket de Loto Akwaba coûte 2 000 FCFA.', 'danger');
  }

  const wasm = getWasmCore();
  const roll = Math.floor(Math.random() * 100);
  const mult = state.destiny.mysticBaraka ? 100 : 25;
  const prize = wasm.compute_loto_prize(ticketCost, Math.round(state.star), roll, mult);

  if (prize > 0) {
    return addLog(
      {
        ...state,
        cash: payment.nextCash + prize,
        needs: { ...state.needs, envy: 100 },
        isDepressed: false,
      },
      `🎉 JACKPOT LOTO AKWABA ! Tu remportes ${prize.toLocaleString('fr-FR')} FCFA !`,
      'star'
    );
  }
  return addLog(
    {
      ...state,
      cash: payment.nextCash,
      needs: { ...state.needs, envy: Math.max(0, state.needs.envy - 5) },
    },
    '🎲 Tirage Loto Akwaba manqué pour cette fois.',
    'neutral'
  );
}

export function donateYannisAcademy(state: PlayerState): PlayerState {
  const cost = 500000;
  const payment = spendCash(state, cost);
  if (!payment.ok) {
    return addLog(state, 'Il faut 500 000 FCFA pour financer ton Académie de Foot.', 'danger');
  }
  const updated = addLog(
    {
      ...state,
      cash: payment.nextCash,
      yannisAcademyLevel: Math.min(3, state.yannisAcademyLevel + 1),
      star: Math.min(100, state.star + 8),
      needs: { ...state.needs, envy: 100 },
    },
    `⚽ Académie Yannis Diomandé améliorée (Niveau ${Math.min(3, state.yannisAcademyLevel + 1)}) ! +8 Étoile et liesse populaire à Abidjan !`,
    'star'
  );
  return evaluateMissionProgress(updated);
}

export function clearPoliceViaNetwork(state: PlayerState, isBlackMarket: boolean = false): PlayerState {
  const cost = isBlackMarket ? 35000 : 0;
  if (cost > 0) {
    const payment = spendCash(state, cost);
    if (!payment.ok) {
      return addLog(state, `Fausses plaques Djassaman : ${cost.toLocaleString('fr-FR')} FCFA requis.`, 'danger');
    }
    const updated = addLog(
      { ...state, cash: payment.nextCash, policeWanted: 0 },
      '🕶️ Fausses plaques posées au Marché Noir de Treichville : étoiles de police effacées !',
      'success'
    );
    return evaluateMissionProgress(updated);
  }
  const updated = addLog(
    { ...state, policeWanted: 0 },
    '📞 Carnet d\'adresses du Politicien activé : un coup de fil au ministère annule les barrages et avis de recherche !',
    'star'
  );
  return evaluateMissionProgress(updated);
}

export function performLavageEtoile(state: PlayerState): PlayerState {
  const cost = 25000;
  const payment = spendCash(state, cost);
  if (!payment.ok) {
    return addLog(state, 'Le vieux sage demande 25 000 FCFA d\'offrande pour le lavage d\'Étoile.', 'danger');
  }
  const newStar = Math.min(100, state.star + 30);

  const updated = addLog(
    {
      ...state,
      cash: payment.nextCash,
      star: newStar,
      needs: { ...state.needs, envy: Math.min(100, state.needs.envy + 35) },
      isDepressed: false,
    },
    `🔮 Lavage d'Étoile accompli chez le Vieux Sage à Yopougon ! Étoile rehaussée à ${newStar}/100 !`,
    'star'
  );
  return evaluateMissionProgress(updated);
}

export function addLog(
  state: PlayerState,
  message: string,
  type: 'neutral' | 'success' | 'danger' | 'love' | 'work' | 'star' = 'neutral'
): PlayerState {
  return {
    ...state,
    logs: [
      {
        id: `log_${Date.now()}_${Math.random()}`,
        time: formatGameTime(state.gameTimeHours),
        message,
        type,
      },
      ...state.logs,
    ].slice(0, 25),
  };
}

export function formatGameTime(hoursDecimal: number): string {
  const totalMinutes = Math.floor(hoursDecimal * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function saveGameState(state: PlayerState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore
  }
}

export function loadGameState(): PlayerState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerState;
  } catch {
    return null;
  }
}

export function purgeLocalData(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('blv_')) localStorage.removeItem(key);
      }
    }
    if (typeof sessionStorage !== 'undefined') {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('blv_')) sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore
  }
}
