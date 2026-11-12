# 🇨🇮 BLV — BABI LIFE VIBES
### La Simulation de Vie Urbaine 3D à Abidjan (GTA Roleplay × The Sims)
*Game Design Document (GDD) & Spécifications Architecturales Officielles*

---

## 🌟 1. VISION DU PROJET & POSITIONNEMENT CONCURRENTIEL

**BLV (Babi Life Vibes)** est un jeu de simulation de vie urbaine en 3D temps réel, multijoueur et cross-platform (Web PWA, Mobile Paysage & Desktop), se déroulant dans la métropole d'**Abidjan, Côte d'Ivoire**.

Inspiré par le dynamisme de la culture ivoirienne, l'esthétique culte de **GTA San Andreas (PS2 Golden Era)** et la profondeur sociale des **Sims**, BLV a été conçu pour surpasser radicalement les tentatives existantes (notamment *Terre d'Ivoire*) sur tous les plans :

| Critères d'Excellence | Terre d'Ivoire (Existant) | BLV — Babi Life Vibes (Notre Projet) |
| :--- | :--- | :--- |
| **Direction Artistique 3D** | Primitives cubiques plates ("personnages en blocs"), pas d'ombres douces, flat shading. | **Modèles stylisés GTA San Andreas**, silhouettes humaines expressives, vrais véhicules d'Abidjan, éclairage PBR tropical et ombres douces. |
| **Ergonomie & Contrôles** | Vue portrait étroite, boutons éparpillés, 50 pastilles HTML flottantes polluant l'écran. | **Format Paysage immersif**, détection automatique du terminal, **manette PlayStation tactile complète** (Joystick + ✕ □ △ ◯) sur mobile et Clavier/Souris sur PC. |
| **Sécurité & Protection Code** | Code JavaScript en clair, non minifié, accessible via `curl` ou F12 en 10 secondes. | **Cœur Rust / C++ compilé en WebAssembly (WASM)** binaire impénétrable + obfuscation lourde et chiffrement conforme aux **Normes Européennes (RGPD / OWASP)**. |
| **Rythme & Moteur Temporel**| 1 heure réelle = 1 heure de jeu (attente passive lente et ennuyeuse). | **Temps dynamique accéléré** : **1 heure réelle = 4 heures de jeu** (1 journée complète in-game en 6 heures). |
| **Système de Chance & RNG**  | Calculs déterministes basiques. | **La Chance ("L'Étoile / Le Karma") irrigue 100% des mécaniques** : transports, gastronomie, travail, police, romance, trouvailles. |
| **Système de Destins**       | 6 classes sommaires sans divergence profonde. | **19 Classes détaillées par raretés** dont **7 Easter Eggs asymétriques** (*Golden Boy en anglais forcé, Yannis Diomandé superstar du Real Madrid, l'élève de l'INP-HB avec le Koidio, le Poignon à Baraka suprême, le Brouteur traqué par la PLCC...*). |
| **Profondeur Psychologique**  | Jauges basiques d'énergie/faim. | **La Jauge d'Envie Universelle** comblée par les mets savoureux ivoiriens, l'amour, le sexe consenti censuré Les Sims, le travail, la fête ou les substances. |
| **Musique & Audio**           | Bips synthétiques rudimentaires. | **Vraies radios ivoiriennes en direct live streaming** (RTI Fréquence 2 - 92.0 FM, Skyrock Abidjan - 107.9 FM, WaveMaster Radio). |
| **Hébergement & Infrastructure**| Déploiement monolithique. | **PWA universelle 100% gratuite à vie** déployée sur **Cloudflare Pages/Workers** avec nœud edge à Abidjan. |

---

## 🔒 2. ARCHITECTURE TECHNIQUE & NORMES EUROPÉENNES (RÈGLE 2)

Conformément à la réglementation européenne et aux exigences de sécurité industrielle :

### A. Le Cœur Double-Moteur (Rust / C++ WASM + React 19)
1. **Le Cœur Sécurisé (Rust / C++ WASM)** :
   * Les algorithmes du Destin, les tirages de Chance/Karma, le calcul de la Jauge d'Envie, la physique et la logique économique sont compilés en binaire machine WebAssembly (`.wasm`).
   * **Inviolabilité** : Le binaire machine ne contient aucun code source en clair, empêchant toute rétro-ingénierie ou aspiration de code dans les DevTools.
