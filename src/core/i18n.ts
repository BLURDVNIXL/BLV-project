/**
 * Bilingual Dictionary (FR / EN)
 * Activates automatically when Golden Boy English Lock is triggered.
 */

export interface UIStrings {
  starLabel: string;
  envyGauge: string;
  hunger: string;
  energy: string;
  hygiene: string;
  bladder: string;
  depressedWarning: string;
  ecstasyStatus: string;
  goodMoodStatus: string;
  lowMoodStatus: string;
  day: string;
  hideDock: string;
  showDock: string;
  destinyBtn: string;
  exitVehicle: string;
  enterVehicle: string;
  bank: string;
  eats: string;
  gps: string;
  romance: string;
  sape: string;
  schools: string;
  radio: string;
  crib: string;
  jobs: string;
  blackMarket: string;
  cash: string;
  bankBalance: string;
  debtLabel: string;
  platinumActive: string;
  platinumExpired: string;
  engineStalled: string;
}

const FR_STRINGS: UIStrings = {
  starLabel: "L'Étoile (Chance)",
  envyGauge: "Jauge d'Envie Universelle",
  hunger: '🍽️ Faim',
  energy: '⚡ Énergie',
  hygiene: '🧼 Hygiène',
  bladder: '💧 Vessie',
  depressedWarning: '⚠️ DÉPRESSION (Envie = 0) : Efficacité au travail divisée par 2 !',
  ecstasyStatus: "✨ Extase totale ! Débordant d'énergie et d'ambition.",
  goodMoodStatus: "👍 Bon moral. Savoure un garba ou sors pour booster l'envie.",
  lowMoodStatus: "⚠️ Moral bas ! Besoin urgent d'amour, maquis ou bonne bouffe.",
  day: 'Jour',
  hideDock: 'Masquer Dock',
  showDock: 'Afficher Dock',
  destinyBtn: 'Destin',
  exitVehicle: 'Appuie sur E / ✕ pour sortir du véhicule',
  enterVehicle: 'Appuie sur E / ✕ pour monter dans',
  bank: 'Banque & Prêts',
  eats: 'Akwaba Eats',
  gps: 'GPS Abidjan',
  romance: 'Romance',
  sape: 'Sape & Farot',
  schools: 'Lycées Élite',
  radio: 'Radio FM',
  crib: 'Babi Cribs',
  jobs: 'Métiers & Contrats',
  blackMarket: 'Djassa Noir',
  cash: 'Liquide',
  bankBalance: 'Banque',
  debtLabel: 'Dettes',
  platinumActive: '💳 Carte Platinum Illimitée',
  platinumExpired: '💳 Carte Platinum Expirée',
  engineStalled: '🌊 Moteur noyé par l’inondation !',
};

const EN_STRINGS: UIStrings = {
  starLabel: 'The Star (Luck)',
  envyGauge: 'Universal Desire Gauge',
  hunger: '🍽️ Hunger',
  energy: '⚡ Energy',
  hygiene: '🧼 Hygiene',
  bladder: '💧 Bladder',
  depressedWarning: '⚠️ DEPRESSED (Desire = 0): Work payout cut in half!',
  ecstasyStatus: '✨ Total Ecstasy! Living that Assinie Jet-Set dream.',
  goodMoodStatus: '👍 Good vibes. Grab some Garba or hit Zone 4.',
  lowMoodStatus: '⚠️ Low vibes! Hit the lounge or call your date ASAP.',
  day: 'Day',
  hideDock: 'Hide Dock',
  showDock: 'Show Dock',
  destinyBtn: 'Destiny',
  exitVehicle: 'Press E / ✕ to exit vehicle',
  enterVehicle: 'Press E / ✕ to enter',
  bank: 'Bank & Loans',
  eats: 'Akwaba Eats',
  gps: 'Abidjan GPS',
  romance: 'Romance',
  sape: 'Drip & Sape',
  schools: 'Elite Schools',
  radio: 'Live Radio',
  crib: 'Babi Cribs',
  jobs: 'Jobs & Hustles',
  blackMarket: 'Black Market',
  cash: 'Cash',
  bankBalance: 'Bank',
  debtLabel: 'Debt',
  platinumActive: '🇺🇸 Unlimited Platinum Card',
  platinumExpired: '💳 Platinum Card Expired',
  engineStalled: '🌊 Engine flooded in high water!',
};

export function t(lang: 'fr' | 'en'): UIStrings {
  return lang === 'en' ? EN_STRINGS : FR_STRINGS;
}
