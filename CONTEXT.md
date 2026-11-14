# 📜 CONTEXT.md — MASTER CONTEXT & HANDOVER BIBLE POUR AGENT IA
### Projet : BLV (Babi Life Vibes)
> **NOTE POUR TOUT NOUVEL AGENT IA REPRENANT CE PROJET :**  
> Ce document est la source unique de vérité absolue. Il contient les règles inviolables, l'historique complet des arbitrages avec le créateur, l'architecture technique, les mécaniques de jeu détaillées, et la feuille de route exacte pour poursuivre le projet sans rupture ni régression. Lis ce document avant toute intervention.

*Dernière synchronisation : 13 Novembre 2026*

---

## 🛑 1. LES 3 RÈGLES D'OR INVIOLABLES DU PROJET

Tout agent IA intervenant sur ce dépôt **DOIT** respecter à la lettre les 3 règles suivantes :

1. **RÈGLE 1 (Contrôle & Réflexion préalable)** :  
   *« Ne code rien sans qu'on ait fini de réfléchir, je te donne le OK d'abord. »*  
   * **Consigne Agent** : Ne JAMAIS générer ou modifier de code de jeu tant que l'utilisateur n'a pas formellement validé la réflexion et donné son « OK » explicite.

2. **RÈGLE 2 (Normes Européennes de Sécurité & de Code)** :  
   *« Normes de sécurité et de code sont calquées sur les normes EUROPÉENNES. »*  
   * **Consigne Agent** :  
     * **RGPD (UE 2016/679)** : *Privacy by Design* stricte. Zéro collecte de données personnelles réelles (pas de nom d'état civil, pas de géolocalisation GPS réelle, pas de cookies traceurs publicitaires tiers). Bouton *Droit à l'Oubli* (Art. 17) présent dans les réglages pour purger les sauvegardes locales en 1 clic.
     * **Directive ePrivacy 2002/58/CE** : Stockage local (IndexedDB / LocalStorage) 100% technique, exclusivement dédié à la sauvegarde et à la PWA.
     * **OWASP Top 10 Client-Side** : Typage TypeScript strict, zéro risque d'injection XSS (zéro `dangerouslySetInnerHTML`).
     * **Cœur Sécurisé en Rust / C++ compilé en WebAssembly (WASM)** : Les algorithmes sensibles (Chance/RNG, Jauge d'Envie, système économique FCFA, secrets des destins) sont compilés en binaire machine `.wasm` afin d'empêcher toute décompilation ou vol de code via les DevTools du navigateur.

3. **RÈGLE 3 (Traçabilité & Documentation Continue)** — *oubli fréquent, point CRUCIAL* :  
   *« Après chaque itération et chaque livraison/mise à jour du code, il faut absolument mettre à jour le README, le fichier CONTEXT.md contenant toutes les règles et le condensé de nos conversations, et le fichier Continue.md (ex-`Suite.md`, renommé le 14/11/2026) qui permet de reprendre le projet dans une nouvelle discussion. »*  
   * **Consigne Agent** : à la fin de CHAQUE turn impliquant une modification ou livraison de code, mettre à jour immédiatement `README.md`, `CONTEXT.md` et `Continue.md` pour refléter l'état exact du projet, **dans le même commit** que le code. Une livraison sans ces trois mises à jour n'est pas terminée.

---

## 🌍 2. IDENTITÉ DU PROJET & GENÈSE

* **Nom officiel du jeu** : **BLV (Babi Life Vibes)**.
* **Cadre spatio-temporel** : Abidjan, Côte d'Ivoire (Cocody, Plateau, Adjamé, Yopougon, Treichville, Marcory, Koumassi, Bingerville, baie d'Assinie, lagune Ébrié).
* **Genre** : Simulation de vie urbaine en 3D temps réel, multijoueur, à choix multiples et conséquences systémiques.
* **Genèse & Référence analysée** :
  * Le projet est né en analysant les faiblesses du jeu existant *Terre d'Ivoire* (`terre-divoire.vercel.app/jouer/`).
  * *Terre d'Ivoire* utilisait du Three.js rudimentaire avec des personnages et meubles en forme de cubes basiques (`RoundedBoxGeometry`), du flat shading sans ombres douces, 50+ pastilles HTML flottantes provoquant du layout thrashing, un code JavaScript en clair 100% exposé dans le navigateur, et un rythme 1h réelle = 1h de jeu très lent et ennuyeux.
  * **BLV** surclasse Terre d'Ivoire en adoptant (jusqu'au 14/11/2026) l'esthétique stylisée de **GTA San Andreas (PS2 Golden Era)** — *abandonnée au profit d'un style convivial et chaleureux* — et des contrôles tactiles **en mode Paysage**, un moteur temporel dynamique accéléré, une jauge d'envie psychologique et la vraie culture ivoirienne vivante.

---

## 🏗️ 3. STACK TECHNIQUE & INFRASTRUCTURE DÉPLOYÉE