2. **Le Shell de Rendu & d'Interface (React 19 + TypeScript + Three.js PBR)** :
   * Gestion du graphe de scène 3D, des shaders d'eau de la Lagune Ébrié, de la manette PlayStation virtuelle et des composants audio.

### B bis. La Ville d'Abidjan générée (`src/world/`) — Itération 7 ✅
La carte n'est plus un décor figé : c'est une **ville procédurale déterministe** (identique chez tous les joueurs, aucun téléchargement), construite par chunks de 64 m à partir de la géographie réelle d'Abidjan (échelle 1:4).

| Module | Rôle |
|---|---|
| `geo.ts` · `abidjanGeography.ts` | Projection GPS → mètres ; lagune, baies, île Boulay, 5 ponts, 13 communes, repères (chaque donnée porte `confidence` : `sourced` / `approximate`) |
| `roads.ts` · `city.ts` · `terrain.ts` | Grands axes + quadrillage par commune ; bâtiments, arbres, repères, parcelles de maisons ; texture de sol |
| `chunkProvider.ts` · `worldWorker.ts` | Génération dans un Web Worker (aucune saccade) |
| `WorldStreamer.ts` · `chunkMesh.ts` | Chargement/déchargement par zones, maillages fusionnés, solides physiques |
| `playerHouse.ts` · `roadTraffic.ts` | Maison orientable sur sa parcelle ; trafic sur les grands axes |

**Chaque joueur a sa parcelle** : `findHouseLot(typeDeLogement, graine)` choisit une parcelle en bordure de bloc dans une commune cohérente avec le logement tiré à la roulette (villa → Cocody/Riviera, chambre en cour → Adjamé/Treichville, squat → Attécoubé/Abobo…).

### C. Le Moteur Physique WebAssembly (C++ freestanding → `public/physics.wasm`) — Itération 6 ✅
Le déplacement du joueur, la conduite, les collisions et le trafic sont simulés par un module **C++ sans libc compilé en WebAssembly** (20 Ko), conformément à la Règle 2.

| Élément | Détail |
|---|---|
| Source | `physics/physics.cpp` — compilation : `npm run build:wasm` (clang ≥ 14 + lld) |
| Passerelle TypeScript | `src/physics/PhysicsCore.ts` (API typée, instance partagée `loadPhysics()`) |
| Décor physique | `src/physics/abidjanWorld.ts` : tours du Plateau, lycées, port, maison, lagune (infranchissable hors ponts), limites de carte |
| Trafic | `src/physics/trafficAI.ts` : poursuite de voie, distances de sécurité, rebouclage |
| Pas de simulation | Fixe à 120 Hz, déterministe (aucune dépendance au framerate) |
| Voitures | Modèle « bicyclette » avec angles de dérive, formule de pneu type Pacejka, cercle de friction, transfert de masse avant/arrière, frein à main (arrière bloqué → drift), boîte 5 rapports (régime moteur pour le son), assiette et roulis visuels |
| Gabarits | Wôrô-wôrô 504, Gbaka (Mercedes 207), Police, Land Cruiser, Coupé GT |
| Collisions | Boîtes orientées (SAT) et cylindres sur grille spatiale 16 m, impulsions avec frottement, véhicule↔véhicule, véhicule↔piéton (renversé + étourdi) |
| Piéton | Cercle glissant le long des murs, saut, marche sur trottoirs ≤ 35 cm |
| Rayons | `ray()` 2D (DDA) : collision de caméra contre les bâtiments |

**Tests** : `npm run test` (= `test:physics` + `test:world`). `test:physics` : 25 tests du cœur WASM + 10 tests d'intégration : traversée des ponts, lagune, murs de la maison, trafic, rayon caméra). Aucun mur n'est traversé même à 209 km/h.

