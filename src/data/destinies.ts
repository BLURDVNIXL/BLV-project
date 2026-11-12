/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BLV — Babi Life Vibes
 * Données Officielles des 19 Destins, Écoles d'Excellence & Gastronomie
 */

import { DestinyClass, SchoolBadge, FoodItem, RadioStation } from '../types/game';

export const ALL_DESTINIES: DestinyClass[] = [
  // 1. EASTER EGG LÉGENDAIRE : Le Poignon (La Baraka Suprême)
  {
    id: 'poignon',
    name: 'Le Poignon (L\'Extrême Précarité)',
    englishName: 'The Street Hustler (Extreme Survival)',
    rarity: 'easter_egg',
    commune: 'Adjamé / Abobo',
    tagline: '2 000 F en poche, zéro toit, mais une Baraka divine à 95/100.',
    description: 'Tu n\'as même pas de quoi t\'acheter un garba complet. Tu dors sous un hangar au grand marché d\'Adjamé avec un carton. Mais l\'univers veille sur toi : ta chance mystique dépasse celle de tous les nantis de Babi. L\'ascension la plus héroïque du jeu t\'attend !',
    englishDescription: 'You have only 2,000 FCFA and zero roof over your head. Sleeping under a market hanger in Adjamé on a cardboard box. Yet an unseen mystical luck (95/100) shields you: lottery jackpots, street findings, and miraculous opportunities await.',
    startingCash: 2000,
    homeType: 'squat',
    homeLabel: 'Squat Hangar du Grand Marché (Adjamé)',
    vehicles: [],
    luckStat: 95, // Supérieure au Golden Boy
    perks: ['Baraka Divine (95% Chance)', 'Trouvailles de rue fréquentes', 'Jackpot Loto Akwaba x3', 'Résistance faim & fatigue'],
    icon: '✨',
    badge: 'BARAKA 95/100',
    isPoignon: true
  },

  // 2. Commune : Le Débrouillard d'Abobo
  {
    id: 'debrouillard_abobo',
    name: 'Le Débrouillard d\'Abobo',
    englishName: 'The Abobo Go-Getter',
    rarity: 'common',
    commune: 'Abobo',
    tagline: '15 000 F en poche, une chambre dans la cour commune, apprenti gbaka.',
    description: 'À Abobo, la journée commence à 4h30 du matin. Tu apprends à crier les destinations à la portière du gbaka pour la ligne Adjamé-Yopougon. Celui qui se lève tôt à Babi finit par s\'asseoir à la table des grands.',
    startingCash: 15000,
    homeType: 'chambre_cour',
    homeLabel: 'Chambre en Cour Commune (Abobo)',
    vehicles: [],
    luckStat: 52,
    perks: ['Endurance physique (+25%)', 'Réseau chauffeurs de gbaka', 'Énergie baisse moins vite'],
    icon: '🚐'
  },

  // 3. Commune : Le Commerçant d'Adjamé
  {
    id: 'commercant_adjame',
    name: 'Le Commerçant d\'Adjamé',
    englishName: 'Adjamé Market Trader',
    rarity: 'common',
    commune: 'Adjamé',
    tagline: '50 000 F, étal au grand marché, le sens du commerce dans le sang.',
    description: 'Les pagnes, les chaussures, les épices : tu sais jauger un client au premier coup d\'œil. Un 2 pièces modeste à Adjamé et un carnet d\'adresses chez les grossistes de Treichville.',
    startingCash: 50000,
    homeType: 'deux_pieces',
    homeLabel: '2 Pièces près du Grand Marché (Adjamé)',
    vehicles: [],
    luckStat: 55,
    perks: ['Bénéfice revente (+15%)', 'Remise immédiate au Djassa', 'Tchatche commerciale'],
    icon: '🧺'
  },

  // 4. Commune : Le Chauffeur de Woro-woro
  {
    id: 'chauffeur_koumassi',
    name: 'Le Chauffeur de Woro-Woro (Koumassi)',
    englishName: 'Yellow Taxi Woro-Woro Driver',
    rarity: 'common',
    commune: 'Koumassi',
    tagline: '35 000 F, une Peugeot 504 jaune citron louée à la journée.',
    description: 'Tu connais chaque nid-de-poule entre Koumassi, Marcory et Treichville. Tu esquives les barrages et les ralentissements avec maestria tout en encaissant les pièces de 200 F.',
    startingCash: 35000,
    homeType: 'studio',
    homeLabel: 'Studio à Koumassi Remblais',
    vehicles: ['Peugeot 504 Woro-Woro'],
    luckStat: 50,
    perks: ['Véhicule de départ (Woro-woro jaune)', 'Esquive des embouteillages', 'Conduite experte'],
    icon: '🚕'
  },

  // 5. Commune : L'Étudiant Fauché de l'UFHB
  {
    id: 'etudiant_ufhb',
    name: 'L\'Étudiant Fauché de l\'UFHB (Cocody)',
    englishName: 'Cocody University Broke Student',
    rarity: 'common',
    commune: 'Cocody',
    tagline: '20 000 F, chambre cité campus, un vieux PC portable et de l\'ambition.',
    description: 'Les cours en amphi bondé à l\'Université Félix Houphouët-Boigny, les révisions à la bibliothèque et les missions freelance sur internet le soir pour payer les photocopies.',
    startingCash: 20000,
    homeType: 'chambre_cour',
    homeLabel: 'Chambre Cité Universitaire (Cocody)',
    vehicles: [],
    luckStat: 50,
    perks: ['Gain d\'XP académique (+30%)', 'Missions freelance PC', 'Accès gratuit à la biblio'],
    icon: '🎓'
  },

  // 6. Rare : La Classe Moyenne d'Angré
  {
    id: 'classe_moyenne_angre',
    name: 'La Classe Moyenne d\'Angré',
    englishName: 'Angré Middle Class Resident',
    rarity: 'rare',
    commune: 'Cocody Angré',
    tagline: '180 000 F, 3 pièces à la 8ème tranche, instituteur au lycée.',
    description: 'Une vie paisible et structurée. Le salaire de l\'Éducation nationale qui tombe chaque fin de mois, un salon aéré, et le rêve de s\'acheter un jour un terrain à Bingerville.',
    startingCash: 180000,
    homeType: 'trois_pieces',
    homeLabel: '3 Pièces à Angré 8ème Tranche',
    vehicles: [],
    luckStat: 58,
    perks: ['Salaire régulier garanti', 'Prêt bancaire facilité', 'Loyer payé 2 semaines'],
    icon: '📚'
  },

  // 7. Rare : Le Gérant de Maquis
  {
    id: 'gerant_maquis_yop',
    name: 'Le Gérant de Maquis (Yopougon)',
    englishName: 'Yopougon VIP Bar & Maquis Manager',
    rarity: 'rare',
    commune: 'Yopougon',
    tagline: '250 000 F, spot mythique à Rue Princesse, casiers de bières au frais.',
    description: 'Le temple de la fête ivoirienne. Les artistes viennent tester leurs nouveaux sons coupé-décalé chez toi, les clients commandent des poulets braisés jusqu\'à 5h du matin.',
    startingCash: 250000,
    homeType: 'deux_pieces',
    homeLabel: 'Logement au-dessus du Maquis (Yopougon)',
    vehicles: [],
    luckStat: 60,
    perks: ['Jauge d\'Envie remonte 2x plus vite', 'Réseau social d\'ambianceurs', 'Revenus de nuit'],
    icon: '🍻'
  },

  // 8. Rare : Le Mécanicien de Treichville
  {
    id: 'mecanicien_treich',
    name: 'Le Mécanicien de Treichville',
    englishName: 'Treichville Garage Master',
    rarity: 'rare',
    commune: 'Treichville',
    tagline: '120 000 F, atelier garage mécanique, clé de douze et compresseur.',
    description: 'Quand un gbaka ou un taxi tombe en panne sur le boulevard de Marseille, c\'est chez toi qu\'on l\'amène. Tu connais les moteurs Toyota et Peugeot sur le bout des doigts.',
    startingCash: 120000,
    homeType: 'deux_pieces',
    homeLabel: 'Appartement au-dessus de l\'Atelier (Treichville)',
    vehicles: [],
    luckStat: 55,
    perks: ['Réparation véhicules -50%', 'Boost vitesse véhicules', 'Commerce de pièces détachées'],
    icon: '🔧'
  },

  // 9. Rare : La Styliste de Marcory
  {
    id: 'styliste_marcory',
    name: 'La Styliste de Marcory',
    englishName: 'Marcory Fashion & Wax Designer',
    rarity: 'rare',
    commune: 'Marcory',
    tagline: '140 000 F, studio couture, machine électrique et rouleaux de pagne wax.',
    description: 'Créatrice de sapes recherchées. Les dames chics de Babi viennent se faire coudre des robes de mariage et les sapeurs commandent des chemisettes taillées au millimètre.',
    startingCash: 140000,
    homeType: 'deux_pieces',
    homeLabel: 'Atelier Studio Mode (Marcory Zone 4)',
    vehicles: [],
    luckStat: 62,
    perks: ['Charisme vestimentaire (+30%)', 'Confection de sapes prestige', 'Bonus séduction et dates'],
    icon: '👗'
  },

  // 10. Épique : Le Jeune Cadre du Plateau
  {
    id: 'cadre_plateau',
    name: 'Le Jeune Cadre du Plateau',
    englishName: 'Plateau Financial District Executive',
    rarity: 'epic',
    commune: 'Plateau',
    tagline: '500 000 F, studio standing vue sur la lagune, costume cintré.',
    description: 'Tours de verre, climatisation centrale et pauses café au bord du boulevard Lagunaire. Tu analyses les cours boursiers de la BRVM et gères les portefeuilles d\'investissement.',
    startingCash: 500000,
    homeType: 'studio',
    homeLabel: 'Studio Standing Tour Postel (Plateau)',
    vehicles: ['Berline Citadine'],
    luckStat: 70,
    perks: ['Véhicule de départ (Berline)', 'Accès banques et investissements', 'Loyer payé 3 semaines'],
    icon: '🏦'
  },

  // 11. Épique : Le "Laté" de Cocody
  {
    id: 'late_cocody',
    name: 'Le "Laté" de Cocody (Fils à Papa)',
    englishName: 'Cocody Riviera Nepo Kid',
    rarity: 'epic',
    commune: 'Cocody Riviera',
    tagline: '1 200 000 F, 3 pièces chic, berline neuve offerte, parents influents.',
    description: 'Né avec de la chance. Tes parents paient le loyer, ta berline est garée devant la résidence clôturée et tu as des passe-droits dans les meilleures administrations.',
    startingCash: 1200000,
    homeType: 'trois_pieces',
    homeLabel: '3 Pièces Résidence Sécurisée (Cocody Riviera)',
    vehicles: ['Berline Compacte'],
    luckStat: 75,
    perks: ['Loyer payé 4 semaines par les parents', 'Voiture de fonction offerte', 'Relations haut placées'],
    icon: '💎'
  },

  // 12. Épique : L'Élève de l'INP-HB (L'Élite d'État & Bourse Koidio)
  {
    id: 'inphb_polytech',
    name: 'L\'Élève de l\'INP-HB (L\'Élite Polytechnique)',
    englishName: 'INP-HB Polytechnic Elite Student',
    rarity: 'epic',
    commune: 'Yamoussoukro / Plateau',
    tagline: '80 000 F, campus d\'excellence, perçoit la bourse d\'État « Koidio » de 50 000 F régulièrement.',
    description: 'La crème de l\'intelligence ivoirienne. Sélectionné sur concours national impitoyable, l\'État ivoirien te verse la prestigieuse allocation « Koidio » tous les 3 jours in-game. Les ministères et grands groupes s\'arrachent ta signature.',
    startingCash: 80000,
    homeType: 'studio',
    homeLabel: 'Chambre Pavillon d\'Excellence INP-HB',
    vehicles: [],
    luckStat: 78,
    perks: ['Bourse Koidio (+50 000 F régulier)', 'Diplôme d\'Ingénieur garanti', 'Priorité ministères'],
    icon: '🏛️',
    isINPHB: true
  },

  // 13. Épique / EASTER EGG MAJEUR : Le Golden Boy (Anglais forcé)
  {
    id: 'golden_boy',
    name: 'The Golden Boy (Jet-Set Privilégié)',
    englishName: 'The Golden Boy (Privileged Jet-Set)',
    rarity: 'epic',
    commune: 'Assinie / Cocody',
    tagline: 'Beachfront Duplex, BMW M Series + Rolls-Royce, Unlimited Cash for 1 month.',
    description: 'Héritier milliardaire d\'une grande famille. Duplex les pieds dans l\'eau en baie d\'Assinie, garage de rêve avec 2 bolides de luxe. Papa paye toutes les factures pendant 30 jours.\n\n⚠️ EASTER EGG : Le jeu bascule AUTOMATIQUEMENT en ANGLAIS et l\'option de langue est verrouillée ! "Bro, you went to the American International School of Abidjan, French is not in your DNA!"',
    englishDescription: 'Billionaire heir. Oceanfront duplex in Assinie with private beach, 2 luxury rides (BMW M Series + Rolls-Royce Phantom). Dad\'s Platinum card covers everything for 30 in-game days.\n\n⚠️ EASTER EGG: Game is strictly LOCKED IN ENGLISH! No switching back!',
    startingCash: 5000000,
    homeType: 'duplex_mer',
    homeLabel: 'Beachfront Ocean Duplex (Assinie)',
    vehicles: ['BMW M Series Sport', 'Rolls-Royce Phantom VIP'],
    luckStat: 88,
    perks: ['Unlimited Cash for 30 days', '2 Luxury Cars in Garage', 'VIP Access everywhere', 'Language Locked in English'],
    icon: '👑',
    badge: 'ENGLISH LOCKED 🔒',
    isEnglishLocked: true
  },

  // 14. EASTER EGG LÉGENDAIRE : Yannis Diomandé (Superstar Real Madrid)
  {
    id: 'yannis_diomande',
    name: 'Yannis Diomandé (Le Crack du Real Madrid)',
    englishName: 'Yannis Diomandé (Real Madrid Superstar)',
    rarity: 'easter_egg',
    commune: 'Cocody Ambassades',
    tagline: 'Ailier droit n°25 du Real Madrid, transféré 125 M€, héros national en vacances à Babi.',
    description: 'Le prodige mondial du football ivoirien. Tu viens passer tes vacances d\'été à Abidjan après une saison folle en Liga. Villa de maître à Cocody Ambassades, supercar de Madrid, vitesse athlétique surhumaine. La foule t\'acclame dans chaque maquis et rue !',
    startingCash: 15000000,
    homeType: 'villa_ambassade',
    homeLabel: 'Villa Présidentielle (Cocody Ambassades)',
    vehicles: ['Supercar Madrid Custom'],
    luckStat: 92,
    perks: ['15 Millions FCFA en devises', 'Vitesse de sprint surhumaine', 'Foule & Buzz permanent', 'Supercar de fonction'],
    icon: '⚽',
    badge: 'REAL MADRID #25',
    isYannisDiomande: true
  },

  // 15. EASTER EGG LÉGENDAIRE : Le Brouteur (Cyber-Escroc)
  {
    id: 'brouteur_yop',
    name: 'Le Brouteur (Le Cyber-Escroc / Gayman)',
    englishName: 'The Cyber Scam Master (Gayman)',
    rarity: 'easter_egg',
    commune: 'Yopougon Siporex',
    tagline: '350 000 F cash d\'arnaques web, studio climatisé, traqué par la PLCC.',
    description: 'Tu maîtrises les faux profils et le romance-scam sur les forums internationaux. L\'argent sale rentre en flots soudains, tu flambes en bouteilles de champagne au maquis. Mais ta jauge de désir/sexe est insatiable et la cyberpolice (PLCC) te surveille de très près.',
    startingCash: 350000,
    homeType: 'studio',
    homeLabel: 'Studio Climatisé Haut Débit (Yopougon)',
    vehicles: ['Berline Teintée'],
    luckStat: 65,
    perks: ['Gains cyber rapides', 'Champagne travaillement', 'Risque PLCC élevé', 'Jauge d\'Envie exigeante'],
    icon: '💻',
    badge: 'WANTED PLCC 🚔',
    isBrouteur: true
  },

  // 16. EASTER EGG LÉGENDAIRE : Le Djassaman de Treichville
  {
    id: 'djassaman_treich',
    name: 'Le Djassaman de Treichville',
    englishName: 'Treichville Black Market King',
    rarity: 'easter_egg',
    commune: 'Treichville',
    tagline: 'Roi du marché noir, contrefaçons rares, boutiques clandestines sous le manteau.',
    description: 'Tout ce qui ne se vend pas légalement à Abidjan passe par toi. Téléphones débloqués, bijoux non déclarés, pièces introuvables. Tu as les yeux de la police sur le dos, mais le portefeuille toujours bien garni.',
    startingCash: 280000,
    homeType: 'deux_pieces',
    homeLabel: 'Planque Arrière-Boutique (Treichville)',
    vehicles: ['Moto Express'],
    luckStat: 68,
    perks: ['Boutiques clandestines débloquées', 'Prix d\'achat cassés -40%', '+1 Étoile police permanente'],
    icon: '🕶️',
    badge: 'BLACK MARKET',
    isDjassaman: true
  },

  // 17. EASTER EGG LÉGENDAIRE : Le Baron de l'Ombre
  {
    id: 'baron_ombre',
    name: 'Le Baron de l\'Ombre (Le Parrain Clandestin)',
    englishName: 'The Shadow Cartel Boss',
    rarity: 'easter_egg',
    commune: 'Plateau / Port-Bouët',
    tagline: '10 000 000 F cash, villa bunker sécurisée, 3 étoiles de police permanentes au Plateau.',
    description: 'Le maître des flux occultes de la lagune. Dix millions de FCFA en liasses dans le coffre, mais impossible de marcher tranquillement au Plateau sans te faire poursuivre par les forces d\'élite. Obligation de blanchir tes fonds dans des commerces légaux.',
    startingCash: 10000000,
    homeType: 'bunker',
    homeLabel: 'Villa Bunker Sécurisée (Port-Bouët)',
    vehicles: ['4x4 Blindé Noir'],
    luckStat: 80,
    perks: ['10 Millions FCFA cash', '4x4 Blindé noir vitres teintées', '3 Étoiles police permanentes', 'Blanchiment d\'argent requis'],
    icon: '💼',
    badge: 'PARRAIN CLANDESTIN',
    isBaron: true
  },

  // 18. EASTER EGG LÉGENDAIRE : Le Rescapé des Bas-fonds
  {
    id: 'rescape_basfonds',
    name: 'Le Rescapé des Bas-fonds (En Rédemption)',
    englishName: 'The Slum Survivor (Redemption Path)',
    rarity: 'easter_egg',
    commune: 'Attécoubé / Adjamé',
    tagline: 'Ancien toxicodépendant en rédemption, vision troublée, quête de guérison.',
    description: 'Tu as touché le fond de la nuit abidjanaise. La santé vacille, la vision se trouble parfois sous l\'effet du manque, mais une volonté de fer t\'anime pour reconstruire ta vie. L\'aventure humaine la plus émouvante de BLV.',
    startingCash: 5000,
    homeType: 'chambre_cour',
    homeLabel: 'Chambre de fortune (Attécoubé)',
    vehicles: [],
    luckStat: 72,
    perks: ['Jauge de santé fragile', 'Défi de rédemption héroïque', 'Trophée secret du rescapé'],
    icon: '❤️‍🩹',
    badge: 'RÉDEMPTION'
  },

  // 19. EASTER EGG LÉGENDAIRE : Le Politicien Déchu
  {
    id: 'politicien_dechu',
    name: 'Le Politicien Déchu',
    englishName: 'The Fallen Minister',
    rarity: 'easter_egg',
    commune: 'Plateau / Cocody',
    tagline: 'Ancien ministre ruiné, zéro sou, mais un carnet d\'adresses secret au sommet.',
    description: 'Hier au gouvernement, aujourd\'hui déchu après un remaniement houleux. Tous tes comptes officiels ont été saisis, mais tu connais tous les secrets inavouables de la République et peux débloquer des barrages routiers d\'un simple coup de fil.',
    startingCash: 8000,
    homeType: 'studio',
    homeLabel: 'Studio de repli discret (Cocody Danga)',
    vehicles: [],
    luckStat: 74,
    perks: ['Carnet d\'adresses d\'État', 'Immunité barrages policiers', 'Chantage & secrets politiques'],
    icon: '📜',
    badge: 'SECRETS D\'ÉTAT'
  }
];