1. **Frontend / Rendu 3D** :
   * **React 19** + **TypeScript** + **Tailwind CSS**.
   * **Three.js PBR** : Rendu 3D au style convivial et chaleureux (abandon du style GTA San Andreas, décidé le 14/11/2026), ambiance tropicale continue (ciel en dégradé, soleil voyageur, voir README « Rendu & Ambiance »), ombres douces (`PCFSoftShadowMap`), shader d'eau fluide pour la Lagune Ébrié.
   * Modèles 3D humains articulés (squelette rigging : marche, course, assise, poses d'attitude) et parc automobile low-poly rétro d'Abidjan (Peugeot 504 Woro-woro jaune, Gbaka tôlé vert, BMW M Series, Rolls-Royce Phantom, Supercar).
2. **Cœur Sécurisé (Rust / C++ WASM)** :
   * Module binaire WebAssembly (`.wasm`) encapsulant le moteur de Chance/Karma, la gestion métabolique de la Jauge d'Envie et les secrets des 19 Destins.
2bis. **Moteur physique 2.5D (C++ freestanding → WASM, Itération 6)** :
   * Source `physics/physics.cpp`, binaire `public/physics.wasm` (versionné), build `npm run build:wasm`, tests `npm run test:physics`.
   * Passerelle `src/physics/PhysicsCore.ts` ; décor `src/physics/abidjanWorld.ts` ; trafic `src/physics/trafficAI.ts` ; commandes maintenues `src/physics/controls.ts`.
   * Pas fixe 120 Hz, déterministe. Véhicules (modèle bicyclette + pneus Pacejka + transfert de masse + frein à main), piéton (cercle glissant, saut, trottoirs), collisions OBB/cylindre sur grille 16 m, rayons 2D (caméra).
   * Rust n'a pas pu être compilé dans l'environnement de l'agent (pas de cible `wasm32` disponible) : C++ retenu (la Règle 2 autorise « Rust / C++ »). L'interface étant plate (`extern "C"`), un portage Rust reste possible.
3. **Hébergement & Déploiement (Cloudflare Pages/Workers - 100% Gratuit à vie)** :
   * **Dépôt GitHub** : `https://github.com/BLURDVNIXL/BLV-project` (branche `main`).
   * **Configuration Cloudflare** :
     * Projet : `blv-project` (sur le tableau de bord Cloudflare).
     * Build command : `npm run build`.
     * Build output directory : `dist`.
     * Fichier de configuration racine : `wrangler.json` (avec `"assets": { "directory": "./dist" }`).
     * Déploiement validé avec voyant vert ✅ (Build `#231c9d66`).
     * Bande passante illimitée, protection DDoS et CDN Edge avec présence physique directe à Abidjan.
4. **PWA (Progressive Web App)** :
   * Installable en 1 clic sur écran d'accueil iPhone (Safari) et Android (Chrome).
   * Plein écran sans barre d'adresse de navigateur.
   * Mise en cache agressive des assets 3D et sons via Service Worker pour fonctionner avec 0 Mo de bande passante après le premier chargement.

---

## 🎮 4. ERGONOMIE CONSOLE & FORMAT PAYSAGE

* **Format Paysage obligatoire / suggéré** :
  * Si l'utilisateur tient son smartphone en mode portrait : un écran stylisé s'affiche : *"Tourne ton téléphone en paysage pour jouer à BLV"*.
* **Détection automatique de l'appareil** :
  * **Sur Mobile / Tablette Tactile** :
    * **À Gauche** : Joystick analogique virtuel tactile 360° (déplacements, marche, course, direction des véhicules).
    * **À Droite** (depuis le 14/11/2026, HUD compact, `feat/refonte-hud`) : **5 pastilles « gélatine »**, une icône par action, aucune barre en bas. Rangée du haut : **BabiOS** (téléphone) et **Utiliser** (sac / objets, grisé : sans effet pour l'instant). Rangée du bas : **Saut** (klaxon en voiture) · **Interagir** (main bleue, **au centre**, plus grand ; il n'apparaît que lorsqu'une interaction est possible : repère, véhicule proche ou conducteur ; emplacement fixe, rien ne se décale) · **Sprint / Frein** (maintenu : sprint à pied, frein à main en voiture).
  * **Sur PC (Desktop / Laptop)** :
    * Les touches tactiles disparaissent automatiquement.
    * Clavier : `ZQSD` ou `WASD` (déplacements), `Shift` (sprint), `Espace` (saut/frein à main), `E` ou `F` (action/véhicule), `Tab` ou `P` (smartphone BabiOS).
    * **État d'implémentation (Itération 6)** : Shift/□ = sprint maintenu ; Espace/tap □ = saut ; Espace/◯ = frein à main maintenu ; E/F/✕ = action contextuelle de la scène (monter/descendre de voiture, mobilier, lycées), repos rapide sinon. « Frapper » (□) n'est pas encore implémenté (pas de combat). Le menu ⚙ (haut droite) regroupe Pause, Réglages, BabiOS, Radio, Destin et Admin ; il n'y a plus de barre du HUD en bas.
    * Souris : Orientation libre de la caméra 3D à 360°.

---

## ⏰ 5. LE MOTEUR TEMPOREL ACCÉLÉRÉ

* **Ratio Validé** : **1 Heure Réelle = 4 Heures de Jeu** (1 Journée in-game complète = 6 Heures réelles).
* **Équivalence** : 15 minutes réelles = 1 heure dans le jeu.
* **Intérêt ludique** : Enchaînement spectaculaire des cycles jour/nuit (aube brumeuse, canicule de midi, coucher de soleil doré, vie nocturne trépidante des maquis) sans temps mort ni attente passive.

---

## 🍀 6. LE SYSTÈME UNIVERSEL DE LA CHANCE ("L'ÉTOILE / LE KARMA")

Dans BLV, la Chance n'est pas un calcul isolé mais **une mécanique omniprésente qui irrigue 100% des systèmes** via une caractéristique de 1 à 100 appelée **L'Étoile** :
* **Transports** : Trajet express fluide sans bouchon VS panne de carburant, pneu crevé à l'Indénié ou contrôle de police.
* **Gastronomie** : Garba divin (+double boost d'envie et d'énergie) VS indigestion et besoin pressant d'aller aux toilettes.
* **Travail & Affaires** : Pourboire géant d'un client fortuné, prime surprise VS délestage électrique et panne machine.
* **Rue & Trouvailles** : Trouver des liasses égarées sur le trottoir, promos secrètes à -50% au Djassa.
* **Karma Évolutif** : Donner aux mendiants, aider ses voisins ou payer sa tontine à l'heure fait briller son Étoile ; les arnaques et coups bas la ternissent et attirent la police.
* **Issues Aléatoires Imprévisibles** : Chaque choix de dialogue ou de mission déclenche un tirage RNG à 3 ou 4 issues (dénouement normal, mauvaise surprise, ou coup de théâtre miraculeux).

---

## 🎲 7. LA MATRICE COMPLÈTE DES 19 DESTINS DE BABI

Chaque nouvelle partie débute par la **Roulette du Destin** qui détermine la condition de naissance :

### A. Les 4 Classes Communes (⚪ 35%)
1. **Le Débrouillard d'Abobo** : 15k F, chambre cour commune, apprenti gbaka. Endurance élevée.
2. **Le Commerçant d'Adjamé** : 50k F, étal au grand marché d'Adjamé, sens des affaires street.
3. **Le Chauffeur de Woro-Woro (Koumassi)** : 35k F, Peugeot 504 jaune louée, conduite experte.
4. **L'Étudiant Fauché de l'UFHB** : 20k F, chambre campus Cocody, vieux PC, intellect fort.

### B. Les 4 Classes Rares (🔵 25%)
5. **La Classe Moyenne d'Angré** : 180k F, 3 pièces, fonctionnaire/instituteur, salaire stable.
6. **Le Gérant de Maquis (Yopougon)** : 250k F, logement au-dessus du maquis, moral festif.
7. **Le Mécanicien de Treichville** : 120k F, atelier garage, réparations auto à moitié prix.
8. **La Styliste de Marcory** : 140k F, machine à coudre, confection de sapes wax.

### C. Les 4 Classes Épiques (🟣 25%)
9. **Le Jeune Cadre du Plateau** : 500k F, studio standing vue lagune, costume cintré.
10. **Le "Laté" de Cocody** : 1,2M F, 3 pièces chic, berline offerte, loyer payé 1 mois par les parents.
11. **L'Élève de l'INPolytec (L'Élite d'État)** : 80k F, chambre campus Yamoussoukro, ordi portable. **Reçoit régulièrement la prestigieuse bourse d'État « Koidio »** (50 000 F tous les 3 jours in-game). Accès privilégié aux cabinets d'audit du Plateau.
12. **Le Golden Boy (L'Ultra-Privilégié)** :
    * Duplex les pieds dans l'eau en baie d'Assinie, BMW M Series + Rolls-Royce Phantom, **argent illimité pendant 1 mois** (carte Platinum de papa).
    * 🔒 **EASTER EGG MAJEUR : Le jeu bascule AUTOMATIQUEMENT et INTÉGRALEMENT en ANGLAIS américain jet-set sans pouvoir être modifié dans les réglages !** Pop-up humoristique : *"Bro, you literally graduated from the American International School of Abidjan, French is not in your DNA anymore!"*.

### D. Les 7 Easter Eggs Légendaires (🔴 15%)
13. **Le Poignon (L'Extrême Précarité & la Baraka Suprême)** :
    * 2 000 F en poche, zéro logement (dort sur un carton sous un hangar au marché d'Adjamé).
    * **Équilibrage de génie** : Possède une **Chance/Baraka mystique à 95/100 (supérieure au Golden Boy !)**. Taux de jackpot au Loto démultiplié, trouvailles miraculeuses, ascension légendaire.
14. **Yannis Diomandé (Le Crack du Reel Madird)** :
    * Ailier droit prodige ivoirien au Reel Madird, n°25, transféré pour 125 M€. En vacances à Babi.
    * Compte colossal en devises, villa Cocody Ambassades, supercar de Madrid, vitesse athlétique surhumaine. Gérer la foule de fans et financer son académie de foot à Abidjan.
15. **Le Brouteur (Le Cyber-Escroc / Gayman)** :
    * Studio climatisé Yopougon, 350k F cash d'arnaques en ligne, champagne au maquis. Jauge de désir/sexe très exigeante. Menace permanente de la **PLCC (Police Cybercriminalité)**.
16. **Le Djassaman de Treichville** : Accès aux boutiques secrètes sous le manteau, +1 Étoile de surveillance policière.
17. **Le Baron de l'Ombre** : 10M F cash, villa bunker, 3 étoiles de police permanentes au Plateau, comptes officiels gelés (blanchiment d'argent obligatoire).
18. **Le Rescapé des Bas-fonds** : Toxicodépendant en rédemption, vision parfois altérée, quête de guérison.
19. **Le Politicien Déchu** : Ancien ministre ruiné avec carnet d'adresses ministériel secret.

---

## 💖 8. LA JAUGE D'ENVIE, GASTRONOMIE & ROMANCE

* **La Jauge d'Envie** : Moteur psychologique du personnage. Si elle tombe à 0 ➔ dépression, lenteur, travail divisé par 2.
* **Comblée par 6 voies** :
  1. 🍛 **Les Mets Savoureux d'Abidjan** : Garba croustillant au thon frit, Alloco & poisson braisé, Foutou sauce graine, Choukouya au kan-kan, Kédjénou ➔ procure le buff *"Extase Culinaire"*.
  2. 💖 **L'Amour & les Rencards** : Rencards en bord de lagune, tendresse. Remplissage durable.
  3. 🔥 **Le Sexe Consenti (façon Les Sims)** : Intimité pudique et humoristique (cœurs animés, couette qui bouge, étincelles, sans nudité). Buff *"Cœur comblé"*.
  4. 💼 **Le Travail & l'Ambition** : Réussir de gros contrats.
  5. 🎲 **Le Jeu & l'Adrénaline** : Loto Akwaba, dés au maquis.
  6. 💊 **Les Substances** : Boost immédiat mais descente sévère et danger de santé.
* **Romance & Consentement Mutuel Strict** : Confirmation bilatérale obligatoire entre joueurs réels. Refus unilatéral respecté immédiatement. Mariage civil officiel célébré à la mairie par le Maire.

---

## 📻 9. LE TUNER RADIO EN DIRECT LIVE DE CÔTE D'IVOIRE

Tuner radio officiel diffusant de vrais flux audio streaming HTTPS en direct :
1. **RTI Fréquence 2 (92.0 FM)** : Flux live officiel de la station jeunesse et culture de la RTI.
2. **Skyrock Abidjan (107.9 FM)** : Flux direct Afrobeats, Rap Ivoire et musiques urbaines d'Abidjan.
3. **WaveMaster Radio Lagune** : Ambiance continue Zouglou, Rumba et Coupé-Décalé des maquis.
4. **Mode Silence** : Pour n'écouter que l'ambiance urbaine.

---

## 🏛️ 10. CURSUS ACADÉMIQUE, FIN TRAGIQUE & LES 6 AMÉLIORATIONS

* **Lycées d'Excellence & Badges Historiques** :
  1. 🐊 **Lycée Classique d'Abidjan (Cocody)** ➔ Badge **« Devenir Caïman »** :
     * *Histoire* : Fondé en 1945, temple mythique de l'intelligentsia ivoirienne. Berceau des illustres alumni : Laurent Gbagbo, Tidjane Thiam, Daniel Kablan Duncan.
     * *Avantages* : Charisme intellectuel (+15%), Respect immédiat dans toutes les administrations du Plateau, boost d'embauche cadre supérieur.
  2. 🌸 **Lycée Sainte-Marie de Cocody** ➔ Badge **« Devenir Alysma »** :
     * *Histoire* : Fondé en 1962 par Félix Houphouët-Boigny et la Communauté Saint-François-Xavier (Madeleine Daniélou). Référence absolue d'excellence féminine avec 100% de réussite au Baccalauréat.
     * *Avantages* : Étoile protégée contre le mauvais œil (+10 Baraka permanente), Hygiène et allure chic naturelles, aura diplomatique dans les hautes sphères.
  3. ⚡ **Lycée d'Excellence Alassane Ouattara de Grand-Bassam** ➔ Badge **« Devenir Alex »** :
     * *Histoire* : Inauguré en 2019 sur un campus ultra-moderne de 20 hectares, joyau scientifique de la Côte d'Ivoire préparant aux grandes écoles mondiales (Polytechnique, MIT, INPolytec).
     * *Avantages* : Logique et calcul financier (+25% de gains aux investissements), accès prioritaire aux bourses internationales d'ingénieur.

* **Fin Tragique / Bilan de Vie (Game Over)** :
  * Si le joueur tombe en faillite critique (dettes > 25 000 F) avec faim et énergie à zéro, ou sur déclenchement manuel, l'écran solennel *TragicEndingModal* (« Le Bitume t'a eu ») s'affiche avec la voix off du narrateur, le nombre de jours vécus, le bilan financier, et la possibilité de renaître dans une nouvelle vie.

* **Espace Admin Sandbox Secret (Tests & Configurations Développeur)** :
  * En parallèle du jeu public, un espace d'administration complet est intégré, accessible via le code secret **`BLV2026`** (ou `ADMIN` / `BABI`) dans les réglages du menu principal.
  * Permet de forcer n'importe lequel des 19 destins à chaud, d'ajouter des millions de FCFA, de basculer la météo, de manipuler les étoiles de recherche de la police, de réinitialiser les besoins et de débloquer tous les badges scolaires pour les tests.

---

## 📋 11. HISTORIQUE DES LIVRAISONS & FEUILLE DE ROUTE D'IMPLÉMENTATION

### A. Livraisons Effectuées (Itération 1, 2, 3, 4 & 5 Complétées ✅)
* **Vérification Build & Lint** : Build Vite + Rollup passé sans erreur, TypeScript `tsc --noEmit` à 0 erreur.
* **Génération du Monde Entier d'Abidjan & Port SanAndreasUnity (Itération 4)** :
  1. **Monde 3D Ouvert d'Abidjan (260m × 220m)** : Lagune Ébrié, les 4 Grands Ponts (Pont Alassane Ouattara à haubans, Pont Félix Houphouët-Boigny, Pont De Gaulle, Pont HKB), les tours du Plateau, les 3 Lycées d'Excellence (Lycée Classique, Sainte-Marie, Grand-Bassam), conteneurs du Port de Treichville, avenues et trafic routier miniature.
  2. **Port de SanAndreasUnity : Caméra Orbitale (`CameraFollow.cs`)** : Coordonnées sphériques précises (`yaw`, `pitch`, `distance`), rotation fluide 360°, élévation sécurisée (ne passe jamais sous le sol), zoom à la molette/pinch.
  3. **Port de SanAndreasUnity : Physique Déplacement (`PlayerController.cs`)** : Déplacement relatif à l'orientation de caméra sur le plan horizontal (XZ), éliminant toute désorientation.
  4. **Port de SanAndreasUnity : Conduite de Véhicules (`VehicleController.cs`)** : Entrée/sortie du véhicule, accélération, marche arrière, braquage des roues avant, phares de nuit projetés, compteur de vitesse KM/H.

* **Finition Haute Fidélité GTA San Andreas & Moteur Sonore (Itération 5)** :
  1. **Modèle de Personnage CJ San Andreas Haute Définition** :
     - Torse athlétique sculpté avec marcel blanc/tenue wax, col et emmanchures côtelées.
     - Ceinture noire avec boucle chromée à la taille.
     - Tête sculptée avec cou, mâchoire, front et coupe de cheveux au choix du joueur.
     - Bras musclés (deltoïdes, biceps, mains sculptées).
     - Pantalon jean denim avec plis aux genoux et baskets sneakers basses avec semelle blanche et empeigne colorée.
     - Animation idle de respiration corporelle et balancement cadencé des membres.
  2. **Véhicule Authentique Peugeot 504 Woro-woro d'Abidjan** :
     - Pare-chocs chromés avant et arrière, carrosserie jaune iconique avec habitacle vitré teinté.
     - **Galerie de toit métallique chargée de bagages, valises et cartons** ficelés (quintessence du transport abidjanais).
     - Phares longue portée projetés sur le bitume, jantes détaillées avec enjoliveurs.
  3. **Mini-map Radar Circulaire GTA San Andreas (`GtaRadar.tsx`)** :
     - Radar circulaire noir mat incrusté en bas à gauche de l'écran.
     - Flèche du joueur rotative pointant dans la direction de marche/conduite.
     - Boussole avec lettre du Nord "N" rotative.
     - Projection de la Lagune Ébrié, des ponts et blips colorés des lieux clés (Maison en vert, Lycée Classique en orange, Sainte-Marie en rose, Grand-Bassam en cyan, Plateau en bleu ciel, Port en jaune).
     - Anneau courbé d'énergie/santé GTA autour du radar.
     - Bannière de localisation GTA automatique affichant le quartier en temps réel (*Plateau, Cocody, Lagune, Treichville, Marcory, Grand-Bassam*).
  4. **Moteur Sonore Procédural GTA (`audioFxService.ts`)** :
     - Bruit de moteur progressif avec accélération et montée en régime selon la vitesse.
     - Crissement de pneus en dérapage drift lors des virages serrés.
     - Klaxon typique d'Abidjan (*Tut-tuuut !*).
     - Bruits de pas synchronisés sur le bitume.
     - Fanfare jingle triomphale GTA lors du déblocage des badges des Lycées d'Excellence.

* **Moteur Physique WebAssembly & Branchement des commandes (Itération 6)** :
  1. **Cœur physique C++/WASM** (voir §3, point 2bis) : conduite réaliste (accélération limitée par la puissance, freinage, drift au frein à main, assiette/roulis), collisions solides (tours, lycées, port, maison, mobilier, lagune sauf ponts, limites de carte), piétons renversés, trafic simulé avec la même physique.
  2. **Commandes conformes au §4** : Shift/Espace/□/◯ maintenus (`HeldControls` par référence, sans re-rendu), touche E/F/✕ branchée sur la scène.
  3. **Caméra** : collision contre les bâtiments (rayon 2D), compteur km/h piloté par la physique, son moteur piloté par le régime simulé, son de choc (`playCrash`).
  4. **Corrections de fond** : (a) `package.json` : `esbuild ^0.25` entrait en conflit avec `vite` → `npm install` échouait (donc le build Cloudflare aussi) ; passé à `^0.28`. (b) La scène 3D était entièrement reconstruite **à chaque minute de jeu** (≈ toutes les 0,9 s réelles) ; elle ne l'est plus qu'aux changements d'éclairage (nuit / coucher de soleil / jour). (c) Ponts rendus affleurants (le tablier formait une marche de 1,2 m).
  5. **Validation** : 21 tests du cœur WASM + 10 tests d'intégration + test navigateur Chromium de bout en bout (marche, montée en voiture avec E, accélération, frein à main, sortie, sprint, aucune erreur console).

* **Carte réelle d'Abidjan jouable (Itération 7)** :
  1. Moteur physique : monde étendu à ±3 km (grille 16 m, 384 × 384 cellules), solides **retirables** (`removeSolid`, emplacements recyclés) pour charger/décharger la carte par zones. 4 tests supplémentaires (300 cycles de 400 solides sans fuite, mur à 2,5 km, retrait, recyclage).
  2. `src/world/geo.ts` : projection GPS → mètres de jeu (échelle 1:4, origine 5,325° N / 3,990° O, x = est, z = sud).
  3. `src/world/abidjanGeography.ts` : lagune, deux baies (Banco, Cocody), île Boulay, 5 ponts, 13 communes (profil social, hauteur du bâti, densité, types de logements accueillis), 7 repères. Chaque donnée porte un champ `confidence` (`sourced` / `approximate`). **Le tracé des rives est schématique (±300 m réels) ; la topologie, elle, est sourcée.**
  4. `npm run test:world` : 40+ invariants (communes sur la terre ferme, ponts qui enjambent l'eau, ordre ouest→est des ponts, 4 communes au sud de la lagune, chaque logement a une commune d'accueil, carte < 6 km).
  5. **Faits vérifiés (sources publiques)** : Treichville 5,3102° N / 4,0129° O ; Marcory 5,300° N / 3,983° O ; Koumassi 5,300° N / 3,950° O ; centre d'Abidjan 5,3204° N / 4,0161° O. Marcory, Treichville, Koumassi et Port-Bouët sont entièrement au sud de la lagune. **Il y a 5 ponts, pas 4** : Félix Houphouët-Boigny (1957) et Charles de Gaulle (1967), tous deux Plateau ↔ Treichville ; Henri Konan Bédié (2014, ≈ 1,5 km, Cocody-Riviera Golf ↔ Marcory, plus à l'est) ; **Alassane Ouattara (2023) : Plateau ↔ Cocody, au-dessus de la baie de Cocody** ; pont de Yopougon (Yopougon/Attécoubé ↔ Plateau/Adjamé, baie du Banco, ≈ 1,4 km). Les rues de Treichville, Marcory, Koumassi et Adjamé sont rectilignes ; grands axes : bd Giscard d'Estaing, bd de Gaulle, bd Abrogoua (gare routière d'Adjamé).
  6. ✅ **Corrigé** : l'ancienne carte compacte (260 × 220 m, 4 ponts fictifs au milieu de la lagune) est supprimée ; le bandeau affiche désormais la commune réelle ou le nom du pont survolé.
  7. **Ville générée** (`src/world/city.ts`, `roads.ts`, `terrain.ts`, `rng.ts`) : déterministe, par chunks de 64 m, **identique chez tous les joueurs**. Réseau routier = 13 grands axes (graphe communes ↔ ponts) + quadrillage local par commune (orientation, pas et largeur propres ; rues rectilignes à Adjamé, Treichville, Marcory, Koumassi d'après les sources). Bâtiments par style de commune (tours du Plateau, immeubles, villas, baraques d'Attécoubé, entrepôts de Vridi), forêt du Banco, repères (stade, cathédrale, hôtel Ivoire, marché d'Adjamé, aéroport, port avec conteneurs, 3 lycées). Eau infranchissable sauf sur les tabliers des ponts.
  8. **Chargement par zones** (`WorldStreamer`, `chunkMesh`, `chunkProvider`, `worldWorker`) : la génération (bâtiments + texture de sol 96 × 96) tourne dans un **Web Worker** ; le fil principal ne construit que les maillages (4 appels de dessin par chunk) et enregistre/retire les solides physiques. Rayon 4 chunks (3 sur mobile / machines modestes). Ville ≈ 8 100 chunks, 0,4 ms de génération moyenne ; ≈ 54 000 bâtiments, 45 000 arbres.
  9. **Maisons des joueurs** : parcelles de 16–30 m en bordure de bloc, façade vers la rue (`findHouseLot`, `HouseLot`). Capacité mesurée : ≥ 48 parcelles par type de logement (squat 6 000, bunker 267…). La maison « maison de poupée » est posée sur la parcelle avec la rotation voulue (colliders et points d'interaction inclus) ; la voiture est garée dans la rue devant la façade. En multijoueur, le serveur attribuera les parcelles (`reservedLots`).
  10. **Trafic** (`roadTraffic.ts`) : 10 voitures (wôrô-wôrô, gbaka) qui apparaissent à 70–200 m du joueur sur les grands axes, conduite à droite, distances de sécurité, retrait quand elles s'éloignent. Local à chaque client (non synchronisé).
  11. **Radar GTA** vectoriel (lagune, baies, axes, ponts, repères, maison) ; **soleil et ombres** qui suivent le joueur ; caméra indépendante du nombre d'images/s et placée directement sur le joueur au démarrage.
  12. **Validation** : `npm run test` (25 + 10 + 40 + 30 invariants : aucun bâtiment dans l'eau, sur une rue ou un pont ; aucun chevauchement ; axes jamais dans l'eau hors pont ; déterminisme ; capacité des parcelles) et `npm run test:e2e` (Chromium : chargement, marche jusqu'à la voiture, conduite, bandeau, chargement par zones).
  13. **Limites connues** : sol plat (le Plateau réel est en altitude) ; ponts plats sans haubans ni pylônes ; eau sans animation ; façades à motif répété ; géométrie des rives schématique (±300 m réels) ; la fenêtre « Carte » (`AbidjanMapModal`) reste une carte illustrée narrative, pas encore la vraie géographie ; performances mesurées uniquement en rendu logiciel (aucun GPU dans l'environnement de l'agent) : à tester sur un vrai téléphone.

### B. Prochaines Étapes Prévues (Itération 8 & Suivantes) — ordre validé avec le créateur
1. **Multijoueur gratuit** (§13, validé : 24 joueurs par monde, chat texte avec filtre, signalement et mise en sourdine) : serveur de relais Cloudflare Durable Object (WebSocket Hibernation), catalogue de maisons, visites, gouverneur de budget, protection anti-abus.
2. **~~Frontend calqué sur GTA~~ → Refonte graphique convivante et chaleureuse** (décision du 14/11/2026, voir « Direction du 14/11/2026 » ci-dessous).
3. **Assets originaux** (personnages, véhicules d'Abidjan, props, textures, PNG) — voir « Arbitrages en cours » ci-dessous.
4. **Système de missions principales**, relié aux destins et à la Chance.
5. Tableau de comparaison avec la page de référence « Terre d'Ivoire » (à présenter avant de coder cette partie).
6. Relief (Plateau en altitude), vrais ponts (viaduc HKB, haubans), eau animée, piétons PNJ, intérieurs explorables, dialogues PNJ en nouchi, module WASM pour la simulation économique.

### D. Direction du 14/11/2026 (décisions du créateur — à planifier, rien n'est codé)
* **Style** : on abandonne le style GTA ; retour à un style **convivial et chaleureux**. UI claire et peu dense (planche d'icônes fournie comme inspiration ; seules des icônes sans texte incrusté, champ libre pour les créer ; le Golden Boy force l'anglais donc aucun texte dans les images). Hébergement : on reste sur Cloudflare.
* **Voix d'accueil + roulette subie** : une voix explique le jeu et dit « bienvenue » à chaque nouvelle partie, annonce que le hasard va choisir le destin, puis on montre la roulette. Le joueur ne choisit plus son destin (il le subit, comme dans la version précédente). Ajouter une **contextualisation rapide du mode histoire** — à écrire quand l'autre agent aura fini l'histoire V1.
* **19 maisons personnalisées**, une par destin, en tenant compte que certains destins n'ont pas de maison, ou ont une maison très grande / petite / moyenne / au bord d'une plage. **Il n'y a pas de plage sur la carte** : à ajouter (Assinie, Grand-Bassam, Vridi…).
* **Santé** : barre de vie et dégâts ; après chaque mort non définitive, on réapparaît à l'hôpital, hospitalisé quelques jours selon la gravité ; maladies attrapées aléatoirement.
* **Météo** : pluie, fort soleil, etc. (types existants : soleil, pluie, inondation, harmattan ; manque l'effet visuel de pluie).
* **Monde vivant** : plus de passants, certains qui interagissent entre eux, femmes, enfants, parcs, attractions, accidents routiers, maisons en construction.

### C. Constats techniques à traiter (non bloquants)
* `setRadarData` est appelé à chaque image (re-rendu React à 60 Hz) : à découpler dans l'itération « frontend GTA ».
* L'ancien décor `src/physics/abidjanWorld.ts` et l'IA `trafficAI.ts` ne sont plus utilisés par le jeu ; ils ne servent plus qu'aux tests d'intégration historiques (`physics/integration.test.ts`).
* Le serveur multijoueur devra produire les mêmes `reservedLots` que le Worker de chunks.

---

## 🌍 13. CONCEPTION MULTIJOUEUR 100 % GRATUITE (EXIGENCE DU CRÉATEUR — V2, HYPOTHÈSES À VALIDER)

**Exigences du créateur** : jeu multijoueur ; chaque joueur a sa maison ; on peut visiter les maisons des autres joueurs ; **aucun service payant**.

### Faits vérifiés (documentation officielle, consultée le 11/11/2026)
* **Cloudflare Durable Objects — plan Workers gratuit** (page « Pricing », mise à jour le 18/10/2026) : seuls les objets à stockage SQLite sont disponibles ; 100 000 requêtes/jour ; les messages WebSocket **entrants** comptent pour 1/20 de requête (≈ 2 millions de messages/jour) ; les messages sortants et les pings sont gratuits ; durée 13 000 Go·s/jour (facturée sur 128 Mo) ; un objet inactif **éligible à l'hibernation n'est pas facturé** ; stockage SQLite 5 Go, 5 M lignes lues/jour, 100 000 lignes écrites/jour. **Au-delà d'une limite gratuite, les opérations de ce type échouent (aucune facturation automatique)** ; réinitialisation quotidienne à 00:00 UTC (= minuit heure d'Abidjan, la Côte d'Ivoire étant à UTC+0). Un `setInterval` ou des E/S en attente empêchent l'hibernation.
* **Cloudflare Realtime** : STUN `stun.cloudflare.com` gratuit et illimité ; relais TURN : 1 000 Go/mois gratuits (trafic sortant du relais).
* **Supabase gratuit** : 200 connexions temps réel simultanées, 2 M messages/**mois** (≈ 66 000/jour, soit ~30 fois moins que Cloudflare) ; projets mis en pause en cas d'inactivité → écarté pour le temps réel.
* **Oracle Cloud « Always Free »** : carte bancaire et téléphone exigés (vérification d'identité) ; instances jugées inactives (CPU 95ᵉ centile < 20 % sur 7 jours, entre autres) pouvant être récupérées ; pénuries de capacité fréquentes → écarté comme hébergeur principal.

### Architecture V2 (tout reste dans le plan gratuit Cloudflare, sans carte bancaire)
1. **Trois couches** :
   * **A. Asynchrone (aucun temps réel)** : catalogue des maisons (type, agencement, couleurs, réglage d'accès) dans une base SQLite (Durable Object ou D1). **Visiter la maison d'un propriétaire hors-ligne = télécharger son agencement** (quelques Ko) et le rendre localement avec la physique WASM : coût temps réel nul.
   * **B. Présence en direct** : un Durable Object « monde » qui ne fait que **relayer** (aucune simulation serveur, aucune boucle de tick) via l'API **WebSocket Hibernation**. Les maisons occupées sont des salons logiques du même objet.
   * **C. Dégradation douce** : si le quota du jour approche, le serveur réduit les cadences, puis passe en « présence seule », puis les clients retombent sur la couche A (mode solo + maisons visitables). Le jeu ne s'arrête jamais.
2. **Économie de messages** : extrapolation (dead reckoning) → un joueur n'envoie sa position, sa vitesse et son cap que lorsqu'il change de direction ou que l'erreur dépasse un seuil ; rien à l'arrêt (pings gratuits via `setWebSocketAutoResponse`). *Estimation de l'agent* : ≈ 0,7 message/s par joueur en moyenne → 24 joueurs en ligne 8 h/jour ≈ 0,5 M messages (≈ 24 % du quota) ; 24 h/jour ≈ 1,45 M (≈ 73 %).
3. **Gouverneur de budget** dans le serveur : compte les messages du jour, ajuste la cadence cible annoncée aux clients (≈ 1 Hz → 0,5 Hz → présence seule), refuse les nouvelles connexions au-delà de 95 %.
4. **Protection du quota (vecteur de déni de service)** : le quota étant global, un client malveillant pourrait l'épuiser. Parades : jeton de connexion signé délivré par un Worker (protection anti-robot Cloudflare Turnstile, gratuite), seau de jetons par connexion dans le serveur, **déconnexion + bannissement temporaire** au premier dépassement, limite de connexions par adresse.
5. **Intérêt spatial** : un joueur ne reçoit que les voisins à moins de ~300 m de jeu (économise aussi les données mobiles des joueurs).
6. **Parcelles et maisons** : voir §13 « Hypothèses de carte » (communes cohérentes avec le logement tiré, façade dans le monde ouvert, intérieur chargé à l'entrée). Accès : ouverte / amis / fermée, avec « frapper à la porte » ; propriétaire hors-ligne : visite en lecture seule si la maison est publique. Seul le propriétaire modifie l'agencement (écritures limitées : budget de 100 000 lignes/jour).
7. **Identité et RGPD** : identifiant aléatoire créé sur l'appareil + secret local (aucun e-mail, aucun compte) ; pseudonyme ; le serveur ne stocke que des données non personnelles ; le droit à l'oubli purge aussi le serveur. Aucun WebRTC pair-à-pair (il expose l'adresse IP des joueurs entre eux, donnée personnelle).
8. **Anti-triche proportionnée** : pas d'économie partagée au départ (l'argent reste local) ; le serveur valide la propriété des maisons et vérifie que la vitesse annoncée ne dépasse pas la vitesse maximale du gabarit de véhicule.
9. **Latence** : un Durable Object est créé près du premier joueur qui l'appelle ; pour des joueurs ivoiriens, tester l'indication de localisation « Afrique » (à vérifier dans la documentation avant usage). Les avatars distants sont interpolés (≈ 150 ms de tampon).
10. **Rejeté** : Supabase/Firebase (quotas trop petits), Oracle Always Free (carte bancaire, récupération des instances inactives), P2P WebRTC pour le jeu (fuite d'adresses IP, NAT opérateurs mobiles → besoin de TURN). À réétudier seulement pour la voix.

**À décider** : nombre maximal de joueurs par monde (24 proposé) ; chat texte (avec filtre local, signalement et mise en sourdine) ou aucun chat au lancement.

---

## 🗂️ 12. JOURNAL DES ARBITRAGES (SESSION DU 10–11 NOVEMBRE 2026)

* **Incident** : un autre agent (Gemini) a remplacé le dépôt par un jeu différent (« GTA Abidjan : Babi Stories ») et a poussé sur `main`, supprimant destins, Chance, Jauge d'Envie, smartphone et admin. Le créateur a renvoyé la version d'origine (`untitled.zip`) et exige le respect absolu du README et du CONTEXT.
* **Décisions du créateur** : (1) base = version BLV d'origine ; (2) travailler d'abord hors dépôt, restaurer/pousser ensuite (un seul push après validation) ; (3) moteur physique en Rust/C++ WASM avec repli possible ; (4) carte 3D inspirée des lieux réels d'Abidjan ; (5) améliorer la page de référence Terre d'Ivoire dans cette session ; (6) frontend GTA, moteur physique et vraie grande carte à refaire.
* **Arbitrage en cours — assets/code Rockstar** : le créateur souhaite réutiliser des assets GTA et estime qu'une copie ou un port mobile n'est pas « la version de Rockstar ». **Position de l'agent (non validée par le créateur)** : ne pas intégrer d'assets ni de code issus de GTA (y compris portages et fuites) dans le dépôt ni dans le site public, car ce sont des œuvres protégées de Rockstar ; reproduire le *ressenti* GTA (HUD, caméra, conduite, structure de missions) avec des assets originaux ; s'inspirer de SanAndreasUnity (licence MIT) pour les algorithmes, sans copier ses assets. Le créateur a demandé que l'agent ne se contente pas de l'import local des fichiers du joueur (jugé inadapté au grand public). Point à retrancher avec le créateur avant l'étape « assets ».
* **Sécurité** : le jeton GitHub a été collé en clair dans la conversation ; il doit être révoqué et remplacé (portée minimale). Il n'est stocké nulle part dans le dépôt ni dans ce document.
* **Décisions du 11/11/2026** : projet **100 % gratuit** (aucun plan payant) ; multijoueur V2 acceptée : 24 joueurs par monde, chat texte avec filtre local, signalement et mise en sourdine.
* **Session du 13/11/2026 — fusion et remise en état** : la branche `backup-fusion-2026-11-13` (version fusion : serveur Express + WebSocket + SQLite, PWA, destins/missions/simulation dans `src/core/`) a été poussée dans `main` en fast-forward (`0de01f4` → `106206d`). Ce commit avait supprimé `CONTEXT.md`, `Suite.md`, `e2e/drive_city.py`, `package-lock.json` et d'anciens composants, et fait régresser `esbuild` en `^0.25` (conflit `ERESOLVE` avec `vite 8.3.8` : `npm install` et le build Cloudflare échouaient). Correctifs : `CONTEXT.md` et `Suite.md` restaurés, `esbuild ^0.28.0`, scripts `build:wasm` et `test:e2e` et `e2e/drive_city.py` remis, nom de paquet `blv-project`. Vérifié : `npm install` OK, `lint` 0 erreur, `npm test` 16/16, tests physique / géographie / ville OK, `npm run build` OK. Second échec du build Cloudflare (log du 13/11, 20:23) : Cloudflare détecte `bun@1.2.15` et lance `bun install --frozen-lockfile`, mais `bun.lock` (`lockfileVersion: 2`, généré par un Bun plus récent) est illisible → `bun.lock` supprimé, `package-lock.json` ajouté (Cloudflare utilise alors npm). Vérifié avec `npm ci` propre, lint, tests et build. Rappel : le jeton GitHub collé en clair dans la conversation doit être révoqué.
* **Chantier shaders & ambiance (13/11/2026, branche `feat/shaders-ambiance`, validé par le créateur : « tu peux commencer avec les shaders »)** : nouveaux modules `src/3d/ambiance.ts` (images clés horaires, soleil/lune, fonctions pures testées) et `src/3d/sky.ts` (dôme de ciel) ; shader d’eau amélioré (Fresnel + scintillement du soleil, eau plus mate la nuit) dans `materials.ts` ; balancement des arbres dans `chunkMesh.ts` ; intégration dans `sceneManager.ts` (`updateWorldConditions` interpole l’ambiance en continu ; la météo pluie/harmattan garde ses teintes). Les moods discrets jour/coucher/nuit restent la référence des interrupteurs (fenêtres, lampadaires). Tout est désactivé sur rendu logiciel. Vérifié : lint 0 erreur, `npm test` (+ 9 tests d’ambiance), build OK, captures Chromium (aube, matin, midi, coucher, crépuscule, nuit) sans erreur de shader. **Non vérifié** : performances sur un vrai GPU mobile (tests faits en rendu logiciel). Écarté volontairement : passe d’étalonnage plein écran (EffectComposer) et voile de chaleur, jugés trop coûteux pour le mobile ; l’écume de rivage demande une carte de profondeur.
* **Refonte UI (décidée le 13/11/2026)** : planche d’icônes fournie ; les boutons à texte incrusté sont abandonnés (le Golden Boy force l’anglais) ; seules les 10 icônes rondes sont retenues ; UI claire et peu dense. Pas encore codée.
* **14/11/2026** : le créateur a fusionné la PR #1 (`feat/shaders-ambiance`) dans `main` (merge `6f06e44`) ; `main` vérifié à neuf : `npm ci`, lint, 25 tests, build OK. `Suite.md` renommé `Continue.md`. Nouvelles décisions consignées en §11.D (voix d'accueil, roulette subie, style chaleureux, maisons, plage, santé/hôpital/maladies, météo, monde vivant).
* **Lot 1 — Refonte graphique (14/11/2026, branche `feat/refonte-ui`)** : thème convivial, clair et peu dense. **Système de design** : jetons de couleur dans `src/index.css` (`@theme` : sun, lagoon, palm, coral, plum, cream, ink ; police ronde Fredoka pour les titres), boutons « gélatine » (`.jelly`, inspirés de la planche), panneaux crème (`.panel`), variantes d'écran `short` (écran peu haut) et `touch-short` (téléphone en paysage). **Kit `src/components/ui/`** : `Jelly.tsx` (JellyButton, RoundIconButton), `Gauge.tsx` (RingGauge, BarGauge), `Modal.tsx` (Modal, SettingRow), `icons.tsx` (icônes originales : pièce FCFA, emblème soleil/lagune). **Écrans refaits à la main** : écran titre, HUD (jauges rondes, argent avec pièce FCFA, météo en icône, étoiles de recherche seulement si recherché), manette tactile (icônes au lieu de ✕□△◯, plus petite sur écran court), réglages, fin de partie, concours d'école, pause, boutons PWA. **Re-thématisés par table de conversion de couleurs** (à revérifier visuellement écran par écran) : BabiOS (seul l'écran d'accueil a été vérifié), roulette du destin (sera refaite au lot 4), admin. Planche : seules les icônes sans texte sont utilisées (le Golden Boy force l'anglais) ; les icônes sont des glyphes lucide sur pastilles « gélatine » + 2 icônes SVG originales. Sur téléphone en paysage, le dock du HUD est masqué (les réglages passent en haut à droite ; BabiOS et pause sont sur la manette). **Complément (même jour)** : 9 médaillons colorés dessinés pour BLV dans `ui/icons.tsx` (`StarBadge`, `CashBadge`, `GemBadge`, `HeartBadge`, `BoltBadge`, `GroupBadge`, `GearBadge`, `PinBadge`, `CalendarBadge`, plus `FcfaCoin`) — Étoile et joueurs en ligne les utilisent déjà dans le HUD, les autres sont prêts pour la santé (cœur), l'énergie, les cartes, etc. ; les 11 applications de BabiOS sont des tuiles « gélatine » (`.jelly-tile`) et leurs écrans intérieurs ont tous été ouverts et relus en capture ; renommages INPolytec / Reel Madird appliqués dans tous les textes affichés (identifiants internes inchangés) ; palette de la ville 3D réchauffée (`city.ts`, toits, asphalte). **Non fait** : relecture sur vrai téléphone, textures de façades et de sol (encore sobres), icônes de la planche restantes (voiture, maison, école…) si besoin.
* **HUD compact (14/11/2026, branche `feat/refonte-hud`, décidé par le créateur sur schéma)** : **haut gauche** = radar agrandi, pastille drapeau (toucher = fiche : nom du destin, rareté, argent, banque, dettes, statuts spéciaux), pastille trophée « 1/3 » (toucher = étape de mission), puis Jauge d'Envie + 4 besoins (la barre de vie du lot 2 s'y ajoutera). **Haut droite** : bloc inchangé (heure/météo, son, Étoile, étoiles de recherche, joueurs) avec un **engrenage à la place de la pause**, qui ouvre le menu (Pause, Réglages, BabiOS, Radio, Destin, Admin). **Bas** : joystick seul à gauche (il ne recouvre plus le radar), 5 boutons à droite (voir §4). L'argent est visible via le drapeau et dans BabiOS. L'affichage de la manette est décidé une seule fois (`useTouchControls`) et partagé avec le HUD : sur appareil tactile, l'invitation « Appuie sur E » du haut est masquée (le bouton Interagir la remplace). Menus et fiches utilisent `.panel-solid` (fond opaque). Vérifié par captures Chromium (téléphone 844×390 et PC 1280×720) ; non testé sur un vrai téléphone.
* **Décisions du 13/11/2026 (histoire V1)** : renommages INP-HB → INPolytec et Real Madrid → Reel Madird (appliqués le 14/11/2026 dans tous les textes affichés ; les identifiants internes `eleve_inphb` et `realMadridSuperstar` sont conservés pour ne pas casser les sauvegardes) ; badge Alysma réservé aux filles ; bac obligatoire pour le supérieur et les emplois formels ; 4 sources d'argent (missions, quêtes PNJ, travail, entrepreneuriat) ; CEPE, BEPC et cours du soir supprimés. Le créateur propose ensuite des shaders d'ambiance tropicale et une refonte des boutons (planche à fournir).
* **Livraison** : rien n'a été poussé sur GitHub à l'issue de l'Itération 7 ; tout est en attente de validation du créateur.

---

*Ce document est la mémoire vivante de BLV. Tout agent qui intervient doit s'y conformer et le mettre à jour à chaque livraison (RÈGLE 3).*