### B. Conformité Stricte aux Normes Européennes
* **RGPD (Règlement Général sur la Protection des Données - UE 2016/679)** :
  * *Privacy by Design & Default (Art. 25)* : Aucune donnée physique réelle (géolocalisation GPS réelle, nom d'état civil, numéro de téléphone) n'est requise ni collectée.
  * *Droit à l'Oubli (Art. 17)* : Bouton de purge intégrale des données locales et sauvegardes en 1 clic dans les Réglages.
  * *Sécurité & Chiffrement (Art. 32)* : Toutes les connexions transitent en HTTPS/TLS avec HSTS forcé sur Cloudflare.
* **Directive ePrivacy 2002/58/CE** :
  * Zéro traceur publicitaire ou cookie tiers espion. Le stockage local (IndexedDB) est 100% technique, réservé à la sauvegarde de progression de la PWA.
* **Sécurité OWASP Client-Side Top 10** :
  * Neutralisation des failles XSS grâce au typage strict TypeScript et à l'échappement natif React JSX (zéro `dangerouslySetInnerHTML`).

---

## 🎮 3. ERGONOMIE CONSOLE & FORMAT PAYSAGE

BLV est conçu pour offrir les sensations d'un jeu console portable (style *PSP / PS Vita / GTA Stories*) :

### A. Détection Intelligente de l'Appareil
* **Sur Mobile & Tablette** :
  * Si l'appareil est tenu en mode portrait : un écran stylisé invite le joueur avec animation : *"Tourne ton téléphone en paysage pour jouer à BLV"*.
  * Dès le basculement en **mode Paysage**, l'interface console s'active :
    * **À Gauche** : **Joystick Analogique Virtuel 360°** dynamique (déplacements fluides, marche, course, direction des véhicules).
    * **À Droite** : **Les 4 Boutons PlayStation Emblématiques** :
      * **✕ (Croix)** : Interagir / Valider / Entrer ou sortir d'un véhicule / Parler aux PNJ.
      * **□ (Carré)** : Frapper / Sauter / Sprint rapide. *(Implémenté : maintenir = sprint, tap bref = saut ; « Frapper » arrive avec le système de combat.)*
      * **△ (Triangle)** : Dégainer le Smartphone BabiOS en surimpression fluide.
      * **◯ (Rond)** : Annuler / Esquive / Frein à main et dérapage contrôlé en voiture. *(Implémenté : maintenir = frein à main.)*
* **Sur PC (Desktop / Laptop)** :
  * Les commandes tactiles disparaissent automatiquement.
  * Contrôle fluide au **Clavier (ZQSD / WASD + Shift + Espace + E/F + Tab)** et **Souris** pour la rotation de caméra 3D à 360°.
  * **Shift** = sprint · **Espace** = saut à pied / frein à main en voiture · **E / F** = interagir, monter/descendre de voiture · **R** = radio · **C** = caméra · **P / Tab** = smartphone.
  * Les boutons *Manger* et *Radio* restent accessibles dans la barre du HUD.

---

## ⏰ 4. MOTEUR TEMPOREL ACCÉLÉRÉ : LE RYTHME DE BABI

* **Ratio Officiel** : **1 Heure Réelle = 4 Heures de Jeu** (1 Journée in-game = 6 Heures réelles).
* **15 Minutes réelles = 1 Heure in-game**.
* **Impact Visuel & Ludique** :
  * Le joueur assiste à l'enchaînement spectaculaire des lumières : aube brumeuse sur la lagune, soleil de plomb à midi, coucher de soleil orange flamboyant (*San Andreas Sky*) et illumination nocturne des maquis et des ponts.
  * Finie l'attente passive : les salaires, les loyers, les besoins et les opportunités se succèdent avec un dynamisme palpitant.

---

## 🍀 5. LE MOTEUR UNIVERSEL DE LA CHANCE ("L'ÉTOILE / LE KARMA")

Dans BLV, la Chance n'est pas un accessoire : **elle irrigue 100% des systèmes de jeu** via une statistique de 1 à 100 appelée **L'Étoile** :

1. **Transports (Woro-woro, Gbaka, Bolides)** :
   * *Haute Étoile* : Voie dégagée, feu vert, rencontre inspirante d'un contact d'affaires dans le minibus.
   * *Basse Étoile* : Embouteillage monstre au carrefour de l'Indénié, pneu crevé, contrôle inopiné de la police.
2. **Gastronomie & Santé** :
   * *Haute Étoile* : Le Garba est un chef-d'œuvre (+double boost d'Envie, digestion parfaite).
   * *Basse Étoile* : Piment trop violent ou aliment douteux ➔ urgence sanitaire immédiate !
3. **Travail & Affaires** :
   * Pourboire surprise géant, client fortuné, prime patronale VS coupure de courant délestage, machine en panne.
4. **La Rue & les Trouvailles** :
   * Trouver une liasse de billets égarée sur le trottoir, tomber sur une vente flash au Djassa à -50%.