export const SCHOOL_BADGES: SchoolBadge[] = [
  {
    id: 'caiman',
    name: 'Devenir Caïman',
    institution: 'Lycée Classique d\'Abidjan (LCA)',
    commune: 'Cocody',
    icon: '🐊',
    color: '#10b981', // Vert émeraude
    description: 'Le prestigieux titre des élèves et anciens élèves du Lycée Classique d\'Abidjan. Symbole de mordant intellectuel et de leadership politique.',
    history: 'Fondé en 1945, le Lycée Classique est le berceau historique des grands dirigeants, intellectuels et ministres ivoiriens (Laurent Gbagbo, Tidjane Thiam, Daniel Kablan Duncan, etc.).',
    perks: [
      'Accès libre aux bureaux ministériels du Plateau',
      'Charisme et éloquence en débat contradictoire (+35%)',
      'Réseau d\'influence des Anciens Caïmans (2AC-LCA)'
    ]
  },
  {
    id: 'alysma',
    name: 'Devenir Alysma',
    institution: 'Lycée Sainte-Marie de Cocody (LYSMA)',
    commune: 'Cocody',
    icon: '👑',
    color: '#ec4899', // Rose royal
    description: 'Le badge d\'excellence de l\'Amicale des Anciennes du Lycée Sainte-Marie. Incarnation de la rigueur, de l\'élégance et du 100% de réussite au Bac.',
    history: 'Fondé en 1962 par le Président Félix Houphouët-Boigny et Madeleine Daniélou, le Lycée Sainte-Marie est le sanctuaire public d\'élite pour jeunes filles formant les futures pionnières de la nation.',
    perks: [
      'Prestige social et distinction diplomatique suprême',
      'Bonus de négociation financière et bancaire (+40%)',
      'Solidarité inébranlable du réseau féminin ALYSMA'
    ]
  },
  {
    id: 'alex',
    name: 'Devenir Alex',
    institution: 'Lycée d\'Excellence Alassane Ouattara (LEAO)',
    commune: 'Grand-Bassam',
    icon: '⚡',
    color: '#3b82f6', // Bleu high-tech
    description: 'Le badge des élèves d\'élite du campus technologique de Grand-Bassam. Génie en sciences dures, robotique et mathématiques appliquées.',
    history: 'Inauguré en 2019 sur un campus ultra-moderne de 20 hectares, ce lycée sélectif recrute les meilleurs cerveaux du pays avec un taux de réussite parfait.',
    perks: [
      'Vitesse d\'apprentissage informatique & finance (+50%)',
      'Passerelle d\'admission directe pour l\'INP-HB',
      'Bonus de création de startups technologiques licornes'
    ]
  }
];