5. **Le Karma Évolutif** :
   * Les bonnes actions (faire la charité à un démuni, aider une tantie au marché, régler sa tontine à l'heure) illuminent votre Étoile. Les coups bas et arnaques la ternissent.

---

## 🎲 6. LA MATRICE DES 19 DESTINS DE LA ROULETTE D'ABIDJAN

Chaque nouvelle partie débute par la **Roulette du Destin**, qui détermine les conditions initiales de naissance :

### A. Les 4 Classes Communes (⚪ 35% de chance)
1. **Le Débrouillard d'Abobo** : 15 000 F en poche, chambre dans une cour commune, 1 vieux ventilo. Apprenti gbaka. Résistance à la fatigue (+25%).
2. **Le Commerçant d'Adjamé** : 50 000 F, 2 pièces près du Grand Marché, 1 étal de fripes. Négociation street (+15% de bénéfice).
3. **Le Chauffeur de Woro-Woro (Koumassi)** : 35 000 F, studio, Peugeot 504 jaune louée à la journée. Conduite experte.
4. **L'Étudiant Fauché de l'UFHB (Cocody Campus)** : 20 000 F, chambre en cité universitaire, vieux PC. Intellect élevé.

### B. Les 4 Classes Rares (🔵 25% de chance)
5. **La Classe Moyenne d'Angré** : 180 000 F, 3 pièces à Angré 8ème tranche, instituteur ou comptable. Salaire garanti chaque semaine.
6. **Le Gérant de Maquis (Yopougon Rue Princesse)** : 250 000 F, logement au-dessus du spot, stock de casiers. Réseau social et ambiance au max.
7. **Le Mécanicien de Treichville** : 120 000 F, atelier garage, boîte à outils complète. Réparation et customisation à moitié prix.
8. **La Styliste de Marcory** : 140 000 F, studio atelier, machine à coudre moderne. Création de sapes en pagne wax et bonus de charisme.

### C. Les 4 Classes Épiques (🟣 25% de chance)
9. **Le Jeune Cadre du Plateau** : 500 000 F, studio standing vue lagune, costume cintré. Accès direct aux banques et ministères.
10. **Le "Laté" de Cocody** : 1 200 000 F, 3 pièces chic, berline citadine neuve, 4 semaines de loyer payées par les parents.
11. **L'Élève de l'INP-HB (L'Élite Polytechnico-Scientifique)** : 80 000 F de départ, chambre sur le campus d'excellence de Yamoussoukro, ordinateur portable. **Spécificité** : Reçoit régulièrement la fameuse bourse d'État prestigieuse appelée le **« Koidio »** (50 000 F tous les 3 jours in-game). Accès prioritaire aux ministères et cabinets d'audit du Plateau.
12. **Le Golden Boy (L'Ultra-Privilégié de la Jet-Set)** :
    * 🏖️ Duplex de luxe les pieds dans l'eau en baie d'Assinie.
    * 💳 **Argent illimité pendant 1 mois** (la carte Platinum de papa couvre tout).
    * 🚗 2 bolides dans l'allée : une **BMW M Series** de sport et une **Rolls-Royce Phantom**.
    * ⭐ Chance de classe démultipliée et passe-droits auprès des autorités.
    * 🔒 **EASTER EGG EXCLUSIF DU GOLDEN BOY** : **Le jeu bascule AUTOMATIQUEMENT en ANGLAIS américain jet-set et il est impossible de le modifier dans les réglages !** Pop-up humoristique : *"Bro, you literally graduated from the American International School of Abidjan, French is not in your DNA anymore!"*.

### D. Les 7 Easter Eggs Légendaires (🔴 15% de chance au total)
13. **Le Poignon (L'Extrême Précarité & la Baraka Suprême)** :
    * Démarre avec **2 000 FCFA** en poche, zéro logement (dort sur un carton sous un hangar au marché d'Adjamé), vêtements usés.
    * **L'Équilibrage de Génie** : Pour compenser cette difficulté brutale, il possède **une Chance / Étoile Mystique à 95/100 (supérieure au Golden Boy !)**. Taux de jackpot au Loto démultiplié, trouvailles providentielles de liasses dans la rue, rencontres avec des bienfaiteurs qui lui ouvrent les portes des affaires. L'ascension la plus héroïque du jeu !
14. **Yannis Diomandé (Le Crack du Real Madrid)** :
    * L'ailier droit prodige ivoirien au Real Madrid, numéro 25, star internationale transférée pour 125 M€.
    * De retour à Abidjan pour les vacances et la sélection des Éléphants.
    * Compte bancaire colossal en devises, villa à Cocody Ambassades, supercar de Madrid, vitesse athlétique surhumaine.
    * Défi : Gérer la foule hystérique, les fans qui demandent des selfies dans la rue, les sollicitations familiales, et financer son académie de foot à Abidjan sans se faire distraire par les nuits d'Assinie !
15. **Le Brouteur (Le Cyber-Escroc / Gayman)** :
    * Studio climatisé à Yopougon, iPhone dernier cri, 350 000 F cash issus d'arnaques en ligne.
    * Flambe tout en champagne et maquis. Obsédé par les rencards et le sexe (jauge de désir exigeante).
    * Menace constante : **La PLCC (Police Cybercriminalité)** qui traque ses adresses IP.
16. **Le Djassaman de Treichville (Le Roi du Marché Noir)** :
    * Accès exclusif aux boutiques clandestines sous le manteau (smartphones débloqués, fausses plaques d'immatriculation, objets de contrebande portuaire). +1 Étoile de surveillance policière permanente.
17. **Le Baron de l'Ombre (Le Parrain Clandestin)** :
    * Démarre avec **10 000 000 FCFA cash**, villa bunker isolée et berline blindée aux vitres teintées.
    * **3 Étoiles de police permanentes au Plateau**, comptes bancaires officiels gelés : obligation de blanchir son argent dans des maquis et salons de coiffure.
18. **Le Rescapé des Bas-fonds (En Rédemption)** :
    * Toxicodépendant en sevrage, vision parfois troublée, jauge de santé délicate. S'il surmonte ses rechutes par des choix héroïques, il débloque le trophée secret le plus respecté du jeu.
19. **Le Politicien Déchu** :
    * Ancien dignitaire ruiné après un scandale d'État. Zéro sou, mais un carnet d'adresses secret capable de débloquer des barrages routiers ou de faire annuler des mandats de justice.

---

## 🔥 7. LA JAUGE D'ENVIE : LE MOTEUR DES PASSIONS HUMAINES

En plus des besoins basiques (Faim, Énergie, Hygiène, Vessie), la **Jauge d'Envie** représente le moteur de vie, la dopamine et l'accomplissement personnel :

* **Si l'Envie tombe à 0** : Le personnage entre en dépression profonde, démarche traînante, efficacité divisée par 2 au travail, perte de motivation.
* **Les 6 Voies pour combler l'Envie** :
  1. 🍛 **La Gastronomie & les Mets Savoureux d'Abidjan** : Manger du pain sec ne remplit que la faim basique. Mais savourer un **Garba croustillant** bien assaisonné au garbadrome, un **Alloco & poisson braisé**, un **Foutou sauce graine**, un **Choukouya de mouton** au kan-kan, ou un **Kédjénou de poulet** fait exploser la Jauge d'Envie avec le buff *"Extase Culinaire"* !
  2. 💖 **L'Amour & la Romance** : Dates romantiques en bord de lagune, mots doux, tendresse partagée. Remplissage doux mais **durable** de la jauge.
  3. 🔥 **Le Sexe & l'Intimité Consentie** : Rapprochement intime sous la couette façon *Les Sims* (100% pudique, cœurs animés, étincelles et musique humoristique, sans nudité). Décharge immédiate de dopamine et buff *"Cœur comblé"*.
  4. 💼 **Le Travail & l'Ambition** : Pour les bosseurs acharnés : signer un gros contrat au Plateau, réparer un moteur complexe ou réussir une journée de vente rapporte une immense fierté.
  5. 🎲 **Le Jeu & l'Adrénaline** : Paris au Loto Akwaba, jeux de dés au maquis, courses de véhicules.
  6. 💊 **Les Substances (La Faillite Éphémère)** : Alcool fort ou substances clandestines. Boost instantané de la jauge d'envie, suivi d'une descente brutale et d'un lourd contrecoup sur la santé.

---

## 💍 8. ROMANCE, CONSENTEMENT MUTUEL STRICT & MARIAGE CIVIL

* **La Séduction Réaliste** : Rencards dans les maquis chic de Marcory Zone 4 ou sur la plage d'Assinie, compliments sur la sape, cadeaux offerts via le Djassa.
* **Le Consentement Mutuel Inviolable** :
  * Entre joueurs : Toute interaction intime ou proposition de couple requiert une confirmation bilatérale via notification sur le smartphone BabiOS. Le refus d'une partie annule immédiatement l'action sans insistance possible.
  * Avec un PNJ : Refus immédiat si l'hygiène, le charisme ou le respect ne sont pas au niveau requis.
* **Le Mariage Civil Officiel** :
  * Achat de l'alliance en bijouterie au Plateau.
  * Célébration solennelle à la mairie par le **Maire élu** de la commune ou l'officier d'état civil devant les invités.
  * Partage du logement, compte bancaire commun et buffet de fête géant (Allocodrome, DJ, champagne).

---

## 🌧️ 9. LES 6 NOUVELLES AMÉLIORATIONS MAJEURES DU MONDE

1. 🌧️ **Météo Tropicale & Inondations Réelles** :
   * Pendant la grande saison des pluies, les bas-fonds d'Adjamé et d'Abobo sont inondés (le Poignon doit déménager son carton en urgence). Les carrefours de Cocody Riviera deviennent des marécages, forçant les woro-woros à s'arrêter et risquant de noyer les moteurs des berlines basses.
2. 🤝 **La Tontine Multijoueur** :
   * 5 à 10 joueurs cotisent chaque semaine in-game 50 000 FCFA. À chaque rotation, l'un des participants ramasse le jackpot (250 000 à 500 000 FCFA). Gare à celui qui tente de s'enfuir avec la caisse : plainte immédiate au commissariat d'Adjamé et perte de son Étoile !
3. 👔 **Le Système de Sape "Farot-Farot"** :
   * L'habit fait le moine à Babi : l'ensemble Wax et Bazin riche booste le charisme de +30% aux mariages, le costume italien ouvre les banques du Plateau, tandis qu'une tenue négligée entraîne le refus des vigiles à l'entrée des boîtes huppées.
4. 🛋️ **Décoration d'Intérieur "Babi Cribs"** :
   * Aménagement libre de son logement (climatiseur Split, ventilateur bruyant, canapé capitonné, TV 4K diffusant les matchs de Yannis Diomandé, baffles géantes de maquis).
5. ⚔️ **La Triade des Factions Urbaines** :
   * 3 pôles d'influence en compétition : *Le Syndicat des Transporteurs* (Adjamé/Yopougon), *L'Ordre Républicain* (Plateau/Mairies) et *La Jet-Set du Showbiz* (Cocody/Assinie). Travailler pour l'un modifie votre réputation chez les autres.
6. 🔮 **Spiritualité Urbaine : Le "Lavage d'Étoile"** :
   * En cas de série noire et de karma au plus bas, consulter un vieux sage à Yopougon pour purifier son Étoile (+30% de chance temporaire).

---

## 📻 10. LE TUNER DES VRAIES RADIOS IVOIRIENNES EN DIRECT LIVE

Dans sa voiture, dans son salon ou sur ses écouteurs de smartphone :
* 🇨🇮 **RTI Fréquence 2 (92.0 FM)** : Flux streaming officiel en direct de la grande radio publique ivoirienne (musiques, débats, talk-shows en live).
* 🔥 **Skyrock Abidjan (107.9 FM)** : Flux direct en direct de la capitale (Afrobeats, Rap Ivoire, musiques urbaines).
* 🎶 **WaveMaster Radio Lagune** : Ambiance continue Zouglou, Rumba et Coupé-Décalé des maquis d'Abidjan.
* 🔇 **Mode Silence** : Pour profiter du son immersif de la ville et des moteurs.

---

---

## 🏛️ 11. LES LYCÉES D'EXCELLENCE & LEURS BADGES HISTORIQUES

BLV intègre les trois plus prestigieux sanctuaires académiques de Côte d'Ivoire, chacun doté d'une histoire authentique et de bonus exclusifs :

1. 🐊 **Lycée Classique d'Abidjan (Cocody)** ➔ Badge **« Devenir Caïman »** :
   * **Histoire & Légende** : Fondé en 1945, le temple de l'intelligentsia ivoirienne. Berceau d'illustres alumni dont Laurent Gbagbo, Tidjane Thiam, et Daniel Kablan Duncan.
   * **Perks & Avantages** : +15% de charisme intellectuel, respect immédiat dans les bureaux administratifs du Plateau, déblocage direct des postes de direction.
2. 🌸 **Lycée Sainte-Marie de Cocody** ➔ Badge **« Devenir Alysma »** :
   * **Histoire & Légende** : Fondé en 1962 par le Président Félix Houphouët-Boigny et Madeleine Daniélou (Communauté Saint-François-Xavier). Institution d'élite féminine au taux historique de 100% de réussite au Baccalauréat.
   * **Perks & Avantages** : Baraka renforcée (+10 Étoile permanente protégée du mauvais œil), allure et hygiène naturelles au top, réseau d'influence diplomatique.
3. ⚡ **Lycée d'Excellence Alassane Ouattara de Grand-Bassam** ➔ Badge **« Devenir Alex »** :
   * **Histoire & Légende** : Inauguré en 2019 sur un campus futuriste de 20 hectares, pôle d'excellence scientifique ultra-sélectif alimentant les grandes écoles polytechniques et l'INP-HB.
   * **Perks & Avantages** : +25% de rendement sur les investissements et la crypto locale, priorité absolue pour les bourses d'études et carrières technologiques.

---

## 🛠️ 12. L'ESPACE ADMIN SANDBOX SECRET (TESTS & CONFIGURATION DÉVELOPPEUR)

Pour tester tous les paramètres en temps réel sans contrainte de progression publique :
* **Accès Privé & Secret** : Ouvrir les **Réglages** depuis le menu principal, cliquer sur le cadenas de sécurité ou taper le code secret **`BLV2026`** (ou `ADMIN` / `BABI`).
* **Fonctionnalités Disponibles** :
  * Forcer immédiatement n'importe lequel des **19 Destins** (Golden Boy, Poignon, Yannis Diomandé, Brouteur, etc.).
  * Injection instantanée de liquidités FCFA (+100 000 F, +1 000 000 F, +50 000 000 F).
  * Modification météo en temps réel (Grand soleil, Pluie tropicale, Inondation, Harmattan).
  * Ajustement des indices de recherche Police GTA (0 à 5 étoiles) et casier judiciaire.
  * Déblocage immédiat des 3 Badges d'Élite scolaires (Caïman, Alysma, Alex).
  * Restauration instantanée de tous les besoins vitaux et de la Jauge d'Envie à 100%.

---

## 💀 13. LA FIN TRAGIQUE & LE BILAN DE VIE (GAME OVER)

Si le joueur est submergé par les dettes colossales, le harcèlement policier et une jauge de dépression totale :
* Déclenchement automatique en cas de faim = 0, énergie = 0 et dettes > 25 000 F (ou manuellement pour tester).
* Cinématique dramatique avec résonance d'une voix off solennelle.
* Écran d'épitaphe solennel récapitulant les jours vécus, les accomplissements et le patrimoine perdu.
* Retour à l'écran de démarrage **BLV** pour renaître dans une nouvelle vie.

---

## 🚀 14. DÉPLOIEMENT & HÉBERGEMENT (CLOUDFLARE PAGES & PWA)

* **Dépôt GitHub** : `BLURDVNIXL/BLV-project` (branche `main`).
* **Hébergement** : Cloudflare Pages & Workers avec build automatisé (`npm run build`, dossier `dist`).
* **Zéro Coût (100% Gratuit à vie)** : Bande passante illimitée, mise en cache PWA locale sur les appareils des joueurs.
* **URL de Production Cloudflare** : Connectée directement à votre domaine Cloudflare `blv-project`.

---

## 🧪 15. DÉVELOPPEMENT LOCAL

```bash
npm install
npm run dev            # serveur de développement (port 3000)
npm run lint           # TypeScript strict (tsc --noEmit)
npm run build:wasm     # recompile physics/physics.cpp -> public/physics.wasm (clang + lld)
npm run test:physics   # tests du moteur physique (WASM + intégration)
npm run test:world     # invariants de la géographie d'Abidjan (projection, lagune, ponts, communes)
npm run test           # physique + géographie + ville
npm run test:city      # invariants de la ville générée (bâtiments, rues, parcelles)
npm run test:e2e       # test navigateur de bout en bout (Chromium, Playwright Python)
npm run build          # build de production (dist/, y compris physics.wasm)
```

*Le fichier `public/physics.wasm` est versionné : Cloudflare Pages n'a pas besoin de clang pour construire le site.*

---

*BLV — Babi Life Vibes est désormais documenté dans son intégralité avec la plus haute exigence d'ingénierie et de créativité.*