export const GASTRONOMY_FOODS: FoodItem[] = [
  {
    id: 'garba_royal',
    name: 'Garba Royal Croustillant',
    price: 1500,
    faimGain: 55,
    envieGain: 40,
    description: 'Attiéké frais bien huilé, gros pavé de thon frit croustillant, piments rouges et oignons hachés. L\'âme d\'Abidjan.',
    icon: '🍛',
    communeFavorite: 'Yopougon & Adjamé'
  },
  {
    id: 'alloco_poisson',
    name: 'Alloco & Poisson Braisé',
    price: 3000,
    faimGain: 50,
    envieGain: 45,
    description: 'Bananes plantains frites dorées et caramélisées, carpe braisée au feu de bois et sauce tomate piment relevée.',
    icon: '🍌',
    communeFavorite: 'Allocodrome de Cocody'
  },
  {
    id: 'foutou_graine',
    name: 'Foutou Banane Sauce Graine',
    price: 4500,
    faimGain: 70,
    envieGain: 50,
    description: 'Foutou banane pilé à chaud dans le mortier, sauce graine onctueuse avec escargot géant et poisson fumé mâchoiron.',
    icon: '🍲',
    communeFavorite: 'Treichville & Marcory'
  },
  {
    id: 'choukouya_mouton',
    name: 'Choukouya de Mouton Épicé',
    price: 5000,
    faimGain: 60,
    envieGain: 55,
    description: 'Viande de mouton braisée à l\'étouffée, tendre et parfumée au mélange d\'épices kan-kan dans son papier kraft.',
    icon: '🥩',
    communeFavorite: 'Marcory Zone 4'
  },
  {
    id: 'kedjenou_poulet',
    name: 'Kédjénou de Poulet Canari',
    price: 6000,
    faimGain: 65,
    envieGain: 45,
    description: 'Poulet mijoté sans eau dans son canari de terre cuite scellé avec légumes, gingembre et herbes locales.',
    icon: '🍗',
    communeFavorite: 'Yopougon Bel Air'
  },
  {
    id: 'plateau_fruits_mer',
    name: 'Homard & Gambas Grillées d\'Assinie',
    price: 35000,
    faimGain: 75,
    envieGain: 90,
    description: 'Pêche fraîche du jour, homard braisé au beurre d\'ail citronné savouré les pieds dans l\'eau en baie d\'Assinie.',
    icon: '🦞',
    communeFavorite: 'Assinie Mafia'
  }
];

export const LIVE_RADIOS: RadioStation[] = [
  {
    id: 'frequence2',
    name: 'RTI Fréquence 2',
    frequency: '92.0 FM',
    tagline: 'La station jeune, culture et divertissement de la RTI',
    genre: 'Culture, Musiques, Débats Ivoiriens',
    streamUrl: 'https://listen.radioking.com/radio/734192/stream/800486',
    logo: '🇨🇮',
    isLive: true
  },
  {
    id: 'skyrock_abidjan',
    name: 'Skyrock Abidjan',
    frequency: '107.9 FM',
    tagline: '1ère sur l\'Afrobeats, Rap Ivoire et Musiques Urbaines',
    genre: 'Afrobeats, Hip-Hop, Pop Africaine',
    streamUrl: 'https://icecast.skyrock.net/s/abidjan_aac_64k',
    logo: '🔥',
    isLive: true
  },
  {
    id: 'wavemaster',
    name: 'WaveMaster Radio Babi',
    frequency: 'Web Live',
    tagline: 'Le temple du Zouglou, Rumba et Coupé-Décalé des maquis',
    genre: 'Zouglou, Rumba, Coupé-Décalé',
    streamUrl: 'https://wavemaster.diskstation.me/listen/wavemaster_radio/radio.mp3',
    logo: '🎶',
    isLive: true
  }
];
